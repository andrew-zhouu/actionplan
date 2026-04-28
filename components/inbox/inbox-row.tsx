"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { deleteDocument } from "@/app/actions/docs";
import { COMPLEXITY_COLORS } from "@/lib/constants";

type Props = {
  id:            string;
  href:          string;
  documentType:  string;
  complexity:    string;
  formattedDate: string;
  summary:       string;
};

export function InboxRow({
  id,
  href,
  documentType,
  complexity,
  formattedDate,
  summary,
}: Props) {
  const [isPending, startTransition] = useTransition();
  const [deleteFailed, setDeleteFailed] = useState(false);

  function handleDelete(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setDeleteFailed(false);
    startTransition(async () => {
      try {
        await deleteDocument(id);
        // revalidatePath in the server action removes this row on re-render
      } catch {
        setDeleteFailed(true);
      }
    });
  }

  const badgeClass = COMPLEXITY_COLORS[complexity] ?? "bg-zinc-100 text-zinc-500";

  return (
    <div
      className={`group flex items-stretch border-b border-zinc-100 last:border-b-0 transition-opacity ${
        isPending ? "pointer-events-none opacity-50" : ""
      }`}
    >
      {/* Main link — takes up all available space */}
      <Link
        href={href}
        className="flex min-w-0 flex-1 gap-4 px-6 py-4 transition-colors hover:bg-zinc-50"
      >
        <div className="min-w-0 flex-1">
          <div className="mb-1.5 flex items-center gap-2">
            <span
              className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${badgeClass}`}
            >
              {complexity}
            </span>
            <span className="truncate text-sm font-medium text-zinc-900 group-hover:text-zinc-700">
              {documentType}
            </span>
          </div>
          {summary && (
            <p className="text-[13px] leading-relaxed text-zinc-500 line-clamp-2">
              {summary}
            </p>
          )}
        </div>
        <div className="shrink-0 pt-px">
          <span className="font-mono text-[10.5px] text-zinc-400">{formattedDate}</span>
        </div>
      </Link>

      {/* Delete button — sibling to Link, never nested inside it */}
      <div className="flex shrink-0 items-center px-3">
        <button
          type="button"
          onClick={handleDelete}
          disabled={isPending}
          title={deleteFailed ? "Delete failed — click to retry" : "Delete document"}
          className={`flex h-7 w-7 items-center justify-center rounded-md transition-colors ${
            deleteFailed
              ? "text-red-400 hover:bg-red-50 hover:text-red-600"
              : "text-zinc-300 hover:bg-zinc-100 hover:text-zinc-500"
          }`}
        >
          {isPending ? (
            <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-600" />
          ) : (
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
              <path d="M10 11v6M14 11v6" />
              <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
}
