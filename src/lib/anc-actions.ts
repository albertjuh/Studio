
'use server';

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
