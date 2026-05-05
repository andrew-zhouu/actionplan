import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema";
import path from "path";

// URL resolution order:
//   1. DATABASE_URL              (manually set, or future standard)
//   2. DATABASE_TURSO_DATABASE_URL  (Vercel Turso integration)
//   3. local SQLite file fallback   (development)
const url =
  process.env.DATABASE_URL ||
  process.env.DATABASE_TURSO_DATABASE_URL ||
  `file:${path.join(process.cwd(), "db", "actionplan.db")}`;

// Auth token resolution order:
//   1. DATABASE_AUTH_TOKEN       (manually set, or future standard)
//   2. DATABASE_TURSO_AUTH_TOKEN    (Vercel Turso integration)
//   undefined in local dev — fine for file:// connections
const authToken =
  process.env.DATABASE_AUTH_TOKEN ||
  process.env.DATABASE_TURSO_AUTH_TOKEN;

const client = createClient({ url, authToken });
export const db = drizzle(client, { schema });
