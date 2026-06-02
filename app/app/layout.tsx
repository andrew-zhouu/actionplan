import { Sidebar } from "@/components/shell/sidebar";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-1 min-h-0 flex-col md:flex-row">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col min-h-0">
        {children}
      </div>
    </div>
  );
}
