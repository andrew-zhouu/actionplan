"use client";

import { useEffect, useRef } from "react";

/**
 * Decorative hero atmosphere layer with cursor-driven parallax.
 *
 * Composition (back → front):
 *   1. Dot grid texture (static)
 *   2. Soft radial bloom (small parallax)
 *   3. Frosted glass plane (medium parallax)
 *   4. Two drifting document-fragment cards (strongest parallax,
 *      plus their existing autonomous CSS drift)
 *
 * The cursor multipliers are tiered so closer layers move further per
 * pixel of cursor motion — classic depth-cue parallax. Cursor tracking
 * is throttled through RAF and smoothed with linear interpolation so the
 * motion follows the cursor with a gentle ease rather than snapping.
 *
 * No-ops on coarse-pointer (touch) devices and on prefers-reduced-motion.
 * The CSS-driven drift continues to work on its own in either case
 * because it's on a separate inner element.
 */

const BLOOM_BACKGROUND =
  "radial-gradient(ellipse 65% 55% at 50% 42%, " +
  "rgba(168, 175, 240, 0.22) 0%, " +
  "rgba(196, 200, 235, 0.14) 28%, " +
  "rgba(220, 220, 240, 0.07) 52%, " +
  "transparent 78%)";

// Parallax multipliers — distant layers smaller, closer layers larger.
// Values are pixels per unit of normalized cursor offset (-0.6 … 0.6).
const PARALLAX = {
  bloom: 8,
  plane: 14,
  card:  28,
};

const LERP = 0.08; // 8% per frame ≈ ~220ms to settle at 60fps

export function HeroAtmosphere() {
  const containerRef = useRef<HTMLDivElement>(null);
  const bloomRef     = useRef<HTMLDivElement>(null);
  const planeRef     = useRef<HTMLDivElement>(null);
  const cardARef     = useRef<HTMLDivElement>(null);
  const cardBRef     = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Respect reduced motion. For cursor parallax we check
    // `(any-pointer: fine)` rather than `(pointer: fine)` so that
    // hybrid touch laptops with a trackpad/mouse attached still get
    // the parallax — they would otherwise read as "static cards on a
    // desktop" because the OS reports their primary pointer as
    // coarse. Pure-touch devices (no fine pointer at all) still skip.
    //
    // Important: this gate only affects the JS cursor parallax. It
    // does NOT affect card visibility or the CSS drift animation —
    // those are independent systems handled by class + globals.css.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (!window.matchMedia("(any-pointer: fine)").matches) return;

    const container = containerRef.current;
    if (!container) return;

    let mounted = true;
    let rafId: number;
    const target  = { x: 0, y: 0 };
    const current = { x: 0, y: 0 };

    const onMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      // Normalize cursor offset from center to roughly -0.5 … 0.5,
      // clamped slightly wider so motion settles smoothly when the
      // cursor moves outside the hero.
      const x = (e.clientX - rect.left - rect.width  / 2) / rect.width;
      const y = (e.clientY - rect.top  - rect.height / 2) / rect.height;
      target.x = Math.max(-0.6, Math.min(0.6, x));
      target.y = Math.max(-0.6, Math.min(0.6, y));

      // Cursor position in plane-LOCAL pixels for the spotlight that
      // now lives INSIDE the glass plane (clipped by the plane's
      // rounded-rectangle via overflow-hidden). When the cursor is
      // over the plane these are positive in-bounds values; when it's
      // outside they go negative / past the plane's width-height, and
      // the gradient draws off-plane (and gets clipped to nothing).
      const plane = planeRef.current;
      if (plane) {
        const planeRect = plane.getBoundingClientRect();
        const html = document.documentElement;
        html.style.setProperty("--plane-mx", `${e.clientX - planeRect.left}px`);
        html.style.setProperty("--plane-my", `${e.clientY - planeRect.top}px`);
      }
    };

    const tick = () => {
      if (!mounted) return;
      // Lerp current toward target — soft trailing motion
      current.x += (target.x - current.x) * LERP;
      current.y += (target.y - current.y) * LERP;
      const { x, y } = current;

      if (bloomRef.current) {
        bloomRef.current.style.transform =
          `translate3d(${x * PARALLAX.bloom}px, ${y * PARALLAX.bloom}px, 0)`;
      }
      if (planeRef.current) {
        planeRef.current.style.transform =
          `translate3d(${x * PARALLAX.plane}px, ${y * PARALLAX.plane}px, 0)`;
      }
      if (cardARef.current) {
        cardARef.current.style.transform =
          `translate3d(${x * PARALLAX.card}px, ${y * PARALLAX.card}px, 0)`;
      }
      if (cardBRef.current) {
        cardBRef.current.style.transform =
          `translate3d(${x * PARALLAX.card}px, ${y * PARALLAX.card}px, 0)`;
      }

      rafId = requestAnimationFrame(tick);
    };

    window.addEventListener("mousemove", onMove, { passive: true });
    rafId = requestAnimationFrame(tick);

    return () => {
      mounted = false;
      window.removeEventListener("mousemove", onMove);
      cancelAnimationFrame(rafId);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="pointer-events-none absolute inset-0 -z-10"
      aria-hidden="true"
    >
      {/* Layer 1 — dot grid (static, no parallax) */}
      <div className="lp-dot-grid absolute inset-0 opacity-70" />

      {/* (Cursor spotlight has been moved OUT of this component — it
            now lives as a sibling of <HeroAtmosphere /> directly under
            the hero section in page.tsx, so it doesn't sit under this
            component's `perspective:1200px` rendering context that
            was causing the visible side-clipping.) */}

      {/* Layer 2 — soft radial bloom, small parallax */}
      <div ref={bloomRef} className="absolute inset-0 will-change-transform">
        <div
          className="lp-glow absolute inset-0"
          style={{ background: BLOOM_BACKGROUND }}
        />
      </div>

      {/* Layer 3 — glass stage, medium parallax. Outer div centers it;
                    inner div is the parallax target.
                    Now also OWNS the cursor-reactive light: the inner
                    spotlight `<div>` lives as a child of the plane and
                    the plane is `relative overflow-hidden` + rounded,
                    so the spotlight gradient is geometrically clipped
                    to the plane's exact rounded-rectangle bounds. The
                    effect reads as belonging to the card surface
                    itself — no spill outside the card. */}
      <div className="absolute left-1/2 top-1/2 hidden -translate-x-1/2 -translate-y-1/2 sm:block">
        <div
          ref={planeRef}
          className="relative h-[440px] w-[860px] max-w-[92vw] overflow-hidden rounded-[40px] bg-white/20 shadow-[0_8px_40px_-20px_rgba(80,80,140,0.14),0_24px_80px_-32px_rgba(80,80,140,0.16)] backdrop-blur-md will-change-transform"
        >
          <div
            aria-hidden="true"
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(360px circle at var(--plane-mx, 50%) var(--plane-my, 50%), rgba(125, 100, 200, 0.07), transparent 55%)",
            }}
          />
        </div>
      </div>

      {/* Layer 4 — floating cards. Outer div positions, middle div carries
                    cursor parallax, inner div runs the autonomous drift
                    animation. Three layers so the transforms compose
                    instead of overwriting each other.
                    Visibility is intentionally NOT gated by viewport or
                    pointer type. Cards render on every device. Mobile
                    uses a smaller card size and a more subtle opacity so
                    the cards read as ambient decoration without crowding
                    the centered hero text; the larger desktop form kicks
                    in at the `sm:` breakpoint. */}
      <div className="absolute left-[4%] top-[6%] sm:left-[8%] sm:top-[18%]">
        <div ref={cardARef} className="will-change-transform">
          <div className="lp-drift-a h-24 w-32 overflow-hidden rounded-xl border border-zinc-200/60 bg-white/80 opacity-60 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.05),0_20px_40px_-16px_rgba(0,0,0,0.10)] backdrop-blur-sm sm:h-32 sm:w-44 sm:opacity-80">
            <div className="flex h-full flex-col gap-1.5 p-3.5">
              <div className="h-1 w-3/5 rounded-full bg-zinc-300/70" />
              <div className="mt-1 h-0.5 w-full rounded-full bg-zinc-200/70" />
              <div className="h-0.5 w-11/12 rounded-full bg-zinc-200/70" />
              <div className="h-0.5 w-4/5 rounded-full bg-zinc-200/70" />
              <div className="h-0.5 w-3/4 rounded-full bg-zinc-200/70" />
              <div className="mt-auto h-0.5 w-1/2 rounded-full bg-zinc-200/60" />
            </div>
          </div>
        </div>
      </div>

      <div className="absolute right-[4%] top-[60%] sm:right-[7%] sm:top-[56%]">
        <div ref={cardBRef} className="will-change-transform">
          <div className="lp-drift-b h-20 w-28 overflow-hidden rounded-xl border border-zinc-200/60 bg-white/80 opacity-60 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.05),0_20px_40px_-16px_rgba(0,0,0,0.10)] backdrop-blur-sm sm:h-28 sm:w-40 sm:opacity-80">
            <div className="flex h-full flex-col gap-2 p-3">
              <div className="flex items-center gap-1.5">
                <div className="h-2 w-2 shrink-0 rounded-sm border border-zinc-300/80 bg-white/80" />
                <div className="h-0.5 flex-1 rounded-full bg-zinc-200/70" />
              </div>
              <div className="flex items-center gap-1.5">
                <div className="h-2 w-2 shrink-0 rounded-sm border border-zinc-400/80 bg-zinc-400/50" />
                <div className="h-0.5 flex-1 rounded-full bg-zinc-200/60" />
              </div>
              <div className="flex items-center gap-1.5">
                <div className="h-2 w-2 shrink-0 rounded-sm border border-zinc-300/80 bg-white/80" />
                <div className="h-0.5 flex-1 rounded-full bg-zinc-200/70" />
              </div>
              <div className="mt-auto flex justify-end">
                <div className="h-1.5 w-7 rounded-full bg-zinc-300/60" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
