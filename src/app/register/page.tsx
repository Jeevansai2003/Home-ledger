import type { Metadata } from "next";
import Link from "next/link";
import { AlertCircle } from "lucide-react";
import { registerAction } from "@/app/actions/auth";
import AuthShell from "@/components/AuthShell";
import HouseholdChoice from "@/components/HouseholdChoice";
import PasswordInput from "@/components/PasswordInput";
import SubmitButton from "@/components/SubmitButton";

export const metadata: Metadata = { title: "Create account" };

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <AuthShell
      title="Create your account"
      subtitle="It takes a minute. Everyone in your household shares one ledger."
      footer={
        <>
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-brand underline-offset-4 hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <form action={registerAction} className="space-y-5">
        {error && (
          <div role="alert" className="alert-error flex gap-2">
            <AlertCircle size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
            <span>{error}</span>
          </div>
        )}

        <div>
          <label htmlFor="name" className="field-label">Your name</label>
          <input id="name" name="name" autoComplete="name" required autoFocus className="input" />
        </div>

        <div>
          <label htmlFor="email" className="field-label">Email</label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            className="input"
            placeholder="you@example.com"
          />
        </div>

        <div>
          <label htmlFor="password" className="field-label">Password</label>
          <PasswordInput id="password" name="password" autoComplete="new-password" minLength={8} />
          <p className="mt-1.5 text-xs text-muted">At least 8 characters.</p>
        </div>

        <HouseholdChoice />

        <SubmitButton pendingText="Creating account…">Create account</SubmitButton>
      </form>
    </AuthShell>
  );
}