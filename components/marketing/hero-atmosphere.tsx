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

    // Respect reduced motion + skip on coarse pointers (touch)
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (!window.matchMedia("(pointer: fine)").matches) return;

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
      className="pointer-events-none absolute inset-0 -z-10 [perspective:1200px]"
      aria-hidden="true"
    >
      {/* Layer 1 — dot grid (static, no parallax) */}
      <div className="lp-dot-grid absolute inset-0 opacity-70" />

      {/* Layer 2 — soft radial bloom, small parallax */}
      <div ref={bloomRef} className="absolute inset-0 will-change-transform">
        <div
          className="lp-glow absolute inset-0"
          style={{ background: BLOOM_BACKGROUND }}
        />
      </div>

      {/* Layer 3 — glass stage, medium parallax. Outer div centers it;
                    inner div is the parallax target. */}
      <div className="absolute left-1/2 top-1/2 hidden -translate-x-1/2 -translate-y-1/2 sm:block">
        <div
          ref={planeRef}
          className="h-[440px] w-[860px] max-w-[92vw] rounded-[40px] border border-white/50 bg-white/25 shadow-[0_8px_40px_-20px_rgba(80,80,140,0.18),0_24px_80px_-32px_rgba(80,80,140,0.22)] backdrop-blur-md will-change-transform"
        />
      </div>

      {/* Layer 4 — floating cards. Outer div positions, middle div carries
                    cursor parallax, inner div runs the autonomous drift
                    animation. Three layers so the transforms compose
                    instead of overwriting each other. */}
      <div className="absolute left-[8%] top-[18%] hidden sm:block">
        <div ref={cardARef} className="will-change-transform">
          <div className="lp-drift-a h-32 w-44 overflow-hidden rounded-xl border border-zinc-200/60 bg-white/80 opacity-80 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.05),0_20px_40px_-16px_rgba(0,0,0,0.10)] backdrop-blur-sm">
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

      <div className="absolute right-[7%] top-[56%] hidden sm:block">
        <div ref={cardBRef} className="will-change-transform">
          <div className="lp-drift-b h-28 w-40 overflow-hidden rounded-xl border border-zinc-200/60 bg-white/80 opacity-80 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.05),0_20px_40px_-16px_rgba(0,0,0,0.10)] backdrop-blur-sm">
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
