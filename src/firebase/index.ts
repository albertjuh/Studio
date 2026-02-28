
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

  const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

  cachedSdks = getSdks(app);
  return cachedSdks;
}

/**
 * Gets or initializes the Firebase SDK instances for a given App.
 */
export function getSdks(app: FirebaseApp) {
  // If we already have the sdks object for this app, return it.
  if (cachedSdks && cachedSdks.firebaseApp === app) return cachedSdks;

  const authInstance = getAuth(app);
  let firestoreInstance: Firestore;

  try {
    // Check if an instance already exists for this app
    firestoreInstance = getFirestore(app);
  } catch (e) {
    // If not already present, initialize with persistent cache
    firestoreInstance = initializeFirestore(app, {
      localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
    });
  }

  const sdks = {
    firebaseApp: app,
    auth: authInstance,
    firestore: firestoreInstance
  };
  
  cachedSdks = sdks;
  return sdks;
}

export * from './provider';
export * from './client-provider';
export * from './firestore/use-collection';
export * from './firestore/use-doc';
export * from './non-blocking-updates';
export * from './non-blocking-login';
export * from './errors';
export * from './error-emitter';
