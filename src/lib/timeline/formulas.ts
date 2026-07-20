
import { addDays, differenceInDays, isAfter, isWithinInterval, startOfDay, isValid, format } from 'date-fns';
import { type AncRegistration, type SurveyStatus, type ParticipantStatus } from '@/types';

export function safeParseDate(data: any): Date | null {
  if (!data) return null;
  
  if (data instanceof Date) {
    return isValid(data) ? data : null;
  }

  let dateVal: any = data;

  if (typeof data === 'object') {
    // Handle Firestore Timestamp objects
    if (typeof data.toDate === 'function') return data.toDate();
    
    // Handle serialized Timestamp-like objects {seconds, nanoseconds}
    if (data.seconds !== undefined) {
        const d = new Date(data.seconds * 1000);
        return (isValid(d) && d.getFullYear() > 2020) ? d : null;
    }

    // Check common date fields in the object
    dateVal = data.enrollment_date || data.createdAt || data.date || data.firstAncDate || data.updatedAt;
  }

  if (typeof dateVal === 'string') {
    // Remove ordinals like 1st, 2nd which can break Date constructor
    dateVal = dateVal.replace(/(\d+)(st|nd|rd|th)/gi, '$1');
  }

  const parsed = new Date(dateVal);
  // Ensure we don't return "pre-historic" dates or invalid objects
  return (isValid(parsed) && parsed.getFullYear() > 2020) ? parsed : null;
}

export function safeFormatDate(dateVal: any, formatStr: string = 'PPP'): string {
  const d = safeParseDate(dateVal);
  if (!d) return 'N/A';
  return format(d, formatStr);
}

export function calculateEDD(enrollmentDate: Date, gaWeeksAtEnrollment: number): Date {
  const weeksRemaining = 40 - (gaWeeksAtEnrollment || 20);
  return addDays(enrollmentDate, Math.max(0, weeksRemaining) * 7);
}

export function calculateCurrentGA(enrollmentDate: Date, gaWeeksAtEnrollment: number, today: Date = new Date(), deliveryDate?: Date | null): { weeks: number; days: number } {
  // CRITICAL: If delivered, we stop tracking GA at the delivery date. 
  // Otherwise, we calculate relative to today.
  const endDate = (deliveryDate && isValid(deliveryDate)) ? deliveryDate : today;
  
  const daysSinceEnrollment = Math.max(0, differenceInDays(startOfDay(endDate), startOfDay(enrollmentDate)));
  const totalDaysGA = ((gaWeeksAtEnrollment || 20) * 7) + daysSinceEnrollment;
  return { weeks: Math.floor(totalDaysGA / 7), days: totalDaysGA % 7 };
}

export function getTrimester(gaWeeks: number, isDelivered: boolean = false): 1 | 2 | 3 | 'postpartum' {
  if (isDelivered) return 'postpartum';
  if (gaWeeks < 14) return 1;
  if (gaWeeks < 28) return 2;
  if (gaWeeks <= 42) return 3;
  return 'postpartum';
}

function getIndividualSurveyStatus(window: { open: Date, close: Date }, isCompleted: boolean, studyStatus: string, today: Date): SurveyStatus {
  // Terminal statuses discontinue follow-up
  if (['withdrawn', 'out_of_area', 'pregnancy_loss', 'lost_to_followup'].includes(studyStatus)) return 'discontinued';
  
  if (isCompleted) return 'completed';
  
  const sToday = startOfDay(today);
  const sOpen = startOfDay(window.open);
  const sClose = startOfDay(window.close);

  if (isAfter(sToday, sClose)) return 'overdue';
  if (isWithinInterval(sToday, { start: sOpen, end: sClose })) return 'due_now';
  if (differenceInDays(sOpen, sToday) <= 14) return 'due_soon';
  return 'upcoming';
}

/**
 * Resilient status resolver. 
 * If clinical data is malformed, it returns a marked object rather than null 
 * to prevent infinite loading screens in the UI.
 */
export function resolveParticipantStatuses(p: AncRegistration) {
  if (!p || !p.participantId) return null;
  
  const gaAtEnroll = p.gestationalAge !== undefined ? Number(p.gestationalAge) : 20;
  
  // RECOVERY LOGIC: To prevent "stuck GA", we find the absolute earliest known study date.
  const dates = [
    safeParseDate(p.enrollment_date),
    safeParseDate(p.createdAt),
    safeParseDate(p.firstAncDate)
  ].filter((d): d is Date => d !== null);

  const rawEnrollDate = dates.length > 0 
    ? new Date(Math.min(...dates.map(d => d.getTime()))) 
    : null;

  if (!rawEnrollDate) {
    return {
        ...p,
        current_ga: { weeks: gaAtEnroll, days: 0 },
        edd: new Date(),
        current_trimester: getTrimester(gaAtEnroll),
        overall_status: 'on_track' as ParticipantStatus,
        isValid: false,
        data_error: 'Missing or malformed enrollment date'
    };
  }

  const today = new Date();
  const enrollDate = rawEnrollDate;
  const deliveryDate = safeParseDate(p.delivery_date_confirmed);
  const isDelivered = p.study_status === 'delivered' || p.delivery_status === 'delivered' || p.delivery_status === 'likely_delivered';
  
  const current_ga = calculateCurrentGA(enrollDate, gaAtEnroll, today, deliveryDate);
  const edd = calculateEDD(enrollDate, gaAtEnroll);
  const trimester = getTrimester(current_ga.weeks, isDelivered);

  const s2Open = addDays(enrollDate, (34 - gaAtEnroll) * 7);
  const s2Close = addDays(enrollDate, (38 - gaAtEnroll) * 7);
  const s2Target = addDays(enrollDate, (36 - gaAtEnroll) * 7);
  
  // Prenatal surveys (S2, S3) are discontinued if delivered
  const s2Status = (isDelivered && !p.survey2_completed) 
    ? 'discontinued' as SurveyStatus 
    : getIndividualSurveyStatus({ open: s2Open, close: s2Close }, !!p.survey2_completed, p.study_status || 'active', today);

  const s3Open = addDays(enrollDate, (38 - gaAtEnroll) * 7);
  const s3Close = addDays(enrollDate, (42 - gaAtEnroll) * 7);
  const s3Target = edd;
  const s3Status = (isDelivered && !p.survey3_completed) 
    ? 'discontinued' as SurveyStatus 
    : getIndividualSurveyStatus({ open: s3Open, close: s3Close }, !!p.survey3_completed, p.study_status || 'active', today);

  const s4Open = addDays(edd, 14);
  const s4Close = addDays(edd, 84);
  const s4Target = addDays(edd, 42);
  const s4Status = getIndividualSurveyStatus({ open: s4Open, close: s4Close }, !!p.survey4_completed, p.study_status || 'active', today);

  let overall_status: ParticipantStatus = 'on_track';
  if (p.study_status === 'withdrawn') overall_status = 'withdrawn';
  else if (p.study_status === 'out_of_area') overall_status = 'out_of_area';
  else if (p.study_status === 'lost_to_followup') overall_status = 'lost_to_followup';
  else if (p.study_status === 'pregnancy_loss') overall_status = 'pregnancy_loss';
  else if (s2Status === 'overdue' || s3Status === 'overdue' || s4Status === 'overdue') {
    overall_status = 'overdue';
  } else if (s2Status === 'due_now' || s3Status === 'due_now' || s4Status === 'due_now') {
    overall_status = 'action_needed';
  } else if (p.survey4_completed) {
    overall_status = 'complete';
  }

  return {
    ...p,
    current_ga,
    edd,
    current_trimester: trimester,
    overall_status,
    survey2_status: s2Status,
    survey2_window_open: s2Open,
    survey2_window_close: s2Close,
    survey2_target_date: p.survey2_target_date || s2Target,
    survey3_status: s3Status,
    survey3_window_open: s3Open,
    survey3_window_close: s3Close,
    survey3_target_date: p.survey3_target_date || s3Target,
    survey4_status: s4Status,
    survey4_window_open: s4Open,
    survey4_window_close: s4Close,
    survey4_target_date: p.survey4_target_date || s4Target,
    isValid: true
  };
}
