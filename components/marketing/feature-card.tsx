"use client";

import { useRef } from "react";

type Props = {
  eyebrow: string;
  title:   string;
  body:    string;
};

/**
 * Feature card with cursor-tracked spotlight.
 *
 * Same pattern as the document-type tiles: mousemove sets `--mx` and
 * `--my` CSS variables (relative to the card), and a `before:` pseudo
 * renders a soft radial gradient at those coordinates. Invisible at
 * rest, fades in only on hover.
 *
 * Lifted out of the page so the three feature cards share the same
 * "alive" treatment as the doctype tiles below — when the user moves
 * the cursor across the upper card row, each card responds to *where*
 * the cursor is, not just whether it's hovering. Negligible CPU cost;
 * no state; the handler is naturally bounded to the element.
 */
export function FeatureCard({ eyebrow, title, body }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  function handleMove(e: React.MouseEvent<HTMLDivElement>) {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    el.style.setProperty("--mx", `${e.clientX - rect.left}px`);
    el.style.setProperty("--my", `${e.clientY - rect.top}px`);
  }

  return (
    <div
      ref={ref}
      onMouseMove={handleMove}
      className="group relative h-full overflow-hidden rounded-xl border border-zinc-200/70 bg-white/70 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_1px_3px_rgba(0,0,0,0.03),0_4px_12px_-4px_rgba(0,0,0,0.06)] backdrop-blur-sm transition-[transform,box-shadow,border-color,background-color] duration-300 ease-out before:pointer-events-none before:absolute before:inset-0 before:rounded-xl before:bg-[radial-gradient(260px_circle_at_var(--mx,50%)_var(--my,50%),rgba(0,0,0,0.045),transparent_65%)] before:opacity-0 before:transition-opacity before:duration-300 hover:-translate-y-1.5 hover:border-zinc-300/90 hover:bg-white hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_4px_12px_-2px_rgba(0,0,0,0.06),0_24px_48px_-12px_rgba(0,0,0,0.12)] hover:before:opacity-100 sm:p-6"
    >
      <div className="relative z-10 flex items-center gap-2.5">
        <p className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-zinc-400">
          {eyebrow}
        </p>
        <span className="h-px flex-1 bg-zinc-200/80 transition-colors duration-300 group-hover:bg-zinc-300" />
      </div>
      <h3 className="relative z-10 mt-3 font-display text-[18px] font-normal tracking-tight text-zinc-900">
        {title}
      </h3>
      <p className="relative z-10 mt-2 text-[13.5px] leading-relaxed text-zinc-600">
        {body}
      </p>
    </div>
  );
}
