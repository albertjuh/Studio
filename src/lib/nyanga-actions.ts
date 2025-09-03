
"use server";

import { adminDb } from '@/lib/firebase/admin';
import type { NyangaWorker, NyangaReportFormValues, ReportFilterState, NyangaReportData } from '@/types';
import { Timestamp } from 'firebase-admin/firestore';
import { safeGet } from './safe-utils';

const NYANGA_REPORTS_COLLECTION = 'nyanga_reports';
const NYANGA_WORKERS_COLLECTION = 'nyanga_workers';

/**
 * Saves a daily Nyanga report.
 */
export async function saveNyangaReportAction(reportData: NyangaReportFormValues): Promise<{ success: boolean, id?: string, error?: string }> {
  if (!adminDb) {
    return { success: false, error: "Database not initialized." };
  }
  try {
    const reportRef = adminDb.collection(NYANGA_REPORTS_COLLECTION).doc();
    const reportWithTimestamp = {
      ...reportData,
      reportDate: Timestamp.fromDate(reportData.reportDate),
      createdAt: Timestamp.now(), // Add a creation timestamp for sorting
    };

    await reportRef.set(reportWithTimestamp);
    return { success: true, id: reportRef.id };
  } catch (error) {
     console.error("Error saving Nyanga report:", error);
    return { success: false, error: (error as Error).message };
  }
}

/**
 * Fetches Nyanga reports based on a date range.
 */
export async function getNyangaReportsAction(filters: ReportFilterState): Promise<NyangaReportData[]> {
    if (!adminDb) {
      throw new Error("Database not initialized.");
    }
    try {
        let query: FirebaseFirestore.Query = adminDb.collection(NYANGA_REPORTS_COLLECTION);
        
        // Let's simplify and sort by creation date to ensure we get the latest entries.
        // We will remove the date range filter for now to debug.
        query = query.orderBy('createdAt', 'desc').limit(100); // Get latest 100 reports
        
        const snapshot = await query.get();
        if (snapshot.empty) {
            return [];
        }

        return snapshot.docs.map(doc => {
            const data = doc.data();
            const reportDate = safeGet(data, 'reportDate') instanceof Timestamp 
                ? (safeGet(data, 'reportDate') as Timestamp).toDate().toISOString() 
                : new Date().toISOString();
            
            const createdAt = safeGet(data, 'createdAt') instanceof Timestamp
                ? (safeGet(data, 'createdAt') as Timestamp).toDate().toISOString()
                : new Date().toISOString();


            return { 
                id: doc.id,
                ...data,
                reportDate,
                createdAt,
             } as NyangaReportData;
        });

    } catch (error) {
        console.error('Error fetching Nyanga reports:', error);
        throw new Error(`Failed to load Nyanga reports from the database: ${(error as Error).message}`);
    }
}


/**
 * Fetches all active Nyanga workers from the database.
 */
export async function getNyangaWorkersAction(): Promise<NyangaWorker[]> {
  if (!adminDb) {
    throw new Error("Database not initialized.");
  }
  try {
    const snapshot = await adminDb.collection(NYANGA_WORKERS_COLLECTION).orderBy('createdAt', 'desc').get();
    if (snapshot.empty) {
      return [];
    }
    return snapshot.docs.map(doc => {
        const data = doc.data();
        return {
            id: doc.id,
            name: data.name,
            status: data.status,
            createdAt: (data.createdAt as Timestamp).toDate().toISOString(),
        }
    });
  } catch(error) {
      console.error("Error fetching Nyanga workers:", error);
      throw new Error("Could not load worker list from the database.");
  }
}


/**
 * Adds a new Nyanga worker to the database.
 */
export async function addNyangaWorkerAction(workerName: string): Promise<{ success: boolean; id?: string; error?: string; }> {
    if (!adminDb) {
        return { success: false, error: "Database not initialized." };
    }
    try {
        const workerRef = adminDb.collection(NYANGA_WORKERS_COLLECTION).doc();
        const newWorker = {
            name: workerName,
            status: 'active',
            createdAt: Timestamp.now(),
        };
        await workerRef.set(newWorker);
        return { success: true, id: workerRef.id };
    } catch (error) {
        console.error("Error adding Nyanga worker:", error);
        return { success: false, error: (error as Error).message };
    }
}

/**
 * Deletes a Nyanga worker from the database.
 */
export async function deleteNyangaWorkerAction({ workerId, workerName }: { workerId: string; workerName: string; }): Promise<{ success: boolean; error?: string; }> {
     if (!adminDb) {
        return { success: false, error: "Database not initialized." };
    }
    try {
        const workerRef = adminDb.collection(NYANGA_WORKERS_COLLECTION).doc(workerId);
        await workerRef.delete();
        return { success: true };
    } catch (error) {
         console.error(`Error deleting Nyanga worker ${workerName} (ID: ${workerId}):`, error);
        return { success: false, error: (error as Error).message };
    }
}
