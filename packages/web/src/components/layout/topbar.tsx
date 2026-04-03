export function Topbar() {
  function openPalette() {
    document.dispatchEvent(
      new KeyboardEvent("keydown", { key: "k", metaKey: true })
    );
  }

  return (
    <header className="flex items-center h-14 px-6 border-b border-[var(--color-border)] bg-[var(--color-surface)]">
      <h1 className="text-sm font-semibold text-zinc-100">Gas Town HQ</h1>
      <div className="ml-auto flex items-center gap-4">
        <button
          onClick={openPalette}
          className="flex items-center gap-2 rounded-md border border-[var(--color-border)] bg-[var(--color-card)] px-3 py-1.5 text-xs text-zinc-500 hover:text-zinc-300 hover:border-zinc-500 transition-colors"
        >
          <kbd className="font-mono">⌘K</kbd>
          <span>Search</span>
        </button>
        <div className="h-7 w-7 rounded-full bg-zinc-700 flex items-center justify-center text-xs font-medium text-zinc-300">
          O
        </div>
      </div>
    </header>
  );
}
