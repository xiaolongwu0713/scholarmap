"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  getRunFile,
  listRunFiles,
  parseRun,
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

  const [busy, setBusy] = useState<null | "parse" | "queryBuild" | "query" | "ingest">(null);
  const [error, setError] = useState<string | null>(null);
  
  // Phase 2 state
  const [ingestStats, setIngestStats] = useState<IngestStats | null>(null);
  const [showMap, setShowMap] = useState(false);

  const [researchDescription, setResearchDescription] = useState("");
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

  async function onParse() {
    setBusy("parse");
    setError(null);
    try {
      const res = await parseRun(projectId, runId, researchDescription.trim());
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

  async function onQueryBuild() {
    setBusy("queryBuild");
    setError(null);
    try {
      const fw = frameworkText.trim();
      if (!fw) throw new Error("Retrieval framework is empty. Click Parse first.");
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
          {researchDescription && (
            <span className="badge">{researchDescription.length} chars</span>
          )}
        </div>
        <textarea
          rows={5}
          value={researchDescription}
          onChange={(e) => setResearchDescription(e.target.value)}
          placeholder="Example: I am working on invasive speech brain-computer interface decoding using ECoG and sEEG..."
          style={{ fontSize: "15px" }}
        />
        <div className="row" style={{ justifyContent: "center" }}>
          <button
            onClick={onParse}
            disabled={busy !== null || !researchDescription.trim()}
            className="gradient-blue"
          >
            {busy === "parse" ? "🔄 Parsing…" : "✨ Parse & Generate Framework"}
          </button>
        </div>
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
          placeholder="Click 'Parse' above to generate a retrieval framework automatically..."
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
