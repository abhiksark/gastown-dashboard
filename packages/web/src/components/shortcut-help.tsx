interface ShortcutHelpProps {
  open: boolean;
  onClose: () => void;
}

interface ShortcutGroup {
  title: string;
  shortcuts: { keys: string; description: string }[];
}

const groups: ShortcutGroup[] = [
  {
    title: "Global",
    shortcuts: [
      { keys: "Cmd+K", description: "Command palette" },
      { keys: "?", description: "Show this help" },
      { keys: "Esc", description: "Close panel / modal" },
    ],
  },
  {
    title: "Navigation (g + key)",
    shortcuts: [
      { keys: "g o", description: "Go to Overview" },
      { keys: "g a", description: "Go to Agents" },
      { keys: "g b", description: "Go to Beads" },
      { keys: "g r", description: "Go to Rigs" },
      { keys: "g s", description: "Go to Sessions" },
      { keys: "g c", description: "Go to Costs" },
      { keys: "g e", description: "Go to Escalations" },
      { keys: "g m", description: "Go to Mail" },
      { keys: "g f", description: "Go to Feed" },
    ],
  },
  {
    title: "Tables",
    shortcuts: [
      { keys: "j", description: "Move selection down" },
      { keys: "k", description: "Move selection up" },
      { keys: "Enter", description: "Open detail panel" },
      { keys: "Esc", description: "Close detail panel" },
    ],
  },
];

function Kbd({ children }: { children: string }) {
  return (
    <kbd className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded bg-zinc-800 border border-zinc-700 text-[10px] font-mono text-zinc-300">
      {children}
    </kbd>
  );
}

export function ShortcutHelp({ open, onClose }: ShortcutHelpProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative w-full max-w-lg rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-xl max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-zinc-100">Keyboard Shortcuts</h2>
          <button
            onClick={onClose}
            className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            Esc to close
          </button>
        </div>

        <div className="space-y-5">
          {groups.map((group) => (
            <div key={group.title}>
              <h3 className="text-[10px] font-semibold uppercase tracking-widest text-zinc-600 mb-2">
                {group.title}
              </h3>
              <div className="space-y-1.5">
                {group.shortcuts.map((s) => (
                  <div key={s.keys} className="flex items-center justify-between">
                    <span className="text-xs text-zinc-400">{s.description}</span>
                    <div className="flex items-center gap-1">
                      {s.keys.split(" ").map((k, i) => (
                        <span key={i} className="flex items-center gap-0.5">
                          {i > 0 && <span className="text-zinc-600 text-[10px]">then</span>}
                          <Kbd>{k}</Kbd>
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
