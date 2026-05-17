// Shown by React Suspense during server component loading for dynamic routes
// Includes a skeleton topbar so the transition doesn't flash a bare shell

export default function Loading() {
  return (
    <>
      {/* skeleton topbar */}
      <div className="flex h-11 shrink-0 items-center border-b border-zinc-200 bg-white px-5">
        <div className="h-2.5 w-32 animate-pulse rounded-full bg-zinc-100" />
      </div>

      {/* skeleton rows */}
      <div className="flex flex-1 flex-col overflow-y-auto bg-white">
        <div className="border-b border-zinc-100 px-6 py-3">
          <div className="h-2 w-20 animate-pulse rounded-full bg-zinc-100" />
        </div>
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="flex gap-4 border-b border-zinc-100 px-6 py-4 last:border-b-0"
          >
            <div className="flex-1 space-y-2.5">
              <div className="flex items-center gap-2">
                <div className="h-4 w-12 animate-pulse rounded-full bg-zinc-100" />
                <div
                  className="h-3.5 animate-pulse rounded-full bg-zinc-100"
                  style={{ width: `${120 + (i % 3) * 40}px` }}
                />
              </div>
              <div
                className="h-3 animate-pulse rounded-full bg-zinc-100"
                style={{ width: `${55 + (i % 4) * 10}%` }}
              />
            </div>
            <div className="h-2.5 w-10 shrink-0 animate-pulse self-start rounded-full bg-zinc-100 pt-1" />
          </div>
        ))}
      </div>
    </>
  );
}
