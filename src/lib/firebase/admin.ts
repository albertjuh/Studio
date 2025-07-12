// src/lib/firebase/admin.ts
import { initializeApp, getApps, cert, getApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

let adminApp;

if (getApps().length === 0) {
  if (!process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY environment variable is not set.');
  }
  
  try {
    const serviceAccount = JSON.parse(
      process.env.FIREBASE_SERVICE_ACCOUNT_KEY
    );

    adminApp = initializeApp({
      credential: cert(serviceAccount),
    });
  } catch(error) {
     console.error("Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY or initialize app", error);
     throw new Error("Firebase admin initialization failed.");
  }

} else {
  adminApp = getApp();
}

export const adminDb = getFirestore(adminApp);
