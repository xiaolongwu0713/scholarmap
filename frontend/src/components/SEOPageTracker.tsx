'use client';

import { useEffect } from 'react';
import { trackSEOPageView } from '@/lib/analytics';

interface SEOPageTrackerProps {
  pageName: string;
  location: string;
}

/**
 * Client component to track SEO page views
 * Must be used within a server component
 */
export function SEOPageTracker({ pageName, location }: SEOPageTrackerProps) {
  useEffect(() => {
    trackSEOPageView(pageName, location);
  }, [pageName, location]);

  return null;
}
