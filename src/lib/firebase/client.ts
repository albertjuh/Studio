// Import the functions you need from the SDKs you need
import { initializeApp, getApp, getApps, type FirebaseApp } from "firebase/app";

// Your web app's Firebase configuration.
// This configuration must match the settings in your Firebase project.
const firebaseConfig = {
  apiKey: "AIzaSyCV_24nJ15923bS3udr4N9j5bC-1d011oA",
  authDomain: "coastal-insights-d8a41.firebaseapp.com",
  projectId: "coastal-insights-d8a41",
  storageBucket: "coastal-insights-d8a41.appspot.com",
  messagingSenderId: "1072978392138",
  appId: "1:1072978392138:web:7710c661d3bf1b71696089"
};


// Initialize Firebase
const app: FirebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);

// Analytics is temporarily removed to isolate the API key issue.
// import { getAnalytics, isSupported } from "firebase/analytics";
// const analytics = isSupported().then(yes => (yes && app.options?.apiKey) ? getAnalytics(app) : null);

export { app };
