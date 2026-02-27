
// --- ANC Cohort Study ---
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
  firstAncDate: string; // ISO string for client
  createdAt: string; // ISO string for client
  registeredBy?: string;
}

export interface AncRegistrationFormValues extends Omit<AncRegistration, 'id' | 'createdAt' | 'firstAncDate' | 'phoneNumber'> {
  firstAncDate: Date;
  phoneNumber: { value: string }[];
}

export interface RecruitmentEntry {
  id: string;
  ra_name: string;
  ra_uid: string;
  date: any; // Firestore Timestamp on server, ISO string on client after serialization
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
}

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
    { id: 'temeke_rrh', name: 'Temeke Regional Referral Hospital (Zone C)' },
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
