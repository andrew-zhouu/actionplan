"use client";

import { useRef, type ReactNode } from "react";

type Props = {
  icon:  ReactNode;
  label: string;
};

/**
 * Document-type tile with a cursor-tracked spotlight on hover.
 *
 * On mousemove over the tile, CSS variables `--mx` / `--my` are set to
 * the cursor's position relative to the tile. A `before:` pseudo draws a
 * soft 180px radial gradient at those coordinates — invisible at rest,
 * fading in only on hover. The result is a small, premium tactile
 * surface: each tile responds to *where* the cursor is, not just
 * whether it's hovering.
 *
 * The handler runs only while the cursor is over the tile (mousemove
 * naturally bounds to the element), so CPU cost is negligible. No
 * client state, no useEffect — just CSS variables on the DOM node.
 */
export function DocType({ icon, label }: Props) {
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
      className="group relative flex h-full items-center gap-3 overflow-hidden rounded-lg border border-zinc-200/70 bg-white/70 p-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.7),0_1px_2px_rgba(0,0,0,0.02),0_2px_8px_-4px_rgba(0,0,0,0.04)] backdrop-blur-sm transition-[transform,box-shadow,border-color,background-color] duration-300 ease-out before:pointer-events-none before:absolute before:inset-0 before:rounded-lg before:bg-[radial-gradient(180px_circle_at_var(--mx,50%)_var(--my,50%),rgba(0,0,0,0.05),transparent_60%)] before:opacity-0 before:transition-opacity before:duration-300 hover:-translate-y-1 hover:border-zinc-300 hover:bg-white hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_3px_10px_-2px_rgba(0,0,0,0.06),0_16px_32px_-12px_rgba(0,0,0,0.10)] hover:before:opacity-100"
    >
      <div className="relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-zinc-100 text-zinc-500 transition-all duration-300 ease-out group-hover:scale-105 group-hover:bg-zinc-900 group-hover:text-white">
        {icon}
      </div>
      <span className="relative z-10 text-[13px] font-medium leading-snug text-zinc-800 transition-colors duration-300 group-hover:text-zinc-900">
        {label}
      </span>
    </div>
  );
}
