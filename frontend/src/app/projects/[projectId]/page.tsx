"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { getProject, createRun, deleteRun, type Run } from "@/lib/api";
import AuthGuard from "@/components/AuthGuard";

function ProjectPageContent() {
  const params = useParams();
  const projectId = params.projectId as string;
  const router = useRouter();
  const [runs, setRuns] = useState<Run[]>([]);
  const [projectName, setProjectName] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [creatingRun, setCreatingRun] = useState(false);
  const [deletingRunId, setDeletingRunId] = useState<string | null>(null);
  
  // Quota error modal
  const [quotaErrorModal, setQuotaErrorModal] = useState<{ show: boolean; message: string }>({ show: false, message: "" });

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
    <div className="container stack">
      {/* Quota Error Modal */}
      {quotaErrorModal.show && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000
          }}
          onClick={() => setQuotaErrorModal({ show: false, message: "" })}
        >
          <div
            style={{
              backgroundColor: "white",
              borderRadius: "16px",
              padding: "24px",
              maxWidth: "500px",
              width: "90%",
              boxShadow: "0 8px 32px rgba(0, 0, 0, 0.2)",
              border: "1px solid #e5e7eb"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ marginBottom: "16px" }}>
              <h3 style={{ margin: 0, marginBottom: "8px", color: "#dc2626", fontSize: "20px" }}>
                ⚠️ Quota Limit Reached
              </h3>
              <div style={{ color: "#6b7280", fontSize: "14px", lineHeight: "1.5" }}>
                {quotaErrorModal.message}
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
              <button
                className="primary"
                onClick={() => setQuotaErrorModal({ show: false, message: "" })}
                style={{ padding: "8px 16px", fontSize: "14px" }}
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

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
              const errorMessage = String(e);
              // Check if it's a quota error (403 with quota-related message)
              if (errorMessage.includes("403") || errorMessage.toLowerCase().includes("quota") || errorMessage.toLowerCase().includes("limit") || errorMessage.toLowerCase().includes("maximum")) {
                // Extract the error message
                const messageMatch = errorMessage.match(/:\s*(.+?)(?:\s*$|$)/);
                const displayMessage = messageMatch ? messageMatch[1] : "You have reached the maximum number of runs allowed for this project.";
                setQuotaErrorModal({ show: true, message: displayMessage });
              } else {
                setError(errorMessage);
              }
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

export default function ProjectPage() {
  return (
    <AuthGuard>
      <ProjectPageContent />
    </AuthGuard>
  );
}
