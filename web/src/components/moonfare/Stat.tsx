export interface StatProps {
  value: string;
  label: string;
  sub?: string;
  delta?: string;
  deltaDir?: "up" | "down";
}

/** Big serif stat with label and optional over/under delta (▲/▼ + sign). */
export function Stat({ value, label, sub, delta, deltaDir }: StatProps) {
  const dir = deltaDir === "down" ? "text-under" : "text-over";
  const glyph = deltaDir === "down" ? "▼" : "▲";
  return (
    <div>
      <div className="font-serif text-3xl font-semibold leading-none text-ink">
        {value}
      </div>
      <div className="mt-1 text-[12.5px] text-muted">{label}</div>
      {(sub || delta) && (
        <div className="mt-1 flex items-center gap-2 text-[12px]">
          {delta && (
            <span className={`font-semibold ${dir}`}>
              {glyph} {delta}
            </span>
          )}
          {sub && <span className="text-muted">{sub}</span>}
        </div>
      )}
    </div>
  );
}
