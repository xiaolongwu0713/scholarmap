export type Project = { project_id: string; name: string; created_at: string };
export type Run = { run_id: string; created_at: string; description: string };

const baseUrl = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

async function readErrorDetail(res: Response): Promise<string> {
  const contentType = res.headers.get("content-type") || "";
  try {
    if (contentType.includes("application/json")) {
      const json = await res.json();
      if (json?.detail) return String(json.detail);
      return JSON.stringify(json);
    }
    const text = await res.text();
    return text || res.statusText;
  } catch {
    return res.statusText;
  }
}

async function throwIfNotOk(res: Response, label: string): Promise<void> {
  if (res.ok) return;
  const detail = await readErrorDetail(res);
  throw new Error(`${label} failed: ${res.status} ${detail}`);
}

export async function listProjects(): Promise<Project[]> {
  const res = await fetch(`${baseUrl}/api/projects`, { cache: "no-store" });
  await throwIfNotOk(res, "listProjects");
  const json = await res.json();
  return json.projects as Project[];
}

export async function createProject(name: string): Promise<Project> {
  const res = await fetch(`${baseUrl}/api/projects`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name })
  });
  await throwIfNotOk(res, "createProject");
  const json = await res.json();
  return json.project as Project;
}

export async function getProject(projectId: string): Promise<{ project: Project; runs: Run[] }> {
  const res = await fetch(`${baseUrl}/api/projects/${projectId}`, { cache: "no-store" });
  await throwIfNotOk(res, "getProject");
  return (await res.json()) as { project: Project; runs: Run[] };
}

export async function createRun(projectId: string, research_description: string): Promise<Run> {
  const res = await fetch(`${baseUrl}/api/projects/${projectId}/runs`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ research_description })
  });
  await throwIfNotOk(res, "createRun");
  const json = await res.json();
  return json.run as Run;
}

export async function getRunFile(projectId: string, runId: string, filename: string): Promise<any> {
  const res = await fetch(`${baseUrl}/api/projects/${projectId}/runs/${runId}/files/${filename}`, {
    cache: "no-store"
  });
  await throwIfNotOk(res, "getRunFile");
  const json = await res.json();
  return json.data;
}

export async function listRunFiles(projectId: string, runId: string): Promise<string[]> {
  const res = await fetch(`${baseUrl}/api/projects/${projectId}/runs/${runId}/files`, { cache: "no-store" });
  await throwIfNotOk(res, "listRunFiles");
  const json = await res.json();
  return json.files as string[];
}

export async function runQuery(projectId: string, runId: string): Promise<any> {
  const res = await fetch(`${baseUrl}/api/projects/${projectId}/runs/${runId}/query`, {
    method: "POST",
    headers: { "content-type": "application/json" }
  });
  await throwIfNotOk(res, "runQuery");
  return await res.json();
}

export async function parseRun(projectId: string, runId: string, research_description: string): Promise<any> {
  const res = await fetch(`${baseUrl}/api/projects/${projectId}/runs/${runId}/parse`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ research_description })
  });
  await throwIfNotOk(res, "parseRun");
  return await res.json();
}

export async function updateSlots(projectId: string, runId: string, slots_normalized: any): Promise<void> {
  const res = await fetch(`${baseUrl}/api/projects/${projectId}/runs/${runId}/slots`, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ slots_normalized })
  });
  await throwIfNotOk(res, "updateSlots");
}

export async function runSynonyms(projectId: string, runId: string): Promise<any> {
  const res = await fetch(`${baseUrl}/api/projects/${projectId}/runs/${runId}/synonyms`, {
    method: "POST",
    headers: { "content-type": "application/json" }
  });
  await throwIfNotOk(res, "runSynonyms");
  return await res.json();
}

export async function updateKeywords(
  projectId: string,
  runId: string,
  canonical_terms: string[],
  synonyms: Record<string, string[]>
): Promise<void> {
  const res = await fetch(`${baseUrl}/api/projects/${projectId}/runs/${runId}/keywords`, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ canonical_terms, synonyms })
  });
  await throwIfNotOk(res, "updateKeywords");
}

export async function runQueryBuild(projectId: string, runId: string): Promise<any> {
  const res = await fetch(`${baseUrl}/api/projects/${projectId}/runs/${runId}/query-build`, {
    method: "POST",
    headers: { "content-type": "application/json" }
  });
  await throwIfNotOk(res, "runQueryBuild");
  return await res.json();
}

export async function updateQueries(projectId: string, runId: string, queries: any): Promise<void> {
  const res = await fetch(`${baseUrl}/api/projects/${projectId}/runs/${runId}/queries`, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(queries)
  });
  await throwIfNotOk(res, "updateQueries");
}

export async function updateRetrievalFramework(
  projectId: string,
  runId: string,
  retrieval_framework: string
): Promise<void> {
  const res = await fetch(`${baseUrl}/api/projects/${projectId}/runs/${runId}/retrieval-framework`, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ retrieval_framework })
  });
  await throwIfNotOk(res, "updateRetrievalFramework");
}

// ============================================================
// Phase 2: Authorship & Map APIs
// ============================================================

export type IngestStats = {
  run_id: string;
  total_pmids: number;
  pmids_cached: number;
  pmids_fetched: number;
  papers_parsed: number;
  authorships_created: number;
  unique_affiliations: number;
  affiliations_with_country: number;
  llm_calls_made: number;
  errors: string[];
};

export type WorldMapData = {
  country: string;
  scholar_count: number;
  paper_count: number;
  institution_count: number;
  latitude: number | null;
  longitude: number | null;
};

export type CountryMapData = {
  country: string;
  city: string;
  scholar_count: number;
  institution_count: number;
  latitude: number | null;
  longitude: number | null;
};

export type CityMapData = {
  country: string;
  city: string;
  institution: string;
  scholar_count: number;
};

export type Scholar = {
  scholar_name: string;
  paper_count: number;
  papers: Array<{
    pmid: string;
    title: string;
    year: number | null;
    doi: string | null;
  }>;
};

export async function getAuthorshipStats(
  projectId: string,
  runId: string
): Promise<IngestStats | null> {
  const res = await fetch(`${baseUrl}/api/projects/${projectId}/runs/${runId}/authorship/stats`, {
    cache: "no-store"
  });
  await throwIfNotOk(res, "getAuthorshipStats");
  const json = await res.json();
  return json.stats as IngestStats | null;
}

export async function runIngest(
  projectId: string,
  runId: string,
  force_refresh = false
): Promise<IngestStats> {
  const res = await fetch(`${baseUrl}/api/projects/${projectId}/runs/${runId}/ingest`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ force_refresh })
  });
  await throwIfNotOk(res, "runIngest");
  const json = await res.json();
  return json.stats as IngestStats;
}

export async function getWorldMap(
  projectId: string,
  runId: string,
  min_confidence = "low"
): Promise<WorldMapData[]> {
  const res = await fetch(
    `${baseUrl}/api/projects/${projectId}/runs/${runId}/map/world?min_confidence=${min_confidence}`,
    { cache: "no-store" }
  );
  await throwIfNotOk(res, "getWorldMap");
  const json = await res.json();
  return json.data as WorldMapData[];
}

export async function getCountryMap(
  projectId: string,
  runId: string,
  country: string,
  min_confidence = "low"
): Promise<CountryMapData[]> {
  const res = await fetch(
    `${baseUrl}/api/projects/${projectId}/runs/${runId}/map/country/${encodeURIComponent(country)}?min_confidence=${min_confidence}`,
    { cache: "no-store" }
  );
  await throwIfNotOk(res, "getCountryMap");
  const json = await res.json();
  return json.data as CountryMapData[];
}

export async function getCityMap(
  projectId: string,
  runId: string,
  country: string,
  city: string,
  min_confidence = "low"
): Promise<CityMapData[]> {
  const res = await fetch(
    `${baseUrl}/api/projects/${projectId}/runs/${runId}/map/city/${encodeURIComponent(country)}/${encodeURIComponent(city)}?min_confidence=${min_confidence}`,
    { cache: "no-store" }
  );
  await throwIfNotOk(res, "getCityMap");
  const json = await res.json();
  return json.data as CityMapData[];
}

export async function getInstitutionScholars(
  projectId: string,
  runId: string,
  institution: string,
  country?: string,
  city?: string,
  min_confidence = "low",
  limit = 100,
  offset = 0
): Promise<{ scholars: Scholar[]; total_count: number; limit: number; offset: number }> {
  const params = new URLSearchParams({
    institution,
    min_confidence,
    limit: String(limit),
    offset: String(offset)
  });
  if (country) params.set("country", country);
  if (city) params.set("city", city);

  const res = await fetch(
    `${baseUrl}/api/projects/${projectId}/runs/${runId}/map/institution?${params}`,
    { cache: "no-store" }
  );
  await throwIfNotOk(res, "getInstitutionScholars");
  return await res.json();
}
