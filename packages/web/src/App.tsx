import { useState, useMemo, useCallback } from "react";
import { Routes, Route, useNavigate, useLocation } from "react-router";
import { AnimatePresence, motion } from "framer-motion";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { ToastContainer } from "@/components/toast";
import { ToastContext, useToastState } from "@/hooks/use-toast";
import { useGlobalShortcuts } from "@/hooks/use-keyboard";
import { useNotifications } from "@/hooks/use-notifications";
import { useNotificationWatcher } from "@/hooks/use-notification-watcher";
import { ShortcutHelp } from "@/components/shortcut-help";
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
import { AuditPage } from "@/pages/audit";

const pageVariants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
};

const pageTransition = { duration: 0.2, ease: "easeInOut" as const };

export function App() {
  const toastState = useToastState();
  const navigate = useNavigate();
  const location = useLocation();
  const [helpOpen, setHelpOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const callbacks = useMemo(() => ({ onHelp: () => setHelpOpen((v) => !v) }), []);
  useGlobalShortcuts(navigate, callbacks);
  const notifications = useNotifications();
  useNotificationWatcher(notifications.sendNotification);

  const closeMobile = useCallback(() => setMobileOpen(false), []);

  return (
    <ToastContext.Provider value={toastState}>
      <div className="flex h-screen bg-[var(--color-surface)]">
        <Sidebar mobileOpen={mobileOpen} onMobileClose={closeMobile} />
        <div className="flex flex-col flex-1 min-w-0">
          <Topbar
            notificationsEnabled={notifications.enabled}
            onToggleNotifications={() => notifications.setEnabled(!notifications.enabled)}
            onMenuClick={() => setMobileOpen(true)}
          />
          <main className="flex-1 overflow-auto px-4 md:px-6 py-4">
            <AnimatePresence mode="wait">
              <motion.div
                key={location.pathname}
                variants={pageVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={pageTransition}
              >
                <Routes location={location}>
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
                  <Route path="/audit" element={<AuditPage />} />
                  <Route path="/settings" element={<SettingsPage />} />
                </Routes>
              </motion.div>
            </AnimatePresence>
          </main>
        </div>
      </div>
      <ToastContainer toasts={toastState.toasts} onRemove={toastState.removeToast} />
      <CommandPalette />
      <ShortcutHelp open={helpOpen} onClose={() => setHelpOpen(false)} />
    </ToastContext.Provider>
  );
}
