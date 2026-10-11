"use client";

import { memo } from "react";
import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import { Building2, Crown, FileText, MessageSquare, Shield, User } from "lucide-react";
import { cn } from "@/lib/utils";
import type { UserFlowNodeData } from "@/lib/user-flow/types";

const roleBadge = {
  owner: {
    icon: Crown,
    className:
      "bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-200",
    card: "border-amber-200 dark:border-amber-900/60",
  },
  admin: {
    icon: Shield,
    className:
      "bg-violet-100 text-violet-900 dark:bg-violet-950/60 dark:text-violet-200",
    card: "border-violet-200 dark:border-violet-800/60",
  },
  member: {
    icon: User,
    className:
      "bg-teal-100 text-teal-900 dark:bg-teal-950/60 dark:text-teal-200",
    card: "border-teal-200 dark:border-teal-900/60",
  },
} as const;

function BaseNode({
  children,
  className,
  handles = "both",
}: {
  children: React.ReactNode;
  className?: string;
  handles?: "both" | "target" | "source";
}) {
  return (
    <div
      className={cn(
        "rounded-lg border bg-[color:var(--shell-surface)] px-3 py-2 shadow-sm ring-1 ring-[color:var(--shell-sidebar-border)]",
        className
      )}
    >
      {(handles === "both" || handles === "target") && (
        <Handle type="target" position={Position.Top} className="!h-2 !w-2 !border-2 !bg-white" />
      )}
      {children}
      {(handles === "both" || handles === "source") && (
        <Handle type="source" position={Position.Bottom} className="!h-2 !w-2 !border-2 !bg-white" />
      )}
    </div>
  );
}

export const OrgRootNode = memo(function OrgRootNode({
  data,
}: NodeProps<Node<UserFlowNodeData>>) {
  return (
    <BaseNode
      handles="source"
      className="border-indigo-200 bg-indigo-50/80 dark:border-indigo-800/60 dark:bg-indigo-950/40"
    >
      <div className="flex items-start gap-2">
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-indigo-600 text-white">
          <Building2 className="h-4 w-4" aria-hidden />
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-gray-900 dark:text-gray-100">
            {data.label}
          </p>
          <p className="truncate font-mono text-[11px] text-gray-600 dark:text-gray-400">
            {data.slug}
          </p>
          <p className="mt-0.5 text-[10px] font-medium uppercase tracking-wide text-indigo-700 dark:text-indigo-300">
            {data.member_count ?? 0} member{(data.member_count ?? 0) === 1 ? "" : "s"}
          </p>
        </div>
      </div>
    </BaseNode>
  );
});

export const PersonNode = memo(function PersonNode({
  data,
}: NodeProps<Node<UserFlowNodeData>>) {
  const role = data.role ?? "member";
  const badge = roleBadge[role];
  const BadgeIcon = badge.icon;

  return (
    <BaseNode
      className={cn(badge.card, data.is_viewer && "ring-2 ring-indigo-500")}
    >
      <div className="flex items-start gap-2">
        <span
          className={cn(
            "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md",
            badge.className
          )}
        >
          <BadgeIcon className="h-4 w-4" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <p className="truncate text-sm font-semibold text-gray-900 dark:text-gray-100">
              {data.label}
            </p>
            {data.is_viewer ? (
              <span className="shrink-0 rounded-full bg-indigo-100 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-indigo-800 dark:bg-indigo-950/70 dark:text-indigo-200">
                You
              </span>
            ) : null}
          </div>
          <p className="truncate text-[11px] text-gray-600 dark:text-gray-400">
            {data.email}
          </p>
          <span
            className={cn(
              "mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-medium capitalize",
              badge.className
            )}
          >
            {role}
          </span>
          <div className="mt-1 flex gap-3 text-[10px] text-gray-600 dark:text-gray-400">
            <span className="inline-flex items-center gap-1">
              <FileText className="h-3 w-3" aria-hidden />
              {data.documents_count ?? 0} docs
            </span>
            <span className="inline-flex items-center gap-1">
              <MessageSquare className="h-3 w-3" aria-hidden />
              {data.questions_asked ?? 0} questions
            </span>
          </div>
        </div>
      </div>
    </BaseNode>
  );
});

export const userFlowNodeTypes = {
  organization: OrgRootNode,
  person: PersonNode,
};
