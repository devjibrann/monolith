"use client";

import { useCallback, useEffect, useState } from "react";
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
import { ApiError, fetchUserHierarchy } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { layoutUserFlow, userEdgeStyle } from "@/lib/user-flow/layout";
import type { UserFlowNodeData, UserHierarchyResponse } from "@/lib/user-flow/types";
import { userFlowNodeTypes } from "@/components/user-flow/user-flow-nodes";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const legend = [
  { label: "Owner", color: "#b45309" },
  { label: "Admin", color: "#7c3aed" },
  { label: "Member", color: "#0d9488" },
] as const;

function mapHierarchyToFlow(graph: UserHierarchyResponse) {
  const flowNodes: Node<UserFlowNodeData>[] = graph.nodes.map((node) => ({
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
    animated: edge.edge_type === "owner",
    style: userEdgeStyle(edge.edge_type),
  }));

  return {
    nodes: layoutUserFlow(flowNodes, flowEdges),
    edges: flowEdges,
  };
}

export function UserFlowCanvas() {
  const { currentOrg } = useAuth();
  const [nodes, setNodes] = useState<Node<UserFlowNodeData>[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!currentOrg) return;
    setLoading(true);
    setError(null);
    try {
      const graph = await fetchUserHierarchy();
      const flow = mapHierarchyToFlow(graph);
      setNodes(flow.nodes);
      setEdges(flow.edges);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load user hierarchy");
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
      try {
        const graph = await fetchUserHierarchy();
        if (cancelled) return;
        const flow = mapHierarchyToFlow(graph);
        setNodes(flow.nodes);
        setEdges(flow.edges);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof ApiError ? err.message : "Could not load user hierarchy");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [currentOrg]);

  if (!currentOrg) {
    return (
      <div className="rounded-xl border border-dashed border-[color:var(--shell-sidebar-border)] bg-[color:var(--shell-surface-muted)] px-6 py-10 text-center text-sm text-gray-700 dark:text-gray-300">
        Select an organization in the sidebar to see its member hierarchy.
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex h-[min(70vh,720px)] items-center justify-center rounded-xl border border-[color:var(--shell-sidebar-border)] bg-[color:var(--shell-surface)]">
        <span className="inline-flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          Loading user hierarchy…
        </span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-6 text-sm text-red-800 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-200">
        <p>{error}</p>
        <Button type="button" variant="outline" size="sm" className="mt-3" onClick={() => void reload()}>
          Retry
        </Button>
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
        <Button type="button" variant="outline" size="sm" className="gap-2" onClick={() => void reload()}>
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
          nodes={nodes}
          edges={edges}
          nodeTypes={userFlowNodeTypes}
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
        Role hierarchy for <span className="font-medium">{currentOrg.name}</span>: owners on
        top, then admins, then members. Members are distributed across admins for readability.
      </p>
    </div>
  );
}
