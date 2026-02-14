'use client';

import React, { useState, useEffect, type ReactNode } from 'react';
import { FirebaseProvider } from '@/firebase/provider';
import { initializeFirebase, type getSdks } from '@/firebase';

interface FirebaseClientProviderProps {
  children: ReactNode;
}

export function FirebaseClientProvider({ children }: FirebaseClientProviderProps) {
  const [firebaseServices, setFirebaseServices] = useState<ReturnType<typeof getSdks> | null>(null);

  useEffect(() => {
    // Initialize Firebase only on the client side, after the component has mounted.
    setFirebaseServices(initializeFirebase());

    // --- Start of logic moved from client-init.ts ---
    // The Binance Wallet extension injects a `BinanceChain` object into the window.
    if ('BinanceChain' in window) {
      // @ts-ignore
      window.BinanceChain = null;
    }

    // Similarly, extensions like MetaMask inject an `ethereum` object.
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
    // --- End of logic moved from client-init.ts ---

  }, []); // Empty dependency array ensures this runs only once on mount

  return (
    <FirebaseProvider
      firebaseApp={firebaseServices?.firebaseApp ?? null}
      auth={firebaseServices?.auth ?? null}
      firestore={firebaseServices?.firestore ?? null}
    >
      {children}
    </FirebaseProvider>
  );
}
