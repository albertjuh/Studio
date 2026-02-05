
import * as admin from 'firebase-admin';

// This guard is necessary to prevent the Admin SDK from being initialized in the browser.
if (typeof window !== "undefined") {
    throw new Error("Firebase Admin SDK must not be initialized in the browser.");
}

// Fail fast on server boot if env vars are missing
const requiredEnv = [
  'FIREBASE_PROJECT_ID',
  'FIREBASE_CLIENT_EMAIL',
  'FIREBASE_PRIVATE_KEY',
];

for (const key of requiredEnv) {
  if (!process.env[key]) {
    // Throw an error that will be caught by the server's startup process
    // This prevents the app from running in a misconfigured state.
    throw new Error(`Missing required server environment variable: ${key}`);
  }
}


if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, "\n"),
    }),
  });
}

export const adminDb = admin.firestore();
export const adminApp = admin.app();
