/** Shared document upload rules (keep in sync with backend DocumentTextExtractor). */
export const DOCUMENT_UPLOAD = {
  extensions: [".txt", ".md", ".markdown", ".pdf"] as const,
  mimeTypes: [
    "text/plain",
    "text/markdown",
    "application/pdf",
  ] as const,
  accept:
    ".txt,.md,.markdown,.pdf,text/plain,text/markdown,application/pdf",
  humanLabel: "PDF, TXT, or Markdown",
  maxBytes: 20 * 1024 * 1024, // 20 MB
} as const;
