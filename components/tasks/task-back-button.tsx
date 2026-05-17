"use client";

import { useRouter } from "next/navigation";

/**
 * History-aware back navigation for task workspaces.
 * Calls router.back() when prior history exists so task list filter state
 * (type, overdue, show-completed) is preserved on return.
 * Falls back to /tasks when there is no usable history entry.
 */
export function TaskBackButton() {
  const router = useRouter();

  function handleBack() {
    if (window.history.length > 1) {
      router.back();
    } else {
      router.push("/app/tasks");
    }
  }

  return (
    <button
      type="button"
      onClick={handleBack}
      className="flex items-center gap-1.5 text-[12.5px] font-medium text-zinc-500 transition-colors hover:text-zinc-900"
    >
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <polyline points="15 18 9 12 15 6" />
      </svg>
      Back to tasks
    </button>
  );
}
