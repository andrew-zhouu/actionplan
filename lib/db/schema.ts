import { int, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const documents = sqliteTable("documents", {
  id:           text("id").primaryKey(),
  userId:       text("user_id"),                                            // nullable — owner; legacy rows are null
  status:       text("status").notNull().default("complete"),               // "processing" | "complete" | "failed"
  createdAt:    int("created_at", { mode: "timestamp" }).notNull(),
  documentType: text("document_type").notNull(),                            // placeholder while processing
  complexity:   text("complexity").notNull(),                               // placeholder while processing
  sourceText:   text("source_text").notNull(),
  result:       text("result").notNull(),                                   // JSON-serialised AnalysisResult; "{}" while processing
});

// ─── early-access ─────────────────────────────────────────────────────────────

export const trialUsers = sqliteTable("trial_users", {
  id:             text("id").primaryKey(),
  email:          text("email").notNull().unique(),
  documentsUsed:  int("documents_used").notNull().default(0),
  documentLimit:  int("document_limit").notNull(),
  accessCodeUsed: text("access_code_used"),                                  // null = default tier
  createdAt:      int("created_at",      { mode: "timestamp" }).notNull(),
  lastActiveAt:   int("last_active_at",  { mode: "timestamp" }).notNull(),
});

export const accessCodes = sqliteTable("access_codes", {
  code:           text("code").primaryKey(),
  description:    text("description").notNull(),
  documentLimit:  int("document_limit").notNull(),
  usesRemaining:  int("uses_remaining"),                                     // null = unlimited
  expiresAt:      int("expires_at", { mode: "timestamp" }),                  // null = no expiry
  createdAt:      int("created_at", { mode: "timestamp" }).notNull(),
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
