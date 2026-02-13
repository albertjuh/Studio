// Import the functions you need from the SDKs you need
import { initializeApp, getApp, getApps, type FirebaseApp } from "firebase/app";
import { getAuth } from 'firebase/auth';

// =================================================================
// Firebase Configuration
// =================================================================
// This is the authoritative configuration for your project.
const firebaseConfig = {
  "projectId": "nutshell-insights",
  "appId": "1:1003963455184:web:58e18dd6f39bb7192af0d5",
  "apiKey": "AIzaSyBvBrjkiuTawCgfw9qLtILZAYPNOTV-VY8",
  "authDomain": "nutshell-insights.firebaseapp.com",
  "messagingSenderId": "1003963455184"
};
//
// =================================================================


// Initialize Firebase
const app: FirebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);

const auth = getAuth(app);

export { app, auth };
