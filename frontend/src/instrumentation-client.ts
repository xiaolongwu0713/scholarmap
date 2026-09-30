import * as Sentry from '@sentry/nextjs';

// Errors only: no tracing or session replay, to stay within the free quota.
// Without NEXT_PUBLIC_SENTRY_DSN this is a no-op (local dev).
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NEXT_PUBLIC_VERCEL_ENV,
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
