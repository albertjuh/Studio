
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

  const daysToSurvey2 = Math.max(0, (28 - gaWeeksAtEnrollment) * 7);
  const survey2TargetDate = addDays(enrollmentDate, daysToSurvey2);
  const survey2WindowOpen = addDays(survey2TargetDate, -14);
  const survey2WindowClose = addDays(survey2TargetDate, 14);

  const daysToSurvey3 = Math.max(0, (36 - gaWeeksAtEnrollment) * 7);
  const survey3TargetDate = addDays(enrollmentDate, daysToSurvey3);
  const survey3WindowOpen = addDays(survey3TargetDate, -14);
  const survey3WindowClose = addDays(survey3TargetDate, 14);

  const survey4TargetDate = addDays(edd, 42);
  const survey4WindowOpen = addDays(edd, 14);
  const survey4WindowClose = addDays(edd, 84);

  return {
    survey2: { target: survey2TargetDate, open: survey2WindowOpen, close: survey2WindowClose },
    survey3: { target: survey3TargetDate, open: survey3WindowOpen, close: survey3WindowClose },
    survey4: { target: survey4TargetDate, open: survey4WindowOpen, close: survey4WindowClose },
  };
}

export function getSurveyStatus(
  window: { open: Date; close: Date; target: Date },
  isCompleted: boolean,
  today: Date = new Date()
): SurveyStatus {
  if (isCompleted) return 'completed';
  if (isAfter(startOfDay(today), startOfDay(window.close))) return 'overdue';
  if (isWithinInterval(startOfDay(today), { start: startOfDay(window.open), end: startOfDay(window.close) })) return 'due_now';
  if (differenceInDays(startOfDay(window.open), startOfDay(today)) <= 14) return 'due_soon';
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

export function getOverallStatus(p: any): ParticipantStatus {
  const statuses = [p.survey2_status, p.survey3_status, p.survey4_status];
  if (p.survey2_completed && p.survey3_completed && p.survey4_completed) return 'complete';
  if (statuses.includes('overdue')) return 'overdue';
  if (statuses.includes('due_now')) return 'action_needed';
  if (p.delivery_status === 'likely_delivered' || p.delivery_status === 'overdue_pregnancy') return 'likely_delivered';
  return 'on_track';
}
