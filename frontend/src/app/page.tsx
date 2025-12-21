"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createProject, listProjects, type Project } from "@/lib/api";

export default function HomePage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);

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

  return (
    <div className="stack">
      <div className="card">
        <h1>ScholarNet</h1>
        <p className="muted">Create a project, then run searches from a research description.</p>
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

