import type { Metadata } from "next";
import Link from "next/link";
import { AlertCircle } from "lucide-react";
import { loginAction } from "@/app/actions/auth";
import AuthShell from "@/components/AuthShell";
import PasswordInput from "@/components/PasswordInput";
import SubmitButton from "@/components/SubmitButton";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

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