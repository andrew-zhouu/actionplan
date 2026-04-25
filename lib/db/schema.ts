import { int, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const documents = sqliteTable("documents", {
  id:           text("id").primaryKey(),
  createdAt:    int("created_at", { mode: "timestamp" }).notNull(),
  documentType: text("document_type").notNull(),
  complexity:   text("complexity").notNull(),
  sourceText:   text("source_text").notNull(),
  result:       text("result").notNull(), // JSON-serialised AnalysisResult
});
