// API client for ComplianceIQ backend
export const API_BASE_URL = "http://localhost:8000";

export interface IngestResponse {
  collection_id: string;
  chunk_count?: number;
  rule_count?: number;
  [key: string]: unknown;
}

export interface AuditFinding {
  rule_id: string;
  risk_level: "HIGH" | "MEDIUM" | "LOW" | "PASS";
  conflict_summary: string;
  confidence: number; // 0-100
  rule_description?: string;
  document_excerpt?: string;
  policy_reference?: string;
  full_explanation?: string;
  suggested_action?: string;
}

export interface AuditReport {
  doc_name: string;
  ruleset_name: string;
  compliance_score: number;
  findings: AuditFinding[];
  total_rules: number;
  high_count: number;
  medium_count: number;
  low_count: number;
  pass_count: number;
}

export interface ReasoningStep {
  timestamp: string;
  message: string;
  rules_checked?: number;
  total_rules?: number;
}

export async function ingestDocument(file: File): Promise<IngestResponse> {
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch(
    `${API_BASE_URL}/ingest/document?doc_type=document`,
    { method: "POST", body: fd }
  );
  if (!res.ok) throw new Error(`Document ingest failed: ${res.status} ${res.statusText}`);
  return res.json();
}

export async function ingestRuleset(file: File): Promise<IngestResponse> {
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch(`${API_BASE_URL}/ingest/ruleset`, {
    method: "POST",
    body: fd,
  });
  if (!res.ok) throw new Error(`Ruleset ingest failed: ${res.status} ${res.statusText}`);
  return res.json();
}

export interface RunAuditArgs {
  document_collection_id: string;
  ruleset_collection_id: string;
  doc_name: string;
  ruleset_name: string;
}

/**
 * Runs the audit. Calls POST /audit to start, then connects to GET /audit
 * which streams agent_reasoning_steps as newline-delimited JSON. Each
 * step is passed to onStep; the final aggregated report resolves the promise.
 */
export async function runAudit(
  args: RunAuditArgs,
  onStep: (step: ReasoningStep) => void,
): Promise<AuditReport> {
  const postRes = await fetch(`${API_BASE_URL}/audit`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(args),
  });
  if (!postRes.ok) throw new Error(`Audit start failed: ${postRes.status}`);

  const streamRes = await fetch(`${API_BASE_URL}/audit`, { method: "GET" });
  if (!streamRes.ok || !streamRes.body) {
    throw new Error(`Audit stream failed: ${streamRes.status}`);
  }

  const reader = streamRes.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let finalReport: AuditReport | null = null;

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      try {
        const parsed = JSON.parse(trimmed);
        if (parsed.agent_reasoning_step || parsed.message) {
          onStep({
            timestamp: parsed.timestamp ?? new Date().toISOString(),
            message: parsed.message ?? parsed.agent_reasoning_step,
            rules_checked: parsed.rules_checked,
            total_rules: parsed.total_rules,
          });
        }
        if (parsed.report || parsed.findings) {
          finalReport = (parsed.report ?? parsed) as AuditReport;
        }
      } catch {
        // Non-JSON line — treat as a raw reasoning step
        onStep({ timestamp: new Date().toISOString(), message: trimmed });
      }
    }
  }

  if (!finalReport) throw new Error("Audit completed but no report was returned");
  return finalReport;
}
