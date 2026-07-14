import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Menu, ShieldCheck, Zap, TrendingUp, Trophy, Lock, LockOpen, Activity, CheckCircle2, Play, Square } from "lucide-react";
import type { User } from "@supabase/supabase-js";
import { toast } from "sonner";
import { Sidebar } from "@/components/Sidebar";
import { TradingViewChart } from "@/components/TradingViewChart";
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

const ASSETS = [
  { symbol: "BTC/USDT", base: 67420 },
  { symbol: "ETH/USDT", base: 3540 },
  { symbol: "SOL/USDT", base: 168 },
  { symbol: "BNB/USDT", base: 612 },
  { symbol: "XRP/USDT", base: 0.62 },
];

type LogEntry = { id: number; time: string; text: string };
type Trade = {
  id: number;
  asset: string;
  action: "BUY" | "SELL";
  entry: number;
  price: number;
  profit: number;
};

function BotPage() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [passkey, setPasskey] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [activated, setActivated] = useState(false);
  const [running, setRunning] = useState(false);
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [balance, setBal] = useState(0);
  const [sessionPnL, setSessionPnL] = useState(0);
  const [amountInput, setAmountInput] = useState("");
  const [tradeAmount, setTradeAmount] = useState<number | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [verifying, setVerifying] = useState(false);
  const [shakeKey, setShakeKey] = useState(0);
  const logIdRef = useRef(0);
  const tradeIdRef = useRef(0);
  const logEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) { navigate({ to: "/login", replace: true }); return; }
      setUser(data.user);
      setBal(getBalance(data.user.id));
      setActivated(isBotActive());
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
    if (!running || !user) return;
    pushLog("Session started — connecting to execution engine");
    pushLog("Streaming live market data...");

    const logTimer = setInterval(() => {
      pushLog(LOG_MESSAGES[Math.floor(Math.random() * LOG_MESSAGES.length)]);
    }, 15000);

    const tradeTimer = setInterval(() => {
      const asset = ASSETS[Math.floor(Math.random() * ASSETS.length)];
      const drift = (Math.random() - 0.5) * 0.008;
      const entry = Number((asset.base * (1 + drift)).toFixed(asset.base < 10 ? 4 : 2));
      const win = Math.random() < 0.88;
      const action: "BUY" | "SELL" = Math.random() < 0.5 ? "BUY" : "SELL";
      const stake = tradeAmount ?? 100;
      let profit: number;
      let price: number;
      if (win) {
        const pct = 0.005 + Math.random() * 0.01; // 0.5% – 1.5%
        profit = Number((stake * pct).toFixed(2));
        const moveDir = action === "BUY" ? 1 : -1;
        price = Number((entry * (1 + moveDir * 0.0035)).toFixed(asset.base < 10 ? 4 : 2));
        pushLog(`Trade Successful — ${asset.symbol} +$${profit.toFixed(2)}`);
        toast.success(`Trade Successful: +$${profit.toFixed(2)}`);
      } else {
        const pct = 0.001 + Math.random() * 0.003; // 0.1% – 0.4%
        profit = -Number((stake * pct).toFixed(2));
        const moveDir = action === "BUY" ? -1 : 1;
        price = Number((entry * (1 + moveDir * 0.0015)).toFixed(asset.base < 10 ? 4 : 2));
        pushLog(`Trade Closed at loss — ${asset.symbol} $${profit.toFixed(2)}`);
        toast(`Trade Closed: $${profit.toFixed(2)}`);
      }
      tradeIdRef.current += 1;
      setTrades((prev) => [
        { id: tradeIdRef.current, asset: asset.symbol, action, entry, price, profit },
        ...prev,
      ].slice(0, 30));
      setSessionPnL((p) => Number((p + profit).toFixed(2)));
      incrementTradeCount(user.id);
      void supabase.rpc("increment_my_trade_count");
    }, 30000);

    return () => {
      clearInterval(logTimer);
      clearInterval(tradeTimer);
    };
  }, [running, user]);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  if (!ready) return null;

  const firstName =
    ((user?.user_metadata?.full_name as string) || user?.email?.split("@")[0] || "")
      .trim()
      .split(/\s+/)[0] || null;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isValidPasskey(passkey, firstName)) {
      setError(null);
      setVerifying(true);
      setTimeout(() => {
        activateBot();
        setActivated(true);
        setVerifying(false);
        toast.success("Bot activated — press Start to begin");
      }, 900);
    } else {
      setError("Invalid Bot Passkey. Please contact support or enter a valid activation code.");
      setShakeKey((k) => k + 1);
    }
  };

  const handleStart = () => {
    setRunning(true);
    toast.success("Session started");
  };

  const handleStop = () => {
    if (!user) return;
    setRunning(false);
    if (sessionPnL !== 0) {
      adjustBalance(user.id, sessionPnL);
      const sign = sessionPnL >= 0 ? "+" : "";
      toast.success(`Session ended — ${sign}$${sessionPnL.toFixed(2)} applied to balance`);
    } else {
      toast("Session ended");
    }
    pushLog(`Session stopped — net ${sessionPnL >= 0 ? "+" : ""}$${sessionPnL.toFixed(2)} applied`);
    setSessionPnL(0);
    setTrades([]);
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

      <main className="mx-auto max-w-4xl space-y-6 px-4 py-6">
        <div className="rounded-2xl border border-border bg-black p-5 shadow-xl">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <div className="grid h-10 w-10 place-items-center rounded-lg bg-emerald-500/15 text-emerald-500">
                <Zap className="h-5 w-5" />
              </div>
              <div>
                <p className="font-display text-lg font-semibold">TradeMatrix AI Pro Bot</p>
                <p className="text-xs text-muted-foreground">Automated market execution</p>
              </div>
            </div>
            <span className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-1 text-xs text-emerald-500">
              {running ? "Running" : activated ? "Ready" : "Available"}
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

        {activated && user ? (
          <>
            <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-5">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="relative flex h-3 w-3">
                    {running && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />}
                    <span className={`relative inline-flex h-3 w-3 rounded-full ${running ? "bg-emerald-500" : "bg-zinc-600"}`} />
                  </span>
                  <p className={`font-semibold ${running ? "text-emerald-400 animate-pulse" : "text-zinc-400"}`}>
                    {running ? "Status: Live Trading Session Active" : "Status: Idle — Press Start"}
                  </p>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-lg border border-emerald-500/30 bg-black/40 p-3">
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Current Balance</p>
                  <p className="mt-1 font-display text-2xl font-bold text-emerald-400">
                    ${balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="rounded-lg border border-border bg-black/40 p-3">
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Session P/L</p>
                  <p className={`mt-1 font-display text-2xl font-bold ${sessionPnL >= 0 ? "text-emerald-400" : "text-red-500"}`}>
                    {sessionPnL >= 0 ? "+" : ""}${sessionPnL.toFixed(2)}
                  </p>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <button
                  onClick={handleStart}
                  disabled={running}
                  className="flex items-center justify-center gap-2 rounded-lg bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-black hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Play className="h-4 w-4" /> Start
                </button>
                <button
                  onClick={handleStop}
                  disabled={!running}
                  className="flex items-center justify-center gap-2 rounded-lg bg-red-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-400 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Square className="h-4 w-4" /> Stop
                </button>
              </div>
            </div>

            <TradingViewChart symbol="BINANCE:BTCUSDT" title="Bitcoin · BTC/USDT" />

            <div className="rounded-2xl border border-border bg-black p-5">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-emerald-500" />
                <p className="text-sm font-medium">Open & Closed Trades</p>
              </div>
              <div className="mt-3 overflow-x-auto rounded-lg border border-border">
                <table className="w-full text-xs">
                  <thead className="bg-zinc-950 text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium">Asset</th>
                      <th className="px-3 py-2 text-left font-medium">Action</th>
                      <th className="px-3 py-2 text-right font-medium">Entry Price</th>
                      <th className="px-3 py-2 text-right font-medium">Price</th>
                      <th className="px-3 py-2 text-right font-medium">Profit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {trades.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-3 py-6 text-center text-muted-foreground">
                          No trades yet — press Start to begin.
                        </td>
                      </tr>
                    ) : (
                      trades.map((t) => (
                        <tr key={t.id} className="border-t border-border">
                          <td className="px-3 py-2 font-medium">{t.asset}</td>
                          <td className="px-3 py-2">
                            <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${t.action === "BUY" ? "bg-emerald-500/15 text-emerald-400" : "bg-red-500/15 text-red-400"}`}>
                              {t.action}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-right font-mono">{t.entry}</td>
                          <td className="px-3 py-2 text-right font-mono">{t.price}</td>
                          <td className={`px-3 py-2 text-right font-mono ${t.profit >= 0 ? "text-emerald-400" : "text-red-500"}`}>
                            {t.profit >= 0 ? "+" : ""}${t.profit.toFixed(2)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-black p-5">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-emerald-500" />
                <p className="text-sm font-medium">Bot Execution Log</p>
              </div>
              <div className="mt-3 h-56 overflow-y-auto rounded-lg border border-border bg-zinc-950 p-3 font-mono text-xs">
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
            <div key={shakeKey} className={`relative ${error ? "animate-shake" : ""}`}>
              {verifying ? (
                <LockOpen className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-500 animate-success-pop" />
              ) : (
                <Lock className={`pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 ${error ? "text-red-500" : "text-muted-foreground"}`} />
              )}
              <input
                type="password"
                value={passkey}
                onChange={(e) => { setPasskey(e.target.value); if (error) setError(null); }}
                placeholder="Bot Passkey"
                disabled={verifying}
                className={`w-full rounded-lg border bg-zinc-950 pl-10 pr-3 py-2.5 text-sm outline-none transition-colors disabled:opacity-70 ${
                  verifying ? "border-emerald-500" : error ? "border-red-500 focus:border-red-500" : "border-border focus:border-emerald-500"
                }`}
                required
              />
              {verifying && (
                <CheckCircle2 className="pointer-events-none absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-emerald-500 animate-success-pop" />
              )}
            </div>
            {error && <p className="text-xs text-red-500">{error}</p>}
            {verifying && <p className="text-xs text-emerald-400">Passkey verified — activating bot...</p>}
            <button
              type="submit"
              disabled={verifying}
              className="w-full rounded-lg bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-black hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {verifying ? "Verifying..." : "Verify and Continue"}
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
