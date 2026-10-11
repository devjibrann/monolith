"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  Download,
  FileJson,
  FileSpreadsheet,
  Loader2,
  MessageSquare,
  RefreshCw,
  Users,
} from "lucide-react";
import {
  ApiError,
  type ChatObservations,
  downloadChatReport,
  fetchChatObservations,
} from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

function formatDateTime(iso: string | null) {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(iso));
  } catch {
    return "—";
  }
}

function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs font-medium text-gray-600 dark:text-gray-400">{label}</p>
        <p className="mt-1 text-2xl font-semibold text-gray-900 dark:text-gray-100">
          {value}
        </p>
        {hint ? (
          <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{hint}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}

function ActivityChart({ perDay }: { perDay: ChatObservations["per_day"] }) {
  const max = Math.max(
    1,
    ...perDay.map((d) => d.user_messages + d.assistant_messages)
  );

  if (perDay.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">
        No chat activity in this window yet.
      </p>
    );
  }

  return (
    <div className="flex h-40 items-end gap-1.5" role="img" aria-label="Daily chat volume">
      {perDay.map((day) => {
        const total = day.user_messages + day.assistant_messages;
        const userPct = (day.user_messages / max) * 100;
        const assistantPct = (day.assistant_messages / max) * 100;
        return (
          <div
            key={day.day}
            className="group relative flex flex-1 flex-col justify-end gap-px"
            title={`${day.day}: ${day.user_messages} questions, ${day.assistant_messages} answers`}
          >
            <div
              className="rounded-t-sm bg-indigo-500/90"
              style={{ height: `${assistantPct}%`, minHeight: total > 0 ? 2 : 0 }}
            />
            <div
              className="rounded-b-sm bg-sky-400/90"
              style={{ height: `${userPct}%`, minHeight: total > 0 ? 2 : 0 }}
            />
          </div>
        );
      })}
    </div>
  );
}

export default function ReportsPage() {
  const { currentOrg } = useAuth();
  const [observations, setObservations] = useState<ChatObservations | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [forbidden, setForbidden] = useState(false);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const isPrivileged = currentOrg?.role === "admin" || currentOrg?.role === "owner";

  const load = useCallback(async () => {
    if (!currentOrg) return;
    setLoading(true);
    setError(null);
    setForbidden(false);
    try {
      setObservations(await fetchChatObservations(30));
    } catch (err) {
      if (err instanceof ApiError && err.status === 403) {
        setForbidden(true);
      } else {
        setError(err instanceof ApiError ? err.message : "Could not load chat observations");
      }
    } finally {
      setLoading(false);
    }
  }, [currentOrg]);

  useEffect(() => {
    if (!currentOrg) return;
    let cancelled = false;

    void (async () => {
      setLoading(true);
      setError(null);
      setForbidden(false);
      try {
        const data = await fetchChatObservations(30);
        if (cancelled) return;
        setObservations(data);
      } catch (err) {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 403) {
          setForbidden(true);
        } else {
          setError(err instanceof ApiError ? err.message : "Could not load chat observations");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [currentOrg]);

  async function handleDownload(
    format: "csv" | "json",
    scope: "self" | "organization"
  ) {
    const key = `${scope}-${format}`;
    setDownloading(key);
    setDownloadError(null);
    try {
      await downloadChatReport(format, scope);
    } catch (err) {
      setDownloadError(
        err instanceof ApiError ? err.message : "Download failed"
      );
    } finally {
      setDownloading(null);
    }
  }

  const downloads = useMemo(
    () =>
      [
        {
          scope: "self" as const,
          title: "My chat history",
          description: "Every message you exchanged in this organization.",
          enabled: true,
        },
        {
          scope: "organization" as const,
          title: "Organization-wide chats",
          description: "All members' conversations. Admins and owners only.",
          enabled: isPrivileged,
        },
      ] satisfies {
        scope: "self" | "organization";
        title: string;
        description: string;
        enabled: boolean;
      }[],
    [isPrivileged]
  );

  if (!currentOrg) {
    return (
      <div className="mx-auto max-w-6xl">
        <div className="rounded-xl border border-dashed border-[color:var(--shell-sidebar-border)] bg-[color:var(--shell-surface-muted)] px-6 py-10 text-center text-sm text-gray-700 dark:text-gray-300">
          Select an organization in the sidebar to view reports.
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-balance">Chat reports</h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Download chat transcripts and observe conversation activity in{" "}
            <span className="font-medium">{currentOrg.name}</span>.
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" className="gap-2" onClick={() => void load()}>
          <RefreshCw className="h-3.5 w-3.5" aria-hidden />
          Refresh
        </Button>
      </div>

      <section aria-labelledby="downloads-heading" className="space-y-3">
        <h2 id="downloads-heading" className="flex items-center gap-2 text-base font-semibold">
          <Download className="h-4 w-4 text-indigo-600 dark:text-indigo-400" aria-hidden />
          Download chats
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {downloads.map((item) => (
            <Card key={item.scope} className={cn(!item.enabled && "opacity-60")}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">{item.title}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-xs text-gray-600 dark:text-gray-400">{item.description}</p>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    disabled={!item.enabled || downloading !== null}
                    onClick={() => void handleDownload("csv", item.scope)}
                  >
                    {downloading === `${item.scope}-csv` ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                    ) : (
                      <FileSpreadsheet className="h-3.5 w-3.5" aria-hidden />
                    )}
                    CSV
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    disabled={!item.enabled || downloading !== null}
                    onClick={() => void handleDownload("json", item.scope)}
                  >
                    {downloading === `${item.scope}-json` ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                    ) : (
                      <FileJson className="h-3.5 w-3.5" aria-hidden />
                    )}
                    JSON
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        {downloadError ? (
          <p className="text-sm text-red-700 dark:text-red-300">{downloadError}</p>
        ) : null}
      </section>

      <section aria-labelledby="observations-heading" className="space-y-3">
        <h2 id="observations-heading" className="flex items-center gap-2 text-base font-semibold">
          <BarChart3 className="h-4 w-4 text-indigo-600 dark:text-indigo-400" aria-hidden />
          Chat observations
          <span className="text-xs font-normal text-gray-500 dark:text-gray-400">
            last 30 days
          </span>
        </h2>

        {loading ? (
          <div className="flex items-center justify-center rounded-xl border border-[color:var(--shell-sidebar-border)] bg-[color:var(--shell-surface)] py-16">
            <span className="inline-flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              Loading observations…
            </span>
          </div>
        ) : forbidden ? (
          <div className="rounded-xl border border-dashed border-[color:var(--shell-sidebar-border)] bg-[color:var(--shell-surface-muted)] px-6 py-10 text-center text-sm text-gray-700 dark:text-gray-300">
            Chat observations are visible to organization admins and owners only.
          </div>
        ) : error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-6 text-sm text-red-800 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-200">
            <p>{error}</p>
            <Button type="button" variant="outline" size="sm" className="mt-3" onClick={() => void load()}>
              Retry
            </Button>
          </div>
        ) : observations ? (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard
                label="Total messages"
                value={observations.totals.total_messages}
                hint={`${observations.totals.user_messages} questions · ${observations.totals.assistant_messages} answers`}
              />
              <StatCard
                label="Active users"
                value={observations.totals.active_users}
                hint="Users who chatted at least once"
              />
              <StatCard
                label="Avg question length"
                value={`${Math.round(observations.totals.avg_user_message_length)} ch`}
                hint={`Answers avg ${Math.round(observations.totals.avg_assistant_message_length)} ch`}
              />
              <StatCard
                label="Last activity"
                value={formatDateTime(observations.totals.last_message_at)}
                hint={`First: ${formatDateTime(observations.totals.first_message_at)}`}
              />
            </div>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Daily volume</CardTitle>
              </CardHeader>
              <CardContent>
                <ActivityChart perDay={observations.per_day} />
                <div className="mt-3 flex gap-4 text-xs text-gray-600 dark:text-gray-400">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-2 w-4 rounded-full bg-sky-400/90" aria-hidden />
                    Questions
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-2 w-4 rounded-full bg-indigo-500/90" aria-hidden />
                    Answers
                  </span>
                </div>
              </CardContent>
            </Card>

            <div className="grid gap-4 lg:grid-cols-2">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <Users className="h-4 w-4 text-gray-500" aria-hidden />
                    Activity by member
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {observations.per_user.length === 0 ? (
                    <p className="py-6 text-center text-sm text-gray-500 dark:text-gray-400">
                      No member activity yet.
                    </p>
                  ) : (
                    <ul className="divide-y divide-[color:var(--shell-sidebar-border)]">
                      {observations.per_user.map((row) => (
                        <li key={row.user_id} className="flex items-center justify-between gap-3 py-2.5">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">
                              {row.email}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              Last active {formatDateTime(row.last_active_at)}
                            </p>
                          </div>
                          <span className="shrink-0 rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-200">
                            {row.questions_asked} question{row.questions_asked === 1 ? "" : "s"}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <MessageSquare className="h-4 w-4 text-gray-500" aria-hidden />
                    Most cited documents
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {observations.top_sources.length === 0 ? (
                    <p className="py-6 text-center text-sm text-gray-500 dark:text-gray-400">
                      No document citations yet.
                    </p>
                  ) : (
                    <ul className="divide-y divide-[color:var(--shell-sidebar-border)]">
                      {observations.top_sources.map((source) => (
                        <li
                          key={source.document_title}
                          className="flex items-center justify-between gap-3 py-2.5"
                        >
                          <p className="min-w-0 truncate text-sm text-gray-900 dark:text-gray-100">
                            {source.document_title}
                          </p>
                          <span className="shrink-0 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-200">
                            {source.citations} citation{source.citations === 1 ? "" : "s"}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
}
