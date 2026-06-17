import { FormEvent, KeyboardEvent, useRef, useEffect } from "react";
import { Loader2, SendHorizonal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function ChatComposer({
  value,
  onChange,
  onSubmit,
  disabled,
  sending,
}: {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  disabled?: boolean;
  sending?: boolean;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [value]);

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!disabled && !sending && value.trim()) onSubmit();
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!disabled && !sending && value.trim()) onSubmit();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="chat-composer-enter border-t border-gray-200/80 bg-gray-50/50 px-4 py-4 dark:border-gray-800 dark:bg-gray-950/40"
    >
      <div className="mx-auto flex max-w-3xl items-end gap-2">
        <label htmlFor="chat-input" className="sr-only">
          Message
        </label>
        <textarea
          id="chat-input"
          ref={textareaRef}
          rows={1}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask about your documents…"
          disabled={disabled || sending}
          className={cn(
            "min-h-[2.75rem] max-h-40 flex-1 resize-none rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm leading-relaxed shadow-sm",
            "placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40",
            "disabled:cursor-not-allowed disabled:opacity-60",
            "dark:border-gray-800 dark:bg-gray-950 dark:placeholder:text-gray-500"
          )}
        />
        <Button
          type="submit"
          className="h-11 w-11 shrink-0 rounded-xl px-0"
          disabled={disabled || sending || !value.trim()}
          aria-label={sending ? "Sending message" : "Send message"}
        >
          {sending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <SendHorizonal className="h-4 w-4" />
          )}
        </Button>
      </div>
      <p className="mx-auto mt-2 max-w-3xl text-center text-xs text-gray-500 dark:text-gray-400">
        Enter to send · Shift+Enter for a new line
      </p>
    </form>
  );
}
