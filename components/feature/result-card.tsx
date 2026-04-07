type Props = {
  title: string;
  icon: string;
  children: React.ReactNode;
};

export function ResultCard({ title, icon, children }: Props) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
      <h2 className="mb-4 flex items-center gap-2.5 text-xs font-semibold uppercase tracking-widest text-zinc-400">
        <span className="flex size-6 items-center justify-center rounded-md bg-zinc-100 text-sm">
          {icon}
        </span>
        {title}
      </h2>
      {children}
    </div>
  );
}
