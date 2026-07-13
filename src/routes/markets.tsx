import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Menu } from "lucide-react";
import { Sidebar } from "@/components/Sidebar";
import { CryptoTicker } from "@/components/CryptoTicker";

export const Route = createFileRoute("/markets")({
  head: () => ({
    meta: [{ title: "Markets — Alpha Trader Group" }, { name: "description", content: "Live crypto markets on Alpha Trader Group." }],
  }),
  component: Markets,
});

const rows = [
  { name: "Bitcoin", sym: "BTC", price: 67240.12, change: 1.24 },
  { name: "Ethereum", sym: "ETH", price: 3512.88, change: -0.86 },
  { name: "Solana", sym: "SOL", price: 184.05, change: 3.12 },
  { name: "BNB", sym: "BNB", price: 612.44, change: 0.42 },
  { name: "XRP", sym: "XRP", price: 0.542, change: -1.1 },
  { name: "Cardano", sym: "ADA", price: 0.412, change: 2.05 },
  { name: "Dogecoin", sym: "DOGE", price: 0.148, change: -2.44 },
  { name: "Avalanche", sym: "AVAX", price: 36.21, change: 1.88 },
];

function Markets() {
  const [open, setOpen] = useState(false);
  return (
    <div className="min-h-screen bg-zinc-950">
      <Sidebar open={open} onClose={() => setOpen(false)} />
      <header className="sticky top-0 z-30 border-b border-border bg-zinc-950/90 backdrop-blur">
        <div className="flex items-center gap-3 px-4 py-3">
          <button onClick={() => setOpen(true)} className="rounded-md p-2 hover:bg-accent"><Menu className="h-5 w-5" /></button>
          <h1 className="font-display text-lg font-semibold">Markets</h1>
        </div>
        <CryptoTicker />
      </header>
      <main className="mx-auto max-w-4xl px-4 py-6">
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          {rows.map((r, i) => (
            <div key={r.sym} className={`flex items-center justify-between px-4 py-4 ${i > 0 ? "border-t border-border" : ""}`}>
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-full bg-zinc-800 text-xs font-semibold">{r.sym}</div>
                <div>
                  <p className="font-medium">{r.name}</p>
                  <p className="text-xs text-muted-foreground">{r.sym}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-semibold">${r.price.toLocaleString()}</p>
                <p className={`text-xs ${r.change >= 0 ? "text-emerald-500" : "text-red-500"}`}>
                  {r.change >= 0 ? "▲" : "▼"} {Math.abs(r.change).toFixed(2)}%
                </p>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
