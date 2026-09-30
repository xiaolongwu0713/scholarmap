/**
 * Paddle.js (Billing v2) loader and checkout helper.
 * All values here are public by design (client-side token, price IDs).
 */

import { getUserQuota } from '@/lib/api';

type PaddleEnvironment = 'sandbox' | 'production';

interface PaddleJs {
  Environment: { set(env: PaddleEnvironment): void };
  Initialize(options: { token: string; eventCallback?: (event: { name?: string }) => void }): void;
  Checkout: {
    open(options: {
      items: { priceId: string; quantity: number }[];
      customer?: { email: string };
      customData?: Record<string, string>;
      settings?: { successUrl?: string; displayMode?: 'overlay' };
    }): void;
    close(): void;
  };
}

declare global {
  interface Window {
    Paddle?: PaddleJs;
  }
}

/** monthly = $20 subscription; pass = one-time 3-month pass (no auto-renew). */
export type BillingPeriod = 'monthly' | 'pass';

export const PADDLE_CONFIG = {
  environment: (process.env.NEXT_PUBLIC_PADDLE_ENV || 'sandbox') as PaddleEnvironment,
  clientToken: process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN || '',
  priceIds: {
    monthly: process.env.NEXT_PUBLIC_PADDLE_PRICE_MONTHLY || '',
    pass: process.env.NEXT_PUBLIC_PADDLE_PRICE_PASS || '',
  } as Record<BillingPeriod, string>,
};

/** True once the Paddle env vars are set; until then the pricing page shows "launching soon". */
export const checkoutEnabled = Boolean(
  PADDLE_CONFIG.clientToken && PADDLE_CONFIG.priceIds.monthly && PADDLE_CONFIG.priceIds.pass
);

let loading: Promise<PaddleJs> | null = null;

/**
 * What the buyer sees after paying, like a WeChat Pay merchant page: while the Paddle overlay
 * is open we poll the account; once the webhook has made it Pro we close the overlay and show
 * our own success screen. QR payments confirm after the scan, so the overlay itself may never
 * change on its own.
 */
export type CheckoutPhase = 'idle' | 'open' | 'confirming' | 'success' | 'slow';
export interface CheckoutStatus {
  phase: CheckoutPhase;
  proUntil: string | null;
}

let status: CheckoutStatus = { phase: 'idle', proUntil: null };
const listeners = new Set<(s: CheckoutStatus) => void>();

function setStatus(next: CheckoutStatus) {
  status = next;
  listeners.forEach((l) => l(status));
}

export function subscribeCheckoutStatus(listener: (s: CheckoutStatus) => void): () => void {
  listeners.add(listener);
  listener(status);
  return () => listeners.delete(listener);
}

export function dismissCheckoutStatus() {
  stopPolling();
  setStatus({ phase: 'idle', proUntil: null });
}

const POLL_MS = 3000;
const GIVE_UP_MS = 15 * 60 * 1000; // after this, tell the buyer to email us (payment is safe either way)

let paymentStarted = false;
let baselineProUntil: string | null = null;
let pollTimer: ReturnType<typeof setTimeout> | null = null;
let pollStarted = 0;

function stopPolling() {
  if (pollTimer) clearTimeout(pollTimer);
  pollTimer = null;
}

async function poll() {
  pollTimer = null;
  try {
    const q = await getUserQuota();
    const extended = !baselineProUntil || (q.pro_until !== null && q.pro_until > baselineProUntil);
    if (q.tier !== 'free_user' && extended) {
      window.Paddle?.Checkout.close();
      paymentStarted = false;
      setStatus({ phase: 'success', proUntil: q.pro_until });
      return;
    }
  } catch {
    // network blip: try again on the next tick
  }
  if (status.phase === 'confirming' && Date.now() - pollStarted > GIVE_UP_MS) {
    setStatus({ ...status, phase: 'slow' });
    return;
  }
  if (status.phase === 'open' || status.phase === 'confirming') pollTimer = setTimeout(poll, POLL_MS);
}

function startPolling() {
  stopPolling();
  pollStarted = Date.now();
  pollTimer = setTimeout(poll, POLL_MS);
}

function onCheckoutEvent(event: { name?: string }) {
  if (status.phase === 'success') return;
  if (event.name === 'checkout.payment.initiated') paymentStarted = true;
  if (event.name === 'checkout.completed') {
    // Paid (cards: instantly). Swap Paddle's screen for ours and wait for the webhook.
    window.Paddle?.Checkout.close();
    setStatus({ phase: 'confirming', proUntil: null });
    startPolling();
  } else if (event.name === 'checkout.closed' && status.phase === 'open') {
    if (paymentStarted) {
      // Closed after paying but before confirmation: keep checking and say so
      setStatus({ phase: 'confirming', proUntil: null });
    } else {
      stopPolling();
      setStatus({ phase: 'idle', proUntil: null });
    }
  }
}

function loadPaddle(): Promise<PaddleJs> {
  if (loading) return loading;
  loading = new Promise((resolve, reject) => {
    const init = () => {
      const paddle = window.Paddle!;
      if (PADDLE_CONFIG.environment === 'sandbox') paddle.Environment.set('sandbox');
      paddle.Initialize({ token: PADDLE_CONFIG.clientToken, eventCallback: onCheckoutEvent });
      resolve(paddle);
    };
    if (window.Paddle) return init();
    const script = document.createElement('script');
    script.src = 'https://cdn.paddle.com/paddle/v2/paddle.js';
    script.async = true;
    script.onload = init;
    script.onerror = () => {
      loading = null;
      reject(new Error('Failed to load Paddle checkout'));
    };
    document.head.appendChild(script);
  });
  return loading;
}

/**
 * Paddle payment links (e.g. "update your payment method" emails) point at our default
 * payment link page with ?_ptxn=<transaction>; Paddle.js opens that checkout on init.
 */
export function openPaymentLinkFromUrl(): void {
  if (!checkoutEnabled || !new URLSearchParams(window.location.search).has('_ptxn')) return;
  loadPaddle().catch(() => {
    // Paddle.js failed to load; the page still works, the customer can retry the link
  });
}

export async function openCheckout(period: BillingPeriod, user: { user_id: string; email: string }): Promise<void> {
  const paddle = await loadPaddle();
  paymentStarted = false;
  try {
    baselineProUntil = (await getUserQuota()).pro_until;
  } catch {
    baselineProUntil = null;
  }
  setStatus({ phase: 'open', proUntil: null });
  startPolling();
  paddle.Checkout.open({
    items: [{ priceId: PADDLE_CONFIG.priceIds[period], quantity: 1 }],
    customer: { email: user.email },
    customData: { user_id: user.user_id }, // the webhook uses this to find the account
    settings: { displayMode: 'overlay' },
  });
}
