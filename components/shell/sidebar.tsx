"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

function IconInbox() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 16 12 14 15 10 15 8 12 2 12" />
      <path d="M5.45 5.11L2 12v6a2 2 0 002 2h16a2 2 0 002-2v-6l-3.45-6.89A2 2 0 0016.76 4H7.24a2 2 0 00-1.79 1.11z" />
    </svg>
  );
}

function IconGrid() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
    </svg>
  );
}

function IconCheck() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 11 12 14 22 4" />
      <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
    </svg>
  );
}

function IconCalendar() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}

function IconLibrary() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5A2.5 2.5 0 016.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" />
    </svg>
  );
}

function IconPlus() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

const NAV = [
  { key: "inbox",     label: "Inbox",     href: "/app",           Icon: IconInbox },
  { key: "dashboard", label: "Dashboard", href: "/app/dashboard", Icon: IconGrid },
  { key: "tasks",     label: "Tasks",     href: "/app/tasks",     Icon: IconCheck },
  { key: "calendar",  label: "Calendar",  href: "/app/calendar",  Icon: IconCalendar },
  { key: "library",   label: "Library",   href: null,             Icon: IconLibrary },
] as const;

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex w-56 shrink-0 flex-col border-r border-zinc-200 bg-white">
      {/* Brand — site-level home (public landing). App-level navigation
          lives below in Inbox / Dashboard / Tasks / Calendar. */}
      <Link
        href="/"
        className="flex items-center gap-2.5 px-4 py-[18px] transition-opacity hover:opacity-80"
      >
        <div
          className="h-6 w-6 rounded-[6px]"
          style={{ background: "var(--accent)" }}
        />
        <span className="text-sm font-semibold tracking-tight text-zinc-900">
          ActionPlan
        </span>
      </Link>

      {/* New document */}
      <div className="px-3 pb-3">
        <Link
          href="/app/new"
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-zinc-900 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-zinc-700"
        >
          <IconPlus />
          New document
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-0.5 px-2 pt-1">
        {NAV.map(({ key, label, href, Icon }) => {
          if (href === null) {
            return (
              <div
                key={key}
                title="Coming soon"
                className="flex cursor-not-allowed select-none items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-zinc-300"
              >
                <Icon />
                {label}
              </div>
            );
          }

          const isActive = pathname === href || (key === "inbox" && pathname === "/app/new");
          return (
            <Link
              key={key}
              href={href}
              className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors ${
                isActive
                  ? "bg-zinc-100 font-semibold text-zinc-900"
                  : "text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900"
              }`}
            >
              <span className={isActive ? "text-zinc-700" : "text-zinc-400"}>
                <Icon />
              </span>
              {label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
