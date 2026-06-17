import Link from "next/link";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-[oklch(0.97_0.018_277)] dark:bg-[oklch(0.12_0.022_277)]">
      <header className="px-6 pt-8 pb-4 sm:px-10">
        <Link
          href="/login"
          className="inline-flex max-w-lg flex-col gap-1 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[oklch(0.12_0.022_277)]"
        >
          <span className="text-lg font-semibold text-balance text-gray-900 dark:text-gray-100">
            AI Workspace
          </span>
          <span className="text-sm text-gray-700 dark:text-gray-300">
            Upload documents and chat with answers from your files.
          </span>
        </Link>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center px-4 pb-12 sm:px-6">
        <div className="w-full max-w-md">{children}</div>
      </main>
    </div>
  );
}
