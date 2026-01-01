"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { getProject, createRun, deleteRun, type Run } from "@/lib/api";

export default function ProjectPage() {
  const params = useParams();
  const projectId = params.projectId as string;
  const router = useRouter();
  const [runs, setRuns] = useState<Run[]>([]);
  const [projectName, setProjectName] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [creatingRun, setCreatingRun] = useState(false);
  const [deletingRunId, setDeletingRunId] = useState<string | null>(null);

  const sortedRuns = useMemo(() => runs, [runs]);

  async function refresh() {
    setError(null);
    const data = await getProject(projectId);
    setProjectName(data.project.name);
    setRuns(data.runs);
  }

  useEffect(() => {
    refresh().catch((e) => setError(String(e)));
  }, [projectId]);

  return (
    <div className="stack">
      <div className="row" style={{ justifyContent: "space-between" }}>
        <div className="stack" style={{ gap: 4 }}>
          <h1 style={{ margin: 0 }}>{projectName || "Project"}</h1>
          <div className="muted">{projectId}</div>
        </div>
        <Link href="/">
          <button className="secondary">Back</button>
        </Link>
      </div>

      <div className="row" style={{ justifyContent: "space-between" }}>
        <h2 style={{ margin: 0 }}>Runs</h2>
        <button 
          onClick={async () => {
            setError(null);
            setCreatingRun(true);
            try {
              // Create run with empty description - user will enter it in the Run page
              // The placeholder will be shown via the placeholder attribute
              const run = await createRun(projectId, "");
              router.push(`/projects/${projectId}/runs/${run.run_id}`);
            } catch (e) {
              setError(String(e));
              setCreatingRun(false);
            }
          }}
          disabled={creatingRun}
        >
          {creatingRun ? "Creating…" : "Create Run"}
        </button>
      </div>
      {error ? <div className="muted">Error: {error}</div> : null}

      <div className="card stack">
        {sortedRuns.length === 0 ? <div className="muted">No runs yet.</div> : null}
        {sortedRuns.map((r) => (
          <div key={r.run_id} className="stack" style={{ gap: 8 }}>
            <div className="row" style={{ justifyContent: "space-between" }}>
              <div className="stack" style={{ gap: 4 }}>
                <div>run_{r.run_id}</div>
                <div className="muted">{r.created_at}</div>
              </div>
              <div className="row" style={{ gap: 8 }}>
                <Link href={`/projects/${projectId}/runs/${r.run_id}`}>
                  <button className="secondary">Open</button>
                </Link>
                <button
                  className="secondary"
                  onClick={async () => {
                    if (!confirm(`Are you sure you want to delete run_${r.run_id}? This action cannot be undone.`)) {
                      return;
                    }
                    setError(null);
                    setDeletingRunId(r.run_id);
                    try {
                      await deleteRun(projectId, r.run_id);
                      await refresh();
                    } catch (e) {
                      setError(String(e));
                    } finally {
                      setDeletingRunId(null);
                    }
                  }}
                  disabled={deletingRunId === r.run_id}
                  style={{
                    background: deletingRunId === r.run_id ? "#f3f4f6" : "#fee2e2",
                    color: deletingRunId === r.run_id ? "#9ca3af" : "#dc2626",
                    border: "1px solid #fca5a5"
                  }}
                >
                  {deletingRunId === r.run_id ? "Deleting…" : "Delete"}
                </button>
              </div>
            </div>
            <div className="muted" style={{ whiteSpace: "pre-wrap" }}>
              {r.description}
            </div>
            <hr style={{ border: 0, borderTop: "1px solid #e5e7eb" }} />
          </div>
        ))}
      </div>
    </div>
  );
}
