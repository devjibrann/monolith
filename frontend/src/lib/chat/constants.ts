import type { ChatMessageRecord } from "@/lib/api";

export type ChatRole = ChatMessageRecord["role"] | "system";

export const CHAT_ROLE_LABEL: Record<ChatRole, string> = {
  user: "You",
  assistant: "Assistant",
  system: "System",
};

export const CHAT_READING_WIDTH = "max-w-[42rem]";
