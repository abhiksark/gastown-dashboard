import { useEffect, useRef } from "react";

export interface ContextMenuItem {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  variant?: "default" | "danger";
  disabled?: boolean;
}

interface ContextMenuProps {
  items: ContextMenuItem[];
  position: { x: number; y: number } | null;
  onClose: () => void;
}

export function ContextMenu({ items, position, onClose }: ContextMenuProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!position) return;

    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }

    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [position, onClose]);

  if (!position) return null;

  return (
    <div
      ref={ref}
      className="fixed z-50 min-w-[160px] rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] shadow-lg py-1"
      style={{ left: position.x, top: position.y }}
    >
      {items.map((item) => (
        <button
          key={item.label}
          onClick={() => {
            if (!item.disabled) {
              item.onClick();
              onClose();
            }
          }}
          disabled={item.disabled}
          className={`w-full flex items-center gap-2 px-3 py-1.5 text-sm transition-colors disabled:opacity-40 ${
            item.variant === "danger"
              ? "text-red-400 hover:bg-red-500/10"
              : "text-zinc-300 hover:bg-zinc-800"
          }`}
        >
          {item.icon && <span className="h-3.5 w-3.5 shrink-0">{item.icon}</span>}
          {item.label}
        </button>
      ))}
    </div>
  );
}
