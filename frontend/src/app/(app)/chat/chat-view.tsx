"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ApiError,
  type ChatMessageRecord,
  type ChatSource,
  fetchChatMessages,
  streamChat,
} from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { ChatComposer } from "@/components/chat/chat-composer";
import { ChatEmptyState } from "@/components/chat/chat-empty-state";
import { ChatMessage } from "@/components/chat/chat-message";
import { ChatStreamingMessage } from "@/components/chat/chat-streaming-message";
import { ChatSystemNotice } from "@/components/chat/chat-system-notice";
import { Card, CardContent } from "@/components/ui/card";

const PENDING_USER_ID = -1;
const SCROLL_THRESHOLD_PX = 96;

function ChatHistorySkeleton() {
  return (
    <ul className="space-y-8 px-4 py-6" aria-hidden>
      {[0, 1, 2].map((i) => (
        <li key={i} className="flex gap-3" style={{ "--i": i } as React.CSSProperties}>
          <div className="chat-skeleton-avatar" />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="chat-skeleton-line w-24" />
            <div className="chat-skeleton-line w-full max-w-md" />
            <div className="chat-skeleton-line w-4/5 max-w-sm opacity-80" />
          </div>
        </li>
      ))}
    </ul>
  );
}

export function ChatView() {
  const { currentOrg } = useAuth();
  const [messages, setMessages] = useState<ChatMessageRecord[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState("");
  const [streamingSources, setStreamingSources] = useState<ChatSource[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);

  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const stickToBottomRef = useRef(true);
  const tokenBufferRef = useRef("");
  const rafRef = useRef<number | null>(null);

  const flushTokenBuffer = useCallback(() => {
    const batch = tokenBufferRef.current;
    tokenBufferRef.current = "";
    rafRef.current = null;
    if (batch) setStreaming((prev) => prev + batch);
  }, []);

  const enqueueToken = useCallback(
    (token: string) => {
      tokenBufferRef.current += token;
      if (rafRef.current == null) {
        rafRef.current = requestAnimationFrame(flushTokenBuffer);
      }
    },
    [flushTokenBuffer]
  );

  const load = useCallback(async () => {
    if (!currentOrg) return;
    const history = await fetchChatMessages();
    setMessages(history);
  }, [currentOrg]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        await load();
      } catch {
        if (!cancelled) setError("Could not load chat history");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [load]);

  useEffect(() => {
    const root = scrollRef.current;
    if (!root) return;

    function onScroll() {
      const el = scrollRef.current;
      if (!el) return;
      const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
      stickToBottomRef.current = distance < SCROLL_THRESHOLD_PX;
    }

    root.addEventListener("scroll", onScroll, { passive: true });
    return () => root.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!stickToBottomRef.current) return;
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, streaming, sending]);

  useEffect(() => {
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  async function handleSend() {
    const text = input.trim();
    if (!text || sending || !currentOrg) return;

    setSending(true);
    setError(null);
    setInput("");
    setStreaming("");
    setStreamingSources([]);
    tokenBufferRef.current = "";
    stickToBottomRef.current = true;

    const pendingUser: ChatMessageRecord = {
      id: PENDING_USER_ID,
      role: "user",
      content: text,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, pendingUser]);

    let streamError: string | null = null;

    try {
      await streamChat(text, enqueueToken, {
        onError: (err) => {
          streamError = err;
        },
        onSources: (sources) => {
          setStreamingSources(sources);
        },
      });
      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current);
        flushTokenBuffer();
      }
      await load();
      if (streamError) setError(streamError);
    } catch (err) {
      setMessages((prev) => prev.filter((m) => m.id !== PENDING_USER_ID));
      if (err instanceof ApiError) setError(err.message);
      else setError("Chat request failed");
    } finally {
      setStreaming("");
      setStreamingSources([]);
      tokenBufferRef.current = "";
      setSending(false);
    }
  }

  if (!currentOrg) {
    return (
      <ChatSystemNotice variant="info">
        Select an organization in the sidebar to use chat.
      </ChatSystemNotice>
    );
  }

  const showEmpty =
    !loading &&
    messages.length === 0 &&
    !streaming &&
    !sending &&
    !error;

  return (
    <Card className="flex min-h-0 flex-1 flex-col overflow-hidden border-gray-200/80 shadow-sm dark:border-gray-800">
      <CardContent className="flex min-h-0 flex-1 flex-col p-0">
        <div
          ref={scrollRef}
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain"
        >
          {loading ? (
            <ChatHistorySkeleton />
          ) : showEmpty ? (
            <ChatEmptyState orgName={currentOrg.name} />
          ) : (
            <div className="mx-auto w-full max-w-3xl space-y-8 px-4 py-6">
              {messages.map((m, index) => (
                <ChatMessage
                  key={m.id === PENDING_USER_ID ? `pending-${m.created_at}` : m.id}
                  message={m}
                  className="chat-msg-enter"
                  style={{ "--i": Math.min(index, 12) } as React.CSSProperties}
                />
              ))}

              {sending && !streaming && messages.at(-1)?.role === "user" && (
                <ChatStreamingMessage content="" />
              )}

              {streaming && (
                <ChatStreamingMessage content={streaming} sources={streamingSources} />
              )}

              {error && (
                <ChatSystemNotice variant="error">{error}</ChatSystemNotice>
              )}

              <div ref={bottomRef} className="h-px shrink-0" aria-hidden />
            </div>
          )}
        </div>

        {showEmpty && error && (
          <div className="px-4 pb-2">
            <ChatSystemNotice variant="error">{error}</ChatSystemNotice>
          </div>
        )}

        <ChatComposer
          value={input}
          onChange={setInput}
          onSubmit={() => void handleSend()}
          sending={sending}
        />
      </CardContent>
    </Card>
  );
}
