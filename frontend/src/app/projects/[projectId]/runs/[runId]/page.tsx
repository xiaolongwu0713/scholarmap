"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  getRunFile,
  listRunFiles,
  parseRun,
  textValidate,
  parseStage1,
  parseStage2,
  runQuery,
  runQueryBuild,
  updateQueries,
  updateRetrievalFramework,
  runIngest,
  getAuthorshipStats,
  type IngestStats
} from "@/lib/api";
import dynamic from "next/dynamic";
import MetricCard from "@/components/MetricCard";
import ProgressSteps from "@/components/ProgressSteps";

const MapModal = dynamic(() => import("@/components/MapModal"), { ssr: false });

type Paper = {
  title: string;
  authors: string[];
  year: number | null;
  venue: string | null;
  abstract: string | null;
  doi: string | null;
  pmid: string | null;
  url: string | null;
  source: "pubmed" | "semantic_scholar" | "openalex";
};

type AggregatedItem = {
  id?: string;
  doi: string;
  title?: string;
  authors?: string[];
  year?: number | null;
  venue?: string | null;
  abstract?: string | null;
  sources?: string[];
};

type ChatMessage = {
  role: "user" | "system";
  content: string;
};

type ParseResult = {
  plausibility_level: "A_impossible" | "B_plausible";
  is_research_description: boolean;
  is_clear_for_search: boolean;
  normalized_understanding: string;
  structured_summary: {
    domain: string | null;
    task: string | null;
    subject_system: string | null;
    methods: string | null;
    scope: string | null;
    intent: string | null;
    exclusions: string | null;
  };
  uncertainties: string[];
  missing_fields: string[];
  suggested_questions: Array<{
    field: string;
    question: string;
  }>;
  guidance_to_user: string;
};

function validateClientInput(text: string): string[] {
  const s = text ?? "";
  const trimmed = s.trim();
  const issues: string[] = [];

  if (trimmed.length < 50 || trimmed.length > 300) issues.push("50–300 chars");
  if ((s.match(/\n/g) || []).length >= 3) issues.push("max 2 newlines");
  if (/<[^>]+>/.test(s)) issues.push("no HTML");
  if (/\[[^\]]+\]\([^)]+\)/.test(s)) issues.push("no links");
  if (/(https?:\/\/|www\.)\S+/i.test(s)) issues.push("no URL");
  if (/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i.test(s)) issues.push("no email");

  return issues;
}

function extractFinalPubMedQuery(text: string): string {
  const m = text.match(/##\s*Final Combined PubMed Query[\s\S]*?```text\s*([\s\S]*?)\s*```/i);
  if (m?.[1]) return m[1].trim();
  const m2 = text.match(/```text\s*([\s\S]*?)\s*```/i);
  if (m2?.[1]) return m2[1].trim();
  return text.trim();
}

export default function RunPage() {
  const params = useParams();
  const projectId = params.projectId as string;
  const runId = params.runId as string;

  const [busy, setBusy] = useState<
    null | "textValidate" | "parse" | "buildFramework" | "queryBuild" | "query" | "ingest"
  >(null);
  const [error, setError] = useState<string | null>(null);
  
  // Phase 2 state
  const [ingestStats, setIngestStats] = useState<IngestStats | null>(null);
  const [showMap, setShowMap] = useState(false);

  const [researchDescription, setResearchDescription] = useState("");
  const [textValidateMode, setTextValidateMode] = useState(false);
  const [textValidateDraft, setTextValidateDraft] = useState("");
  const [textValidateLatest, setTextValidateLatest] = useState("");
  const [textValidateAttempts, setTextValidateAttempts] = useState(0);
  const [textValidateLocked, setTextValidateLocked] = useState(false);
  const [textValidateReason, setTextValidateReason] = useState<string | null>(null);
  const [textValidateMessages, setTextValidateMessages] = useState<ChatMessage[]>([]);
  const [parseStage1Attempts, setParseStage1Attempts] = useState(0);
  const [parseStage2Attempts, setParseStage2Attempts] = useState(0);
  const [parseStage1Locked, setParseStage1Locked] = useState(false);
  const [parseStage2Locked, setParseStage2Locked] = useState(false);
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [parseAdditionalInfo, setParseAdditionalInfo] = useState("");
  const [parseCurrentDescription, setParseCurrentDescription] = useState("");
  const [questions, setQuestions] = useState<string[]>([]);
  const [frameworkText, setFrameworkText] = useState<string>("");
  const [pubmedQueryText, setPubmedQueryText] = useState<string>("");
  const [queriesObj, setQueriesObj] = useState<{
    pubmed: string;
    pubmed_full: string;
    semantic_scholar: string;
    openalex: string;
  } | null>(null);

  const [pubmed, setPubmed] = useState<Paper[] | null>(null);
  const [s2, setS2] = useState<Paper[] | null>(null);
  const [oa, setOa] = useState<Paper[] | null>(null);
  const [agg, setAgg] = useState<AggregatedItem[] | null>(null);

  const [files, setFiles] = useState<string[]>([]);
  const [rawSelected, setRawSelected] = useState<string>("understanding.json");
  const [rawData, setRawData] = useState<any>(null);

  const resultTabs = ["PubMed", "Semantic Scholar", "OpenAlex", "Aggregated"] as const;
  const [activeResultTab, setActiveResultTab] =
    useState<(typeof resultTabs)[number]>("Aggregated");

  const researchClientIssues = validateClientInput(researchDescription);
  const textValidateDraftClientIssues = validateClientInput(textValidateDraft);
  const parseAdditionalClientIssues = validateClientInput(parseAdditionalInfo);

  async function refreshFiles() {
    try {
      const f = await listRunFiles(projectId, runId);
      setFiles(f);
      if (!f.includes(rawSelected) && f.length) setRawSelected(f[0]);
    } catch {
      setFiles([]);
    }
  }

  async function loadResults() {
    const load = async (name: string) => {
      try {
        return await getRunFile(projectId, runId, name);
      } catch {
        return null;
      }
    };
    const rp = await load("results_pubmed.json");
    const rs2 = await load("results_semantic_scholar.json");
    const roa = await load("results_openalex.json");
    const ra = await load("results_aggregated.json");
    setPubmed((rp?.items as Paper[]) || null);
    setS2((rs2?.items as Paper[]) || null);
    setOa((roa?.items as Paper[]) || null);
    setAgg((ra?.items as AggregatedItem[]) || null);
  }

  async function loadInitial() {
    await refreshFiles();
    const u = await getRunFile(projectId, runId, "understanding.json");
    setResearchDescription(u?.research_description || "");
    setQuestions((u?.clarification_questions as string[]) || []);
    if (u?.retrieval_framework) setFrameworkText(String(u.retrieval_framework));

    try {
      const q = await getRunFile(projectId, runId, "queries.json");
      if (q) {
        const obj = {
          pubmed: String(q.pubmed || ""),
          pubmed_full: String(q.pubmed_full || ""),
          semantic_scholar: String(q.semantic_scholar || ""),
          openalex: String(q.openalex || "")
        };
        setQueriesObj(obj);
        setPubmedQueryText(obj.pubmed_full || obj.pubmed);
      }
    } catch {}

    await loadResults();
  }

  useEffect(() => {
    loadInitial().catch((e) => setError(String(e)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, runId]);

  useEffect(() => {
    setRawData(null);
    getRunFile(projectId, runId, rawSelected).then(setRawData).catch(() => setRawData(null));
  }, [projectId, runId, rawSelected]);

  async function onParseStage1(candidate: string) {
    const maxAttempts = 3;
    if (parseStage1Attempts >= maxAttempts) {
      setParseStage1Locked(true);
      setTextValidateMessages((prev) => [
        ...prev,
        { role: "system", content: "Parse stage1: Too many attempts (3/3). Service refused." }
      ]);
      return;
    }

    setBusy("parse");
    setError(null);
    try {
      const res = await parseStage1(projectId, runId, candidate);
      const d = res.data as ParseResult;

      setParseResult(d);
      setParseStage1Attempts((n) => n + 1);
      setParseCurrentDescription(candidate);

      const stage1Failed = !d.is_research_description || d.plausibility_level === "A_impossible";
      setTextValidateMessages((prev) => [
        ...prev,
        {
          role: "system",
          content: stage1Failed
            ? "Parse stage1 failed. Please revise your research description."
            : d.is_clear_for_search
              ? "Parse passed: clear for search. You can build the retrieval framework."
              : "Parse passed: plausible but unclear. Please answer the questions."
        }
      ]);

      if (stage1Failed && parseStage1Attempts + 1 >= maxAttempts) {
        setParseStage1Locked(true);
        setTextValidateMessages((prev) => [
          ...prev,
          { role: "system", content: "Parse stage1: Too many failed attempts (3/3). Service refused." }
        ]);
      }
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(null);
    }
  }

  async function onParseStage2Submit(additionalInfo: string) {
    const maxAttempts = 3;
    if (parseStage2Attempts >= maxAttempts) {
      setParseStage2Locked(true);
      setTextValidateMessages((prev) => [
        ...prev,
        { role: "system", content: "Parse stage2: Too many attempts (3/3). Service refused." }
      ]);
      return;
    }

    setBusy("parse");
    setError(null);
    try {
      const res = await parseStage2(projectId, runId, parseCurrentDescription, additionalInfo);
      const d = res.data as ParseResult;

      setParseResult(d);
      setParseStage2Attempts((n) => n + 1);

      const merged = `${parseCurrentDescription}\n\nAdditional info:\n${additionalInfo}`.trim();
      setParseCurrentDescription(merged);
      setParseAdditionalInfo("");

      setTextValidateMessages((prev) => [
        ...prev,
        { role: "user", content: additionalInfo },
        {
          role: "system",
          content:
            d.plausibility_level === "A_impossible"
              ? "Parse: impossible research description."
              : d.is_clear_for_search
                ? "Parse converged: clear for search. You can build the retrieval framework."
                : "Parse: still unclear. Please provide more details."
        }
      ]);

      if (d.plausibility_level === "A_impossible" || !d.is_research_description) {
        setParseStage2Locked(true);
        setTextValidateMessages((prev) => [
          ...prev,
          { role: "system", content: "Parse: Service refused due to impossible/non-research input." }
        ]);
        return;
      }

      if (!d.is_clear_for_search && parseStage2Attempts + 1 >= maxAttempts) {
        setParseStage2Locked(true);
        setTextValidateMessages((prev) => [
          ...prev,
          { role: "system", content: "Parse stage2: Too many attempts (3/3). Service refused." }
        ]);
      }
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(null);
    }
  }

  async function onBuildFramework() {
    setBusy("buildFramework");
    setError(null);
    try {
      const input = parseCurrentDescription.trim();
      const res = await parseRun(projectId, runId, input);
      const d = res.data;
      setQuestions([]);
      setFrameworkText(String(d.retrieval_framework || ""));
      await refreshFiles();
      setRawSelected("retrieval_framework.json");
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(null);
    }
  }

  async function onParse() {
    setError(null);
    setTextValidateMode(true);

    const maxAttempts = 3;
    const source = textValidateMode ? textValidateDraft : researchDescription;
    const input = source.trim();

    setTextValidateLatest(input);
    setTextValidateDraft(input);

    const nextAttempts = textValidateAttempts + 1;
    setTextValidateAttempts(nextAttempts);
    setTextValidateReason(null);
    setTextValidateMessages((prev) => [...prev, { role: "user", content: input }]);

    // Starting a new candidate invalidates any previously generated downstream artifacts.
    setQuestions([]);
    setFrameworkText("");
    setPubmedQueryText("");
    setQueriesObj(null);
    setPubmed(null);
    setS2(null);
    setOa(null);
    setAgg(null);
    setParseResult(null);
    setParseAdditionalInfo("");
    setParseCurrentDescription(input);
    setParseStage2Attempts(0);
    setParseStage2Locked(false);
    setParseStage1Locked(false);

    // Unified text validate (base rules + word quality), server-side, no LLM.
    setBusy("textValidate");
    try {
      const res = await textValidate(input);
      const d = res.data as { ok: boolean; reason: string | null };
      if (!d.ok) {
        const reason = d.reason || "Invalid input.";
        setTextValidateReason(reason);
        setTextValidateMessages((prev) => [
          ...prev,
          { role: "system", content: `text validation failed: ${reason}` }
        ]);
        if (nextAttempts >= maxAttempts) {
          setTextValidateLocked(true);
          setTextValidateMessages((prev) => [
            ...prev,
            { role: "system", content: "Too many invalid attempts. Input has been disabled." }
          ]);
        }
        return;
      }
    } catch (e) {
      setError(String(e));
      setTextValidateReason("Text validate service unavailable.");
      setTextValidateMessages((prev) => [
        ...prev,
        { role: "system", content: "text validation failed: validation service unavailable." }
      ]);
      return;
    } finally {
      setBusy(null);
    }

    setTextValidateLocked(false);
    setResearchDescription(input);
    setTextValidateMessages((prev) => [...prev, { role: "system", content: "text validation passed." }]);

    await onParseStage1(input);
  }

  async function onQueryBuild() {
    setBusy("queryBuild");
    setError(null);
    try {
      const fw = frameworkText.trim();
      if (!fw) throw new Error("Retrieval framework is empty. Click 'Build Retrieval Framework' first.");
      await updateRetrievalFramework(projectId, runId, fw);
      const res = await runQueryBuild(projectId, runId);
      const obj = {
        pubmed: String(res.data?.pubmed || ""),
        pubmed_full: String(res.data?.pubmed_full || ""),
        semantic_scholar: String(res.data?.semantic_scholar || ""),
        openalex: String(res.data?.openalex || "")
      };
      setQueriesObj(obj);
      setPubmedQueryText(obj.pubmed_full || obj.pubmed);
      await refreshFiles();
      setRawSelected("queries.json");
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(null);
    }
  }

  async function onQuery() {
    setBusy("query");
    setError(null);
    try {
      const finalPubmed = extractFinalPubMedQuery(pubmedQueryText);
      if (!finalPubmed.trim()) throw new Error("PubMed query is empty. Click 'Query build' or edit it first.");

      const current = queriesObj || { pubmed: "", pubmed_full: "", semantic_scholar: "", openalex: "" };
      const next = { ...current, pubmed: finalPubmed, pubmed_full: pubmedQueryText };
      await updateQueries(projectId, runId, next);
      setQueriesObj(next);

      await runQuery(projectId, runId);
      await refreshFiles();
      await loadResults();
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(null);
    }
  }

  async function onLoadAuthorship() {
    setBusy("ingest");
    setError(null);
    try {
      const stats = await getAuthorshipStats(projectId, runId);
      if (stats) {
        setIngestStats(stats);
      } else {
        setError("No authorship data found. Please run ingestion first.");
      }
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(null);
    }
  }

  async function onIngest() {
    setBusy("ingest");
    setError(null);
    try {
      const stats = await runIngest(projectId, runId, false);
      setIngestStats(stats);
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(null);
    }
  }

  function renderResults() {
    const items =
      activeResultTab === "PubMed"
        ? pubmed
        : activeResultTab === "Semantic Scholar"
          ? s2
          : activeResultTab === "OpenAlex"
            ? oa
            : agg;

    if (!items) return <div className="muted">No results yet.</div>;
    if (items.length === 0) return <div className="muted">No items.</div>;

    if (activeResultTab === "Aggregated") {
      return (
        <div style={{ overflow: "auto", maxHeight: 520 }}>
          <table>
            <thead>
              <tr>
                <th style={{ width: "50%" }}>Title</th>
                <th style={{ width: "10%" }}>Year</th>
                <th style={{ width: "20%" }}>Venue</th>
                <th style={{ width: "20%" }}>DOI</th>
              </tr>
            </thead>
            <tbody>
              {(items as AggregatedItem[]).map((it, idx) => (
                <tr key={it.id || it.doi || String(idx)}>
                  <td>
                    <div className="title">{it.title || ""}</div>
                    <div className="sub muted">
                      {(it.authors || []).slice(0, 6).join(", ")}
                      {(it.authors || []).length > 6 ? "…" : ""}
                    </div>
                    {it.abstract ? (
                      <div className="sub">
                        <details>
                          <summary>Abstract</summary>
                          <div style={{ whiteSpace: "pre-wrap", marginTop: 8 }}>{it.abstract}</div>
                        </details>
                      </div>
                    ) : null}
                    <div className="sub muted">sources: {(it.sources || []).join(", ")}</div>
                  </td>
                  <td>{it.year ?? ""}</td>
                  <td>{it.venue ?? ""}</td>
                  <td>
                    {it.doi ? (
                      <a
                        href={`https://doi.org/${encodeURIComponent(it.doi)}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {it.doi}
                      </a>
                    ) : (
                      ""
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }

    return (
      <div style={{ overflow: "auto", maxHeight: 520 }}>
        <table>
          <thead>
            <tr>
              <th style={{ width: "50%" }}>Title</th>
              <th style={{ width: "10%" }}>Year</th>
              <th style={{ width: "20%" }}>Venue</th>
              <th style={{ width: "20%" }}>DOI</th>
            </tr>
          </thead>
          <tbody>
            {(items as Paper[]).map((p, idx) => (
              <tr key={`${p.source}-${p.doi || p.pmid || idx}`}>
                <td>
                  {p.url ? (
                    <a className="title" href={p.url} target="_blank" rel="noreferrer">
                      {p.title}
                    </a>
                  ) : (
                    <div className="title">{p.title}</div>
                  )}
                  <div className="sub muted">
                    {(p.authors || []).slice(0, 6).join(", ")}
                    {(p.authors || []).length > 6 ? "…" : ""}
                  </div>
                  {p.abstract ? (
                    <div className="sub">
                      <details>
                        <summary>Abstract</summary>
                        <div style={{ whiteSpace: "pre-wrap", marginTop: 8 }}>{p.abstract}</div>
                      </details>
                    </div>
                  ) : null}
                  <div className="sub muted">source: {p.source}</div>
                </td>
                <td>{p.year ?? ""}</td>
                <td>{p.venue ?? ""}</td>
                <td>
                  {p.doi ? (
                    <a
                      href={`https://doi.org/${encodeURIComponent(p.doi)}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {p.doi}
                    </a>
                  ) : (
                    ""
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  // Determine pipeline progress
  const hasFramework = !!frameworkText;
  const hasQuery = !!pubmedQueryText;
  const hasResults = (pubmed?.length || 0) > 0 || (s2?.length || 0) > 0 || (oa?.length || 0) > 0;
  const hasAuthorship = !!ingestStats;

  const pipelineSteps = [
    { label: "Parse", status: hasFramework ? ("completed" as const) : ("pending" as const) },
    { label: "Framework", status: hasFramework ? ("completed" as const) : ("pending" as const) },
    { label: "Query", status: hasQuery ? ("completed" as const) : hasFramework ? ("in_progress" as const) : ("pending" as const) },
    { label: "Results", status: hasResults ? ("completed" as const) : hasQuery ? ("in_progress" as const) : ("pending" as const) },
    { label: "Map", status: hasAuthorship ? ("completed" as const) : hasResults ? ("in_progress" as const) : ("pending" as const) }
  ];

  return (
    <div className="stack">
      {/* Header */}
      <div className="row" style={{ justifyContent: "space-between", marginBottom: "8px" }}>
        <div>
          <h1 style={{ margin: 0, marginBottom: "4px" }} className="text-gradient">
            Run {runId}
          </h1>
          <div className="muted">Scholar paper retrieval and analysis pipeline</div>
        </div>
        <Link href={`/projects/${projectId}`}>
          <button className="secondary">← Back to Project</button>
        </Link>
      </div>

      {/* Progress Steps */}
      <ProgressSteps steps={pipelineSteps} />

      {error ? (
        <div
          style={{
            padding: "12px 16px",
            background: "#fee2e2",
            border: "1px solid #fecaca",
            borderRadius: "12px",
            color: "#dc2626",
            fontSize: "14px"
          }}
        >
          ⚠️ {error}
        </div>
      ) : null}

      <div className="card stack accent-blue">
        <div className="row" style={{ justifyContent: "space-between", marginBottom: "8px" }}>
          <div>
            <h2 style={{ margin: 0 }}>🔍 Research Description</h2>
            <div className="muted">Define your research question in natural language</div>
          </div>
          {(textValidateMode ? parseCurrentDescription || textValidateLatest : researchDescription) && (
            <span className="badge">
              {(textValidateMode ? parseCurrentDescription || textValidateLatest : researchDescription).length} chars
            </span>
          )}
        </div>
        {!textValidateMode ? (
          <>
            <div style={{ position: "relative" }}>
              {researchClientIssues.length ? (
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
                  {researchClientIssues.join(" · ")}
                </div>
              ) : null}
              <textarea
                rows={5}
                value={researchDescription}
                onChange={(e) => setResearchDescription(e.target.value)}
                placeholder="Example: I am working on invasive speech brain-computer interface decoding using ECoG and sEEG..."
                style={{ fontSize: "15px" }}
                maxLength={300}
              />
            </div>
            <div className="row" style={{ justifyContent: "center" }}>
              <button
                onClick={() => {
                  setTextValidateDraft(researchDescription);
                  onParse();
                }}
                disabled={busy !== null || !researchDescription.trim() || researchClientIssues.length > 0}
                className="gradient-blue"
              >
                {busy === "textValidate" ? "🔄 Checking…" : busy === "parse" ? "🔄 Parsing…" : "parse"}
              </button>
            </div>
          </>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div className="stack" style={{ gap: 10 }}>
              <div className="row" style={{ justifyContent: "space-between" }}>
                <div className="muted">Dialogue</div>
                <div className="muted" style={{ fontSize: 12 }}>
                  Parse-1: {parseStage1Attempts}/3 · Parse-2: {parseStage2Attempts}/3
                </div>
              </div>

              {textValidateReason ? (
                <div
                  style={{
                    padding: "10px 12px",
                    background: "#fee2e2",
                    border: "1px solid #fecaca",
                    borderRadius: "10px",
                    color: "#dc2626",
                    fontSize: "13px"
                  }}
                >
                  ⚠️ {textValidateReason}
                </div>
              ) : null}

              <div
                style={{
                  border: "1px solid rgba(0,0,0,0.08)",
                  borderRadius: 12,
                  padding: 12,
                  background: "rgba(255,255,255,0.6)",
                  maxHeight: 220,
                  overflow: "auto"
                }}
              >
                {textValidateMessages.length ? (
                  <div className="stack" style={{ gap: 8 }}>
                    {textValidateMessages.map((m, idx) => (
                      <div
                        key={idx}
                        style={{
                          padding: "10px 12px",
                          borderRadius: 12,
                          whiteSpace: "pre-wrap",
                          background: m.role === "user" ? "#e0f2fe" : "#f1f5f9",
                          border: "1px solid rgba(0,0,0,0.06)"
                        }}
                      >
                        <div className="muted" style={{ fontSize: 11, marginBottom: 4 }}>
                          {m.role === "user" ? "You" : "System"}
                        </div>
                        <div style={{ fontSize: 13 }}>{m.content || "(empty)"}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="muted">No messages yet.</div>
                )}
              </div>

              {parseResult ? (
                <div
                  style={{
                    border: "1px solid rgba(0,0,0,0.08)",
                    borderRadius: 12,
                    padding: 12,
                    background: "rgba(255,255,255,0.7)"
                  }}
                >
                  <div className="muted" style={{ fontSize: 12, marginBottom: 6 }}>
                    Parse result
                  </div>
                  <div style={{ fontSize: 13, whiteSpace: "pre-wrap" }}>
                    {parseResult.normalized_understanding}
                  </div>
                  {parseResult.plausibility_level === "A_impossible" ? (
                    <div className="muted" style={{ fontSize: 12, marginTop: 8, whiteSpace: "pre-wrap" }}>
                      {parseResult.guidance_to_user}
                    </div>
                  ) : !parseResult.is_clear_for_search ? (
                    <div className="stack" style={{ gap: 8, marginTop: 10 }}>
                      {parseResult.uncertainties?.length ? (
                        <div>
                          <div className="muted" style={{ fontSize: 12, marginBottom: 4 }}>
                            Uncertainties
                          </div>
                          <ul style={{ margin: 0, paddingLeft: 18 }}>
                            {parseResult.uncertainties.map((u) => (
                              <li key={u} className="muted" style={{ fontSize: 12 }}>
                                {u}
                              </li>
                            ))}
                          </ul>
                        </div>
                      ) : null}
                      {parseResult.suggested_questions?.length ? (
                        <div>
                          <div className="muted" style={{ fontSize: 12, marginBottom: 4 }}>
                            Questions
                          </div>
                          <ul style={{ margin: 0, paddingLeft: 18 }}>
                            {parseResult.suggested_questions.map((q, idx) => (
                              <li key={`${q.field}-${idx}`} className="muted" style={{ fontSize: 12 }}>
                                {q.question}
                              </li>
                            ))}
                          </ul>
                        </div>
                      ) : null}
                      {parseResult.guidance_to_user ? (
                        <div className="muted" style={{ fontSize: 12, whiteSpace: "pre-wrap" }}>
                          {parseResult.guidance_to_user}
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              ) : null}

              <div className="stack" style={{ gap: 8 }}>
                {parseResult?.plausibility_level === "B_plausible" && parseResult.is_clear_for_search ? (
                  <div className="row" style={{ justifyContent: "center" }}>
                    <button onClick={onBuildFramework} disabled={busy !== null} className="gradient-green">
                      {busy === "buildFramework" ? "🔄 Building…" : "Build Retrieval Framework"}
                    </button>
                  </div>
                ) : parseResult?.plausibility_level === "B_plausible" &&
                  parseResult.is_research_description &&
                  !parseResult.is_clear_for_search ? (
                  <>
                    <div style={{ position: "relative" }}>
                      {parseAdditionalClientIssues.length ? (
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
                          {parseAdditionalClientIssues.join(" · ")}
                        </div>
                      ) : null}
                      <textarea
                        rows={4}
                        value={parseAdditionalInfo}
                        onChange={(e) => setParseAdditionalInfo(e.target.value)}
                        disabled={parseStage2Locked || busy !== null}
                        placeholder={parseStage2Locked ? "Parse stage2 locked after 3 attempts." : "Add details to answer the questions..."}
                        style={{ fontSize: "14px" }}
                        maxLength={300}
                      />
                    </div>
                    <div className="row" style={{ justifyContent: "center" }}>
                      <button
                        onClick={() => onParseStage2Submit(parseAdditionalInfo.trim())}
                        disabled={
                          parseStage2Locked ||
                          busy !== null ||
                          !parseAdditionalInfo.trim() ||
                          parseAdditionalClientIssues.length > 0
                        }
                        className="gradient-blue"
                      >
                        {busy === "parse" ? "🔄 Parsing…" : "submit"}
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <div style={{ position: "relative" }}>
                      {textValidateDraftClientIssues.length ? (
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
                          {textValidateDraftClientIssues.join(" · ")}
                        </div>
                      ) : null}
                      <textarea
                        rows={4}
                        value={textValidateDraft}
                        onChange={(e) => setTextValidateDraft(e.target.value)}
                        disabled={textValidateLocked || parseStage1Locked || busy !== null}
                        placeholder={
                          textValidateLocked
                            ? "Input disabled after 3 invalid attempts."
                            : parseStage1Locked
                              ? "Parse stage1 locked after 3 failed attempts."
                              : "Revise and click parse again..."
                        }
                        style={{ fontSize: "14px" }}
                        maxLength={300}
                      />
                    </div>
                    <div className="row" style={{ justifyContent: "center" }}>
                      <button
                        onClick={onParse}
                        disabled={
                          textValidateLocked ||
                          parseStage1Locked ||
                          busy !== null ||
                          !textValidateDraft.trim() ||
                          textValidateDraftClientIssues.length > 0
                        }
                        className="gradient-blue"
                      >
                        {busy === "textValidate" ? "🔄 Checking…" : busy === "parse" ? "🔄 Parsing…" : "parse"}
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="stack" style={{ gap: 10 }}>
              <div className="muted">Latest research description</div>
              <textarea
                readOnly
                rows={12}
                value={parseCurrentDescription || textValidateLatest}
                style={{ fontSize: "14px", whiteSpace: "pre-wrap", opacity: 0.95 }}
              />
            </div>
          </div>
        )}
        {questions.length ? (
          <div className="stack">
            <div className="muted">Clarification questions (if any):</div>
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              {questions.map((q) => (
                <li key={q} className="muted">
                  {q}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>

      <div className="card stack accent-green">
        <div className="row" style={{ justifyContent: "space-between", marginBottom: "8px" }}>
          <div>
            <h2 style={{ margin: 0 }}>🧠 Retrieval Framework</h2>
            <div className="muted">AI-generated search strategy (editable)</div>
          </div>
          {frameworkText && (
            <span className="badge success">✓ Generated</span>
          )}
        </div>
        <textarea
          rows={14}
          value={frameworkText}
          onChange={(e) => setFrameworkText(e.target.value)}
          spellCheck={false}
          placeholder="Click 'Build Retrieval Framework' above to generate a retrieval framework automatically..."
          style={{ fontFamily: "inherit", fontSize: "14px", lineHeight: "1.6" }}
        />
        <div className="row" style={{ justifyContent: "center" }}>
          <button onClick={onQueryBuild} disabled={busy !== null} className="gradient-green">
            {busy === "queryBuild" ? "🔄 Building…" : "⚙️ Build Database Queries"}
          </button>
        </div>
      </div>

      <div className="card stack accent-purple">
        <div className="row" style={{ justifyContent: "space-between", marginBottom: "8px" }}>
          <div>
            <h2 style={{ margin: 0 }}>⚙️ Database Queries</h2>
            <div className="muted">Executable search queries for each database</div>
          </div>
          {pubmedQueryText && (
            <span className="badge" style={{ background: "#f3e8ff", color: "#7c3aed" }}>
              ✓ Ready
            </span>
          )}
        </div>
        <textarea
          rows={8}
          value={pubmedQueryText}
          onChange={(e) => {
            const v = e.target.value;
            setPubmedQueryText(v);
            setQueriesObj((prev) => ({
              pubmed: extractFinalPubMedQuery(v),
              pubmed_full: v,
              semantic_scholar: prev?.semantic_scholar || "",
              openalex: prev?.openalex || ""
            }));
          }}
          spellCheck={false}
          placeholder="Click 'Build Database Queries' above to generate optimized search queries..."
        />
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <div className="muted" style={{ fontSize: "12px", textAlign: "center" }}>
            💡 The final PubMed query is extracted from "Final Combined PubMed Query" section
          </div>
          <div className="row" style={{ justifyContent: "center" }}>
            <button onClick={onQuery} disabled={busy !== null}>
              {busy === "query" ? "🔄 Executing…" : "🚀 Execute Query"}
            </button>
          </div>
        </div>
      </div>

      <div className="card stack accent-orange">
        <div className="row" style={{ justifyContent: "space-between", marginBottom: "12px" }}>
          <div>
            <h2 style={{ margin: 0 }}>📊 Paper Results</h2>
            <div className="muted">Retrieved papers from academic databases</div>
          </div>
        </div>

        {/* Metric Cards */}
        {(pubmed || s2 || oa || agg) && (
          <div className="row" style={{ marginBottom: "16px" }}>
            <MetricCard
              icon="📄"
              label="PubMed"
              value={pubmed?.length ?? 0}
              color="blue"
            />
            <MetricCard
              icon="📚"
              label="Semantic Scholar"
              value={s2?.length ?? 0}
              color="green"
            />
            <MetricCard
              icon="🌐"
              label="OpenAlex"
              value={oa?.length ?? 0}
              color="purple"
            />
            <MetricCard
              icon="✨"
              label="Aggregated"
              value={agg?.length ?? 0}
              subtitle="Deduplicated by DOI"
              color="orange"
            />
          </div>
        )}

        {/* Tabs */}
        <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
          {resultTabs.map((t) => (
            <button
              key={t}
              className={activeResultTab === t ? "" : "secondary"}
              onClick={() => setActiveResultTab(t)}
              style={{
                background: activeResultTab === t ? undefined : "white",
                minWidth: "120px"
              }}
            >
              {t === "PubMed"
                ? "📄 PubMed"
                : t === "Semantic Scholar"
                  ? "📚 S2"
                  : t === "OpenAlex"
                    ? "🌐 OpenAlex"
                    : "✨ Aggregated"}
            </button>
          ))}
        </div>

        {renderResults()}
      </div>

      {/* Phase 2: Authorship */}
      <div className="card stack accent-red">
        <div className="row" style={{ justifyContent: "space-between", marginBottom: "12px" }}>
          <div>
            <h2 style={{ margin: 0 }}>👥 Authorship & Geographic Mapping</h2>
            <div className="muted">Extract author affiliations and visualize global distribution</div>
          </div>
          {ingestStats && (
            <span className="badge" style={{ background: "#d1fae5", color: "#059669" }}>
              ✓ Data Available
            </span>
          )}
        </div>

        <div className="row" style={{ justifyContent: "center", gap: 8 }}>
          <button className="secondary" onClick={onLoadAuthorship} disabled={busy !== null}>
            {busy === "ingest" ? "🔄 Loading..." : "📂 Load Existing Data"}
          </button>
          <button
            onClick={onIngest}
            disabled={busy !== null || !agg?.length}
            style={{ background: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)" }}
          >
            {busy === "ingest" ? "🔄 Ingesting..." : "⚡ Run Ingestion Pipeline"}
          </button>
        </div>

        {ingestStats && (
          <div style={{ marginTop: 20 }}>
            {/* Metric Cards */}
            <div className="row" style={{ marginBottom: "20px" }}>
              <MetricCard
                icon="📄"
                label="Papers"
                value={ingestStats.papers_parsed}
                subtitle="Analyzed"
                color="blue"
              />
              <MetricCard
                icon="👥"
                label="Authorships"
                value={ingestStats.authorships_created}
                subtitle={`~${Math.round(ingestStats.authorships_created / ingestStats.papers_parsed)} per paper`}
                color="purple"
              />
              <MetricCard
                icon="🌍"
                label="Affiliations"
                value={ingestStats.unique_affiliations}
                subtitle={`${Math.round((ingestStats.affiliations_with_country / ingestStats.unique_affiliations) * 100)}% geocoded`}
                color="green"
              />
              <MetricCard
                icon="⚡"
                label="LLM Calls"
                value={ingestStats.llm_calls_made}
                subtitle={`$${(ingestStats.llm_calls_made * 0.03).toFixed(2)} cost`}
                color="orange"
              />
            </div>

            {/* Detailed Stats */}
            <details style={{ marginTop: 16 }}>
              <summary style={{ fontWeight: 600, color: "#374151", cursor: "pointer" }}>
                📊 Detailed Statistics
              </summary>
              <div style={{ marginTop: 12, overflowX: "auto" }}>
                <table>
                  <tbody>
                    <tr>
                      <td style={{ fontWeight: 600 }}>Total PMIDs</td>
                      <td>{ingestStats.total_pmids}</td>
                      <td className="muted">Papers with PubMed IDs</td>
                    </tr>
                    <tr>
                      <td style={{ fontWeight: 600 }}>PMIDs Cached</td>
                      <td>{ingestStats.pmids_cached}</td>
                      <td className="muted">Already in database</td>
                    </tr>
                    <tr>
                      <td style={{ fontWeight: 600 }}>PMIDs Fetched</td>
                      <td>{ingestStats.pmids_fetched}</td>
                      <td className="muted">Downloaded from PubMed</td>
                    </tr>
                    <tr>
                      <td style={{ fontWeight: 600 }}>Affiliations with Country</td>
                      <td>
                        {ingestStats.affiliations_with_country} /{" "}
                        {ingestStats.unique_affiliations}
                      </td>
                      <td className="muted">
                        {Math.round((ingestStats.affiliations_with_country / ingestStats.unique_affiliations) * 100)}% success rate
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </details>

            {ingestStats.errors.length > 0 && (
              <div
                style={{
                  marginTop: 16,
                  padding: "12px 16px",
                  background: "#fee2e2",
                  border: "1px solid #fecaca",
                  borderRadius: "12px"
                }}
              >
                <div style={{ color: "#dc2626", fontWeight: "bold", marginBottom: "8px" }}>
                  ⚠️ Errors Encountered:
                </div>
                <ul style={{ margin: 0, paddingLeft: 20, color: "#dc2626" }}>
                  {ingestStats.errors.map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Map Button */}
            <div
              style={{
                marginTop: 20,
                padding: "16px",
                background: "linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)",
                borderRadius: "12px",
                border: "2px dashed #2563eb"
              }}
            >
              <div style={{ display: "flex", flexDirection: "column", gap: "16px", alignItems: "center" }}>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontWeight: 600, color: "#1d4ed8", marginBottom: "4px" }}>
                    🗺️ Interactive Scholar Map Ready
                  </div>
                  <div className="muted" style={{ fontSize: "12px" }}>
                    Explore geographic distribution with drill-down navigation
                  </div>
                </div>
                <button
                  onClick={() => setShowMap(true)}
                  style={{
                    background: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
                    fontSize: "15px",
                    padding: "14px 24px"
                  }}
                >
                  🗺️ Open Interactive Map
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <details className="card">
        <summary>Raw Run Files (debug)</summary>
        <div className="stack" style={{ marginTop: 12 }}>
          <div className="row" style={{ justifyContent: "space-between" }}>
            <div className="muted">Files</div>
            <button className="secondary" onClick={refreshFiles}>
              Refresh
            </button>
          </div>
          <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
            {files.map((f) => (
              <button
                key={f}
                className={rawSelected === f ? "" : "secondary"}
                onClick={() => setRawSelected(f)}
              >
                {f}
              </button>
            ))}
          </div>
          {rawData ? <pre>{JSON.stringify(rawData, null, 2)}</pre> : <div className="muted">Loading…</div>}
        </div>
      </details>

      {showMap && <MapModal projectId={projectId} runId={runId} onClose={() => setShowMap(false)} />}
    </div>
  );
}
