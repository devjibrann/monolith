export function AuthFormError({ message }: { message: string }) {
  return (
    <p
      role="alert"
      className="doc-error-enter rounded-md bg-red-50 px-3 py-2 text-sm text-red-800 ring-1 ring-red-200/80 dark:bg-red-950/40 dark:text-red-300 dark:ring-red-800/50"
    >
      {message}
    </p>
  );
}
