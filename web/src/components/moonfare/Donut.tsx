import { donutArc, tokenHex } from "./lib/geometry";

export interface DonutSlice {
  label: string;
  value: number;
  colorToken: string;
}

export interface DonutProps {
  slices: DonutSlice[];
  size?: number;
  thickness?: number;
  centerLabel?: string;
  centerSub?: string;
}

/** Categorical donut chart (hand-rolled SVG) with optional center label. */
export function Donut({
  slices,
  size = 160,
  thickness = 26,
  centerLabel,
  centerSub,
}: DonutProps) {
  const total = slices.reduce((s, x) => s + x.value, 0) || 1;
  const cx = size / 2;
  const cy = size / 2;
  const rOuter = size / 2;
  const rInner = size / 2 - thickness;
  let angle = 0;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img">
      {slices.map((s, i) => {
        const sweep = (s.value / total) * 360;
        // clamp a single full slice slightly under 360 so the arc renders
        const end = sweep >= 360 ? 359.999 : angle + sweep;
        const d = donutArc(cx, cy, rOuter, rInner, angle, end);
        angle += sweep;
        return <path key={i} d={d} fill={tokenHex(s.colorToken)} />;
      })}
      {centerLabel && (
        <text
          x={cx}
          y={centerSub ? cy - 2 : cy + 4}
          textAnchor="middle"
          className="fill-ink font-serif"
          style={{ fontSize: 20, fontWeight: 600 }}
        >
          {centerLabel}
        </text>
      )}
      {centerSub && (
        <text
          x={cx}
          y={cy + 16}
          textAnchor="middle"
          className="fill-muted"
          style={{ fontSize: 11 }}
        >
          {centerSub}
        </text>
      )}
    </svg>
  );
}
