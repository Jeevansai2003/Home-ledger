import Logo from "./Logo";

export default function AuthShell({
  title,
  subtitle,
  footer,
  children,
}: {
  title: string;
  subtitle: string;
  footer: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <aside className="ledger-paper hidden flex-col justify-between bg-brand p-12 pl-24 text-white lg:flex">
        <Logo tone="light" />
        <div className="max-w-md">
          <p className="font-display text-4xl font-semibold leading-tight tracking-tight">
            One shared book for everything your household earns and spends.
          </p>
          <p className="mt-4 text-white/75">
            Log expenses, set monthly budgets and keep every family member on the same page.
          </p>
        </div>
        <p className="text-sm text-white/60">Built for families, not accountants.</p>
      </aside>

      <section className="flex items-center justify-center px-5 py-10">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <Logo />
          </div>
          <h1 className="font-display text-3xl font-semibold tracking-tight">{title}</h1>
          <p className="mt-2 text-muted">{subtitle}</p>
          <div className="mt-8">{children}</div>
          <p className="mt-6 text-center text-sm text-muted">{footer}</p>
        </div>
      </section>
    </main>
  );
}