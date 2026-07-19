import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Menu, AlertTriangle, Bot, Lock, CheckCircle2 } from "lucide-react";
import type { User } from "@supabase/supabase-js";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { Sidebar } from "@/components/Sidebar";
import { supabase } from "@/integrations/supabase/client";
import { getTradeCount, TRADE_COUNT_EVENT } from "@/lib/bot-session";
import { sendNotificationEmail } from "@/lib/notifications.functions";
import { adjustBalance } from "@/lib/auth";

export const Route = createFileRoute("/withdraw")({
  head: () => ({
    meta: [
      { title: "Withdraw — Alpha Trader Group" },
      { name: "description", content: "Withdraw funds from your Alpha Trader Group account." },
    ],
  }),
  component: WithdrawPage,
});

const COINS = [
  "USDT (BEP20)",
  "USDT (TRC20)",
  "USDT (Solana)",
  "Bitcoin (BTC)",
  "Ethereum (ERC20)",
  "BNB (BEP20)",
];

function WithdrawPage() {
  const navigate = useNavigate();
  const sendEmail = useServerFn(sendNotificationEmail);
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [tradeCount, setTradeCount] = useState(0);
  const [coin, setCoin] = useState(COINS[0]);
  const [network, setNetwork] = useState("");
  const [amount, setAmount] = useState("");
  const [address, setAddress] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) { navigate({ to: "/login", replace: true }); return; }
      setUser(data.user);
      setTradeCount(getTradeCount(data.user.id));
    });
  }, [navigate]);

  useEffect(() => {
    if (!user) return;
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.userId === user.id) setTradeCount(detail.value);
    };
    window.addEventListener(TRADE_COUNT_EVENT, handler);
    return () => window.removeEventListener(TRADE_COUNT_EVENT, handler);
  }, [user]);

  if (!user) return null;
  const locked = tradeCount < 1;

  const submit = async () => {
    const amt = Number(amount);
    if (!amt || amt <= 0) { toast.error("Enter a valid amount"); return; }
    if (!address.trim()) { toast.error("Enter a wallet address"); return; }
    setSubmitting(true);
    const networkLabel = network.trim() ? `${coin} · ${network.trim()}` : coin;
    const walletAddress = address.trim();
    const { data: inserted, error } = await supabase.from("withdrawals").insert({
      user_id: user.id,
      user_email: user.email ?? null,
      amount: amt,
      network: networkLabel,
      wallet_address: walletAddress,
    }).select("id").single();
    setSubmitting(false);
    if (error) { toast.error(error.message); return; }
    setSubmitted(true);
    adjustBalance(user.id, -amt);
    toast.success("Withdrawal processed successfully");
    if (inserted?.id) {
      const name = (user.user_metadata?.full_name as string | undefined)?.split(" ")[0]
        ?? user.email?.split("@")[0];
      sendEmail({ data: {
        template: "withdrawal-completed",
        data: { name, amount: amt.toFixed(2), network: networkLabel, wallet: walletAddress },
        idempotencyKey: `withdrawal-completed-${inserted.id}`,
      } }).catch(() => { /* non-blocking */ });
    }
    setAmount(""); setAddress(""); setNetwork("");
  };

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
        <div className="grid grid-cols-2 rounded-xl border border-border bg-black p-1 text-sm">
          <span className="flex items-center justify-center gap-2 rounded-lg bg-emerald-500 py-2 font-semibold text-black">Crypto</span>
          <Link to="/mpesa/withdraw" className="flex items-center justify-center gap-2 rounded-lg py-2 text-muted-foreground hover:text-foreground">M-Pesa</Link>
        </div>
        {locked && (
          <div className="rounded-2xl border border-yellow-500/40 bg-yellow-500/10 p-5">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-6 w-6 shrink-0 text-yellow-400" />
              <div>
                <p className="font-semibold text-yellow-300">Trading Activity Required</p>
                <p className="mt-1 text-sm text-yellow-100/80">
                  You must complete at least one AI Trading Bot trade before you can request a
                  withdrawal. Activate the bot — as soon as it closes one trade, this page unlocks.
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

        {submitted && (
          <div className="flex items-start gap-3 rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-4">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" />
            <div>
              <p className="font-semibold text-emerald-300">Request submitted</p>
              <p className="text-sm text-emerald-100/80">Your withdrawal is now pending admin approval.</p>
            </div>
          </div>
        )}

        <fieldset disabled={locked || submitting} className={`space-y-4 rounded-2xl border border-border bg-black p-5 ${locked ? "opacity-60" : ""}`}>
          <Field label="Coin">
            <select
              value={coin}
              onChange={(e) => setCoin(e.target.value)}
              className="w-full rounded-lg border border-border bg-zinc-950 px-3 py-2.5 text-sm outline-none focus:border-emerald-500"
            >
              {COINS.map((c) => <option key={c}>{c}</option>)}
            </select>
          </Field>
          <Field label="Network (optional)">
            <input
              value={network}
              onChange={(e) => setNetwork(e.target.value)}
              placeholder="Auto-detected from coin"
              className="w-full rounded-lg border border-border bg-zinc-950 px-3 py-2.5 text-sm outline-none focus:border-emerald-500"
            />
          </Field>
          <Field label="Amount (USD)">
            <input
              type="number"
              min={0}
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="w-full rounded-lg border border-border bg-zinc-950 px-3 py-2.5 text-sm outline-none focus:border-emerald-500"
            />
          </Field>
          <Field label="Wallet Address">
            <input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Destination address"
              className="w-full rounded-lg border border-border bg-zinc-950 px-3 py-2.5 text-sm outline-none focus:border-emerald-500"
            />
          </Field>
          <button
            type="button"
            onClick={submit}
            disabled={locked || submitting}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-black hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-zinc-800 disabled:text-muted-foreground"
          >
            {locked && <Lock className="h-4 w-4" />}
            {locked ? "Locked — Complete a Trade First" : submitting ? "Submitting..." : "Submit Withdrawal"}
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
