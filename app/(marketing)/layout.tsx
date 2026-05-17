import Link from "next/link";

/**
 * Marketing shell — used for the public landing, demo, and any future
 * pre-product pages. Deliberately spare: a slim header with the brand and
 * primary CTA, then the page content. No sidebar, no app chrome.
 *
 * Nested inside app/layout.tsx (root), which provides html/body/fonts.
 */
export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-1 flex-col bg-white">
      {/* Header */}
      <header className="border-b border-zinc-100">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <span
              className="h-6 w-6 rounded-[6px]"
              style={{ background: "var(--accent)" }}
            />
            <span className="text-sm font-semibold tracking-tight text-zinc-900">
              ActionPlan
            </span>
          </Link>
          <nav className="flex items-center gap-1.5">
            <Link
              href="/demo"
              className="rounded-md px-3 py-1.5 text-[12.5px] font-medium text-zinc-600 transition-colors hover:bg-zinc-50 hover:text-zinc-900"
            >
              Demo
            </Link>
            <Link
              href="/app"
              className="rounded-md bg-zinc-900 px-3 py-1.5 text-[12.5px] font-semibold text-white transition-colors hover:bg-zinc-700"
            >
              Open app →
            </Link>
          </nav>
        </div>
      </header>

      {/* Page content */}
      <main className="flex flex-1 flex-col">{children}</main>

      {/* Footer */}
      <footer className="border-t border-zinc-100">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5 text-[11.5px] text-zinc-400">
          <span>© {new Date().getFullYear()} ActionPlan</span>
          <span className="font-mono uppercase tracking-[0.1em]">Early access</span>
        </div>
      </footer>
    </div>
  );
}
