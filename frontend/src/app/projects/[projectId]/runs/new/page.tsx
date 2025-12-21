"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createRun } from "@/lib/api";

export default function NewRunPage({ params }: { params: { projectId: string } }) {
  const projectId = params.projectId;
  const router = useRouter();
  const [desc, setDesc] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onCreate() {
    setError(null);
    const trimmed = desc.trim();
    if (!trimmed) {
      setError("Please enter a research description.");
      return;
    }
    setBusy(true);
    try {
      const run = await createRun(projectId, trimmed);
      router.push(`/projects/${projectId}/runs/${run.run_id}`);
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="stack">
      <div className="row" style={{ justifyContent: "space-between" }}>
        <h1 style={{ margin: 0 }}>New Run</h1>
        <Link href={`/projects/${projectId}`}>
          <button className="secondary">Back</button>
        </Link>
      </div>

      <div className="card stack">
        <div className="muted">Enter your research interest/description to create a Run.</div>
        <textarea
          rows={6}
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
          placeholder="1–10 sentences, Chinese/English/mixed."
        />
        <div className="row" style={{ justifyContent: "space-between" }}>
          <div className="muted">You can further parse/edit in the Run page.</div>
          <button onClick={onCreate} disabled={busy}>
            {busy ? "Creating…" : "Create"}
          </button>
        </div>
        {error ? <div className="muted">Error: {error}</div> : null}
      </div>
    </div>
  );
}

