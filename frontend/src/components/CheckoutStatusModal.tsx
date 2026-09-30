'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CONTACT_EMAIL } from '@/lib/site';
import { dismissCheckoutStatus, subscribeCheckoutStatus, type CheckoutStatus } from '@/lib/paddle';

/** Our own screen after paying: "confirming…", then "Pro is active", like a merchant page after WeChat Pay. */
export function CheckoutStatusModal() {
  const [status, setStatus] = useState<CheckoutStatus>({ phase: 'idle', proUntil: null });

  useEffect(() => subscribeCheckoutStatus(setStatus), []);

  if (status.phase === 'idle' || status.phase === 'open') return null;

  const until = status.proUntil ? new Date(status.proUntil).toLocaleDateString() : null;

  return (
    <div className="fixed inset-0 z-[1100] flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-xl">
        {status.phase === 'confirming' && (
          <>
            <div className="mx-auto mb-5 h-12 w-12 animate-spin rounded-full border-4 border-blue-100 border-t-blue-600" aria-hidden />
            <h2 className="text-xl font-bold text-gray-900">Confirming your payment…</h2>
            <p className="mt-3 text-sm text-gray-600">
              Card payments take a few seconds; WeChat Pay can take a minute or two. Please keep this page open — it
              updates by itself as soon as Pro is active.
            </p>
          </>
        )}

        {status.phase === 'success' && (
          <>
            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-green-100 text-3xl text-green-600" aria-hidden>
              ✓
            </div>
            <h2 className="text-xl font-bold text-gray-900">Payment successful</h2>
            <p className="mt-3 text-sm text-gray-600">
              LabScout Pro is active{until ? ` until ${until}` : ''}. Your receipt has been emailed to you.
            </p>
            <Link
              href="/projects"
              onClick={dismissCheckoutStatus}
              className="mt-6 block rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white hover:bg-blue-700"
            >
              Start searching
            </Link>
          </>
        )}

        {status.phase === 'slow' && (
          <>
            <h2 className="text-xl font-bold text-gray-900">Your payment is being processed</h2>
            <p className="mt-3 text-sm text-gray-600">
              This is taking longer than usual, but your payment is safe and Pro will switch on automatically once it
              is confirmed. If your account is still Free in an hour, email{' '}
              <a href={`mailto:${CONTACT_EMAIL}`} className="text-blue-600 hover:underline">{CONTACT_EMAIL}</a> and we
              will sort it out right away.
            </p>
            <Link
              href="/projects"
              onClick={dismissCheckoutStatus}
              className="mt-6 block rounded-lg border border-gray-300 px-4 py-3 font-semibold text-gray-900 hover:bg-gray-50"
            >
              Go to my projects
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
