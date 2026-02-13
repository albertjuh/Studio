
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

export interface AncRegistrationFormValues extends Omit<AncRegistration, 'id' | 'createdAt' | 'firstAncDate'> {
  firstAncDate: Date;
}
