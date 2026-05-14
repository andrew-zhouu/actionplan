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

export const taskPlans = sqliteTable("task_plans", {
  id:         text("id").primaryKey(),
  documentId: text("document_id").notNull(),
  kind:       text("kind").notNull(),      // "action_item" | "deadline"
  taskIndex:  int("task_index").notNull(),
  steps:      text("steps").notNull(),     // JSON-serialized string[]
  createdAt:  int("created_at", { mode: "timestamp" }).notNull(),
});

export const taskDrafts = sqliteTable("task_drafts", {
  id:         text("id").primaryKey(),
  documentId: text("document_id").notNull(),
  kind:       text("kind").notNull(),                                   // "action_item" | "deadline"
  taskIndex:  int("task_index").notNull(),
  draftType:  text("draft_type").notNull(),                             // "email" | "letter" | "note"
  subject:    text("subject"),                                          // populated only for emails
  body:       text("body").notNull(),
  approved:   int("approved", { mode: "boolean" }).notNull().default(false),
  createdAt:  int("created_at", { mode: "timestamp" }).notNull(),
  approvedAt: int("approved_at", { mode: "timestamp" }),                // null until approved
});
