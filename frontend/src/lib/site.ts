/**
 * Site-wide configuration. Change the deployment domain via env vars,
 * not by editing URLs in individual pages.
 */

export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || 'https://labscout.io'
).replace(/\/$/, '');

export const API_URL = (
  process.env.NEXT_PUBLIC_API_URL || 'https://scholarmap-q1k1.onrender.com'
).replace(/\/$/, '');

/** Legal operator of the service (an individual). Shown in Terms, Privacy and Refund pages. */
export const OPERATOR_NAME = 'Xiaolong Wu';
export const CONTACT_EMAIL = 'contact@labscout.io';
export const LEGAL_EFFECTIVE_DATE = 'September 27, 2026';
/** Money-back window for new subscriptions and renewals. */
export const REFUND_DAYS = 7;

/** Plans — keep in sync with backend USER_QUOTAS. */
export const PLANS = {
  free: { name: 'Free', searchesPerWeek: 2 },
  pro: { name: 'Pro', searchesPerWeek: 30, monthlyPrice: 20, quarterlyPrice: 50 },
} as const;

/** Done-for-you field report for companies (sold by email, delivered manually). */
export const CUSTOM_REPORT = { priceFrom: 299, deliveryBusinessDays: 5 } as const;

/** Public demo run (readable without login). Must match backend DEMO_PROJECT_ID / DEMO_RUN_ID. */
export const DEMO_PROJECT_ID = process.env.NEXT_PUBLIC_DEMO_PROJECT_ID || '6af7ac1b6254';
export const DEMO_RUN_ID = process.env.NEXT_PUBLIC_DEMO_RUN_ID || '53e099cdb74e';
export const DEMO_RUN_PATH = `/projects/${DEMO_PROJECT_ID}/runs/${DEMO_RUN_ID}`;
