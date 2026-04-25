import Link from "next/link";

type Crumb = string | { label: string; href: string };

export function Topbar({
  crumbs,
  right,
}: {
  crumbs: Crumb[];
  right?: React.ReactNode;
}) {
  return (
    <div className="flex h-11 shrink-0 items-center justify-between border-b border-zinc-200 bg-white px-5">
      <div className="flex items-center gap-1.5 text-sm">
        {crumbs.map((crumb, i) => {
          const isLast = i === crumbs.length - 1;
          const label  = typeof crumb === "string" ? crumb : crumb.label;
          const href   = typeof crumb === "string" ? undefined : crumb.href;

          return (
            <span key={i} className="flex items-center gap-1.5">
              {i > 0 && <span className="select-none text-zinc-300">/</span>}
              {isLast || !href ? (
                <span
                  className={
                    isLast ? "font-semibold text-zinc-900" : "text-zinc-400"
                  }
                >
                  {label}
                </span>
              ) : (
                <Link
                  href={href}
                  className="text-zinc-400 transition-colors hover:text-zinc-700"
                >
                  {label}
                </Link>
              )}
            </span>
          );
        })}
      </div>
      {right && <div className="flex items-center gap-2">{right}</div>}
    </div>
  );
}
