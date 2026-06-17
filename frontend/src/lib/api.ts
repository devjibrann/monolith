const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

export type Organization = {
  id: number;
  name: string;
  slug: string;
  parent_id?: number | null;
  owner_id?: number;
  role?: string;
};

export type User = {
  id: number;
  email: string;
};

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public body?: unknown
  ) {
    super(message);
  }
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const headers = new Headers(options.headers);
  if (!headers.has("Content-Type") && options.body) {
    headers.set("Content-Type", "application/json");
  }

  if (typeof window !== "undefined") {
    const token = localStorage.getItem("token");
    const orgSlug = localStorage.getItem("orgSlug");
    const isCredentialExchange =
      path === "/api/v1/auth/login" || path === "/api/v1/auth/signup";
    if (token && !isCredentialExchange) {
      headers.set("Authorization", `Bearer ${token}`);
    }
    if (orgSlug && !isCredentialExchange) {
      headers.set("X-Organization-Slug", orgSlug);
    }
  }

  const res = await fetch(`${API_URL}${path}`, { ...options, headers });

  if (!res.ok) {
    let body: unknown;
    try {
      body = await res.json();
    } catch {
      body = undefined;
    }
    const message =
      typeof body === "object" &&
      body !== null &&
      "error" in body &&
      typeof (body as { error: string }).error === "string"
        ? (body as { error: string }).error
        : `Request failed (${res.status})`;
    throw new ApiError(message, res.status, body);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export async function login(email: string, password: string) {
  return apiFetch<{ token: string; user: User; message: string }>(
    "/api/v1/auth/login",
    {
      method: "POST",
      body: JSON.stringify({ user: { email, password } }),
    }
  );
}

export async function signup(email: string, password: string, passwordConfirmation: string) {
  return apiFetch<{ token: string; user: User; message: string }>(
    "/api/v1/auth/signup",
    {
      method: "POST",
      body: JSON.stringify({
        user: { email, password, password_confirmation: passwordConfirmation },
      }),
    }
  );
}

export async function logout() {
  return apiFetch<void>("/api/v1/auth/logout", { method: "DELETE" });
}

export async function fetchOrganizations() {
  return apiFetch<Organization[]>("/api/v1/organizations");
}

export async function fetchOrgHierarchy() {
  return apiFetch<import("@/lib/org-flow/types").OrgHierarchyResponse>(
    "/api/v1/organizations/hierarchy"
  );
}

export async function createOrganization(
  name: string,
  slug: string,
  parentId?: number | null
) {
  return apiFetch<Organization>("/api/v1/organizations", {
    method: "POST",
    body: JSON.stringify({
      organization: {
        name,
        slug,
        ...(parentId ? { parent_id: parentId } : {}),
      },
    }),
  });
}

export type DocumentRecord = {
  id: number;
  title: string;
  status: "pending" | "processing" | "ready" | "failed";
  processing_error: string | null;
  filename: string | null;
  byte_size: number | null;
  created_at: string;
  owned_by_current_user?: boolean;
};

export type ChatMessageRecord = {
  id: number;
  role: "user" | "assistant";
  content: string;
  created_at: string;
  sources?: ChatSource[];
};

export type ChatSource = {
  document_id: number;
  document_title: string;
  content: string;
  score?: number;
  match?: string;
};

export async function fetchDocuments() {
  return apiFetch<DocumentRecord[]>("/api/v1/documents");
}

export async function uploadDocument(title: string, file: File) {
  const form = new FormData();
  form.append("title", title);
  form.append("file", file);

  const headers = new Headers();
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("token");
    const orgSlug = localStorage.getItem("orgSlug");
    if (token) headers.set("Authorization", `Bearer ${token}`);
    if (orgSlug) headers.set("X-Organization-Slug", orgSlug);
  }

  const res = await fetch(`${API_URL}/api/v1/documents`, {
    method: "POST",
    headers,
    body: form,
  });

  if (!res.ok) {
    let body: unknown;
    try {
      body = await res.json();
    } catch {
      body = undefined;
    }
    const message =
      typeof body === "object" &&
      body !== null &&
      "errors" in body &&
      Array.isArray((body as { errors: string[] }).errors)
        ? (body as { errors: string[] }).errors.join(", ")
        : `Upload failed (${res.status})`;
    throw new ApiError(message, res.status, body);
  }

  return res.json() as Promise<DocumentRecord>;
}

export async function fetchChatMessages() {
  return apiFetch<ChatMessageRecord[]>("/api/v1/chats");
}

export async function streamChat(
  message: string,
  onToken: (token: string) => void,
  options?: {
    onError?: (error: string) => void;
    onSources?: (sources: ChatSource[]) => void;
  }
): Promise<void> {
  const headers = new Headers({ "Content-Type": "application/json" });
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("token");
    const orgSlug = localStorage.getItem("orgSlug");
    if (token) headers.set("Authorization", `Bearer ${token}`);
    if (orgSlug) headers.set("X-Organization-Slug", orgSlug);
  }

  const res = await fetch(`${API_URL}/api/v1/chats`, {
    method: "POST",
    headers,
    body: JSON.stringify({ message }),
  });

  if (!res.ok || !res.body) {
    let body: unknown;
    try {
      body = await res.json();
    } catch {
      body = undefined;
    }
    const msg =
      typeof body === "object" && body !== null && "error" in body
        ? String((body as { error: string }).error)
        : `Chat failed (${res.status})`;
    throw new ApiError(msg, res.status, body);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      if (!line.startsWith("data:")) continue;
      const payload = line.slice(5).trim();
      if (payload === "[DONE]") return;
      if (payload.startsWith("{")) {
        try {
          const parsed = JSON.parse(payload) as {
            token?: string;
            error?: string;
            sources?: ChatSource[];
          };
          if (parsed.error) {
            options?.onError?.(parsed.error);
            return;
          }
          if (parsed.sources) {
            options?.onSources?.(parsed.sources);
          }
          if (parsed.token) onToken(parsed.token);
        } catch {
          onToken(payload);
        }
      } else {
        onToken(payload);
      }
    }
  }
}
