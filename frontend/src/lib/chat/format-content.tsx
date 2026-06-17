import type { ComponentPropsWithoutRef } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";

const markdownComponents: Components = {
  p: ({ children }) => <p className="my-2">{children}</p>,
  h1: ({ children }) => (
    <h1 className="mt-1 mb-2 text-lg font-semibold tracking-tight">{children}</h1>
  ),
  h2: ({ children }) => (
    <h2 className="mt-1 mb-2 text-base font-semibold tracking-tight">{children}</h2>
  ),
  h3: ({ children }) => (
    <h3 className="mt-1 mb-1.5 text-[0.95rem] font-semibold">{children}</h3>
  ),
  h4: ({ children }) => (
    <h4 className="mt-1 mb-1.5 text-sm font-semibold">{children}</h4>
  ),
  ul: ({ children }) => (
    <ul className="my-1 list-disc space-y-1 pl-5 marker:text-indigo-500/80">
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol className="my-1 list-decimal space-y-1 pl-5 marker:text-gray-500 dark:marker:text-gray-400">
      {children}
    </ol>
  ),
  li: ({ children }) => <li className="pl-1 leading-relaxed">{children}</li>,
  a: ({ children, href }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="font-medium text-indigo-600 underline decoration-indigo-400/50 underline-offset-2 hover:decoration-indigo-500 dark:text-indigo-400"
    >
      {children}
    </a>
  ),
  strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
  em: ({ children }) => <em className="italic">{children}</em>,
  hr: () => <hr className="my-3 border-gray-200 dark:border-gray-800" />,
  blockquote: ({ children }) => (
    <blockquote className="my-2 border-l-2 border-indigo-300 pl-3 text-gray-600 dark:border-indigo-700 dark:text-gray-400">
      {children}
    </blockquote>
  ),
  code: ({
    className: codeClassName,
    children,
    ...props
  }: ComponentPropsWithoutRef<"code"> & { inline?: boolean }) => {
    const isBlock = /language-/.test(codeClassName ?? "") || props.inline === false;
    if (isBlock) {
      return (
        <code className={cn("font-mono text-[0.8125rem] leading-relaxed", codeClassName)} {...props}>
          {children}
        </code>
      );
    }
    return (
      <code
        className="rounded bg-gray-200/80 px-1 py-0.5 font-mono text-[0.85em] text-gray-900 dark:bg-gray-800 dark:text-gray-100"
        {...props}
      >
        {children}
      </code>
    );
  },
  pre: ({ children }) => (
    <pre className="my-2 overflow-x-auto rounded-lg bg-gray-950 px-3 py-2.5 text-gray-100">
      {children}
    </pre>
  ),
  table: ({ children }) => (
    <div className="my-2 overflow-x-auto">
      <table className="w-full border-collapse text-left text-sm">{children}</table>
    </div>
  ),
  thead: ({ children }) => (
    <thead className="border-b border-gray-200 dark:border-gray-800">{children}</thead>
  ),
  th: ({ children }) => (
    <th className="px-2 py-1.5 font-semibold">{children}</th>
  ),
  td: ({ children }) => (
    <td className="border-b border-gray-100 px-2 py-1.5 dark:border-gray-900">
      {children}
    </td>
  ),
};

export function ChatMessageContent({
  content,
  className,
}: {
  content: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "text-[0.9375rem] leading-relaxed text-gray-800 dark:text-gray-200",
        "[&>*:first-child]:mt-0 [&>*:last-child]:mb-0",
        className
      )}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
