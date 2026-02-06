
'use server';

import type { AncRegistration } from '@/types';
import { InventoryDataService } from '@/lib/database-service';
import { serializeFirestoreData } from '@/lib/firestore-serialize';
import { normalizeError } from '@/lib/normalize-error';

type ActionResponse<T> = { ok: true, data: T } | { ok: false, error: { message: string } };

export async function getAncRegistrationsAction(filters?: { startDate?: Date; endDate?: Date }): Promise<ActionResponse<AncRegistration[]>> {
    try {
        const dbService = InventoryDataService.getInstance();
        const registrations = await dbService.getAncRegistrations(filters);
        const serializedData = serializeFirestoreData(registrations);
        return { ok: true, data: serializedData };
    } catch (error) {
        return { ok: false, error: normalizeError(error) };
    }
}
