import { Bot, User } from "lucide-react";
import type { CSSProperties } from "react";
import type { ChatMessageRecord } from "@/lib/api";
import { CHAT_READING_WIDTH, CHAT_ROLE_LABEL } from "@/lib/chat/constants";
import { ChatMessageContent } from "@/lib/chat/format-content";
import { ChatSources } from "@/components/chat/chat-sources";
import { cn } from "@/lib/utils";

function formatTime(iso: string) {
  try {
    return new Intl.DateTimeFormat(undefined, {
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return "";
  }
}

export function ChatMessage({
  message,
  className,
  style,
}: {
  message: ChatMessageRecord;
  className?: string;
  style?: CSSProperties;
}) {
  const isUser = message.role === "user";

  return (
    <article
      className={cn(
        "flex gap-3",
        isUser ? "flex-row-reverse" : "flex-row",
        className
      )}
      style={{ "--i": 0, ...style } as CSSProperties}
      aria-label={`${CHAT_ROLE_LABEL[message.role]} message`}
    >
      <div
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full ring-1",
          isUser
            ? "bg-indigo-600 text-white ring-indigo-500/30"
            : "bg-gray-100 text-gray-600 ring-gray-200 dark:bg-gray-900 dark:text-gray-300 dark:ring-gray-800"
        )}
        aria-hidden
      >
        {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </div>

      <div
        className={cn(
          "min-w-0 flex-1",
          isUser ? "flex flex-col items-end" : "flex flex-col items-start",
          CHAT_READING_WIDTH
        )}
      >
        <div
          className={cn(
            "mb-1 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400",
            isUser && "flex-row-reverse"
          )}
        >
          <span className="font-medium text-gray-700 dark:text-gray-300">
            {CHAT_ROLE_LABEL[message.role]}
          </span>
          <time dateTime={message.created_at}>{formatTime(message.created_at)}</time>
        </div>

        <div
          className={cn(
            "w-full rounded-2xl px-4 py-3 shadow-sm",
            isUser
              ? "rounded-tr-md bg-indigo-600 text-white shadow-indigo-600/15"
              : "rounded-tl-md border border-gray-200/80 bg-white dark:border-gray-800 dark:bg-gray-950/80"
          )}
        >
          {isUser ? (
            <p className="whitespace-pre-wrap text-[0.9375rem] leading-relaxed">{message.content}</p>
          ) : (
            <>
              <ChatMessageContent content={message.content} />
              {message.sources && message.sources.length > 0 ? (
                <ChatSources sources={message.sources} />
              ) : null}
            </>
          )}
        </div>
      </div>
    </article>
  );
}
