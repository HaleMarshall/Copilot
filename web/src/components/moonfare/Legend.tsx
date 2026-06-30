import { tokenHex } from "./lib/geometry";

export interface LegendItem {
  name: string;
  /** A Moonfare color token, e.g. "data-1", "over", "brand". */
  colorToken: string;
  /** Render as a dashed line marker instead of a filled swatch. */
  dash?: boolean;
}

export interface LegendProps {
  items: LegendItem[];
}

/** Inline chart legend: color swatch (or dashed line) + name. */
export function Legend({ items }: LegendProps) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
      {items.map((it, i) => (
        <span
          key={i}
          className="inline-flex items-center gap-1.5 text-[12px] text-muted"
        >
          {it.dash ? (
            <span
              className="inline-block h-0 w-4 border-t-2 border-dashed"
              style={{ borderColor: tokenHex(it.colorToken) }}
            />
          ) : (
            <span
              className="inline-block h-2.5 w-2.5 rounded-sm"
              style={{ background: tokenHex(it.colorToken) }}
            />
          )}
          {it.name}
        </span>
      ))}
    </div>
  );
}
