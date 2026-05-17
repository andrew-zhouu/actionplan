import { sql } from "drizzle-orm";
import { db } from "@/lib/db";

/**
 * ⚠️ TEMPORARY ONE-TIME INIT ROUTE — DELETE AFTER USE ⚠️
 *
 * Creates any missing tables and columns on the remote database. Drizzle
 * migrations aren't wired into the deploy pipeline yet, so this is the
 * manual bridge for Turso when a schema change ships. Idempotent — every
 * statement is `CREATE TABLE IF NOT EXISTS`, and the `documents.user_id`
 * column add is gated by a `PRAGMA table_info` check.
 *
 * USAGE:
 *   1. Deploy.
 *   2. Visit `/api/init-db` once (browser or curl).
 *   3. Verify the JSON response shows `status: "ok"`.
 *   4. Delete this file and redeploy.
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
        user_id       TEXT,
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
  {
    name: "trial_users",
    ddl: `
      CREATE TABLE IF NOT EXISTS trial_users (
        id                TEXT    PRIMARY KEY,
        email             TEXT    NOT NULL UNIQUE,
        documents_used    INTEGER NOT NULL DEFAULT 0,
        document_limit    INTEGER NOT NULL,
        access_code_used  TEXT,
        created_at        INTEGER NOT NULL,
        last_active_at    INTEGER NOT NULL
      )
    `,
  },
  {
    name: "access_codes",
    ddl: `
      CREATE TABLE IF NOT EXISTS access_codes (
        code             TEXT    PRIMARY KEY,
        description      TEXT    NOT NULL,
        document_limit   INTEGER NOT NULL,
        uses_remaining   INTEGER,
        expires_at       INTEGER,
        created_at       INTEGER NOT NULL
      )
    `,
  },
];

/**
 * SQLite doesn't support `ALTER TABLE … ADD COLUMN IF NOT EXISTS`, so we
 * check column existence via `PRAGMA table_info(documents)` before issuing
 * the alter. This keeps the route idempotent for repeat runs.
 */
async function ensureDocumentsUserIdColumn(): Promise<"added" | "already-exists" | "skipped"> {
  try {
    const result = await db.run(sql.raw(`PRAGMA table_info(documents)`));
    const rows = (result as unknown as { rows?: Array<Record<string, unknown>> }).rows ?? [];
    const hasUserId = rows.some((r) => r.name === "user_id");
    if (hasUserId) return "already-exists";
    await db.run(sql.raw(`ALTER TABLE documents ADD COLUMN user_id TEXT`));
    return "added";
  } catch (err) {
    console.error("[init-db] ensureDocumentsUserIdColumn failed:", err);
    return "skipped";
  }
}

/**
 * Same idempotent ADD COLUMN pattern for the persistent-processing `status`
 * column. Default 'complete' so existing rows are valid without backfill.
 */
async function ensureDocumentsStatusColumn(): Promise<"added" | "already-exists" | "skipped"> {
  try {
    const result = await db.run(sql.raw(`PRAGMA table_info(documents)`));
    const rows = (result as unknown as { rows?: Array<Record<string, unknown>> }).rows ?? [];
    const hasStatus = rows.some((r) => r.name === "status");
    if (hasStatus) return "already-exists";
    await db.run(sql.raw(`ALTER TABLE documents ADD COLUMN status TEXT NOT NULL DEFAULT 'complete'`));
    return "added";
  } catch (err) {
    console.error("[init-db] ensureDocumentsStatusColumn failed:", err);
    return "skipped";
  }
}

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

  // Run the column-ensures after CREATE TABLE pass so the documents table exists
  let userIdStatus: string;
  try {
    userIdStatus = await ensureDocumentsUserIdColumn();
  } catch (err) {
    userIdStatus = "skipped";
    errors.push({
      name: "documents.user_id",
      message: err instanceof Error ? err.message : String(err),
    });
  }

  let statusColumnStatus: string;
  try {
    statusColumnStatus = await ensureDocumentsStatusColumn();
  } catch (err) {
    statusColumnStatus = "skipped";
    errors.push({
      name: "documents.status",
      message: err instanceof Error ? err.message : String(err),
    });
  }

  if (errors.length > 0) {
    return Response.json(
      {
        status:                "partial",
        message:               "Some statements failed. See errors below. Safe to retry.",
        ensured,
        documentsUserIdColumn: userIdStatus,
        documentsStatusColumn: statusColumnStatus,
        errors,
      },
      { status: 500 },
    );
  }

  return Response.json({
    status:                "ok",
    message:               "All tables and columns ensured. Delete app/api/init-db/route.ts and redeploy.",
    ensured,
    documentsUserIdColumn: userIdStatus,
    documentsStatusColumn: statusColumnStatus,
  });
}
