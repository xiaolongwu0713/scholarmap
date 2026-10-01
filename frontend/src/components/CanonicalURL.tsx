"use client";

import { SITE_URL } from '@/lib/site';
import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

// Fallback canonical for pages whose metadata doesn't set one.
// Never touch a canonical rendered by Next metadata: React owns that node, and
// removing it makes React crash (removeChild on null) on the next navigation.
export function CanonicalURL() {
  const pathname = usePathname();

  useEffect(() => {
    if (document.querySelector('link[rel="canonical"]')) return;

    const link = document.createElement('link');
    link.rel = 'canonical';
    link.href = `${SITE_URL}${pathname}`;
    document.head.appendChild(link);

    return () => link.remove();
  }, [pathname]);

  return null;
}
