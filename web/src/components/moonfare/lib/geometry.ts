import { MOONFARE_COLORS } from "../moonfare-preset";

/**
 * Token → hex lookup. SVG `fill`/`stroke` take colors from runtime props
 * (colorToken), and Tailwind cannot generate classes for dynamic names, so
 * charts resolve the hex directly here. Keys match the Tailwind color tokens.
 */
export const TOKEN_HEX: Record<string, string> = { ...MOONFARE_COLORS };

export function tokenHex(token: string): string {
  return TOKEN_HEX[token] ?? token; // pass through raw hex if not a known token
}

/** Point on a circle. Angle in degrees, 0° = 12 o'clock, clockwise positive. */
export function polarToCartesian(
  cx: number,
  cy: number,
  r: number,
  angleDeg: number,
): { x: number; y: number } {
  const a = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
}

/** SVG path `d` for a donut (annular) segment between two angles. */
export function donutArc(
  cx: number,
  cy: number,
  rOuter: number,
  rInner: number,
  startDeg: number,
  endDeg: number,
): string {
  const largeArc = endDeg - startDeg > 180 ? 1 : 0;
  const oStart = polarToCartesian(cx, cy, rOuter, endDeg);
  const oEnd = polarToCartesian(cx, cy, rOuter, startDeg);
  const iStart = polarToCartesian(cx, cy, rInner, startDeg);
  const iEnd = polarToCartesian(cx, cy, rInner, endDeg);
  return [
    `M ${oStart.x} ${oStart.y}`,
    `A ${rOuter} ${rOuter} 0 ${largeArc} 0 ${oEnd.x} ${oEnd.y}`,
    `L ${iStart.x} ${iStart.y}`,
    `A ${rInner} ${rInner} 0 ${largeArc} 1 ${iEnd.x} ${iEnd.y}`,
    "Z",
  ].join(" ");
}

/** Linear scale factory mapping a domain to a range. */
export function linScale(
  domainMin: number,
  domainMax: number,
  rangeMin: number,
  rangeMax: number,
): (v: number) => number {
  const d = domainMax - domainMin || 1;
  return (v: number) =>
    rangeMin + ((v - domainMin) / d) * (rangeMax - rangeMin);
}

/** Round an axis maximum up to a clean number (1/2/2.5/5 × 10^n). */
export function niceMax(max: number): number {
  if (max <= 0) return 1;
  const exp = Math.floor(Math.log10(max));
  const base = Math.pow(10, exp);
  const frac = max / base;
  const nice = frac <= 1 ? 1 : frac <= 2 ? 2 : frac <= 2.5 ? 2.5 : frac <= 5 ? 5 : 10;
  return nice * base;
}
