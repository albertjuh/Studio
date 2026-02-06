
'use client';

import { getFirestore, enablePersistence, type Firestore } from 'firebase/firestore';
import { app } from './client';

let firestoreInstance: Firestore | null = null;
let persistenceEnabled = false;

// This function initializes Firestore with persistence and should be called on the client.
export const getFirestoreInstance = async (): Promise<Firestore> => {
    if (firestoreInstance) {
        return firestoreInstance;
    }

    // Pass the app instance to getFirestore
    const db = getFirestore(app);

    if (!persistenceEnabled) {
        try {
            await enablePersistence(db, {
                synchronizeTabs: true
            });
            persistenceEnabled = true;
            console.log("Firestore offline persistence enabled.");
        } catch (err: any) {
            if (err.code === 'failed-precondition') {
                // Multiple tabs open, persistence can only be enabled in one.
                // This is fine, persistence is already running in another tab.
                 persistenceEnabled = true;
            } else if (err.code === 'unimplemented') {
                // The current browser does not support all of the
                // features required to enable persistence.
                console.warn("Firestore offline persistence is not supported in this browser.");
            }
        }
    }
    
    firestoreInstance = db;
    return firestoreInstance;
};
