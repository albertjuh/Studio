
"use server";

import type { NyangaReportData, NyangaReportFormValues, NyangaWorker } from "@/types";
import { adminDb } from "@/lib/firebase/admin";
import { Timestamp } from "firebase-admin/firestore";
import { safeGet } from "./safe-utils";
import { NYANGA_WORKERS } from "./constants";

if (!adminDb) {
  throw new Error("Firestore admin instance is not available. Check Firebase Admin initialization.");
}
const nyangaReportsCollection = adminDb.collection('nyanga_reports');
const nyangaWorkersCollection = adminDb.collection('nyanga_workers');


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

export async function addNyangaWorkerAction(name: string): Promise<{ success: boolean; id?: string; error?: string }> {
    try {
        // Check if a worker with the same name already exists to prevent duplicates
        const querySnapshot = await nyangaWorkersCollection.where('name', '==', name).limit(1).get();
        if (!querySnapshot.empty) {
            return { success: false, error: `A worker named "${name}" already exists.` };
        }

        const docRef = nyangaWorkersCollection.doc();
        const workerData = {
            id: docRef.id,
            name: name,
        };
        await docRef.set(workerData);
        return { success: true, id: docRef.id };
    } catch (error) {
        console.error("Error adding Nyanga worker:", error);
        return { success: false, error: (error as Error).message };
    }
}

export async function deleteNyangaWorkerAction(workerId: string): Promise<{ success: boolean; error?: string }> {
    try {
        const docRef = nyangaWorkersCollection.doc(workerId);
        await docRef.delete();
        return { success: true };
    } catch (error) {
        console.error("Error deleting Nyanga worker:", error);
        return { success: false, error: (error as Error).message };
    }
}

export async function getNyangaWorkersAction(): Promise<NyangaWorker[]> {
    try {
        const snapshot = await nyangaWorkersCollection.orderBy('name').get();
        if (snapshot.empty) {
            // If the collection is empty, seed it with the initial workers from constants
            const batch = adminDb.batch();
            for (const worker of NYANGA_WORKERS) {
                const docRef = nyangaWorkersCollection.doc(worker.id);
                batch.set(docRef, worker);
            }
            await batch.commit();
            return NYANGA_WORKERS;
        }
        return snapshot.docs.map(doc => doc.data() as NyangaWorker);
    } catch (error) {
        console.error("Error fetching Nyanga workers:", error);
        throw new Error(`Failed to load Nyanga workers: ${(error as Error).message}`);
    }
}

    