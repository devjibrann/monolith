"use client";

import { FileText } from "lucide-react";
import type { ChatSource } from "@/lib/api";
import { cn } from "@/lib/utils";

export function ChatSources({
  sources,
  className,
}: {
  sources: ChatSource[];
  className?: string;
}) {
  if (!sources.length) return null;

  return (
    <div
      className={cn(
        "mt-3 space-y-2 border-t border-gray-200/80 pt-3 dark:border-gray-800",
        className
      )}
    >
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
        Sources
      </p>
      <ul className="space-y-2">
        {sources.map((source, index) => (
          <li
            key={`${source.document_id}-${index}`}
            className="rounded-lg bg-gray-50 px-3 py-2 text-xs ring-1 ring-gray-200/80 dark:bg-gray-900/60 dark:ring-gray-800"
          >
            <div className="mb-1 flex items-center gap-2 text-gray-700 dark:text-gray-300">
              <FileText className="h-3.5 w-3.5 shrink-0" aria-hidden />
              <span className="font-medium truncate">{source.document_title}</span>
              <span className="ml-auto shrink-0 rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-medium text-sky-900 dark:bg-sky-950/60 dark:text-sky-200">
                {source.match}
              </span>
            </div>
            <p className="line-clamp-2 text-gray-600 dark:text-gray-400">{source.content}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
