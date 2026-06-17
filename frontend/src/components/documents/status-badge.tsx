"use client";

import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Loader2,
} from "lucide-react";
import type { DocumentRecord } from "@/lib/api";
import { cn } from "@/lib/utils";

type DocStatus = DocumentRecord["status"];

const config: Record<
  DocStatus,
  { label: string; className: string; icon: typeof CheckCircle2; pulse?: boolean }
> = {
  ready: {
    label: "Ready",
    className:
      "bg-green-50 text-green-800 ring-green-200/80 dark:bg-green-950/50 dark:text-green-300 dark:ring-green-800/60",
    icon: CheckCircle2,
  },
  pending: {
    label: "Pending",
    className:
      "bg-amber-50 text-amber-900 ring-amber-200/80 dark:bg-amber-950/40 dark:text-amber-200 dark:ring-amber-800/50",
    icon: Clock,
    pulse: true,
  },
  processing: {
    label: "Processing",
    className:
      "bg-blue-50 text-blue-900 ring-blue-200/80 dark:bg-blue-950/40 dark:text-blue-200 dark:ring-blue-800/50",
    icon: Loader2,
  },
  failed: {
    label: "Failed",
    className:
      "bg-red-50 text-red-800 ring-red-200/80 dark:bg-red-950/40 dark:text-red-300 dark:ring-red-800/50",
    icon: AlertCircle,
  },
};

export function DocumentStatusBadge({ status }: { status: DocStatus }) {
  const { label, className, icon: Icon, pulse } = config[status];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset transition-colors duration-200",
        className,
        pulse && "doc-status-pulse"
      )}
    >
      <Icon
        className={cn("h-3.5 w-3.5", status === "processing" && "animate-spin")}
        aria-hidden
      />
      {label}
    </span>
  );
}
