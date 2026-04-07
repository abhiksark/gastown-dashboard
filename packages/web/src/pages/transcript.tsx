import { useState, useEffect, useRef, useMemo } from "react";
import { useParams, Link } from "react-router";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/utils";
import { ArrowLeft, RefreshCw, Search, X, ArrowDown } from "lucide-react";

function stripAnsi(str: string): string {
  return str.replace(/\x1b\[[0-9;]*[a-zA-Z]/g, "").replace(/\x1b\][^\x07]*\x07/g, "");
}

export function TranscriptPage() {
  const { rig, name } = useParams<{ rig: string; name: string }>();
  const [output, setOutput] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lines, setLines] = useState(500);
  const [searchQuery, setSearchQuery] = useState("");
  const [showLineNumbers, setShowLineNumbers] = useState(true);
  const [autoScroll, setAutoScroll] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  async function fetchOutput() {
    if (!rig || !name) return;
    setLoading(true);
    setError(null);
    try {
      const url = rig === "hq" && name === "mayor"
        ? `/sessions/mayor/output?lines=${lines}`
        : `/sessions/${encodeURIComponent(rig)}/${encodeURIComponent(name)}/output?lines=${lines}`;
      const data = await apiFetch<{ output: string }>(url);
      setOutput(stripAnsi(data.output || ""));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchOutput();
  }, [rig, name, lines]);

  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [output, autoScroll]);

  // Handle scroll — pause auto-scroll when user scrolls up
  function handleScroll() {
    if (!scrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    const atBottom = scrollHeight - scrollTop - clientHeight < 50;
    if (!atBottom && autoScroll) setAutoScroll(false);
  }

  // Ctrl+F to focus search
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "f") {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
      if (e.key === "Escape") {
        setSearchQuery("");
        searchInputRef.current?.blur();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const outputLines = useMemo(() => output.split("\n"), [output]);

  const matchCount = useMemo(() => {
    if (!searchQuery) return 0;
    try {
      const re = new RegExp(searchQuery, "gi");
      return outputLines.filter((l) => re.test(l)).length;
    } catch {
      return 0;
    }
  }, [outputLines, searchQuery]);

  function highlightLine(line: string): React.ReactNode {
    if (!searchQuery) return line;
    try {
      const re = new RegExp(`(${searchQuery})`, "gi");
      const parts = line.split(re);
      return parts.map((part, i) =>
        re.test(part) ? (
          <mark key={i} className="bg-amber-500/30 text-amber-200 rounded-sm px-0.5">
            {part}
          </mark>
        ) : (
          part
        )
      );
    } catch {
      return line;
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] -mx-6 -my-4">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-800 bg-[#0d0d0d] shrink-0">
        <div className="flex items-center gap-3">
          <Link
            to="/sessions"
            className="p-1 rounded text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <span className="text-sm font-medium text-zinc-200">
            Transcript — {rig}/{name}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-zinc-600" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search (Ctrl+F)"
              className="w-52 rounded border border-zinc-800 bg-zinc-900 pl-7 pr-7 py-1 text-xs text-zinc-300 placeholder:text-zinc-600 outline-none focus:border-zinc-600"
            />
            {searchQuery && (
              <>
                <span className="absolute right-7 top-1/2 -translate-y-1/2 text-[10px] text-zinc-500">
                  {matchCount} match{matchCount !== 1 ? "es" : ""}
                </span>
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-zinc-300"
                >
                  <X className="h-3 w-3" />
                </button>
              </>
            )}
          </div>

          {/* Line count */}
          <div className="flex gap-0.5">
            {[100, 500, 1000, 2000].map((n) => (
              <button
                key={n}
                onClick={() => setLines(n)}
                className={cn(
                  "rounded px-2 py-0.5 text-[10px] transition-colors",
                  lines === n
                    ? "bg-zinc-700 text-zinc-200"
                    : "text-zinc-600 hover:text-zinc-300 hover:bg-zinc-800"
                )}
              >
                {n}
              </button>
            ))}
          </div>

          {/* Toggles */}
          <button
            onClick={() => setShowLineNumbers(!showLineNumbers)}
            className={cn(
              "rounded px-2 py-0.5 text-[10px] transition-colors",
              showLineNumbers
                ? "bg-zinc-700 text-zinc-200"
                : "text-zinc-600 hover:text-zinc-300 hover:bg-zinc-800"
            )}
          >
            #
          </button>

          <button
            onClick={fetchOutput}
            disabled={loading}
            className="rounded p-1 text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-colors disabled:opacity-50"
            title="Refresh"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
          </button>
        </div>
      </div>

      {/* Output */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-auto bg-[#0d0d0d]"
      >
        {loading && !output ? (
          <div className="flex items-center justify-center h-full text-zinc-600 text-sm">
            Loading transcript...
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-full text-red-400 text-sm">
            {error}
          </div>
        ) : (
          <table className="w-full">
            <tbody>
              {outputLines.map((line, i) => {
                const isMatch = searchQuery && (() => {
                  try { return new RegExp(searchQuery, "i").test(line); } catch { return false; }
                })();
                return (
                  <tr
                    key={i}
                    className={cn(
                      "hover:bg-zinc-900/50",
                      isMatch && "bg-amber-500/5"
                    )}
                  >
                    {showLineNumbers && (
                      <td className="select-none text-right pr-3 pl-3 py-0 text-[11px] text-zinc-700 font-mono w-12 align-top">
                        {i + 1}
                      </td>
                    )}
                    <td className="py-0 pr-4 text-[12px] leading-[1.5] font-mono text-emerald-300/80 whitespace-pre-wrap break-words">
                      {highlightLine(line)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Jump to bottom */}
      {!autoScroll && (
        <button
          onClick={() => {
            setAutoScroll(true);
            if (scrollRef.current) {
              scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
            }
          }}
          className="absolute bottom-4 right-8 flex items-center gap-1.5 rounded-full bg-zinc-800 border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300 hover:bg-zinc-700 transition-colors shadow-lg"
        >
          <ArrowDown className="h-3 w-3" />
          Jump to latest
        </button>
      )}
    </div>
  );
}
