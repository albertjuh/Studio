
// Import the functions you need from the SDKs you need
import { initializeApp, getApp, getApps, type FirebaseApp } from "firebase/app";
import { getAnalytics, isSupported } from "firebase/analytics";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCV_24nJ15923bS3udr4N9j5bC-1d011oA",
  authDomain: "b-m-p-us-prod-11.firebaseapp.com",
  projectId: "b-m-p-us-prod-11",
  storageBucket: "b-m-p-us-prod-11.appspot.com",
  messagingSenderId: "534952431181",
  appId: "1:534952431181:web:b1d940170a410c31a72f07",
  measurementId: "G-J6CM1R453X"
};

// Initialize Firebase
// This will throw a clear error during initialization if the configuration is missing,
// which is the correct behavior.
const app: FirebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);


// Initialize Analytics if supported
const analytics = isSupported().then(yes => (yes && app.options?.apiKey) ? getAnalytics(app) : null);

export { app, analytics };

