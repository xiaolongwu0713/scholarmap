'use client';

import { useEffect } from 'react';
import { recordFirstTouch } from '@/lib/attribution';

/** Remembers where this visitor first came from; see lib/attribution. */
export function FirstTouchTracker() {
  useEffect(() => {
    recordFirstTouch();
  }, []);
  return null;
}
