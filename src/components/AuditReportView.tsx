import { useState } from "react";
import { X, FileWarning, ShieldCheck, RotateCcw } from "lucide-react";
import type { AuditFinding, AuditReport } from "@/lib/api";
import { CountUp } from "./CountUp";

type Risk = AuditFinding["risk_level"];

const RISK_STYLES: Record<Risk, { pill: string; bar: string; label: string }> = {
  HIGH: {
    pill: "bg-danger/15 text-danger border border-danger/40",
    bar: "bg-danger",
    label: "HIGH",
  },
  MEDIUM: {
    pill: "bg-warning/15 text-warning border border-warning/40",
    bar: "bg-warning",
    label: "MEDIUM",
  },
  LOW: {
    pill: "bg-low/15 text-low border border-low/40",
    bar: "bg-low",
    label: "LOW",
  },
  PASS: {
    pill: "bg-success/15 text-success border border-success/40",
    bar: "bg-success",
    label: "PASS",
  },
};

function scoreColor(score: number) {
  if (score >= 85) return "text-success";
  if (score >= 65) return "text-warning";
  return "text-danger";
}

interface Props {
  report: AuditReport;
  onNewAudit: () => void;
}

export function AuditReportView({ report, onNewAudit }: Props) {
  const [selected, setSelected] = useState<AuditFinding | null>(null);

  return (
    <div className="min-h-screen px-8 py-8">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <div className="text-mono text-xs uppercase tracking-[0.2em] text-cyan">
            Audit Report
          </div>
          <h1 className="mt-2 text-2xl font-semibold text-foreground">
            <span className="text-mono">{report.doc_name}</span>{" "}
            <span className="text-muted-foreground">vs</span>{" "}
            <span className="text-mono">{report.ruleset_name}</span>
          </h1>
        </div>
        <button
          onClick={onNewAudit}
          className="text-mono inline-flex items-center gap-2 rounded border border-cyan/40 bg-cyan/5 px-4 py-2 text-xs uppercase tracking-wider text-cyan transition-colors hover:bg-cyan/15"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Run New Audit
        </button>
      </div>

      {/* Summary cards */}
      <div className="mb-6 grid grid-cols-4 gap-4">
        <MetricCard
          label="Compliance Score"
          value={report.compliance_score}
          format={(n) => `${Math.round(n)}%`}
          valueClass={`text-4xl ${scoreColor(report.compliance_score)}`}
        />
        <MetricCard label="High Violations" value={report.high_count} valueClass="text-4xl text-danger" />
        <MetricCard label="Medium" value={report.medium_count} valueClass="text-4xl text-warning" />
        <MetricCard label="Low" value={report.low_count} valueClass="text-4xl text-low" />
      </div>

      <div className="grid grid-cols-5 gap-4">
        {/* Table */}
        <div className="col-span-3 rounded-lg border border-border bg-surface/40">
          <div className="text-mono border-b border-border px-5 py-3 text-xs uppercase tracking-wider text-muted-foreground">
            Findings ({report.findings.length})
          </div>
          {report.findings.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-6 py-16 text-center">
              <ShieldCheck className="h-10 w-10 text-success" />
              <div className="text-mono text-sm text-foreground">No findings returned</div>
              <div className="text-xs text-muted-foreground">
                The audit completed without producing any rule evaluations.
              </div>
            </div>
          ) : (
            <div className="scrollbar-thin max-h-[calc(100vh-22rem)] overflow-y-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-mono sticky top-0 bg-surface text-[10px] uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-normal">Rule ID</th>
                    <th className="px-4 py-3 font-normal">Risk</th>
                    <th className="px-4 py-3 font-normal">Conflict Summary</th>
                    <th className="px-4 py-3 font-normal w-32">Confidence</th>
                    <th className="px-4 py-3 font-normal w-20">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {report.findings.map((f, i) => {
                    const styles = RISK_STYLES[f.risk_level] ?? RISK_STYLES.LOW;
                    const isSel = selected?.rule_id === f.rule_id;
                    return (
                      <tr
                        key={`${f.rule_id}-${i}`}
                        onClick={() => setSelected(f)}
                        className={[
                          "group cursor-pointer border-t border-border/60 transition-colors",
                          "hover:bg-cyan/5 hover:[box-shadow:inset_3px_0_0_0_var(--cyan)]",
                          isSel ? "bg-cyan/5 [box-shadow:inset_3px_0_0_0_var(--cyan)]" : "",
                        ].join(" ")}
                      >
                        <td className="text-mono px-4 py-3 text-xs text-cyan">{f.rule_id}</td>
                        <td className="px-4 py-3">
                          <span className={`text-mono inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] uppercase tracking-wider ${styles.pill}`}>
                            {styles.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-foreground/90">
                          <div className="line-clamp-2">{f.conflict_summary}</div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-background">
                              <div
                                className={`h-full ${styles.bar}`}
                                style={{ width: `${Math.max(0, Math.min(100, f.confidence))}%` }}
                              />
                            </div>
                            <span className="text-mono w-9 text-right text-[11px] text-muted-foreground">
                              {Math.round(f.confidence)}%
                            </span>
                          </div>
                        </td>
                        <td className="text-mono px-4 py-3 text-[11px] uppercase tracking-wider text-cyan opacity-0 transition-opacity group-hover:opacity-100">
                          View →
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Detail drawer */}
        <div className="col-span-2">
          {selected ? (
            <DetailDrawer
              key={selected.rule_id}
              finding={selected}
              onClose={() => setSelected(null)}
            />
          ) : (
            <div className="flex h-full min-h-[400px] flex-col items-center justify-center rounded-lg border border-dashed border-border bg-surface/30 px-6 text-center">
              <FileWarning className="mb-3 h-8 w-8 text-muted-foreground" />
              <div className="text-mono text-xs uppercase tracking-wider text-muted-foreground">
                Select a finding
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                Click any row to inspect the rule, document excerpt, and suggested remediation.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  valueClass,
  format,
}: {
  label: string;
  value: number;
  valueClass: string;
  format?: (n: number) => string;
}) {
  return (
    <div className="rounded-lg border border-border bg-surface/60 px-5 py-4">
      <div className="text-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </div>
      <div className={`text-mono mt-2 font-bold leading-none ${valueClass}`}>
        <CountUp value={value} format={format} />
      </div>
    </div>
  );
}

function DetailDrawer({
  finding,
  onClose,
}: {
  finding: AuditFinding;
  onClose: () => void;
}) {
  const styles = RISK_STYLES[finding.risk_level] ?? RISK_STYLES.LOW;
  return (
    <div className="animate-slide-in-right scrollbar-thin max-h-[calc(100vh-12rem)] overflow-y-auto rounded-lg border border-border bg-surface/60">
      <div className="sticky top-0 flex items-center justify-between border-b border-border bg-surface/95 px-5 py-3 backdrop-blur">
        <div className="flex items-center gap-3">
          <span className={`text-mono inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] uppercase tracking-wider ${styles.pill}`}>
            {styles.label}
          </span>
          <span className="text-mono text-xs text-cyan">{finding.rule_id}</span>
        </div>
        <button
          onClick={onClose}
          className="rounded p-1 text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
          aria-label="Close detail"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="space-y-5 px-5 py-5 text-sm">
        <Section label="Rule Description">
          <p className="text-foreground/90">
            {finding.rule_description ?? "No rule description provided."}
          </p>
        </Section>

        <Section label="Document Excerpt">
          {finding.document_excerpt ? (
            <pre className="text-mono whitespace-pre-wrap rounded border-l-2 border-cyan bg-background/80 px-4 py-3 text-[12px] leading-relaxed text-foreground/90">
              {finding.document_excerpt}
            </pre>
          ) : (
            <p className="text-xs text-muted-foreground">No excerpt captured for this finding.</p>
          )}
        </Section>

        {finding.policy_reference && (
          <Section label="Policy Reference">
            <p className="text-mono text-xs text-cyan">{finding.policy_reference}</p>
          </Section>
        )}

        <Section label="Conflict Explanation">
          <p className="text-foreground/90">
            {finding.full_explanation ?? finding.conflict_summary}
          </p>
        </Section>

        <Section label="Suggested Action">
          <p className="text-foreground/90">
            {finding.suggested_action ?? "No remediation action provided."}
          </p>
        </Section>

        <Section label="Confidence">
          <div className="flex items-center gap-3">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-background">
              <div className={`h-full ${styles.bar}`} style={{ width: `${finding.confidence}%` }} />
            </div>
            <span className="text-mono text-xs text-foreground">
              {Math.round(finding.confidence)}%
            </span>
          </div>
        </Section>
      </div>
    </div>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-mono mb-2 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </div>
      {children}
    </div>
  );
}
