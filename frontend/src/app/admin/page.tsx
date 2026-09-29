"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  adminAuditLog,
  adminGetUser,
  adminListUsers,
  adminRecentSearches,
  adminUserAction,
  getOnlineUsers,
  getResourceStats,
  takeResourceSnapshot,
  type AdminActionLog,
  type AdminRun,
  type AdminUser,
  type AdminUserAction,
  type AdminUserDetail,
  type OnlineUsersResponse,
  type ResourceSnapshot,
} from "@/lib/api";
import { isSuperUser } from "@/lib/auth";
import AuthGuard from "@/components/AuthGuard";
import BusinessMetricsPanel from "@/components/BusinessMetricsPanel";
import { UnifiedNavbar } from "@/components/UnifiedNavbar";

type Tab = "overview" | "users" | "searches" | "audit" | "system";
const TABS: Array<{ key: Tab; label: string }> = [
  { key: "overview", label: "Overview" },
  { key: "users", label: "Users" },
  { key: "searches", label: "Searches" },
  { key: "audit", label: "Audit log" },
  { key: "system", label: "System" },
];
const PAGE_SIZE = 50;

const ACTION_LABELS: Record<string, string> = {
  grant_pro: "Granted Pro",
  revoke_pro: "Revoked Pro",
  set_search_limit: "Set search limit",
  reset_quota: "Reset weekly quota",
  disable: "Disabled account",
  enable: "Enabled account",
  verify_email: "Verified email",
};

const date = (iso: string | null | undefined) => (iso ? new Date(iso).toLocaleDateString() : "–");
const dateTime = (iso: string | null | undefined) => (iso ? new Date(iso).toLocaleString() : "–");
const usd = (n: number | undefined) => (n === undefined ? "–" : n < 0.01 && n > 0 ? "<$0.01" : `$${n.toFixed(2)}`);
const limitText = (n: number) => (n === -1 ? "∞" : String(n));

function ago(iso: string | null | undefined): string {
  if (!iso) return "never";
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 60) return `${Math.max(mins, 0)} min ago`;
  if (mins < 60 * 48) return `${Math.round(mins / 60)} h ago`;
  return `${Math.round(mins / 1440)} days ago`;
}

function PlanBadge({ u }: { u: AdminUser }) {
  const [text, bg, fg] =
    u.tier === "super_user"
      ? ["Admin", "#dcfce7", "#15803d"]
      : u.plan === "pro"
        ? [u.has_subscription ? "Pro" : "Pro (comp)", "#ede9fe", "#6d28d9"]
        : ["Free", "#f3f4f6", "#4b5563"];
  return (
    <span style={{ display: "inline-flex", gap: 4 }}>
      <span style={{ fontSize: 12, fontWeight: 600, padding: "1px 8px", borderRadius: 999, background: bg, color: fg }}>{text}</span>
      {u.disabled && (
        <span style={{ fontSize: 12, fontWeight: 600, padding: "1px 8px", borderRadius: 999, background: "#fee2e2", color: "#b91c1c" }}>
          Disabled
        </span>
      )}
    </span>
  );
}

const th: React.CSSProperties = { textAlign: "left", padding: "8px 10px", fontSize: 13, color: "var(--muted)", fontWeight: 600, whiteSpace: "nowrap" };
const td: React.CSSProperties = { padding: "8px 10px", fontSize: 14, borderTop: "1px solid var(--border)", verticalAlign: "top" };

// ------------------------------------------------------------------ Users

/** `version` changes after an account edit, to reload the list without losing the filters. */
function UsersTab({ onOpen, version }: { onOpen: (userId: string) => void; version: number }) {
  const [q, setQ] = useState("");
  const [query, setQuery] = useState("");
  const [plan, setPlan] = useState<"all" | "pro" | "free" | "disabled">("all");
  const [offset, setOffset] = useState(0);
  const [data, setData] = useState<{ total: number; users: AdminUser[] } | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Search as you type, without a request per keystroke
  useEffect(() => {
    const t = setTimeout(() => {
      setQuery(q);
      setOffset(0);
    }, 300);
    return () => clearTimeout(t);
  }, [q]);

  const load = useCallback(() => {
    setError(null);
    adminListUsers({ q: query, plan, limit: PAGE_SIZE, offset }).then(setData).catch((e) => setError(String(e)));
  }, [query, plan, offset, version]);
  useEffect(load, [load]);

  return (
    <div className="card stack">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <input placeholder="Search by email…" value={q} onChange={(e) => setQ(e.target.value)} style={{ flex: 1 }} />
        <select
          value={plan}
          onChange={(e) => {
            setPlan(e.target.value as typeof plan);
            setOffset(0);
          }}
          style={{ width: "auto" }}
        >
          <option value="all">All users</option>
          <option value="pro">Pro</option>
          <option value="free">Free</option>
          <option value="disabled">Disabled</option>
        </select>
        <button className="secondary" onClick={load} style={{ whiteSpace: "nowrap" }}>
          Refresh
        </button>
      </div>
      {error && <div style={{ color: "var(--error)" }}>{error}</div>}
      {!data && !error && <div className="muted">Loading…</div>}
      {data && (
        <>
          <div className="muted" style={{ fontSize: 13 }}>
            {data.total} user{data.total === 1 ? "" : "s"} · click a row to manage
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 760 }}>
              <thead>
                <tr>
                  <th style={th}>Email</th>
                  <th style={th}>Plan</th>
                  <th style={th} title="Searches in the current 7-day window / limit">This week</th>
                  <th style={th}>All searches</th>
                  <th style={th} title="Searches that produced a map">Maps</th>
                  <th style={th}>AI cost</th>
                  <th style={th}>Signed up</th>
                  <th style={th}>Last active</th>
                </tr>
              </thead>
              <tbody>
                {data.users.map((u) => (
                  <tr key={u.user_id} onClick={() => onOpen(u.user_id)} style={{ cursor: "pointer" }} className="hover:bg-gray-50">
                    <td style={td}>
                      <div style={{ fontWeight: 500 }}>{u.email}</div>
                      {!u.email_verified && <div style={{ fontSize: 12, color: "#b45309" }}>email not verified</div>}
                    </td>
                    <td style={td}>
                      <PlanBadge u={u} />
                    </td>
                    <td style={{ ...td, whiteSpace: "nowrap" }}>
                      {u.searches_in_window} / {limitText(u.search_limit)}
                      {u.search_limit_override !== null && <span title="Custom limit set by admin"> ✎</span>}
                    </td>
                    <td style={td}>{u.searches_total}</td>
                    <td style={td}>
                      {u.runs_completed} / {u.runs_total}
                    </td>
                    <td style={td}>{usd(u.ai_cost_usd)}</td>
                    <td style={{ ...td, whiteSpace: "nowrap" }}>{date(u.created_at)}</td>
                    <td style={{ ...td, whiteSpace: "nowrap" }}>{ago(u.last_active_at)}</td>
                  </tr>
                ))}
                {data.users.length === 0 && (
                  <tr>
                    <td style={td} colSpan={8} className="muted">
                      No users match.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {data.total > PAGE_SIZE && (
            <div className="flex items-center justify-center gap-3">
              <button className="secondary" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}>
                ← Prev
              </button>
              <span className="muted" style={{ fontSize: 13 }}>
                {offset + 1}–{Math.min(offset + PAGE_SIZE, data.total)} of {data.total}
              </span>
              <button className="secondary" disabled={offset + PAGE_SIZE >= data.total} onClick={() => setOffset(offset + PAGE_SIZE)}>
                Next →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ------------------------------------------------------------------ One user

function UserPanel({ userId, onClose, onChanged }: { userId: string; onClose: () => void; onChanged: () => void }) {
  const [detail, setDetail] = useState<AdminUserDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [days, setDays] = useState(30);
  const [limit, setLimit] = useState("");
  const [note, setNote] = useState("");

  useEffect(() => {
    setDetail(null);
    adminGetUser(userId)
      .then((d) => {
        setDetail(d);
        setLimit(d.user.search_limit_override === null ? "" : String(d.user.search_limit_override));
      })
      .catch((e) => setError(String(e)));
  }, [userId]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function act(body: AdminUserAction, confirmText?: string) {
    if (confirmText && !window.confirm(confirmText)) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const d = await adminUserAction(userId, { ...body, note: note.trim() || undefined });
      setDetail(d);
      setNote("");
      setNotice(`${ACTION_LABELS[body.action] ?? body.action} ✓`);
      onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  const u = detail?.user;
  const liveSubscription = !!u && u.has_subscription && ["active", "trialing", "past_due"].includes(u.subscription_status ?? "");

  return (
    <div
      onClick={onClose}
      style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.45)", zIndex: 1000, display: "flex", justifyContent: "flex-end" }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="stack"
        style={{ background: "var(--panel, #fff)", width: "min(640px, 100%)", height: "100%", overflowY: "auto", padding: 20, gap: 16 }}
      >
        <div className="flex items-start justify-between gap-3">
          <div style={{ minWidth: 0 }}>
            <h2 style={{ margin: 0, fontSize: 20, wordBreak: "break-all" }}>{u?.email ?? "Loading…"}</h2>
            {u && (
              <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>
                {u.user_id}
              </div>
            )}
          </div>
          <button className="secondary" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        {error && <div style={{ padding: "8px 12px", background: "#fee2e2", color: "#b91c1c", borderRadius: 8 }}>{error}</div>}
        {notice && <div style={{ padding: "8px 12px", background: "#dcfce7", color: "#15803d", borderRadius: 8 }}>{notice}</div>}

        {u && detail && (
          <>
            <section className="card stack" style={{ gap: 6, fontSize: 14 }}>
              <div className="flex items-center gap-2">
                <PlanBadge u={u} />
                {u.email_verified ? <span className="muted">email verified</span> : <span style={{ color: "#b45309" }}>email not verified</span>}
              </div>
              <div>Signed up: {dateTime(u.created_at)}</div>
              <div>
                Pro until: {u.tier === "super_user" ? "always" : dateTime(u.pro_until)}
                {u.has_subscription && (
                  <span className="muted">
                    {" "}
                    · Paddle {u.subscription_status}
                    {u.subscription_amount_cents !== null &&
                      ` · $${(u.subscription_amount_cents / 100).toFixed(2)} / ${u.subscription_interval_months ?? 1} mo`}
                  </span>
                )}
              </div>
              <div>
                Searches this week: {u.searches_in_window} / {limitText(u.search_limit)}
                {u.search_limit_override !== null && <span className="muted"> (custom limit)</span>}
                {u.quota_reset_at && <span className="muted"> · quota reset {dateTime(u.quota_reset_at)}</span>}
              </div>
              {u.disabled && <div style={{ color: "#b91c1c" }}>Disabled since {dateTime(u.disabled_at)}</div>}
            </section>

            {u.tier !== "super_user" && (
              <section className="card stack" style={{ gap: 12 }}>
                <h3 style={{ margin: 0, fontSize: 16 }}>Manage</h3>

                <div className="stack" style={{ gap: 6 }}>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>Pro access</div>
                  <div className="flex flex-wrap items-center gap-2">
                    {[7, 30, 90, 365].map((d) => (
                      <button key={d} className="secondary" onClick={() => setDays(d)} style={{ padding: "4px 10px", fontWeight: days === d ? 700 : 400 }}>
                        {d}d
                      </button>
                    ))}
                    <input
                      type="number"
                      min={1}
                      max={3650}
                      value={days}
                      onChange={(e) => setDays(Number(e.target.value))}
                      style={{ width: 90 }}
                      aria-label="Days of Pro"
                    />
                    <button disabled={busy} onClick={() => act({ action: "grant_pro", days }, `Give ${u.email} ${days} days of Pro?`)}>
                      Grant Pro
                    </button>
                    {u.plan === "pro" && (
                      <button
                        className="secondary"
                        disabled={busy || liveSubscription}
                        title={liveSubscription ? "Has a live Paddle subscription: cancel it in Paddle instead" : undefined}
                        onClick={() => act({ action: "revoke_pro" }, `End Pro for ${u.email} now?`)}
                      >
                        Revoke Pro
                      </button>
                    )}
                  </div>
                  <div className="muted" style={{ fontSize: 12 }}>Adds days on top of any Pro time left. Paddle subscribers keep their own renewals.</div>
                </div>

                <div className="stack" style={{ gap: 6 }}>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>Search quota</div>
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      type="number"
                      min={-1}
                      placeholder="plan default"
                      value={limit}
                      onChange={(e) => setLimit(e.target.value)}
                      style={{ width: 130 }}
                      aria-label="Custom weekly search limit"
                    />
                    <button
                      className="secondary"
                      disabled={busy}
                      onClick={() => act({ action: "set_search_limit", limit: limit.trim() === "" ? null : Number(limit) })}
                    >
                      Set weekly limit
                    </button>
                    <button
                      className="secondary"
                      disabled={busy || u.searches_in_window === 0}
                      onClick={() => act({ action: "reset_quota" }, `Reset this week's searches for ${u.email}? They get their full allowance back now.`)}
                    >
                      Reset this week
                    </button>
                  </div>
                  <div className="muted" style={{ fontSize: 12 }}>Empty = the plan's limit, -1 = unlimited, 0 = no new searches.</div>
                </div>

                <div className="stack" style={{ gap: 6 }}>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>Account</div>
                  <div className="flex flex-wrap items-center gap-2">
                    {!u.email_verified && (
                      <button className="secondary" disabled={busy} onClick={() => act({ action: "verify_email" })}>
                        Mark email verified
                      </button>
                    )}
                    {u.disabled ? (
                      <button className="secondary" disabled={busy} onClick={() => act({ action: "enable" }, `Let ${u.email} sign in again?`)}>
                        Enable account
                      </button>
                    ) : (
                      <button
                        disabled={busy}
                        onClick={() => act({ action: "disable" }, `Disable ${u.email}? They are signed out and can't sign in until you enable the account.`)}
                        style={{ background: "#dc2626", borderColor: "#dc2626", color: "#fff" }}
                      >
                        Disable account
                      </button>
                    )}
                  </div>
                </div>

                <input placeholder="Note for the audit log (optional, e.g. why)" value={note} onChange={(e) => setNote(e.target.value)} />
              </section>
            )}

            <section className="stack" style={{ gap: 8 }}>
              <h3 style={{ margin: 0, fontSize: 16 }}>Searches ({detail.runs.length})</h3>
              {detail.runs.length === 0 && <div className="muted">No searches yet.</div>}
              {detail.runs.map((r) => (
                <RunCard key={r.run_id} r={r} />
              ))}
            </section>

            <section className="stack" style={{ gap: 8 }}>
              <h3 style={{ margin: 0, fontSize: 16 }}>Admin history</h3>
              {detail.actions.length === 0 ? <div className="muted">No admin changes.</div> : <ActionList actions={detail.actions} showTarget={false} />}
            </section>
          </>
        )}
      </div>
    </div>
  );
}

function RunCard({ r, showUser, onOpenUser }: { r: AdminRun; showUser?: boolean; onOpenUser?: (id: string) => void }) {
  const stale = !r.completed && r.created_at && Date.now() - new Date(r.created_at).getTime() > 3600_000;
  const [label, color] = r.completed ? [`${r.papers} papers mapped`, "#15803d"] : stale ? ["no map (failed or abandoned)", "#b91c1c"] : ["in progress", "#1d4ed8"];
  return (
    <div className="card" style={{ padding: "10px 12px", fontSize: 14 }}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="muted" style={{ fontSize: 12 }}>
          {dateTime(r.created_at)}
          {showUser && r.email && (
            <>
              {" · "}
              <button
                onClick={() => r.user_id && onOpenUser?.(r.user_id)}
                style={{ background: "none", border: "none", padding: 0, color: "#2563eb", cursor: "pointer", fontSize: 12 }}
              >
                {r.email}
              </button>
            </>
          )}
        </span>
        <span style={{ fontSize: 12, color, fontWeight: 600 }}>
          {label} · {usd(r.ai_cost_usd)}
        </span>
      </div>
      <div style={{ marginTop: 4, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>{r.description || <span className="muted">(no description)</span>}</div>
      <Link href={`/projects/${r.project_id}/runs/${r.run_id}`} target="_blank" style={{ fontSize: 12, color: "#2563eb" }}>
        Open search ↗
      </Link>
    </div>
  );
}

function ActionList({ actions, showTarget, onOpenUser }: { actions: AdminActionLog[]; showTarget: boolean; onOpenUser?: (id: string) => void }) {
  const describe = (a: AdminActionLog) => {
    const d = a.detail ?? {};
    if (a.action === "grant_pro") return `+${d.days} days (until ${date(d.after as string)})`;
    if (a.action === "set_search_limit") return `${d.before ?? "plan default"} → ${d.after ?? "plan default"}`;
    return "";
  };
  return (
    <div className="stack" style={{ gap: 6 }}>
      {actions.map((a) => (
        <div key={a.id} style={{ fontSize: 14, borderTop: "1px solid var(--border)", paddingTop: 6 }}>
          <span className="muted" style={{ fontSize: 12 }}>{dateTime(a.created_at)}</span>{" "}
          <strong>{ACTION_LABELS[a.action] ?? a.action}</strong> {describe(a)}
          {showTarget && a.target_user_id && (
            <>
              {" · "}
              <button
                onClick={() => onOpenUser?.(a.target_user_id as string)}
                style={{ background: "none", border: "none", padding: 0, color: "#2563eb", cursor: "pointer" }}
              >
                {a.target_email ?? a.target_user_id}
              </button>
            </>
          )}
          {typeof a.detail?.note === "string" && <div className="muted" style={{ fontSize: 13 }}>“{a.detail.note}”</div>}
        </div>
      ))}
    </div>
  );
}

// ------------------------------------------------------------------ Other tabs

function SearchesTab({ onOpenUser }: { onOpenUser: (id: string) => void }) {
  const [runs, setRuns] = useState<AdminRun[] | null>(null);
  const [includeAdmin, setIncludeAdmin] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    setRuns(null);
    adminRecentSearches(100, includeAdmin).then(setRuns).catch((e) => setError(String(e)));
  }, [includeAdmin]);
  const done = runs?.filter((r) => r.completed).length ?? 0;
  return (
    <div className="stack">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="muted" style={{ fontSize: 13 }}>
          {runs ? `Latest ${runs.length} searches · ${done} produced a map` : "Loading…"}
        </div>
        <label className="muted" style={{ fontSize: 13, display: "flex", gap: 6, alignItems: "center" }}>
          <input type="checkbox" checked={includeAdmin} onChange={(e) => setIncludeAdmin(e.target.checked)} style={{ width: "auto" }} />
          Include admin &amp; SEO runs
        </label>
      </div>
      {error && <div style={{ color: "var(--error)" }}>{error}</div>}
      {runs?.map((r) => <RunCard key={r.run_id} r={r} showUser onOpenUser={onOpenUser} />)}
    </div>
  );
}

function AuditTab({ onOpenUser }: { onOpenUser: (id: string) => void }) {
  const [actions, setActions] = useState<AdminActionLog[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    adminAuditLog(200).then(setActions).catch((e) => setError(String(e)));
  }, []);
  return (
    <div className="card stack">
      {error && <div style={{ color: "var(--error)" }}>{error}</div>}
      {!actions && !error && <div className="muted">Loading…</div>}
      {actions && actions.length === 0 && <div className="muted">No admin changes yet.</div>}
      {actions && actions.length > 0 && <ActionList actions={actions} showTarget onOpenUser={onOpenUser} />}
    </div>
  );
}

function SystemTab() {
  const [snapshot, setSnapshot] = useState<ResourceSnapshot | null>(null);
  const [online, setOnline] = useState<OnlineUsersResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getResourceStats(30)
      .then((s) => s.length && setSnapshot(s[s.length - 1]))
      .catch(() => {});
    getOnlineUsers().then(setOnline).catch((e) => setError(String(e)));
  }, []);

  async function refresh() {
    setBusy(true);
    setError(null);
    try {
      setSnapshot(await takeResourceSnapshot());
      setOnline(await getOnlineUsers());
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  }

  // The Render Postgres plan has 1 GB of storage
  const DB_LIMIT_MB = 1024;
  const rows: Array<[string, number, number]> = snapshot
    ? [
        ["Users", snapshot.users_count, snapshot.users_disk_mb],
        ["Projects", snapshot.projects_count, snapshot.projects_disk_mb],
        ["Runs", snapshot.runs_count, snapshot.runs_disk_mb],
        ["Papers", snapshot.papers_count, snapshot.papers_disk_mb],
        ["Authorships", snapshot.authorship_count, snapshot.authorship_disk_mb],
        ["Run ↔ paper links", snapshot.run_papers_count, snapshot.run_papers_disk_mb],
        ["Affiliation cache", snapshot.affiliation_cache_count, snapshot.affiliation_cache_disk_mb],
        ["Geocoding cache", snapshot.geocoding_cache_count, snapshot.geocoding_cache_disk_mb],
        ["Institutions", snapshot.institution_geo_count, snapshot.institution_geo_disk_mb],
      ]
    : [];
  const used = snapshot ? snapshot.total_disk_size_mb / DB_LIMIT_MB : 0;

  return (
    <div className="card stack">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div style={{ fontSize: 15 }}>
          🟢 Online now: <strong>{online?.online_count ?? "–"}</strong>
          <span className="muted" style={{ fontSize: 13 }}> (active in the last 5 min)</span>
        </div>
        <button className="secondary" disabled={busy} onClick={refresh}>
          {busy ? "Measuring…" : "Refresh"}
        </button>
      </div>
      {error && <div style={{ color: "var(--error)" }}>{error}</div>}
      {snapshot ? (
        <>
          <div>
            <div className="flex justify-between" style={{ fontSize: 14 }}>
              <span>Database size</span>
              <strong>
                {snapshot.total_disk_size_mb.toFixed(0)} MB of {DB_LIMIT_MB} MB ({Math.round(used * 100)}%)
              </strong>
            </div>
            <div style={{ height: 8, background: "#e5e7eb", borderRadius: 4, marginTop: 6, overflow: "hidden" }}>
              <div style={{ width: `${Math.min(100, used * 100)}%`, height: "100%", background: used > 0.8 ? "#dc2626" : used > 0.6 ? "#f59e0b" : "#22c55e" }} />
            </div>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={th}>Table</th>
                  <th style={{ ...th, textAlign: "right" }}>Rows</th>
                  <th style={{ ...th, textAlign: "right" }}>Size</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(([name, count, mb]) => (
                  <tr key={name}>
                    <td style={td}>{name}</td>
                    <td style={{ ...td, textAlign: "right" }}>{count.toLocaleString()}</td>
                    <td style={{ ...td, textAlign: "right" }}>{mb.toFixed(1)} MB</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="muted" style={{ fontSize: 12 }}>Measured {dateTime(snapshot.snapshot_time)}</div>
        </>
      ) : (
        <div className="muted">No measurement yet. Click Refresh.</div>
      )}
    </div>
  );
}

// ------------------------------------------------------------------ Page

function AdminConsole() {
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [tab, setTab] = useState<Tab>("overview");
  const [openUser, setOpenUser] = useState<string | null>(null);
  const [usersVersion, setUsersVersion] = useState(0);

  useEffect(() => setAllowed(isSuperUser()), []);
  const closeUser = useCallback(() => setOpenUser(null), []);

  if (allowed === null) return null;
  if (!allowed) {
    return (
      <div className="card" style={{ textAlign: "center", padding: 32 }}>
        <p>This page is for administrators.</p>
        <Link href="/projects">Back to your projects</Link>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <h1 className="text-gradient text-2xl sm:text-3xl" style={{ margin: 0 }}>
          Admin console
        </h1>
        <Link href="/projects" className="muted" style={{ fontSize: 14 }}>
          ← Your projects
        </Link>
      </div>

      <nav className="flex gap-1 overflow-x-auto" style={{ borderBottom: "1px solid var(--border)" }}>
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              background: "none",
              border: "none",
              borderBottom: `2px solid ${tab === t.key ? "#2563eb" : "transparent"}`,
              borderRadius: 0,
              color: tab === t.key ? "#2563eb" : "var(--muted)",
              fontWeight: tab === t.key ? 600 : 400,
              padding: "8px 14px",
              whiteSpace: "nowrap",
            }}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {tab === "overview" && <BusinessMetricsPanel />}
      {tab === "users" && <UsersTab version={usersVersion} onOpen={setOpenUser} />}
      {tab === "searches" && <SearchesTab onOpenUser={setOpenUser} />}
      {tab === "audit" && <AuditTab key={usersVersion} onOpenUser={setOpenUser} />}
      {tab === "system" && <SystemTab />}

      {openUser && <UserPanel userId={openUser} onClose={closeUser} onChanged={() => setUsersVersion((v) => v + 1)} />}
    </>
  );
}

export default function AdminPage() {
  return (
    <AuthGuard>
      <UnifiedNavbar variant="app" />
      <div className="container stack" style={{ paddingTop: 80, paddingBottom: 40 }}>
        <AdminConsole />
      </div>
    </AuthGuard>
  );
}
