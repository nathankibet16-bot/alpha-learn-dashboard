import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Menu, Bell, ArrowDownToLine, ArrowUpFromLine, LineChart } from "lucide-react";
import type { User } from "@supabase/supabase-js";
import { CryptoTicker } from "@/components/CryptoTicker";
import { TradingViewChart } from "@/components/TradingViewChart";
import { Sidebar } from "@/components/Sidebar";
import { supabase } from "@/integrations/supabase/client";
import { getBalance, BALANCE_EVENT, syncBalanceFromServer } from "@/lib/auth";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — Alpha Trader Group" },
      { name: "description", content: "Track your Alpha Trader Group balance, deposits, withdrawals, and live crypto markets." },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [balance, setBal] = useState(0);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const u = data.user;
      if (!u) { navigate({ to: "/login", replace: true }); return; }
      if (!u.email_confirmed_at) { navigate({ to: "/verify", replace: true }); return; }
      setUser(u);
      setBal(getBalance(u.id));
      syncBalanceFromServer(u.id).then((v) => { if (v !== null) setBal(v); });
    });
  }, [navigate]);

  // Poll server balance periodically so admin-approved deposits/withdrawals appear.
  useEffect(() => {
    if (!user) return;
    const t = setInterval(() => { void syncBalanceFromServer(user.id); }, 15000);
    return () => clearInterval(t);
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.userId === user.id) setBal(detail.value);
    };
    window.addEventListener(BALANCE_EVENT, handler);
    const onStorage = (e: StorageEvent) => {
      if (e.key === `alphatrader_balance_${user.id}` && e.newValue) setBal(Number(e.newValue));
    };
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(BALANCE_EVENT, handler);
      window.removeEventListener("storage", onStorage);
    };
  }, [user]);

  if (!user) return null;

  const name = (user.user_metadata?.full_name as string) || user.email?.split("@")[0] || "Trader";

  const deposit = () => navigate({ to: "/deposit" });
  const withdraw = () => navigate({ to: "/withdraw" });

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
            Good day, <span className="text-emerald-500">{name}</span>
          </p>

          <div className="mt-3 overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-zinc-900 to-zinc-950 p-6 shadow-2xl">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs uppercase tracking-widest text-muted-foreground">Current Balance</p>
                <p className="mt-2 font-display text-4xl font-bold sm:text-5xl">
                  ${balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">USD · Alpha Trader Group account</p>
              </div>
              <span className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-1 text-xs text-emerald-500">
                ● Active
              </span>
            </div>

            <div className="mt-6 grid grid-cols-3 gap-2 sm:gap-3">
              <QuickAction icon={<ArrowDownToLine className="h-5 w-5" />} label="Deposit" onClick={deposit} variant="primary" />
              <QuickAction icon={<ArrowUpFromLine className="h-5 w-5" />} label="Withdraw" onClick={withdraw} />
              <QuickAction icon={<LineChart className="h-5 w-5" />} label="Trade" onClick={() => document.getElementById("charts")?.scrollIntoView({ behavior: "smooth" })} />
            </div>
          </div>
        </section>

        <section id="charts" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl font-semibold">Market Charts</h2>
            <span className="text-xs text-muted-foreground">Powered by TradingView</span>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <TradingViewChart symbol="BINANCE:BTCUSDT" title="Bitcoin · BTC/USDT" />
            <TradingViewChart symbol="BINANCE:ETHUSDT" title="Ethereum · ETH/USDT" />
            <div className="lg:col-span-2">
              <TradingViewChart symbol="BINANCE:SOLUSDT" title="Solana · SOL/USDT" />
            </div>
          </div>
        </section>
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
