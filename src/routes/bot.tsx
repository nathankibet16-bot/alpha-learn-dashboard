import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Menu, ShieldCheck, Zap, TrendingUp, Trophy, Lock, LockOpen, Activity, CheckCircle2 } from "lucide-react";
import type { User } from "@supabase/supabase-js";
import { toast } from "sonner";
import { Sidebar } from "@/components/Sidebar";
import { supabase } from "@/integrations/supabase/client";
import { activateBot, isBotActive, isValidPasskey, incrementTradeCount } from "@/lib/bot-session";
import { adjustBalance, getBalance, BALANCE_EVENT } from "@/lib/auth";

export const Route = createFileRoute("/bot")({
  head: () => ({
    meta: [
      { title: "AI Trading Bot — Alpha Trader Group" },
      { name: "description", content: "Activate your Alpha Trader Group AI trading bot session." },
    ],
  }),
  component: BotPage,
});

const LOG_MESSAGES = [
  "Analyzing BTC/USDT indicators...",
  "Scanning ETH/USDT order book depth...",
  "Detected bullish divergence on SOL/USDT 5m",
  "Order placed at market — BTC/USDT long",
  "Trailing stop adjusted +0.8%",
  "RSI cooling on BNB/USDT — waiting entry",
  "Volume spike detected on XRP/USDT",
  "Position size recalculated: risk 1.2%",
  "Closing partial position on ETH/USDT",
  "Order filled — TP1 reached",
  "MACD crossover confirmed on BTC/USDT",
  "Liquidity sweep on SOL/USDT — reversing",
];

type LogEntry = { id: number; time: string; text: string };

function BotPage() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [passkey, setPasskey] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [active, setActive] = useState(false);
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [balance, setBal] = useState(0);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const logIdRef = useRef(0);
  const logEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) { navigate({ to: "/login", replace: true }); return; }
      setUser(data.user);
      setBal(getBalance(data.user.id));
      setActive(isBotActive());
      setReady(true);
    });
  }, [navigate]);

  useEffect(() => {
    if (!user) return;
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.userId === user.id) setBal(detail.value);
    };
    window.addEventListener(BALANCE_EVENT, handler);
    return () => window.removeEventListener(BALANCE_EVENT, handler);
  }, [user]);

  const pushLog = (text: string) => {
    logIdRef.current += 1;
    const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    setLogs((prev) => [...prev.slice(-40), { id: logIdRef.current, time, text }]);
  };

  useEffect(() => {
    if (!active || !user) return;
    pushLog("Bot session initialized — connecting to execution engine");
    pushLog("Streaming live market data...");
    const logTimer = setInterval(() => {
      pushLog(LOG_MESSAGES[Math.floor(Math.random() * LOG_MESSAGES.length)]);
    }, 15000);

    const tradeTimer = setInterval(() => {
      const win = Math.random() < 0.88;
      if (win) {
        const profit = Number((10 + Math.random() * 12).toFixed(2));
        adjustBalance(user.id, profit);
        pushLog(`Trade Successful — position closed +$${profit.toFixed(2)}`);
        toast.success(`Trade Successful: +$${profit.toFixed(2)}`);
      } else {
        const loss = Number((1 + Math.random() * 3).toFixed(2));
        adjustBalance(user.id, -loss);
        pushLog(`Trade Closed at loss — -$${loss.toFixed(2)}`);
        toast(`Trade Closed: -$${loss.toFixed(2)}`);
      }
    }, 45000);

    return () => {
      clearInterval(logTimer);
      clearInterval(tradeTimer);
    };
  }, [active, user]);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  if (!ready) return null;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (passkey.trim().toUpperCase() === BOT_PASSKEY) {
      activateBot();
      setActive(true);
      setError(null);
      toast.success("Bot activated — live trading session started");
    } else {
      setError("Invalid passkey. Please check and try again.");
    }
  };

  return (
    <div className="min-h-screen bg-[#09090b] text-foreground">
      <Sidebar open={open} onClose={() => setOpen(false)} />
      <header className="sticky top-0 z-30 border-b border-border bg-[#09090b]/90 backdrop-blur">
        <div className="flex items-center justify-between px-4 py-3">
          <button onClick={() => setOpen(true)} className="rounded-md p-2 hover:bg-accent">
            <Menu className="h-5 w-5" />
          </button>
          <h1 className="font-display text-lg font-semibold">Bot Activation</h1>
          <span className="w-9" />
        </div>
      </header>

      <main className="mx-auto max-w-2xl space-y-6 px-4 py-6">
        <div className="rounded-2xl border border-border bg-black p-5 shadow-xl">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                <div className="grid h-10 w-10 place-items-center rounded-lg bg-emerald-500/15 text-emerald-500">
                  <Zap className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-display text-lg font-semibold">TradeMatrix AI Pro Bot</p>
                  <p className="text-xs text-muted-foreground">Automated market execution</p>
                </div>
              </div>
            </div>
            <span className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-1 text-xs text-emerald-500">
              {active ? "Running" : "Available"}
            </span>
          </div>

          <div className="mt-4 flex flex-wrap gap-2 text-xs">
            <span className="rounded-full bg-zinc-900 px-2.5 py-1 text-zinc-300 border border-border">Scalping</span>
            <span className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-1 text-emerald-500">Risk: Low</span>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <Stat icon={<TrendingUp className="h-4 w-4" />} label="Performance" value="99%" />
            <Stat icon={<Trophy className="h-4 w-4" />} label="Win Rate" value="88%" />
          </div>
        </div>

        {active && user ? (
          <>
            <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-5">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="relative flex h-3 w-3">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-500" />
                  </span>
                  <p className="font-semibold text-emerald-400 animate-pulse">
                    Status: Live Trading Session Active
                  </p>
                </div>
                <span className="text-xs text-muted-foreground hidden sm:block">88% win rate</span>
              </div>
              <div className="mt-4 rounded-lg border border-emerald-500/30 bg-black/40 p-3">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Current Balance</p>
                <p className="mt-1 font-display text-2xl font-bold text-emerald-400">
                  ${balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-black p-5">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-emerald-500" />
                <p className="text-sm font-medium">Bot Execution Log</p>
              </div>
              <div className="mt-3 h-64 overflow-y-auto rounded-lg border border-border bg-zinc-950 p-3 font-mono text-xs">
                {logs.length === 0 ? (
                  <p className="text-muted-foreground">Awaiting first signal...</p>
                ) : (
                  logs.map((l) => (
                    <div key={l.id} className="flex gap-2 py-0.5">
                      <span className="text-muted-foreground">[{l.time}]</span>
                      <span className="text-emerald-300">{l.text}</span>
                    </div>
                  ))
                )}
                <div ref={logEndRef} />
              </div>
            </div>
          </>
        ) : (
          <form onSubmit={submit} className="rounded-2xl border border-border bg-black p-5 space-y-4">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-emerald-500" />
              <p className="text-sm font-medium">Enter Bot Passkey</p>
            </div>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="password"
                value={passkey}
                onChange={(e) => setPasskey(e.target.value)}
                placeholder="Bot Passkey"
                className="w-full rounded-lg border border-border bg-zinc-950 pl-10 pr-3 py-2.5 text-sm outline-none focus:border-emerald-500"
                required
              />
            </div>
            {error && <p className="text-xs text-red-500">{error}</p>}
            <button type="submit" className="w-full rounded-lg bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-black hover:bg-emerald-400">
              Verify and Continue
            </button>
            <p className="text-[11px] text-muted-foreground text-center">
              Passkey issued by your account manager.
            </p>
          </form>
        )}
      </main>
    </div>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-zinc-950 p-3">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        {icon} {label}
      </div>
      <p className="mt-1 font-display text-xl font-semibold text-emerald-500">{value}</p>
    </div>
  );
}
