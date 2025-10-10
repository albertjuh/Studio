
import 'dotenv/config';
import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';

let adminApp: App | undefined;

if (typeof window !== "undefined") {
    throw new Error("Firebase Admin SDK must not be initialized in the browser.");
}

if (getApps().length === 0) {
  try {
    const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID;

    if (serviceAccountKey) {
      const serviceAccount = JSON.parse(serviceAccountKey);
      console.log("Initializing Firebase Admin with Service Account Key.");
      adminApp = initializeApp({
        credential: cert(serviceAccount),
        projectId: serviceAccount.project_id,
      });
    } else if (projectId) {
      console.log("Initializing Firebase Admin with Application Default Credentials.");
      adminApp = initializeApp({
        projectId: projectId,
      });
    } else {
      console.warn('Firebase Admin SDK not initialized. Missing FIREBASE_SERVICE_ACCOUNT_KEY or NEXT_PUBLIC_FIREBASE_PROJECT_ID environment variables.');
    }
  } catch (error) {
    console.error('Failed to initialize Firebase Admin SDK:', error);
  }
} else {
  adminApp = getApps()[0];
}

const adminDb: Firestore | undefined = adminApp ? getFirestore(adminApp) : undefined;

if (!adminDb) {
    console.error("Firestore database instance could not be initialized. All database operations will fail.");
}

export { adminApp, adminDb };
