
import { addDays, differenceInDays, isAfter, isWithinInterval, startOfDay, isValid } from 'date-fns';
import { type AncRegistration, type SurveyStatus, type ParticipantStatus } from '@/types';

/**
 * Robust Date Parser for Study Timeline
 * Handles Firestore Timestamps, Date objects, and ISO strings.
 * NEVER returns an invalid date; returns null if parsing fails.
 */
export function safeParseDate(data: any): Date | null {
  if (!data) return null;
  
  let dateVal: any = data;

  // Handle nested Firestore-style objects or AncRegistration fields
  if (typeof data === 'object') {
    if (typeof data.toDate === 'function') return data.toDate();
    // Check for common field names
    dateVal = data.enrollment_date || data.createdAt || data.date || data.firstAncDate || data.seconds;
  }

  // Handle Firestore Timestamp seconds
  if (typeof dateVal === 'number' && dateVal > 1000000000) {
    const d = new Date(dateVal * 1000);
    return isValid(d) ? d : null;
  }

  const parsed = new Date(dateVal);
  // Strictly validate year to prevent "Jan 1st 2000" fallbacks caused by parsing errors
  // Study started after 2020
  return (isValid(parsed) && parsed.getFullYear() > 2020) ? parsed : null;
}

export function calculateEDD(enrollmentDate: Date, gaWeeksAtEnrollment: number): Date {
  const weeksRemaining = 40 - (gaWeeksAtEnrollment || 20);
  return addDays(enrollmentDate, weeksRemaining * 7);
}

export function calculateCurrentGA(enrollmentDate: Date, gaWeeksAtEnrollment: number, today: Date = new Date()): { weeks: number; days: number } {
  const daysSinceEnrollment = Math.max(0, differenceInDays(startOfDay(today), startOfDay(enrollmentDate)));
  const totalDaysGA = ((gaWeeksAtEnrollment || 20) * 7) + daysSinceEnrollment;
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
 * NEVER returns null to prevent runtime crashes. Returns a "Safe Object" with unknown statuses if data is missing.
 */
export function resolveParticipantStatuses(p: AncRegistration) {
  const safeP = {
    ...p,
    current_ga: { weeks: 0, days: 0 },
    edd: new Date(),
    current_trimester: 'unknown' as any,
    delivery_status: 'unknown' as any,
    overall_status: 'unknown' as any,
    isValid: false
  };

  if (!p || typeof p !== 'object' || !p.participantId) return safeP;
  
  const gaAtEnroll = Number(p.gestationalAge);
  const rawEnrollDate = safeParseDate(p.enrollment_date || p.createdAt || p.firstAncDate);

  // Pre-flight check: if we lack core GA or date data, return safe object instead of crashing
  if (isNaN(gaAtEnroll) || gaAtEnroll <= 0 || !rawEnrollDate) {
    return safeP;
  }

  const today = new Date();
  const enrollDate = rawEnrollDate;
  
  const current_ga = calculateCurrentGA(enrollDate, gaAtEnroll, today);
  const edd = calculateEDD(enrollDate, gaAtEnroll);
  const trimester = getTrimester(current_ga.weeks);

  const s2Open = addDays(enrollDate, (34 - gaAtEnroll) * 7);
  const s2Close = addDays(enrollDate, (38 - gaAtEnroll) * 7);
  const s2Target = addDays(enrollDate, (36 - gaAtEnroll) * 7);
  const s2ForecastDate = addDays(enrollDate, (32 - gaAtEnroll) * 7);
  const s2Status = getIndividualSurveyStatus({ open: s2Open, close: s2Close }, !!p.survey2_completed, today);

  const s3Open = addDays(enrollDate, (38 - gaAtEnroll) * 7);
  const s3Close = addDays(enrollDate, (42 - gaAtEnroll) * 7);
  const s3Target = edd;
  const s3ForecastDate = addDays(enrollDate, (36 - gaAtEnroll) * 7);
  const s3Status = getIndividualSurveyStatus({ open: s3Open, close: s3Close }, !!p.survey3_completed, today);

  const s4Open = addDays(edd, 14);
  const s4Close = addDays(edd, 84);
  const s4Target = addDays(edd, 42);
  const s4ForecastDate = edd;
  const s4Status = getIndividualSurveyStatus({ open: s4Open, close: s4Close }, !!p.survey4_completed, today);

  let delivery_status: any = p.delivery_status || 'pregnant';
  if (delivery_status === 'pregnant') {
    if (current_ga.weeks > 42) delivery_status = 'likely_delivered';
    else if (current_ga.weeks > 40) delivery_status = 'overdue_pregnancy';
  }

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
    survey2_window_open: s2Open,
    survey2_window_close: s2Close,
    survey2_target_date: p.survey2_target_date || s2Target,
    survey2_forecast_date: s2ForecastDate,
    survey3_status: s3Status,
    survey3_window_open: s3Open,
    survey3_window_close: s3Close,
    survey3_target_date: p.survey3_target_date || s3Target,
    survey3_forecast_date: s3ForecastDate,
    survey4_status: s4Status,
    survey4_window_open: s4Open,
    survey4_window_close: s4Close,
    survey4_target_date: p.survey4_target_date || s4Target,
    survey4_forecast_date: s4ForecastDate,
    isValid: true
  };
}
