/**
 * TEMPORARY one-time route — delete this file after the remote tables are created.
 *
 * Usage: GET https://your-app.vercel.app/api/init-db
 *
 * Uses the app's existing DB connection so it targets whatever database the
 * deployed environment is configured for (Turso in production).
 * CREATE TABLE IF NOT EXISTS makes it safe to call more than once.
 *
 * To remove: git rm app/api/init-db/route.ts && git commit && git push
 */

import { db } from "@/lib/db";
import { sql } from "drizzle-orm";

export async function GET() {
  try {
    // documents — mirrors lib/db/schema.ts exactly
    await db.run(sql`
      CREATE TABLE IF NOT EXISTS documents (
        id            TEXT    PRIMARY KEY NOT NULL,
        created_at    INTEGER NOT NULL,
        document_type TEXT    NOT NULL,
        complexity    TEXT    NOT NULL,
        source_text   TEXT    NOT NULL,
        result        TEXT    NOT NULL
      )
    `);

    // task_completions — mirrors lib/db/schema.ts exactly
    await db.run(sql`
      CREATE TABLE IF NOT EXISTS task_completions (
        id           TEXT    PRIMARY KEY NOT NULL,
        document_id  TEXT    NOT NULL,
        kind         TEXT    NOT NULL,
        task_index   INTEGER NOT NULL,
        completed_at INTEGER NOT NULL
      )
    `);

    return Response.json({
      ok:      true,
      tables:  ["documents", "task_completions"],
      message: "Tables created. Delete app/api/init-db/route.ts and redeploy.",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[/api/init-db]", message);
    return Response.json({ ok: false, error: message }, { status: 500 });
  }
}
