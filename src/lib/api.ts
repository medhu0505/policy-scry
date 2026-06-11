export const API_BASE_URL = "http://4.31.212.69:8000";

export interface IngestResponse {
  collection_id: string;
  chunk_count?: number;
  rule_count?: number;
  doc_name?: string;
  [key: string]: unknown;
}

export interface AuditFinding {
  rule_id: string;
  risk_level: "HIGH" | "MEDIUM" | "LOW" | "PASS";
  conflict_summary: string;
  confidence: number;
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
  agent_reasoning_steps?: string[];
  elapsed_seconds?: number;
  model_used?: string;
}

export interface ReasoningStep {
  timestamp: string;
  message: string;
}

export async function ingestDocument(file: File): Promise<IngestResponse> {
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch(`${API_BASE_URL}/ingest/document?doc_type=document`, {
    method: "POST",
    body: fd,
  });
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

export async function runAudit(
  args: RunAuditArgs,
  onStep: (step: ReasoningStep) => void,
): Promise<AuditReport> {
  const res = await fetch(`${API_BASE_URL}/audit`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(args),
  });
  if (!res.ok) throw new Error(`Audit failed: ${res.status}`);
  const data = await res.json();

  if (data.agent_reasoning_steps) {
    for (const step of data.agent_reasoning_steps) {
      onStep({ timestamp: new Date().toISOString(), message: step });
    }
  }

  return {
    doc_name: data.doc_name,
    ruleset_name: data.ruleset_name,
    compliance_score: data.summary?.overall_compliance_score ?? 0,
    total_rules: data.summary?.total_rules_checked ?? 0,
    high_count: data.summary?.violations_high ?? 0,
    medium_count: data.summary?.violations_medium ?? 0,
    low_count: data.summary?.violations_low ?? 0,
    pass_count: data.summary?.rules_passed ?? 0,
    findings: (data.violations ?? []).map((v: any) => ({
      rule_id: v.rule_id,
      risk_level: v.risk_level,
      conflict_summary: v.conflict_explanation,
      confidence: Math.round(v.confidence_score * 100),
      rule_description: v.rule_description,
      document_excerpt: v.document_excerpt,
      policy_reference: v.policy_reference,
      full_explanation: v.conflict_explanation,
      suggested_action: v.suggested_action,
    })),
    agent_reasoning_steps: data.agent_reasoning_steps,
    elapsed_seconds: data.elapsed_seconds,
    model_used: data.model_used,
  };
}
