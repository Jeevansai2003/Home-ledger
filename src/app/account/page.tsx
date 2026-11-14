import type { Metadata } from "next";
import { AlertCircle, CheckCircle2, Monitor, Smartphone } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { readSession } from "@/lib/session";
import { changePasswordAction, logoutOtherDevicesAction } from "@/app/actions/account";
import ConfirmSubmit from "@/components/ConfirmSubmit";
import PageHeader from "@/components/PageHeader";
import PasswordInput from "@/components/PasswordInput";
import SubmitButton from "@/components/SubmitButton";

export const metadata: Metadata = { title: "Security" };

function describeAgent(ua: string | null) {
  if (!ua) return { label: "Unknown device", mobile: false };
  const browser = /Edg\//.test(ua)
    ? "Edge"
    : /OPR\//.test(ua)
      ? "Opera"
      : /Firefox\//.test(ua)
        ? "Firefox"
        : /Chrome\//.test(ua)
          ? "Chrome"
          : /Safari\//.test(ua)
            ? "Safari"
            : "Browser";
  const os = /Windows/.test(ua)
    ? "Windows"
    : /Android/.test(ua)
      ? "Android"
      : /iPhone|iPad/.test(ua)
        ? "iOS"
        : /Mac OS X/.test(ua)
          ? "macOS"
          : /Linux/.test(ua)
            ? "Linux"
            : "an unknown system";
  return { label: `${browser} on ${os}`, mobile: /Mobile|Android|iPhone/.test(ua) };
}

const savedMessages: Record<string, string> = {
  password: "Password changed. All other devices were signed out.",
  others: "All other devices were signed out.",
};

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  const user = await requireUser();
  const sp = await searchParams;
  const current = await readSession();

  const sessions = await prisma.session.findMany({
    where: { userId: user.id, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
  });
  const others = sessions.filter((s) => s.id !== current?.sessionId).length;

  return (
    <main className="mx-auto max-w-3xl space-y-8 px-5 py-8 sm:px-8">
      <PageHeader title="Security" description="Your password and the devices signed in to your account." />

      {sp.error && (
        <div role="alert" className="alert-error flex gap-2">
          <AlertCircle size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
          <span>{sp.error}</span>
        </div>
      )}
      {sp.saved && savedMessages[sp.saved] && (
        <div
          role="status"
          className="flex gap-2 rounded-lg border border-income/25 bg-income-soft px-3 py-2.5 text-sm text-income"
        >
          <CheckCircle2 size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
          <span>{savedMessages[sp.saved]}</span>
        </div>
      )}

      <section className="card p-5" aria-labelledby="pw-heading">
        <h2 id="pw-heading" className="text-base font-semibold">Change password</h2>
        <p className="mt-1 text-sm text-muted">
          Changing your password signs you out on every other device.
        </p>
        <form action={changePasswordAction} className="mt-5 max-w-sm space-y-4">
          <div>
            <label htmlFor="currentPassword" className="field-label">Current password</label>
            <PasswordInput id="currentPassword" name="currentPassword" autoComplete="current-password" />
          </div>
          <div>
            <label htmlFor="newPassword" className="field-label">New password</label>
            <PasswordInput id="newPassword" name="newPassword" autoComplete="new-password" minLength={8} />
            <p className="mt-1.5 text-xs text-muted">At least 8 characters.</p>
          </div>
          <div>
            <label htmlFor="confirmPassword" className="field-label">Confirm new password</label>
            <PasswordInput id="confirmPassword" name="confirmPassword" autoComplete="new-password" minLength={8} />
          </div>
          <SubmitButton className="btn btn-primary" pendingText="Saving…">Change password</SubmitButton>
        </form>
      </section>

      <section className="card p-5" aria-labelledby="sessions-heading">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 id="sessions-heading" className="text-base font-semibold">Where you are signed in</h2>
            <p className="mt-1 text-sm text-muted">
              If you do not recognise a device, change your password right away.
            </p>
          </div>
          {others > 0 && (
            <form action={logoutOtherDevicesAction}>
              <ConfirmSubmit
                message="Sign out all other devices? They will need to log in again."
                label="Log out other devices"
                className="btn btn-secondary"
              >
                Log out other devices
              </ConfirmSubmit>
            </form>
          )}
        </div>

        <ul className="mt-4 divide-y divide-line">
          {sessions.map((s) => {
            const { label, mobile } = describeAgent(s.userAgent);
            const isCurrent = s.id === current?.sessionId;
            const Icon = mobile ? Smartphone : Monitor;
            return (
              <li key={s.id} className="flex items-center gap-3 py-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-canvas text-muted">
                  <Icon size={18} aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{label}</p>
                  <p className="text-xs text-muted">
                    Signed in{" "}
                    {s.createdAt.toLocaleString("en-IN", {
                      dateStyle: "medium",
                      timeStyle: "short",
                      timeZone: "Asia/Kolkata",
                    })}
                  </p>
                </div>
                {isCurrent && (
                  <span className="shrink-0 rounded-full bg-brand-soft px-2.5 py-1 text-xs font-medium text-brand">
                    This device
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      </section>
    </main>
  );
}