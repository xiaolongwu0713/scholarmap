"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { 
  createProject, 
  listProjects, 
  type Project,
  takeResourceSnapshot,
  getOnlineUsers,
  getUserQuota,
  type ResourceSnapshot,
  type OnlineUsersResponse,
} from "@/lib/api";
import { getUser, removeToken, isSuperUser } from "@/lib/auth";
import AuthGuard from "@/components/AuthGuard";
import QuotaDisplay from "@/components/QuotaDisplay";
import { UnifiedNavbar } from "@/components/UnifiedNavbar";

function ProjectsPageContent() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<{ user_id: string; email: string } | null>(null);
  const [isSuper, setIsSuper] = useState(false);
  
  // Quota error modal
  const [quotaErrorModal, setQuotaErrorModal] = useState<{ show: boolean; message: string }>({ show: false, message: "" });
  
  // Resource monitoring state (super user only)
  const [snapshot, setSnapshot] = useState<ResourceSnapshot | null>(null);
  const [onlineUsers, setOnlineUsers] = useState<OnlineUsersResponse | null>(null);
  const [snapshotLoading, setSnapshotLoading] = useState(false);
  const [onlineLoading, setOnlineLoading] = useState(false);
  const [monitorError, setMonitorError] = useState<string | null>(null);

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
      await refresh();
    } catch (e) {
      const errorMessage = String(e);
      // Check if it's a quota error (403 with quota-related message)
      if (errorMessage.includes("403") || errorMessage.toLowerCase().includes("quota") || errorMessage.toLowerCase().includes("limit") || errorMessage.toLowerCase().includes("maximum")) {
        let displayMessage = "You can only create a limited number of projects and runs per project. Upgrade to increase your quota.";
        try {
          const quota = await getUserQuota();
          const projectsLimit = quota.quotas.max_projects.unlimited || quota.quotas.max_projects.limit === -1
            ? "Unlimited"
            : quota.quotas.max_projects.limit.toString();
          const runsLimit = quota.quotas.max_runs_per_project.unlimited || quota.quotas.max_runs_per_project.limit === -1
            ? "Unlimited"
            : quota.quotas.max_runs_per_project.limit.toString();
          displayMessage = `You can only create ${projectsLimit} projects, and ${runsLimit} runs per project. Upgrade to increase your quota.`;
        } catch {
          // Keep fallback message if quota lookup fails.
        }
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

  // Resource monitoring functions (super user only)
  async function handleRefreshSnapshot() {
    if (!isSuper) return;
    setSnapshotLoading(true);
    setMonitorError(null);
    try {
      const result = await takeResourceSnapshot();
      setSnapshot(result);
    } catch (e) {
      setMonitorError(String(e));
    } finally {
      setSnapshotLoading(false);
    }
  }

  async function handleCheckOnlineUsers() {
    if (!isSuper) return;
    setOnlineLoading(true);
    setMonitorError(null);
    try {
      const result = await getOnlineUsers();
      setOnlineUsers(result);
    } catch (e) {
      setMonitorError(String(e));
    } finally {
      setOnlineLoading(false);
    }
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

      <div
        className="row"
        style={{
          gap: "1.5rem",
          flexWrap: "wrap",
          alignItems: "stretch"
        }}
      >
        <div className="card" style={{ flex: "1 1 420px", maxWidth: "640px" }}>
          <div>
            <h1 style={{ margin: 0 }}>My Projects</h1>
            <p className="muted" style={{ margin: "0.5rem 0 0 0" }}>
              Create a project, then run searches from a research description.
            </p>
          </div>
        </div>

        {!isSuper && (
          <div style={{ flex: "1 1 320px", maxWidth: "460px" }}>
            <QuotaDisplay />
          </div>
        )}
      </div>

      <div className="card stack">
        <div className="row">
          <div style={{ position: "relative", flex: 1 }}>
            {validateProjectName(name).length > 0 && (
              <div
                style={{
                  position: "absolute",
                  top: 8,
                  right: 10,
                  zIndex: 1,
                  fontSize: 12,
                  color: "#b91c1c",
                  background: "#fee2e2",
                  border: "1px solid #fecaca",
                  borderRadius: 999,
                  padding: "2px 8px"
                }}
              >
                {validateProjectName(name).join(" · ")}
              </div>
            )}
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Project name"
              maxLength={50}
            />
          </div>
          <button onClick={onCreate} disabled={validateProjectName(name).length > 0}>
            Create
          </button>
        </div>
        {error ? <div className="muted">Error: {error}</div> : null}
      </div>

      <div className="card stack">
        <h2>Projects</h2>
        {projects.length === 0 ? <div className="muted">No projects yet.</div> : null}
        {projects.map((p) => (
          <div key={p.project_id} className="row" style={{ justifyContent: "space-between" }}>
            <div className="stack" style={{ gap: 4 }}>
              <div>{p.name}</div>
              <div className="muted">{p.project_id}</div>
            </div>
            <Link href={`/projects/${p.project_id}`}>
              <button className="secondary">Open</button>
            </Link>
          </div>
        ))}
      </div>

      {/* Resource Monitoring Panel (Super User Only) */}
      {isSuper && (
        <div className="card stack" style={{ border: "2px solid #4CAF50" }}>
          <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
            <h2 style={{ margin: 0 }}>System Resource Monitor</h2>
            <div style={{ fontSize: "0.8rem", color: "#4CAF50", fontWeight: "bold" }}>
              SUPER USER
            </div>
          </div>
          
          {monitorError && (
            <div style={{ padding: "0.5rem", background: "#ffebee", borderRadius: "4px", color: "#c62828" }}>
              Error: {monitorError}
            </div>
          )}

          <div className="row" style={{ gap: "1rem" }}>
            <button 
              onClick={handleRefreshSnapshot} 
              disabled={snapshotLoading}
              style={{ flex: 1 }}
            >
              {snapshotLoading ? "Loading..." : "🔄 Refresh Resource Snapshot"}
            </button>
            <button 
              onClick={handleCheckOnlineUsers} 
              disabled={onlineLoading}
              className="secondary"
              style={{ flex: 1 }}
            >
              {onlineLoading ? "Loading..." : "👥 Check Online Users"}
            </button>
          </div>

          {/* Display snapshot data */}
          {snapshot && (
            <div className="stack" style={{ gap: "0.5rem", background: "#f5f5f5", padding: "1rem", borderRadius: "4px" }}>
              <div style={{ fontSize: "0.9rem", fontWeight: "bold", marginBottom: "0.5rem" }}>
                Latest Snapshot: {new Date(snapshot.snapshot_time).toLocaleString()}
              </div>
              
              <div className="row" style={{ gap: "2rem", flexWrap: "wrap" }}>
                <div className="stack" style={{ gap: "0.25rem", minWidth: "200px" }}>
                  <div style={{ fontSize: "0.85rem", color: "#666" }}>Metric 1: Table Rows</div>
                  <div>Users: <strong>{snapshot.users_count.toLocaleString()}</strong></div>
                  <div>Projects: <strong>{snapshot.projects_count.toLocaleString()}</strong></div>
                  <div>Runs: <strong>{snapshot.runs_count.toLocaleString()}</strong></div>
                  <div>Papers: <strong>{snapshot.papers_count.toLocaleString()}</strong></div>
                  <div>Authorship: <strong>{snapshot.authorship_count.toLocaleString()}</strong></div>
                </div>

                <div className="stack" style={{ gap: "0.25rem", minWidth: "200px" }}>
                  <div style={{ fontSize: "0.85rem", color: "#666" }}>Metric 2: Disk Space</div>
                  <div>Total: <strong>{snapshot.total_disk_size_mb.toFixed(2)} MB</strong></div>
                  <div>Papers: <strong>{snapshot.papers_disk_mb.toFixed(2)} MB</strong></div>
                  <div>Authorship: <strong>{snapshot.authorship_disk_mb.toFixed(2)} MB</strong></div>
                  <div>Affiliation Cache: <strong>{snapshot.affiliation_cache_disk_mb.toFixed(2)} MB</strong></div>
                  <div>Geocoding Cache: <strong>{snapshot.geocoding_cache_disk_mb.toFixed(2)} MB</strong></div>
                </div>
              </div>
            </div>
          )}

          {/* Display online users */}
          {onlineUsers && (
            <div className="stack" style={{ gap: "0.25rem", background: "#e8f5e9", padding: "1rem", borderRadius: "4px" }}>
              <div style={{ fontSize: "1rem", fontWeight: "bold" }}>
                🟢 Online Users: <span style={{ color: "#4CAF50" }}>{onlineUsers.online_count}</span>
              </div>
              <div style={{ fontSize: "0.8rem", color: "#666" }}>
                Active in last 5 minutes (as of {new Date(onlineUsers.last_updated).toLocaleTimeString()})
              </div>
            </div>
          )}
        </div>
      )}
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
