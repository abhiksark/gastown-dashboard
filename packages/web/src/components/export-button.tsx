import { useState, useRef, useEffect } from "react";
import { Download } from "lucide-react";
import { exportToCSV, exportToJSON, type ExportColumn } from "@/lib/export";

interface ExportButtonProps {
  data: Record<string, unknown>[];
  columns: ExportColumn[];
  filename: string;
}

export function ExportButton({ data, columns, filename }: ExportButtonProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 rounded-md border border-[var(--color-border)] px-2.5 py-1 text-xs text-zinc-400 hover:text-zinc-100 hover:border-zinc-500 transition-colors"
      >
        <Download className="h-3 w-3" />
        Export
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 z-20 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] shadow-lg overflow-hidden min-w-[100px]">
          <button
            onClick={() => { exportToCSV(data, columns, `${filename}.csv`); setOpen(false); }}
            className="w-full px-3 py-1.5 text-xs text-zinc-300 hover:bg-zinc-800 text-left transition-colors"
          >
            CSV
          </button>
          <button
            onClick={() => { exportToJSON(data, `${filename}.json`); setOpen(false); }}
            className="w-full px-3 py-1.5 text-xs text-zinc-300 hover:bg-zinc-800 text-left transition-colors"
          >
            JSON
          </button>
        </div>
      )}
    </div>
  );
}
