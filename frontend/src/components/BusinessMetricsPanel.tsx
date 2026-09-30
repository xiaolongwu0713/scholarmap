"use client";

import { useEffect, useState } from "react";
import { getBusinessMetrics, type BusinessMetrics } from "@/lib/api";

const pct = (r: number | null) => (r === null ? "–" : `${Math.round(r * 100)}%`);

/** Admin-only revenue funnel: signups → activation → paywall → paid. */
export default function BusinessMetricsPanel() {
  const [days, setDays] = useState(7);
  const [m, setM] = useState<BusinessMetrics | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setError(null);
    getBusinessMetrics(days).then(setM).catch((e) => setError(String(e)));
  }, [days]);

  const rows: Array<[string, string | number]> = m
    ? [
        ["MRR", `$${m.mrr_usd.toFixed(2)}`],
        ["Active Pro", `${m.pro_active} (${m.pro_monthly} monthly · ${m.pro_quarterly} quarterly · ${m.pro_pass ?? 0} pass · ${m.pro_canceling} canceling · ${m.pro_comp ?? 0} comp)`],
        ["3-month passes sold (our earnings)", `${m.pass_sales ?? 0} ($${(m.pass_earnings_usd ?? 0).toFixed(2)})`],
        ["Pass refunds awaiting Paddle", `${m.pass_refunds_pending ?? 0}${m.pass_refunds_pending_over_24h ? ` (${m.pass_refunds_pending_over_24h} over 24 h)` : ""}`],
        ["Signups", m.signups],
        ["Activated signups (got a map)", `${m.activated_signups} (${pct(m.activation_rate)})`],
        ["Searches / searchers", `${m.searches} / ${m.searchers}`],
        ["Searches completed / failed", `${m.runs_completed} / ${m.runs_failed} (${pct(m.run_completion_rate)} done)`],
        ["Free users at their limit now", m.free_users_at_limit],
        ["Churned (canceled)", m.churned],
        ["AI cost per completed search", m.ai_cost_per_completed_search_usd === null ? "–" : `$${m.ai_cost_per_completed_search_usd.toFixed(3)}`],
        ["AI cost: customer searches / other", `$${m.ai_cost_searches_usd.toFixed(2)} / $${m.ai_cost_other_usd.toFixed(2)}`],
        ["Users total", m.users_total],
      ]
    : [];

  return (
    <div className="card stack" style={{ border: "2px solid #2563eb" }}>
      <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
        <h2 style={{ margin: 0 }}>Business Metrics</h2>
        <select value={days} onChange={(e) => setDays(Number(e.target.value))} style={{ width: "auto" }}>
          <option value={7}>Last 7 days</option>
          <option value={30}>Last 30 days</option>
          <option value={90}>Last 90 days</option>
        </select>
      </div>
      {error && <div style={{ color: "var(--error)" }}>Error: {error}</div>}
      {!m && !error && <div className="muted">Loading...</div>}
      {m && (
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.95rem" }}>
          <tbody>
            {rows.map(([label, value]) => (
              <tr key={label} style={{ borderTop: "1px solid var(--border)" }}>
                <td style={{ padding: "6px 0", color: "var(--muted)" }}>{label}</td>
                <td style={{ padding: "6px 0", textAlign: "right", fontWeight: 600 }}>{value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <div className="muted" style={{ fontSize: "0.8rem" }}>
        Excludes the admin account. MRR counts 3-month plans as a third of their price per month. AI cost is
        tracked from 2026-09-29; "other" covers SEO field builds and admin use.
      </div>
    </div>
  );
}
