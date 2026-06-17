"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { OrgFlowCanvas } from "@/components/org-flow/org-flow-canvas";
import { cn } from "@/lib/utils";

const tabs = [
  { href: "/organizations", label: "List" },
  { href: "/organizations/map", label: "Hierarchy map" },
] as const;

export default function OrganizationMapPage() {
  const pathname = usePathname();

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-balance">Organization hierarchy</h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Interactive map of organizations, members, and documents you can access.
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

      <OrgFlowCanvas />
    </div>
  );
}
