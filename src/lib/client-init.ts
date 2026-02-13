/**
 * @file This script runs on the client-side before the main application to
 * handle potential conflicts with browser extensions and to initialize services.
 */

// Initialize Firebase on the client
import './firebase/client';


// Check if we are running in a browser environment
if (typeof window !== 'undefined') {
  // The Binance Wallet extension injects a `BinanceChain` object into the window.
  // This can interfere with the application's JavaScript environment.
  // By setting it to null, we prevent the extension's scripts from executing
  // in a way that conflicts with our application. This is a common workaround
  // for dApp/extension compatibility issues in web applications.
  if ('BinanceChain' in window) {
    // @ts-ignore
    window.BinanceChain = null;
  }

  // Similarly, extensions like MetaMask inject an `ethereum` object.
  // We nullify it to prevent potential connection errors and conflicts.
  if ('ethereum' in window) {
     // @ts-ignore
    window.ethereum = null;
  }

  // Register the service worker for Progressive Web App (PWA) offline capabilities.
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').then(registration => {
        console.log('Service Worker registered with scope:', registration.scope);
      }).catch(error => {
        console.error('Service Worker registration failed:', error);
      });
    });
  }
}
