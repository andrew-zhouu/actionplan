"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

type Props = {
  children:   ReactNode;
  /** Per-instance delay in ms for stagger within a group. */
  delay?:     number;
  /** Pass-through class applied to the wrapper (e.g. grid-cell utilities). */
  className?: string;
};

/**
 * Scroll-triggered reveal: opacity 0 → 1 and a soft 16px upward translate
 * when the element enters the viewport. One-shot — the observer disconnects
 * after the first intersection so the animation never re-triggers as the
 * user scrolls back and forth. Honors prefers-reduced-motion by showing
 * the final state immediately with no transition.
 *
 * Behavior:
 *  - Element already in viewport at mount → IntersectionObserver fires
 *    synchronously on `observe()` and the element animates in immediately.
 *    This is what makes features (which peek into the first viewport) and
 *    other above-the-fold elements visible at first load.
 *  - Element below the fold at mount → observer waits until the element
 *    actually scrolls into view, then animates it in. Mission / proof /
 *    document types / final CTA all live below the fold and animate as
 *    the user scrolls down to them.
 *
 * The previous "wait for first scroll" wrapper was holding in-viewport
 * elements at opacity:0 until the user scrolled, which made the page
 * look empty on first load even when the feature row was positioned to
 * peek above the fold. Removed.
 */
export function Reveal({ children, delay = 0, className = "" }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setVisible(true);
      return;
    }

    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      // Trigger slightly before the element is fully in view so the
      // animation is already in progress as it scrolls into the user's
      // reading position — feels intentional, not late.
      { rootMargin: "0px 0px -8% 0px", threshold: 0.12 },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity:         visible ? 1 : 0,
        transform:       visible ? "translate3d(0, 0, 0)" : "translate3d(0, 16px, 0)",
        transition:
          "opacity 600ms cubic-bezier(0.22, 1, 0.36, 1), " +
          "transform 600ms cubic-bezier(0.22, 1, 0.36, 1)",
        transitionDelay: visible ? `${delay}ms` : "0ms",
        willChange:      visible ? "auto" : "opacity, transform",
      }}
    >
      {children}
    </div>
  );
}
