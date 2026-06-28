import { pgTable, text, jsonb, serial, timestamp } from "drizzle-orm/pg-core";

// Every datapoint the site renders lives in `dataset`: one row per top-level
// key of the Moonfare dataset (portfolio, pm, mix, dims, cashflows, heldFunds…).
export const dataset = pgTable("dataset", {
  key: text("key").primaryKey(),
  data: jsonb("data").notNull(),
});

// Saved investor profiles (the onboarding submission).
export const profileSaves = pgTable("profile_saves", {
  id: serial("id").primaryKey(),
  ts: timestamp("ts", { withTimezone: true }).defaultNow(),
  data: jsonb("data").notNull(),
});

// Saved target simulations.
export const simulations = pgTable("simulations", {
  id: serial("id").primaryKey(),
  ts: timestamp("ts", { withTimezone: true }).defaultNow(),
  data: jsonb("data").notNull(),
});
