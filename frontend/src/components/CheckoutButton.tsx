"use client";

import { useState } from "react";
import Link from "next/link";
import { getUser } from "@/lib/auth";
import { checkoutEnabled, openCheckout, type BillingPeriod } from "@/lib/paddle";

interface CheckoutButtonProps {
  period: BillingPeriod;
  className: string;
  children: React.ReactNode;
}

/**
 * Pro purchase button. Signed-out visitors are sent to register and returned to /pricing.
 * Until Paddle is configured it just links to registration.
 */
export function CheckoutButton({ period, className, children }: CheckoutButtonProps) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!checkoutEnabled) {
    return (
      <Link href="/auth/register" className={className}>
        {children}
      </Link>
    );
  }

  async function handleClick() {
    const user = getUser();
    if (!user) {
      window.location.href = "/auth/register?next=/pricing";
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await openCheckout(period, user);
    } catch {
      setError("Checkout could not be opened. Please disable ad blockers for this site and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button type="button" onClick={handleClick} disabled={busy} className={className}>
        {busy ? "Opening checkout..." : children}
      </button>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </>
  );
}
