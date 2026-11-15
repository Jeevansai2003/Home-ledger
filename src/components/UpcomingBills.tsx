import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatINR } from "@/lib/format";
import { daysUntil, dueLabel, dueTone } from "@/lib/bills";

export default async function UpcomingBills({ householdId }: { householdId: string }) {
  const horizon = new Date(Date.now() + 15 * 86400000);
  const bills = await prisma.recurringBill.findMany({
    where: { householdId, active: true, nextDue: { lte: horizon } },
    orderBy: { nextDue: "asc" },
    take: 4,
  });

  return (
    <section className="card p-5" aria-labelledby="bills-heading">
      <div className="flex items-center justify-between">
        <h2 id="bills-heading" className="text-base font-semibold">Upcoming bills</h2>
        <Link href="/bills" className="text-sm font-medium text-brand hover:underline">
          Manage
        </Link>
      </div>

      {bills.length === 0 ? (
        <p className="mt-3 text-sm text-muted">Nothing due in the next 14 days.</p>
      ) : (
        <ul className="mt-3 divide-y divide-line">
          {bills.map((b) => {
            const days = daysUntil(b.nextDue);
            return (
              <li key={b.id} className="flex items-center justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{b.name}</p>
                  <p className={`text-xs ${dueTone(days)}`}>{dueLabel(days)}</p>
                </div>
                <p className="num shrink-0 text-sm font-medium">{formatINR(Number(b.amount))}</p>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}