import * as Sentry from '@sentry/nextjs';

// Errors plus sampled performance tracing (page loads, navigations and their API calls);
// no session replay. The sample rate keeps this well inside the free quota.
// Without NEXT_PUBLIC_SENTRY_DSN this is a no-op (local dev).
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NEXT_PUBLIC_VERCEL_ENV,
  tracesSampleRate: 0.2,
  // Link browser traces to backend traces (the backend allows these headers via CORS)
  tracePropagationTargets: process.env.NEXT_PUBLIC_API_URL ? [process.env.NEXT_PUBLIC_API_URL] : [],
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
