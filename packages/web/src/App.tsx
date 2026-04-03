import { Routes, Route } from "react-router";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { StatusBar } from "@/components/layout/status-bar";
import { OverviewPage } from "@/pages/overview";
import { AgentsPage } from "@/pages/agents";
import { BeadsPage } from "@/pages/beads";
import { RigsPage } from "@/pages/rigs";

export function App() {
  return (
    <div className="flex h-screen bg-[var(--color-surface)]">
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0">
        <Topbar />
        <main className="flex-1 overflow-auto p-6">
          <Routes>
            <Route path="/" element={<OverviewPage />} />
            <Route path="/agents" element={<AgentsPage />} />
            <Route path="/beads" element={<BeadsPage />} />
            <Route path="/rigs" element={<RigsPage />} />
          </Routes>
        </main>
        <StatusBar />
      </div>
    </div>
  );
}
