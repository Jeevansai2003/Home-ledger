import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { currentMonth, monthLabel, shiftMonth } from "@/lib/format";

export default function MonthSwitcher({ basePath, month }: { basePath: string; month: string }) {
  const btn =
    "flex h-9 w-9 items-center justify-center rounded-lg border border-line bg-surface text-muted transition-colors hover:bg-canvas hover:text-ink";

  return (
    <nav aria-label="Choose month" className="flex items-center gap-2">
      <Link href={`${basePath}?month=${shiftMonth(month, -1)}`} className={btn} aria-label="Previous month">
        <ChevronLeft size={18} aria-hidden="true" />
      </Link>
      <p className="min-w-36 text-center text-sm font-medium" aria-live="polite">
        {monthLabel(month)}
      </p>
      <Link href={`${basePath}?month=${shiftMonth(month, 1)}`} className={btn} aria-label="Next month">
        <ChevronRight size={18} aria-hidden="true" />
      </Link>
      {month !== currentMonth() && (
        <Link href={basePath} className="ml-1 text-sm font-medium text-brand hover:underline">
          This month
        </Link>
      )}
    </nav>
  );
}