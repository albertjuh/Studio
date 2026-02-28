
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

  const sdks = {
    firebaseApp: app,
    auth,
    firestore
  };
  
  if (!cachedSdks) {
    cachedSdks = sdks;
  }
  
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
