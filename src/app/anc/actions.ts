'use server';

export const runtime = 'nodejs';

import { z } from 'zod';
import type { AncRegistration } from '@/types';
import { InventoryDataService } from '@/lib/database-service';
import { serializeFirestoreData } from '@/lib/firestore-serialize';

// The form schema remains at the top level as it contains no side effects.
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

export async function saveAncRegistrationAction(data: AncRegistrationData): Promise<{ success: boolean; id?: string; error?: string }> {
    try {
        // Initialize the service inside the function to ensure it runs at request time, not build time.
        const dbService = InventoryDataService.getInstance();
        
        const validation = formSchema.safeParse(data);
        if (!validation.success) {
            console.error("Server-side validation failed:", validation.error.flatten());
            throw new Error("Invalid data provided.");
        }
        
        return await dbService.saveAncRegistration(validation.data);

    } catch (error) {
        console.error("Error in saveAncRegistrationAction:", error);
        return { success: false, error: (error as Error).message };
    }
}


export async function getAncRegistrationsAction(): Promise<AncRegistration[]> {
    try {
        // Initialize the service inside the function.
        const dbService = InventoryDataService.getInstance();
        const registrations = await dbService.getAncRegistrations();
        return serializeFirestoreData(registrations);
    } catch (error) {
        console.error('Error in getAncRegistrationsAction:', error);
        throw new Error('Failed to load registration data from the database.');
    }
}
