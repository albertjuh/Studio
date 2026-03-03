'use client';
import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth, setPersistence, indexedDBLocalPersistence } from 'firebase/auth';
import { getFirestore, initializeFirestore, persistentMultipleTabManager, persistentLocalCache, Firestore } from 'firebase/firestore';

let cachedSdks: {
  firebaseApp: FirebaseApp;
  auth: Auth;
  firestore: Firestore;
} | undefined;

export function initializeFirebase() {
  if (cachedSdks) return cachedSdks;
  const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
  cachedSdks = getSdks(app);
  return cachedSdks;
}

export function getSdks(app: FirebaseApp) {
  if (cachedSdks && cachedSdks.firebaseApp === app) return cachedSdks;
  const authInstance = getAuth(app);
  setPersistence(authInstance, indexedDBLocalPersistence).catch(() => {});
  let firestoreInstance: Firestore;
  try {
    // Always try to initialize WITH persistence first
    firestoreInstance = initializeFirestore(app, {
      localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
    });
  } catch (e) {
    // Already initialized — get the existing instance
    firestoreInstance = getFirestore(app);
  }
  cachedSdks = {
    firebaseApp: app,
    auth: authInstance,
    firestore: firestoreInstance
  };
  return cachedSdks;
}

export * from './provider';
export * from './client-provider';
export * from './firestore/use-collection';
export * from './firestore/use-doc';
export * from './non-blocking-updates';
export * from './non-blocking-login';
export * from './errors';
export * from './error-emitter';
