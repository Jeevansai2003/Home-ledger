export default function Logo({ tone = "dark" }: { tone?: "dark" | "light" }) {
  const light = tone === "light";
  return (
    <span className="inline-flex items-center gap-2.5">
      <svg width="28" height="28" viewBox="0 0 28 28" aria-hidden="true">
        <rect width="28" height="28" rx="8" className={light ? "fill-white" : "fill-brand"} />
        <path
          d="M8 9h12M8 14h12M8 19h7"
          strokeWidth="2"
          strokeLinecap="round"
          className={light ? "stroke-brand" : "stroke-white"}
        />
        <circle cx="20.5" cy="19" r="2.2" className="fill-accent" />
      </svg>
      <span
        className={`font-display text-lg font-semibold tracking-tight ${
          light ? "text-white" : "text-ink"
        }`}
      >
        Home Ledger
      </span>
    </span>
  );
}