export function Topbar({
  crumbs,
  right,
}: {
  crumbs: string[];
  right?: React.ReactNode;
}) {
  return (
    <div className="flex h-11 shrink-0 items-center justify-between border-b border-zinc-200 bg-white px-5">
      <div className="flex items-center gap-1.5 text-sm">
        {crumbs.map((crumb, i) => (
          <span key={i} className="flex items-center gap-1.5">
            {i > 0 && <span className="text-zinc-300 select-none">/</span>}
            {i === crumbs.length - 1 ? (
              <span className="font-semibold text-zinc-900">{crumb}</span>
            ) : (
              <span className="text-zinc-400">{crumb}</span>
            )}
          </span>
        ))}
      </div>
      {right && <div className="flex items-center gap-2">{right}</div>}
    </div>
  );
}
