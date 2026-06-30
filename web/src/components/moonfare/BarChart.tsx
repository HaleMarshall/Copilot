import { linScale, niceMax, tokenHex } from "./lib/geometry";

export interface BarSeries {
  name: string;
  colorToken: string;
  values: number[];
}

export interface BarChartProps {
  categories: string[];
  series: BarSeries[];
  variant?: "grouped" | "stacked";
  height?: number;
}

/** Vertical bar chart (grouped or stacked), hand-rolled SVG. */
export function BarChart({
  categories,
  series,
  variant = "grouped",
  height = 160,
}: BarChartProps) {
  const W = Math.max(categories.length * 56, 200);
  const H = height;
  const pad = 24;
  const max =
    variant === "stacked"
      ? niceMax(
          Math.max(
            ...categories.map((_, ci) =>
              series.reduce((s, se) => s + (se.values[ci] || 0), 0),
            ),
            1,
          ),
        )
      : niceMax(Math.max(...series.flatMap((s) => s.values), 1));
  const y = linScale(0, max, H - pad, pad);
  const bandW = (W - pad * 2) / categories.length;
  return (
    <svg
      width="100%"
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      preserveAspectRatio="xMidYMid meet"
    >
      <line x1={pad} y1={H - pad} x2={W - pad} y2={H - pad} stroke="#E5E2DC" />
      {categories.map((c, ci) => {
        const x0 = pad + ci * bandW;
        if (variant === "stacked") {
          let acc = 0;
          return (
            <g key={ci}>
              {series.map((se, si) => {
                const v = se.values[ci] || 0;
                const yTop = y(acc + v);
                const yBot = y(acc);
                acc += v;
                return (
                  <rect
                    key={si}
                    x={x0 + bandW * 0.2}
                    y={yTop}
                    width={bandW * 0.6}
                    height={Math.max(yBot - yTop, 0)}
                    fill={tokenHex(se.colorToken)}
                    rx={2}
                  />
                );
              })}
            </g>
          );
        }
        const bw = (bandW * 0.6) / series.length;
        return (
          <g key={ci}>
            {series.map((se, si) => {
              const v = se.values[ci] || 0;
              return (
                <rect
                  key={si}
                  x={x0 + bandW * 0.2 + si * bw}
                  y={y(v)}
                  width={bw * 0.85}
                  height={Math.max(H - pad - y(v), 0)}
                  fill={tokenHex(se.colorToken)}
                  rx={2}
                />
              );
            })}
          </g>
        );
      })}
      {categories.map((c, ci) => (
        <text
          key={ci}
          x={pad + ci * bandW + bandW / 2}
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
