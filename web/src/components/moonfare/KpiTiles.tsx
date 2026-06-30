export interface KpiTile {
  label: string;
  value: string;
  sub?: string;
}

export interface KpiTilesProps {
  tiles: KpiTile[];
}

/** Responsive row of bordered KPI tiles. */
export function KpiTiles({ tiles }: KpiTilesProps) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {tiles.map((t, i) => (
        <div key={i} className="rounded-xl border border-line bg-surface p-4">
          <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted">
            {t.label}
          </div>
          <div className="mt-1 font-serif text-xl font-semibold text-ink">
            {t.value}
          </div>
          {t.sub && <div className="mt-0.5 text-[11.5px] text-muted">{t.sub}</div>}
        </div>
      ))}
    </div>
  );
}
