'use server';

import { adminDb } from '@/lib/firebase/admin';
import { Timestamp } from 'firebase-admin/firestore';
import { z } from 'zod';
import type { AncRegistration } from '@/types';
import { safeGet } from '@/lib/safe-utils';

// Recreate the schema from the form to validate on the server
const formSchema = z.object({
  facility: z.string().min(1, 'Health facility is required.'),
  participantId: z.string().min(1, 'Participant ID is required.'),
  fullName: z.string().min(1, { message: 'Full Name is required.' }),
  age: z.coerce.number().min(15).max(50),
  phoneNumber: z.string().regex(/^(?:\+255|0)\d{9}$/, { message: 'Invalid Tanzanian phone number.' }),
  altPhoneNumber: z.string().optional(),
  maritalStatus: z.enum(['Single', 'Married', 'Cohabiting', 'Divorced/Separated', 'Widowed']),
  ward: z.string().min(1, 'Ward/Mtaa is required.'),
  street: z.string().min(1, 'Street Name is required.'),
  houseNumber: z.string().optional(),
  chairpersonName: z.string().optional(),
  firstAncDate: z.date(),
  previousPregnancies: z.string().optional(),
  isPlanned: z.enum(['Yes', 'No']),
  agreeToParticipate: z.boolean().refine(val => val === true),
  understandConfidentiality: z.boolean().refine(val => val === true),
  registeredById: z.string().optional(),
});

type AncRegistrationData = z.infer<typeof formSchema>;

if (!adminDb) {
  throw new Error("Firestore admin instance is not available. Check Firebase Admin initialization.");
}

const registrationsCollection = adminDb.collection('anc_registrations');

export async function saveAncRegistrationAction(data: AncRegistrationData): Promise<{ success: boolean; id?: string; error?: string }> {
    try {
        const validation = formSchema.safeParse(data);
        if (!validation.success) {
            console.error("Server-side validation failed:", validation.error.flatten());
            throw new Error("Invalid data provided.");
        }

        const docRef = registrationsCollection.doc(data.participantId);
        
        const existingDoc = await docRef.get();
        if (existingDoc.exists) {
            return { success: false, error: `Participant with ID ${data.participantId} already exists.` };
        }
        
        const registrationData = {
            ...validation.data,
            firstAncDate: Timestamp.fromDate(validation.data.firstAncDate),
            createdAt: Timestamp.now(),
        };

        await docRef.set(registrationData);
        
        return { success: true, id: docRef.id };
    } catch (error) {
        console.error("Error saving ANC registration:", error);
        return { success: false, error: (error as Error).message };
    }
}


export async function getAncRegistrationsAction(): Promise<AncRegistration[]> {
    try {
        const snapshot = await registrationsCollection.orderBy('createdAt', 'desc').get();
        if (snapshot.empty) {
            return [];
        }

        return snapshot.docs.map(doc => {
            const data = doc.data();

            const firstAncDateValue = safeGet(data, 'firstAncDate');
            const createdAtValue = safeGet(data, 'createdAt');

            // Handle potential Timestamp objects for date fields
            const firstAncDateString = firstAncDateValue && typeof firstAncDateValue.toDate === 'function' 
                ? firstAncDateValue.toDate().toISOString() 
                : new Date().toISOString();

            const createdAtString = createdAtValue && typeof createdAtValue.toDate === 'function' 
                ? createdAtValue.toDate().toISOString()
                : new Date().toISOString();

            // Manually construct the object to ensure it's serializable
            const registration: AncRegistration = {
                id: doc.id,
                facility: safeGet(data, 'facility', ''),
                participantId: safeGet(data, 'participantId', ''),
                fullName: safeGet(data, 'fullName', ''),
                age: safeGet(data, 'age', 0),
                phoneNumber: safeGet(data, 'phoneNumber', ''),
                altPhoneNumber: safeGet(data, 'altPhoneNumber', ''),
                maritalStatus: safeGet(data, 'maritalStatus', 'Single'),
                ward: safeGet(data, 'ward', ''),
                street: safeGet(data, 'street', ''),
                houseNumber: safeGet(data, 'houseNumber', ''),
                chairpersonName: safeGet(data, 'chairpersonName', ''),
                firstAncDate: firstAncDateString,
                previousPregnancies: safeGet(data, 'previousPregnancies', '0'),
                isPlanned: safeGet(data, 'isPlanned', 'No'),
                agreeToParticipate: safeGet(data, 'agreeToParticipate', false),
                understandConfidentiality: safeGet(data, 'understandConfidentiality', false),
                createdAt: createdAtString,
                registeredById: safeGet(data, 'registeredById', 'N/A'),
            };

            return registration;
        });

    } catch (error) {
        console.error('Error fetching ANC registrations:', error);
        throw new Error('Failed to load registration data from the database.');
    }
}
