import { Routes, Route } from "react-router";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { StatusBar } from "@/components/layout/status-bar";

function Placeholder({ name }: { name: string }) {
  return (
    <div className="flex items-center justify-center h-full text-zinc-500">
      {name} — coming soon
    </div>
  );
}

export function App() {
  return (
    <div className="flex h-screen bg-[var(--color-surface)]">
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0">
        <Topbar />
        <main className="flex-1 overflow-auto p-6">
          <Routes>
            <Route path="/" element={<Placeholder name="Overview" />} />
            <Route path="/agents" element={<Placeholder name="Agents" />} />
            <Route path="/beads" element={<Placeholder name="Beads" />} />
            <Route path="/rigs" element={<Placeholder name="Rigs" />} />
          </Routes>
        </main>
        <StatusBar />
      </div>
    </div>
  );
}
