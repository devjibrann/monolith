import dagre from "@dagrejs/dagre";
import type { Edge, Node } from "@xyflow/react";
import { NODE_SIZE, type OrgFlowNodeData, type OrgFlowNodeType } from "./types";

export function layoutOrgFlow(
  nodes: Node<OrgFlowNodeData>[],
  edges: Edge[]
): Node<OrgFlowNodeData>[] {
  const graph = new dagre.graphlib.Graph();
  graph.setDefaultEdgeLabel(() => ({}));
  graph.setGraph({ rankdir: "TB", nodesep: 48, ranksep: 72, marginx: 24, marginy: 24 });

  nodes.forEach((node) => {
    const type = (node.type ?? "organization") as OrgFlowNodeType;
    const size = NODE_SIZE[type] ?? NODE_SIZE.organization;
    graph.setNode(node.id, { width: size.width, height: size.height });
  });

  edges.forEach((edge) => {
    graph.setEdge(edge.source, edge.target);
  });

  dagre.layout(graph);

  return nodes.map((node) => {
    const type = (node.type ?? "organization") as OrgFlowNodeType;
    const size = NODE_SIZE[type] ?? NODE_SIZE.organization;
    const position = graph.node(node.id);
    return {
      ...node,
      position: {
        x: position.x - size.width / 2,
        y: position.y - size.height / 2,
      },
    };
  });
}

export function edgeStyle(edgeType?: string): { stroke: string; strokeWidth: number } {
  switch (edgeType) {
    case "parent":
      return { stroke: "#7c3aed", strokeWidth: 2 };
    case "membership":
      return { stroke: "#4f46e5", strokeWidth: 2 };
    case "member":
      return { stroke: "#0d9488", strokeWidth: 1.5 };
    case "owns":
      return { stroke: "#059669", strokeWidth: 1.5 };
    default:
      return { stroke: "#94a3b8", strokeWidth: 1.5 };
  }
}
