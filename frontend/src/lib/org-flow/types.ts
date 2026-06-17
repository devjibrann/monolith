export type OrgFlowNodeType = "user" | "organization" | "member" | "document";

export type OrgFlowNodeData = {
  label: string;
  email?: string;
  subtitle?: string;
  slug?: string;
  role?: string;
  parent_id?: number | null;
  status?: string;
  filename?: string | null;
  organization_id?: number;
};

export type OrgFlowNode = {
  id: string;
  type: OrgFlowNodeType;
  data: OrgFlowNodeData;
};

export type OrgFlowEdge = {
  id: string;
  source: string;
  target: string;
  edge_type: "membership" | "parent" | "member" | "owns";
};

export type OrgHierarchyResponse = {
  nodes: OrgFlowNode[];
  edges: OrgFlowEdge[];
};

export const NODE_SIZE: Record<OrgFlowNodeType, { width: number; height: number }> = {
  user: { width: 220, height: 84 },
  organization: { width: 248, height: 92 },
  member: { width: 216, height: 80 },
  document: { width: 208, height: 76 },
};
