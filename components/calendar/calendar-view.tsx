"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

// ─── public types ────────────────────────────────────────────────────────────

export type CalendarDeadline = {
  documentId:   string;
  documentType: string;
  taskIndex:    number;
  description:  string;
  rawDate:      string;   // original text from the document
  dateKey:      string;   // "YYYY-MM-DD" — local-tz day key for grouping
  done:         boolean;
};

// ─── constants ───────────────────────────────────────────────────────────────

const MONTH_NAMES = [
  "January", "February", "March",     "April",   "May",      "June",
  "July",    "August",   "September", "October", "November", "December",
];

// Sunday-first to match US convention. Switching to Monday-first is a
// one-line change later if needed.
const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// ─── helpers ─────────────────────────────────────────────────────────────────

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function dateToKey(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function keyToDate(key: string): Date | null {
  const m = key.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  const d = new Date(parseInt(m[1], 10), parseInt(m[2], 10) - 1, parseInt(m[3], 10));
  return isNaN(d.getTime()) ? null : d;
}

function parseMonthParam(s: string | null): { year: number; month: number } | null {
  if (!s) return null;
  const m = s.match(/^(\d{4})-(\d{2})$/);
  if (!m) return null;
  const year  = parseInt(m[1], 10);
  const month = parseInt(m[2], 10) - 1;
  if (month < 0 || month > 11)      return null;
  if (year  < 1900 || year > 2200)  return null;
  return { year, month };
}

function parseDayParam(s: string | null): string | null {
  if (!s) return null;
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null;
}

function formatDayHeader(d: Date): string {
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    month:   "long",
    day:     "numeric",
    year:    "numeric",
  });
}

// ─── component ───────────────────────────────────────────────────────────────

type Props = { deadlines: CalendarDeadline[] };

export function CalendarView({ deadlines }: Props) {
  const router = useRouter();
  const params = useSearchParams();

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayKey = dateToKey(today);

  // Initialize from URL with sensible defaults. Tampered params fall back
  // silently to current month / no selection.
  const urlMonth = parseMonthParam(params.get("month"));
  const urlDay   = parseDayParam(params.get("day"));
  const initialMonth = urlMonth ?? { year: today.getFullYear(), month: today.getMonth() };
  const initialDay   = urlDay ?? (
    initialMonth.year === today.getFullYear() && initialMonth.month === today.getMonth()
      ? todayKey
      : null
  );

  const [{ year, month }, setMonthState] = useState(initialMonth);
  const [selectedKey, setSelectedKey]    = useState<string | null>(initialDay);

  // Group deadlines by date key. Recomputed only when the deadlines prop changes.
  const byDate = useMemo(() => {
    const m = new Map<string, CalendarDeadline[]>();
    for (const d of deadlines) {
      const list = m.get(d.dateKey) ?? [];
      list.push(d);
      m.set(d.dateKey, list);
    }
    return m;
  }, [deadlines]);

  // Build the visible 5- or 6-week grid (cells from prev/next month included
  // so the grid is always 7 × N).
  const cells = useMemo(() => {
    const result: { date: Date; inCurrentMonth: boolean; key: string }[] = [];
    const firstOfMonth   = new Date(year, month, 1);
    const firstDayOfWeek = firstOfMonth.getDay();
    const daysInMonth    = new Date(year, month + 1, 0).getDate();

    // Prev month tail
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      const d = new Date(year, month, -i);
      result.push({ date: d, inCurrentMonth: false, key: dateToKey(d) });
    }
    // Current month
    for (let i = 1; i <= daysInMonth; i++) {
      const d = new Date(year, month, i);
      result.push({ date: d, inCurrentMonth: true, key: dateToKey(d) });
    }
    // Next month head — fill to multiple of 7
    while (result.length % 7 !== 0) {
      const last = result[result.length - 1].date;
      const d    = new Date(last.getFullYear(), last.getMonth(), last.getDate() + 1);
      result.push({ date: d, inCurrentMonth: false, key: dateToKey(d) });
    }
    return result;
  }, [year, month]);

  // ── URL sync ───────────────────────────────────────────────────────────────
  // router.replace (not push) — calendar navigation shouldn't pollute history.

  function syncUrl(yr: number, mo: number, day: string | null) {
    const sp = new URLSearchParams();
    sp.set("month", `${yr}-${pad2(mo + 1)}`);
    if (day) sp.set("day", day);
    router.replace(`/app/calendar?${sp.toString()}`, { scroll: false });
  }

  function navigateMonth(newYear: number, newMonth: number, opts?: { day?: string | null }) {
    setMonthState({ year: newYear, month: newMonth });
    const newDay = opts?.day !== undefined ? opts.day : null;
    setSelectedKey(newDay);
    syncUrl(newYear, newMonth, newDay);
  }

  function prevMonth() {
    if (month === 0) navigateMonth(year - 1, 11);
    else             navigateMonth(year, month - 1);
  }

  function nextMonth() {
    if (month === 11) navigateMonth(year + 1, 0);
    else              navigateMonth(year, month + 1);
  }

  function goToToday() {
    navigateMonth(today.getFullYear(), today.getMonth(), { day: todayKey });
  }

  function selectDay(cellKey: string, inCurrentMonth: boolean) {
    // Click on a prev/next-month overflow cell jumps to that month
    if (!inCurrentMonth) {
      const d = keyToDate(cellKey);
      if (d) navigateMonth(d.getFullYear(), d.getMonth(), { day: cellKey });
      return;
    }
    setSelectedKey(cellKey);
    syncUrl(year, month, cellKey);
  }

  const selectedDate      = selectedKey ? keyToDate(selectedKey) : null;
  const selectedDeadlines = selectedKey ? (byDate.get(selectedKey) ?? []) : [];

  // ── Empty state — no parseable deadlines anywhere ──────────────────────────

  if (deadlines.length === 0) {
    return <EmptyState />;
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-6">
      <div className="flex flex-col gap-6 lg:flex-row">

        {/* Calendar grid */}
        <div className="lg:flex-1">
          <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">

            {/* Top bar — month name + nav */}
            <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-3">
              <h2 className="font-display text-[20px] font-normal tracking-tight text-zinc-900">
                {MONTH_NAMES[month]} {year}
              </h2>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={prevMonth}
                  aria-label="Previous month"
                  className="rounded-md p-1.5 text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="15 18 9 12 15 6" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={goToToday}
                  className="rounded-md px-2.5 py-1 text-[11.5px] font-semibold text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900"
                >
                  Today
                </button>
                <button
                  type="button"
                  onClick={nextMonth}
                  aria-label="Next month"
                  className="rounded-md p-1.5 text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Day-of-week labels */}
            <div className="grid grid-cols-7 border-b border-zinc-200 bg-zinc-50">
              {DAY_LABELS.map((label, i) => (
                <div
                  key={i}
                  className={`px-2 py-2 text-center font-mono text-[10px] font-semibold uppercase tracking-[0.1em] text-zinc-400 ${
                    (i + 1) % 7 === 0 ? "" : "border-r border-zinc-100"
                  }`}
                >
                  {label}
                </div>
              ))}
            </div>

            {/* Day cells */}
            <div className="grid grid-cols-7">
              {cells.map((cell, i) => {
                const dayDeadlines = byDate.get(cell.key) ?? [];
                const total          = dayDeadlines.length;
                const completedCount = dayDeadlines.filter((d) => d.done).length;
                const isPast         = cell.key < todayKey;
                const hasOverdue     = isPast && completedCount < total;
                const allDone        = total > 0 && completedCount === total;
                const isToday        = cell.key === todayKey;
                const isSelected     = cell.key === selectedKey;
                const isLastCol      = (i + 1) % 7 === 0;
                const isLastRow      = i >= cells.length - 7;

                return (
                  <button
                    key={cell.key + ":" + i}
                    type="button"
                    onClick={() => selectDay(cell.key, cell.inCurrentMonth)}
                    aria-pressed={isSelected}
                    aria-label={`${cell.date.toDateString()}${total > 0 ? `, ${total} deadline${total === 1 ? "" : "s"}` : ""}`}
                    className={[
                      "relative flex min-h-[68px] flex-col items-start p-2 text-left transition-colors",
                      isLastCol ? "" : "border-r border-zinc-100",
                      isLastRow ? "" : "border-b border-zinc-100",
                      !cell.inCurrentMonth ? "bg-zinc-50/40" : "",
                      isSelected ? "bg-zinc-100" : "hover:bg-zinc-50",
                    ].join(" ")}
                  >
                    {/* Day number — special treatment for "today" */}
                    <span
                      className={[
                        "flex h-5 w-5 items-center justify-center text-[11.5px] font-medium",
                        isToday
                          ? "rounded-full bg-zinc-900 text-white"
                          : cell.inCurrentMonth
                          ? "text-zinc-700"
                          : "text-zinc-300",
                      ].join(" ")}
                    >
                      {cell.date.getDate()}
                    </span>

                    {/* Indicator — count badge with optional overdue dot, or all-done check */}
                    {total > 0 && cell.inCurrentMonth && (
                      <div className="absolute bottom-1.5 right-1.5 flex items-center gap-1">
                        {hasOverdue && (
                          <span
                            className="h-1.5 w-1.5 rounded-full bg-red-500"
                            aria-label="Overdue deadlines"
                          />
                        )}
                        {allDone ? (
                          <svg
                            width="11"
                            height="11"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="text-emerald-600"
                            aria-label="All complete"
                          >
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        ) : (
                          <span
                            className={[
                              "min-w-[16px] rounded-full px-1.5 py-0.5 text-center font-mono text-[10px] font-semibold tabular-nums",
                              hasOverdue ? "bg-red-100 text-red-700" : "bg-zinc-200 text-zinc-700",
                            ].join(" ")}
                          >
                            {total}
                          </span>
                        )}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Selected-day panel */}
        <div className="lg:w-[340px] lg:shrink-0">
          <SelectedDayPanel date={selectedDate} deadlines={selectedDeadlines} />
        </div>

      </div>
    </div>
  );
}

// ─── selected-day panel ──────────────────────────────────────────────────────

function SelectedDayPanel({
  date,
  deadlines,
}: {
  date:      Date | null;
  deadlines: CalendarDeadline[];
}) {
  if (!date) {
    return (
      <div className="rounded-xl border border-zinc-200 bg-white px-5 py-12 text-center">
        <p className="text-[12.5px] text-zinc-500">
          Select a day to see its deadlines.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
      {/* Day header */}
      <div className="border-b border-zinc-100 px-5 py-4">
        <h3 className="font-display text-[16px] font-normal tracking-tight text-zinc-900">
          {formatDayHeader(date)}
        </h3>
        <p className="mt-0.5 text-[11.5px] text-zinc-500">
          {deadlines.length === 0
            ? "No deadlines"
            : `${deadlines.length} deadline${deadlines.length === 1 ? "" : "s"}`}
        </p>
      </div>

      {/* List */}
      {deadlines.length === 0 ? (
        <div className="px-5 py-8 text-center">
          <p className="text-[12.5px] text-zinc-400">Nothing scheduled.</p>
        </div>
      ) : (
        <ul className="divide-y divide-zinc-100">
          {deadlines.map((d) => (
            <li key={`${d.documentId}-${d.taskIndex}`} className="px-4 py-3">
              <div className="flex items-start gap-3">
                {/* Completion indicator — display-only in V1 */}
                <div
                  className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                    d.done
                      ? "border-zinc-700 bg-zinc-800"
                      : "border-zinc-300 bg-white"
                  }`}
                  aria-label={d.done ? "Complete" : "Incomplete"}
                >
                  {d.done && (
                    <svg width="9" height="7" viewBox="0 0 9 7" fill="none" className="shrink-0" aria-hidden="true">
                      <polyline points="1 3.5 3.5 6 8 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </div>

                {/* Content */}
                <div className="min-w-0 flex-1">
                  <p
                    className={`text-[13px] leading-snug ${
                      d.done
                        ? "text-zinc-400 line-through decoration-zinc-300"
                        : "text-zinc-800"
                    }`}
                  >
                    {d.description}
                  </p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
                    <Link
                      href={`/app/docs/${d.documentId}`}
                      className="text-[11px] text-zinc-500 transition-colors hover:text-zinc-700"
                    >
                      {d.documentType} ↗
                    </Link>
                    <span aria-hidden="true" className="select-none text-zinc-200">·</span>
                    <Link
                      href={`/app/tasks/${d.documentId}/deadline/${d.taskIndex}`}
                      className="text-[11px] font-medium text-zinc-600 transition-colors hover:text-zinc-900"
                    >
                      Open task →
                    </Link>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ─── empty state ─────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-24 text-center">
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-zinc-100 bg-zinc-50">
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-zinc-300"
        >
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
      </div>
      <h2 className="mb-3 font-display text-[24px] font-normal tracking-[-0.01em] text-zinc-800">
        No deadlines on the calendar
      </h2>
      <p className="mb-8 max-w-[340px] text-[14px] leading-relaxed text-zinc-500">
        Analyze a document with deadlines to see them land on the calendar.
      </p>
      <Link
        href="/app/new"
        className="inline-flex items-center gap-2 rounded-lg bg-zinc-900 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-zinc-700"
      >
        Analyze a document →
      </Link>
    </div>
  );
}
