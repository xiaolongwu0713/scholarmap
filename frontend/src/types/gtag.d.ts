/**
 * Global type declarations for Google Analytics (gtag.js)
 */

declare global {
  interface Window {
    gtag?: (command: string, ...args: any[]) => void;
    dataLayer?: any[];
  }
}

export {};
