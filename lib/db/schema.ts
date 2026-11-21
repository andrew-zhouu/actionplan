import { customType, index, int, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

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
  // Nullable: code-only signups don't supply an email. UNIQUE is preserved
  // and applies only to non-null values (SQLite treats NULLs as distinct).
  email:          text("email").unique(),
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
  revokedAt:      int("revoked_at", { mode: "timestamp" }),                  // null = active; non-null = disabled at that time
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

// Mirrored by the additive migration in lib/rag/schema.ts.
const embedding = customType<{ data: Buffer }>({ dataType: () => "F32_BLOB(768)" });

export const documentIndexes = sqliteTable("document_indexes", {
  documentId: text("document_id").primaryKey().references(() => documents.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull(),
  sourceHash: text("source_hash").notNull(),
  model: text("model").notNull(),
  chunkCount: int("chunk_count").notNull(),
});

export const documentChunks = sqliteTable("document_chunks", {
  id: text("id").primaryKey(),
  documentId: text("document_id").notNull().references(() => documents.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull(),
  ordinal: int("ordinal").notNull(),
  content: text("content").notNull(),
  startOffset: int("start_offset").notNull(),
  endOffset: int("end_offset").notNull(),
  embedding: embedding("embedding").notNull(),
}, table => [
  index("document_chunks_owner").on(table.userId, table.documentId),
  uniqueIndex("document_chunks_ordinal").on(table.documentId, table.ordinal),
]);

export const ragRequestLimits = sqliteTable("rag_request_limits", {
  userId: text("user_id").primaryKey(),
  leaseId: text("lease_id").notNull(),
  busyUntil: int("busy_until").notNull(),
  nextAllowedAt: int("next_allowed_at").notNull(),
  windowStart: int("window_start").notNull(),
  requestCount: int("request_count").notNull(),
});
