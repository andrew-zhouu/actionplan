import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema";
import path from "path";

const url = `file:${path.join(process.cwd(), "db", "actionplan.db")}`;

const client = createClient({ url });

export const db = drizzle(client, { schema });
