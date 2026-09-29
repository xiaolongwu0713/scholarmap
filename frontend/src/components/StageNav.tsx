"use client";

export type Stage = "topic" | "strategy" | "papers" | "map";
export type StageState = "pending" | "running" | "input" | "failed" | "done";

export const STAGES: Array<{ key: Stage; label: string; placeholder: string }> = [
  { key: "topic", label: "Your topic", placeholder: "" },
  {
    key: "strategy",
    label: "Search strategy",
    placeholder: "Once your topic is understood, the search strategy and the PubMed query appear here.",
  },
  {
    key: "papers",
    label: "Papers",
    placeholder: "The papers found on PubMed appear here after the search.",
  },
  {
    key: "map",
    label: "Labs & researchers",
    placeholder: "The map of labs and researchers appears here once the papers are mapped (usually 1–5 minutes).",
  },
];

const LOOK: Record<StageState, { bg: string; border: string; text: string; icon: string }> = {
  pending: { bg: "#f3f4f6", border: "#6b7280", text: "#6b7280", icon: "○" },
  running: { bg: "#eff6ff", border: "#3b82f6", text: "#1d4ed8", icon: "⏳" },
  input: { bg: "#fffbeb", border: "#f59e0b", text: "#b45309", icon: "✎" },
  failed: { bg: "#fef2f2", border: "#ef4444", text: "#b91c1c", icon: "✕" },
  done: { bg: "#f0fdf4", border: "#22c55e", text: "#15803d", icon: "✓" },
};

interface StageNavProps {
  states: Record<Stage, StageState>;
  /** One line under each label, e.g. "500 papers" or "usually 1–5 min". */
  details: Partial<Record<Stage, string>>;
  active: Stage;
  onSelect: (stage: Stage) => void;
  /** Shown when the user is looking at another stage while one is in progress. */
  onJumpToCurrent?: () => void;
  /** Explains a stage that needs attention (failed, waiting for an answer, no results). */
  note?: string | null;
  action?: { label: string; onClick: () => void } | null;
  /** Extra controls on the right of the action row (e.g. Share/Export on a finished run). */
  extra?: React.ReactNode;
}

/** The run's four stages as buttons: progress at a glance, and the way to switch views. */
export function StageNav({ states, details, active, onSelect, onJumpToCurrent, note, action, extra }: StageNavProps) {
  return (
    <div className="card stack" style={{ gap: 12 }}>
      <nav aria-label="Search stages" className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {STAGES.map(({ key, label }, i) => {
          const state = states[key];
          const look = LOOK[state];
          const selected = key === active;
          return (
            <button
              key={key}
              type="button"
              onClick={() => onSelect(key)}
              aria-current={selected ? "step" : undefined}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-start",
                gap: 2,
                padding: "10px 12px",
                borderRadius: 10,
                background: look.bg,
                color: look.text,
                border: `${selected ? 2 : 1}px solid ${selected ? look.border : "#e5e7eb"}`,
                boxShadow: selected ? `0 0 0 3px ${look.border}22` : "none",
                textAlign: "left",
                cursor: "pointer",
                minWidth: 0,
              }}
            >
              <span style={{ fontWeight: 600, fontSize: 15, display: "flex", gap: 6, alignItems: "center" }}>
                <span aria-hidden>{look.icon}</span>
                <span>
                  {i + 1}. {label}
                </span>
              </span>
              {details[key] && (
                <span style={{ fontSize: 12, opacity: 0.85, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "100%" }}>
                  {details[key]}
                </span>
              )}
            </button>
          );
        })}
      </nav>
      {extra && !note && !onJumpToCurrent ? (
        // Action centered, extra controls on the right; stacked and centered on phones
        <div className="grid grid-cols-1 items-center gap-2 sm:grid-cols-[1fr_auto_1fr]">
          <div className="hidden sm:block" />
          {action ? (
            <button onClick={action.onClick} className="gradient-blue justify-self-center" style={{ padding: "6px 14px" }}>
              {action.label}
            </button>
          ) : (
            <div />
          )}
          <div className="flex gap-2 justify-center sm:justify-end">{extra}</div>
        </div>
      ) : (note || action || onJumpToCurrent) && (
        <div className="row" style={{ gap: 12, alignItems: "center", flexWrap: "wrap", justifyContent: note ? "flex-start" : "center" }}>
          {note && <span style={{ fontSize: 14, color: "var(--text)" }}>{note}</span>}
          {action && (
            <button onClick={action.onClick} className="gradient-blue" style={{ padding: "6px 14px" }}>
              {action.label}
            </button>
          )}
          {onJumpToCurrent && (
            <button onClick={onJumpToCurrent} className="secondary" style={{ padding: "6px 14px" }}>
              ▶ Show current step
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/** Shown for a stage the run hasn't reached yet. */
export function StagePlaceholder({ text }: { text: string }) {
  return (
    <div className="card" style={{ textAlign: "center", padding: "32px 16px" }}>
      <div className="muted">{text}</div>
    </div>
  );
}
