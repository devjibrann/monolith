import { AlertCircle, Info } from "lucide-react";
import { CHAT_READING_WIDTH } from "@/lib/chat/constants";
import { cn } from "@/lib/utils";

export function ChatSystemNotice({
  children,
  variant = "info",
  className,
}: {
  children: React.ReactNode;
  variant?: "info" | "error";
  className?: string;
}) {
  const isError = variant === "error";

  return (
    <div
      role={isError ? "alert" : "status"}
      className={cn(
        "chat-msg-enter mx-auto flex w-full gap-3 rounded-xl px-4 py-3 text-sm ring-1",
        CHAT_READING_WIDTH,
        isError
          ? "bg-red-50 text-red-900 ring-red-200/80 dark:bg-red-950/40 dark:text-red-200 dark:ring-red-900/50"
          : "bg-amber-50/90 text-amber-950 ring-amber-200/70 dark:bg-amber-950/30 dark:text-amber-100 dark:ring-amber-900/40",
        className
      )}
    >
      {isError ? (
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      ) : (
        <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      )}
      <div className="min-w-0 flex-1 leading-relaxed">{children}</div>
    </div>
  );
}
