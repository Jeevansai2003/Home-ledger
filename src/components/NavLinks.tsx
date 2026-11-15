"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ArrowLeftRight,
  PiggyBank,
  CalendarClock,
  Landmark,
  ShieldCheck,
} from "lucide-react";

const items = [
  { href: "/dashboard", label: "Overview", short: "Home", icon: LayoutDashboard },
  { href: "/transactions", label: "Transactions", short: "Ledger", icon: ArrowLeftRight },
  { href: "/budgets", label: "Budgets", short: "Budgets", icon: PiggyBank },
  { href: "/bills", label: "Bills", short: "Bills", icon: CalendarClock },
  { href: "/settings", label: "Accounts", short: "Accounts", icon: Landmark },
  { href: "/account", label: "Security", short: "Security", icon: ShieldCheck },
];

export default function NavLinks({ variant }: { variant: "sidebar" | "tabs" }) {
  const pathname = usePathname();
  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  if (variant === "sidebar") {
    return (
      <ul className="space-y-1">
        {items.map(({ href, label, icon: Icon }) => {
          const active = isActive(href);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={`flex h-10 items-center gap-3 rounded-lg px-3 text-sm transition-colors ${
                  active
                    ? "bg-brand-soft font-semibold text-brand"
                    : "text-muted hover:bg-canvas hover:text-ink"
                }`}
              >
                <Icon size={18} aria-hidden="true" />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    );
  }

  return (
    <ul className="grid grid-cols-6">
      {items.map(({ href, short, label, icon: Icon }) => {
        const active = isActive(href);
        return (
          <li key={href}>
            <Link
              href={href}
              aria-label={label}
              aria-current={active ? "page" : undefined}
              className={`flex flex-col items-center gap-1 py-2.5 text-[10px] transition-colors ${
                active ? "font-semibold text-brand" : "text-muted"
              }`}
            >
              <Icon size={20} aria-hidden="true" />
              {short}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}