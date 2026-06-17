"use client";

import { memo } from "react";
import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import { Building2, FileText, User, Users } from "lucide-react";
import { DocumentStatusBadge } from "@/components/documents/status-badge";
import { cn } from "@/lib/utils";
import type { OrgFlowNodeData } from "@/lib/org-flow/types";

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

export const UserFlowNode = memo(function UserFlowNode({
  data,
}: NodeProps<Node<OrgFlowNodeData>>) {
  return (
    <BaseNode handles="source" className="border-indigo-200 bg-indigo-50/80 dark:border-indigo-800/60 dark:bg-indigo-950/40">
      <div className="flex items-start gap-2">
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-indigo-600 text-white">
          <User className="h-4 w-4" aria-hidden />
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-gray-900 dark:text-gray-100">{data.label}</p>
          <p className="truncate text-xs text-gray-600 dark:text-gray-400">{data.email}</p>
          {data.subtitle ? (
            <p className="mt-0.5 text-[10px] font-medium uppercase tracking-wide text-indigo-700 dark:text-indigo-300">
              {data.subtitle}
            </p>
          ) : null}
        </div>
      </div>
    </BaseNode>
  );
});

export const OrganizationFlowNode = memo(function OrganizationFlowNode({
  data,
  selected,
}: NodeProps<Node<OrgFlowNodeData>>) {
  return (
    <BaseNode
      className={cn(
        "border-violet-200 dark:border-violet-800/60",
        selected && "ring-2 ring-violet-500"
      )}
    >
      <div className="flex items-start gap-2">
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-violet-100 text-violet-800 ring-1 ring-violet-200/70 dark:bg-violet-950/70 dark:text-violet-200">
          <Building2 className="h-4 w-4" aria-hidden />
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-gray-900 dark:text-gray-100">{data.label}</p>
          <p className="truncate font-mono text-[11px] text-gray-600 dark:text-gray-400">{data.slug}</p>
          <div className="mt-1 flex flex-wrap gap-1">
            {data.role ? (
              <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-medium capitalize text-violet-900 dark:bg-violet-950/60 dark:text-violet-100">
                {data.role}
              </span>
            ) : null}
            {data.parent_id ? (
              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-700 dark:bg-gray-900 dark:text-gray-300">
                child org
              </span>
            ) : null}
          </div>
        </div>
      </div>
    </BaseNode>
  );
});

export const MemberFlowNode = memo(function MemberFlowNode({
  data,
}: NodeProps<Node<OrgFlowNodeData>>) {
  return (
    <BaseNode className="border-teal-200 dark:border-teal-900/60">
      <div className="flex items-start gap-2">
        <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-teal-100 text-teal-800 dark:bg-teal-950/60 dark:text-teal-200">
          <Users className="h-3.5 w-3.5" aria-hidden />
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">{data.label}</p>
          <p className="truncate text-[11px] text-gray-600 dark:text-gray-400">{data.email}</p>
          {data.role ? (
            <p className="mt-0.5 text-[10px] capitalize text-teal-800 dark:text-teal-300">{data.role}</p>
          ) : null}
        </div>
      </div>
    </BaseNode>
  );
});

export const DocumentFlowNode = memo(function DocumentFlowNode({
  data,
}: NodeProps<Node<OrgFlowNodeData>>) {
  const status = data.status as "pending" | "processing" | "ready" | "failed" | undefined;

  return (
    <BaseNode handles="target" className="border-emerald-200 dark:border-emerald-900/60">
      <div className="flex items-start gap-2">
        <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-200">
          <FileText className="h-3.5 w-3.5" aria-hidden />
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">{data.label}</p>
          {data.filename ? (
            <p className="truncate text-[11px] text-gray-600 dark:text-gray-400">{data.filename}</p>
          ) : null}
          {status ? (
            <div className="mt-1">
              <DocumentStatusBadge status={status} />
            </div>
          ) : null}
        </div>
      </div>
    </BaseNode>
  );
});

export const orgFlowNodeTypes = {
  user: UserFlowNode,
  organization: OrganizationFlowNode,
  member: MemberFlowNode,
  document: DocumentFlowNode,
};
