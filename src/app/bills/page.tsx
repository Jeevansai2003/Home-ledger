import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, Pause, Pencil, Play, Trash2 } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatINR } from "@/lib/format";
import {
  FREQ_LABEL, daysUntil, dueLabel, dueTone, formatDue, monthlyCost, todayIST, type Frequency,
} from "@/lib/bills";
import {
  addBillAction, deleteBillAction, markBillPaidAction, toggleBillAction,
} from "@/app/actions/bills";
import BillForm from "@/components/BillForm";
import ConfirmSubmit from "@/components/ConfirmSubmit";
import PageHeader from "@/components/PageHeader";
import SubmitButton from "@/components/SubmitButton";

export const metadata: Metadata = { title: "Bills" };

export default async function BillsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; paid?: string }>;
}) {
  const user = await requireUser();
  const sp = await searchParams;
  const householdId = user.householdId;

  const [bills, categories, accounts] = await Promise.all([
    prisma.recurringBill.findMany({
      where: { householdId },
      orderBy: { nextDue: "asc" },
      include: { category: true, account: true },
    }),
    prisma.category.findMany({ where: { householdId, type: "EXPENSE" }, orderBy: { name: "asc" } }),
    prisma.account.findMany({ where: { householdId }, orderBy: { name: "asc" } }),
  ]);

  type Bill = (typeof bills)[number];
  const withDays = bills.map((b) => ({ b, days: daysUntil(b.nextDue) }));
  const active = withDays.filter((x) => x.b.active);
  const paused = withDays.filter((x) => !x.b.active);

  const sections = [
    { title: "Overdue", rows: active.filter((x) => x.days < 0) },
    { title: "Due in the next 7 days", rows: active.filter((x) => x.days >= 0 && x.days <= 7) },
    { title: "Later", rows: active.filter((x) => x.days > 7) },
  ].filter((s) => s.rows.length > 0);

  const dueIn30 = active.filter((x) => x.days <= 30).reduce((s, x) => s + Number(x.b.amount), 0);
  const monthly = active.reduce((s, x) => s + monthlyCost(Number(x.b.amount), x.b.frequency as Frequency), 0);

  const iconBtn =
    "flex h-8 w-8 items-center justify-center rounded-lg text-muted transition-colors hover:bg-canvas hover:text-ink";

  function BillRow({ b, days }: { b: Bill; days: number }) {
    return (
      <li className="px-4 py-3">
        <div className="flex items-start gap-3">
          <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: b.category.color }} aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{b.name}</p>
            <p className="truncate text-xs text-muted">
              {b.category.name}, {FREQ_LABEL[b.frequency as Frequency]}
              {b.account ? `, from ${b.account.name}` : ""}
            </p>
            {b.active && (
              <p className={`mt-0.5 text-xs font-medium ${dueTone(days)}`}>
                {dueLabel(days)} ({formatDue(b.nextDue)})
              </p>
            )}
            {!b.active && <p className="mt-0.5 text-xs text-muted">Paused</p>}
          </div>
          <p className="num shrink-0 text-sm font-semibold">{formatINR(Number(b.amount))}</p>
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 pl-5">
          {b.active ? (
            <form action={markBillPaidAction} className="flex items-center gap-2">
              <input type="hidden" name="id" value={b.id} />
              <input type="hidden" name="due" value={b.nextDue.toISOString().slice(0, 10)} />
              <label htmlFor={`pay-${b.id}`} className="sr-only">Amount paid for {b.name}</label>
              <div className="relative">
                <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted" aria-hidden="true">₹</span>
                <input
                  id={`pay-${b.id}`}
                  name="amount"
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min="0.01"
                  required
                  defaultValue={Number(b.amount)}
                  className="input num h-8 w-28 pl-6 text-sm"
                />
              </div>
              <SubmitButton className="btn btn-primary h-8 px-3" pendingText="Saving…">
                Mark paid
              </SubmitButton>
            </form>
          ) : (
            <span />
          )}

          <div className="flex items-center">
            <Link href={`/bills/${b.id}/edit`} className={iconBtn} aria-label={`Edit ${b.name}`} title="Edit">
              <Pencil size={16} aria-hidden="true" />
            </Link>
            <form action={toggleBillAction}>
              <input type="hidden" name="id" value={b.id} />
              <input type="hidden" name="active" value={b.active ? "false" : "true"} />
              <button
                className={iconBtn}
                aria-label={b.active ? `Pause ${b.name}` : `Resume ${b.name}`}
                title={b.active ? "Pause" : "Resume"}
              >
                {b.active ? <Pause size={16} aria-hidden="true" /> : <Play size={16} aria-hidden="true" />}
              </button>
            </form>
            <form action={deleteBillAction}>
              <input type="hidden" name="id" value={b.id} />
              <ConfirmSubmit
                message={`Delete the bill "${b.name}"? Payments already recorded stay in your transactions.`}
                label={`Delete ${b.name}`}
                className={`${iconBtn} hover:bg-expense-soft hover:text-expense`}
              >
                <Trash2 size={16} aria-hidden="true" />
              </ConfirmSubmit>
            </form>
          </div>
        </div>
      </li>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-5 py-8 sm:px-8">
      <PageHeader title="Bills" description="Rent, EMIs, subscriptions and everything else that comes round again." />

      {sp.paid && (
        <div
          role="status"
          className="mt-6 flex gap-2 rounded-lg border border-income/25 bg-income-soft px-3 py-2.5 text-sm text-income"
        >
          <CheckCircle2 size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
          <span>{`Marked ${sp.paid} as paid. It was added to your transactions.`}</span>
        </div>
      )}

      <div className="mt-8 grid gap-6 lg:grid-cols-5">
        <section className="card self-start p-5 lg:sticky lg:top-6 lg:order-2 lg:col-span-2" aria-labelledby="add-bill-heading">
          <h2 id="add-bill-heading" className="mb-4 text-base font-semibold">Add a bill</h2>
          <BillForm
            action={addBillAction}
            categories={categories.map((c) => ({ id: c.id, name: c.name }))}
            accounts={accounts.map((a) => ({ id: a.id, name: a.name }))}
            today={todayIST()}
            submitLabel="Add bill"
            pendingText="Adding…"
            error={sp.error}
          />
        </section>

        <section className="space-y-5 lg:order-1 lg:col-span-3" aria-label="Your bills">
          <dl className="card grid grid-cols-2 divide-x divide-line">
            <div className="px-4 py-3">
              <dt className="text-xs text-muted">Due in the next 30 days</dt>
              <dd className="num mt-0.5 font-semibold">{formatINR(dueIn30)}</dd>
            </div>
            <div className="px-4 py-3">
              <dt className="text-xs text-muted">Monthly commitments</dt>
              <dd className="num mt-0.5 font-semibold">{formatINR(Math.round(monthly))}</dd>
            </div>
          </dl>

          {bills.length === 0 && (
            <div className="card px-5 py-12 text-center">
              <p className="font-medium">No bills yet</p>
              <p className="mx-auto mt-1 max-w-xs text-sm text-muted">
                Add your rent, EMIs, internet or subscriptions. You will see what is due and can mark each one paid in a click.
              </p>
            </div>
          )}

          {sections.map((s) => (
            <div key={s.title}>
              <h3 className={`mb-2 px-1 text-sm font-medium ${s.title === "Overdue" ? "text-expense" : "text-muted"}`}>
                {s.title}
              </h3>
              <ul className="card divide-y divide-line">
                {s.rows.map(({ b, days }) => (
                  <BillRow key={b.id} b={b} days={days} />
                ))}
              </ul>
            </div>
          ))}

          {paused.length > 0 && (
            <div>
              <h3 className="mb-2 px-1 text-sm font-medium text-muted">Paused</h3>
              <ul className="card divide-y divide-line">
                {paused.map(({ b, days }) => (
                  <BillRow key={b.id} b={b} days={days} />
                ))}
              </ul>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}