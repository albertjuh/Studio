import 'dotenv/config';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

let adminApp;

try {
  // Check if Firebase Admin is already initialized
  if (getApps().length === 0) {
    // Ensure the service account key is available
    if (!process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
      throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY environment variable is not set. Please check your .env.local file.');
    }
     // Ensure the Gemini API key is available for server-side AI calls
    if (!process.env.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY environment variable is not set. This is required for Genkit AI features.');
    }
    
    // Parse the service account key JSON
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
    
    // Initialize Firebase Admin
    adminApp = initializeApp({
      credential: cert(serviceAccount),
      projectId: serviceAccount.project_id,
    });
  } else {
    adminApp = getApps()[0];
  }
} catch (error) {
  console.error('Failed to initialize Firebase Admin:', error);
  throw error;
}

// Export the Firestore instance
export const adminDb = getFirestore(adminApp);
export { adminApp };
