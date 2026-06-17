import type { Metadata } from "next";
import { ChatView } from "./chat-view";

export const metadata: Metadata = {
  title: "Chat",
  description: "RAG-backed assistant for your organization documents.",
};

export default function ChatPage() {
  return (
    <div className="flex h-[calc(100vh-3rem)] flex-col gap-4">
      <header>
        <h1 className="text-2xl font-semibold text-balance">Chat</h1>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Ask questions grounded in your uploaded documents. Answers stream as they are generated.
        </p>
      </header>
      <ChatView />
    </div>
  );
}
