import { Check, ListChecks, Loader2 } from "lucide-react";
import type { AgentStep } from "@/lib/api";
import { cn } from "@/lib/utils";

const STEP_LABEL: Record<AgentStep["step"], string> = {
  plan: "Plan",
  ground: "Ground",
  synthesize: "Synthesize",
};

export function ChatAgentSteps({
  steps,
  className,
}: {
  steps: AgentStep[];
  className?: string;
}) {
  if (steps.length === 0) return null;

  // Keep only the latest event per pipeline step, in first-seen order.
  const latest = new Map<AgentStep["step"], AgentStep>();
  for (const step of steps) latest.set(step.step, step);

  return (
    <div
      className={cn(
        "rounded-xl border border-indigo-200/70 bg-indigo-50/50 px-4 py-3 dark:border-indigo-900/50 dark:bg-indigo-950/20",
        className
      )}
      aria-label="Agent pipeline progress"
    >
      <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-indigo-800 dark:text-indigo-300">
        <ListChecks className="h-3.5 w-3.5" aria-hidden />
        Agent pipeline
      </p>
      <ol className="space-y-2">
        {[...latest.values()].map((step) => (
          <li key={step.step} className="flex items-start gap-2 text-sm">
            <span
              className={cn(
                "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full",
                step.status === "done"
                  ? "bg-indigo-600 text-white"
                  : "text-indigo-700 dark:text-indigo-300"
              )}
              aria-hidden
            >
              {step.status === "done" ? (
                <Check className="h-3 w-3" />
              ) : (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              )}
            </span>
            <div className="min-w-0">
              <span className="font-medium text-gray-900 dark:text-gray-100">
                {STEP_LABEL[step.step] ?? step.step}
              </span>
              <p className="whitespace-pre-wrap text-xs text-gray-600 dark:text-gray-400">
                {step.detail}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
