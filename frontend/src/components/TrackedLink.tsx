'use client';

import Link from 'next/link';
import { ReactNode } from 'react';
import { trackDemoMapClick, trackSignupStart } from '@/lib/analytics';

interface TrackedLinkProps {
  href: string;
  children: ReactNode;
  className?: string;
  trackingType?: 'demo' | 'signup' | 'none';
  trackingSource?: string;
  country?: string;
  city?: string;
}

/**
 * Link component with built-in analytics tracking
 * Automatically tracks clicks based on trackingType
 */
export function TrackedLink({
  href,
  children,
  className = '',
  trackingType = 'none',
  trackingSource = '',
  country,
  city,
}: TrackedLinkProps) {
  const handleClick = () => {
    if (trackingType === 'demo') {
      trackDemoMapClick(trackingSource, country, city);
    } else if (trackingType === 'signup') {
      trackSignupStart(trackingSource, country);
    }
  };

  return (
    <Link href={href} className={className} onClick={handleClick}>
      {children}
    </Link>
  );
}
