import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { sql } from "drizzle-orm";
import { dataset } from "./schema";
import seed from "../data/alpha_seed.json";

// A single embedded-Postgres instance per server process, seeded from the
// bundled dataset on first use. No external service required — so the site
// runs identically in local dev and on a free serverless deploy.
//
// To use a persistent Postgres (e.g. Neon) instead, set DATABASE_URL and swap
// the driver here for `drizzle-orm/postgres-js` — the schema + queries are
// unchanged. See web/README.md.

type DB = ReturnType<typeof drizzle>;
let _dbPromise: Promise<DB> | null = null;

async function init(): Promise<DB> {
  const client = new PGlite(); // in-memory
  await client.exec(`
    CREATE TABLE IF NOT EXISTS dataset (key text PRIMARY KEY, data jsonb NOT NULL);
    CREATE TABLE IF NOT EXISTS profile_saves (id serial PRIMARY KEY, ts timestamptz DEFAULT now(), data jsonb NOT NULL);
    CREATE TABLE IF NOT EXISTS simulations (id serial PRIMARY KEY, ts timestamptz DEFAULT now(), data jsonb NOT NULL);
  `);
  const db = drizzle(client);

  const [{ c }] = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(dataset);
  if (Number(c) === 0) {
    const rows = Object.entries(seed as Record<string, unknown>).map(
      ([key, data]) => ({ key, data })
    );
    if (rows.length) await db.insert(dataset).values(rows);
  }
  return db;
}

export function getDb(): Promise<DB> {
  if (!_dbPromise) _dbPromise = init();
  return _dbPromise;
}
