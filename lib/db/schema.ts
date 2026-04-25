import { int, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const documents = sqliteTable("documents", {
  id:           text("id").primaryKey(),
  createdAt:    int("created_at", { mode: "timestamp" }).notNull(),
  documentType: text("document_type").notNull(),
  complexity:   text("complexity").notNull(),
  sourceText:   text("source_text").notNull(),
  result:       text("result").notNull(), // JSON-serialised AnalysisResult
});

export const taskCompletions = sqliteTable("task_completions", {
  id:          text("id").primaryKey(),
  documentId:  text("document_id").notNull(),
  kind:        text("kind").notNull(),    // "action_item" | "deadline"
  taskIndex:   int("task_index").notNull(),
  completedAt: int("completed_at", { mode: "timestamp" }).notNull(),
});
