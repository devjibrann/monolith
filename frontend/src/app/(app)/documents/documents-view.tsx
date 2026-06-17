"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import {
  ApiError,
  type DocumentRecord,
  fetchDocuments,
  uploadDocument,
} from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { DOCUMENT_UPLOAD } from "@/lib/documents/constants";
import { validateDocumentFile } from "@/lib/documents/validate-file";
import { DocumentStatusBadge } from "@/components/documents/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

function LibrarySkeleton() {
  return (
    <ul className="divide-y divide-gray-200 dark:divide-gray-800" aria-hidden>
      {[0, 1, 2].map((i) => (
        <li key={i} className="space-y-2 py-3" style={{ "--i": i } as React.CSSProperties}>
          <div className="doc-skeleton-line w-2/5 max-w-xs" />
          <div className="doc-skeleton-line w-3/5 max-w-sm opacity-80" />
        </li>
      ))}
    </ul>
  );
}

export function DocumentsView() {
  const { currentOrg } = useAuth();
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [listLoading, setListLoading] = useState(true);
  const [highlightedIds, setHighlightedIds] = useState<Set<number>>(new Set());
  const knownIdsRef = useRef<Set<number>>(new Set());
  const listReadyRef = useRef(false);

  const load = useCallback(async () => {
    if (!currentOrg) return;
    const docs = await fetchDocuments();
    setDocuments(docs);

    if (listReadyRef.current) {
      const added = docs.filter((d) => !knownIdsRef.current.has(d.id)).map((d) => d.id);
      if (added.length > 0) {
        setHighlightedIds(new Set(added));
        window.setTimeout(() => setHighlightedIds(new Set()), 1000);
      }
    }
    knownIdsRef.current = new Set(docs.map((d) => d.id));
    listReadyRef.current = true;
  }, [currentOrg]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setListLoading(true);
      try {
        await load();
      } catch {
        if (!cancelled) setError("Could not load documents");
      } finally {
        if (!cancelled) setListLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [load]);

  useEffect(() => {
    const processing = documents.some(
      (d) => d.status === "pending" || d.status === "processing"
    );
    if (!processing || !currentOrg) return;

    const interval = window.setInterval(() => {
      void load();
    }, 4000);

    return () => window.clearInterval(interval);
  }, [documents, currentOrg, load]);

  function handleFileChange(next: File | null) {
    setFile(next);
    if (!next) return;
    const result = validateDocumentFile(next);
    if (!result.ok) {
      setError(result.message);
      setFile(null);
      const input = document.getElementById("file") as HTMLInputElement | null;
      if (input) input.value = "";
    } else {
      setError(null);
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!file || !title.trim()) {
      setError("Title and file are required");
      return;
    }

    const validation = validateDocumentFile(file);
    if (!validation.ok) {
      setError(validation.message);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await uploadDocument(title.trim(), file);
      setTitle("");
      setFile(null);
      const input = document.getElementById("file") as HTMLInputElement | null;
      if (input) input.value = "";
      await load();
    } catch (err) {
      if (err instanceof ApiError) setError(err.message);
      else setError("Upload failed");
    } finally {
      setLoading(false);
    }
  }

  if (!currentOrg) {
    return (
      <p className="text-sm text-gray-600 dark:text-gray-400">
        Select an organization to upload documents.
      </p>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Upload</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Q1 roadmap notes"
                disabled={loading}
                className="transition-[box-shadow,border-color] duration-200 focus-visible:ring-indigo-500/40"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="file">File</Label>
              <Input
                id="file"
                type="file"
                accept={DOCUMENT_UPLOAD.accept}
                onChange={(e) => handleFileChange(e.target.files?.[0] ?? null)}
                disabled={loading}
                className="transition-opacity duration-200 file:transition-colors file:duration-200"
              />
              <p className="text-xs text-gray-600 dark:text-gray-400">
                {DOCUMENT_UPLOAD.humanLabel} up to{" "}
                {DOCUMENT_UPLOAD.maxBytes / (1024 * 1024)} MB. PDFs must contain selectable text.
              </p>
            </div>
            {error && (
              <p
                role="alert"
                className="doc-error-enter text-sm text-red-600 dark:text-red-400"
              >
                {error}
              </p>
            )}
            <Button
              type="submit"
              disabled={loading || !file || !title.trim()}
              className="transition-transform duration-150 ease-[var(--ease-out-quart)] active:scale-[0.98] motion-reduce:transition-none motion-reduce:active:scale-100"
            >
              {loading ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  Uploading…
                </span>
              ) : (
                "Upload document"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Your documents</CardTitle>
        </CardHeader>
        <CardContent>
          {listLoading ? (
            <LibrarySkeleton />
          ) : documents.length === 0 ? (
            <p className="text-sm text-gray-600 dark:text-gray-400">
              No documents yet. Upload a PDF or text file above to index it for chat.
            </p>
          ) : (
            <ul className="divide-y divide-gray-200 dark:divide-gray-800">
              {documents.map((doc, index) => (
                <li
                  key={doc.id}
                  className={cn(
                    "flex items-center justify-between gap-4 py-3 doc-row-enter",
                    highlightedIds.has(doc.id) && "doc-row-highlight -mx-2 px-2"
                  )}
                  style={{ "--i": index } as React.CSSProperties}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium truncate">{doc.title}</p>
                      {doc.owned_by_current_user === false ? (
                        <span className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                          shared
                        </span>
                      ) : null}
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-400 truncate">
                      {doc.filename ?? "—"}
                      {doc.processing_error ? (
                        <span className="text-red-600 dark:text-red-400">
                          {" "}
                          · {doc.processing_error}
                        </span>
                      ) : null}
                    </p>
                  </div>
                  <DocumentStatusBadge status={doc.status} />
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </>
  );
}
