import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Menu, ShieldCheck, Zap, TrendingUp, Trophy, Lock, CheckCircle2 } from "lucide-react";
import { Sidebar } from "@/components/Sidebar";
import { supabase } from "@/integrations/supabase/client";
import { BOT_PASSKEY, activateBot, isBotActive } from "@/lib/bot-session";

export const Route = createFileRoute("/bot")({
  head: () => ({
    meta: [
      { title: "AI Trading Bot — Alpha Trader Group" },
      { name: "description", content: "Activate your Alpha Trader Group AI trading bot session." },
    ],
  }),
  component: BotPage,
});

function BotPage() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [passkey, setPasskey] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [active, setActive] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) { navigate({ to: "/login", replace: true }); return; }
      setActive(isBotActive());
      setReady(true);
    });
  }, [navigate]);

  if (!ready) return null;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (passkey.trim().toUpperCase() === BOT_PASSKEY) {
      activateBot();
      setActive(true);
      setError(null);
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
              Available
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

        {active ? (
          <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-5">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-6 w-6 text-emerald-500" />
              <div>
                <p className="font-semibold text-emerald-400">Bot Session Active</p>
                <p className="text-xs text-muted-foreground">You may now proceed to withdraw.</p>
              </div>
            </div>
            <Link to="/dashboard" className="mt-4 inline-flex w-full items-center justify-center rounded-lg bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-black hover:bg-emerald-400">
              Back to Dashboard
            </Link>
          </div>
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
