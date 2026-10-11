"use client";

import { UserFlowCanvas } from "@/components/user-flow/user-flow-canvas";

export default function UserHierarchyPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-balance">User hierarchy</h1>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Interactive map of members in the active organization, grouped by role, with
          each person&apos;s document and chat activity.
        </p>
      </div>

      <UserFlowCanvas />
    </div>
  );
}
