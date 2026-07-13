import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Menu, AlertTriangle, Bot, Lock } from "lucide-react";
import type { User } from "@supabase/supabase-js";
import { Sidebar } from "@/components/Sidebar";
import { supabase } from "@/integrations/supabase/client";
import { getTradeCount, TRADE_COUNT_EVENT } from "@/lib/bot-session";

export const Route = createFileRoute("/withdraw")({
  head: () => ({
    meta: [
      { title: "Withdraw — Alpha Trader Group" },
      { name: "description", content: "Withdraw funds from your Alpha Trader Group account." },
    ],
  }),
  component: WithdrawPage,
});

const COINS = ["USDT (TRC20)", "USDT (ERC20)", "Bitcoin (BTC)", "Ethereum (ERC20)", "Solana (SOL)", "BNB (BEP20)", "Ripple (XRP)", "Litecoin (LTC)"];

function WithdrawPage() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [active, setActive] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) { navigate({ to: "/login", replace: true }); return; }
      setUser(data.user);
      setActive(isBotActive());
    });
  }, [navigate]);

  if (!user) return null;
  const locked = !active;

  return (
    <div className="min-h-screen bg-[#09090b] text-foreground">
      <Sidebar open={open} onClose={() => setOpen(false)} />
      <header className="sticky top-0 z-30 border-b border-border bg-[#09090b]/90 backdrop-blur">
        <div className="flex items-center justify-between px-4 py-3">
          <button onClick={() => setOpen(true)} className="rounded-md p-2 hover:bg-accent">
            <Menu className="h-5 w-5" />
          </button>
          <h1 className="font-display text-lg font-semibold">Withdraw</h1>
          <span className="w-9" />
        </div>
      </header>

      <main className="mx-auto max-w-2xl space-y-6 px-4 py-6">
        {locked && (
          <div className="rounded-2xl border border-yellow-500/40 bg-yellow-500/10 p-5">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-6 w-6 shrink-0 text-yellow-400" />
              <div>
                <p className="font-semibold text-yellow-300">Trading Activity Required</p>
                <p className="mt-1 text-sm text-yellow-100/80">
                  You must complete at least one AI Trading Bot session before you can make a
                  withdrawal. Activate the bot, run a session, and come back to withdraw.
                </p>
                <Link
                  to="/bot"
                  className="mt-4 inline-flex items-center gap-2 rounded-lg bg-yellow-400 px-3.5 py-2 text-sm font-semibold text-black hover:bg-yellow-300"
                >
                  <Bot className="h-4 w-4" />
                  Go to AI Trading Bot
                </Link>
              </div>
            </div>
          </div>
        )}

        <fieldset disabled={locked} className={`space-y-4 rounded-2xl border border-border bg-black p-5 ${locked ? "opacity-60" : ""}`}>
          <Field label="Coin">
            <select className="w-full rounded-lg border border-border bg-zinc-950 px-3 py-2.5 text-sm outline-none focus:border-emerald-500">
              {COINS.map((c) => <option key={c}>{c}</option>)}
            </select>
          </Field>
          <Field label="Network">
            <input placeholder="Auto-detected from coin" className="w-full rounded-lg border border-border bg-zinc-950 px-3 py-2.5 text-sm outline-none focus:border-emerald-500" />
          </Field>
          <Field label="Amount (USD)">
            <input type="number" placeholder="0.00" className="w-full rounded-lg border border-border bg-zinc-950 px-3 py-2.5 text-sm outline-none focus:border-emerald-500" />
          </Field>
          <Field label="Wallet Address">
            <input placeholder="Destination address" className="w-full rounded-lg border border-border bg-zinc-950 px-3 py-2.5 text-sm outline-none focus:border-emerald-500" />
          </Field>
          <button
            type="button"
            disabled={locked}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-black hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-zinc-800 disabled:text-muted-foreground"
          >
            {locked && <Lock className="h-4 w-4" />}
            {locked ? "Locked — Activate Bot First" : "Submit Withdrawal"}
          </button>
        </fieldset>
      </main>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs uppercase tracking-wide text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}
