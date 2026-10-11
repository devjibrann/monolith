import dagre from "@dagrejs/dagre";
import type { Edge, Node } from "@xyflow/react";
import {
  USER_NODE_SIZE,
  type UserFlowNodeData,
  type UserFlowNodeType,
} from "./types";

export function layoutUserFlow(
  nodes: Node<UserFlowNodeData>[],
  edges: Edge[]
): Node<UserFlowNodeData>[] {
  const graph = new dagre.graphlib.Graph();
  graph.setDefaultEdgeLabel(() => ({}));
  graph.setGraph({ rankdir: "TB", nodesep: 40, ranksep: 88, marginx: 24, marginy: 24 });

  nodes.forEach((node) => {
    const type = (node.type ?? "person") as UserFlowNodeType;
    const size = USER_NODE_SIZE[type] ?? USER_NODE_SIZE.person;
    graph.setNode(node.id, { width: size.width, height: size.height });
  });

  edges.forEach((edge) => {
    graph.setEdge(edge.source, edge.target);
  });

  dagre.layout(graph);

  return nodes.map((node) => {
    const type = (node.type ?? "person") as UserFlowNodeType;
    const size = USER_NODE_SIZE[type] ?? USER_NODE_SIZE.person;
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

export function userEdgeStyle(edgeType?: string): {
  stroke: string;
  strokeWidth: number;
} {
  switch (edgeType) {
    case "owner":
      return { stroke: "#b45309", strokeWidth: 2 };
    case "admin":
      return { stroke: "#7c3aed", strokeWidth: 2 };
    case "member":
      return { stroke: "#0d9488", strokeWidth: 1.5 };
    default:
      return { stroke: "#94a3b8", strokeWidth: 1.5 };
  }
}
