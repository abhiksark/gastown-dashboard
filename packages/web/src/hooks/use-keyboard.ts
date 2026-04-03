import { useEffect, useRef, useCallback } from "react";

type KeyHandler = (e: KeyboardEvent) => void;

interface UseKeyboardOptions {
  /** j/k navigation: called with delta (-1 or +1) */
  onMove?: (delta: number) => void;
  /** Enter pressed */
  onSelect?: () => void;
  /** Esc pressed */
  onEscape?: () => void;
  /** Whether keyboard nav is enabled (disable when modals/inputs are focused) */
  enabled?: boolean;
}

/**
 * Table keyboard navigation: j/k to move, Enter to select, Esc to close.
 * Automatically disabled when an input/textarea/select is focused.
 */
export function useTableKeyboard({ onMove, onSelect, onEscape, enabled = true }: UseKeyboardOptions) {
  useEffect(() => {
    if (!enabled) return;

    function handler(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      switch (e.key) {
        case "j":
          e.preventDefault();
          onMove?.(1);
          break;
        case "k":
          e.preventDefault();
          onMove?.(-1);
          break;
        case "Enter":
          e.preventDefault();
          onSelect?.();
          break;
        case "Escape":
          e.preventDefault();
          onEscape?.();
          break;
      }
    }

    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [enabled, onMove, onSelect, onEscape]);
}

interface Shortcut {
  keys: string;
  description: string;
  handler: KeyHandler;
}

/**
 * Global keyboard shortcuts with two-key combo support (g+o, g+a, etc.).
 * Returns a setter for the help overlay toggle.
 */
export function useGlobalShortcuts(
  navigate: (path: string) => void,
  callbacks?: {
    onHelp?: () => void;
  }
) {
  const pendingRef = useRef<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handler = useCallback(
    (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      // Two-key combos: g+<key>
      if (pendingRef.current === "g") {
        pendingRef.current = null;
        if (timerRef.current) clearTimeout(timerRef.current);
        const routes: Record<string, string> = {
          o: "/",
          a: "/agents",
          b: "/beads",
          r: "/rigs",
          s: "/sessions",
          c: "/costs",
          e: "/escalations",
          m: "/mail",
          f: "/feed",
        };
        if (routes[e.key]) {
          e.preventDefault();
          navigate(routes[e.key]);
        }
        return;
      }

      if (e.key === "g") {
        e.preventDefault();
        pendingRef.current = "g";
        timerRef.current = setTimeout(() => {
          pendingRef.current = null;
        }, 500);
        return;
      }

      // Single-key shortcuts
      if (e.key === "?") {
        e.preventDefault();
        callbacks?.onHelp?.();
      }
    },
    [navigate, callbacks]
  );

  useEffect(() => {
    document.addEventListener("keydown", handler);
    return () => {
      document.removeEventListener("keydown", handler);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [handler]);
}
