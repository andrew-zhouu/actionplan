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
        email             TEXT    UNIQUE,
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
        revoked_at       INTEGER,
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
 * Relax the `trial_users.email` NOT NULL constraint to support code-only
 * org signups. SQLite has no ALTER COLUMN, so the only path is a temp-
 * table rebuild. Idempotent: PRAGMA-checks the current notnull flag and
 * skips the rebuild when email is already nullable. Preserves all rows.
 */
async function ensureTrialUsersEmailNullable(): Promise<"relaxed" | "already-nullable" | "no-table" | "skipped"> {
  try {
    const info = await db.run(sql.raw(`PRAGMA table_info(trial_users)`));
    const rows = (info as unknown as { rows?: Array<Record<string, unknown>> }).rows ?? [];

    if (rows.length === 0) {
      // Table doesn't exist yet — CREATE TABLE IF NOT EXISTS above already
      // used the new nullable DDL, so nothing to do.
      return "no-table";
    }

    const emailRow = rows.find((r) => r.name === "email");
    if (!emailRow) return "no-table";
    // PRAGMA returns notnull as 1 or 0
    if (emailRow.notnull === 0 || emailRow.notnull === false) {
      return "already-nullable";
    }

    // Rebuild — must be atomic to avoid losing rows on failure mid-migration.
    // libSQL/Turso supports multi-statement transactions via individual statements
    // wrapped in BEGIN / COMMIT.
    await db.run(sql.raw(`BEGIN`));
    try {
      await db.run(sql.raw(`
        CREATE TABLE trial_users_new (
          id                TEXT    PRIMARY KEY,
          email             TEXT    UNIQUE,
          documents_used    INTEGER NOT NULL DEFAULT 0,
          document_limit    INTEGER NOT NULL,
          access_code_used  TEXT,
          created_at        INTEGER NOT NULL,
          last_active_at    INTEGER NOT NULL
        )
      `));
      await db.run(sql.raw(`
        INSERT INTO trial_users_new (id, email, documents_used, document_limit, access_code_used, created_at, last_active_at)
        SELECT id, email, documents_used, document_limit, access_code_used, created_at, last_active_at
        FROM trial_users
      `));
      await db.run(sql.raw(`DROP TABLE trial_users`));
      await db.run(sql.raw(`ALTER TABLE trial_users_new RENAME TO trial_users`));
      await db.run(sql.raw(`COMMIT`));
      return "relaxed";
    } catch (innerErr) {
      try { await db.run(sql.raw(`ROLLBACK`)); } catch {}
      throw innerErr;
    }
  } catch (err) {
    console.error("[init-db] ensureTrialUsersEmailNullable failed:", err);
    return "skipped";
  }
}

/**
 * Same idempotent ADD COLUMN pattern for `access_codes.revoked_at` — the
 * revocation timestamp added so the internal manager can disable codes
 * without hard-deleting them. Nullable; existing rows default to NULL
 * (active), no backfill needed.
 */
async function ensureAccessCodesRevokedAtColumn(): Promise<"added" | "already-exists" | "skipped" | "no-table"> {
  try {
    const result = await db.run(sql.raw(`PRAGMA table_info(access_codes)`));
    const rows   = (result as unknown as { rows?: Array<Record<string, unknown>> }).rows ?? [];
    if (rows.length === 0) return "no-table"; // CREATE TABLE handled it with the new column
    const hasRevokedAt = rows.some((r) => r.name === "revoked_at");
    if (hasRevokedAt) return "already-exists";
    await db.run(sql.raw(`ALTER TABLE access_codes ADD COLUMN revoked_at INTEGER`));
    return "added";
  } catch (err) {
    console.error("[init-db] ensureAccessCodesRevokedAtColumn failed:", err);
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

  let trialUsersEmailStatus: string;
  try {
    trialUsersEmailStatus = await ensureTrialUsersEmailNullable();
  } catch (err) {
    trialUsersEmailStatus = "skipped";
    errors.push({
      name: "trial_users.email",
      message: err instanceof Error ? err.message : String(err),
    });
  }

  let accessCodesRevokedAtStatus: string;
  try {
    accessCodesRevokedAtStatus = await ensureAccessCodesRevokedAtColumn();
  } catch (err) {
    accessCodesRevokedAtStatus = "skipped";
    errors.push({
      name: "access_codes.revoked_at",
      message: err instanceof Error ? err.message : String(err),
    });
  }

  if (errors.length > 0) {
    return Response.json(
      {
        status:                   "partial",
        message:                  "Some statements failed. See errors below. Safe to retry.",
        ensured,
        documentsUserIdColumn:    userIdStatus,
        documentsStatusColumn:    statusColumnStatus,
        trialUsersEmail:          trialUsersEmailStatus,
        accessCodesRevokedAt:     accessCodesRevokedAtStatus,
        errors,
      },
      { status: 500 },
    );
  }

  return Response.json({
    status:                   "ok",
    message:                  "All tables and columns ensured. Delete app/api/init-db/route.ts and redeploy.",
    ensured,
    documentsUserIdColumn:    userIdStatus,
    documentsStatusColumn:    statusColumnStatus,
    trialUsersEmail:          trialUsersEmailStatus,
    accessCodesRevokedAt:     accessCodesRevokedAtStatus,
  });
}
