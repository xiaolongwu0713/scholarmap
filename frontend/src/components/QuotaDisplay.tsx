"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getBillingPortalUrl, getUserQuota, type UserQuotaInfo } from "@/lib/api";

const PLAN_BADGE: Record<UserQuotaInfo["tier"], { label: string; color: string }> = {
  super_user: { label: "Admin", color: "#4CAF50" },
  pro_user: { label: "Pro", color: "#2563eb" },
  free_user: { label: "Free", color: "#6b7280" },
};

function usageColor(used: number, limit: number): string {
  const pct = (used / limit) * 100;
  if (pct >= 100) return "#f44336";
  if (pct >= 70) return "#FF9800";
  return "#4CAF50";
}

export default function QuotaDisplay() {
  const [quota, setQuota] = useState<UserQuotaInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [portalBusy, setPortalBusy] = useState(false);
  const [activating, setActivating] = useState(false);

  useEffect(() => {
    let cancelled = false;
    // Returning from Paddle checkout: the webhook may land a few seconds after the redirect.
    const justPaid = new URLSearchParams(window.location.search).get("upgraded") === "1";

    async function load(attempt = 0) {
      try {
        const data = await getUserQuota();
        if (cancelled) return;
        setQuota(data);
        const waiting = justPaid && data.tier === "free_user" && attempt < 20;
        setActivating(waiting);
        if (waiting) setTimeout(() => load(attempt + 1), 3000);
      } catch (e) {
        if (!cancelled) setError(String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  async function openPortal() {
    setPortalBusy(true);
    try {
      window.location.href = await getBillingPortalUrl();
    } catch {
      setError("Could not open the billing portal. Please try again or email contact@labscout.io.");
      setPortalBusy(false);
    }
  }

  if (loading) return <div className="muted">Loading plan...</div>;
  if (error && !quota) return <div className="muted">Failed to load plan</div>;
  if (!quota) return null;

  const badge = PLAN_BADGE[quota.tier];
  const { searches } = quota;

  return (
    <div className="card stack" style={{ padding: "1rem" }}>
      <div className="row" style={{ justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
        <h3 style={{ margin: 0, fontSize: "1.1rem" }}>Your Plan</h3>
        <div
          style={{
            fontSize: "0.85rem",
            fontWeight: "bold",
            color: badge.color,
            padding: "0.25rem 0.75rem",
            borderRadius: "12px",
            background: `${badge.color}15`,
          }}
        >
          {badge.label}
        </div>
      </div>

      <div className="stack" style={{ gap: "0.25rem" }}>
        <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: "0.9rem", fontWeight: 500 }}>
            Searches (last {searches.window_days} days)
          </span>
          <span
            style={{
              fontSize: "0.9rem",
              fontWeight: "bold",
              color: searches.unlimited ? "#4CAF50" : usageColor(searches.used, searches.limit),
            }}
          >
            {searches.used} / {searches.unlimited ? "Unlimited" : searches.limit}
          </span>
        </div>
        {!searches.unlimited && (
          <div style={{ width: "100%", height: "4px", background: "#e0e0e0", borderRadius: "2px", overflow: "hidden" }}>
            <div
              style={{
                width: `${Math.min(100, (searches.used / searches.limit) * 100)}%`,
                height: "100%",
                background: usageColor(searches.used, searches.limit),
                transition: "width 0.3s ease",
              }}
            />
          </div>
        )}
        {searches.next_slot_at && (
          <div className="muted" style={{ fontSize: "0.8rem" }}>
            Next search available {new Date(searches.next_slot_at).toLocaleString()}
          </div>
        )}
      </div>

      {quota.tier === "pro_user" && quota.pro_until && (
        <div className="muted" style={{ fontSize: "0.8rem" }}>
          {quota.subscription_status === "canceled" ? "Pro access ends" : "Renews"}{" "}
          {new Date(quota.pro_until).toLocaleDateString()}
        </div>
      )}

      {activating && (
        <div style={{ color: "#2563eb", fontSize: "0.85rem" }}>
          Payment received — activating Pro, this usually takes a few seconds...
        </div>
      )}
      {error && <div style={{ color: "#dc2626", fontSize: "0.8rem" }}>{error}</div>}

      {quota.tier === "free_user" && !activating && (
        <>
          <Link href="/pricing">
            <button className="primary" style={{ width: "100%", marginTop: "0.5rem" }}>
              Upgrade to Pro
            </button>
          </Link>
          {/* Benefits only in the desktop sidebar; on phones the card stays compact */}
          <ul className="hidden lg:block muted" style={{ margin: 0, paddingLeft: "1.2rem", fontSize: "0.85rem", lineHeight: 1.7 }}>
            <li>30 searches per week</li>
            <li>Full researcher and institution lists</li>
            <li>CSV export</li>
          </ul>
        </>
      )}
      {quota.tier === "pro_user" && (
        <button className="secondary" onClick={openPortal} disabled={portalBusy} style={{ width: "100%", marginTop: "0.5rem" }}>
          {portalBusy ? "Opening..." : "Manage subscription"}
        </button>
      )}
    </div>
  );
}
