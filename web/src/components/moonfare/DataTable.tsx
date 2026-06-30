import { ReactNode } from "react";

export interface DataColumn {
  key: string;
  label: string;
  align?: "left" | "right" | "center";
}

export interface DataTableProps {
  columns: DataColumn[];
  rows: Record<string, ReactNode>[];
}

const alignClass = (a?: string) =>
  a === "right" ? "text-right" : a === "center" ? "text-center" : "text-left";

/** Generic bordered comparison table. */
export function DataTable({ columns, rows }: DataTableProps) {
  return (
    <table className="w-full border-collapse text-[13px]">
      <thead>
        <tr className="border-b border-line">
          {columns.map((c) => (
            <th
              key={c.key}
              className={`px-2 py-2 text-[11px] font-semibold uppercase tracking-[0.05em] text-muted ${alignClass(
                c.align,
              )}`}
            >
              {c.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i} className="border-b border-line/60 last:border-0">
            {columns.map((c) => (
              <td key={c.key} className={`px-2 py-2 text-ink ${alignClass(c.align)}`}>
                {r[c.key]}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
