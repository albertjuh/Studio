// --- ANC Cohort Study ---
export type SurveyStatus = 'completed' | 'due_now' | 'due_soon' | 'upcoming' | 'overdue' | 'missed_window' | 'not_applicable';
export type DeliveryStatus = 'pregnant' | 'likely_delivered' | 'delivered' | 'overdue_pregnancy';
export type ParticipantStatus = 'on_track' | 'action_needed' | 'overdue' | 'likely_delivered' | 'complete' | 'lost_to_followup';

export interface AuditEntry {
  edited_at: any;
  edited_by: string;
  changes: {
    [key: string]: {
      before: any;
      after: any;
    };
  };
}

export interface AncRegistration {
  id: string;
  participantId: string;
  healthFacility: string;
  name: string;
  age: number;
  maritalStatus: string;
  phoneNumber: string[];
  nextOfKinName?: string;
  alternativeContact?: string;
  gestationalAge: number;
  firstAncDate: string;
  createdAt: string;
  registeredBy?: string;
  is_edited?: boolean;
  edit_history?: AuditEntry[];
  survey1_completed: boolean;
  enrollment_date: any;
  edd?: any;
  current_ga_weeks?: number;
  current_trimester?: 1 | 2 | 3 | 'postpartum';
  delivery_status?: DeliveryStatus;
  overall_status?: ParticipantStatus;
  survey2_status?: SurveyStatus;
  survey2_target_date?: any;
  survey2_window_open?: any;
  survey2_window_close?: any;
  survey2_completed?: boolean;
  survey3_status?: SurveyStatus;
  survey3_target_date?: any;
  survey3_window_open?: any;
  survey3_window_close?: any;
  survey3_completed?: boolean;
  survey4_status?: SurveyStatus;
  survey4_target_date?: any;
  survey4_window_open?: any;
  survey4_window_close?: any;
  survey4_completed?: boolean;
  delivery_date_confirmed?: any;
  last_contact_date?: any;
}

export interface TimelineEvent {
  id: string;
  event_type: 'enrolled' | 'survey_completed' | 'survey_overdue' | 'trimester_change' | 'delivery_recorded' | 'phone_contact' | 'window_opened' | 'reminder_set';
  event_date: any;
  survey_number?: 1 | 2 | 3 | 4;
  ga_weeks_at_event?: number;
  trimester_at_event?: 1 | 2 | 3 | 'postpartum';
  notes?: string;
  created_at: any;
}

export interface RecruitmentEntry {
  id: string;
  ra_name: string;
  ra_uid: string;
  date: any;
  date_string: string;
  facility: string;
  providers: number;
  total_anc: number;
  eligible: number;
  interviewed: number;
  missed: number;
  num_women: number;
  reason: string;
  notes: string;
  first_row_flag: number | null;
  created_at: any;
  updated_at: any;
  is_edited?: boolean;
  edit_history?: AuditEntry[];
}

export interface StudyNotification {
  id: string;
  created_at: any;
  criticality: NotificationCriticality;
  recipients: NotificationRecipients;
  relevant_ra: string | null;
  title: string;
  body: string;
  full_analysis: string;
  recommended_action: string;
  participant_id: string | null;
  facility: string | null;
  data_points: string[];
  ai_generated: boolean;
  delivered_to: string[];
  read_by: string[];
  actioned_by: string | null;
  actioned_at: any | null;
}

export type NotificationCriticality = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
export type NotificationRecipients = 'ADMINS_ONLY' | 'ADMINS_AND_RELEVANT_RA' | 'ALL_RAS';

export const RECRUITMENT_REASONS = [
  'Did not consent',
  'Finance issue',
  'Partner did not consent',
  'Disappeared/Left before completion',
  'RA was with another woman',
  'Working hours done - sent away',
  'Language barrier',
  'Too sick/unwell',
  'Not eligible',
  'Does not live in Temeke Municipality',
  'Will not deliver in Temeke Municipality',
  'Cognitive impairment',
  'Had a baby with known lethal fetal anomaly',
  'Other'
];

export const HEALTH_FACILITIES = [
    { id: 'changombe_disp', name: 'Changombe Dispensary (Zone A)' },
    { id: 'keko_mwanga_disp', name: 'Keko Mwanga Dispensary (Zone A)' },
    { id: 'sandali_disp', name: 'Sandali Dispensary (Zone A)' },
    { id: 'kilakala_hc', name: 'Kilakala Health Center (Zone A)' },
    { id: 'yombo_vituka_hc', name: 'Yombo Vituka Health Center (Zone A)' },
    { id: 'buza_hc', name: 'Buza Health Center (Zone A)' },
    { id: 'sigara_disp', name: 'Sigara Dispensary (Zone A)' },
    { id: 'makangarawe_disp', name: 'Makangarawe Dispensary (Zone A)' },
    { id: 'mikwambe_disp', name: 'Mikwambe Dispensary (Zone B)' },
    { id: 'toangoma_disp', name: 'Toangoma Dispensary (Zone B)' },
    { id: 'goroka_hc', name: 'Goroka Health Center (Zone B)' },
    { id: 'kichemchem_disp', name: 'Kichemchem Dispensary (Zone B)' },
    { id: 'mbagala_kuu_disp', name: 'Mbagala Kuu Dispensary (Zone B)' },
    { id: 'kurasini_disp', name: 'Kurasini Dispensary (Zone B)' },
    { id: 'mbagala_rangi_tatu_hosp', name: 'Mbagala Rangi Tatu Hospital (Zone B)' },
    { id: 'kijichi_hc', name: 'Kijichi Health Center (Zone B)' },
    { id: 'mbagala_roundtable_hc', name: 'Mbagala Roundtable Health Center (Zone C)' },
    { id: 'mbagala_kizuiani_disp', name: 'Mbagala Kizuiani Dispensary (Zone C)' },
    { id: 'mtoni_disp', name: 'Mtoni Dispensary (Zone C)' },
    { id: 'tambukareli_disp', name: 'Tambukareli Dispensary (Zone C)' },
    { id: 'mzinga_disp', name: 'Mzinga Dispensary (Zone C)' },
    { id: 'miburani_disp', name: 'Miburani Dispensary (Zone C)' },
    { id: 'thandika_disp', name: 'Tandika Dispensary (Zone C)' },
    { id: 'mkodogwa_hc', name: 'Mkodogwa Health Center (Zone D)' },
    { id: 'maji_matitu_hc', name: 'Maji Matitu Health Center (Zone D)' },
    { id: 'mbande_hc', name: 'Mbande Health Center (Zone D)' },
    { id: 'charambe_disp', name: 'Charambe Dispensary (Zone D)' },
    { id: 'chamazi_disp', name: 'Chamazi Dispensary (Zone D)' },
    { id: 'kingugi_disp', name: 'Kingugi Dispensary (Zone D)' },
    { id: 'kilungule_disp', name: 'Kilungule Dispensary (Zone D)' },
];
