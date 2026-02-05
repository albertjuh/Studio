
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// This guard is necessary to prevent the Admin SDK from being initialized in the browser.
if (typeof window !== "undefined") {
    throw new Error("Firebase Admin SDK must not be initialized in the browser.");
}

// Check for the required environment variables and throw a clear error if they are missing.
if (!process.env.FIREBASE_PROJECT_ID || !process.env.FIREBASE_CLIENT_EMAIL || !process.env.FIREBASE_PRIVATE_KEY) {
  // This error will be thrown during the build process or on the first server-side execution,
  // making it easier to debug than a generic 500 error.
  throw new Error("Firebase Admin SDK environment variables are not set. Please provide FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY.");
}

const adminApp =
  getApps().length === 0
    ? initializeApp({
        credential: cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          // Vercel automatically handles escaping, but replacing `\\n` with `\n` is a robust way to handle the private key.
          privateKey: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, "\n"),
        }),
      })
    : getApps()[0];

const adminDb = getFirestore(adminApp);

export { adminApp, adminDb };
