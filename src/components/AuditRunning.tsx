import { useEffect, useRef } from "react";
import type { ReasoningStep } from "@/lib/api";

interface Props {
  docName: string;
  rulesetName: string;
  steps: ReasoningStep[];
  rulesChecked: number;
  totalRules: number;
}

function formatTime(iso: string) {
  try {
    const d = new Date(iso);
    return d.toTimeString().slice(0, 8);
  } catch {
    return "--:--:--";
  }
}

export function AuditRunning({
  docName,
  rulesetName,
  steps,
  rulesChecked,
  totalRules,
}: Props) {
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [steps.length]);

  const pct = totalRules > 0 ? Math.min(100, (rulesChecked / totalRules) * 100) : 0;

  return (
    <div className="mx-auto flex min-h-screen max-w-5xl flex-col gap-6 px-8 py-12">
      <div>
        <div className="text-mono text-xs uppercase tracking-[0.2em] text-cyan">
          Audit In Progress
        </div>
        <h1 className="mt-2 text-2xl font-semibold text-foreground">
          Analyzing{" "}
          <span className="text-mono text-cyan">{docName}</span>{" "}
          against{" "}
          <span className="text-mono text-cyan">{rulesetName}</span>
        </h1>
      </div>

      <div
        ref={logRef}
        className="scrollbar-thin h-[420px] overflow-y-auto rounded-lg border border-border bg-background/80 p-5"
      >
        <div className="text-mono space-y-1.5 text-[13px] leading-relaxed">
          {steps.length === 0 ? (
            <div className="text-muted-foreground">
              <span className="text-cyan">▶</span> Initializing audit agent…
              <span className="ml-1 inline-block h-3 w-1.5 animate-blink bg-cyan align-middle" />
            </div>
          ) : (
            steps.map((s, i) => (
              <div key={i} className="flex gap-3">
                <span className="shrink-0 text-muted-foreground">
                  [{formatTime(s.timestamp)}]
                </span>
                <span className="shrink-0 text-cyan">▶</span>
                <span className="text-foreground/90">{s.message}</span>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="space-y-2">
        <div className="text-mono flex justify-between text-xs uppercase tracking-wider text-muted-foreground">
          <span>
            Rules checked:{" "}
            <span className="text-foreground">
              {rulesChecked}
              {totalRules > 0 ? ` / ${totalRules}` : ""}
            </span>
          </span>
          <span className="text-cyan">{pct.toFixed(0)}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full border border-border bg-background">
          <div
            className="h-full bg-cyan transition-all duration-500 ease-out"
            style={{
              width: `${pct}%`,
              boxShadow: "0 0 12px color-mix(in oklab, var(--cyan) 60%, transparent)",
            }}
          />
        </div>
      </div>
    </div>
  );
}
