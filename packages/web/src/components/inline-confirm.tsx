import { useState, useEffect, useRef } from "react";

interface InlineConfirmProps {
  /** The default button content */
  children: React.ReactNode;
  /** Text shown in the confirm state */
  confirmLabel?: string;
  /** Called when the user confirms */
  onConfirm: () => void;
  /** Variant affects confirm button styling */
  variant?: "default" | "danger";
  /** Auto-cancel after this many ms (default 3000) */
  timeout?: number;
  /** Disabled state */
  disabled?: boolean;
  /** Additional class for the wrapper */
  className?: string;
}

export function InlineConfirm({
  children,
  confirmLabel = "Confirm?",
  onConfirm,
  variant = "default",
  timeout = 3000,
  disabled,
  className = "",
}: InlineConfirmProps) {
  const [confirming, setConfirming] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (confirming) {
      timerRef.current = setTimeout(() => setConfirming(false), timeout);
    }
    return () => clearTimeout(timerRef.current);
  }, [confirming, timeout]);

  if (confirming) {
    return (
      <span className={`inline-flex items-center gap-1 ${className}`}>
        <button
          onClick={(e) => {
            e.stopPropagation();
            setConfirming(false);
            onConfirm();
          }}
          className={`rounded-md px-2 py-0.5 text-xs font-medium transition-colors ${
            variant === "danger"
              ? "bg-red-500/20 text-red-400 hover:bg-red-500/30"
              : "bg-blue-500/20 text-blue-400 hover:bg-blue-500/30"
          }`}
        >
          {confirmLabel}
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            setConfirming(false);
          }}
          className="rounded-md px-1.5 py-0.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          Cancel
        </button>
      </span>
    );
  }

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        setConfirming(true);
      }}
      disabled={disabled}
      className={className}
    >
      {children}
    </button>
  );
}
