import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Menu } from "lucide-react";
import { Sidebar } from "@/components/Sidebar";

export const Route = createFileRoute("/logs")({
  head: () => ({
    meta: [{ title: "Analysis Logs — AlphaGroup" }, { name: "description", content: "Educational analysis logs and simulated activity." }],
  }),
  component: Logs,
});

const logs = [
  { t: "2 min ago", msg: "Simulated BTC entry recorded at $67,120", type: "info" },
  { t: "18 min ago", msg: "ETH paper position closed with +2.4% simulated gain", type: "up" },
  { t: "1 hr ago", msg: "SOL demo trade closed with -1.1% simulated loss", type: "down" },
  { t: "3 hr ago", msg: "Weekly education recap: volatility patterns explained", type: "info" },
  { t: "Yesterday", msg: "Paper portfolio rebalanced across 4 assets", type: "info" },
];

function Logs() {
  const [open, setOpen] = useState(false);
  return (
    <div className="min-h-screen bg-zinc-950">
      <Sidebar open={open} onClose={() => setOpen(false)} />
      <header className="sticky top-0 z-30 border-b border-border bg-zinc-950/90 backdrop-blur">
        <div className="flex items-center gap-3 px-4 py-3">
          <button onClick={() => setOpen(true)} className="rounded-md p-2 hover:bg-accent"><Menu className="h-5 w-5" /></button>
          <h1 className="font-display text-lg font-semibold">Analysis Logs</h1>
        </div>
      </header>
      <main className="mx-auto max-w-3xl space-y-3 px-4 py-6">
        {logs.map((l, i) => (
          <div key={i} className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm">{l.msg}</p>
              <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] ${
                l.type === "up" ? "bg-emerald-500/10 text-emerald-500" :
                l.type === "down" ? "bg-red-500/10 text-red-500" :
                "bg-zinc-800 text-muted-foreground"
              }`}>{l.type}</span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{l.t}</p>
          </div>
        ))}
      </main>
    </div>
  );
}
