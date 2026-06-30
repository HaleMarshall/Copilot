import { linScale, niceMax, tokenHex } from "./lib/geometry";

export interface LineSeries {
  name: string;
  colorToken: string;
  values: number[];
}

export interface LineChartProps {
  categories: string[];
  series: LineSeries[];
  area?: boolean;
  height?: number;
}

/** Multi-series line chart with optional area fill, hand-rolled SVG. */
export function LineChart({
  categories,
  series,
  area = false,
  height = 160,
}: LineChartProps) {
  const W = Math.max(categories.length * 56, 240);
  const H = height;
  const pad = 24;
  const max = niceMax(Math.max(...series.flatMap((s) => s.values), 1));
  const min = Math.min(0, ...series.flatMap((s) => s.values));
  const y = linScale(min, max, H - pad, pad);
  const x = linScale(0, Math.max(categories.length - 1, 1), pad, W - pad);
  return (
    <svg
      width="100%"
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      preserveAspectRatio="xMidYMid meet"
    >
      <line x1={pad} y1={y(0)} x2={W - pad} y2={y(0)} stroke="#E5E2DC" />
      {series.map((s, si) => {
        const pts = s.values.map((v, i) => `${x(i)},${y(v)}`).join(" ");
        const hex = tokenHex(s.colorToken);
        return (
          <g key={si}>
            {area && (
              <polygon
                points={`${x(0)},${y(0)} ${pts} ${x(s.values.length - 1)},${y(0)}`}
                fill={hex}
                opacity={0.12}
              />
            )}
            <polyline
              points={pts}
              fill="none"
              stroke={hex}
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          </g>
        );
      })}
      {categories.map((c, ci) => (
        <text
          key={ci}
          x={x(ci)}
          y={H - pad + 14}
          textAnchor="middle"
          className="fill-muted"
          style={{ fontSize: 10 }}
        >
          {c}
        </text>
      ))}
    </svg>
  );
}
