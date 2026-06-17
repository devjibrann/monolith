/** Per-route accent for active nav icons (restrained, semantic wayfinding). */
export const navAccent = {
  "/": {
    activeIcon: "text-indigo-700 dark:text-indigo-300",
    activeBg: "bg-indigo-100 text-indigo-900 ring-indigo-200/70 dark:bg-indigo-950/80 dark:text-indigo-100 dark:ring-indigo-800/50",
  },
  "/organizations": {
    activeIcon: "text-violet-700 dark:text-violet-300",
    activeBg:
      "bg-violet-100 text-violet-950 ring-violet-200/70 dark:bg-violet-950/70 dark:text-violet-100 dark:ring-violet-800/50",
  },
  "/organizations/map": {
    activeIcon: "text-violet-700 dark:text-violet-300",
    activeBg:
      "bg-violet-100 text-violet-950 ring-violet-200/70 dark:bg-violet-950/70 dark:text-violet-100 dark:ring-violet-800/50",
  },
  "/documents": {
    activeIcon: "text-emerald-800 dark:text-emerald-300",
    activeBg:
      "bg-emerald-50 text-emerald-950 ring-emerald-200/70 dark:bg-emerald-950/50 dark:text-emerald-100 dark:ring-emerald-800/50",
  },
  "/chat": {
    activeIcon: "text-sky-800 dark:text-sky-300",
    activeBg: "bg-sky-50 text-sky-950 ring-sky-200/70 dark:bg-sky-950/50 dark:text-sky-100 dark:ring-sky-800/50",
  },
} as const;

export type NavHref = keyof typeof navAccent;
