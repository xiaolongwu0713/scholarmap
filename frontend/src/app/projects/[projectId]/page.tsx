"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { getProject, type Run } from "@/lib/api";

export default function ProjectPage() {
  const params = useParams();
  const projectId = params.projectId as string;
  const [runs, setRuns] = useState<Run[]>([]);
  const [projectName, setProjectName] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

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
        <Link href={`/projects/${projectId}/runs/new`}>
          <button>Create Run</button>
        </Link>
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
              <Link href={`/projects/${projectId}/runs/${r.run_id}`}>
                <button className="secondary">Open</button>
              </Link>
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
