import { Bot } from "lucide-react";
import { CHAT_READING_WIDTH, CHAT_ROLE_LABEL } from "@/lib/chat/constants";
import type { ChatSource } from "@/lib/api";
import { ChatMessageContent } from "@/lib/chat/format-content";
import { ChatSources } from "@/components/chat/chat-sources";
import { cn } from "@/lib/utils";

export function ChatStreamingMessage({
  content,
  sources = [],
  className,
}: {
  content: string;
  sources?: ChatSource[];
  className?: string;
}) {
  return (
    <article
      className={cn("flex gap-3", className)}
      aria-live="polite"
      aria-busy="true"
      aria-label="Assistant is responding"
    >
      <div
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-600 ring-1 ring-gray-200 dark:bg-gray-900 dark:text-gray-300 dark:ring-gray-800"
        aria-hidden
      >
        <Bot className="h-4 w-4" />
      </div>

      <div className={cn("min-w-0 flex-1", CHAT_READING_WIDTH)}>
        <div className="mb-1 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
          <span className="font-medium text-gray-700 dark:text-gray-300">
            {CHAT_ROLE_LABEL.assistant}
          </span>
          <span className="chat-streaming-label">Responding…</span>
        </div>

        <div className="w-full rounded-2xl rounded-tl-md border border-gray-200/80 bg-white px-4 py-3 shadow-sm dark:border-gray-800 dark:bg-gray-950/80">
          {content ? (
            <ChatMessageContent content={content} />
          ) : (
            <div className="flex items-center gap-2 py-1" aria-hidden>
              <span className="chat-typing-dot" />
              <span className="chat-typing-dot" style={{ animationDelay: "120ms" }} />
              <span className="chat-typing-dot" style={{ animationDelay: "240ms" }} />
            </div>
          )}
          {content.length > 0 && (
            <span className="chat-stream-cursor ml-0.5 inline-block w-2 align-baseline" aria-hidden>
              ▍
            </span>
          )}
          {sources.length > 0 ? <ChatSources sources={sources} /> : null}
        </div>
      </div>
    </article>
  );
}
