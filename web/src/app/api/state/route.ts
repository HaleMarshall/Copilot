import { getDb } from "@/db/client";
import { dataset, profileSaves } from "@/db/schema";

export const dynamic = "force-dynamic";

// Mirrors the legacy Python /api/state contract — but every value comes from
// the database.
export async function GET() {
  const db = await getDb();
  const rows = await db.select().from(dataset);
  const out: Record<string, unknown> = {};
  for (const r of rows) out[r.key] = r.data;
  const profs = await db.select().from(profileSaves);
  out.profiles = profs.map((p) => ({
    ...(p.data as Record<string, unknown>),
    id: p.id,
    ts: p.ts,
  }));
  return Response.json(out);
}

export async function POST(req: Request) {
  const body = await req.json();
  const db = await getDb();
  const [row] = await db
    .insert(profileSaves)
    .values({ data: body })
    .returning({ id: profileSaves.id });
  return Response.json({ ok: true, id: row.id });
}
