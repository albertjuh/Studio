// src/lib/firebase/config.ts
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';

// Debug logging
console.log('=== CLIENT FIREBASE DEBUG ===');
console.log('Environment variables:');
console.log('- API_KEY:', !!process.env.NEXT_PUBLIC_FIREBASE_API_KEY);
console.log('- PROJECT_ID:', !!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID);
console.log('- AUTH_DOMAIN:', !!process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN);

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Check for missing configuration
const missingKeys = Object.entries(firebaseConfig).filter(([key, value]) => !value);
if (missingKeys.length > 0) {
  console.error('Missing Firebase configuration keys:', missingKeys.map(([key]) => key));
  console.error('Make sure your .env file contains all NEXT_PUBLIC_FIREBASE_* variables');
}

// Initialize Firebase app
let app;
try {
  app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
  console.log('Firebase app initialized successfully');
} catch (error) {
  console.error('Firebase initialization error:', error);
  // This allows the app to run without firebase, e.g. in a storybook
  app = null;
}

// Initialize Firestore
let db: Firestore | null = null;
try {
  if (app) {
    db = getFirestore(app);
    console.log('Firestore initialized successfully');
  } else {
    console.warn('Firestore not initialized - Firebase app failed to initialize');
    db = null;
  }
} catch (error) {
  console.error('Firestore initialization error:', error);
  db = null;
}

console.log('=== END CLIENT FIREBASE DEBUG ===');

export { app, db };
