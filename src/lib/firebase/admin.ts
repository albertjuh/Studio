// src/lib/firebase/admin.ts
import { initializeApp, getApps, cert, getApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

let adminApp;

if (getApps().length === 0) {
  if (!process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    console.error("CRITICAL: FIREBASE_SERVICE_ACCOUNT_KEY environment variable is not set. The application's server-side functions will not work. Ensure this is set in your Vercel project settings.");
    throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY environment variable is not set.');
  }
  
  try {
    // Attempt to parse the service account key from the environment variable
    const serviceAccount = JSON.parse(
      process.env.FIREBASE_SERVICE_ACCOUNT_KEY
    );

    // Initialize the Firebase Admin SDK
    adminApp = initializeApp({
      credential: cert(serviceAccount),
    });
  } catch(error) {
     console.error("CRITICAL: Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY or initialize Firebase Admin SDK. Ensure the environment variable contains a valid JSON service account key.", error);
     throw new Error("Firebase admin initialization failed.");
  }

} else {
  // If already initialized, get the existing app
  adminApp = getApp();
}

export const adminDb = getFirestore(adminApp);
