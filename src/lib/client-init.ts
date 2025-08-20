/**
 * @file This script runs on the client-side before the main application to
 * handle potential conflicts with browser extensions, particularly crypto wallets
 * like Binance Wallet, which can inject conflicting scripts.
 */

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

  // Similarly, some extensions inject an `ethereum` object. If this application
  // does not use it, we can nullify it to prevent potential conflicts.
  if ('ethereum' in window) {
     // @ts-ignore
    // window.ethereum = null; // This line is commented out as it can be too aggressive
    // but is kept here as a reference if other wallet conflicts arise.
  }
}
