import { getDataset } from "@/db/queries";

export const dynamic = "force-dynamic";

type Portfolio = {
  navText?: string;
  distributionsText?: string;
  irr?: string;
  dpi?: string;
  moic?: string;
};
type Strat = [key: string, label: string, color: string];

function Kpi({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-line bg-white p-4">
      <div className="text-[11px] text-muted">{label}</div>
      <div className="font-display mt-0.5 text-xl font-semibold">{value}</div>
      {sub ? <div className="text-[10px] text-muted">{sub}</div> : null}
    </div>
  );
}

export default async function Page() {
  // Every value below is read from the database (seeded from the Moonfare dataset).
  const portfolio = (await getDataset<Portfolio>("portfolio")) ?? {};
  const strats = (await getDataset<Strat[]>("strats")) ?? [];
  const mix =
    (await getDataset<Record<string, number>>("mix").then(
      (m) => (m as { you?: Record<string, number> })?.you ?? null
    )) ?? {};

  const total = Object.values(mix).reduce((a, b) => a + (b || 0), 0) || 1;

  return (
    <div className="flex flex-col gap-8">
      <section>
        <div className="text-[11px] uppercase tracking-[0.08em] text-muted">
          Understand · Portfolio
        </div>
        <h1 className="font-display text-2xl font-semibold">Your portfolio</h1>
        <p className="mt-1 max-w-xl text-sm text-muted">
          A production rebuild of Alpha Copilot — Next.js + a real database.
          Every figure on this page is read from the database.
        </p>
      </section>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Kpi label="Net IRR" value={portfolio.irr ?? "—"} sub="since inception" />
        <Kpi label="DPI" value={portfolio.dpi ?? "—"} sub="realised" />
        <Kpi label="MOIC" value={portfolio.moic ?? "—"} sub="net of fees" />
        <Kpi label="Portfolio value" value={portfolio.navText ?? "—"} sub="current NAV" />
        <Kpi label="Distributions" value={portfolio.distributionsText ?? "—"} sub="to date" />
        <Kpi label="Strategies" value={String(strats.length || "—")} sub="in your book" />
      </section>

      <section className="rounded-2xl border border-line bg-white p-5">
        <h2 className="font-display text-lg font-semibold">Strategy allocation</h2>
        <p className="mb-4 text-xs text-muted">Your current mix — from the database.</p>
        <div className="flex flex-col gap-2">
          {strats
            .filter(([k]) => (mix[k] || 0) > 0)
            .sort((a, b) => (mix[b[0]] || 0) - (mix[a[0]] || 0))
            .map(([k, label, color]) => {
              const pct = Math.round(((mix[k] || 0) / total) * 100);
              return (
                <div key={k} className="grid grid-cols-[160px_1fr_44px] items-center gap-3">
                  <div className="flex items-center gap-2 text-sm">
                    <span
                      className="h-2.5 w-2.5 flex-none rounded-sm"
                      style={{ background: `var(${color})` }}
                    />
                    <span className="truncate">{label}</span>
                  </div>
                  <div className="h-3 overflow-hidden rounded bg-[var(--surface-2)]">
                    <div
                      className="h-full rounded"
                      style={{ width: `${pct}%`, background: `var(${color})` }}
                    />
                  </div>
                  <div className="text-right font-display text-sm font-semibold">{pct}%</div>
                </div>
              );
            })}
        </div>
      </section>

      <p className="text-xs text-muted">
        Phase 1 foundation. The full Understand / Shape / Act / Research experience
        is being ported page by page onto this stack.
      </p>
    </div>
  );
}
