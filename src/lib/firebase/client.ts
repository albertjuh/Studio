// Import the functions you need from the SDKs you need
import { initializeApp, getApp, getApps, type FirebaseApp } from "firebase/app";
import { getAuth } from 'firebase/auth';

// =================================================================
// Firebase Configuration
// =================================================================
const firebaseConfig = {
  apiKey: "AIzaSyDFgRU_eAGPt2ckpLviSpphcAvWgodBqa0",
  authDomain: "nutshell-insights.firebaseapp.com",
  projectId: "nutshell-insights",
  storageBucket: "nutshell-insights.firebasestorage.app",
  messagingSenderId: "1003963455184",
  appId: "1:1003963455184:web:0ca1871fde78e3042af0d5"
};
//
// =================================================================


// Initialize Firebase
const app: FirebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);

const auth = getAuth(app);

export { app, auth };
