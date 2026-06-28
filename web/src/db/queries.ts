import { eq } from "drizzle-orm";
import { getDb } from "./client";
import { dataset } from "./schema";

// Typed accessors so pages never read raw JSON files — every figure is fetched
// from the database.
export async function getDataset<T = unknown>(key: string): Promise<T | null> {
  const db = await getDb();
  const rows = await db
    .select({ data: dataset.data })
    .from(dataset)
    .where(eq(dataset.key, key));
  return (rows[0]?.data as T) ?? null;
}

export async function getFullState(): Promise<Record<string, unknown>> {
  const db = await getDb();
  const rows = await db.select().from(dataset);
  const out: Record<string, unknown> = {};
  for (const r of rows) out[r.key] = r.data;
  return out;
}
