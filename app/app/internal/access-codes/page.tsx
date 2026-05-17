export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { accessCodes } from "@/lib/db/schema";
import { Topbar } from "@/components/shell/topbar";
import { AccessCodeForm } from "@/components/internal/access-code-form";
import { AdminSecretChallenge } from "@/components/internal/admin-secret-challenge";
import {
  AccessCodeList,
  type AccessCodeRow,
} from "@/components/internal/access-code-list";
import { getAdminSession } from "@/lib/auth/admin";

/**
 * Internal-only access code creation + management tool.
 *
 * Three layers of protection, applied here at the page level:
 *
 *   1. Env-gated: when ADMIN_ACCESS_SECRET is unset, this page returns
 *      404 — the URL doesn't exist on this deploy at all.
 *   2. Middleware-gated: under /app/*, so an unauthenticated stranger
 *      bounces to /early-access before ever reaching this code path.
 *   3. Admin-cookie-gated: even a signed-in trial user only sees the
 *      AdminSecretChallenge until they enter the correct admin secret.
 *      Only then do the create form and the existing-codes list render.
 *
 * The matching API endpoints independently re-check all three gates —
 * the page's branch is a UX layer, not the security boundary.
 */
export default async function AccessCodesPage() {
  // Gate 1
  if (!process.env.ADMIN_ACCESS_SECRET) {
    notFound();
  }

  // Gate 3 — admin cookie
  const adminSession = await getAdminSession();

  // Fetch existing codes only when admin is authorized. This both saves
  // a query when unauthorized and avoids any chance of the row data
  // sneaking into the SSR payload before the challenge clears.
  let codes: AccessCodeRow[] = [];
  if (adminSession) {
    try {
      const rows = await db
        .select()
        .from(accessCodes)
        .orderBy(desc(accessCodes.createdAt));

      codes = rows.map((r) => ({
        code:          r.code,
        description:   r.description,
        documentLimit: r.documentLimit,
        usesRemaining: r.usesRemaining,
        expiresAt:     r.expiresAt  ? r.expiresAt.toISOString()  : null,
        revokedAt:     r.revokedAt  ? r.revokedAt.toISOString()  : null,
        createdAt:     r.createdAt.toISOString(),
      }));
    } catch (err) {
      console.error("[/app/internal/access-codes] Failed to load codes:", err);
    }
  }

  return (
    <>
      <Topbar
        crumbs={[
          { label: "Inbox", href: "/app" },
          "Internal",
          "Access codes",
        ]}
      />
      <div className="flex-1 overflow-y-auto bg-zinc-50">
        <main className="mx-auto max-w-xl px-6 py-12">

          <header className="mb-8">
            <p className="mb-4 font-mono text-[10.5px] uppercase tracking-[0.12em] text-zinc-400">
              Internal · Access codes
            </p>
            <h1 className="font-display text-[32px] font-normal leading-tight tracking-[-0.01em] text-zinc-900">
              {adminSession ? "Access codes" : "Admin access required"}
            </h1>
            <p className="mt-3 text-[14px] leading-relaxed text-zinc-600">
              {adminSession
                ? "Create new organization or pilot access codes, and revoke any that should no longer redeem. Revoked codes stay in the table for audit."
                : "This is an internal tool. Enter the admin secret to continue."}
            </p>
          </header>

          {adminSession ? (
            <div className="space-y-10">
              <section>
                <h2 className="mb-4 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
                  Create
                </h2>
                <AccessCodeForm />
              </section>

              <section>
                <h2 className="mb-4 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
                  Existing
                </h2>
                <AccessCodeList codes={codes} />
              </section>
            </div>
          ) : (
            <AdminSecretChallenge />
          )}
        </main>
      </div>
    </>
  );
}
