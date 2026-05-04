import type { Config } from "drizzle-kit";

// Same fallback order as lib/db/index.ts so `db:push` resolves identically.
const url =
  process.env.DATABASE_URL ??
  process.env.DATABASE_TURSO_DATABASE_URL ??
  "./db/actionplan.db";

const authToken =
  process.env.DATABASE_AUTH_TOKEN ??
  process.env.DATABASE_TURSO_AUTH_TOKEN;

// `as Config` rather than `satisfies Config`: this version of drizzle-kit's
// SQLite type definition does not include `authToken` in dbCredentials, but
// the underlying @libsql/client accepts it at runtime for Turso connections.
export default {
  schema:  "./lib/db/schema.ts",
  out:     "./drizzle",
  dialect: "sqlite",
  dbCredentials: { url, authToken },
} as Config;
