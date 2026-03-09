
import { addDays, differenceInDays, isAfter, isWithinInterval, startOfDay } from 'date-fns';
import { type SurveyStatus, type DeliveryStatus, type ParticipantStatus } from '@/types';

export function calculateEDD(enrollmentDate: Date, gaWeeksAtEnrollment: number): Date {
  const weeksRemaining = 40 - gaWeeksAtEnrollment;
  return addDays(enrollmentDate, weeksRemaining * 7);
}

export function calculateCurrentGA(
  enrollmentDate: Date,
  gaWeeksAtEnrollment: number,
  today: Date = new Date()
): { weeks: number; days: number } {
  const daysSinceEnrollment = Math.max(0, differenceInDays(startOfDay(today), startOfDay(enrollmentDate)));
  const totalDaysGA = (gaWeeksAtEnrollment * 7) + daysSinceEnrollment;
  return {
    weeks: Math.floor(totalDaysGA / 7),
    days: totalDaysGA % 7
  };
}

export function getTrimester(gaWeeks: number): 1 | 2 | 3 | 'postpartum' {
  if (gaWeeks < 14) return 1;
  if (gaWeeks < 28) return 2;
  if (gaWeeks <= 42) return 3;
  return 'postpartum';
}

export function calculateFollowUpDates(enrollmentDate: Date, gaWeeksAtEnrollment: number) {
  const edd = calculateEDD(enrollmentDate, gaWeeksAtEnrollment);

  // Survey 2: Phone call at 34-38 weeks (Target 36)
  const s2Target = addDays(enrollmentDate, (36 - gaWeeksAtEnrollment) * 7);
  const s2Open = addDays(enrollmentDate, (34 - gaWeeksAtEnrollment) * 7);
  const s2Close = addDays(enrollmentDate, (38 - gaWeeksAtEnrollment) * 7);

  // Survey 3: Delivery notes on birth records (Around EDD/40wks)
  const s3Target = edd;
  const s3Open = addDays(enrollmentDate, (38 - gaWeeksAtEnrollment) * 7);
  const s3Close = addDays(enrollmentDate, (42 - gaWeeksAtEnrollment) * 7);

  // Survey 4: 6 weeks postpartum phone call (Target 42 days post-EDD)
  const s4Target = addDays(edd, 42);
  const s4Open = addDays(edd, 14);
  const s4Close = addDays(edd, 84); // Extended window for capture

  return {
    survey2: { target: s2Target, open: s2Open, close: s2Close },
    survey3: { target: s3Target, open: s3Open, close: s3Close },
    survey4: { target: s4Target, open: s4Open, close: s4Close },
  };
}

export function getSurveyStatus(
  window: { open: Date; close: Date; target: Date },
  isCompleted: boolean,
  today: Date = new Date()
): SurveyStatus {
  if (isCompleted) return 'completed';
  const startOfToday = startOfDay(today);
  const windowOpen = startOfDay(window.open);
  const windowClose = startOfDay(window.close);

  if (isAfter(startOfToday, windowClose)) return 'overdue';
  if (isWithinInterval(startOfToday, { start: windowOpen, end: windowClose })) return 'due_now';
  
  const daysToOpen = differenceInDays(windowOpen, startOfToday);
  if (daysToOpen <= 14 && daysToOpen > 0) return 'due_soon';
  
  return 'upcoming';
}

export function getDeliveryStatus(
  edd: Date,
  confirmedDeliveryDate: Date | null,
  today: Date = new Date()
): DeliveryStatus {
  if (confirmedDeliveryDate) return 'delivered';
  const daysOverdue = differenceInDays(startOfDay(today), startOfDay(edd));
  if (daysOverdue < 0) return 'pregnant';
  if (daysOverdue >= 0 && daysOverdue < 14) return 'likely_delivered';
  return 'overdue_pregnancy';
}

/**
 * Resolves all live statuses for a participant based on current date.
 * This ensures the UI is always accurate even if the daily cron hasn't run.
 */
export function resolveParticipantStatuses(p: any, today: Date = new Date()) {
  const enrollDate = p.createdAt?.toDate ? p.createdAt.toDate() : new Date(p.createdAt || Date.now());
  const ga = calculateCurrentGA(enrollDate, p.gestationalAge || 20, today);
  const edd = calculateEDD(enrollDate, p.gestationalAge || 20);
  const windows = calculateFollowUpDates(enrollDate, p.gestationalAge || 20);

  const s2_status = getSurveyStatus(windows.survey2, !!p.survey2_completed, today);
  const s3_status = getSurveyStatus(windows.survey3, !!p.survey3_completed, today);
  const s4_status = getSurveyStatus(windows.survey4, !!p.survey4_completed, today);
  
  const delivery_status = getDeliveryStatus(edd, p.delivery_date_confirmed?.toDate ? p.delivery_date_confirmed.toDate() : (p.delivery_date_confirmed || null), today);

  let overall_status: ParticipantStatus = 'on_track';
  const statuses = [s2_status, s3_status, s4_status];
  
  if (p.survey2_completed && p.survey3_completed && p.survey4_completed) {
    overall_status = 'complete';
  } else if (statuses.includes('overdue')) {
    overall_status = 'overdue';
  } else if (statuses.includes('due_now')) {
    overall_status = 'action_needed';
  } else if (delivery_status === 'likely_delivered' || delivery_status === 'overdue_pregnancy') {
    overall_status = 'likely_delivered';
  }

  return {
    ...p,
    current_ga: ga,
    current_trimester: getTrimester(ga.weeks),
    edd,
    delivery_status,
    overall_status,
    survey2_status: s2_status,
    survey3_status: s3_status,
    survey4_status: s4_status,
    survey2_target_date: windows.survey2.target,
    survey3_target_date: windows.survey3.target,
    survey4_target_date: windows.survey4.target
  };
}
