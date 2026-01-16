export type Project = { project_id: string; name: string; created_at: string };
export type Run = { run_id: string; created_at: string; description: string };

import { getAuthHeaders } from "./auth";

const baseUrl = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

/**
 * Get default headers for API requests.
 * Includes authentication token if available.
 */
function getDefaultHeaders(): Record<string, string> {
  return getAuthHeaders();
}

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

// ============================================================================
// Configuration API (Public - no auth required)
// ============================================================================

export interface FrontendConfig {
  text_validation_max_attempts: number;
  parse_stage1_max_attempts: number;
  parse_stage2_max_total_attempts: number;
  parse_stage2_max_consecutive_unhelpful: number;
  retrieval_framework_adjust_max_attempts: number;
  share_run_auth_check_enabled: boolean;
  simple_how_it_works: boolean;
}

/**
 * Get frontend configuration from backend.
 * This ensures frontend and backend always use the same limits.
 * No authentication required.
 */
export async function getFrontendConfig(): Promise<FrontendConfig> {
  const res = await fetch(`${baseUrl}/api/config`);
  await throwIfNotOk(res, "getFrontendConfig");
  return await res.json();
}

// ============================================================================
// Authentication APIs
// ============================================================================

export interface LoginResponse {
  access_token: string;
  token_type: string;
  user_id: string;
  email: string;
}

export interface PasswordRequirements {
  min_length: number;
  max_length: number;
  require_capital: boolean;
  require_digit: boolean;
  require_letter: boolean;
  require_special: boolean;
  special_chars: string;
}

export async function getPasswordRequirements(): Promise<PasswordRequirements> {
  const res = await fetch(`${baseUrl}/api/auth/password-requirements`, {
    headers: getDefaultHeaders(),
  });
  await throwIfNotOk(res, "getPasswordRequirements");
  return await res.json();
}

export async function sendVerificationCode(email: string): Promise<void> {
  const res = await fetch(`${baseUrl}/api/auth/send-verification-code`, {
    method: "POST",
    headers: getDefaultHeaders(),
    body: JSON.stringify({ email }),
  });
  await throwIfNotOk(res, "sendVerificationCode");
}

export async function register(
  email: string,
  verification_code: string,
  password: string,
  password_retype: string
): Promise<LoginResponse> {
  const res = await fetch(`${baseUrl}/api/auth/register`, {
    method: "POST",
    headers: getDefaultHeaders(),
    body: JSON.stringify({ email, verification_code, password, password_retype }),
  });
  await throwIfNotOk(res, "register");
  return await res.json();
}

export async function login(email: string, password: string): Promise<LoginResponse> {
  const res = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: getDefaultHeaders(),
    body: JSON.stringify({ email, password }),
  });
  await throwIfNotOk(res, "login");
  return await res.json();
}

// ============================================================================
// User Quota APIs
// ============================================================================

export type UserQuotaInfo = {
  tier: string;
  quotas: {
    max_projects: {
      limit: number;
      current: number;
      remaining: number;
      unlimited: boolean;
    };
    max_runs_per_project: {
      limit: number;
      current: number;
      remaining: number;
      unlimited: boolean;
    };
    max_papers_per_run: {
      limit: number;
      current: number;
      remaining: number;
      unlimited: boolean;
    };
    max_ingestion_per_day: {
      limit: number;
      current: number;
      remaining: number;
      unlimited: boolean;
    };
  };
};

export async function getUserQuota(): Promise<UserQuotaInfo> {
  const res = await fetch(`${baseUrl}/api/user/quota`, {
    cache: "no-store",
    headers: getDefaultHeaders(),
  });
  await throwIfNotOk(res, "getUserQuota");
  return await res.json();
}

// ============================================================================
// Project APIs (require authentication)
// ============================================================================

export async function listProjects(): Promise<Project[]> {
  const res = await fetch(`${baseUrl}/api/projects`, {
    cache: "no-store",
    headers: getDefaultHeaders(),
  });
  await throwIfNotOk(res, "listProjects");
  const json = await res.json();
  return json.projects as Project[];
}

export async function createProject(name: string): Promise<Project> {
  const res = await fetch(`${baseUrl}/api/projects`, {
    method: "POST",
    headers: getDefaultHeaders(),
    body: JSON.stringify({ name })
  });
  await throwIfNotOk(res, "createProject");
  const json = await res.json();
  return json.project as Project;
}

export async function getProject(projectId: string): Promise<{ project: Project; runs: Run[] }> {
  const res = await fetch(`${baseUrl}/api/projects/${projectId}`, {
    cache: "no-store",
    headers: getDefaultHeaders(),
  });
  await throwIfNotOk(res, "getProject");
  return (await res.json()) as { project: Project; runs: Run[] };
}

export async function createRun(projectId: string, research_description: string): Promise<Run> {
  const res = await fetch(`${baseUrl}/api/projects/${projectId}/runs`, {
    method: "POST",
    headers: getDefaultHeaders(),
    body: JSON.stringify({ research_description })
  });
  await throwIfNotOk(res, "createRun");
  const json = await res.json();
  return json.run as Run;
}

export async function deleteRun(projectId: string, runId: string): Promise<void> {
  const res = await fetch(`${baseUrl}/api/projects/${projectId}/runs/${runId}`, {
    method: "DELETE",
    headers: getDefaultHeaders(),
  });
  await throwIfNotOk(res, "deleteRun");
}

export async function getRunFile(projectId: string, runId: string, filename: string): Promise<any> {
  const res = await fetch(`${baseUrl}/api/projects/${projectId}/runs/${runId}/files/${filename}`, {
    cache: "no-store",
    headers: getDefaultHeaders(),
  });
  await throwIfNotOk(res, "getRunFile");
  const json = await res.json();
  return json.data;
}

export async function listRunFiles(projectId: string, runId: string): Promise<string[]> {
  const res = await fetch(`${baseUrl}/api/projects/${projectId}/runs/${runId}/files`, { cache: "no-store", headers: getDefaultHeaders() });
  await throwIfNotOk(res, "listRunFiles");
  const json = await res.json();
  return json.files as string[];
}

export async function runQuery(projectId: string, runId: string): Promise<any> {
  const res = await fetch(`${baseUrl}/api/projects/${projectId}/runs/${runId}/query`, {
    method: "POST",
    headers: getDefaultHeaders()
  });
  await throwIfNotOk(res, "runQuery");
  return await res.json();
}

export async function parseRun(projectId: string, runId: string, research_description: string, skipValidation: boolean = false): Promise<any> {
  const res = await fetch(`${baseUrl}/api/projects/${projectId}/runs/${runId}/parse`, {
    method: "POST",
    headers: getDefaultHeaders(),
    body: JSON.stringify({ research_description, skip_validation: skipValidation })
  });
  await throwIfNotOk(res, "parseRun");
  return await res.json();
}

export async function qc1Analyze(text: string): Promise<any> {
  const res = await fetch(`${baseUrl}/api/qc1/analyze`, {
    method: "POST",
    headers: getDefaultHeaders(),
    body: JSON.stringify({ text })
  });
  await throwIfNotOk(res, "qc1Analyze");
  return await res.json();
}

export async function textValidate(text: string): Promise<any> {
  const res = await fetch(`${baseUrl}/api/text-validate/validate`, {
    method: "POST",
    headers: getDefaultHeaders(),
    body: JSON.stringify({ text })
  });
  await throwIfNotOk(res, "textValidate");
  return await res.json();
}

export async function parseStage1(projectId: string, runId: string, candidate_description: string): Promise<any> {
  const res = await fetch(`${baseUrl}/api/projects/${projectId}/runs/${runId}/parse/stage1`, {
    method: "POST",
    headers: getDefaultHeaders(),
    body: JSON.stringify({ candidate_description })
  });
  await throwIfNotOk(res, "parseStage1");
  return await res.json();
}

export async function parseStage2(
  projectId: string,
  runId: string,
  current_description: string,
  user_additional_info: string
): Promise<any> {
  const res = await fetch(`${baseUrl}/api/projects/${projectId}/runs/${runId}/parse/stage2`, {
    method: "POST",
    headers: getDefaultHeaders(),
    body: JSON.stringify({ current_description, user_additional_info })
  });
  await throwIfNotOk(res, "parseStage2");
  return await res.json();
}

export async function updateSlots(projectId: string, runId: string, slots_normalized: any): Promise<void> {
  const res = await fetch(`${baseUrl}/api/projects/${projectId}/runs/${runId}/slots`, {
    method: "PUT",
    headers: getDefaultHeaders(),
    body: JSON.stringify({ slots_normalized })
  });
  await throwIfNotOk(res, "updateSlots");
}

export async function runSynonyms(projectId: string, runId: string): Promise<any> {
  const res = await fetch(`${baseUrl}/api/projects/${projectId}/runs/${runId}/synonyms`, {
    method: "POST",
    headers: getDefaultHeaders()
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
    headers: getDefaultHeaders(),
    body: JSON.stringify({ canonical_terms, synonyms })
  });
  await throwIfNotOk(res, "updateKeywords");
}

export async function runQueryBuild(projectId: string, runId: string): Promise<any> {
  const res = await fetch(`${baseUrl}/api/projects/${projectId}/runs/${runId}/query-build`, {
    method: "POST",
    headers: getDefaultHeaders()
  });
  await throwIfNotOk(res, "runQueryBuild");
  return await res.json();
}

export async function updateQueries(projectId: string, runId: string, queries: any): Promise<void> {
  const res = await fetch(`${baseUrl}/api/projects/${projectId}/runs/${runId}/queries`, {
    method: "PUT",
    headers: getDefaultHeaders(),
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
    headers: getDefaultHeaders(),
    body: JSON.stringify({ retrieval_framework })
  });
  await throwIfNotOk(res, "updateRetrievalFramework");
}

export async function adjustRetrievalFramework(projectId: string, runId: string, user_additional_info: string): Promise<any> {
  const res = await fetch(`${baseUrl}/api/projects/${projectId}/runs/${runId}/retrieval-framework/adjust`, {
    method: "POST",
    headers: getDefaultHeaders(),
    body: JSON.stringify({ user_additional_info })
  });
  await throwIfNotOk(res, "adjustRetrievalFramework");
  return await res.json();
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
  unique_authors: number;
  unique_countries: number;
  unique_institutions: number;
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
    cache: "no-store",
    headers: getDefaultHeaders()
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
    headers: getDefaultHeaders(),
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
    { cache: "no-store" ,
    headers: getDefaultHeaders()
    }
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
    { cache: "no-store" ,
    headers: getDefaultHeaders()
    }
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
    { cache: "no-store" ,
    headers: getDefaultHeaders()
    }
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
    { cache: "no-store" ,
    headers: getDefaultHeaders()
    }
  );
  await throwIfNotOk(res, "getInstitutionScholars");
  return await res.json();
}

// ============================================================
// Admin: Resource Monitoring APIs (Super User Only)
// ============================================================

export type ResourceSnapshot = {
  id: number;
  snapshot_date: string;
  snapshot_time: string;
  // Metric 1: Row counts
  users_count: number;
  projects_count: number;
  runs_count: number;
  papers_count: number;
  authorship_count: number;
  run_papers_count: number;
  affiliation_cache_count: number;
  geocoding_cache_count: number;
  institution_geo_count: number;
  // Metric 2: Disk sizes (MB)
  total_disk_size_mb: number;
  users_disk_mb: number;
  projects_disk_mb: number;
  runs_disk_mb: number;
  papers_disk_mb: number;
  authorship_disk_mb: number;
  run_papers_disk_mb: number;
  affiliation_cache_disk_mb: number;
  geocoding_cache_disk_mb: number;
  institution_geo_disk_mb: number;
};

export type OnlineUsersResponse = {
  online_count: number;
  last_updated: string;
};

/**
 * Manually trigger a resource snapshot (super user only).
 * Collects metrics 1-4: table row counts, disk sizes, user count, run count.
 */
export async function takeResourceSnapshot(): Promise<ResourceSnapshot> {
  const res = await fetch(`${baseUrl}/api/admin/resource-monitor/snapshot`, {
    method: "POST",
    headers: getDefaultHeaders(),
  });
  await throwIfNotOk(res, "takeResourceSnapshot");
  const json = await res.json();
  return json.snapshot as ResourceSnapshot;
}

/**
 * Get historical resource monitoring statistics (super user only).
 * Returns snapshots for the last N days.
 */
export async function getResourceStats(days: number = 30): Promise<ResourceSnapshot[]> {
  const res = await fetch(`${baseUrl}/api/admin/resource-monitor/stats?days=${days}`, {
    cache: "no-store",
    headers: getDefaultHeaders(),
  });
  await throwIfNotOk(res, "getResourceStats");
  const json = await res.json();
  return json.snapshots as ResourceSnapshot[];
}

/**
 * Get current online user count (super user only).
 * Returns metric 5: number of users active in the last 5 minutes.
 */
export async function getOnlineUsers(): Promise<OnlineUsersResponse> {
  const res = await fetch(`${baseUrl}/api/admin/resource-monitor/online-users`, {
    cache: "no-store",
    headers: getDefaultHeaders(),
  });
  await throwIfNotOk(res, "getOnlineUsers");
  return await res.json();
}
