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
 * Use this for below-the-fold sections so the motion resolves *as the
 * user scrolls to it*, instead of all firing on initial mount (where
 * nobody sees it). Hero elements continue to use the mount-time
 * `lp-fade-in-up` cascade because they're already on screen at load.
 */
export function Reveal({ children, delay = 0, className = "" }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Reduced-motion users see the final state immediately.
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
