
"use server";

import { adminDb } from '@/lib/firebase/admin';
import type { NyangaWorker, NyangaReportFormValues, ReportFilterState, NyangaReportData } from '@/types';
import { Timestamp } from 'firebase-admin/firestore';

const NYANGA_WORKERS_COLLECTION = 'nyanga_workers';
const NYANGA_REPORTS_COLLECTION = 'nyanga_reports';

/**
 * Adds a new worker to the Nyanga workers list.
 */
export async function addNyangaWorkerAction(name: string): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const workerRef = adminDb.collection(NYANGA_WORKERS_COLLECTION).doc();
    const newWorker: NyangaWorker = {
      id: workerRef.id,
      name,
      status: 'active',
      createdAt: Timestamp.now().toDate().toISOString(),
    };
    await workerRef.set(newWorker);
    return { success: true, id: workerRef.id };
  } catch (error) {
    console.error("Error adding Nyanga worker:", error);
    return { success: false, error: (error as Error).message };
  }
}

/**
 * Deletes (soft deletes) a worker by setting their status to 'inactive'.
 */
export async function deleteNyangaWorkerAction(workerId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const workerRef = adminDb.collection(NYANGA_WORKERS_COLLECTION).doc(workerId);
    await workerRef.update({ status: 'inactive' });
    return { success: true };
  } catch (error) {
    console.error("Error deleting Nyanga worker:", error);
    return { success: false, error: (error as Error).message };
  }
}


/**
 * Fetches all active Nyanga workers.
 */
export async function getNyangaWorkersAction(): Promise<NyangaWorker[]> {
  try {
    const snapshot = await adminDb.collection(NYANGA_WORKERS_COLLECTION)
      .where('status', '==', 'active')
      .orderBy('name')
      .get();
      
    if (snapshot.empty) {
      return [];
    }

    return snapshot.docs.map(doc => doc.data() as NyangaWorker);
  } catch (error) {
    console.error("Error fetching Nyanga workers:", error);
    throw new Error("Could not fetch worker list.");
  }
}

/**
 * Saves a daily Nyanga report.
 */
export async function saveNyangaReportAction(reportData: NyangaReportFormValues): Promise<{ success: boolean, id?: string, error?: string }> {
  try {
    const reportRef = adminDb.collection(NYANGA_REPORTS_COLLECTION).doc();
    const reportWithTimestamp = {
      ...reportData,
      reportDate: Timestamp.fromDate(reportData.reportDate),
      createdAt: Timestamp.now(),
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
    try {
        let query: FirebaseFirestore.Query = adminDb.collection(NYANGA_REPORTS_COLLECTION);
        
        if (filters?.startDate) {
            query = query.where('reportDate', '>=', Timestamp.fromDate(filters.startDate));
        }
        if (filters?.endDate) {
            query = query.where('reportDate', '<=', Timestamp.fromDate(filters.endDate));
        }
        
        query = query.orderBy('reportDate', 'desc');
        
        const snapshot = await query.get();
        if (snapshot.empty) {
            return [];
        }

        return snapshot.docs.map(doc => {
            const data = doc.data();
            return { 
                id: doc.id,
                ...data,
                reportDate: (data.reportDate as Timestamp).toDate().toISOString(),
             } as NyangaReportData;
        });

    } catch (error) {
        console.error('Error fetching Nyanga reports:', error);
        throw new Error('Failed to load Nyanga reports from the database.');
    }
}
