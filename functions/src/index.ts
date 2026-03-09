
import { setGlobalOptions } from "firebase-functions";
import { onDocumentWritten } from "firebase-functions/v2/firestore";
import { onSchedule } from "firebase-functions/v2/scheduler";
import * as logger from "firebase-functions/logger";
import { initializeApp } from "firebase-admin/app";
import { getFirestore, FieldValue, Timestamp } from "firebase-admin/firestore";
import { addDays, differenceInDays, isAfter, isWithinInterval, startOfDay } from 'date-fns';

initializeApp();
setGlobalOptions({ maxInstances: 10 });

/**
 * FORMULAS (Standardized Study Guidelines)
 */
function calculateEDD(enrollmentDate: Date, gaWeeksAtEnrollment: number): Date {
  const weeksRemaining = 40 - gaWeeksAtEnrollment;
  return addDays(enrollmentDate, weeksRemaining * 7);
}

function calculateCurrentGA(enrollmentDate: Date, gaWeeksAtEnrollment: number, today: Date): { weeks: number; days: number } {
  const daysSinceEnrollment = Math.max(0, differenceInDays(startOfDay(today), startOfDay(enrollmentDate)));
  const totalDaysGA = (gaWeeksAtEnrollment * 7) + daysSinceEnrollment;
  return { weeks: Math.floor(totalDaysGA / 7), days: totalDaysGA % 7 };
}

function getTrimester(gaWeeks: number): 1 | 2 | 3 | 'postpartum' {
  if (gaWeeks < 14) return 1;
  if (gaWeeks < 28) return 2;
  if (gaWeeks <= 42) return 3;
  return 'postpartum';
}

function calculateFollowUpDates(enrollmentDate: Date, gaWeeksAtEnrollment: number) {
  const edd = calculateEDD(enrollmentDate, gaWeeksAtEnrollment);
  
  // S2: 34-38 weeks (Target 36)
  const s2Target = addDays(enrollmentDate, (36 - gaWeeksAtEnrollment) * 7);
  const s2Open = addDays(enrollmentDate, (34 - gaWeeksAtEnrollment) * 7);
  const s2Close = addDays(enrollmentDate, (38 - gaWeeksAtEnrollment) * 7);

  // S3: Delivery Records (Target 40)
  const s3Target = edd;
  const s3Open = addDays(enrollmentDate, (38 - gaWeeksAtEnrollment) * 7);
  const s3Close = addDays(enrollmentDate, (42 - gaWeeksAtEnrollment) * 7);

  // S4: 6 Weeks Postpartum
  const s4Target = addDays(edd, 42);
  const s4Open = addDays(edd, 14);
  const s4Close = addDays(edd, 84);

  return {
    survey2: { target: s2Target, open: s2Open, close: s2Close },
    survey3: { target: s3Target, open: s3Open, close: s3Close },
    survey4: { target: s4Target, open: s4Open, close: s4Close }
  };
}

function getSurveyStatus(window: any, isCompleted: boolean, today: Date): string {
  if (isCompleted) return 'completed';
  if (isAfter(startOfDay(today), startOfDay(window.close))) return 'overdue';
  if (isWithinInterval(startOfDay(today), { start: startOfDay(window.open), end: startOfDay(window.close) })) return 'due_now';
  if (differenceInDays(startOfDay(window.open), startOfDay(today)) <= 14) return 'due_soon';
  return 'upcoming';
}

/**
 * Trigger: Initialize Timeline on Registration
 */
export const onAncRegistrationCreate = onDocumentWritten("anc_registrations/{id}", async (event) => {
    const snap = event.data;
    if (!snap || !snap.after.exists || snap.before.exists) return;

    const data = snap.after.data()!;
    const enrollDate = data.createdAt?.toDate ? data.createdAt.toDate() : new Date();
    const gaWeeks = data.gestationalAge || 20;

    const edd = calculateEDD(enrollDate, gaWeeks);
    const windows = calculateFollowUpDates(enrollDate, gaWeeks);

    const update = {
        survey1_completed: true,
        enrollment_date: Timestamp.fromDate(enrollDate),
        edd: Timestamp.fromDate(edd),
        survey2_target_date: Timestamp.fromDate(windows.survey2.target),
        survey2_window_open: Timestamp.fromDate(windows.survey2.open),
        survey2_window_close: Timestamp.fromDate(windows.survey2.close),
        survey3_target_date: Timestamp.fromDate(windows.survey3.target),
        survey3_window_open: Timestamp.fromDate(windows.survey3.open),
        survey3_window_close: Timestamp.fromDate(windows.survey3.close),
        survey4_target_date: Timestamp.fromDate(windows.survey4.target),
        survey4_window_open: Timestamp.fromDate(windows.survey4.open),
        survey4_window_close: Timestamp.fromDate(windows.survey4.close),
        current_ga_weeks: gaWeeks,
        current_trimester: getTrimester(gaWeeks),
        delivery_status: 'pregnant',
        overall_status: 'on_track',
        status_last_updated: FieldValue.serverTimestamp()
    };

    await snap.after.ref.update(update);
    await snap.after.ref.collection('timeline_events').add({
        event_type: 'enrolled',
        event_date: Timestamp.fromDate(enrollDate),
        ga_weeks_at_event: gaWeeks,
        trimester_at_event: getTrimester(gaWeeks),
        created_at: FieldValue.serverTimestamp()
    });
});

/**
 * Scheduled Daily Updates
 */
export const dailyTimelineUpdater = onSchedule("0 3 * * *", async (event) => {
    const firestore = getFirestore();
    const today = new Date();
    const snapshot = await firestore.collection('anc_registrations').get();
    
    const batch = firestore.batch();
    snapshot.docs.forEach(doc => {
        const p = doc.data();
        if (!p.enrollment_date) return;

        const enrollDate = p.enrollment_date.toDate();
        const currentGA = calculateCurrentGA(enrollDate, p.gestationalAge, today);
        
        const s2Status = getSurveyStatus({ open: p.survey2_window_open.toDate(), close: p.survey2_window_close.toDate() }, p.survey2_completed, today);
        const s3Status = getSurveyStatus({ open: p.survey3_window_open.toDate(), close: p.survey3_window_close.toDate() }, p.survey3_completed, today);
        const s4Status = getSurveyStatus({ open: p.survey4_window_open.toDate(), close: p.survey4_window_close.toDate() }, p.survey4_completed, today);

        batch.update(doc.ref, {
            current_ga_weeks: currentGA.weeks,
            current_trimester: getTrimester(currentGA.weeks),
            survey2_status: s2Status,
            survey3_status: s3Status,
            survey4_status: s4Status,
            status_last_updated: FieldValue.serverTimestamp()
        });
    });

    await batch.commit();
    logger.info(`Updated timeline for ${snapshot.size} participants`);
});

/**
 * Recruitment Entry Deduplication
 */
export const onRecruitmentEntryWrite = onDocumentWritten("recruitment_entries/{entryId}", async (event) => {
    const firestore = getFirestore();
    const snap = event.data;
    if (!snap) return;
    const afterData = snap.after.data();
    if (!afterData) return;

    const { ra_name, date_string, facility, eligible, interviewed } = afterData;
    const missed = (eligible !== undefined && interviewed !== undefined) ? Math.max(0, eligible - interviewed) : 0;

    try {
        const querySnapshot = await firestore.collection("recruitment_entries")
            .where("ra_name", "==", ra_name)
            .where("date_string", "==", date_string)
            .where("facility", "==", facility)
            .orderBy("created_at", "asc")
            .get();

        const batch = firestore.batch();
        querySnapshot.docs.forEach((doc, index) => {
            const currentData = doc.data();
            const newFlag = index === 0 ? 1 : 0;
            if (currentData.first_row_flag !== newFlag || currentData.missed !== missed) {
                batch.update(doc.ref, {
                    first_row_flag: newFlag,
                    missed: missed,
                    updated_at: FieldValue.serverTimestamp()
                });
            }
        });

        if (querySnapshot.size > 0) await batch.commit();
    } catch (error) {
        logger.error("Error updating recruitment flags:", error);
    }
});
