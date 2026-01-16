"use client";

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

export function CanonicalURL() {
  const pathname = usePathname();
  
  useEffect(() => {
    const baseUrl = 'https://scholarmap-frontend.onrender.com';
    const canonicalUrl = `${baseUrl}${pathname}`;
    
    // Remove existing canonical link if any
    const existingLink = document.querySelector('link[rel="canonical"]');
    if (existingLink) {
      existingLink.remove();
    }
    
    // Add new canonical link
    const link = document.createElement('link');
    link.rel = 'canonical';
    link.href = canonicalUrl;
    document.head.appendChild(link);
    
    return () => {
      const linkToRemove = document.querySelector('link[rel="canonical"]');
      if (linkToRemove) {
        linkToRemove.remove();
      }
    };
  }, [pathname]);
  
  return null;
}

