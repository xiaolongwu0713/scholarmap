"use client";

import { useEffect, useRef, useState } from "react";
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
  adjustRetrievalFramework,
  runIngest,
  getAuthorshipStats,
  getWorldMap,
  type WorldMapData,
  type IngestStats
} from "@/lib/api";
import { getConfig, type FrontendConfig } from "@/lib/parseConfig";
import dynamic from "next/dynamic";
import MetricCard from "@/components/MetricCard";
import ProgressSteps from "@/components/ProgressSteps";
import AuthGuard from "@/components/AuthGuard";
import { UnifiedNavbar } from "@/components/UnifiedNavbar";
import Map, { Layer, Source, type MapRef } from "react-map-gl";

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
  status?: "helpful" | "not_helpful" | "info" | "error";
  consecutiveUnhelpful?: number;
};

type ParseResult = {
  plausibility_level: "A_impossible" | "B_plausible";
  is_research_description: boolean;
  is_clear_for_search: boolean;
  is_helpful: boolean;
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
};

function ExportMessageList({ title, messages }: { title: string; messages: ChatMessage[] }) {
  return (
    <div className="stack" style={{ gap: 12 }}>
      <h3 style={{ margin: 0 }}>{title}</h3>
      {messages.length === 0 ? (
        <div className="muted">No history available.</div>
      ) : (
        messages.map((message, idx) => (
          <div
            key={`${message.role}-${idx}`}
            style={{
              padding: "12px 14px",
              borderRadius: "12px",
              border: "1px solid #e5e7eb",
              background: message.role === "user" ? "#f8fafc" : "#ffffff"
            }}
          >
            <div style={{ fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.06em", color: "#6b7280" }}>
              {message.role === "user" ? "User" : "System"}
            </div>
            <div style={{ whiteSpace: "pre-wrap", fontSize: "14px", marginTop: 6 }}>
              {message.content}
            </div>
          </div>
        ))
      )}
    </div>
  );
}

async function copyTextToClipboard(text: string): Promise<boolean> {
  if (navigator?.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return true;
  }
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();
  let copied = false;
  try {
    copied = document.execCommand("copy");
  } catch {
    copied = false;
  }
  document.body.removeChild(textarea);
  return copied;
}

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
  if (/\d{6,}/.test(s)) issues.push("no long number strings");
  if (/(.)\1{5,}/i.test(s)) issues.push("no repeated chars");
  if (/[A-Za-z]{25,}/.test(s)) issues.push("no long letter strings");

  return issues;
}

function validateFrameworkAdjustmentInput(text: string): string[] {
  const s = text ?? "";
  const trimmed = s.trim();
  const issues: string[] = [];

  // Basic format checks (same as regular validation)
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
  if (/\d{6,}/.test(s)) issues.push("no long number strings");
  if (/(.)\1{5,}/i.test(s)) issues.push("no repeated chars");
  
  // Special handling for long letter strings in framework adjustment
  // Allow up to 2 long letter strings, and exclude words ending in "graph" or "graphy" (e.g., electroencephalography, stereotactic)
  const longLetterMatches = trimmed.match(/[A-Za-z]{25,}/g) || [];
  const validLongWords = longLetterMatches.filter(word => {
    const lower = word.toLowerCase();
    return lower.endsWith('graph') || lower.endsWith('graphy');
  });
  const invalidLongWords = longLetterMatches.filter(word => {
    const lower = word.toLowerCase();
    return !lower.endsWith('graph') && !lower.endsWith('graphy');
  });
  
  if (invalidLongWords.length > 2) {
    issues.push(`too many long letter strings (${invalidLongWords.length} found, max 2 allowed)`);
  }

  return issues;
}

function charLimitHint(text: string, minChars = 50, maxChars = 300): string {
  const len = (text ?? "").trim().length;
  return `${len}/${maxChars} chars (min ${minChars})`;
}

function extractFinalPubMedQuery(text: string): string {
  const m = text.match(/##\s*Final Combined PubMed Query[\s\S]*?```text\s*([\s\S]*?)\s*```/i);
  if (m?.[1]) return m[1].trim();
  const m2 = text.match(/```text\s*([\s\S]*?)\s*```/i);
  if (m2?.[1]) return m2[1].trim();
  return text.trim();
}

function translateValidationError(reason: string | null): string {
  if (!reason) return "Validation failed. Please check your input.";
  
  const reasonLower = reason.toLowerCase();
  
  // Format specific error types with clear messages
  if (reasonLower.includes("too_many_unknown_words")) {
    const match = reason.match(/too_many_unknown_words.*?ratio:\s*([\d.]+)%.*?threshold:\s*([\d.]+)%/i);
    if (match) {
      return `Your input contains too many unrecognized words (${match[1]}% found, maximum ${match[2]}% allowed). Please use correct English words.`;
    }
    return "Your input contains too many unrecognized words. Please use correct English words.";
  }
  
  if (reasonLower.includes("too_many_invalid_words")) {
    const match = reason.match(/too_many_invalid_words.*?ratio:\s*([\d.]+)%.*?threshold:\s*([\d.]+)%/i);
    if (match) {
      return `Your input contains too many unrecognized or misspelled words (${match[1]}% found, maximum ${match[2]}% allowed). Please use correct English words.`;
    }
    return "Your input contains too many unrecognized or misspelled words. Please use correct English words.";
  }
  
  if (reasonLower.includes("too_many_gibberish_words")) {
    // Match both "ratio: X%, threshold: Y%" and "ratio: X.X%, threshold: Y.Y%" formats
    const match = reason.match(/too_many_gibberish_words[^)]*?ratio:\s*([\d.]+)%.*?threshold:\s*([\d.]+)%/i);
    if (match) {
      return `Your input contains too many meaningless character combinations (${match[1]}% found, maximum ${match[2]}% allowed). Please use proper English words and sentences.`;
    }
    return "Your input contains too many meaningless character combinations. Please use proper English words and sentences.";
  }
  
  if (reasonLower.includes("too_many_misspelled_words")) {
    const match = reason.match(/too_many_misspelled_words.*?ratio:\s*([\d.]+)%.*?threshold:\s*([\d.]+)%/i);
    if (match) {
      return `Your input contains too many misspelled words (${match[1]}% found, maximum ${match[2]}% allowed). Please check your spelling.`;
    }
    return "Your input contains too many misspelled words. Please check your spelling.";
  }
  
  if (reasonLower.includes("too_many_repeated_trigrams")) {
    const match = reason.match(/too_many_repeated_trigrams.*?count:\s*(\d+).*?threshold:\s*(\d+)/i);
    if (match) {
      return `Your input contains too many repeated word sequences (${match[1]} found, maximum ${match[2]} allowed). Please avoid repeating the same phrases.`;
    }
    return "Your input contains too many repeated word sequences. Please avoid repeating the same phrases.";
  }
  
  if (reasonLower.includes("too_many_repeated_tokens")) {
    const match = reason.match(/too_many_repeated_tokens.*?ratio:\s*([\d.]+)%.*?threshold:\s*([\d.]+)%/i);
    if (match) {
      return `Your input contains too many repeated words (${match[1]}% found, maximum ${match[2]}% allowed). Please use more varied vocabulary.`;
    }
    return "Your input contains too many repeated words. Please use more varied vocabulary.";
  }
  
  if (reasonLower.includes("too_low_unique_token_ratio")) {
    const match = reason.match(/too_low_unique_token_ratio.*?ratio:\s*([\d.]+)%.*?threshold:\s*([\d.]+)%/i);
    if (match) {
      return `Your input has too few unique words (${match[1]}% found, minimum ${match[2]}% required). Please use more varied vocabulary.`;
    }
    return "Your input has too few unique words. Please use more varied vocabulary.";
  }
  
  if (reasonLower.includes("recommended_illegal")) {
    const match = reason.match(/recommended_illegal.*?reason:\s*(\w+)/i);
    if (match) {
      return `Text quality check failed: ${match[1]}. Please revise your input.`;
    }
    return "Text quality check failed. Please revise your input.";
  }
  
  // Check for "issues found" pattern and try to extract specific issues
  if (reasonLower.includes("issues found")) {
    // Try to match any specific issue type first
    const issueMatch = reason.match(/issues found:\s*([^.]+\.[^.]*)/i);
    if (issueMatch) {
      // If we have a specific issue, try to format it better
      const issueText = issueMatch[1];
      // Check if it's a known issue type we haven't matched yet
      if (issueText.includes("too_many_repeated_trigrams")) {
        const trigramMatch = issueText.match(/too_many_repeated_trigrams.*?count:\s*(\d+).*?threshold:\s*(\d+)/i);
        if (trigramMatch) {
          return `Your input contains too many repeated word sequences (${trigramMatch[1]} found, maximum ${trigramMatch[2]} allowed). Please avoid repeating the same phrases.`;
        }
      }
      // For other issues, return formatted message
      return `Text quality check failed: ${issueText}.`;
    }
    // Fallback: return the detailed reason from backend
    return reason.replace(/Text quality check failed\.\s*/, "Text quality check failed: ");
  }
  
  if (reasonLower.includes("quality check failed")) {
    // Return the detailed reason from backend, which now includes specific issues
    return reason.replace(/Text quality check failed\.\s*/, "Text quality check failed: ");
  }
  
  if (reasonLower.includes("length") || reasonLower.includes("50") || reasonLower.includes("300")) {
    return "Input length does not meet requirements. Please enter text between 50-300 characters.";
  }
  
  if (reasonLower.includes("empty")) {
    return "Input cannot be empty. Please enter your research description.";
  }
  
  if (reasonLower.includes("line break") || reasonLower.includes("newline")) {
    return "Input contains too many line breaks. Maximum 3 line breaks allowed.";
  }
  
  // Default: return the original reason (which should now be more detailed)
  return reason || "Validation failed. Please check that your input meets the requirements.";
}

function formatSystemUnderstanding(result: ParseResult, isStage2: boolean = false, consecutiveUnhelpful: number = 0): ChatMessage | null {
  let status: "helpful" | "not_helpful" | "info" | "error" | undefined;
  let content = "";
  
  if (isStage2) {
    // Stage 2: Check if helpful
    if (result.is_helpful) {
      status = "helpful";
      content = "Your answer is helpful. Below is the new understanding and further instruction for refinement. Or, you can choose to use it without further refinement.";
    } else {
      status = "not_helpful";
      content = "Please provide more useful information. You have one chance left to refine system understanding.";
    }
  } else {
    // Stage 1: Check plausibility and clarity
    if (result.plausibility_level === "A_impossible" || !result.is_research_description) {
      status = "error";
      content = "This is not a valid research description, or the input does not meet the requirements for a research description.";
    } else if (result.is_clear_for_search) {
      status = "info";
      content = "Below is the system understanding of your research and further instructions for refinement.";
    } else {
      status = "info";
      content = "Below is the system understanding of your research and further instructions for refinement.";
    }
  }
  
  return { role: "system", content, status, consecutiveUnhelpful: consecutiveUnhelpful > 0 ? consecutiveUnhelpful : undefined };
}

function formatParseResultAsMessage(result: ParseResult): string {
  let content = result.normalized_understanding || "";
  
  if (result.plausibility_level === "A_impossible") {
    // For A_impossible, show uncertainties (which now contains the reason)
    if (result.uncertainties && result.uncertainties.length > 0) {
      content += "\n\n" + result.uncertainties.map(u => `- ${u}`).join("\n");
    }
  } else if (!result.is_clear_for_search) {
    const parts: string[] = [];
    
    if (result.uncertainties && result.uncertainties.length > 0) {
      parts.push("Uncertainties:\n" + result.uncertainties.map(u => `- ${u}`).join("\n"));
    }
    
    if (result.suggested_questions && result.suggested_questions.length > 0) {
      parts.push("Questions:\n" + result.suggested_questions.map(q => `- ${q.question}`).join("\n"));
    }
    
    if (parts.length > 0) {
      content += "\n\n" + parts.join("\n\n");
    }
  }
  
  return content.trim();
}

function RunPageContent() {
  const params = useParams();
  const projectId = params.projectId as string;
  const runId = params.runId as string;
  const isDemoRun = projectId === "6af7ac1b6254" && runId === "53e099cdb74e";

  // Load configuration from backend (with fallback defaults)
  const [config, setConfig] = useState<FrontendConfig>({
    text_validation_max_attempts: 3,
    parse_stage1_max_attempts: 2,
    parse_stage2_max_total_attempts: 3,
    parse_stage2_max_consecutive_unhelpful: 2,
    retrieval_framework_adjust_max_attempts: 2,
    share_run_auth_check_enabled: true,
  });
  
  const [busy, setBusy] = useState<
    null | "textValidate" | "parse" | "buildFramework" | "adjustFramework" | "queryBuild" | "query" | "ingest"
  >(null);
  const [error, setError] = useState<string | null>(null);
  const [validationErrorModal, setValidationErrorModal] = useState<{ show: boolean; message: string }>({ show: false, message: "" });
  
  // Phase 2 state
  const [ingestStats, setIngestStats] = useState<IngestStats | null>(null);
  const [ingestionCompleted, setIngestionCompleted] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const showDemoLoading = isDemoRun && !ingestStats;
  const [showDemoReadyModal, setShowDemoReadyModal] = useState(false);
  const hasShownDemoReady = useRef(false);
  const [shareCopied, setShareCopied] = useState(false);
  const [isExportMode, setIsExportMode] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [exportTriggered, setExportTriggered] = useState(false);
  const [exportMapReady, setExportMapReady] = useState(false);
  const [exportWorldData, setExportWorldData] = useState<WorldMapData[]>([]);
  const [exportMapImage, setExportMapImage] = useState<string | null>(null);
  const exportMapRef = useRef<MapRef | null>(null);
  const [exportMapLoaded, setExportMapLoaded] = useState(false);
  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || "";

  useEffect(() => {
    if (!isDemoRun) return;
    if (ingestStats && !hasShownDemoReady.current) {
      hasShownDemoReady.current = true;
      setShowDemoReadyModal(true);
    }
  }, [ingestStats, isDemoRun]);

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
  const [parseStage2TotalAttempts, setParseStage2TotalAttempts] = useState(0);
  const [parseStage2ConsecutiveFalse, setParseStage2ConsecutiveFalse] = useState(0);
  const [parseStage1Locked, setParseStage1Locked] = useState(false);
  const [parseStage2Locked, setParseStage2Locked] = useState(false);
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [parseAdditionalInfo, setParseAdditionalInfo] = useState("");
  const [parseCurrentDescription, setParseCurrentDescription] = useState("");
  const [normalizedUnderstandingsHistory, setNormalizedUnderstandingsHistory] = useState<string[]>([]);
  const [parseCompleted, setParseCompleted] = useState(false);
  const [questions, setQuestions] = useState<string[]>([]);
  const [frameworkText, setFrameworkText] = useState<string>("");
  const [showFrameworkAdjustUI, setShowFrameworkAdjustUI] = useState(false);
  const [frameworkAdjustMessages, setFrameworkAdjustMessages] = useState<ChatMessage[]>([]);
  const [frameworkAdjustInput, setFrameworkAdjustInput] = useState<string>("");
  const [frameworkAdjustHistory, setFrameworkAdjustHistory] = useState<string[]>([]);
  const [frameworkAdjustAttempts, setFrameworkAdjustAttempts] = useState(0);
  const [frameworkAdjustLocked, setFrameworkAdjustLocked] = useState(false);
  const [frameworkCompleted, setFrameworkCompleted] = useState(false);
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
  const frameworkAdjustClientIssues = validateFrameworkAdjustmentInput(frameworkAdjustInput);

  async function handleShare() {
    const url = `${window.location.origin}/projects/${projectId}/runs/${runId}`;
    const copied = await copyTextToClipboard(url);
    if (copied) {
      setShareCopied(true);
      window.setTimeout(() => setShareCopied(false), 1500);
    }
  }

  async function handleExport() {
    if (exportLoading) return;
    setExportTriggered(false);
    setExportMapReady(false);
    setExportMapImage(null);
    setExportLoading(true);
    setIsExportMode(true);
    try {
      if (ingestStats) {
        const data = await getWorldMap(projectId, runId);
        setExportWorldData(data);
      } else {
        setExportWorldData([]);
      }
    } catch {
      setExportWorldData([]);
    } finally {
      setExportLoading(false);
    }
  }

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
    // Load description (empty string will show placeholder)
    setResearchDescription(u?.research_description || "");
    setQuestions((u?.clarification_questions as string[]) || []);
    if (u?.retrieval_framework) {
      setFrameworkText(String(u.retrieval_framework));
      // Load framework adjust history if exists
      const adjustHistory = u?.retrieval_framework_adjust_history || [];
      if (adjustHistory.length > 0) {
        const frameworks = adjustHistory.map((item: any) => item.framework || "");
        setFrameworkAdjustHistory([String(u.retrieval_framework), ...frameworks].filter(Boolean));
        setFrameworkAdjustAttempts(adjustHistory.length);
        
        // Rebuild frameworkAdjustMessages from history
        const messages: ChatMessage[] = [{
          role: "system",
          content: "The right is the current Retrieval Framework which will be used to generate the search query for literature databases. You can talk to system to make adjustment, or you can use the current framework.",
          status: "info"
        }];
        
        for (const item of adjustHistory) {
          if (item.user_input) {
            messages.push({
              role: "user",
              content: item.user_input
            });
          }
          if (item.framework) {
            messages.push({
              role: "system",
              content: item.framework,
              status: "info"
            });
          }
        }
        
        setFrameworkAdjustMessages(messages);
        setShowFrameworkAdjustUI(true);
        
        // Restore frameworkAdjustInput from last history item
        const lastAdjustItem = adjustHistory[adjustHistory.length - 1];
        if (lastAdjustItem?.user_input) {
          setFrameworkAdjustInput(lastAdjustItem.user_input);
        }
      } else {
        // Initialize messages even without history
        setFrameworkAdjustMessages([{
          role: "system",
          content: "The right is the current Retrieval Framework which will be used to generate the search query for literature databases. You can talk to system to make adjustment, or you can use the current framework.",
          status: "info"
        }]);
        setShowFrameworkAdjustUI(true);
      }
    }

    // Load parse history and normalized understandings
    const messages: ChatMessage[] = [];
    let consecutiveFalse = 0;
    
    // Rebuild messages from parse result and history
    if (u?.parse?.result) {
      const parseStage = u.parse.stage as string | undefined;
      const result = u.parse.result as ParseResult;
      
      // If stage1, add stage1 messages
      if (parseStage === "stage1") {
        const systemUnderstanding = formatSystemUnderstanding(result, false);
        if (systemUnderstanding) {
          messages.push(systemUnderstanding);
        }
        const llmResponse = formatParseResultAsMessage(result);
        messages.push({
          role: "system",
          content: llmResponse
        });
    }
      
      // Load parse result
      setParseResult(result);
      // Add current result to history if not already there
      if (result.normalized_understanding) {
        const current = result.normalized_understanding;
      setNormalizedUnderstandingsHistory((prev) => {
        if (!prev.includes(current)) {
          return [...prev, current];
        }
        return prev;
      });
        // Set current description to the latest normalized understanding
        setParseCurrentDescription(current);
      }
      // Enable textValidateMode if there's parse result
      setTextValidateMode(true);
    }
    
    // Add stage2 history messages
    if (u?.parse?.history) {
      const history = u.parse.history as Array<{ 
        current_description?: string;
        user_additional_info?: string;
        result?: ParseResult;
      }>;
      const understandings = history
        .map((h) => h.result?.normalized_understanding)
        .filter((u): u is string => Boolean(u));
      setNormalizedUnderstandingsHistory((prev) => {
        const combined = [...prev, ...understandings];
        // Remove duplicates while preserving order
        return Array.from(new Set(combined));
      });
      
      for (const item of history) {
        if (item.user_additional_info) {
          // Add user message
          messages.push({
            role: "user",
            content: item.user_additional_info
          });
        }
        
        if (item.result) {
          // Add system understanding message
          const systemUnderstanding = formatSystemUnderstanding(item.result, true, consecutiveFalse);
          if (systemUnderstanding) {
            messages.push(systemUnderstanding);
          }
          
          // Add LLM response
          const llmResponse = formatParseResultAsMessage(item.result);
          messages.push({
            role: "system",
            content: llmResponse
          });
          
          // Update consecutive false count
          if (item.result.is_helpful === false) {
            consecutiveFalse++;
          } else {
            consecutiveFalse = 0;
          }
        }
      }
      
      // Restore parseAdditionalInfo from last history item
      const lastHistoryItem = history[history.length - 1];
      if (lastHistoryItem?.user_additional_info) {
        setParseAdditionalInfo(lastHistoryItem.user_additional_info);
      }
      
      // Enable textValidateMode if there's parse history
      setTextValidateMode(true);
      
      // Set current description to the latest understanding from history if not already set
      if (!parseCurrentDescription) {
        const latestUnderstanding = history
          .map((h) => h.result?.normalized_understanding)
          .filter((u): u is string => Boolean(u))
          .pop();
        if (latestUnderstanding) {
          setParseCurrentDescription(latestUnderstanding);
        }
      }
    }
    
    // Set messages if we have any
    if (messages.length > 0) {
      setTextValidateMessages(messages);
    }
    
    // Restore parseCompleted state - if framework exists, parse must be completed
    if (u?.retrieval_framework) {
      setParseCompleted(true);
    }

    // Load parse stage 2 attempts count from history
    if (u?.parse?.history) {
      const history = u.parse.history as Array<any>;
      setParseStage2TotalAttempts(history.length);
      // Count consecutive false from the end
      let consecutiveFalse = 0;
      for (let i = history.length - 1; i >= 0; i--) {
        if (history[i]?.result?.is_helpful === false) {
          consecutiveFalse++;
        } else {
          break;
        }
      }
      setParseStage2ConsecutiveFalse(consecutiveFalse);
    }

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
        const queryText = obj.pubmed_full || obj.pubmed;
        if (queryText && queryText.trim()) {
          setPubmedQueryText(queryText);
          // If queries exist, framework must be completed
          setFrameworkCompleted(true);
        }
      }
    } catch (e) {
      // queries.json might not exist yet, which is fine
      // Don't set pubmedQueryText if file doesn't exist
    }

    // Check if ingestion has been completed by loading authorship stats
    try {
      const stats = await getAuthorshipStats(projectId, runId);
      if (stats) {
        setIngestStats(stats);
        setIngestionCompleted(true);
      }
    } catch {
      // No authorship data yet, ingestion not completed
    }

    await loadResults();
  }

  // Load configuration from backend on mount
  useEffect(() => {
    getConfig().then(setConfig).catch((e) => {
      console.error("Failed to load config:", e);
      // Config will fallback to defaults in parseConfig.ts
    });
  }, []);
  
  useEffect(() => {
    loadInitial().catch((e) => setError(String(e)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, runId]);

  useEffect(() => {
    if (!isExportMode) return;
    const handleAfterPrint = () => {
      setIsExportMode(false);
      setExportTriggered(false);
    };
    window.addEventListener("afterprint", handleAfterPrint);
    return () => window.removeEventListener("afterprint", handleAfterPrint);
  }, [isExportMode]);

  useEffect(() => {
    if (!isExportMode || exportLoading || exportTriggered) return;
    if (mapboxToken && ingestStats && !exportMapReady) return;
    const timer = window.setTimeout(() => {
      setExportTriggered(true);
      window.print();
    }, 300);
    return () => window.clearTimeout(timer);
  }, [isExportMode, exportLoading, exportTriggered, exportMapReady, mapboxToken, ingestStats]);

  useEffect(() => {
    if (!isExportMode || exportLoading || exportMapImage || !exportMapLoaded) return;
    if (!ingestStats || exportWorldData.length === 0) {
      setExportMapReady(true);
      return;
    }
    const map = exportMapRef.current?.getMap();
    if (!map) return;
    const capture = () => {
      const canvas = map.getCanvas();
      try {
        const dataUrl = canvas.toDataURL("image/png");
        setExportMapImage(dataUrl);
      } catch {
        setExportMapImage(null);
      } finally {
        setExportMapReady(true);
      }
    };
    map.fitBounds([[-180, -60], [180, 85]], { padding: 40, duration: 0 });
    if (map.isStyleLoaded() && map.areTilesLoaded?.() && map.isSourceLoaded?.("export-world-source")) {
      window.setTimeout(capture, 200);
      return;
    }
    let settled = false;
    const onIdle = () => {
      if (settled) return;
      settled = true;
      capture();
    };
    map.once("idle", onIdle);
    window.setTimeout(() => {
      if (settled) return;
      settled = true;
      capture();
    }, 1200);
  }, [isExportMode, exportLoading, exportMapImage, exportMapLoaded, exportWorldData, ingestStats]);


  async function onParseStage1(candidate: string) {
    if (parseStage1Attempts >= config.parse_stage1_max_attempts) {
      setParseStage1Locked(true);
      setTextValidateMessages((prev) => [
        ...prev,
        { role: "system", content: `Parse stage1: Too many attempts (${config.parse_stage1_max_attempts}/${config.parse_stage1_max_attempts}). Service refused.` }
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

      // Append normalized_understanding to history after Stage 1
      if (d.normalized_understanding) {
        setNormalizedUnderstandingsHistory((prev) => [...prev, d.normalized_understanding]);
      }

      // Add system understanding first, then LLM response
      const systemUnderstanding = formatSystemUnderstanding(d, false);
      const llmResponse = formatParseResultAsMessage(d);
      const stage1Failed = !d.is_research_description || d.plausibility_level === "A_impossible";
      
      const newMessages: ChatMessage[] = [];
      if (systemUnderstanding) {
        newMessages.push(systemUnderstanding);
      }
      newMessages.push({ role: "system", content: llmResponse });
      
      setTextValidateMessages((prev) => [...prev, ...newMessages]);

      if (stage1Failed && parseStage1Attempts >= config.parse_stage1_max_attempts) {
        setParseStage1Locked(true);
        setTextValidateMessages((prev) => [
          ...prev,
          { role: "system", content: `Parse stage1: Too many failed attempts (${config.parse_stage1_max_attempts}/${config.parse_stage1_max_attempts}). Service refused.` }
        ]);
      }
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(null);
    }
  }

  async function onParseStage2Submit(additionalInfo: string) {
    // Check total attempts limit
    if (parseStage2TotalAttempts >= config.parse_stage2_max_total_attempts) {
      setParseStage2Locked(true);
      setTextValidateMessages((prev) => [
        ...prev,
        { role: "system", content: `Parse stage2: Maximum attempts reached (${config.parse_stage2_max_total_attempts}/${config.parse_stage2_max_total_attempts}). Service refused.` }
      ]);
      return;
    }

    setBusy("parse");
    setError(null);
    try {
      // Frontend validation
      const clientIssues = validateClientInput(additionalInfo);
      if (clientIssues.length > 0) {
        setError(`Invalid input: ${clientIssues.join(", ")}`);
        return;
      }

      // Backend validation (quality checks)
      const validateRes = await textValidate(additionalInfo);
      const validateData = validateRes.data as { ok: boolean; reason: string | null };
      if (!validateData.ok) {
        const userFriendlyMessage = translateValidationError(validateData.reason);
        setValidationErrorModal({ show: true, message: userFriendlyMessage });
        return;
      }

      const res = await parseStage2(projectId, runId, parseCurrentDescription, additionalInfo);
      const d = res.data as ParseResult;

      // Increment counters
      const newTotalAttempts = parseStage2TotalAttempts + 1;
      setParseStage2TotalAttempts(newTotalAttempts);

      // Update consecutive false counter
      let newConsecutiveFalse = 0;
      if (!d.is_helpful) {
        newConsecutiveFalse = parseStage2ConsecutiveFalse + 1;
        setParseStage2ConsecutiveFalse(newConsecutiveFalse);
      } else {
        setParseStage2ConsecutiveFalse(0); // Reset counter on helpful response
      }

      // Lock if max attempts reached
      if (newTotalAttempts >= config.parse_stage2_max_total_attempts) {
        setParseStage2Locked(true);
      }

      setParseResult(d);
      setParseStage2Attempts((n) => n + 1);

      const merged = `${parseCurrentDescription}\n\nAdditional info:\n${additionalInfo}`.trim();
      setParseCurrentDescription(merged);
      setParseAdditionalInfo("");

      // Update normalized understanding history only when is_helpful=true
      if (d.is_helpful && d.normalized_understanding) {
        setNormalizedUnderstandingsHistory((prev) => [...prev, d.normalized_understanding]);
      }

      // Update messages - add user input, system understanding, and LLM response
      const systemUnderstanding = formatSystemUnderstanding(d, true, newConsecutiveFalse);
      const llmResponse = formatParseResultAsMessage(d);
      const messages: ChatMessage[] = [
        ...textValidateMessages,
        { role: "user", content: additionalInfo }
      ];
      
      if (systemUnderstanding) {
        messages.push(systemUnderstanding);
      }
      messages.push({ role: "system", content: llmResponse });

      // Lock if consecutive unhelpful threshold reached (after adding the response)
      if (!d.is_helpful && newConsecutiveFalse >= config.parse_stage2_max_consecutive_unhelpful) {
        setParseStage2Locked(true);
        messages.push({ role: "system", content: `Parse: Service refused due to ${config.parse_stage2_max_consecutive_unhelpful} consecutive unhelpful responses.` });
      }

      if (d.plausibility_level === "A_impossible" || !d.is_research_description) {
        setParseStage2Locked(true);
      }

      setTextValidateMessages(messages);

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
      // Use the latest research description from history (right panel list), or fallback to parseCurrentDescription
      const input = normalizedUnderstandingsHistory.length > 0
        ? normalizedUnderstandingsHistory[normalizedUnderstandingsHistory.length - 1]
        : parseCurrentDescription;
      
      const trimmedInput = input.trim();
      if (!trimmedInput) {
        setError("No research description available. Please complete parse stage first.");
        return;
      }

      // No validation - directly use the latest research description and generate framework
      // Skip validation since normalized_understanding is already validated LLM output
      const res = await parseRun(projectId, runId, trimmedInput, true);
      const d = res.data;
      const newFramework = String(d.retrieval_framework || "");
      setQuestions([]);
      setFrameworkText(newFramework);
      
      // Initialize framework adjustment UI
      setFrameworkAdjustHistory([newFramework]);
      setFrameworkAdjustMessages([{
        role: "system",
        content: "The right is the current Retrieval Framework which will be used to generate the search query for literature databases. You can talk to system to make adjustment, or you can use the current framework.",
        status: "info"
      }]);
      setFrameworkAdjustAttempts(0);
      setFrameworkAdjustLocked(false);
      setShowFrameworkAdjustUI(true);
      
      // Mark parse as completed - disable parse input
      setParseCompleted(true);
      
      await refreshFiles();
      setRawSelected("retrieval_framework.json");
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(null);
    }
  }

  async function onAdjustFramework() {
    if (!frameworkAdjustInput.trim() || frameworkAdjustLocked) return;
    
    setBusy("adjustFramework");
    setError(null);
    try {
      // Client-side validation (same as parse stage)
      const clientIssues = validateClientInput(frameworkAdjustInput);
      if (clientIssues.length > 0) {
        setError(`Input validation failed: ${clientIssues.join("; ")}`);
        return;
      }

      // Add user message
      setFrameworkAdjustMessages(prev => [...prev, {
        role: "user",
        content: frameworkAdjustInput
      }]);

      const userInput = frameworkAdjustInput;
      setFrameworkAdjustInput("");

      // Call API
      const res = await adjustRetrievalFramework(projectId, runId, userInput);
      const newFramework = res.retrieval_framework || "";

      // Add system response
      setFrameworkAdjustMessages(prev => [...prev, {
        role: "system",
        content: newFramework,
        status: "info"
      }]);

      // Update history
      setFrameworkAdjustHistory(prev => [...prev, newFramework]);
      setFrameworkText(newFramework);
      setFrameworkAdjustAttempts(prev => prev + 1);

      // Check if limit reached
      if (frameworkAdjustAttempts + 1 >= config.retrieval_framework_adjust_max_attempts) {
        setFrameworkAdjustLocked(true);
      }

      await refreshFiles();
    } catch (e: any) {
      setError(String(e?.message || e));
      // Remove user message on error
      setFrameworkAdjustMessages(prev => prev.slice(0, -1));
    } finally {
      setBusy(null);
    }
  }

  async function onUseFramework() {
    // Use current framework (latest from history) and proceed to query build
    const currentFramework = frameworkAdjustHistory.length > 0 
      ? frameworkAdjustHistory[frameworkAdjustHistory.length - 1]
      : frameworkText;
    if (!currentFramework || !currentFramework.trim()) {
      setError("No framework available. Please generate framework first.");
        return;
      }

    // Keep framework adjust UI visible, just trigger query build
    // Ensure frameworkText is set to the latest framework
    setFrameworkText(currentFramework.trim());
    
    // Automatically trigger query build
    setBusy("queryBuild");
    setError(null);
    try {
      await updateRetrievalFramework(projectId, runId, currentFramework.trim());
      const res = await runQueryBuild(projectId, runId);
      const obj = {
        pubmed: String(res.data?.pubmed || ""),
        pubmed_full: String(res.data?.pubmed_full || ""),
        semantic_scholar: String(res.data?.semantic_scholar || ""),
        openalex: String(res.data?.openalex || "")
      };
      setQueriesObj(obj);
      setPubmedQueryText(obj.pubmed_full || obj.pubmed);
      
      // Mark framework as completed - disable framework input and button
      setFrameworkCompleted(true);
      
      await refreshFiles();
      setRawSelected("queries.json");
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(null);
    }
  }

  async function onParse() {
    setError(null);
    setTextValidateMode(true);
    const source = textValidateMode ? textValidateDraft : researchDescription;
    const input = source.trim();

    setTextValidateLatest(input);
    setTextValidateDraft(input);

    const nextAttempts = textValidateAttempts + 1;
    setTextValidateAttempts(nextAttempts);
    setTextValidateReason(null);

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
        const userFriendlyMessage = translateValidationError(reason);
        setTextValidateReason(reason);
        // 不添加到对话框，而是显示弹窗
        setValidationErrorModal({ show: true, message: userFriendlyMessage });
        if (nextAttempts >= config.text_validation_max_attempts) {
          setTextValidateLocked(true);
        }
        return;
      }
    } catch (e) {
      setError(String(e));
      const userFriendlyMessage = "Text validation service is temporarily unavailable. Please try again later.";
      setValidationErrorModal({ show: true, message: userFriendlyMessage });
      return;
    } finally {
      setBusy(null);
    }

    // 只有验证通过才添加到对话框
    setTextValidateLocked(false);
    setResearchDescription(input);
    setTextValidateMessages((prev) => [
      ...prev,
      { role: "user", content: input }
    ]);

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


  async function onIngest() {
    setBusy("ingest");
    setError(null);
    try {
      const stats = await runIngest(projectId, runId, false);
      setIngestStats(stats);
      // Mark ingestion as completed on success
      setIngestionCompleted(true);
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
  const exportMaxCount = exportWorldData.reduce((max, item) => Math.max(max, item.scholar_count), 1);

  const pipelineSteps = [
    { label: "Parse", status: hasFramework ? ("completed" as const) : ("pending" as const) },
    { label: "Framework", status: hasFramework ? ("completed" as const) : ("pending" as const) },
    { label: "Query", status: hasQuery ? ("completed" as const) : hasFramework ? ("in_progress" as const) : ("pending" as const) },
    { label: "Results", status: hasResults ? ("completed" as const) : hasQuery ? ("in_progress" as const) : ("pending" as const) },
    { label: "Map", status: hasAuthorship ? ("completed" as const) : hasResults ? ("in_progress" as const) : ("pending" as const) }
  ];

  return (
    <>
      <div className="screen-only" style={{ display: isExportMode ? "none" : "block" }}>
      <UnifiedNavbar variant="app" />
      <div className="container stack" style={{ paddingTop: "80px" }}>
        {/* Header */}
        <div
          className="row"
          style={{
            justifyContent: "space-between",
            marginBottom: "8px",
            display: "grid",
            gridTemplateColumns: "1fr auto 1fr",
            alignItems: "center"
          }}
        >
        <div>
          <h1 style={{ margin: 0, marginBottom: "4px" }} className="text-gradient">
            Run {runId}
          </h1>
          <div className="muted">Scholar paper retrieval and analysis pipeline</div>
        </div>
        <div style={{ display: "flex", justifyContent: "center", gap: "8px" }}>
          <button
            className="secondary"
            onClick={handleShare}
            style={{ background: "#5a0760", color: "#fff", borderColor: "#5a0760" }}
          >
            {shareCopied ? "Copied!" : "Share"}
          </button>
          <button
            className="secondary"
            onClick={handleExport}
            disabled={exportLoading}
            style={{ background: "#5a0760", color: "#fff", borderColor: "#5a0760" }}
          >
            {exportLoading ? "Exporting..." : "Export"}
          </button>
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          {!isDemoRun && (
            <Link href={`/projects/${projectId}`}>
              <button className="secondary">← Back to Project</button>
            </Link>
          )}
        </div>
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

      {/* Validation Error Modal */}
      {validationErrorModal.show && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000
          }}
          onClick={() => setValidationErrorModal({ show: false, message: "" })}
        >
          <div
            style={{
              backgroundColor: "white",
              borderRadius: "16px",
              padding: "24px",
              maxWidth: "500px",
              width: "90%",
              boxShadow: "0 8px 32px rgba(0, 0, 0, 0.2)",
              border: "1px solid #e5e7eb"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ marginBottom: "16px" }}>
              <h3 style={{ margin: 0, marginBottom: "8px", color: "#dc2626", fontSize: "20px" }}>
                ⚠️ Validation Failed
              </h3>
              <div style={{ color: "#6b7280", fontSize: "14px", lineHeight: "1.5" }}>
                {validationErrorModal.message}
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
              <button
                className="primary"
                onClick={() => setValidationErrorModal({ show: false, message: "" })}
                style={{ padding: "8px 16px", fontSize: "14px" }}
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      {showDemoLoading && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(15, 23, 42, 0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1100
          }}
        >
          <div
            style={{
              backgroundColor: "white",
              borderRadius: "16px",
              padding: "28px 32px",
              maxWidth: "520px",
              width: "90%",
              boxShadow: "0 16px 40px rgba(0, 0, 0, 0.2)",
              border: "1px solid #e5e7eb",
              textAlign: "center"
            }}
          >
            <div
              style={{
                width: "44px",
                height: "44px",
                borderRadius: "50%",
                border: "4px solid #c7d2fe",
                borderTopColor: "#6366f1",
                margin: "0 auto 16px",
                animation: "spin 0.9s linear infinite"
              }}
            />
            <h3 style={{ margin: 0, marginBottom: "8px", color: "#111827", fontSize: "20px" }}>
              Loading demo data…
            </h3>
            <div style={{ color: "#6b7280", fontSize: "14px", lineHeight: "1.5" }}>
              Please wait while we prepare the run. This will complete when the “Open Interactive Map” button becomes available.
            </div>
          </div>
        </div>
      )}

      {showDemoReadyModal && !showDemoLoading && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(15, 23, 42, 0.35)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1100
          }}
          onClick={() => setShowDemoReadyModal(false)}
        >
          <div
            style={{
              backgroundColor: "white",
              borderRadius: "16px",
              padding: "24px",
              maxWidth: "540px",
              width: "90%",
              boxShadow: "0 16px 40px rgba(0, 0, 0, 0.2)",
              border: "1px solid #e5e7eb"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: 0, marginBottom: "8px", color: "#111827", fontSize: "20px", textAlign: "center" }}>
              Demo ready
            </h3>
            <div style={{ color: "#6b7280", fontSize: "14px", lineHeight: "1.6" }}>
              You can scroll down to the bottom and click “Open Interactive Map” to explore the global distribution of scholars.
            </div>
            <div style={{ display: "flex", justifyContent: "center", marginTop: "16px" }}>
              <button
                className="primary"
                onClick={() => setShowDemoReadyModal(false)}
                style={{ padding: "8px 16px", fontSize: "14px" }}
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="card stack accent-blue">
        <div className="row" style={{ justifyContent: "space-between", marginBottom: "8px" }}>
          <div>
            <h2 style={{ margin: 0 }}>🔍 Research Description</h2>
            <div className="muted">Instructions: Describe your research and submit to the system. → System will try to understand it and ask questions if necessary. → You answer the questions and the system generates new understanding. → Finish this step by clicking 'Use the current understanding'.</div>
          </div>
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
                placeholder="Enter your research description here. Please provide details about your research question, methods, and objectives."
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
                {charLimitHint(researchDescription)}
              </div>
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
                    {textValidateMessages.map((m, idx) => {
                      // Determine background and text color based on status
                      let background = m.role === "user" ? "#e0f2fe" : "#f1f5f9";
                      let textColor = "#1f2937";
                      let borderColor = "rgba(0,0,0,0.06)";
                      
                      if (m.status === "helpful") {
                        background = "#dbeafe";
                        textColor = "#1e40af";
                        borderColor = "#93c5fd";
                      } else if (m.status === "not_helpful") {
                        background = "#fee2e2";
                        textColor = "#dc2626";
                        borderColor = "#fca5a5";
                      } else if (m.status === "error") {
                        background = "#fee2e2";
                        textColor = "#dc2626";
                        borderColor = "#fca5a5";
                      } else if (m.status === "info") {
                        background = "#f0f9ff";
                        textColor = "#0369a1";
                        borderColor = "#7dd3fc";
                      }
                      
                      return (
                      <div
                        key={idx}
                        style={{
                          padding: "10px 12px",
                          borderRadius: 12,
                          whiteSpace: "pre-wrap",
                            background,
                            border: `1px solid ${borderColor}`,
                            color: textColor
                        }}
                      >
                          <div className="muted" style={{ fontSize: 11, marginBottom: 4, color: textColor, opacity: 0.8 }}>
                          {m.role === "user" ? "You" : "System"}
                        </div>
                        <div style={{ fontSize: 13 }}>{m.content || "(empty)"}</div>
                      </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="muted">No messages yet.</div>
                )}
              </div>


              <div className="stack" style={{ gap: 8 }}>
                {parseResult?.plausibility_level === "B_plausible" && parseResult.is_clear_for_search ? (
                  <div className="row" style={{ justifyContent: "center" }}>
                    <button 
                      onClick={onBuildFramework} 
                      disabled={
                        parseCompleted ||
                        busy !== null || 
                        !parseCurrentDescription.trim() || 
                        validateClientInput(parseCurrentDescription.trim()).length > 0
                      } 
                      className="gradient-green"
                    >
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
                        disabled={parseCompleted || parseStage2Locked || busy !== null}
                        placeholder={parseCompleted ? "Parse stage completed. Input disabled." : parseStage2Locked ? `Parse stage2 locked after ${config.parse_stage2_max_total_attempts} attempts.` : "Add details to answer the questions..."}
                        style={{ fontSize: "14px" }}
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
                        {charLimitHint(parseAdditionalInfo)}
                      </div>
                    </div>
                    <div className="row" style={{ justifyContent: "center", gap: 12 }}>
                      <button
                        onClick={() => onParseStage2Submit(parseAdditionalInfo.trim())}
                        disabled={
                          parseCompleted ||
                          parseStage2Locked ||
                          busy !== null ||
                          !parseAdditionalInfo.trim() ||
                          parseAdditionalClientIssues.length > 0 ||
                          parseStage2TotalAttempts >= config.parse_stage2_max_total_attempts
                        }
                        className="gradient-blue"
                      >
                        {busy === "parse" ? "🔄 Parsing…" : "submit"}
                      </button>
                    </div>
                    {parseStage2TotalAttempts > 0 && (
                      <div style={{ 
                        textAlign: "center", 
                        fontSize: 12, 
                        color: "#666",
                        marginTop: -8 
                      }}>
                        Attempts: {parseStage2TotalAttempts}/{config.parse_stage2_max_total_attempts}
                        {parseStage2ConsecutiveFalse > 0 && (
                          <span style={{ color: "#dc2626", marginLeft: 8 }}>
                            (Consecutive unhelpful: {parseStage2ConsecutiveFalse}/{config.parse_stage2_max_consecutive_unhelpful})
                          </span>
                        )}
                      </div>
                    )}
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
                            ? `Input disabled after ${config.text_validation_max_attempts} invalid attempts.`
                            : parseStage1Locked
                              ? `Parse stage1 locked after ${config.parse_stage1_max_attempts} failed attempts.`
                              : "Revise and click parse again..."
                        }
                        style={{ fontSize: "14px" }}
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
                        {charLimitHint(textValidateDraft)}
                      </div>
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
              <div style={{ maxHeight: 400, overflow: "auto" }}>
                {normalizedUnderstandingsHistory.length > 0 ? (
                  <div className="stack" style={{ gap: 12 }}>
                    {normalizedUnderstandingsHistory.map((understanding, idx) => (
                      <div key={idx} style={{ 
                        padding: 12, 
                        background: "#f5f5f5", 
                        borderRadius: 6,
                        border: "1px solid #e5e5e5"
                      }}>
                        <div style={{ fontSize: 11, color: "#666", marginBottom: 6 }}>
                          Version {idx + 1}
                        </div>
                        <div style={{ fontSize: "14px", whiteSpace: "pre-wrap", lineHeight: 1.6 }}>
                          {understanding}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <textarea
                    readOnly
                    rows={12}
                    value={parseCurrentDescription || textValidateLatest}
                    style={{ fontSize: "14px", whiteSpace: "pre-wrap", opacity: 0.95 }}
                  />
                )}
              </div>
              {/* Button to use current understanding and build framework */}
              {parseResult?.is_helpful && (
                <button
                  onClick={onBuildFramework}
                  disabled={parseCompleted || busy !== null || parseStage2Locked}
                  className="gradient-green"
                  style={{ width: "100%" }}
                >
                  {busy === "buildFramework" ? "🔄 Building…" : "Use the current understanding"}
                </button>
              )}
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

      {/* Retrieval Framework area - always shown to indicate next step */}
      {showFrameworkAdjustUI ? (
      <div className="card stack accent-green">
        <div className="row" style={{ justifyContent: "space-between", marginBottom: "8px" }}>
          <div>
              <h2 style={{ margin: 0 }}>🧠 Retrieval Framework (Guide and constrain next literature search step)</h2>
              <div className="muted">Instructions: Review the Retrieval Framework generated by the system. → Tell the system to make adjustment, up to 2 times, using plain English. → Finish this step by clicking 'Use the current framework'.</div>
          </div>
            {frameworkAdjustAttempts > 0 && (
              <span className="badge" style={{ background: "#fef3c7", color: "#92400e" }}>
                {frameworkAdjustAttempts}/{config.retrieval_framework_adjust_max_attempts} adjustments
              </span>
          )}
        </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            {/* Left: Dialogue */}
            <div className="stack" style={{ gap: 12, display: "flex", flexDirection: "column" }}>
              <div
                style={{
                  flex: 1,
                  minHeight: 400,
                  maxHeight: 500,
                  overflow: "auto",
                  border: "1px solid #e5e7eb",
                  borderRadius: 12,
                  padding: 16,
                  background: "#fafafa"
                }}
              >
                {frameworkAdjustMessages.length > 0 ? (
                  <div className="stack" style={{ gap: 12 }}>
                    {frameworkAdjustMessages.map((m, idx) => {
                      const isSystem = m.role === "system";
                      const bg = isSystem
                        ? (m.status === "error" ? "#fee2e2" : m.status === "info" ? "#dbeafe" : "#f3f4f6")
                        : "#ffffff";
                      const borderColor = isSystem
                        ? (m.status === "error" ? "#fecaca" : m.status === "info" ? "#93c5fd" : "#e5e7eb")
                        : "#e5e7eb";
                      const textColor = isSystem && m.status === "error" ? "#991b1b" : "#1f2937";
                      return (
                        <div
                          key={idx}
                          style={{
                            padding: "10px 12px",
                            borderRadius: 12,
                            whiteSpace: "pre-wrap",
                            background: bg,
                            border: `1px solid ${borderColor}`,
                            color: textColor
                          }}
                        >
                          <div className="muted" style={{ fontSize: 11, marginBottom: 4, color: textColor, opacity: 0.8 }}>
                            {m.role === "user" ? "You" : "System"}
                          </div>
                          <div style={{ fontSize: 13 }}>{m.content || "(empty)"}</div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="muted">No messages yet.</div>
                )}
              </div>

              <div className="stack" style={{ gap: 8 }}>
                <div style={{ position: "relative" }}>
                  {frameworkAdjustClientIssues.length ? (
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
                      {frameworkAdjustClientIssues.join(" · ")}
                    </div>
                  ) : null}
        <textarea
                    rows={4}
                    value={frameworkAdjustInput}
                    onChange={(e) => setFrameworkAdjustInput(e.target.value)}
                    disabled={frameworkCompleted || frameworkAdjustLocked || busy !== null}
                    placeholder={
                      frameworkCompleted
                        ? "Framework stage completed. Input disabled."
                        : frameworkAdjustLocked
                        ? `Input disabled after ${config.retrieval_framework_adjust_max_attempts} adjustments.`
                        : "Enter your adjustment request..."
                    }
                    style={{ fontSize: "14px" }}
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
                    {charLimitHint(frameworkAdjustInput)}
                  </div>
                </div>
                <div className="row" style={{ justifyContent: "center", gap: 12, alignItems: "center" }}>
                  <button
                    onClick={onAdjustFramework}
                    disabled={
                      frameworkCompleted ||
                      frameworkAdjustLocked ||
                      busy !== null ||
                      !frameworkAdjustInput.trim() ||
                      frameworkAdjustClientIssues.length > 0 ||
                      frameworkAdjustAttempts >= config.retrieval_framework_adjust_max_attempts
                    }
                    className="gradient-green"
                  >
                    {busy === "adjustFramework" ? "🔄 Adjusting…" : "Submit Adjustment"}
                  </button>
                  <span className="muted" style={{ fontSize: "13px" }}>
                    {frameworkAdjustAttempts}/{config.retrieval_framework_adjust_max_attempts}
                  </span>
                </div>
              </div>
            </div>

            {/* Right: Framework History */}
            <div className="stack" style={{ gap: 12, display: "flex", flexDirection: "column" }}>
              <div className="muted" style={{ fontSize: 13 }}>Latest Retrieval Framework</div>
              <div style={{ flex: 1, overflow: "auto", minHeight: 400, maxHeight: 500 }}>
                {frameworkAdjustHistory.length > 0 ? (
                  <div className="stack" style={{ gap: 12 }}>
                    {frameworkAdjustHistory.map((framework, idx) => (
                      <div key={idx} style={{
                        padding: 12,
                        background: idx === frameworkAdjustHistory.length - 1 ? "#fef3c7" : "#f9fafb",
                        border: `1px solid ${idx === frameworkAdjustHistory.length - 1 ? "#fbbf24" : "#e5e7eb"}`,
                        borderRadius: 8,
                        fontSize: 13,
                        lineHeight: 1.6,
                        whiteSpace: "pre-wrap"
                      }}>
                        <div className="muted" style={{ fontSize: 11, marginBottom: 6 }}>
                          Version {idx + 1} {idx === frameworkAdjustHistory.length - 1 ? "(Latest)" : ""}
                        </div>
                        <div>{framework}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="muted">No framework yet.</div>
                )}
              </div>
        <div className="row" style={{ justifyContent: "center" }}>
                <button onClick={onUseFramework} disabled={frameworkCompleted || busy !== null || !frameworkText.trim()} className="gradient-green">
                  Use the current framework
          </button>
        </div>
      </div>
          </div>
        </div>
      ) : null}

      {!showFrameworkAdjustUI && !frameworkText && (
        <div className="card stack accent-green">
          <div className="row" style={{ justifyContent: "space-between", marginBottom: "8px" }}>
            <div>
              <h2 style={{ margin: 0 }}>🧠 Retrieval Framework</h2>
              <div className="muted">AI-generated search strategy (will be generated after parse stage)</div>
            </div>
          </div>
          <div
            style={{
              padding: "40px 20px",
              textAlign: "center",
              color: "#6b7280",
              fontSize: "14px",
              background: "#f9fafb",
              borderRadius: "8px",
              border: "1px dashed #e5e7eb"
            }}
          >
            Complete the research description parse stage above to generate the retrieval framework.
          </div>
        </div>
      )}

      {frameworkText && (
        <div className="card stack accent-purple">
        <div className="row" style={{ justifyContent: "space-between", marginBottom: "8px" }}>
          <div>
            <h2 style={{ margin: 0 }}>⚙️ Database Queries (Final and actual queries sent to each database for papers retrieval. Not editable.)</h2>
            <div className="muted">Instructions: Search and retrieve papers by clicking 'Execute Query'.</div>
          </div>
          {pubmedQueryText && (
            <span className="badge" style={{ background: "#f3e8ff", color: "#7c3aed" }}>
              ✓ Ready
            </span>
          )}
        </div>
        <textarea
          rows={8}
          value={pubmedQueryText || ""}
            readOnly
          spellCheck={false}
            placeholder={pubmedQueryText ? undefined : "Queries will be generated after clicking 'Use the current framework'"}
            style={{ fontFamily: "inherit", fontSize: "14px", lineHeight: "1.6", background: "#f9fafb", cursor: "default" }}
        />
        <div className="row" style={{ justifyContent: "center" }}>
          <button onClick={onQuery} disabled={hasResults || ingestionCompleted || busy !== null || !pubmedQueryText}>
            {busy === "query" ? "🔄 Executing…" : "🚀 Execute Query"}
          </button>
        </div>
      </div>
      )}

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
              onClick={() => setActiveResultTab("PubMed")}
              isActive={activeResultTab === "PubMed"}
            />
            <MetricCard
              icon="📚"
              label="Semantic Scholar"
              value={s2?.length ?? 0}
              color="green"
              onClick={() => setActiveResultTab("Semantic Scholar")}
              isActive={activeResultTab === "Semantic Scholar"}
            />
            <MetricCard
              icon="🌐"
              label="OpenAlex"
              value={oa?.length ?? 0}
              color="purple"
              onClick={() => setActiveResultTab("OpenAlex")}
              isActive={activeResultTab === "OpenAlex"}
            />
            <MetricCard
              icon="✨"
              label="Aggregated"
              value={agg?.length ?? 0}
              subtitle="Deduplicated by DOI"
              color="orange"
              onClick={() => setActiveResultTab("Aggregated")}
              isActive={activeResultTab === "Aggregated"}
            />
          </div>
        )}

        {renderResults()}
      </div>

      {/* Phase 2: Authorship */}
      <div className="card stack accent-red">
        <div className="row" style={{ justifyContent: "space-between", marginBottom: "12px" }}>
          <div>
            <h2 style={{ margin: 0 }}>👥 Authorship & Geographic Mapping</h2>
            <div className="muted">Instructions: Process all papers, extract author affiliation and aggregate by country/city.</div>
          </div>
          {ingestStats && (
            <span className="badge" style={{ background: "#d1fae5", color: "#059669" }}>
              ✓ Data Available
            </span>
          )}
        </div>

        <div className="row" style={{ justifyContent: "center", gap: 8 }}>
          <button
            onClick={onIngest}
            disabled={ingestionCompleted || busy !== null || !agg?.length}
            style={{ background: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)" }}
          >
            {busy === "ingest" ? "🔄 Mapping..." : ingestionCompleted ? "✓ Mapping Completed" : "⚡ Run Mapping Pipeline"}
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
                icon="👤"
                label="Author"
                value={ingestStats.unique_authors}
                subtitle="Unique authors"
                color="purple"
              />
              <MetricCard
                icon="🌍"
                label="Country"
                value={ingestStats.unique_countries}
                subtitle="Countries"
                color="green"
              />
              <MetricCard
                icon="🏛️"
                label="Institution"
                value={ingestStats.unique_institutions}
                subtitle="Institutions"
                color="orange"
              />
            </div>

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
          </div>
        )}
      </div>

      {/* Interactive Scholar Map */}
      {ingestStats && (
        <div className="card stack accent-blue">
          <div className="row" style={{ justifyContent: "space-between", marginBottom: "12px" }}>
            <div>
              <h2 style={{ margin: 0 }}>🌍 Interactive Scholar Map</h2>
              <div className="muted">Explore geographic distribution with drill-down navigation</div>
            </div>
          </div>
          <div className="row" style={{ justifyContent: "center" }}>
            <button
              onClick={() => setShowMap(true)}
              style={{
                background: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
                fontSize: "15px",
                padding: "14px 24px"
              }}
            >
              🌍 Open Interactive Map
            </button>
          </div>
        </div>
      )}

      {showMap && <MapModal projectId={projectId} runId={runId} onClose={() => setShowMap(false)} />}
      </div>
      </div>

      {isExportMode && (
      <div className="export-only" style={{ display: "block" }}>
        <div className="container stack export-page">
          <div className="card stack">
            <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <h1 style={{ margin: 0 }} className="text-gradient">
                  Run {runId}
                </h1>
                <div className="muted">Exported on {new Date().toLocaleString()}</div>
              </div>
            </div>
          </div>

          <div className="card stack">
            <h2 style={{ margin: 0 }}>🧾 Research Description</h2>
            <div className="muted">Original input and parsing history</div>
            <div
              style={{
                background: "#f8fafc",
                border: "1px solid #e5e7eb",
                borderRadius: "12px",
                padding: "12px 14px",
                whiteSpace: "pre-wrap"
              }}
            >
              {researchDescription || "No research description available."}
            </div>
            <ExportMessageList title="Parse Details" messages={textValidateMessages} />
          </div>

          <div className="card stack">
            <h2 style={{ margin: 0 }}>🧩 Retrieval Framework</h2>
            <div className="muted">Framework output and adjustment history</div>
            <div
              style={{
                background: "#f8fafc",
                border: "1px solid #e5e7eb",
                borderRadius: "12px",
                padding: "12px 14px",
                whiteSpace: "pre-wrap"
              }}
            >
              {frameworkText || "No retrieval framework available."}
            </div>
            <ExportMessageList title="Adjustment Details" messages={frameworkAdjustMessages} />
          </div>

          <div className="card stack">
            <h2 style={{ margin: 0 }}>🧪 Database Queries</h2>
            <div className="muted">Full query strings for each source</div>
            <div className="stack" style={{ gap: 12 }}>
              <div>
                <div style={{ fontWeight: 600 }}>PubMed</div>
                <pre className="export-pre">{queriesObj?.pubmed_full || queriesObj?.pubmed || "N/A"}</pre>
              </div>
              <div>
                <div style={{ fontWeight: 600 }}>Semantic Scholar</div>
                <pre className="export-pre">{queriesObj?.semantic_scholar || "N/A"}</pre>
              </div>
              <div>
                <div style={{ fontWeight: 600 }}>OpenAlex</div>
                <pre className="export-pre">{queriesObj?.openalex || "N/A"}</pre>
              </div>
            </div>
          </div>

          <div className="card stack">
            <h2 style={{ margin: 0 }}>📊 Paper Statistics</h2>
            <div className="muted">Counts by data source</div>
            <div className="row">
              <MetricCard icon="📄" label="PubMed" value={pubmed?.length ?? 0} color="blue" />
              <MetricCard icon="📚" label="Semantic Scholar" value={s2?.length ?? 0} color="green" />
              <MetricCard icon="🌐" label="OpenAlex" value={oa?.length ?? 0} color="purple" />
              <MetricCard icon="✨" label="Aggregated" value={agg?.length ?? 0} color="orange" subtitle="Deduped by DOI" />
            </div>
          </div>

          <div className="card stack">
            <h2 style={{ margin: 0 }}>👥 Authorship & Geographic Mapping</h2>
            <div className="muted">Summary metrics and mapping status</div>
            {ingestStats ? (
              <>
                <div className="row" style={{ marginBottom: "16px" }}>
                  <MetricCard icon="📄" label="Papers" value={ingestStats.papers_parsed} subtitle="Analyzed" color="blue" />
                  <MetricCard icon="👤" label="Author" value={ingestStats.unique_authors} subtitle="Unique authors" color="purple" />
                  <MetricCard icon="🌍" label="Country" value={ingestStats.unique_countries} subtitle="Countries" color="green" />
                  <MetricCard icon="🏛️" label="Institution" value={ingestStats.unique_institutions} subtitle="Institutions" color="orange" />
                </div>
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
              </>
            ) : (
              <div className="muted">No authorship data available.</div>
            )}
          </div>

          <div className="card stack">
            <h2 style={{ margin: 0 }}>🗺️ 2D Scholar Map (Mercator)</h2>
            <div className="muted">Flat projection with scholar counts</div>
            <div style={{ height: 420, borderRadius: 12, overflow: "hidden", border: "1px solid #e5e7eb" }}>
              {mapboxToken ? (
                ingestStats ? (
                  exportMapImage ? (
                    <img
                      src={exportMapImage}
                      alt="2D Scholar Map"
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
                  ) : exportWorldData.length === 0 ? (
                    <div className="muted" style={{ padding: 20 }}>
                      No map data available.
                    </div>
                  ) : (
                    <Map
                      ref={exportMapRef}
                      initialViewState={{ longitude: 0, latitude: 0, zoom: 0.9, pitch: 0, bearing: 0 }}
                      style={{ width: "100%", height: "100%" }}
                      mapStyle="mapbox://styles/mapbox/light-v11"
                      mapboxAccessToken={mapboxToken}
                      interactive={false}
                      preserveDrawingBuffer
                      projection={{ name: "mercator" }}
                      onLoad={() => setExportMapLoaded(true)}
                    >
                      <Source
                        id="export-world-source"
                        type="geojson"
                        data={{
                          type: "FeatureCollection",
                          features: exportWorldData
                            .filter((country) => country.latitude !== null && country.longitude !== null)
                            .map((country) => ({
                              type: "Feature",
                              properties: {
                                count: country.scholar_count,
                                country: country.country
                              },
                              geometry: {
                                type: "Point",
                                coordinates: [country.longitude, country.latitude]
                              }
                            }))
                        }}
                      >
                        <Layer
                          id="export-world-circles"
                          type="circle"
                          paint={{
                            "circle-color": "#2563eb",
                            "circle-opacity": 0.9,
                            "circle-stroke-color": "#1d4ed8",
                            "circle-stroke-width": 1,
                            "circle-radius": [
                              "interpolate",
                              ["linear"],
                              ["get", "count"],
                              1,
                              6,
                              exportMaxCount,
                              28
                            ]
                          }}
                        />
                        <Layer
                          id="export-world-labels"
                          type="symbol"
                          layout={{
                            "text-field": ["get", "count"],
                            "text-size": [
                              "interpolate",
                              ["linear"],
                              ["get", "count"],
                              1,
                              10,
                              exportMaxCount,
                              16
                            ],
                            "text-font": ["Open Sans Bold", "Arial Unicode MS Bold"],
                            "text-allow-overlap": true,
                            "text-ignore-placement": true
                          }}
                          paint={{
                            "text-color": "#ffffff"
                          }}
                        />
                      </Source>
                    </Map>
                  )
                ) : (
                  <div className="muted" style={{ padding: 20 }}>
                    No map data available.
                  </div>
                )
              ) : (
                <div className="muted" style={{ padding: 20 }}>
                  Map requires NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN in .env
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      )}
      <style jsx>{`
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
        .export-only {
          display: none;
        }
        .export-pre {
          background: #f8fafc;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          padding: 12px 14px;
          white-space: pre-wrap;
          font-size: 13px;
        }
        @media print {
          .screen-only {
            display: none !important;
          }
          .export-only {
            display: block !important;
          }
          .export-page {
            padding-top: 24px;
          }
        }
      `}</style>
    </>
  );
}

export default function RunPage() {
  const params = useParams();
  const projectId = params.projectId as string;
  const runId = params.runId as string;
  const [shareAuthCheckEnabled, setShareAuthCheckEnabled] = useState<boolean | null>(null);

  useEffect(() => {
    getConfig()
      .then((cfg) => setShareAuthCheckEnabled(cfg.share_run_auth_check_enabled))
      .catch(() => setShareAuthCheckEnabled(true));
  }, []);

  // Allow public access to demo run
  const isDemoRun = projectId === "6af7ac1b6254" && runId === "53e099cdb74e";
  
  if (isDemoRun) {
    return <RunPageContent />;
  }

  if (shareAuthCheckEnabled === null) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>
        <div className="muted">Loading...</div>
      </div>
    );
  }

  if (!shareAuthCheckEnabled) {
    return <RunPageContent />;
  }
  
  return (
    <AuthGuard>
      <RunPageContent />
    </AuthGuard>
  );
}
