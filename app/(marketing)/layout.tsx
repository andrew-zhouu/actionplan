import Link from "next/link";
import { SmoothScrollController } from "@/components/marketing/smooth-scroll-controller";

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
      {/* Scope smooth scroll to marketing routes only. Removes itself on
          unmount when the user navigates into /app/*. */}
      <SmoothScrollController />

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
            {/* Header CTAs share the page CTAs' tactile system — same
                cubic-bezier easing, explicit transition properties, focus
                ring, active scale — scaled down for nav. All four buttons
                across the page read as one coordinated set. */}
            <Link
              href="/demo"
              className="inline-flex items-center rounded-md border border-zinc-200 bg-white/60 px-3 py-1.5 text-[12.5px] font-medium text-zinc-700 shadow-[0_1px_2px_rgba(0,0,0,0.03)] backdrop-blur-sm transition-[transform,box-shadow,border-color,background-color] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-px hover:border-zinc-300 hover:bg-white hover:shadow-[0_2px_6px_-1px_rgba(0,0,0,0.06)] active:translate-y-0 active:scale-[0.99] active:shadow-[0_1px_2px_rgba(0,0,0,0.03)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400/40 focus-visible:ring-offset-2"
            >
              Demo
            </Link>
            <Link
              href="/early-access"
              className="group/btn inline-flex items-center gap-1.5 rounded-md bg-zinc-900 px-3 py-1.5 text-[12.5px] font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_1px_2px_rgba(0,0,0,0.08),0_2px_8px_-2px_rgba(0,0,0,0.12)] transition-[transform,box-shadow,background-color] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-px hover:bg-zinc-800 hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.16),0_2px_4px_rgba(0,0,0,0.10),0_4px_12px_-3px_rgba(0,0,0,0.16)] active:translate-y-0 active:scale-[0.99] active:bg-zinc-900 active:shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_1px_2px_rgba(0,0,0,0.08)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900/40 focus-visible:ring-offset-2"
            >
              Get early access
              <span
                aria-hidden="true"
                className="transition-transform duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover/btn:translate-x-0.5"
              >→</span>
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
