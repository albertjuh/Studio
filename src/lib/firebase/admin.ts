
import * as admin from 'firebase-admin';

// This guard is necessary to prevent the Admin SDK from being initialized in the browser.
if (typeof window !== "undefined") {
    throw new Error("Firebase Admin SDK must not be initialized in the browser.");
}

// Check for the required environment variables and throw a clear error if they are missing.
const missingVars = [];
if (!process.env.FIREBASE_PROJECT_ID) missingVars.push("FIREBASE_PROJECT_ID");
if (!process.env.FIREBASE_CLIENT_EMAIL) missingVars.push("FIREBASE_CLIENT_EMAIL");
if (!process.env.FIREBASE_PRIVATE_KEY) missingVars.push("FIREBASE_PRIVATE_KEY");

if (missingVars.length > 0) {
  throw new Error(`Firebase Admin SDK setup failed. The following environment variables are missing: ${missingVars.join(', ')}`);
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
