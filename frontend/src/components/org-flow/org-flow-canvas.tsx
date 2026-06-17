"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  type Edge,
  type Node,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Loader2, RefreshCw } from "lucide-react";
import { ApiError, fetchOrgHierarchy } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { edgeStyle, layoutOrgFlow } from "@/lib/org-flow/layout";
import type { OrgFlowNodeData } from "@/lib/org-flow/types";
import { orgFlowNodeTypes } from "@/components/org-flow/org-flow-nodes";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const legend = [
  { label: "Membership", color: "#4f46e5" },
  { label: "Parent org", color: "#7c3aed" },
  { label: "Member", color: "#0d9488" },
  { label: "Document", color: "#059669" },
] as const;

export function OrgFlowCanvas() {
  const { organizations, currentOrg, setCurrentOrg } = useAuth();
  const [nodes, setNodes] = useState<Node<OrgFlowNodeData>[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const graph = await fetchOrgHierarchy();
      const flowNodes: Node<OrgFlowNodeData>[] = graph.nodes.map((node) => ({
        id: node.id,
        type: node.type,
        data: node.data,
        position: { x: 0, y: 0 },
      }));
      const flowEdges: Edge[] = graph.edges.map((edge) => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        type: "smoothstep",
        animated: edge.edge_type === "parent",
        data: { edgeType: edge.edge_type },
        style: edgeStyle(edge.edge_type),
      }));

      setNodes(layoutOrgFlow(flowNodes, flowEdges));
      setEdges(flowEdges);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load organization map");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load, organizations.length]);

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node<OrgFlowNodeData>) => {
      if (node.type !== "organization" || !node.data.slug) return;
      const org = organizations.find((o) => o.slug === node.data.slug);
      if (org) setCurrentOrg(org);
    },
    [organizations, setCurrentOrg]
  );

  const activeOrgId = currentOrg?.id;

  const highlightedNodes = useMemo(
    () =>
      nodes.map((node) => {
        if (node.type !== "organization" || !activeOrgId) return node;
        const org = organizations.find((o) => o.slug === node.data.slug);
        if (!org || org.id !== activeOrgId) return node;
        return {
          ...node,
          selected: true,
        };
      }),
    [nodes, organizations, activeOrgId]
  );

  if (loading) {
    return (
      <div className="flex h-[min(70vh,720px)] items-center justify-center rounded-xl border border-[color:var(--shell-sidebar-border)] bg-[color:var(--shell-surface)]">
        <span className="inline-flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          Loading organization map…
        </span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-6 text-sm text-red-800 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-200">
        <p>{error}</p>
        <Button type="button" variant="outline" size="sm" className="mt-3" onClick={() => void load()}>
          Retry
        </Button>
      </div>
    );
  }

  if (nodes.length <= 1) {
    return (
      <div className="rounded-xl border border-dashed border-[color:var(--shell-sidebar-border)] bg-[color:var(--shell-surface-muted)] px-6 py-10 text-center">
        <p className="text-sm text-gray-700 dark:text-gray-300">
          Create an organization to see your workspace hierarchy here.
        </p>
        <Link
          href="/organizations"
          className="mt-4 inline-flex h-9 items-center justify-center rounded-md bg-indigo-600 px-3 text-sm font-medium text-white hover:bg-indigo-700"
        >
          Create organization
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-3 text-xs text-gray-600 dark:text-gray-400">
          {legend.map((item) => (
            <span key={item.label} className="inline-flex items-center gap-1.5">
              <span className="h-2 w-6 rounded-full" style={{ backgroundColor: item.color }} aria-hidden />
              {item.label}
            </span>
          ))}
        </div>
        <Button type="button" variant="outline" size="sm" className="gap-2" onClick={() => void load()}>
          <RefreshCw className="h-3.5 w-3.5" aria-hidden />
          Refresh
        </Button>
      </div>

      <div
        className={cn(
          "h-[min(70vh,720px)] overflow-hidden rounded-xl border border-[color:var(--shell-sidebar-border)]",
          "bg-[color:var(--shell-surface-muted)]"
        )}
      >
        <ReactFlow
          nodes={highlightedNodes}
          edges={edges}
          nodeTypes={orgFlowNodeTypes}
          onNodeClick={onNodeClick}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          minZoom={0.2}
          maxZoom={1.5}
          proOptions={{ hideAttribution: true }}
        >
          <Background gap={20} size={1} color="var(--shell-sidebar-border)" />
          <Controls showInteractive={false} />
          <MiniMap
            nodeStrokeWidth={2}
            pannable
            zoomable
            className="!bg-[color:var(--shell-surface)]"
          />
        </ReactFlow>
      </div>

      <p className="text-xs text-gray-600 dark:text-gray-400">
        Click an organization node to set it as active. Child orgs link to parents when{" "}
        <span className="font-mono">parent_id</span> is set at creation time.
      </p>
    </div>
  );
}
