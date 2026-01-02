"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createProject, listProjects, type Project } from "@/lib/api";
import { getUser, removeToken } from "@/lib/auth";
import AuthGuard from "@/components/AuthGuard";

function HomePageContent() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<{ user_id: string; email: string } | null>(null);

  useEffect(() => {
    // Get user info on client side only
    setUser(getUser());
  }, []);

  async function refresh() {
    setError(null);
    const items = await listProjects();
    setProjects(items);
  }

  useEffect(() => {
    refresh().catch((e) => setError(String(e)));
  }, []);

  async function onCreate() {
    setError(null);
    const trimmed = name.trim();
    if (!trimmed) return;
    await createProject(trimmed);
    setName("");
    await refresh();
  }

  function handleLogout() {
    removeToken();
    router.push("/auth/login");
  }

  return (
    <div className="stack">
      <div className="card">
        <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h1 style={{ margin: 0 }}>ScholarMap</h1>
            <p className="muted" style={{ margin: "0.5rem 0 0 0" }}>
              Create a project, then run searches from a research description.
            </p>
          </div>
          <div className="stack" style={{ gap: "0.5rem", alignItems: "flex-end" }}>
            {user && (
              <div style={{ fontSize: "0.9rem", color: "var(--muted)" }}>{user.email}</div>
            )}
            <button onClick={handleLogout} className="secondary" style={{ fontSize: "0.9rem" }}>
              Logout
            </button>
          </div>
        </div>
      </div>

      <div className="card stack">
        <div className="row">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Project name"
          />
          <button onClick={onCreate}>Create</button>
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
    </div>
  );
}

export default function HomePage() {
  return (
    <AuthGuard>
      <HomePageContent />
    </AuthGuard>
  );
}
