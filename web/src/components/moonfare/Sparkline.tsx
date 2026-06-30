import { linScale, tokenHex } from "./lib/geometry";

export interface SparklineProps {
  values: number[];
  colorToken?: string;
  width?: number;
  height?: number;
}

/** Tiny inline trend line, no axes. */
export function Sparkline({
  values,
  colorToken = "brand",
  width = 80,
  height = 24,
}: SparklineProps) {
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const y = linScale(min, max, height - 2, 2);
  const x = linScale(0, Math.max(values.length - 1, 1), 1, width - 1);
  const pts = values.map((v, i) => `${x(i)},${y(v)}`).join(" ");
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img">
      <polyline
        points={pts}
        fill="none"
        stroke={tokenHex(colorToken)}
        strokeWidth={1.5}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}
