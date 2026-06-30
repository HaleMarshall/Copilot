export interface ScorecardRow {
  label: string;
  you: string;
  peer: string;
  /** true = you are ahead (▲ over), false = behind (▼ under). */
  up: boolean;
}

export interface ScorecardTableProps {
  rows: ScorecardRow[];
  youLabel?: string;
  peerLabel?: string;
}

/** You-vs-peer comparison table with ▲/▼ over/under indicators. */
export function ScorecardTable({
  rows,
  youLabel = "You",
  peerLabel = "Peers",
}: ScorecardTableProps) {
  const th =
    "px-2 py-2 text-[11px] font-semibold uppercase tracking-[0.05em] text-muted";
  return (
    <table className="w-full border-collapse text-[13px]">
      <thead>
        <tr className="border-b border-line">
          <th className={`${th} text-left`}> </th>
          <th className={`${th} text-right`}>{youLabel}</th>
          <th className={`${th} text-right`}>{peerLabel}</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i} className="border-b border-line/60 last:border-0">
            <td className="px-2 py-2 text-ink">{r.label}</td>
            <td className="px-2 py-2 text-right font-semibold text-ink">
              <span className={`mr-1 ${r.up ? "text-over" : "text-under"}`}>
                {r.up ? "▲" : "▼"}
              </span>
              {r.you}
            </td>
            <td className="px-2 py-2 text-right text-muted">{r.peer}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
