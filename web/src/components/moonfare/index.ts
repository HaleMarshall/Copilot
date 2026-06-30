// Moonfare UI — public surface (global name: MoonfareUI).
// Foundations
export { Card } from "./Card";
export type { CardProps } from "./Card";
export { Badge } from "./Badge";
export type { BadgeProps, BadgeTone } from "./Badge";
export { Pill } from "./Pill";
export type { PillProps } from "./Pill";
export { Stat } from "./Stat";
export type { StatProps } from "./Stat";
export { KpiTiles } from "./KpiTiles";
export type { KpiTile, KpiTilesProps } from "./KpiTiles";
export { Legend } from "./Legend";
export type { LegendItem, LegendProps } from "./Legend";
export { DataTable } from "./DataTable";
export type { DataColumn, DataTableProps } from "./DataTable";
export { Gauge } from "./Gauge";
export type { GaugeSegment, GaugeProps } from "./Gauge";

// Charts
export { Donut } from "./Donut";
export type { DonutSlice, DonutProps } from "./Donut";
export { BarChart } from "./BarChart";
export type { BarSeries, BarChartProps } from "./BarChart";
export { LineChart } from "./LineChart";
export type { LineSeries, LineChartProps } from "./LineChart";
export { Sparkline } from "./Sparkline";
export type { SparklineProps } from "./Sparkline";
export { JCurve } from "./JCurve";
export type { JCurvePoint, JCurveProps } from "./JCurve";
export { ScorecardTable } from "./ScorecardTable";
export type { ScorecardRow, ScorecardTableProps } from "./ScorecardTable";

// Tokens
export { MOONFARE_COLORS, default as moonfarePreset } from "./moonfare-preset";
export { tokenHex, TOKEN_HEX } from "./lib/geometry";
