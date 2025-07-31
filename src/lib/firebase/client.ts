// lib/firebase.ts
import { initializeApp, getApps, FirebaseApp } from "firebase/app";
import { getAnalytics, isSupported, Analytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
};

let app: FirebaseApp | undefined;
let analytics: Analytics | undefined;

// Initialize Firebase only once on the client side
if (typeof window !== 'undefined' && !getApps().length) {
  app = initializeApp(firebaseConfig);
  
  // Initialize Analytics only if supported and in client side
  isSupported().then((supported) => {
    if (supported) {
      analytics = getAnalytics(app);
    } else {
      analytics = undefined;
    }
  });
} else {
  // If window is not defined or app is already initialized, set app to undefined
  app = undefined;
  analytics = undefined;
}

// Export initialized services, checking if app is defined
const auth = app ? getAuth(app) : undefined;
const db = app ? getFirestore(app) : undefined;
const storage = app ? getStorage(app) : undefined;

export { app, auth, db, storage, analytics };