
'use client';

import { useEffect } from 'react';

/**
 * This component handles the registration of the service worker,
 * which is a requirement for making the application installable as a PWA.
 * It currently does not show a custom install prompt, but allows the browser's
 * default installation UI to appear.
 */
export function PwaInstallPrompt() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker
          .register('/sw.js')
          .then((registration) => {
            console.log('Service Worker registered successfully:', registration);
          })
          .catch((error) => {
            console.error('Service Worker registration failed:', error);
          });
      });
    }
  }, []);

  return null; // This component does not render anything to the UI.
}
