import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Menu, Bell, ArrowDownToLine, ArrowUpFromLine, BarChart3 } from "lucide-react";
import { CryptoTicker } from "@/components/CryptoTicker";
import { TradingViewChart } from "@/components/TradingViewChart";
import { Sidebar } from "@/components/Sidebar";
import { getUser, setUser, type DemoUser } from "@/lib/auth";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — AlphaGroup Simulation" },
      { name: "description", content: "Track your simulated crypto positions, demo balance, and educational market activity on AlphaGroup." },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [user, setLocalUser] = useState<DemoUser | null>(null);

  useEffect(() => {
    const u = getUser();
    if (!u) navigate({ to: "/login" });
    else setLocalUser(u);
  }, [navigate]);

  const topUp = () => {
    if (!user) return;
    const next = { ...user, balance: user.balance + 5000 };
    setUser(next);
    setLocalUser(next);
  };
  const withdraw = () => {
    if (!user) return;
    const next = { ...user, balance: Math.max(0, user.balance - 1000) };
    setUser(next);
    setLocalUser(next);
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-zinc-950 text-foreground">
      <Sidebar open={open} onClose={() => setOpen(false)} />

      <header className="sticky top-0 z-30 border-b border-border bg-zinc-950/90 backdrop-blur">
        <div className="flex items-center justify-between px-4 py-3">
          <button onClick={() => setOpen(true)} className="rounded-md p-2 hover:bg-accent">
            <Menu className="h-5 w-5" />
          </button>
          <h1 className="font-display text-lg font-semibold">Dashboard</h1>
          <button className="relative rounded-md p-2 hover:bg-accent">
            <Bell className="h-5 w-5" />
            <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-emerald-500" />
          </button>
        </div>
        <CryptoTicker />
      </header>

      <main className="mx-auto max-w-6xl space-y-6 px-4 py-6">
        <section>
          <p className="text-sm text-muted-foreground">
            Good day, <span className="text-emerald-500">{user.name}</span>
          </p>

          <div className="mt-3 overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-zinc-900 to-zinc-950 p-6 shadow-2xl">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs uppercase tracking-widest text-muted-foreground">Current Demo Balance</p>
                <p className="mt-2 font-display text-4xl font-bold sm:text-5xl">
                  ${user.balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">Simulated USD · educational use only</p>
              </div>
              <span className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-1 text-xs text-emerald-500">
                ● Live Sim
              </span>
            </div>

            <div className="mt-6 grid grid-cols-3 gap-2 sm:gap-3">
              <QuickAction icon={<ArrowDownToLine className="h-5 w-5" />} label="Top Up Demo" onClick={topUp} variant="primary" />
              <QuickAction icon={<ArrowUpFromLine className="h-5 w-5" />} label="Withdraw Simulation" onClick={withdraw} />
              <QuickAction icon={<BarChart3 className="h-5 w-5" />} label="Live Charts" onClick={() => document.getElementById("charts")?.scrollIntoView({ behavior: "smooth" })} />
            </div>
          </div>
        </section>

        <section id="charts" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl font-semibold">Market Charts</h2>
            <span className="text-xs text-muted-foreground">Powered by TradingView · educational feed</span>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <TradingViewChart symbol="BINANCE:BTCUSDT" title="Bitcoin · BTC/USDT" />
            <TradingViewChart symbol="BINANCE:ETHUSDT" title="Ethereum · ETH/USDT" />
            <div className="lg:col-span-2">
              <TradingViewChart symbol="BINANCE:SOLUSDT" title="Solana · SOL/USDT" />
            </div>
          </div>
        </section>

        <footer className="pb-8 pt-4 text-center text-xs text-muted-foreground">
          AlphaGroup is a paper-trading learning tool. All balances, charts, and activity shown are for
          educational simulation only and do not constitute financial advice.
        </footer>
      </main>
    </div>
  );
}

function QuickAction({
  icon,
  label,
  onClick,
  variant,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  variant?: "primary";
}) {
  const base =
    "flex flex-col items-center justify-center gap-1.5 rounded-xl border px-2 py-4 text-xs font-medium transition-colors";
  const cls =
    variant === "primary"
      ? "border-emerald-500 bg-emerald-500 text-black hover:bg-emerald-400"
      : "border-border bg-zinc-900 text-foreground hover:bg-zinc-800";
  return (
    <button onClick={onClick} className={`${base} ${cls}`}>
      {icon}
      <span className="text-center leading-tight">{label}</span>
    </button>
  );
}
