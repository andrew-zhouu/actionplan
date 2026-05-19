"use client";

import { useEffect } from "react";
import Lenis from "lenis";

/**
 * Marketing-only smooth scroll, driven by Lenis.
 *
 * Plain, official-style integration — matches the canonical config in
 * Lenis's own README (duration + expo-out easing + smoothWheel). Lenis
 * takes ownership of the entire scroll surface: it absorbs raw input,
 * ignores the secondary OS inertia, and renders smoothly on a single
 * RAF loop. That's what produces the premium gliding feel on Vercel /
 * Linear / similar marketing pages.
 *
 * Scoped to the marketing layout — when the user navigates into
 * /app/* this component unmounts and `lenis.destroy()` cleanly removes
 * the wheel listener, the RAF loop, and the `lenis` class on <html>,
 * reverting the app to native scroll.
 *
 * Reduced-motion users get native scroll: Lenis is never constructed
 * in that branch, no listeners attach, the rest of the page behaves
 * exactly as it would without this component.
 *
 * `syncTouch: false` leaves iOS / Android touch momentum untouched —
 * native touch is already better than anything Lenis would interpolate
 * on a finger drag.
 */
export function SmoothScrollController() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      // eslint-disable-next-line no-console
      console.log("[SmoothScroll] prefers-reduced-motion — Lenis not initialized");
      return;
    }

    const lenis = new Lenis({
      // `lerp` controls the natural smoothing applied to wheel/trackpad
      // input — it's the option that actually shapes the gliding feel.
      // Default is 0.1; pinning to 0.08 gives a noticeably longer glide
      // tail without crossing into floaty territory.
      lerp: 0.08,
      // `duration` + `easing` apply to programmatic scrolls (.scrollTo).
      // Kept explicit so anchor-link navigation matches the same easing
      // curve as the natural wheel smoothing.
      duration: 1.2,
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      syncTouch: false,
    });

    // Temporary debug instrumentation — verify in browser DevTools:
    //   • Console shows "[SmoothScroll] Lenis mounted" with htmlClasses
    //     and hasLenisClass payload
    //   • `hasLenisClass: true` confirms Lenis successfully attached
    //     its `lenis` / `lenis-smooth` classes to <html>
    //   • `window.__lenis` returns the Lenis instance object
    //   • Navigating to /app/* logs "[SmoothScroll] Lenis destroyed"
    //     and the html classes + window.__lenis go away
    const html = document.documentElement;
    // eslint-disable-next-line no-console
    console.log("[SmoothScroll] Lenis mounted", {
      lenis,
      htmlClasses:   html.className,
      hasLenisClass: html.classList.contains("lenis"),
    });
    (window as Window & { __lenis?: Lenis }).__lenis = lenis;

    let rafId = 0;
    function raf(time: number) {
      lenis.raf(time);
      rafId = requestAnimationFrame(raf);
    }
    rafId = requestAnimationFrame(raf);

    return () => {
      // eslint-disable-next-line no-console
      console.log("[SmoothScroll] Lenis destroyed");
      cancelAnimationFrame(rafId);
      lenis.destroy();
      (window as Window & { __lenis?: Lenis }).__lenis = undefined;
    };
  }, []);

  return null;
}
