
"use server";

import { adminDb } from '@/lib/firebase/admin';
import type { NyangaWorker, NyangaReportFormValues, ReportFilterState, NyangaReportData } from '@/types';
import { Timestamp } from 'firebase-admin/firestore';
import { safeGet } from './safe-utils';

const NYANGA_WORKERS_COLLECTION = 'nyanga_workers';
const NYANGA_REPORTS_COLLECTION = 'nyanga_reports';


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
    if (!adminDb) {
      throw new Error("Database not initialized.");
    }
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
            const reportDate = safeGet(data, 'reportDate') instanceof Timestamp 
                ? (safeGet(data, 'reportDate') as Timestamp).toDate().toISOString() 
                : new Date().toISOString();

            return { 
                id: doc.id,
                ...data,
                reportDate,
             } as NyangaReportData;
        });

    } catch (error) {
        console.error('Error fetching Nyanga reports:', error);
        throw new Error('Failed to load Nyanga reports from the database.');
    }
}

/**
 * Adds a new worker to the Nyanga workers list.
 */
export async function addNyangaWorkerAction(name: string): Promise<{ success: boolean; newWorker?: NyangaWorker; error?: string }> {
  if (!adminDb) {
    return { success: false, error: "Database not initialized." };
  }
  try {
    const existingWorkerSnapshot = await adminDb.collection(NYANGA_WORKERS_COLLECTION).where('name', '==', name).limit(1).get();
    if (!existingWorkerSnapshot.empty) {
        const existingDoc = existingWorkerSnapshot.docs[0];
        if (safeGet(existingDoc.data(), 'status') === 'inactive') {
            await existingDoc.ref.update({ status: 'active' });
            return { success: true, newWorker: { id: existingDoc.id, ...existingDoc.data(), status: 'active' } as NyangaWorker };
        }
        return { success: false, error: `Worker with name "${name}" already exists and is active.` };
    }

    const workerRef = adminDb.collection(NYANGA_WORKERS_COLLECTION).doc();
    const newWorkerData: Omit<NyangaWorker, 'id'> = {
      name,
      status: 'active',
      createdAt: Timestamp.now().toDate().toISOString(),
    };
    await workerRef.set(newWorkerData);
    
    return { success: true, newWorker: { id: workerRef.id, ...newWorkerData } };
  } catch (error) {
    console.error("Error adding Nyanga worker:", error);
    return { success: false, error: (error as Error).message };
  }
}


/**
 * Fetches all active Nyanga workers.
 */
export async function getNyangaWorkersAction(): Promise<NyangaWorker[]> {
  if (!adminDb) {
    throw new Error("Database not initialized.");
  }
  try {
    const snapshot = await adminDb.collection(NYANGA_WORKERS_COLLECTION)
      .where('status', '==', 'active')
      .orderBy('name')
      .get();
      
    if (snapshot.empty) {
      // One-time seeding logic if the collection is empty
      const initialWorkerName = "Albert Bomani";
      const addResult = await addNyangaWorkerAction(initialWorkerName);
      if (addResult.success && addResult.newWorker) {
        return [addResult.newWorker];
      }
      return [];
    }

    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as NyangaWorker));
  } catch (error) {
    console.error("Error fetching Nyanga workers:", error);
    throw new Error("Could not fetch worker list.");
  }
}

/**
 * Deletes (soft deletes) a worker by setting their status to 'inactive'.
 */
export async function deleteNyangaWorkerAction(workerId: string): Promise<{ success: boolean; error?: string }> {
  if (!adminDb) {
    return { success: false, error: "Database not initialized." };
  }
  try {
    const workerRef = adminDb.collection(NYANGA_WORKERS_COLLECTION).doc(workerId);
    await workerRef.update({ status: 'inactive' });
    return { success: true };
  } catch (error) {
    console.error("Error deleting Nyanga worker:", error);
    return { success: false, error: (error as Error).message };
  }
}
