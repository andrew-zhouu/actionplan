/**
 * One-time script to create tables in the remote Turso/libSQL database.
 * Uses CREATE TABLE IF NOT EXISTS — safe to re-run.
 *
 * Run from Windows PowerShell:
 *
 *   $env:DATABASE_TURSO_DATABASE_URL = "libsql://your-db.turso.io"
 *   $env:DATABASE_TURSO_AUTH_TOKEN   = "your-token"
 *   node scripts/migrate-remote.mjs
 *
 * Or with the generic var names if you prefer:
 *
 *   $env:DATABASE_URL       = "libsql://your-db.turso.io"
 *   $env:DATABASE_AUTH_TOKEN = "your-token"
 *   node scripts/migrate-remote.mjs
 */

import { createClient } from "@libsql/client";

// Same resolution order as lib/db/index.ts
const url =
  process.env.DATABASE_URL ??
  process.env.DATABASE_TURSO_DATABASE_URL;

const authToken =
  process.env.DATABASE_AUTH_TOKEN ??
  process.env.DATABASE_TURSO_AUTH_TOKEN;

// Guard: refuse to run against the local file — that's already set up.
if (!url || url.startsWith("file:")) {
  console.error("No remote database URL found.");
  console.error(
    "Set DATABASE_URL or DATABASE_TURSO_DATABASE_URL to a libsql:// URL before running."
  );
  process.exit(1);
}

console.log(`Connecting to ${url} …\n`);

const client = createClient({ url, authToken });

// Table definitions mirror lib/db/schema.ts exactly.
// INTEGER timestamps match Drizzle's { mode: "timestamp" } on sqlite.
const tables = [
  {
    name: "documents",
    sql: `
      CREATE TABLE IF NOT EXISTS documents (
        id            TEXT     PRIMARY KEY NOT NULL,
        created_at    INTEGER  NOT NULL,
        document_type TEXT     NOT NULL,
        complexity    TEXT     NOT NULL,
        source_text   TEXT     NOT NULL,
        result        TEXT     NOT NULL
      )
    `,
  },
  {
    name: "task_completions",
    sql: `
      CREATE TABLE IF NOT EXISTS task_completions (
        id           TEXT     PRIMARY KEY NOT NULL,
        document_id  TEXT     NOT NULL,
        kind         TEXT     NOT NULL,
        task_index   INTEGER  NOT NULL,
        completed_at INTEGER  NOT NULL
      )
    `,
  },
];

for (const { name, sql } of tables) {
  await client.execute(sql);
  console.log(`✓  ${name}`);
}

await client.close();
console.log("\nDone — remote schema is ready.");
