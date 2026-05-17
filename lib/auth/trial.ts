import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { trialUsers } from "@/lib/db/schema";

export type TrialUser = {
  id:             string;
  // Nullable — code-only org signups have no email; cookie carries identity.
  email:          string | null;
  documentsUsed:  number;
  documentLimit:  number;
  accessCodeUsed: string | null;
};

export type LimitDenied = {
  kind:          "limit_reached";
  documentsUsed: number;
  documentLimit: number;
};

/**
 * Load a trial user by id (the value stored inside the session cookie).
 * Returns null when the row is missing — e.g. cookie still valid but the
 * underlying user was deleted, an orphan-session scenario.
 */
export async function loadTrialUser(userId: string): Promise<TrialUser | null> {
  const rows = await db
    .select()
    .from(trialUsers)
    .where(eq(trialUsers.id, userId))
    .limit(1);

  if (rows.length === 0) return null;
  const r = rows[0];
  return {
    id:             r.id,
    email:          r.email,
    documentsUsed:  r.documentsUsed,
    documentLimit:  r.documentLimit,
    accessCodeUsed: r.accessCodeUsed,
  };
}

/**
 * Returns a denial object when the user has consumed their entire trial,
 * or null when they have room to analyze another document. The denial
 * shape is structured so the route handler can render it directly into
 * a 403 JSON response for the UI to display.
 */
export function enforceLimit(user: TrialUser): LimitDenied | null {
  if (user.documentsUsed >= user.documentLimit) {
    return {
      kind:          "limit_reached",
      documentsUsed: user.documentsUsed,
      documentLimit: user.documentLimit,
    };
  }
  return null;
}

/**
 * Bump `documents_used` after a successful analysis and update activity
 * timestamp. V1 deliberately accepts the small race window between read
 * and write — concurrent analyses by the same user can over-count by 1,
 * which is acceptable at trial-limit scale.
 */
export async function incrementUsage(userId: string): Promise<void> {
  const user = await loadTrialUser(userId);
  if (!user) return;
  await db
    .update(trialUsers)
    .set({
      documentsUsed: user.documentsUsed + 1,
      lastActiveAt:  new Date(),
    })
    .where(eq(trialUsers.id, userId));
}
