import { tokenHex, linScale } from "./lib/geometry";

export interface GaugeSegment {
  label: string;
  colorToken: string;
  from: number;
  to: number;
}

export interface GaugeProps {
  value: number;
  min?: number;
  max?: number;
  segments: GaugeSegment[];
  label?: string;
}

/** Horizontal segmented gauge with a marker at `value`. */
export function Gauge({ value, min = 0, max = 100, segments, label }: GaugeProps) {
  const pos = linScale(min, max, 0, 100);
  return (
    <div>
      <div className="relative h-3 w-full overflow-hidden rounded-full bg-surface-2">
        {segments.map((s, i) => (
          <div
            key={i}
            className="absolute top-0 h-full"
            style={{
              left: `${pos(s.from)}%`,
              width: `${pos(s.to) - pos(s.from)}%`,
              background: tokenHex(s.colorToken),
            }}
          />
        ))}
        <div
          className="absolute top-1/2 h-4 w-1 -translate-y-1/2 rounded-full bg-ink ring-2 ring-white"
          style={{ left: `calc(${pos(value)}% - 2px)` }}
        />
      </div>
      {label && <div className="mt-1.5 text-[12px] text-muted">{label}</div>}
    </div>
  );
}
