import type { Metadata } from "next";
import Link from "next/link";
import { AlertCircle, Clock } from "lucide-react";
import { loginAction } from "@/app/actions/auth";
import AuthShell from "@/components/AuthShell";
import PasswordInput from "@/components/PasswordInput";
import SubmitButton from "@/components/SubmitButton";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; reason?: string }>;
}) {
  const { error, reason } = await searchParams;

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to see where your household money stands."
      footer={
        <>
          Do not have an account yet?{" "}
          <Link href="/register" className="font-medium text-brand underline-offset-4 hover:underline">
            Create one
          </Link>
        </>
      }
    >
      <form action={loginAction} className="space-y-5">
        {reason === "timeout" && !error && (
          <div role="status" className="flex gap-2 rounded-lg border border-brand/20 bg-brand-soft px-3 py-2.5 text-sm text-brand">
            <Clock size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
            <span>You were signed out because you were inactive. Please sign in again.</span>
          </div>
        )}

        {error && (
          <div role="alert" className="alert-error flex gap-2">
            <AlertCircle size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
            <span>{error}</span>
          </div>
        )}

        <div>
          <label htmlFor="email" className="field-label">Email</label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            autoFocus
            className="input"
            placeholder="you@example.com"
          />
        </div>

        <div>
          <label htmlFor="password" className="field-label">Password</label>
          <PasswordInput id="password" name="password" autoComplete="current-password" />
        </div>

        <SubmitButton pendingText="Signing in…">Sign in</SubmitButton>
      </form>
    </AuthShell>
  );
}
