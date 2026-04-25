import { Sidebar } from "@/components/shell/sidebar";
import { Topbar } from "@/components/shell/topbar";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-1">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar crumbs={["Inbox", "New document"]} />
        <div className="flex-1 overflow-y-auto bg-zinc-50">
          {children}
        </div>
      </div>
    </div>
  );
}
