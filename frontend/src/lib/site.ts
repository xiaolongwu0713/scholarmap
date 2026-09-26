/**
 * Site-wide configuration. Change the deployment domain via env vars,
 * not by editing URLs in individual pages.
 */

export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || 'https://labscout.io'
).replace(/\/$/, '');

export const API_URL = (
  process.env.NEXT_PUBLIC_API_URL || 'https://api.labscout.io'
).replace(/\/$/, '');

/** Public demo run (readable without login). Must match backend DEMO_PROJECT_ID / DEMO_RUN_ID. */
export const DEMO_PROJECT_ID = process.env.NEXT_PUBLIC_DEMO_PROJECT_ID || '6af7ac1b6254';
export const DEMO_RUN_ID = process.env.NEXT_PUBLIC_DEMO_RUN_ID || '53e099cdb74e';
export const DEMO_RUN_PATH = `/projects/${DEMO_PROJECT_ID}/runs/${DEMO_RUN_ID}`;
