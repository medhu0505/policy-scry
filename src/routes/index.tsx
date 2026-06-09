import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useState } from "react";
import { toast, Toaster } from "sonner";
import { ShieldCheck, Play } from "lucide-react";
import { UploadZone } from "@/components/UploadZone";
import { AuditRunning } from "@/components/AuditRunning";
import { AuditReportView } from "@/components/AuditReportView";
import {
  ingestDocument,
  ingestRuleset,
  runAudit,
  type AuditReport,
  type ReasoningStep,
} from "@/lib/api";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ComplianceIQ — Automated Compliance Audits" },
      {
        name: "description",
        content:
          "Upload a policy document and ruleset, then run explainable AI-driven compliance audits with live agent reasoning.",
      },
      { property: "og:title", content: "ComplianceIQ — Automated Compliance Audits" },
      {
        property: "og:description",
        content:
          "Upload a policy document and ruleset, then run explainable AI-driven compliance audits with live agent reasoning.",
      },
    ],
  }),
  component: ComplianceIQ,
});

type View = "upload" | "running" | "report";
type Status =
  | "Waiting for documents..."
  | "Ingesting document..."
  | "Ingesting ruleset..."
  | "Ready to audit"
  | "Running audit..."
  | "Audit complete";

interface IngestState {
  file: File | null;
  collectionId: string | null;
  meta: string | null;
  uploading: boolean;
}

const emptyIngest: IngestState = {
  file: null,
  collectionId: null,
  meta: null,
  uploading: false,
};

function ComplianceIQ() {
  const [view, setView] = useState<View>("upload");
  const [doc, setDoc] = useState<IngestState>(emptyIngest);
  const [rules, setRules] = useState<IngestState>(emptyIngest);
  const [status, setStatus] = useState<Status>("Waiting for documents...");
  const [steps, setSteps] = useState<ReasoningStep[]>([]);
  const [rulesChecked, setRulesChecked] = useState(0);
  const [totalRules, setTotalRules] = useState(0);
  const [report, setReport] = useState<AuditReport | null>(null);

  const computeStatus = (d: IngestState, r: IngestState): Status => {
    if (d.uploading) return "Ingesting document...";
    if (r.uploading) return "Ingesting ruleset...";
    if (d.collectionId && r.collectionId) return "Ready to audit";
    return "Waiting for documents...";
  };

  const handleDoc = useCallback(async (file: File) => {
    setDoc({ file, collectionId: null, meta: null, uploading: true });
    setStatus("Ingesting document...");
    try {
      const res = await ingestDocument(file);
      const meta =
        res.chunk_count != null ? `${res.chunk_count} chunks` : "Ingested";
      setDoc((prev) => {
        const next = { ...prev, collectionId: res.collection_id, meta, uploading: false };
        setStatus(computeStatus(next, rules));
        return next;
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to ingest document");
      setDoc(emptyIngest);
      setStatus("Waiting for documents...");
    }
  }, [rules]);

  const handleRules = useCallback(async (file: File) => {
    setRules({ file, collectionId: null, meta: null, uploading: true });
    setStatus("Ingesting ruleset...");
    try {
      const res = await ingestRuleset(file);
      const meta = res.rule_count != null ? `${res.rule_count} rules` : "Ingested";
      setRules((prev) => {
        const next = { ...prev, collectionId: res.collection_id, meta, uploading: false };
        setStatus(computeStatus(doc, next));
        return next;
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to ingest ruleset");
      setRules(emptyIngest);
      setStatus("Waiting for documents...");
    }
  }, [doc]);

  const handleRemoveDoc = useCallback(() => {
    setDoc(emptyIngest);
    setStatus(computeStatus(emptyIngest, rules));
  }, [rules]);

  const handleRemoveRules = useCallback(() => {
    setRules(emptyIngest);
    setStatus(computeStatus(doc, emptyIngest));
  }, [doc]);

  const canRun = !!(doc.collectionId && rules.collectionId) && !doc.uploading && !rules.uploading;

  const handleRun = async () => {
    if (!doc.collectionId || !rules.collectionId || !doc.file || !rules.file) return;
    setView("running");
    setStatus("Running audit...");
    setSteps([]);
    setRulesChecked(0);
    setTotalRules(0);

    try {
      const finalReport = await runAudit(
        {
          document_collection_id: doc.collectionId,
          ruleset_collection_id: rules.collectionId,
          doc_name: doc.file.name,
          ruleset_name: rules.file.name,
        },
        (step) => {
          setSteps((s) => [...s, step]);
          if (typeof step.rules_checked === "number") setRulesChecked(step.rules_checked);
          if (typeof step.total_rules === "number") setTotalRules(step.total_rules);
        },
      );
      setReport(finalReport);
      setStatus("Audit complete");
      setView("report");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Audit failed");
      setView("upload");
      setStatus(computeStatus(doc, rules));
    }
  };

  const handleNewAudit = () => {
    setDoc(emptyIngest);
    setRules(emptyIngest);
    setSteps([]);
    setReport(null);
    setRulesChecked(0);
    setTotalRules(0);
    setStatus("Waiting for documents...");
    setView("upload");
  };

  return (
    <>
      <Toaster
        theme="dark"
        position="bottom-right"
        toastOptions={{
          style: {
            background: "var(--surface-elevated)",
            border: "1px solid color-mix(in oklab, var(--danger) 50%, transparent)",
            color: "var(--foreground)",
            fontFamily: "var(--font-mono)",
            fontSize: "12px",
          },
        }}
      />
      {view === "upload" && (
        <UploadView
          doc={doc}
          rules={rules}
          status={status}
          canRun={canRun}
          onDoc={handleDoc}
          onRules={handleRules}
          onRun={handleRun}
          onRemoveDoc={handleRemoveDoc}
          onRemoveRules={handleRemoveRules}
        />
      )}
      {view === "running" && (
        <AuditRunning
          docName={doc.file?.name ?? "document"}
          rulesetName={rules.file?.name ?? "ruleset"}
          steps={steps}
          rulesChecked={rulesChecked}
          totalRules={totalRules}
        />
      )}
      {view === "report" && report && (
        <AuditReportView report={report} onNewAudit={handleNewAudit} />
      )}
    </>
  );
}

function UploadView({
  doc,
  rules,
  status,
  canRun,
  onDoc,
  onRules,
  onRun,
  onRemoveDoc,
  onRemoveRules,
}: {
  doc: IngestState;
  rules: IngestState;
  status: Status;
  canRun: boolean;
  onDoc: (f: File) => void;
  onRules: (f: File) => void;
  onRun: () => void;
  onRemoveDoc: () => void;
  onRemoveRules: () => void;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-8 py-12">
      <div className="w-full max-w-5xl">
        {/* Brand header */}
        <div className="mb-10 flex flex-col items-center text-center">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded border border-cyan/40 bg-cyan/10 text-cyan">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div className="text-mono text-xl font-bold uppercase tracking-[0.25em] text-foreground">
              Compliance<span className="text-cyan">IQ</span>
            </div>
          </div>
          <p className="mt-4 max-w-xl text-sm text-muted-foreground">
            Upload a policy document and ruleset to run an explainable compliance audit.
            Each finding includes the source excerpt, risk classification, and remediation guidance.
          </p>
        </div>

        {/* Upload zones */}
        <div className="grid grid-cols-2 gap-6">
          <UploadZone
            label="Compliance Document"
            description="PDF, DOCX, or TXT — the policy or contract to audit"
            accept=".pdf,.docx,.txt"
            icon="doc"
            file={doc.file}
            meta={doc.meta}
            uploading={doc.uploading}
            onFile={onDoc}
            onRemove={onRemoveDoc}
          />
          <UploadZone
            label="Ruleset"
            description="JSON file containing the rules to enforce"
            accept=".json,application/json"
            icon="rules"
            file={rules.file}
            meta={rules.meta}
            uploading={rules.uploading}
            onFile={onRules}
            onRemove={onRemoveRules}
          />
        </div>

        {/* Run button */}
        <div className="mt-8 flex flex-col items-center gap-4">
          <button
            onClick={onRun}
            disabled={!canRun}
            className={[
              "text-mono inline-flex items-center justify-center gap-2 rounded px-10 py-4",
              "text-sm font-bold uppercase tracking-[0.2em] transition-all duration-500",
              canRun
                ? "bg-cyan text-primary-foreground glow-cyan hover:brightness-110"
                : "cursor-not-allowed border border-border bg-surface/40 text-muted-foreground opacity-50",
            ].join(" ")}
          >
            <Play className="h-4 w-4" />
            Run Compliance Audit
          </button>

          <div className="text-mono flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
            <span
              className={[
                "inline-block h-1.5 w-1.5 rounded-full",
                status === "Ready to audit"
                  ? "bg-success"
                  : "bg-cyan animate-status-pulse",
              ].join(" ")}
            />
            <span>{status}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
