"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { ApiError, login } from "@/lib/api";
import { persistSession } from "@/lib/auth";
import { AuthFormError } from "@/components/AuthFormFeedback";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function parseAuthError(err: unknown): string {
  if (err instanceof ApiError) {
    const body = err.body as { errors?: string[] } | undefined;
    return body?.errors?.join(", ") ?? err.message;
  }
  return "Sign in failed. Check your email and password, then try again.";
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      setError("Enter your email and password.");
      return;
    }

    setLoading(true);
    try {
      const data = await login(trimmedEmail, password);
      persistSession(data.token, data.user);
      router.replace("/");
    } catch (err) {
      setError(parseAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full border-indigo-200/60 shadow-md dark:border-indigo-900/50">
      <CardHeader className="space-y-1 pb-4">
        <CardTitle className="text-xl text-balance">Sign in</CardTitle>
        <CardDescription>Use your workspace email and password.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error ? <AuthFormError message={error} /> : null}
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              inputMode="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              disabled={loading}
              aria-invalid={error ? true : undefined}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              disabled={loading}
              aria-invalid={error ? true : undefined}
            />
          </div>
          <Button
            type="submit"
            className="w-full transition-transform duration-150 ease-[var(--ease-out-quart)] active:scale-[0.98] motion-reduce:active:scale-100"
            disabled={loading}
          >
            {loading ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                Signing in…
              </span>
            ) : (
              "Sign in"
            )}
          </Button>
        </form>
        <p className="text-center text-sm text-gray-600 dark:text-gray-400">
          No account?{" "}
          <Link
            href="/signup"
            className="font-medium text-indigo-700 underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:rounded-sm dark:text-indigo-300"
          >
            Create an account
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
