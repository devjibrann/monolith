"use client";

import Link from "next/link";
import { Building2, FileText, MessageSquare, User } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const workflowSteps = [
  {
    title: "Upload documents",
    description: "Add PDF, TXT, or Markdown files for your organization to index.",
    href: "/documents",
    icon: FileText,
    surfaceClass: "shell-workflow-docs",
    iconWrap: "bg-emerald-100 text-emerald-800 ring-emerald-200/60 dark:bg-emerald-950/60 dark:text-emerald-200 dark:ring-emerald-800/40",
    linkClass: "text-emerald-800 dark:text-emerald-300",
    label: "Open documents",
  },
  {
    title: "Ask in chat",
    description: "Stream answers grounded in your uploaded content.",
    href: "/chat",
    icon: MessageSquare,
    surfaceClass: "shell-workflow-chat",
    iconWrap: "bg-sky-100 text-sky-900 ring-sky-200/60 dark:bg-sky-950/60 dark:text-sky-200 dark:ring-sky-800/40",
    linkClass: "text-sky-800 dark:text-sky-300",
    label: "Open chat",
  },
  {
    title: "Manage organizations",
    description: "Create workspaces and switch the active tenant for uploads and chat.",
    href: "/organizations",
    icon: Building2,
    surfaceClass: "shell-workflow-orgs",
    iconWrap: "bg-violet-100 text-violet-900 ring-violet-200/60 dark:bg-violet-950/60 dark:text-violet-200 dark:ring-violet-800/40",
    linkClass: "text-violet-800 dark:text-violet-300",
    label: "Open organizations",
  },
] as const;

export default function DashboardPage() {
  const { user, currentOrg } = useAuth();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header className="shell-dashboard-hero rounded-xl px-5 py-4 ring-1 ring-[color:var(--shell-sidebar-border)]">
        <h1 className="text-2xl font-semibold text-balance text-gray-900 dark:text-gray-100">
          Dashboard
        </h1>
        <p className="mt-1 text-sm text-[color:var(--shell-ink-muted)]">
          Your workspace overview and next steps for RAG chat.
        </p>
        {currentOrg ? (
          <p className="mt-3 inline-flex items-center gap-2 rounded-full bg-[color:var(--shell-accent-soft)] px-3 py-1 text-xs font-medium text-indigo-900 ring-1 ring-indigo-200/60 dark:text-indigo-100 dark:ring-indigo-800/50">
            <span className="h-1.5 w-1.5 rounded-full bg-indigo-600 dark:bg-indigo-400" aria-hidden />
            Active: {currentOrg.name}
          </p>
        ) : (
          <p className="mt-3 inline-flex items-center gap-2 rounded-full bg-[color:var(--shell-warn-soft)] px-3 py-1 text-xs font-medium text-amber-950 ring-1 ring-amber-200/70 dark:text-amber-100 dark:ring-amber-800/50">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-600 dark:bg-amber-400" aria-hidden />
            No organization selected
          </p>
        )}
      </header>

      <Card className="shell-surface border shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Session</CardTitle>
          <CardDescription>Current user and organization</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex items-start gap-3 rounded-lg bg-[color:var(--shell-surface-muted)] p-3 ring-1 ring-[color:var(--shell-sidebar-border)]">
            <span
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-indigo-100 text-indigo-800 ring-1 ring-indigo-200/70 dark:bg-indigo-950/70 dark:text-indigo-200 dark:ring-indigo-800/50"
              aria-hidden
            >
              <User className="h-4 w-4" />
            </span>
            <div>
              <p className="text-xs font-medium text-[color:var(--shell-ink-muted)]">Signed in as</p>
              <p className="font-medium text-gray-900 dark:text-gray-100">{user?.email}</p>
            </div>
          </div>
          <div className="flex items-start gap-3 rounded-lg bg-[color:var(--shell-surface-muted)] p-3 ring-1 ring-[color:var(--shell-sidebar-border)]">
            <span
              className={cn(
                "flex h-9 w-9 shrink-0 items-center justify-center rounded-md ring-1",
                currentOrg
                  ? "bg-violet-100 text-violet-800 ring-violet-200/70 dark:bg-violet-950/70 dark:text-violet-200 dark:ring-violet-800/50"
                  : "bg-amber-100 text-amber-900 ring-amber-200/70 dark:bg-amber-950/50 dark:text-amber-200 dark:ring-amber-800/50"
              )}
              aria-hidden
            >
              <Building2 className="h-4 w-4" />
            </span>
            <div>
              <p className="text-xs font-medium text-[color:var(--shell-ink-muted)]">
                Active organization
              </p>
              {currentOrg ? (
                <>
                  <p className="font-medium text-gray-900 dark:text-gray-100">{currentOrg.name}</p>
                  <p className="font-mono text-xs text-indigo-800 dark:text-indigo-200">
                    {currentOrg.slug}
                  </p>
                </>
              ) : (
                <p className="text-amber-950 dark:text-amber-100">
                  None selected.{" "}
                  <Link
                    href="/organizations"
                    className="font-medium text-indigo-700 underline-offset-2 hover:underline dark:text-indigo-300"
                  >
                    Create an organization
                  </Link>
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <section aria-labelledby="workflow-heading">
        <h2
          id="workflow-heading"
          className="mb-3 text-sm font-semibold text-gray-900 dark:text-gray-100"
        >
          Workflow
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {workflowSteps.map((step) => {
            const Icon = step.icon;
            return (
              <Link
                key={step.href}
                href={step.href}
                className={cn(
                  "group flex flex-col gap-3 rounded-lg p-4 ring-1 transition-[background-color,box-shadow] duration-200 ease-[var(--ease-out-quart)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[oklch(0.12_0.015_277)]",
                  step.surfaceClass
                )}
              >
                <span
                  className={cn(
                    "inline-flex h-10 w-10 items-center justify-center rounded-md ring-1 ring-inset ring-black/5 dark:ring-white/10",
                    step.iconWrap
                  )}
                  aria-hidden
                >
                  <Icon className="h-5 w-5" />
                </span>
                <div>
                  <p className="font-semibold text-gray-900 dark:text-gray-100">{step.title}</p>
                  <p className="mt-1 text-sm text-gray-700 dark:text-gray-300">{step.description}</p>
                </div>
                <span className={cn("text-sm font-medium group-hover:underline", step.linkClass)}>
                  {step.label}
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      {!currentOrg && (
        <p
          role="status"
          className="rounded-lg bg-[color:var(--shell-warn-soft)] px-4 py-3 text-sm text-amber-950 ring-1 ring-amber-200/80 dark:text-amber-100 dark:ring-amber-800/50"
        >
          Select or create an organization before uploading documents or using chat.
        </p>
      )}
    </div>
  );
}
