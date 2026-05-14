import { sql } from "drizzle-orm";
import { db } from "@/lib/db";

/**
 * ⚠️ TEMPORARY ONE-TIME INIT ROUTE — DELETE AFTER USE ⚠️
 *
 * Creates any missing tables on the remote database. Drizzle migrations are
 * not wired into the deploy pipeline yet, so this is the manual bridge for
 * Turso when a schema change ships. Idempotent (every statement uses
 * CREATE TABLE IF NOT EXISTS), so re-hitting the route on an up-to-date
 * database is a no-op.
 *
 * USAGE:
 *   1. Deploy.
 *   2. Visit `/api/init-db` once (browser or curl).
 *   3. Verify the JSON response shows `status: "ok"` and all tables listed.
 *   4. Delete this file: `app/api/init-db/route.ts`.
 *   5. Redeploy.
 *
 * Column definitions mirror `lib/db/schema.ts`. Keep them in sync if the
 * schema changes before this route is removed.
 */

const STATEMENTS: { name: string; ddl: string }[] = [
  {
    name: "documents",
    ddl: `
      CREATE TABLE IF NOT EXISTS documents (
        id            TEXT    PRIMARY KEY,
        created_at    INTEGER NOT NULL,
        document_type TEXT    NOT NULL,
        complexity    TEXT    NOT NULL,
        source_text   TEXT    NOT NULL,
        result        TEXT    NOT NULL
      )
    `,
  },
  {
    name: "task_completions",
    ddl: `
      CREATE TABLE IF NOT EXISTS task_completions (
        id           TEXT    PRIMARY KEY,
        document_id  TEXT    NOT NULL,
        kind         TEXT    NOT NULL,
        task_index   INTEGER NOT NULL,
        completed_at INTEGER NOT NULL
      )
    `,
  },
  {
    name: "task_plans",
    ddl: `
      CREATE TABLE IF NOT EXISTS task_plans (
        id          TEXT    PRIMARY KEY,
        document_id TEXT    NOT NULL,
        kind        TEXT    NOT NULL,
        task_index  INTEGER NOT NULL,
        steps       TEXT    NOT NULL,
        created_at  INTEGER NOT NULL
      )
    `,
  },
  {
    name: "task_drafts",
    ddl: `
      CREATE TABLE IF NOT EXISTS task_drafts (
        id          TEXT    PRIMARY KEY,
        document_id TEXT    NOT NULL,
        kind        TEXT    NOT NULL,
        task_index  INTEGER NOT NULL,
        draft_type  TEXT    NOT NULL,
        subject     TEXT,
        body        TEXT    NOT NULL,
        approved    INTEGER NOT NULL DEFAULT 0,
        created_at  INTEGER NOT NULL,
        approved_at INTEGER
      )
    `,
  },
];

export async function GET() {
  const ensured: string[]                            = [];
  const errors:  { name: string; message: string }[] = [];

  for (const { name, ddl } of STATEMENTS) {
    try {
      await db.run(sql.raw(ddl));
      ensured.push(name);
    } catch (err) {
      errors.push({
        name,
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }

  if (errors.length > 0) {
    return Response.json(
      {
        status:  "partial",
        message: "Some statements failed. See errors below. Safe to retry.",
        ensured,
        errors,
      },
      { status: 500 },
    );
  }

  return Response.json({
    status:  "ok",
    message: "All tables ensured. Delete app/api/init-db/route.ts and redeploy.",
    ensured,
  });
}
