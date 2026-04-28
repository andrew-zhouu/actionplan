/** Session-storage key shared between /new and /workspace. */
export const STORAGE_KEY = "actionplan:workspace";

/**
 * Tailwind badge classes keyed by complexity level ("Low" | "Medium" | "High").
 * Single source of truth — imported by InboxRow, SourcePane, and PlanPanel.
 */
export const COMPLEXITY_COLORS: Record<string, string> = {
  Low:    "bg-green-100 text-green-800",
  Medium: "bg-yellow-100 text-yellow-800",
  High:   "bg-red-100 text-red-800",
};
