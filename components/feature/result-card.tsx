type Props = {
  title: string;
  icon: string;
  children: React.ReactNode;
};

export function ResultCard({ title, icon, children }: Props) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-5">
      <h2 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-zinc-400">
        <span>{icon}</span>
        {title}
      </h2>
      {children}
    </div>
  );
}
