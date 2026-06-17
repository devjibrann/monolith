import type { Metadata } from "next";
import { DocumentsView } from "./documents-view";

export const metadata: Metadata = {
  title: "Documents",
  description: "Upload PDF and text files for RAG indexing and chat.",
};

/** Server Component: static shell, SEO metadata, no client JS for the page frame. */
export default function DocumentsPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-balance">Documents</h1>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Upload PDF, TXT, or Markdown files. Text is extracted, embedded, and used in chat.
        </p>
      </header>
      <DocumentsView />
    </div>
  );
}
