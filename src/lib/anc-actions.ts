
'use server';

// This file is being deprecated for client-side use as we move to a static build.
// The functions may still be useful for future server-side operations (e.g., scheduled tasks)
// but they should not be imported or used by client components.

import { InventoryDataService } from '@/lib/database-service';
import type { AncRegistration, AncRegistrationFormValues } from '@/types';
import { unstable_noStore as noStore } from 'next/cache';

const dbService = InventoryDataService.getInstance();

export async function getAncRegistrationsAction(filters?: { startDate?: Date, endDate?: Date }): Promise<AncRegistration[]> {
    noStore();
    try {
        const registrations = await dbService.getAncRegistrations(filters);
        return registrations as AncRegistration[];
    } catch (error) {
        console.error("Error in getAncRegistrationsAction:", error);
        throw new Error("Failed to fetch ANC registrations.");
    }
}

export async function deleteAncRegistrationAction(participantId: string): Promise<{ success: boolean; error?: string }> {
    try {
        return await dbService.deleteAncRegistration(participantId);
    } catch (error) {
        console.error("Error in deleteAncRegistrationAction:", error);
        return { success: false, error: (error as Error).message };
    }
}

export async function deleteAllAncRegistrationsAction(): Promise<{ success: boolean; count: number; error?: string }> {
    try {
        return await dbService.deleteAllAncRegistrations();
    } catch (error) {
        console.error("Error in deleteAllAncRegistrationsAction:", error);
        return { success: false, count: 0, error: (error as Error).message };
    }
}
