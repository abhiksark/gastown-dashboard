import { useState, useEffect, useRef } from "react";
import { apiFetch } from "@/lib/api";
import { X, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

interface SessionOutputProps {
  rig: string;
  name: string;
  open: boolean;
  onClose: () => void;
}

// Strip ANSI escape codes
function stripAnsi(str: string): string {
  return str.replace(/\x1b\[[0-9;]*[a-zA-Z]/g, "").replace(/\x1b\][^\x07]*\x07/g, "");
}

export function SessionOutput({ rig, name, open, onClose }: SessionOutputProps) {
  const [output, setOutput] = useState("");
  const [loading, setLoading] = useState(false);
  const [lines, setLines] = useState(100);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLPreElement>(null);

  async function fetchOutput() {
    setLoading(true);
    setError(null);
    try {
      const url = rig === "mayor"
        ? `/sessions/mayor/output?lines=${lines}`
        : `/sessions/${encodeURIComponent(rig)}/${encodeURIComponent(name)}/output?lines=${lines}`;
      const data = await apiFetch<{ output: string }>(url);
      setOutput(stripAnsi(data.output || ""));
    } catch (err: any) {
      setError(err.message);
      setOutput("");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (open) fetchOutput();
  }, [open, rig, name, lines]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [output]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="relative w-full max-w-4xl h-[80vh] rounded-lg border border-zinc-700 bg-[#0d0d0d] shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <span className="text-xs font-medium text-zinc-300">
              {rig === "mayor" ? "mayor" : `${rig}/${name}`}
            </span>
            <div className="flex gap-1">
              {[50, 100, 200, 500].map((n) => (
                <button
                  key={n}
                  onClick={() => setLines(n)}
                  className={cn(
                    "rounded px-2 py-0.5 text-[10px] transition-colors",
                    lines === n
                      ? "bg-zinc-700 text-zinc-200"
                      : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800"
                  )}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchOutput}
              disabled={loading}
              className="rounded p-1.5 text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-colors disabled:opacity-50"
              title="Refresh"
            >
              <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
            </button>
            <button
              onClick={onClose}
              className="rounded p-1.5 text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Output */}
        <pre
          ref={scrollRef}
          className="flex-1 overflow-auto px-4 py-3 text-[12px] leading-[1.6] font-mono text-emerald-300/90 whitespace-pre-wrap break-words selection:bg-zinc-700"
        >
          {loading && !output ? (
            <span className="text-zinc-600">Loading...</span>
          ) : error ? (
            <span className="text-red-400">{error}</span>
          ) : output ? (
            output
          ) : (
            <span className="text-zinc-600">No output captured</span>
          )}
        </pre>
      </div>
    </div>
  );
}
