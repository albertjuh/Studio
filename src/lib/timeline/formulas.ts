
import { addDays, differenceInDays, isAfter, isWithinInterval, startOfDay, isValid } from 'date-fns';
import { type AncRegistration, type SurveyStatus, type ParticipantStatus } from '@/types';

/**
 * Robust Date Parser for Study Timeline
 * Handles Firestore Timestamps, Date objects, and ISO strings.
 */
export function safeParseDate(data: any): Date | null {
  if (!data) return null;
  
  // If it's a Firestore Timestamp or has a toDate method
  if (typeof data.toDate === 'function') return data.toDate();
  
  // If it's already a Date object
  if (data instanceof Date) return isValid(data) ? data : null;
  
  // If it's an object containing common date fields
  const dateVal = data.enrollment_date || data.createdAt || data.date || data.firstAncDate || data;
  
  if (!dateVal) return null;
  if (dateVal instanceof Date) return isValid(dateVal) ? dateVal : null;
  if (typeof dateVal.toDate === 'function') return dateVal.toDate();
  
  const parsed = new Date(dateVal);
  return isValid(parsed) ? parsed : null;
}

export function calculateEDD(enrollmentDate: Date, gaWeeksAtEnrollment: number): Date {
  const weeksRemaining = 40 - gaWeeksAtEnrollment;
  return addDays(enrollmentDate, weeksRemaining * 7);
}

export function calculateCurrentGA(enrollmentDate: Date, gaWeeksAtEnrollment: number, today: Date = new Date()): { weeks: number; days: number } {
  const daysSinceEnrollment = Math.max(0, differenceInDays(startOfDay(today), startOfDay(enrollmentDate)));
  const totalDaysGA = (gaWeeksAtEnrollment * 7) + daysSinceEnrollment;
  return { weeks: Math.floor(totalDaysGA / 7), days: totalDaysGA % 7 };
}

export function getTrimester(gaWeeks: number): 1 | 2 | 3 | 'postpartum' {
  if (gaWeeks < 14) return 1;
  if (gaWeeks < 28) return 2;
  if (gaWeeks <= 42) return 3;
  return 'postpartum';
}

function getIndividualSurveyStatus(window: { open: Date, close: Date }, isCompleted: boolean, today: Date): SurveyStatus {
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
 * Resolves all calculated timeline statuses for a participant in real-time.
 * This ensures the UI always reflects the status as of "today".
 */
export function resolveParticipantStatuses(p: AncRegistration) {
  const today = new Date();
  const enrollDate = safeParseDate(p.enrollment_date || p.createdAt) || today;
  const gaAtEnroll = p.gestationalAge || 20;
  
  const current_ga = calculateCurrentGA(enrollDate, gaAtEnroll, today);
  const edd = calculateEDD(enrollDate, gaAtEnroll);
  const trimester = getTrimester(current_ga.weeks);

  // S2 Window (32-36+6 weeks) - Target 34wks
  // Protocol: 32 weeks up to 36 weeks and 6 days
  const s2Open = addDays(enrollDate, (32 - gaAtEnroll) * 7);
  const s2Close = addDays(enrollDate, (37 - gaAtEnroll) * 7 - 1);
  const s2Target = addDays(enrollDate, (34 - gaAtEnroll) * 7);
  const s2Status = getIndividualSurveyStatus({ open: s2Open, close: s2Close }, !!p.survey2_completed, today);

  // S3 Window (38-42 weeks) - Target 40wks (EDD)
  const s3Open = addDays(enrollDate, (38 - gaAtEnroll) * 7);
  const s3Close = addDays(enrollDate, (42 - gaAtEnroll) * 7);
  const s3Target = edd;
  const s3Status = getIndividualSurveyStatus({ open: s3Open, close: s3Close }, !!p.survey3_completed, today);

  // S4 Window (EDD + 14 days to EDD + 84 days) - Target EDD + 42 days
  const s4Open = addDays(edd, 14);
  const s4Close = addDays(edd, 84);
  const s4Target = addDays(edd, 42);
  const s4Status = getIndividualSurveyStatus({ open: s4Open, close: s4Close }, !!p.survey4_completed, today);

  // Delivery Status Logic
  let delivery_status: any = p.delivery_status || 'pregnant';
  if (delivery_status === 'pregnant') {
    if (current_ga.weeks > 42) delivery_status = 'likely_delivered';
    else if (current_ga.weeks > 40) delivery_status = 'overdue_pregnancy';
  }

  // Overall Study Status
  let overall_status: ParticipantStatus = 'on_track';
  if (s2Status === 'overdue' || s3Status === 'overdue' || s4Status === 'overdue') {
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
    delivery_status,
    overall_status,
    survey2_status: s2Status,
    survey2_target_date: p.survey2_target_date || s2Target,
    survey3_status: s3Status,
    survey3_target_date: p.survey3_target_date || s3Target,
    survey4_status: s4Status,
    survey4_target_date: p.survey4_target_date || s4Target
  };
}
