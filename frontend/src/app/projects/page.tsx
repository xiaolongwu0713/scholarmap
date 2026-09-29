"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { 
  createProject, 
  listProjects, 
  type Project,
  searchLimitMessage,
} from "@/lib/api";
import { getUser, removeToken, isSuperUser } from "@/lib/auth";
import { trackConversion } from "@/lib/analytics";
import AuthGuard from "@/components/AuthGuard";
import QuotaDisplay from "@/components/QuotaDisplay";
import { UnifiedNavbar } from "@/components/UnifiedNavbar";

function ProjectsPageContent() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<{ user_id: string; email: string } | null>(null);
  const [isSuper, setIsSuper] = useState(false);
  
  // Quota error modal
  const [quotaErrorModal, setQuotaErrorModal] = useState<{ show: boolean; message: string }>({ show: false, message: "" });


  useEffect(() => {
    // Get user info on client side only
    const currentUser = getUser();
    setUser(currentUser);
    setIsSuper(isSuperUser());
  }, []);

  async function refresh() {
    setError(null);
    const items = await listProjects();
    setProjects(items);
  }

  useEffect(() => {
    refresh().catch((e) => setError(String(e)));
  }, []);

  function validateProjectName(text: string): string[] {
    const trimmed = text.trim();
    const issues: string[] = [];

    if (!trimmed) issues.push("required");
    if (trimmed.length < 3 || trimmed.length > 50) issues.push("3–50 chars");
    if (/[^A-Za-z0-9 _-]/.test(trimmed)) issues.push("letters/numbers/spaces/-/_ only");

    return issues;
  }

  async function onCreate() {
    setError(null);
    const trimmed = name.trim();
    const nameIssues = validateProjectName(trimmed);
    if (nameIssues.length > 0) {
      setError(`Invalid project name: ${nameIssues.join(", ")}`);
      return;
    }
    
    try {
      await createProject(trimmed);
      setName("");
      setCreating(false);
      await refresh();
    } catch (e) {
      const errorMessage = String(e);
      // Check if it's a quota error (403 with quota-related message)
      if (errorMessage.includes("403") || errorMessage.toLowerCase().includes("quota") || errorMessage.toLowerCase().includes("limit") || errorMessage.toLowerCase().includes("maximum")) {
        const displayMessage = await searchLimitMessage();
        setQuotaErrorModal({ show: true, message: displayMessage });
      } else {
        setError(errorMessage);
      }
    }
  }

  function handleLogout() {
    removeToken();
    router.push("/auth/login");
  }

  return (
    <>
      <UnifiedNavbar variant="app" />
      <div className="container stack" style={{ paddingTop: "80px" }}>

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
                ⚠️ Search limit reached
              </h3>
              <div style={{ color: "#6b7280", fontSize: "14px", lineHeight: "1.5" }}>
                {quotaErrorModal.message}
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
              <button
                className="secondary"
                onClick={() => setQuotaErrorModal({ show: false, message: "" })}
                style={{ padding: "8px 16px", fontSize: "14px" }}
              >
                Not now
              </button>
              <Link href="/pricing" onClick={() => trackConversion("upgrade_click", { source: "limit_modal" })}>
                <button className="primary" style={{ padding: "8px 16px", fontSize: "14px" }}>
                  Upgrade to Pro
                </button>
              </Link>
            </div>
          </div>
        </div>
      )}

      <div
        className={
          isSuper ? "stack" : "grid gap-6 items-start lg:grid-cols-[minmax(0,1fr)_320px]"
        }
      >
        {/* Plan: fixed sidebar on desktop, compact card above the list on small screens */}
        {!isSuper && (
          <aside className="lg:col-start-2 lg:row-start-1 lg:sticky lg:top-24">
            <QuotaDisplay />
          </aside>
        )}

        <main className="stack lg:col-start-1 lg:row-start-1" style={{ minWidth: 0 }}>
          <div className="row" style={{ justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap" }}>
            <div>
              <h1 style={{ margin: 0 }}>My Projects</h1>
              <p className="muted" style={{ margin: "0.5rem 0 0 0" }}>
                Create a project, then run searches from a research description.
              </p>
            </div>
            {!creating && projects.length > 0 && (
              <button onClick={() => setCreating(true)}>+ New project</button>
            )}
          </div>

          {creating && (
            <form
              className="card stack"
              onSubmit={(e) => {
                e.preventDefault();
                onCreate();
              }}
            >
              <label htmlFor="project-name" style={{ fontWeight: 500 }}>
                Project name
              </label>
              <div className="row" style={{ flexWrap: "wrap" }}>
                <input
                  id="project-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Brain-computer interfaces"
                  maxLength={50}
                  autoFocus
                  style={{ flex: "1 1 220px" }}
                />
                <button type="submit" disabled={validateProjectName(name).length > 0}>
                  Create
                </button>
                <button
                  type="button"
                  className="secondary"
                  onClick={() => {
                    setCreating(false);
                    setName("");
                    setError(null);
                  }}
                >
                  Cancel
                </button>
              </div>
              <div className="muted" style={{ fontSize: "0.85rem" }}>
                3–50 characters: letters, numbers, spaces, - and _
              </div>
              {name.trim() && validateProjectName(name).length > 0 && (
                <div style={{ fontSize: "0.85rem", color: "var(--error)" }}>
                  {validateProjectName(name).join(" · ")}
                </div>
              )}
            </form>
          )}
          {error ? <div className="muted">Error: {error}</div> : null}

          {projects.length === 0 && !creating ? (
            <div className="card stack" style={{ alignItems: "flex-start" }}>
              <h2 style={{ margin: 0 }}>Start your first project</h2>
              <p className="muted" style={{ margin: 0 }}>
                A project groups your searches. Describe a research area and LabScout maps the labs and
                researchers working on it.
              </p>
              <button onClick={() => setCreating(true)}>+ New project</button>
              <p className="muted" style={{ margin: 0, fontSize: "0.9rem" }}>
                Or explore an example map:{" "}
                <Link href="/research-jobs/brain-computer-interface">Brain-computer interfaces</Link>
                {" · "}
                <Link href="/research-jobs/crispr-gene-editing">CRISPR gene editing</Link>
              </p>
            </div>
          ) : projects.length > 0 ? (
            <div className="card" style={{ padding: 0, overflow: "hidden" }}>
              {projects.map((p, i) => (
                <Link
                  key={p.project_id}
                  href={`/projects/${p.project_id}`}
                  className="flex items-center justify-between gap-4 px-6 py-4 hover:bg-slate-50"
                  style={{
                    color: "inherit",
                    textDecoration: "none",
                    borderTop: i === 0 ? "none" : "1px solid var(--border, #e5e7eb)",
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {p.name}
                    </div>
                    <div className="muted" style={{ fontSize: "0.85rem" }}>
                      Created {new Date(p.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  <span className="muted" style={{ whiteSpace: "nowrap" }}>
                    Open →
                  </span>
                </Link>
              ))}
            </div>
          ) : null}

      {isSuper && (
        <Link href="/admin" className="card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", border: "2px solid #2563eb" }}>
          <div>
            <div style={{ fontWeight: 600 }}>Admin console</div>
            <div className="muted" style={{ fontSize: "0.85rem" }}>Business metrics, users and quotas, searches, system</div>
          </div>
          <span className="muted">Open →</span>
        </Link>
      )}
        </main>
      </div>
      </div>
    </>
  );
}

export default function ProjectsPage() {
  return (
    <AuthGuard>
      <ProjectsPageContent />
    </AuthGuard>
  );
}
