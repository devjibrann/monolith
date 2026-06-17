"use client";

import { FormEvent, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Building2, Check, Loader2 } from "lucide-react";
import { ApiError } from "@/lib/api";
import { createOrganization, useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const tabs = [
  { href: "/organizations", label: "List" },
  { href: "/organizations/map", label: "Hierarchy map" },
] as const;

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export default function OrganizationsPage() {
  const pathname = usePathname();
  const { organizations, currentOrg, refreshOrganizations, setCurrentOrg } = useAuth();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [parentId, setParentId] = useState<string>("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const parentOptions = useMemo(
    () =>
      organizations.filter(
        (org) => org.role === "owner" || org.role === "admin"
      ),
    [organizations]
  );

  const handleNameChange = (value: string) => {
    setName(value);
    if (!slugTouched) setSlug(slugify(value));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);
    try {
      const org = await createOrganization(
        name.trim(),
        slug.trim(),
        parentId ? Number(parentId) : undefined
      );
      await refreshOrganizations();
      setCurrentOrg(org);
      setName("");
      setSlug("");
      setParentId("");
      setSlugTouched(false);
      setSuccess(`Created ${org.name}. It is now your active organization.`);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Could not create organization");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-balance">Organizations</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Create teams and switch the active org from the sidebar or below.
          </p>
        </div>
        <nav className="inline-flex rounded-lg bg-[color:var(--shell-surface-muted)] p-1 ring-1 ring-[color:var(--shell-sidebar-border)]">
          {tabs.map((tab) => {
            const active = pathname === tab.href;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={cn(
                  "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-[color:var(--shell-surface)] text-gray-900 shadow-sm ring-1 ring-[color:var(--shell-sidebar-border)] dark:text-gray-100"
                    : "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
                )}
                aria-current={active ? "page" : undefined}
              >
                {tab.label}
              </Link>
            );
          })}
        </nav>
      </div>

      {success && (
        <p
          role="status"
          className="doc-error-enter rounded-md bg-green-50 px-3 py-2 text-sm text-green-800 ring-1 ring-green-200/80 dark:bg-green-950/40 dark:text-green-200 dark:ring-green-800/50"
        >
          {success}
        </p>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Your organizations</CardTitle>
        </CardHeader>
        <CardContent>
          {organizations.length === 0 ? (
            <p className="text-sm text-gray-600 dark:text-gray-400">
              No organizations yet. Create one below to upload documents and use chat.
            </p>
          ) : (
            <ul className="divide-y divide-gray-200 dark:divide-gray-800">
              {organizations.map((org, index) => {
                const isActive = currentOrg?.id === org.id;
                return (
                  <li
                    key={org.id}
                    className={cn(
                      "flex flex-wrap items-center justify-between gap-3 py-3 doc-row-enter",
                      isActive &&
                        "rounded-md bg-indigo-50/80 -mx-2 px-2 dark:bg-indigo-950/30"
                    )}
                    style={{ "--i": index } as React.CSSProperties}
                  >
                    <div className="flex min-w-0 items-start gap-3">
                      <span
                        className={cn(
                          "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-md ring-1 ring-inset",
                          isActive
                            ? "bg-indigo-100 text-indigo-700 ring-indigo-200/80 dark:bg-indigo-950 dark:text-indigo-200 dark:ring-indigo-800/60"
                            : "bg-gray-100 text-gray-600 ring-gray-200/80 dark:bg-gray-900 dark:text-gray-400 dark:ring-gray-700/60"
                        )}
                        aria-hidden
                      >
                        <Building2 className="h-4 w-4" />
                      </span>
                      <div className="min-w-0">
                        <p className="font-medium truncate">{org.name}</p>
                        <p className="font-mono text-xs text-gray-600 dark:text-gray-400 truncate">
                          {org.slug}
                          {org.parent_id ? " · child org" : ""}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {isActive ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-medium text-indigo-900 ring-1 ring-indigo-200/80 dark:bg-indigo-950/60 dark:text-indigo-100 dark:ring-indigo-800/50">
                          <Check className="h-3.5 w-3.5" aria-hidden />
                          Active
                        </span>
                      ) : (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentOrg(org)}
                          className="transition-colors duration-200"
                        >
                          Use organization
                        </Button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Create organization</CardTitle>
          <CardDescription>
            The slug is sent as <span className="font-mono text-gray-700 dark:text-gray-300">X-Organization-Slug</span> on API requests.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <p
              role="alert"
              className="doc-error-enter mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-800 ring-1 ring-red-200/80 dark:bg-red-950/40 dark:text-red-300 dark:ring-red-800/50"
            >
              {error}
            </p>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="Acme Research"
                required
                disabled={loading}
                autoComplete="organization"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="slug">Slug</Label>
              <Input
                id="slug"
                value={slug}
                onChange={(e) => {
                  setSlugTouched(true);
                  setSlug(slugify(e.target.value));
                }}
                placeholder="acme-research"
                required
                disabled={loading}
                spellCheck={false}
                className="font-mono"
              />
              {slug ? (
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  API header value:{" "}
                  <span className="font-mono text-gray-800 dark:text-gray-200">{slug}</span>
                </p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="parent">Parent organization (optional)</Label>
              <select
                id="parent"
                value={parentId}
                onChange={(e) => setParentId(e.target.value)}
                disabled={loading || parentOptions.length === 0}
                className="h-10 w-full rounded-md border border-[color:var(--shell-sidebar-border)] bg-[color:var(--shell-surface)] px-3 text-sm text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:text-gray-100"
              >
                <option value="">None (top-level)</option>
                {parentOptions.map((org) => (
                  <option key={org.id} value={org.id}>
                    {org.name}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                Child orgs appear under their parent on the hierarchy map. Requires admin or owner on the parent.
              </p>
            </div>
            <Button
              type="submit"
              disabled={loading || !name.trim() || !slug.trim()}
              className="transition-transform duration-150 ease-[var(--ease-out-quart)] active:scale-[0.98] motion-reduce:transition-none motion-reduce:active:scale-100"
            >
              {loading ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  Creating organization…
                </span>
              ) : (
                "Create organization"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
