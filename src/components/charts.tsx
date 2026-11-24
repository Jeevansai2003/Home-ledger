import { formatINR } from "@/lib/format";

// Simple server-rendered SVG charts (no extra packages needed).

const W = 640;
const H = 260;
const M = { top: 18, right: 12, bottom: 30, left: 54 };
const INNER_W = W - M.left - M.right;
const INNER_H = H - M.top - M.bottom;

const trim = (v: number) => (Math.round(v * 10) / 10).toString();

// Short Indian-style amounts: 1.2L, 3.4Cr, 12k
export function compactINR(n: number) {
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (abs >= 1e7) return `${sign}₹${trim(abs / 1e7)}Cr`;
  if (abs >= 1e5) return `${sign}₹${trim(abs / 1e5)}L`;
  if (abs >= 1e3) return `${sign}₹${trim(abs / 1e3)}k`;
  return `${sign}₹${Math.round(abs)}`;
}

// Rounds a maximum up to 1, 2, 5 or 10 times a power of ten
function niceMax(v: number) {
  if (v <= 0) return 1000;
  const exp = Math.pow(10, Math.floor(Math.log10(v)));
  const f = v / exp;
  const nice = f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10;
  return nice * exp;
}

function GridLines({ ticks, y }: { ticks: number[]; y: (v: number) => number }) {
  return (
    <>
      {ticks.map((t, i) => (
        <g key={i}>
          <line
            x1={M.left}
            x2={W - M.right}
            y1={y(t)}
            y2={y(t)}
            className={t === 0 ? "stroke-muted/40" : "stroke-line"}
            strokeDasharray={t === 0 ? undefined : "3 4"}
          />
          <text x={M.left - 8} y={y(t) + 4} textAnchor="end" className="fill-muted text-[11px]">
            {compactINR(t)}
          </text>
        </g>
      ))}
    </>
  );
}

// Two bars per month (for example income and spending)
export function GroupedBarChart({
  data,
  ariaLabel,
  aClass,
  bClass,
}: {
  data: { label: string; title: string; a: number; b: number }[];
  ariaLabel: string;
  aClass: string;
  bClass: string;
}) {
  const max = niceMax(Math.max(0, ...data.flatMap((d) => [d.a, d.b])));
  const y = (v: number) => M.top + INNER_H - (v / max) * INNER_H;
  const ticks = [0, 1, 2, 3, 4].map((i) => (max / 4) * i);
  const band = INNER_W / data.length;
  const barW = Math.min(28, band * 0.32);
  const gap = 4;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={ariaLabel} className="h-auto w-full">
      <GridLines ticks={ticks} y={y} />
      {data.map((d, i) => {
        const cx = M.left + band * i + band / 2;
        return (
          <g key={i}>
            <title>{d.title}</title>
            <rect x={cx - barW - gap / 2} y={y(d.a)} width={barW} height={Math.max(0, y(0) - y(d.a))} rx={3} className={aClass} />
            <rect x={cx + gap / 2} y={y(d.b)} width={barW} height={Math.max(0, y(0) - y(d.b))} rx={3} className={bClass} />
            <text x={cx} y={H - 9} textAnchor="middle" className="fill-muted text-[11px]">
              {d.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// One bar per month, green above zero and red below
export function NetBars({
  data,
  ariaLabel,
}: {
  data: { label: string; title: string; value: number }[];
  ariaLabel: string;
}) {
  const values = data.map((d) => d.value);
  const hasPos = values.some((v) => v > 0);
  const hasNeg = values.some((v) => v < 0);
  const hi = hasPos ? niceMax(Math.max(...values)) : hasNeg ? 0 : 1000;
  const lo = hasNeg ? -niceMax(-Math.min(...values)) : 0;
  const y = (v: number) => M.top + INNER_H - ((v - lo) / (hi - lo || 1000)) * INNER_H;
  const ticks = [...(lo < 0 ? [lo] : []), 0, ...(hi > 0 ? [hi] : [])];
  const band = INNER_W / data.length;
  const barW = Math.min(34, band * 0.55);
  const showValues = data.length <= 8;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={ariaLabel} className="h-auto w-full">
      <GridLines ticks={ticks} y={y} />
      {data.map((d, i) => {
        const cx = M.left + band * i + band / 2;
        const top = d.value >= 0 ? y(d.value) : y(0);
        const height = Math.abs(y(d.value) - y(0));
        return (
          <g key={i}>
            <title>{d.title}</title>
            <rect
              x={cx - barW / 2}
              y={top}
              width={barW}
              height={height}
              rx={3}
              className={d.value >= 0 ? "fill-income" : "fill-expense"}
            />
            {showValues && d.value !== 0 && (
              <text
                x={cx}
                y={d.value >= 0 ? top - 5 : top + height + 13}
                textAnchor="middle"
                className="fill-ink text-[11px] font-medium"
              >
                {compactINR(d.value)}
              </text>
            )}
            <text x={cx} y={H - 9} textAnchor="middle" className="fill-muted text-[11px]">
              {d.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// Running total through the days of a month, one line per month
export function PaceChart({
  days,
  series,
  ariaLabel,
}: {
  days: number;
  series: { name: string; stroke: string; fill: string; values: (number | null)[] }[];
  ariaLabel: string;
}) {
  const all = series.flatMap((s) => s.values.filter((v): v is number => v !== null));
  const max = niceMax(Math.max(0, ...all));
  const x = (day: number) => M.left + ((day - 1) / Math.max(1, days - 1)) * INNER_W;
  const y = (v: number) => M.top + INNER_H - (v / max) * INNER_H;
  const ticks = [0, 1, 2, 3, 4].map((i) => (max / 4) * i);
  const labelDays = [1, 5, 10, 15, 20, 25, 30].filter((d) => d <= days);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={ariaLabel} className="h-auto w-full">
      <GridLines ticks={ticks} y={y} />
      {labelDays.map((d) => (
        <text key={d} x={x(d)} y={H - 9} textAnchor="middle" className="fill-muted text-[11px]">
          {d}
        </text>
      ))}
      {series.map((s) => {
        const points = s.values
          .map((v, i) => (v === null ? null : `${x(i + 1)},${y(v)}`))
          .filter((p): p is string => p !== null);
        const lastIdx = s.values.reduce<number>((acc, v, i) => (v !== null ? i : acc), -1);
        const lastVal = lastIdx >= 0 ? (s.values[lastIdx] as number) : 0;
        if (points.length === 0) return null;
        return (
          <g key={s.name}>
            <path
              d={`M ${points.join(" L ")}`}
              fill="none"
              strokeWidth={2.5}
              strokeLinejoin="round"
              strokeLinecap="round"
              className={s.stroke}
            />
            <circle cx={x(lastIdx + 1)} cy={y(lastVal)} r={4.5} className={s.fill}>
              <title>{`${s.name}: ${formatINR(lastVal)} by day ${lastIdx + 1}`}</title>
            </circle>
          </g>
        );
      })}
    </svg>
  );
}

// ----- Added: line chart by month, donut and stacked bars -----

function domainFor(values: number[]) {
  const hasPos = values.some((v) => v > 0);
  const hasNeg = values.some((v) => v < 0);
  const hi = hasPos ? niceMax(Math.max(...values)) : hasNeg ? 0 : 1000;
  const lo = hasNeg ? -niceMax(-Math.min(...values)) : 0;
  const ticks = lo < 0 ? [lo, 0, ...(hi > 0 ? [hi] : [])] : [0, 1, 2, 3, 4].map((i) => (hi / 4) * i);
  return { lo, hi, ticks };
}

// One line per series, one point per month. Handles values below zero.
export function LineChartMonths({
  labels,
  series,
  ariaLabel,
}: {
  labels: { short: string; title: string }[];
  series: { name: string; stroke: string; fill: string; values: number[] }[];
  ariaLabel: string;
}) {
  const { lo, hi, ticks } = domainFor(series.flatMap((s) => s.values));
  const y = (v: number) => M.top + INNER_H - ((v - lo) / (hi - lo || 1000)) * INNER_H;
  const band = INNER_W / labels.length;
  const x = (i: number) => M.left + band * i + band / 2;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={ariaLabel} className="h-auto w-full">
      <GridLines ticks={ticks} y={y} />
      {labels.map((l, i) => (
        <text key={i} x={x(i)} y={H - 9} textAnchor="middle" className="fill-muted text-[11px]">
          {l.short}
        </text>
      ))}
      {series.map((s) => (
        <g key={s.name}>
          <path
            d={`M ${s.values.map((v, i) => `${x(i)},${y(v)}`).join(" L ")}`}
            fill="none"
            strokeWidth={2.5}
            strokeLinejoin="round"
            strokeLinecap="round"
            className={s.stroke}
          />
          {s.values.map((v, i) => (
            <circle key={i} cx={x(i)} cy={y(v)} r={4} className={s.fill}>
              <title>{`${labels[i].title}: ${s.name} ${formatINR(v)}`}</title>
            </circle>
          ))}
        </g>
      ))}
    </svg>
  );
}

// Share of a total, as a ring
export function DonutChart({
  slices,
  total,
  centerLabel,
  ariaLabel,
}: {
  slices: { name: string; value: number; color: string; title: string }[];
  total: number;
  centerLabel: string;
  ariaLabel: string;
}) {
  const size = 220;
  const c = size / 2;
  const r = 82;
  const stroke = 30;
  const circumference = 2 * Math.PI * r;
  const gap = slices.length > 1 ? 2 : 0;
  const starts = slices.map((_, i) => slices.slice(0, i).reduce((s, x) => s + x.value, 0));

  return (
    <svg viewBox={`0 0 ${size} ${size}`} role="img" aria-label={ariaLabel} className="h-auto w-full max-w-[220px]">
      <circle cx={c} cy={c} r={r} fill="none" strokeWidth={stroke} className="stroke-canvas" />
      {total > 0 &&
        slices.map((s, i) => {
          const length = (s.value / total) * circumference;
          const dash = Math.max(0, length - gap);
          const offset = (starts[i] / total) * circumference;
          return (
            <circle
              key={i}
              cx={c}
              cy={c}
              r={r}
              fill="none"
              stroke={s.color}
              strokeWidth={stroke}
              strokeDasharray={`${dash} ${circumference - dash}`}
              strokeDashoffset={-offset}
              transform={`rotate(-90 ${c} ${c})`}
            >
              <title>{s.title}</title>
            </circle>
          );
        })}
      <text x={c} y={c - 2} textAnchor="middle" className="fill-ink text-[20px] font-semibold">
        {compactINR(total)}
      </text>
      <text x={c} y={c + 18} textAnchor="middle" className="fill-muted text-[11px]">
        {centerLabel}
      </text>
    </svg>
  );
}

// One bar per month, split into coloured parts (for example by category)
export function StackedBars({
  data,
  ariaLabel,
}: {
  data: { label: string; title: string; parts: { name: string; color: string; value: number }[] }[];
  ariaLabel: string;
}) {
  const totals = data.map((d) => d.parts.reduce((s, p) => s + p.value, 0));
  const max = niceMax(Math.max(0, ...totals));
  const y = (v: number) => M.top + INNER_H - (v / max) * INNER_H;
  const ticks = [0, 1, 2, 3, 4].map((i) => (max / 4) * i);
  const band = INNER_W / data.length;
  const barW = Math.min(40, band * 0.6);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={ariaLabel} className="h-auto w-full">
      <GridLines ticks={ticks} y={y} />
      {data.map((d, i) => {
        const cx = M.left + band * i + band / 2;
        return (
          <g key={i}>
            {d.parts.map((p, k) => {
              const before = d.parts.slice(0, k).reduce((s, q) => s + q.value, 0);
              const top = y(before + p.value);
              return (
                <rect key={k} x={cx - barW / 2} y={top} width={barW} height={Math.max(0, y(before) - top)} fill={p.color}>
                  <title>{`${d.title}: ${p.name} ${formatINR(p.value)}`}</title>
                </rect>
              );
            })}
            {data.length <= 8 && totals[i] > 0 && (
              <text x={cx} y={y(totals[i]) - 5} textAnchor="middle" className="fill-ink text-[11px] font-medium">
                {compactINR(totals[i])}
              </text>
            )}
            <text x={cx} y={H - 9} textAnchor="middle" className="fill-muted text-[11px]">
              {d.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
