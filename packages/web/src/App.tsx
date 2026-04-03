import { Routes, Route } from "react-router";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { ToastContainer } from "@/components/toast";
import { ToastContext, useToastState } from "@/hooks/use-toast";
import { OverviewPage } from "@/pages/overview";
import { AgentsPage } from "@/pages/agents";
import { BeadsPage } from "@/pages/beads";
import { RigsPage } from "@/pages/rigs";
import { ConvoysPage } from "@/pages/convoys";
import { RefineryPage } from "@/pages/refinery";
import { EscalationsPage } from "@/pages/escalations";
import { AgentDetailPage } from "@/pages/agent-detail";
import { MailPage } from "@/pages/mail";
import { RigDetailPage } from "@/pages/rig-detail";
import { SessionsPage } from "@/pages/sessions";
import { WorkflowsPage } from "@/pages/workflows";
import { CommandPalette } from "@/components/command-palette";
import { FeedPage } from "@/pages/feed";
import { SettingsPage } from "@/pages/settings";
import { CostsPage } from "@/pages/costs";

export function App() {
  const toastState = useToastState();

  return (
    <ToastContext.Provider value={toastState}>
      <div className="flex h-screen bg-[var(--color-surface)]">
        <Sidebar />
        <div className="flex flex-col flex-1 min-w-0">
          <Topbar />
          <main className="flex-1 overflow-auto px-6 py-4">
            <Routes>
              <Route path="/" element={<OverviewPage />} />
              <Route path="/agents" element={<AgentsPage />} />
              <Route path="/agents/:name" element={<AgentDetailPage />} />
              <Route path="/sessions" element={<SessionsPage />} />
              <Route path="/beads" element={<BeadsPage />} />
              <Route path="/rigs" element={<RigsPage />} />
              <Route path="/rigs/:name" element={<RigDetailPage />} />
              <Route path="/convoys" element={<ConvoysPage />} />
              <Route path="/refinery" element={<RefineryPage />} />
              <Route path="/escalations" element={<EscalationsPage />} />
              <Route path="/mail" element={<MailPage />} />
              <Route path="/workflows" element={<WorkflowsPage />} />
              <Route path="/feed" element={<FeedPage />} />
              <Route path="/costs" element={<CostsPage />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Routes>
          </main>
        </div>
      </div>
      <ToastContainer toasts={toastState.toasts} onRemove={toastState.removeToast} />
      <CommandPalette />
    </ToastContext.Provider>
  );
}
