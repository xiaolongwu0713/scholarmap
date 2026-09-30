/**
 * Paddle.js (Billing v2) loader and checkout helper.
 * All values here are public by design (client-side token, price IDs).
 */

type PaddleEnvironment = 'sandbox' | 'production';

interface PaddleJs {
  Environment: { set(env: PaddleEnvironment): void };
  Initialize(options: { token: string }): void;
  Checkout: {
    open(options: {
      items: { priceId: string; quantity: number }[];
      customer?: { email: string };
      customData?: Record<string, string>;
      settings?: { successUrl?: string; displayMode?: 'overlay' };
    }): void;
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

function loadPaddle(): Promise<PaddleJs> {
  if (loading) return loading;
  loading = new Promise((resolve, reject) => {
    const init = () => {
      const paddle = window.Paddle!;
      if (PADDLE_CONFIG.environment === 'sandbox') paddle.Environment.set('sandbox');
      paddle.Initialize({ token: PADDLE_CONFIG.clientToken });
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
  paddle.Checkout.open({
    items: [{ priceId: PADDLE_CONFIG.priceIds[period], quantity: 1 }],
    customer: { email: user.email },
    customData: { user_id: user.user_id }, // the webhook uses this to find the account
    settings: { displayMode: 'overlay', successUrl: `${window.location.origin}/projects?upgraded=1` },
  });
}
