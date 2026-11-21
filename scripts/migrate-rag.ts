import { createClient } from "@libsql/client";
import { mkdirSync } from "node:fs";
import { RAG_SCHEMA } from "../lib/rag/schema";

const url = process.env.DATABASE_URL || process.env.DATABASE_TURSO_DATABASE_URL || "file:db/actionplan.db";
if (url === "file:db/actionplan.db") mkdirSync("db", { recursive: true });
const client = createClient({ url, authToken: process.env.DATABASE_AUTH_TOKEN || process.env.DATABASE_TURSO_AUTH_TOKEN });
async function main() {
  try {
    // Refuse to create a misleading empty database if the base app isn't configured.
    await client.execute("SELECT id, user_id, status FROM documents LIMIT 0");
    await client.batch(RAG_SCHEMA, "write");
    console.log("Document question tables are ready.");
  } finally { client.close(); }
}

main().catch(error => {
  console.error("RAG migration failed:", error instanceof Error ? error.message : "Unknown error");
  process.exitCode = 1;
});
