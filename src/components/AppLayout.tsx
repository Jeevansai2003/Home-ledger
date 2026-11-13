import { LogOut } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { logoutAction } from "@/app/actions/auth";
import Logo from "./Logo";
import NavLinks from "./NavLinks";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const initials = user.name
    .split(/\s+/)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[260px_minmax(0,1fr)]">
      {/* Desktop sidebar */}
      <aside className="hidden border-r border-line bg-surface px-4 py-6 lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col">
        <div className="px-2">
          <Logo />
        </div>
        <p className="mt-6 truncate px-2 text-sm font-medium text-ink">{user.household.name}</p>
        <p className="px-2 text-xs text-muted">Household</p>
        <nav aria-label="Main" className="mt-4 flex-1">
          <NavLinks variant="sidebar" />
        </nav>
        <div className="border-t border-line pt-4">
          <div className="flex items-center gap-3 px-2">
            <span
              aria-hidden="true"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-soft text-sm font-semibold text-brand"
            >
              {initials}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{user.name}</p>
              <p className="truncate text-xs text-muted">{user.email}</p>
            </div>
          </div>
          <form action={logoutAction} className="mt-3">
            <button className="btn btn-secondary w-full">
              <LogOut size={16} aria-hidden="true" />
              Log out
            </button>
          </form>
        </div>
      </aside>

      <div className="min-w-0">
        {/* Mobile top bar */}
        <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-line bg-surface/95 px-4 backdrop-blur lg:hidden">
          <Logo />
          <form action={logoutAction}>
            <button
              className="flex h-9 w-9 items-center justify-center rounded-lg text-muted hover:bg-canvas hover:text-ink"
              aria-label="Log out"
            >
              <LogOut size={18} aria-hidden="true" />
            </button>
          </form>
        </header>
        <div className="pb-20 lg:pb-0">{children}</div>
      </div>

      {/* Mobile tab bar */}
      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] lg:hidden"
      >
        <NavLinks variant="tabs" />
      </nav>
    </div>
  );
}