
import 'dotenv/config';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

let adminApp;

try {
  if (getApps().length === 0) {
    const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID;

    if (serviceAccountKey) {
      // Use service account key if provided (local development, specific environments)
      console.log("Initializing Firebase Admin with Service Account Key.");
      const serviceAccount = JSON.parse(serviceAccountKey);
      adminApp = initializeApp({
        credential: cert(serviceAccount),
        projectId: serviceAccount.project_id,
      });
    } else {
      // Otherwise, use Application Default Credentials (recommended for App Hosting)
      console.log("Initializing Firebase Admin with Application Default Credentials.");
      if (!projectId) {
          throw new Error("Firebase project ID is not set. Please set NEXT_PUBLIC_FIREBASE_PROJECT_ID in your environment variables.");
      }
      adminApp = initializeApp({
        projectId: projectId,
      });
    }
  } else {
    adminApp = getApps()[0];
  }
} catch (error) {
  console.error('Failed to initialize Firebase Admin SDK:', error);
  // Do not re-throw the error, as it can crash the server during build or startup.
  // Instead, allow the app to run, and the Firestore calls will fail gracefully.
  adminApp = undefined;
}

// Export the Firestore instance, which may be undefined if initialization failed.
export const adminDb = adminApp ? getFirestore(adminApp) : undefined;
export { adminApp };
