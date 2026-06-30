"use client";
import { useState } from "react";
import {
  Card,
  Badge,
  Pill,
  Stat,
  KpiTiles,
  Legend,
  DataTable,
  Gauge,
  Donut,
  BarChart,
  LineChart,
  Sparkline,
  JCurve,
  ScorecardTable,
} from "@/components/moonfare";

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <div data-component={id} className="space-y-3">
      <h2 className="font-serif text-sm font-semibold uppercase tracking-[0.08em] text-muted">
        {title}
      </h2>
      <div>{children}</div>
    </div>
  );
}

export default function GalleryPage() {
  const [active, setActive] = useState("Buyout");
  return (
    <div className="space-y-10 bg-surface-2 p-2 font-sans text-ink">
      <h1 className="font-serif text-2xl font-semibold">Moonfare UI — Component Gallery</h1>

      <Section id="Card" title="Card">
        <Card eyebrow="Net Performance" title="Your portfolio" cta={{ label: "See detail" }}>
          <p className="text-[13px] text-muted">Card body content goes here.</p>
        </Card>
      </Section>

      <Section id="Badge" title="Badge">
        <div className="flex gap-2">
          <Badge label="Buyout" tone="brand" />
          <Badge label="Top quartile" tone="over" />
          <Badge label="Under target" tone="under" />
          <Badge label="Pipeline" tone="neutral" />
        </div>
      </Section>

      <Section id="Pill" title="Pill">
        <div className="flex gap-2">
          {["Buyout", "Growth", "Credit"].map((p) => (
            <Pill key={p} label={p} active={active === p} onClick={() => setActive(p)} />
          ))}
        </div>
      </Section>

      <Section id="Stat" title="Stat">
        <div className="flex gap-10">
          <Stat value="€16.6m" label="Portfolio value" delta="3.7%" deltaDir="up" sub="QoQ" />
          <Stat value="2.09x" label="TVPI (net)" delta="0.4%" deltaDir="down" sub="vs Q4" />
        </div>
      </Section>

      <Section id="KpiTiles" title="KpiTiles">
        <KpiTiles
          tiles={[
            { label: "Committed", value: "€20.5m" },
            { label: "Called", value: "€13.0m", sub: "63%" },
            { label: "Uncalled", value: "€7.5m" },
            { label: "Distributions", value: "€10.6m" },
          ]}
        />
      </Section>

      <Section id="Legend" title="Legend">
        <Legend
          items={[
            { name: "You", colorToken: "data-1" },
            { name: "Peers", colorToken: "peer" },
            { name: "Model", colorToken: "model", dash: true },
          ]}
        />
      </Section>

      <Section id="DataTable" title="DataTable">
        <DataTable
          columns={[
            { key: "m", label: "Metric" },
            { key: "you", label: "You", align: "right" },
            { key: "peer", label: "Peers", align: "right" },
          ]}
          rows={[
            { m: "Net IRR", you: "11.0%", peer: "9.4%" },
            { m: "Funds held", you: "8", peer: "6" },
          ]}
        />
      </Section>

      <Section id="Gauge" title="Gauge">
        <Gauge
          value={64}
          segments={[
            { label: "Waiting", colorToken: "data-9", from: 0, to: 40 },
            { label: "Neutral", colorToken: "platform", from: 40, to: 60 },
            { label: "Buying", colorToken: "over", from: 60, to: 100 },
          ]}
          label="Sentiment: leaning in (64)"
        />
      </Section>

      <Section id="Donut" title="Donut">
        <Donut
          centerLabel="€16.6m"
          centerSub="NAV"
          slices={[
            { label: "Buyout", value: 38, colorToken: "data-1" },
            { label: "Growth", value: 14, colorToken: "data-2" },
            { label: "AI", value: 18, colorToken: "data-8" },
            { label: "Credit", value: 12, colorToken: "data-5" },
            { label: "Other", value: 18, colorToken: "data-9" },
          ]}
        />
      </Section>

      <Section id="BarChart" title="BarChart">
        <div className="max-w-md">
          <BarChart
            categories={["2021", "2022", "2023", "2024", "2025"]}
            series={[
              { name: "Calls", colorToken: "indigo", values: [3.2, 2.4, 1.8, 1.4, 0.7] },
              { name: "Dists", colorToken: "mint", values: [0.3, 0.8, 1.8, 2.9, 4.8] },
            ]}
          />
        </div>
      </Section>

      <Section id="LineChart" title="LineChart">
        <div className="max-w-md">
          <LineChart
            area
            categories={["19", "20", "21", "22", "23", "24", "25"]}
            series={[{ name: "NAV", colorToken: "data-1", values: [1, 3, 6, 9, 12, 14, 16.6] }]}
          />
        </div>
      </Section>

      <Section id="Sparkline" title="Sparkline">
        <Sparkline values={[2.4, 1.8, 2.1, 1.6, 2.9]} colorToken="mint" />
      </Section>

      <Section id="JCurve" title="JCurve">
        <div className="max-w-md">
          <JCurve
            refCurve={[
              [0, -0.6],
              [3, -0.3],
              [5, 0.3],
              [8, 1.2],
            ]}
            points={[
              { x: 1, y: -0.5, label: "Ares" },
              { x: 3, y: -0.1, label: "CVC" },
              { x: 6, y: 0.9, label: "EQT" },
            ]}
          />
        </div>
      </Section>

      <Section id="ScorecardTable" title="ScorecardTable">
        <ScorecardTable
          rows={[
            { label: "Suggested ticket", you: "€150k", peer: "€128k", up: true },
            { label: "Commitments / yr", you: "3", peer: "2.1", up: true },
            { label: "Credit weight", you: "2%", peer: "9%", up: false },
          ]}
        />
      </Section>
    </div>
  );
}
