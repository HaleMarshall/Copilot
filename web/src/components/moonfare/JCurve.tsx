import { linScale, tokenHex } from "./lib/geometry";

export interface JCurvePoint {
  x: number;
  y: number;
  label: string;
}

export interface JCurveProps {
  points: JCurvePoint[];
  /** Optional reference curve as [x, y] pairs (dashed). */
  refCurve?: [number, number][];
  height?: number;
}

/** Signature J-curve: each holding plotted by maturity (x) vs net cash (y). */
export function JCurve({ points, refCurve, height = 200 }: JCurveProps) {
  const W = 360;
  const H = height;
  const pad = 28;
  const xs = points.map((p) => p.x).concat(refCurve?.map((r) => r[0]) ?? []);
  const ys = points.map((p) => p.y).concat(refCurve?.map((r) => r[1]) ?? []);
  const x = linScale(Math.min(...xs, 0), Math.max(...xs, 1), pad, W - pad);
  const y = linScale(Math.min(...ys, 0), Math.max(...ys, 1), H - pad, pad);
  return (
    <svg
      width="100%"
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      preserveAspectRatio="xMidYMid meet"
    >
      <line x1={pad} y1={y(0)} x2={W - pad} y2={y(0)} stroke="#E5E2DC" />
      {refCurve && (
        <polyline
          points={refCurve.map(([rx, ry]) => `${x(rx)},${y(ry)}`).join(" ")}
          fill="none"
          stroke={tokenHex("muted")}
          strokeWidth={1.5}
          strokeDasharray="4 3"
        />
      )}
      {points.map((p, i) => (
        <g key={i}>
          <circle
            cx={x(p.x)}
            cy={y(p.y)}
            r={5}
            fill={tokenHex(p.y >= 0 ? "over" : "under")}
          />
          <text
            x={x(p.x)}
            y={y(p.y) - 8}
            textAnchor="middle"
            className="fill-muted"
            style={{ fontSize: 9 }}
          >
            {p.label}
          </text>
        </g>
      ))}
    </svg>
  );
}
