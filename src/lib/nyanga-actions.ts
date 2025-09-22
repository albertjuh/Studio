
"use server";

import type { NyangaReportData, NyangaReportFormValues, NyangaWorker } from "@/types";
import { adminDb } from "@/lib/firebase/admin";
import { Timestamp } from "firebase-admin/firestore";
import { safeGet } from "./safe-utils";

if (!adminDb) {
  throw new Error("Firestore admin instance is not available. Check Firebase Admin initialization.");
}
const nyangaReportsCollection = adminDb.collection('nyanga_reports');

export async function saveNyangaReportAction(data: NyangaReportFormValues): Promise<{ success: boolean; id?: string; error?: string }> {
    try {
        const docRef = nyangaReportsCollection.doc();
        const reportData = {
            ...data,
            id: docRef.id,
            reportDate: Timestamp.fromDate(data.reportDate),
            createdAt: Timestamp.now(),
        };
        await docRef.set(reportData);
        return { success: true, id: docRef.id };
    } catch (error) {
        console.error("Error saving Nyanga report:", error);
        return { success: false, error: (error as Error).message };
    }
}

export async function getNyangaReportsAction(filters: { startDate: Date, endDate: Date }): Promise<NyangaReportData[]> {
    try {
        let query = nyangaReportsCollection.orderBy('reportDate', 'desc');

        if (filters.startDate) {
            query = query.where('reportDate', '>=', Timestamp.fromDate(filters.startDate));
        }
        if (filters.endDate) {
            query = query.where('reportDate', '<=', Timestamp.fromDate(filters.endDate));
        }
        
        const snapshot = await query.get();

        if (snapshot.empty) {
            return [];
        }
        
        return snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                ...data,
                id: doc.id,
                reportDate: safeGet(data, 'reportDate')?.toDate().toISOString(),
                createdAt: safeGet(data, 'createdAt')?.toDate().toISOString(),
            } as NyangaReportData;
        });
    } catch (error) {
        console.error("Error fetching Nyanga reports:", error);
        throw new Error(`Failed to load Nyanga reports: ${(error as Error).message}`);
    }
}

export async function clearNyangaReportsAction(): Promise<{ success: boolean; count: number; error?: string }> {
    try {
        const snapshot = await nyangaReportsCollection.get();
        if (snapshot.empty) {
            return { success: true, count: 0 };
        }

        const batch = adminDb.batch();
        snapshot.docs.forEach(doc => {
            batch.delete(doc.ref);
        });

        await batch.commit();
        return { success: true, count: snapshot.size };
    } catch (error) {
        console.error("Error clearing Nyanga reports:", error);
        return { success: false, count: 0, error: (error as Error).message };
    }
}
