'use client';

import { useEffect } from 'react';
import { openPaymentLinkFromUrl } from '@/lib/paddle';

/** Opens the Paddle checkout when the pricing page is reached through a Paddle payment link. */
export function PaymentLinkHandler() {
  useEffect(() => {
    openPaymentLinkFromUrl();
  }, []);
  return null;
}
