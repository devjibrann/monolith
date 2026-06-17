"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  Building2,
  FileText,
  GitBranch,
  Home,
  Loader2,
  LogOut,
  MessageSquare,
  Sparkles,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { navAccent, type NavHref } from "@/lib/ui/nav-colors";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const nav = [
  { name: "Dashboard", href: "/" as NavHref, icon: Home },
  { name: "Organizations", href: "/organizations" as NavHref, icon: Building2 },
  { name: "Org map", href: "/organizations/map" as NavHref, icon: GitBranch },
  { name: "Documents", href: "/documents" as NavHref, icon: FileText },
  { name: "Chat", href: "/chat" as NavHref, icon: MessageSquare },
] as const;

export default function Sidebar() {
  const pathname = usePathname();
  const { user, organizations, currentOrg, setCurrentOrg, signOut } = useAuth();
  const [signingOut, setSigningOut] = useState(false);

  const handleSignOut = async () => {
    if (signingOut) return;
    setSigningOut(true);
    try {
      await signOut();
    } finally {
      setSigningOut(false);
    }
  };

  return (
    <aside
      className="shell-sidebar flex h-screen w-64 shrink-0 flex-col border-r"
      aria-label="Application"
    >
      <div className="border-b border-[color:var(--shell-sidebar-border)] p-4">
        <div className="flex items-center gap-2.5">
          <span
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-indigo-600 text-white shadow-sm ring-1 ring-indigo-500/25 dark:bg-indigo-500"
            aria-hidden
          >
            <Sparkles className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-base font-semibold text-gray-900 dark:text-gray-100">
              AI Workspace
            </p>
            <p
              className="truncate text-xs text-[color:var(--shell-ink-muted)]"
              title={user?.email ?? undefined}
            >
              {user?.email ?? "Signed in"}
            </p>
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-1 p-3" aria-label="Main">
        <p className="px-3 pb-1 text-xs font-medium text-[color:var(--shell-ink-muted)]">
          Workspace
        </p>
        {nav.map((item) => {
          const active = pathname === item.href;
          const Icon = item.icon;
          const accent = navAccent[item.href];
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex min-h-10 items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-[background-color,color,box-shadow] duration-200 ease-[var(--ease-out-quart)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[oklch(0.14_0.02_277)]",
                active
                  ? cn("shadow-sm ring-1", accent.activeBg)
                  : "text-gray-700 hover:bg-[color:var(--shell-accent-soft)] dark:text-gray-300"
              )}
            >
              <Icon
                className={cn(
                  "h-4 w-4 shrink-0",
                  active ? accent.activeIcon : "text-gray-500 dark:text-gray-400"
                )}
                aria-hidden
              />
              {item.name}
            </Link>
          );
        })}
      </nav>

      <div className="space-y-3 border-t border-[color:var(--shell-sidebar-border)] p-4">
        <div className="shell-surface-muted space-y-1.5 rounded-lg p-3 ring-1 ring-[color:var(--shell-sidebar-border)]">
          <label
            htmlFor="sidebar-org"
            className="text-xs font-medium text-gray-800 dark:text-gray-200"
          >
            Organization
          </label>
          {organizations.length === 0 ? (
            <p className="text-xs text-[color:var(--shell-ink-muted)]">
              <Link
                href="/organizations"
                className="font-medium text-indigo-700 underline-offset-2 hover:underline dark:text-indigo-300"
              >
                Create an organization
              </Link>{" "}
              to upload documents.
            </p>
          ) : (
            <select
              id="sidebar-org"
              value={currentOrg?.slug ?? ""}
              disabled={signingOut}
              onChange={(e) => {
                const org = organizations.find((o) => o.slug === e.target.value);
                if (org) setCurrentOrg(org);
              }}
              className="h-10 w-full min-w-0 rounded-md border border-[color:var(--shell-sidebar-border)] bg-[color:var(--shell-surface)] px-3 text-sm text-gray-900 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:text-gray-100"
            >
              {organizations.map((org) => (
                <option key={org.id} value={org.slug}>
                  {org.name}
                </option>
              ))}
            </select>
          )}
        </div>
        <Button
          type="button"
          variant="outline"
          className="w-full gap-2 border-[color:var(--shell-sidebar-border)] bg-[color:var(--shell-surface)] transition-[background-color,transform] duration-200 hover:bg-[color:var(--shell-accent-soft)] active:scale-[0.98] motion-reduce:active:scale-100"
          onClick={() => void handleSignOut()}
          disabled={signingOut}
          aria-busy={signingOut}
        >
          {signingOut ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              Signing out…
            </>
          ) : (
            <>
              <LogOut className="h-4 w-4" aria-hidden />
              Sign out
            </>
          )}
        </Button>
      </div>
    </aside>
  );
}
