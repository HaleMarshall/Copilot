import { getDb } from "@/db/client";
import { dataset, profileSaves } from "@/db/schema";
import { sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

// GET — the seeded reference dataset every page renders from, plus how many
// profiles have been saved. Raw saved-profile records are intentionally NOT
// returned (they belong to whoever submitted them — exposing them would be an
// IDOR/data-leak), only an aggregate count the onboarding gate needs.
export async function GET() {
  const db = await getDb();
  const rows = await db.select().from(dataset);
  const out: Record<string, unknown> = {};
  for (const r of rows) out[r.key] = r.data;
  const [{ c }] = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(profileSaves);
  out.profilesCount = Number(c);
  return Response.json(out);
}

// POST — save an onboarding profile. State-changing, so the body is strictly
// validated: size-capped, object-only, and reduced to a fixed allowlist of
// fields with coerced types / clamped lengths. Nothing else is persisted.
const MAX_BODY = 8 * 1024; // 8 KB
const STR_FIELDS = ["risk", "horizon", "wealth", "goal", "liquidity", "strategyPref", "theme", "will", "context"] as const;
const NUM_FIELDS = ["wealthM", "targetPct"] as const;

function sanitize(input: unknown): Record<string, unknown> | null {
  if (typeof input !== "object" || input === null || Array.isArray(input)) return null;
  const src = input as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const k of STR_FIELDS) {
    if (typeof src[k] === "string") out[k] = (src[k] as string).slice(0, 500);
  }
  for (const k of NUM_FIELDS) {
    const n = Number(src[k]);
    if (Number.isFinite(n)) out[k] = Math.max(0, Math.min(1e9, n));
  }
  if (typeof src.consent === "boolean") out.consent = src.consent;
  return out;
}

export async function POST(req: Request) {
  let raw: string;
  try {
    raw = await req.text();
  } catch {
    return Response.json({ error: "invalid body" }, { status: 400 });
  }
  if (raw.length > MAX_BODY) {
    return Response.json({ error: "payload too large" }, { status: 413 });
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return Response.json({ error: "invalid JSON" }, { status: 400 });
  }
  const clean = sanitize(parsed);
  if (!clean || Object.keys(clean).length === 0) {
    return Response.json({ error: "no valid fields" }, { status: 400 });
  }
  const db = await getDb();
  const [row] = await db
    .insert(profileSaves)
    .values({ data: clean })
    .returning({ id: profileSaves.id });
  return Response.json({ ok: true, id: row.id });
}
