export type UserFlowNodeType = "organization" | "person";

export type UserFlowNodeData = {
  label: string;
  slug?: string;
  member_count?: number;
  email?: string;
  role?: "owner" | "admin" | "member";
  is_viewer?: boolean;
  documents_count?: number;
  questions_asked?: number;
  joined_at?: string;
};

export type UserFlowNode = {
  id: string;
  type: UserFlowNodeType;
  data: UserFlowNodeData;
};

export type UserFlowEdge = {
  id: string;
  source: string;
  target: string;
  edge_type: "owner" | "admin" | "member";
};

export type UserHierarchyResponse = {
  organization: { id: number; name: string; slug: string };
  nodes: UserFlowNode[];
  edges: UserFlowEdge[];
};

export const USER_NODE_SIZE: Record<
  UserFlowNodeType,
  { width: number; height: number }
> = {
  organization: { width: 260, height: 88 },
  person: { width: 236, height: 108 },
};
