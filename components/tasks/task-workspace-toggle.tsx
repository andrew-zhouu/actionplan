"use client";

import { useState, useTransition } from "react";
import { toggleTaskCompletion } from "@/app/actions/tasks";

type Props = {
  documentId: string;
  kind:       "action_item" | "deadline";
  taskIndex:  number;
  done:       boolean;
};

export function TaskWorkspaceToggle({ documentId, kind, taskIndex, done: initialDone }: Props) {
  const [done, setDone] = useState(initialDone);
  const [isPending, startTransition] = useTransition();

  function handleToggle() {
    const wasD = done;
    setDone(!wasD); // optimistic
    startTransition(async () => {
      await toggleTaskCompletion(documentId, kind, taskIndex, wasD);
      // server action revalidates /tasks (list); this page uses force-dynamic
      // so a fresh load always shows current state from the DB.
    });
  }

  return (
    <button
      type="button"
      onClick={handleToggle}
      disabled={isPending}
      aria-label={done ? "Mark incomplete" : "Mark complete"}
      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded border-2 transition-all ${
        isPending
          ? "opacity-50"
          : done
          ? "border-zinc-700 bg-zinc-800"
          : "border-zinc-300 hover:border-zinc-500"
      }`}
    >
      {done && (
        <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
          <polyline
            points="1 4 3.5 6.5 9 1"
            stroke="white"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </button>
  );
}
