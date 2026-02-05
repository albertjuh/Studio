
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// This guard is necessary to prevent the Admin SDK from being initialized in the browser.
if (typeof window !== "undefined") {
    throw new Error("Firebase Admin SDK must not be initialized in the browser.");
}

// Check for the necessary environment variables for Vercel/serverless environments.
if (!process.env.FIREBASE_PROJECT_ID || !process.env.FIREBASE_CLIENT_EMAIL || !process.env.FIREBASE_PRIVATE_KEY) {
    throw new Error(
        'Firebase Admin SDK initialization failed. Make sure FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY are set in your environment variables.'
    );
}

// The private key from Vercel env vars needs newlines to be correctly formatted.
const privateKey = process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n');

const adminApp =
  getApps().length === 0
    ? initializeApp({
        credential: cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: privateKey,
        }),
      })
    : getApps()[0];

const adminDb = getFirestore(adminApp);

export { adminApp, adminDb };
