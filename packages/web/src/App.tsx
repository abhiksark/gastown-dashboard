import { Routes, Route } from "react-router";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { StatusBar } from "@/components/layout/status-bar";
import { ToastContainer } from "@/components/toast";
import { ToastContext, useToastState } from "@/hooks/use-toast";
import { OverviewPage } from "@/pages/overview";
import { AgentsPage } from "@/pages/agents";
import { BeadsPage } from "@/pages/beads";
import { RigsPage } from "@/pages/rigs";
import { ConvoysPage } from "@/pages/convoys";
import { RefineryPage } from "@/pages/refinery";
import { EscalationsPage } from "@/pages/escalations";
import { MailPage } from "@/pages/mail";
import { RigDetailPage } from "@/pages/rig-detail";
import { CommandPalette } from "@/components/command-palette";

export function App() {
  const toastState = useToastState();

  return (
    <ToastContext.Provider value={toastState}>
      <div className="flex h-screen bg-[var(--color-surface)]">
        <Sidebar />
        <div className="flex flex-col flex-1 min-w-0">
          <Topbar />
          <main className="flex-1 overflow-auto px-8 py-6">
            <Routes>
              <Route path="/" element={<OverviewPage />} />
              <Route path="/agents" element={<AgentsPage />} />
              <Route path="/beads" element={<BeadsPage />} />
              <Route path="/rigs" element={<RigsPage />} />
              <Route path="/rigs/:name" element={<RigDetailPage />} />
              <Route path="/convoys" element={<ConvoysPage />} />
              <Route path="/refinery" element={<RefineryPage />} />
              <Route path="/escalations" element={<EscalationsPage />} />
              <Route path="/mail" element={<MailPage />} />
            </Routes>
          </main>
          <StatusBar />
        </div>
      </div>
      <ToastContainer toasts={toastState.toasts} onRemove={toastState.removeToast} />
      <CommandPalette />
    </ToastContext.Provider>
  );
}
