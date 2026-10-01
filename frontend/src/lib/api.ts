export type Project = { project_id: string; name: string; created_at: string };
export type Run = { run_id: string; created_at: string; description: string };

import { getAuthHeaders } from "./auth";
import { getFirstTouch } from "./attribution";

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
  parse_stage2_max_consecutive_unanswered: number;
  retrieval_framework_adjust_max_attempts: number;
  share_run_auth_check_enabled: boolean;
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

/** Thrown by sendVerificationCode when registering an email that already has an account. */
export class EmailTakenError extends Error {}

export async function sendVerificationCode(
  email: string,
  purpose: "register" | "reset" = "register"
): Promise<void> {
  const res = await fetch(`${baseUrl}/api/auth/send-verification-code`, {
    method: "POST",
    headers: getDefaultHeaders(),
    body: JSON.stringify({ email, purpose }),
  });
  if (res.status === 409) throw new EmailTakenError(await readErrorDetail(res));
  await throwIfNotOk(res, "sendVerificationCode");
}

export async function resetPassword(
  email: string,
  verification_code: string,
  password: string
): Promise<LoginResponse> {
  const res = await fetch(`${baseUrl}/api/auth/reset-password`, {
    method: "POST",
    headers: getDefaultHeaders(),
    body: JSON.stringify({ email, verification_code, password }),
  });
  await throwIfNotOk(res, "resetPassword");
  return await res.json();
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
    body: JSON.stringify({ email, verification_code, password, password_retype, attribution: getFirstTouch() }),
  });
  await throwIfNotOk(res, "register");
  return await res.json();
}

export interface ContactForm {
  name: string;
  email: string;
  company: string;
  message: string;
  source: string;
  website: string; // honeypot, left empty by people
}

/** Team/industry contact form; the backend emails it to the team inbox. Throws with a user-facing message. */
export async function sendContact(form: ContactForm): Promise<void> {
  const touch = getFirstTouch();
  const firstTouch = touch ? [touch.source, touch.medium, touch.campaign, touch.landing_path].filter(Boolean).join(" / ") : "";
  const res = await fetch(`${baseUrl}/api/contact`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...form, first_touch: firstTouch }),
  });
  if (!res.ok) throw new Error(await readErrorDetail(res));
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
  tier: "free_user" | "pro_user" | "super_user";
  plan: "free" | "pro";
  pro_until: string | null; // when Pro ends: the later of the subscription period and any pass
  pass_until: string | null; // active one-time pass, if any
  has_subscription: boolean; // a live Paddle subscription (manage it in the billing portal)
  subscription_status: string | null;
  searches: {
    limit: number; // -1 = unlimited
    used: number;
    remaining: number;
    unlimited: boolean;
    window_days: number;
    next_slot_at: string | null;
  };
  list_limit: number; // rows per location in results, -1 = all
  can_export: boolean;
};

export async function getUserQuota(): Promise<UserQuotaInfo> {
  const res = await fetch(`${baseUrl}/api/user/quota`, {
    cache: "no-store",
    headers: getDefaultHeaders(),
  });
  await throwIfNotOk(res, "getUserQuota");
  return await res.json();
}

/** Human-readable explanation shown when a new search is refused by the weekly limit. */
export async function searchLimitMessage(): Promise<string> {
  try {
    const q = await getUserQuota();
    const next = q.searches.next_slot_at
      ? ` Your next search becomes available on ${new Date(q.searches.next_slot_at).toLocaleString()}.`
      : "";
    const upsell = q.plan === "free" ? " Upgrade to Pro for 30 searches every 7 days." : "";
    return `You've used ${q.searches.used} of ${q.searches.limit} searches in the last ${q.searches.window_days} days.${next}${upsell}`;
  } catch {
    return "You've reached your search limit for this 7-day period. Upgrade to Pro for more searches.";
  }
}

/** Open the Paddle customer portal (manage payment method, cancel). */
export async function getBillingPortalUrl(): Promise<string> {
  const res = await fetch(`${baseUrl}/api/billing/portal`, { method: "POST", headers: getDefaultHeaders() });
  await throwIfNotOk(res, "getBillingPortalUrl");
  return (await res.json()).url;
}

/** URL for the Pro CSV export of a run (needs the auth header, so fetch it rather than linking). */
export async function downloadRunCsv(projectId: string, runId: string): Promise<void> {
  const res = await fetch(`${baseUrl}/api/projects/${projectId}/runs/${runId}/export.csv`, { headers: getDefaultHeaders() });
  await throwIfNotOk(res, "downloadRunCsv");
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `labscout-${runId}.csv`;
  a.click();
  URL.revokeObjectURL(url);
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

export interface IngestStatus {
  status: "not_started" | "pending" | "running" | "completed" | "failed";
  background_task: boolean;
  started_at?: string;
  completed_at?: string;
  stats?: IngestStats;
  error?: string;
}

export async function getIngestStatus(
  projectId: string,
  runId: string
): Promise<IngestStatus> {
  const res = await fetch(
    `${baseUrl}/api/projects/${projectId}/runs/${runId}/ingest/status`,
    {
      headers: getDefaultHeaders(),
      cache: "no-store"
    }
  );
  await throwIfNotOk(res, "getIngestStatus");
  return await res.json();
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
): Promise<{ items: CountryMapData[]; withoutCity: number }> {
  const res = await fetch(
    `${baseUrl}/api/projects/${projectId}/runs/${runId}/map/country/${encodeURIComponent(country)}?min_confidence=${min_confidence}`,
    { cache: "no-store" ,
    headers: getDefaultHeaders()
    }
  );
  await throwIfNotOk(res, "getCountryMap");
  const json = await res.json();
  // withoutCity: scholars in the country whose city couldn't be determined
  return { items: json.data as CountryMapData[], withoutCity: Number(json.without_city || 0) };
}

export async function getCityMap(
  projectId: string,
  runId: string,
  country: string,
  city: string,
  min_confidence = "low"
): Promise<ListResult<CityMapData>> {
  const res = await fetch(
    `${baseUrl}/api/projects/${projectId}/runs/${runId}/map/city/${encodeURIComponent(country)}/${encodeURIComponent(city)}?min_confidence=${min_confidence}`,
    { cache: "no-store" ,
    headers: getDefaultHeaders()
    }
  );
  await throwIfNotOk(res, "getCityMap");
  const json = await res.json();
  return { items: json.data as CityMapData[], total: json.total ?? json.data.length, truncated: Boolean(json.truncated) };
}

/** A result list that Free plans may receive truncated (see list_limit). */
export type ListResult<T> = { items: T[]; total: number; truncated: boolean };

export async function getInstitutionScholars(
  projectId: string,
  runId: string,
  institution: string,
  country?: string,
  city?: string,
  min_confidence = "low",
  limit = 100,
  offset = 0
): Promise<{ scholars: Scholar[]; total: number; truncated: boolean }> {
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

/** Revenue-funnel metrics (admin only), see backend app/metrics.py. */
export type BusinessMetrics = {
  window_days: number;
  as_of: string;
  users_total: number;
  signups: number;
  activated_signups: number;
  activation_rate: number | null;
  searches: number;
  searchers: number;
  runs_started: number;
  runs_completed: number;
  runs_failed: number;
  run_completion_rate: number | null;
  free_users_at_limit: number;
  pro_active: number;
  pro_monthly: number;
  pro_quarterly: number;
  pro_canceling: number;
  pro_comp: number;
  pro_pass: number;
  pass_sales: number;
  pass_earnings_usd: number;
  pass_refunds_pending: number;
  pass_refunds_pending_over_24h: number;
  mrr_usd: number;
  churned: number;
  ai_cost_searches_usd: number;
  ai_cost_per_completed_search_usd: number | null;
  ai_cost_other_usd: number;
};

export async function getBusinessMetrics(days: number): Promise<BusinessMetrics> {
  const res = await fetch(`${baseUrl}/api/admin/metrics?days=${days}`, {
    cache: "no-store",
    headers: getDefaultHeaders(),
  });
  await throwIfNotOk(res, "getBusinessMetrics");
  return await res.json();
}

// ============================================================
// Admin console (super user only), see backend app/admin.py
// ============================================================

export type AdminUser = {
  user_id: string;
  email: string;
  created_at: string | null;
  email_verified: boolean;
  tier: "free_user" | "pro_user" | "super_user";
  plan: "free" | "pro";
  pro_until: string | null;
  pass_until: string | null;
  subscription_status: string | null;
  has_subscription: boolean;
  subscription_amount_cents: number | null;
  subscription_interval_months: number | null;
  disabled: boolean;
  disabled_at: string | null;
  is_test: boolean;
  search_limit: number; // -1 = unlimited
  search_limit_override: number | null;
  quota_reset_at: string | null;
  searches_in_window: number;
  // Only in the user list
  searches_total?: number;
  runs_total?: number;
  runs_completed?: number;
  ai_cost_usd?: number;
  last_active_at?: string | null;
};

export type AdminRun = {
  run_id: string;
  project_id: string;
  user_id: string | null;
  email: string | null;
  description: string;
  created_at: string | null;
  papers: number;
  completed: boolean;
  ai_cost_usd: number;
};

export type AdminActionLog = {
  id: number;
  action: string;
  target_user_id: string | null;
  target_email: string | null;
  detail: Record<string, unknown> | null;
  created_at: string | null;
};

export type AdminPass = {
  transaction_id: string;
  created_at: string | null;
  days: number;
  currency: string | null;
  amount_cents: number | null;
  refund_status: string | null; // pending_approval | approved | approved_partial | rejected | reversed
  refund_requested_at: string | null;
  refunded_at: string | null;
};

export type AdminUserDetail = { user: AdminUser; passes: AdminPass[]; runs: AdminRun[]; actions: AdminActionLog[] };

export type AdminUserAction =
  | { action: "grant_pro"; days: number; note?: string }
  | { action: "set_search_limit"; limit: number | null; note?: string }
  | { action: "revoke_pro" | "reset_quota" | "disable" | "enable" | "verify_email" | "mark_test" | "unmark_test"; note?: string };

export async function adminListUsers(params: {
  q?: string;
  plan?: "all" | "pro" | "free" | "disabled";
  limit?: number;
  offset?: number;
}): Promise<{ total: number; users: AdminUser[] }> {
  const qs = new URLSearchParams({
    q: params.q ?? "",
    plan: params.plan ?? "all",
    limit: String(params.limit ?? 50),
    offset: String(params.offset ?? 0),
  });
  const res = await fetch(`${baseUrl}/api/admin/users?${qs}`, { cache: "no-store", headers: getDefaultHeaders() });
  await throwIfNotOk(res, "adminListUsers");
  return await res.json();
}

export async function adminGetUser(userId: string): Promise<AdminUserDetail> {
  const res = await fetch(`${baseUrl}/api/admin/users/${encodeURIComponent(userId)}`, {
    cache: "no-store",
    headers: getDefaultHeaders(),
  });
  await throwIfNotOk(res, "adminGetUser");
  return await res.json();
}

/** Apply an account change; resolves to the user's refreshed detail, or throws with the server's reason. */
export async function adminUserAction(userId: string, body: AdminUserAction): Promise<AdminUserDetail> {
  const res = await fetch(`${baseUrl}/api/admin/users/${encodeURIComponent(userId)}/actions`, {
    method: "POST",
    headers: getDefaultHeaders(),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await readErrorDetail(res));
  return await res.json();
}

export async function adminRecentSearches(limit = 50, includeAdmin = false): Promise<AdminRun[]> {
  const res = await fetch(`${baseUrl}/api/admin/searches?limit=${limit}&include_admin=${includeAdmin}`, {
    cache: "no-store",
    headers: getDefaultHeaders(),
  });
  await throwIfNotOk(res, "adminRecentSearches");
  return (await res.json()).runs;
}

export async function adminAuditLog(limit = 100): Promise<AdminActionLog[]> {
  const res = await fetch(`${baseUrl}/api/admin/actions?limit=${limit}`, { cache: "no-store", headers: getDefaultHeaders() });
  await throwIfNotOk(res, "adminAuditLog");
  return (await res.json()).actions;
}
