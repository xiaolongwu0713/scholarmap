"use client";

export type AutoStage = "understand" | "framework" | "query" | "search" | "map";
export type StageStatus = "pending" | "running" | "done" | "failed" | "waiting";

export const AUTO_STAGES: Array<{ key: AutoStage; label: string; time: string }> = [
  { key: "understand", label: "Understanding your topic", time: "~20 s" },
  { key: "framework", label: "Designing the search strategy", time: "~30 s" },
  { key: "query", label: "Writing the PubMed query", time: "~20 s" },
  { key: "search", label: "Searching PubMed", time: "~30 s" },
  { key: "map", label: "Mapping labs & researchers", time: "1–5 min" },
];

const ICON: Record<StageStatus, string> = {
  pending: "○",
  running: "⏳",
  done: "✓",
  failed: "✕",
  waiting: "✎",
};

const COLOR: Record<StageStatus, string> = {
  pending: "#9ca3af",
  running: "#2563eb",
  done: "#16a34a",
  failed: "#dc2626",
  waiting: "#b45309",
};

interface AutoProgressProps {
  statuses: Record<AutoStage, StageStatus>;
  /** Shown under the stage that needs attention, e.g. "Answer the questions above to continue." */
  note?: string | null;
  /** Resume from the first unfinished stage (after a failure or a page reload). */
  onContinue?: () => void;
  onOpenMap?: () => void;
  busy: boolean;
  /** Overrides the default heading, e.g. when the search found nothing. */
  title?: string;
}

/** One-click search progress: each stage of the pipeline with its status. */
export function AutoProgress({ statuses, note, onContinue, onOpenMap, busy, title }: AutoProgressProps) {
  const failed = AUTO_STAGES.find((s) => statuses[s.key] === "failed");
  const allDone = AUTO_STAGES.every((s) => statuses[s.key] === "done");

  return (
    <div className="card stack" style={{ gap: 12 }}>
      <h2 style={{ margin: 0 }}>{title ?? (allDone ? "✓ Your map is ready" : "Generating your map")}</h2>
      <ol style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 8 }}>
        {AUTO_STAGES.map((stage) => {
          const status = statuses[stage.key];
          return (
            <li key={stage.key} style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ width: 20, textAlign: "center", color: COLOR[status], fontWeight: 700 }}>
                {ICON[status]}
              </span>
              <span style={{ flex: 1, color: status === "pending" ? "var(--muted)" : "var(--text)", fontWeight: status === "running" ? 600 : 400 }}>
                {stage.label}
              </span>
              {status === "running" && <span className="muted" style={{ fontSize: 13 }}>usually {stage.time}</span>}
            </li>
          );
        })}
      </ol>
      {statuses.map === "running" && (
        <div className="muted" style={{ fontSize: 13 }}>
          Mapping reads every paper&apos;s author affiliations, so this is the slow step. You can leave this page open; the map opens when it&apos;s done.
        </div>
      )}
      {note && <div style={{ color: failed ? "var(--error)" : "var(--warning)", fontSize: 14 }}>{note}</div>}
      <div className="row" style={{ gap: 12, flexWrap: "wrap" }}>
        {onContinue && !busy && !allDone && (
          <button onClick={onContinue} className="gradient-blue">
            {failed ? "Retry from this step" : "Continue generating my map"}
          </button>
        )}
        {allDone && onOpenMap && (
          <button onClick={onOpenMap} className="gradient-green">
            🌍 Open Interactive Map
          </button>
        )}
      </div>
    </div>
  );
}
