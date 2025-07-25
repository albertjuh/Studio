// src/lib/firebase/client.ts
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Check for missing configuration keys on the client side
if (typeof window !== 'undefined') { // Only run in the browser
  const missingKeys = Object.entries(firebaseConfig).filter(([, value]) => !value);
  if (missingKeys.length > 0) {
    console.error('CRITICAL: Missing Firebase client configuration. Ensure all NEXT_PUBLIC_FIREBASE_* environment variables are set correctly in your Vercel project settings and your local .env.local file.');
    missingKeys.forEach(([key]) => console.error(`- Missing: ${key}`));
  }
}

// Initialize Firebase
let app: FirebaseApp;
let db: Firestore;

try {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    db = getFirestore(app);
} catch (error) {
    console.error("Firebase client initialization failed:", error);
    // In a real app, you might want to handle this more gracefully,
    // maybe by showing a "Service is unavailable" message to the user.
    // For now, we allow the app to continue running, but Firebase features will fail.
    // @ts-ignore
    app = null;
    // @ts-ignore
    db = null; 
}


export { app, db };
