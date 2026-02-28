
'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, initializeFirestore, persistentMultipleTabManager, persistentLocalCache, Firestore } from 'firebase/firestore'

let cachedSdks: {
  firebaseApp: FirebaseApp;
  auth: Auth;
  firestore: Firestore;
} | undefined;

/**
 * Initializes Firebase and returns the core SDK instances.
 * Uses a singleton pattern to prevent double-initialization errors.
 */
export function initializeFirebase() {
  if (cachedSdks) return cachedSdks;

  let firebaseApp: FirebaseApp;
  if (!getApps().length) {
    try {
      // Attempt to initialize via Firebase App Hosting environment variables
      firebaseApp = initializeApp();
    } catch (e) {
      // Fallback to manual config
      firebaseApp = initializeApp(firebaseConfig);
    }
  } else {
    firebaseApp = getApp();
  }

  cachedSdks = getSdks(firebaseApp);
  return cachedSdks;
}

/**
 * Gets or initializes the Firebase SDK instances for a given App.
 */
export function getSdks(app: FirebaseApp) {
  // If we already have the sdks object for this app, return it.
  if (cachedSdks && cachedSdks.firebaseApp === app) return cachedSdks;

  const auth = getAuth(app);
  let firestore: Firestore;

  try {
    // Attempt to initialize with custom options. 
    // This will throw if already initialized by another part of the code.
    firestore = initializeFirestore(app, {
      localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
    });
  } catch (e) {
    // If initialization fails, fallback to getting the existing instance.
    firestore = getFirestore(app);
  }

  return {
    firebaseApp: app,
    auth,
    firestore
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
