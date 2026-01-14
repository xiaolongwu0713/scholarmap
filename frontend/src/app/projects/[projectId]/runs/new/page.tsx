"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createRun, textValidate, getUserQuota } from "@/lib/api";
import { UnifiedNavbar } from "@/components/UnifiedNavbar";

function validateClientInput(text: string): string[] {
  const s = text ?? "";
  const trimmed = s.trim();
  const issues: string[] = [];

  // Basic format checks (frontend can easily do these)
  if (!trimmed) issues.push("required");
  if (trimmed.length < 50 || trimmed.length > 300) issues.push("50–300 chars");
  const newlineCount = (s.match(/\n/g) || []).length;
  if (newlineCount > 3) issues.push("max 3 newlines");
  if (/<[^>]+>/.test(s)) issues.push("no HTML");
  if (/\[[^\]]+\]\([^)]+\)/.test(s)) issues.push("no markdown links");
  if (/(https?:\/\/|www\.)\S+/i.test(s)) issues.push("no URL");
  if (/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i.test(s)) issues.push("no email");
  if (/\b(?:\+?\d[\d\s().-]{7,}\d)\b/.test(s)) issues.push("no phone");
  if (/\b(wechat|weixin|wxid|vx)\b/i.test(s)) issues.push("no wechat");
  if (/[^\x00-\x7F]/.test(s)) issues.push("ASCII only");
  if (!/[A-Za-z]/.test(s)) issues.push("must contain letters");
  if (/[^A-Za-z0-9 _\-\n]/.test(s)) issues.push("letters/numbers/spaces/-/_ only");
  if (/\d{6,}/.test(s)) issues.push("no long number strings");
  if (/(.)\1{5,}/i.test(s)) issues.push("no repeated chars");
  if (/[A-Za-z]{25,}/.test(s)) issues.push("no long letter strings");

  return issues;
}

function charLimitHint(text: string, minChars = 50, maxChars = 300): string {
  const len = (text ?? "").trim().length;
  return `${len}/${maxChars} chars (min ${minChars})`;
}

export default function NewRunPage() {
  const params = useParams();
  const projectId = params.projectId as string;
  const router = useRouter();
  const [desc, setDesc] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clientIssues = validateClientInput(desc);

  async function onCreate() {
    setError(null);
    const trimmed = desc.trim();
    
    // Frontend validation
    if (clientIssues.length > 0) {
      setError(`Invalid input: ${clientIssues.join(", ")}`);
      return;
    }

    setBusy(true);
    try {
      // Backend validation (quality checks)
      const validateRes = await textValidate(trimmed);
      const validateData = validateRes.data as { ok: boolean; reason: string | null };
      if (!validateData.ok) {
        setError(validateData.reason || "Validation failed");
        return;
      }

      const run = await createRun(projectId, trimmed);
      router.push(`/projects/${projectId}/runs/${run.run_id}`);
    } catch (e) {
      const errorMessage = String(e);
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
        setError(displayMessage);
      } else {
        setError(errorMessage);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <UnifiedNavbar variant="app" />
      <div className="container stack" style={{ paddingTop: "80px" }}>
        <div className="row" style={{ justifyContent: "space-between" }}>
          <h1 style={{ margin: 0 }}>New Run</h1>
        <Link href={`/projects/${projectId}`}>
          <button className="secondary">Back</button>
        </Link>
      </div>

      <div className="card stack">
        <div className="muted">Enter your research interest/description to create a Run.</div>
        <div style={{ position: "relative" }}>
          {clientIssues.length > 0 && (
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
              {clientIssues.join(" · ")}
            </div>
          )}
          <textarea
            rows={6}
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            placeholder="1–10 sentences, 50–300 characters, ASCII only."
            style={{ fontSize: "15px" }}
            maxLength={300}
          />
          <div
            style={{
              position: "absolute",
              right: 10,
              bottom: 8,
              fontSize: 12,
              color: "rgba(0,0,0,0.55)",
              background: "rgba(255,255,255,0.75)",
              border: "1px solid rgba(0,0,0,0.08)",
              borderRadius: 999,
              padding: "2px 8px"
            }}
          >
            {charLimitHint(desc)}
          </div>
        </div>
        <div className="row" style={{ justifyContent: "space-between" }}>
          <div className="muted">You can further parse/edit in the Run page.</div>
          <button onClick={onCreate} disabled={busy || clientIssues.length > 0}>
            {busy ? "Creating…" : "Create"}
          </button>
        </div>
        {error ? <div style={{ color: "#dc2626", fontSize: 14 }}>Error: {error}</div> : null}
      </div>
      </div>
    </>
  );
}
