import type { Metadata } from "next";
import Link from "next/link";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { currentMonth, formatINR, isValidMonth, monthLabel, monthRange, shiftMonth } from "@/lib/format";
import {
  RANGES, change, daysInMonth, monthOf, monthsBack, shortMonth, shortMonthYear, tone, valueAt,
} from "@/lib/insights";
import { GroupedBarChart, NetBars, PaceChart } from "@/components/charts";
import PageHeader from "@/components/PageHeader";

export const metadata: Metadata = { title: "Insights" };

export default async function InsightsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; m1?: string; m2?: string }>;
}) {
  const user = await requireUser();
  const sp = await searchParams;
  const householdId = user.householdId;
  const thisMonth = currentMonth();

  const rangeNum = Number(sp.range);
  const range = (RANGES as readonly number[]).includes(rangeNum) ? rangeNum : 6;
  const months = monthsBack(range);

  const pickable = monthsBack(12).reverse(); // newest first
  const m2 = isValidMonth(sp.m2) && pickable.includes(sp.m2) ? sp.m2 : thisMonth;
  let m1 = isValidMonth(sp.m1) && pickable.includes(sp.m1) ? sp.m1 : shiftMonth(m2, -1);
  if (m1 === m2) m1 = shiftMonth(m2, -1);
  const options = pickable.includes(m1) ? pickable : [...pickable, m1];

  const rangeStart = monthRange(months[0]).start;
  const rangeEnd = monthRange(thisMonth).end;
  const r1 = monthRange(m1);
  const r2 = monthRange(m2);

  const [rangeRows, cmpRows, categories] = await Promise.all([
    prisma.transaction.findMany({
      where: { householdId, date: { gte: rangeStart, lt: rangeEnd } },
      select: { date: true, type: true, amount: true },
    }),
    prisma.transaction.findMany({
      where: {
        householdId,
        OR: [{ date: { gte: r1.start, lt: r1.end } }, { date: { gte: r2.start, lt: r2.end } }],
      },
      select: { date: true, type: true, amount: true, categoryId: true },
    }),
    prisma.category.findMany({ where: { householdId } }),
  ]);

  // Month by month totals
  const monthly = new Map(months.map((m) => [m, { income: 0, expense: 0 }]));
  for (const r of rangeRows) {
    const entry = monthly.get(monthOf(r.date));
    if (!entry) continue;
    const v = Number(r.amount);
    if (r.type === "INCOME") entry.income += v;
    else entry.expense += v;
  }
  const withData = months.filter((m) => {
    const v = monthly.get(m)!;
    return v.income > 0 || v.expense > 0;
  });
  const complete = withData.filter((m) => m !== thisMonth);
  const basis = complete.length > 0 ? complete : withData;
  const average = (pick: (v: { income: number; expense: number }) => number) =>
    basis.length ? basis.reduce((s, m) => s + pick(monthly.get(m)!), 0) / basis.length : 0;
  const avgSpend = average((v) => v.expense);
  const avgSaved = average((v) => v.income - v.expense);
  const topSpend = withData.reduce<string | null>(
    (best, m) => (!best || monthly.get(m)!.expense > monthly.get(best)!.expense ? m : best),
    null,
  );
  const bestSave = withData.reduce<string | null>((best, m) => {
    const net = (k: string) => monthly.get(k)!.income - monthly.get(k)!.expense;
    return !best || net(m) > net(best) ? m : best;
  }, null);

  // Two month comparison
  function summarize(month: string) {
    const days = daysInMonth(month);
    const perDay = new Array<number>(days).fill(0);
    const cats = new Map<string, number>();
    let income = 0;
    let expense = 0;
    for (const r of cmpRows) {
      if (monthOf(r.date) !== month) continue;
      const v = Number(r.amount);
      if (r.type === "INCOME") income += v;
      else {
        expense += v;
        perDay[r.date.getUTCDate() - 1] += v;
        cats.set(r.categoryId, (cats.get(r.categoryId) ?? 0) + v);
      }
    }
    const cutoff = month === thisMonth ? new Date().getUTCDate() : days;
    let run = 0;
    const cumulative: (number | null)[] = perDay.map((v, i) => {
      run += v;
      return i < cutoff ? run : null;
    });
    return { month, days, income, expense, saved: income - expense, cats, cumulative, cutoff };
  }
  const A = summarize(m1);
  const B = summarize(m2);

  const catMap = new Map(categories.map((c) => [c.id, c]));
  const catIds = new Set([...A.cats.keys(), ...B.cats.keys()]);
  const catRows = [...catIds]
    .map((id) => ({
      name: catMap.get(id)?.name ?? "Unknown",
      color: catMap.get(id)?.color ?? "#5b6966",
      a: A.cats.get(id) ?? 0,
      b: B.cats.get(id) ?? 0,
    }))
    .sort((x, y) => Math.max(y.a, y.b) - Math.max(x.a, x.b));
  const shown = catRows.slice(0, 10);
  const rest = catRows.slice(10);
  if (rest.length > 0) {
    shown.push({
      name: "Other categories",
      color: "#9aa5a2",
      a: rest.reduce((s, r) => s + r.a, 0),
      b: rest.reduce((s, r) => s + r.b, 0),
    });
  }
  const barMax = Math.max(1, ...shown.flatMap((r) => [r.a, r.b]));

  const paceDays = Math.max(A.days, B.days);
  const paceDay = B.cutoff;
  const paceB = valueAt(B.cumulative, paceDay);
  const paceA = valueAt(A.cumulative, paceDay);

  const compareCards = [
    { label: "Income", a: A.income, b: B.income, goodWhenUp: true },
    { label: "Spent", a: A.expense, b: B.expense, goodWhenUp: false },
    { label: "Saved", a: A.saved, b: B.saved, goodWhenUp: true },
  ];

  const href = (r: number) => `/insights?range=${r}&m1=${m1}&m2=${m2}`;
  const monthsWithMoney = withData.length;

  return (
    <main className="mx-auto max-w-5xl space-y-8 px-5 py-8 sm:px-8">
      <PageHeader title="Insights" description="See how your household money moves from month to month.">
        <nav aria-label="Time range" className="flex rounded-lg border border-line bg-surface p-1">
          {RANGES.map((r) => (
            <Link
              key={r}
              href={href(r)}
              aria-current={r === range ? "page" : undefined}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                r === range ? "bg-brand text-white" : "text-muted hover:text-ink"
              }`}
            >
              {r} months
            </Link>
          ))}
        </nav>
      </PageHeader>

      {monthsWithMoney === 0 ? (
        <div className="card px-5 py-14 text-center">
          <p className="font-medium">No data to chart yet</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-muted">
            Add a few transactions and your trends will appear here.
          </p>
          <Link href="/transactions" className="btn btn-primary mt-4">Go to transactions</Link>
        </div>
      ) : (
        <>
          {/* Income vs spending */}
          <section className="card p-5" aria-labelledby="trend-heading">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 id="trend-heading" className="text-base font-semibold">Income vs spending</h2>
              <ul className="flex items-center gap-4 text-xs text-muted">
                <li className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-income" aria-hidden="true" />Income</li>
                <li className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-expense" aria-hidden="true" />Spent</li>
              </ul>
            </div>
            <div className="mt-4">
              <GroupedBarChart
                ariaLabel={`Income and spending for each of the last ${range} months`}
                aClass="fill-income"
                bClass="fill-expense"
                data={months.map((m) => {
                  const v = monthly.get(m)!;
                  return {
                    label: shortMonth(m),
                    title: `${monthLabel(m)}: income ${formatINR(v.income)}, spent ${formatINR(v.expense)}`,
                    a: v.income,
                    b: v.expense,
                  };
                })}
              />
            </div>

            <dl className="mt-5 grid grid-cols-2 gap-4 border-t border-line pt-5 lg:grid-cols-4">
              <div>
                <dt className="text-xs text-muted">Average spent per month</dt>
                <dd className="num mt-0.5 font-semibold">{formatINR(Math.round(avgSpend))}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted">Average saved per month</dt>
                <dd className={`num mt-0.5 font-semibold ${avgSaved >= 0 ? "text-income" : "text-expense"}`}>
                  {formatINR(Math.round(avgSaved))}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted">Highest spending month</dt>
                <dd className="mt-0.5 font-semibold">
                  {topSpend ? shortMonthYear(topSpend) : "None"}
                  {topSpend && <span className="num ml-1.5 text-sm font-normal text-muted">{formatINR(monthly.get(topSpend)!.expense)}</span>}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted">Best saving month</dt>
                <dd className="mt-0.5 font-semibold">
                  {bestSave ? shortMonthYear(bestSave) : "None"}
                  {bestSave && (
                    <span className="num ml-1.5 text-sm font-normal text-muted">
                      {formatINR(monthly.get(bestSave)!.income - monthly.get(bestSave)!.expense)}
                    </span>
                  )}
                </dd>
              </div>
            </dl>
            {complete.length > 0 && (
              <p className="mt-3 text-xs text-muted">Averages use complete months only, so this month is left out until it ends.</p>
            )}
          </section>

          {/* Savings */}
          <section className="card p-5" aria-labelledby="net-heading">
            <h2 id="net-heading" className="text-base font-semibold">Saved each month</h2>
            <p className="mt-1 text-sm text-muted">Income minus spending. Red bars mean you spent more than you earned.</p>
            <div className="mt-4">
              <NetBars
                ariaLabel={`Money saved in each of the last ${range} months`}
                data={months.map((m) => {
                  const v = monthly.get(m)!;
                  const net = v.income - v.expense;
                  return { label: shortMonth(m), title: `${monthLabel(m)}: ${net >= 0 ? "saved" : "overspent by"} ${formatINR(Math.abs(net))}`, value: net };
                })}
              />
            </div>
          </section>

          {/* Month table */}
          <section className="card overflow-hidden" aria-labelledby="table-heading">
            <h2 id="table-heading" className="px-5 pt-5 text-base font-semibold">Month by month</h2>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[420px] text-left text-sm">
                <thead className="border-y border-line bg-canvas text-xs text-muted">
                  <tr>
                    <th scope="col" className="px-5 py-2 font-medium">Month</th>
                    <th scope="col" className="px-3 py-2 text-right font-medium">Income</th>
                    <th scope="col" className="px-3 py-2 text-right font-medium">Spent</th>
                    <th scope="col" className="px-5 py-2 text-right font-medium">Saved</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {[...months].reverse().map((m) => {
                    const v = monthly.get(m)!;
                    const net = v.income - v.expense;
                    return (
                      <tr key={m}>
                        <th scope="row" className="px-5 py-2.5 font-medium">{monthLabel(m)}</th>
                        <td className="num px-3 py-2.5 text-right text-income">{formatINR(v.income)}</td>
                        <td className="num px-3 py-2.5 text-right text-expense">{formatINR(v.expense)}</td>
                        <td className={`num px-5 py-2.5 text-right font-medium ${net >= 0 ? "" : "text-expense"}`}>{formatINR(net)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}

      {/* Compare two months */}
      <section className="space-y-5" aria-labelledby="compare-heading">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 id="compare-heading" className="font-display text-2xl font-semibold tracking-tight">Compare two months</h2>
            <p className="mt-1 text-sm text-muted">Pick any two of the last 12 months to see what changed.</p>
          </div>
          <form action="/insights" method="get" className="flex flex-wrap items-end gap-3">
            <input type="hidden" name="range" value={range} />
            <div>
              <label htmlFor="m1" className="field-label">Baseline month</label>
              <select id="m1" name="m1" defaultValue={m1} className="input w-44">
                {options.map((m) => <option key={m} value={m}>{monthLabel(m)}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="m2" className="field-label">Compared month</label>
              <select id="m2" name="m2" defaultValue={m2} className="input w-44">
                {options.map((m) => <option key={m} value={m}>{monthLabel(m)}</option>)}
              </select>
            </div>
            <button className="btn btn-primary">Compare</button>
          </form>
        </div>

        <ul className="grid gap-4 sm:grid-cols-3">
          {compareCards.map((c) => {
            const ch = change(c.a, c.b);
            const Arrow = ch.diff === 0 ? Minus : ch.diff > 0 ? ArrowUpRight : ArrowDownRight;
            return (
              <li key={c.label} className="card p-4">
                <p className="text-xs text-muted">{c.label} in {shortMonthYear(m2)}</p>
                <p className="num mt-1 font-display text-2xl font-semibold">{formatINR(c.b)}</p>
                <p className={`mt-2 flex items-center gap-1 text-sm font-medium ${tone(ch.diff, c.goodWhenUp)}`}>
                  <Arrow size={16} aria-hidden="true" />
                  {ch.text}
                  <span className="num font-normal text-muted">
                    {" "}from {formatINR(c.a)} in {shortMonthYear(m1)}
                  </span>
                </p>
              </li>
            );
          })}
        </ul>

        {/* Pace */}
        <div className="card p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-base font-semibold">Spending pace through the month</h3>
            <ul className="flex items-center gap-4 text-xs text-muted">
              <li className="flex items-center gap-1.5"><span className="h-0.5 w-4 bg-muted" aria-hidden="true" />{shortMonthYear(m1)}</li>
              <li className="flex items-center gap-1.5"><span className="h-0.5 w-4 bg-brand" aria-hidden="true" />{shortMonthYear(m2)}</li>
            </ul>
          </div>
          <p className="mt-1 text-sm text-muted">
            {`By day ${paceDay}, spending in ${shortMonthYear(m2)} is ${formatINR(paceB)} compared with ${formatINR(paceA)} at the same point in ${shortMonthYear(m1)}.`}
          </p>
          <div className="mt-4">
            <PaceChart
              days={paceDays}
              ariaLabel={`Running total spent each day, ${shortMonthYear(m1)} compared with ${shortMonthYear(m2)}`}
              series={[
                { name: shortMonthYear(m1), stroke: "stroke-muted", fill: "fill-muted", values: A.cumulative },
                { name: shortMonthYear(m2), stroke: "stroke-brand", fill: "fill-brand", values: B.cumulative },
              ]}
            />
          </div>
          <p className="mt-1 text-center text-xs text-muted">Day of the month</p>
        </div>

        {/* Categories */}
        <div className="card p-5">
          <h3 className="text-base font-semibold">Spending by category</h3>
          {shown.length === 0 ? (
            <p className="mt-3 text-sm text-muted">No expenses in either month.</p>
          ) : (
            <ul className="mt-2 divide-y divide-line">
              {shown.map((r) => {
                const ch = change(r.a, r.b);
                return (
                  <li key={r.name} className="py-3">
                    <div className="flex items-center justify-between gap-3 text-sm">
                      <span className="flex min-w-0 items-center gap-2 font-medium">
                        <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: r.color }} aria-hidden="true" />
                        <span className="truncate">{r.name}</span>
                      </span>
                      <span className={`num shrink-0 text-xs font-medium ${tone(ch.diff, false)}`}>
                        {ch.text}
                        {ch.diff !== 0 && ` (${ch.diff > 0 ? "+" : "-"}${formatINR(Math.abs(ch.diff))})`}
                      </span>
                    </div>
                    <div className="mt-2 space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span className="w-12 shrink-0 text-xs text-muted">{shortMonthYear(m1)}</span>
                        <div className="h-2 flex-1 overflow-hidden rounded-full bg-canvas">
                          <div className="h-full rounded-full bg-muted/50" style={{ width: `${(r.a / barMax) * 100}%` }} />
                        </div>
                        <span className="num w-24 shrink-0 text-right text-xs text-muted">{formatINR(r.a)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-12 shrink-0 text-xs text-muted">{shortMonthYear(m2)}</span>
                        <div className="h-2 flex-1 overflow-hidden rounded-full bg-canvas">
                          <div className="h-full rounded-full" style={{ width: `${(r.b / barMax) * 100}%`, background: r.color }} />
                        </div>
                        <span className="num w-24 shrink-0 text-right text-xs font-medium">{formatINR(r.b)}</span>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>
    </main>
  );
}