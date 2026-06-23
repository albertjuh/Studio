'use client';
import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth, setPersistence, indexedDBLocalPersistence } from 'firebase/auth';
import { getFirestore, initializeFirestore, persistentMultipleTabManager, persistentLocalCache, Firestore } from 'firebase/firestore';

let cachedApp: FirebaseApp | undefined;
let cachedAuth: Auth | undefined;
let cachedFirestore: Firestore | undefined;

/**
 * Initializes Firebase with specific configurations for stability 
 * in proxy-heavy environments like Cloud Workstations.
 * Optimized to handle offline-first workflows and minimize network noise.
 */
export function initializeFirebase() {
  if (cachedApp && cachedAuth && cachedFirestore) {
    return { firebaseApp: cachedApp, auth: cachedAuth, firestore: cachedFirestore };
  }

  const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
  
  const authInstance = getAuth(app);
  
  // Set persistence immediately but ignore network errors (handled by auth listeners)
  if (typeof window !== 'undefined') {
    setPersistence(authInstance, indexedDBLocalPersistence).catch(() => {
        // Silently fail persistence if indexedDB is unavailable
    });
  }
  
  // Singleton initialization for Firestore to prevent "Firestore already initialized" errors
  let firestoreInstance: Firestore;
  if (!cachedFirestore) {
    try {
      firestoreInstance = initializeFirestore(app, {
        localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
        experimentalForceLongPolling: true, // Mandatory for Cloud Workstation stream stability
        experimentalAutoDetectLongPolling: true, // Added for smarter proxy handling
      });
    } catch (e) {
      firestoreInstance = getFirestore(app);
    }
    cachedFirestore = firestoreInstance;
  } else {
    firestoreInstance = cachedFirestore;
  }

  cachedApp = app;
  cachedAuth = authInstance;

  return {
    firebaseApp: app,
    auth: authInstance,
    firestore: firestoreInstance
  };
}

export * from './provider';
export * from './client-provider';
export * from './firestore/use-collection';
export * from './firestore/use-doc';
export * from './non-blocking-updates';
export * from './non-blocking-login';
export * from './errors';
export * from './error-emitter';
