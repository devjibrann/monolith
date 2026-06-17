import { FileText, MessageSquareText } from "lucide-react";
import Link from "next/link";

export function ChatEmptyState({ orgName }: { orgName: string }) {
  return (
    <div className="chat-empty-enter flex flex-col items-center justify-center px-6 py-16 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 ring-1 ring-indigo-100 dark:bg-indigo-950/50 dark:text-indigo-300 dark:ring-indigo-900/60">
        <MessageSquareText className="h-7 w-7" aria-hidden />
      </div>
      <h2 className="text-lg font-semibold text-balance text-gray-900 dark:text-gray-100">
        Ask your workspace
      </h2>
      <p className="mt-2 max-w-sm text-sm leading-relaxed text-gray-600 dark:text-gray-400">
        Answers use documents uploaded to <span className="font-medium">{orgName}</span>.
        Upload PDF, TXT, or Markdown first for grounded replies.
      </p>
      <Link
        href="/documents"
        className="mt-6 inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium transition-colors hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-900 dark:hover:bg-gray-800"
      >
        <FileText className="h-4 w-4" aria-hidden />
        Go to documents
      </Link>
    </div>
  );
}
