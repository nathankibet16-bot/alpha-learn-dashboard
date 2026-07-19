import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Menu, Smartphone, Loader2, CheckCircle2, Bitcoin, AlertTriangle, Bot } from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import type { User } from "@supabase/supabase-js";
import { Sidebar } from "@/components/Sidebar";
import { supabase } from "@/integrations/supabase/client";
import { submitMpesaWithdrawal } from "@/lib/mpesa.functions";
import { getTradeCount, TRADE_COUNT_EVENT } from "@/lib/bot-session";
import { syncBalanceFromServer, getBalance } from "@/lib/auth";

export const Route = createFileRoute("/mpesa/withdraw")({
  head: () => ({ meta: [{ title: "M-Pesa Withdraw — Alpha Trader Group" }] }),
  component: MpesaWithdrawPage,
});

const PRESETS = [5000, 10000, 20000, 50000];
const fmt = (n: number) => n.toLocaleString("en-KE");

function MpesaWithdrawPage() {
  const navigate = useNavigate();
  const submit = useServerFn(submitMpesaWithdrawal);
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [amount, setAmount] = useState(5000);
  const [phone, setPhone] = useState("");
  const [rate, setRate] = useState(129);
  const [feePct, setFeePct] = useState(8);
  const [feeFixed, setFeeFixed] = useState(0);
  const [tradeCount, setTradeCount] = useState(0);
  const [balance, setBalance] = useState(0);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<null | { net_kes: number; ref: string }>(null);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) { navigate({ to: "/login", replace: true }); return; }
      setUser(data.user);
      setTradeCount(getTradeCount(data.user.id));
      await syncBalanceFromServer(data.user.id);
      setBalance(getBalance(data.user.id));
    });
    supabase.from("mpesa_settings").select("usd_to_kes_rate,withdrawal_fee_percent,withdrawal_fee_fixed_kes").eq("id", true).maybeSingle()
      .then(({ data }) => { if (data) { setRate(Number(data.usd_to_kes_rate)); setFeePct(Number(data.withdrawal_fee_percent)); setFeeFixed(Number(data.withdrawal_fee_fixed_kes)); } });
  }, [navigate]);

  useEffect(() => {
    if (!user) return;
    const h = (e: Event) => { const d = (e as CustomEvent).detail; if (d?.userId === user.id) setTradeCount(d.value); };
    window.addEventListener(TRADE_COUNT_EVENT, h);
    return () => window.removeEventListener(TRADE_COUNT_EVENT, h);
  }, [user]);

  if (!user) return null;
  const locked = tradeCount < 1;

  const feeKes = Math.round(amount * (feePct / 100) + feeFixed);
  const netKes = amount - feeKes;
  const amountUsd = Number((amount / rate).toFixed(2));
  const validAmount = Number.isInteger(amount) && amount > 0 && amountUsd <= balance;

  const doSubmit = async () => {
    setBusy(true);
    try {
      const res = await submit({ data: { amount_kes: amount, phone } });
      await syncBalanceFromServer(user.id);
      setDone({ net_kes: res.net_kes, ref: res.internal_reference });
      toast.success("Withdrawal request submitted");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally { setBusy(false); }
  };

  return (
    <div className="min-h-screen bg-[#09090b] text-foreground">
      <Sidebar open={open} onClose={() => setOpen(false)} />
      <header className="sticky top-0 z-30 border-b border-border bg-[#09090b]/90 backdrop-blur">
        <div className="flex items-center justify-between px-4 py-3">
          <button onClick={() => setOpen(true)} className="rounded-md p-2 hover:bg-accent"><Menu className="h-5 w-5" /></button>
          <h1 className="font-display text-lg font-semibold">Withdraw to M-Pesa</h1>
          <span className="w-9" />
        </div>
      </header>

      <main className="mx-auto max-w-2xl space-y-5 px-4 py-6">
        <div className="grid grid-cols-2 rounded-xl border border-border bg-black p-1 text-sm">
          <Link to="/withdraw" className="flex items-center justify-center gap-2 rounded-lg py-2 text-muted-foreground hover:text-foreground">
            <Bitcoin className="h-4 w-4" /> Crypto
          </Link>
          <span className="flex items-center justify-center gap-2 rounded-lg bg-emerald-500 py-2 font-semibold text-black">
            <Smartphone className="h-4 w-4" /> M-Pesa
          </span>
        </div>

        {locked && (
          <div className="rounded-2xl border border-yellow-500/40 bg-yellow-500/10 p-5">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-6 w-6 shrink-0 text-yellow-400" />
              <div>
                <p className="font-semibold text-yellow-300">Trading Activity Required</p>
                <p className="mt-1 text-sm text-yellow-100/80">Complete at least one AI Trading Bot trade before you can withdraw.</p>
                <Link to="/bot" className="mt-3 inline-flex items-center gap-2 rounded-lg bg-yellow-400 px-3 py-2 text-sm font-semibold text-black">
                  <Bot className="h-4 w-4" /> Go to AI Trading Bot
                </Link>
              </div>
            </div>
          </div>
        )}

        {done ? (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-8 text-center">
            <CheckCircle2 className="h-12 w-12 text-emerald-400" />
            <p className="font-semibold text-emerald-300">Withdrawal submitted</p>
            <p className="text-sm text-muted-foreground">KES {fmt(done.net_kes)} will be sent to your M-Pesa shortly.</p>
            <p className="text-xs text-muted-foreground">Reference: {done.ref}</p>
            <Link to="/dashboard" className="mt-2 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-black">Back to dashboard</Link>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2 text-xs">
              {(["Amount", "Phone", "Confirm"] as const).map((label, i) => {
                const n = (i + 1) as 1 | 2 | 3;
                const active = step === n; const done = step > n;
                return (
                  <div key={label} className="flex flex-1 items-center gap-2">
                    <div className={`flex h-7 w-7 items-center justify-center rounded-full border ${active ? "border-emerald-500 bg-emerald-500 text-black" : done ? "border-emerald-500/50 bg-emerald-500/20 text-emerald-300" : "border-border text-muted-foreground"}`}>{n}</div>
                    <span className={active ? "font-medium" : "text-muted-foreground"}>{label}</span>
                    {i < 2 && <div className={`h-px flex-1 ${done ? "bg-emerald-500/50" : "bg-border"}`} />}
                  </div>
                );
              })}
            </div>

            <fieldset disabled={locked} className={locked ? "opacity-60" : ""}>
              {step === 1 && (
                <div className="space-y-4 rounded-2xl border border-border bg-black p-5">
                  <p className="text-sm text-muted-foreground">Enter the amount you want to withdraw.</p>
                  <p className="text-xs text-muted-foreground">Available balance: <span className="text-foreground">${balance.toFixed(2)}</span> (~KES {fmt(Math.floor(balance * rate))})</p>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {PRESETS.map((p) => (
                      <button key={p} onClick={() => setAmount(p)}
                        className={`rounded-lg border px-3 py-2 text-sm font-medium ${amount === p ? "border-emerald-500 bg-emerald-500 text-black" : "border-border bg-zinc-950 hover:border-emerald-500/50"}`}>
                        KES {fmt(p)}
                      </button>
                    ))}
                  </div>
                  <label className="block">
                    <span className="mb-1.5 block text-xs uppercase tracking-wide text-muted-foreground">Custom amount (KES)</span>
                    <input type="number" min={1} step={1} value={amount}
                      onChange={(e) => setAmount(Math.max(0, Math.floor(Number(e.target.value) || 0)))}
                      className="w-full rounded-lg border border-border bg-zinc-950 px-3 py-2.5 outline-none focus:border-emerald-500" />
                  </label>
                  <button disabled={!validAmount} onClick={() => setStep(2)}
                    className="w-full rounded-lg bg-emerald-500 py-2.5 text-sm font-semibold text-black hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-zinc-800 disabled:text-muted-foreground">
                    Continue
                  </button>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-4 rounded-2xl border border-border bg-black p-5">
                  <label className="block">
                    <span className="mb-1.5 block text-xs uppercase tracking-wide text-muted-foreground">M-Pesa phone number</span>
                    <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="0712 345 678"
                      className="w-full rounded-lg border border-border bg-zinc-950 px-3 py-2.5 outline-none focus:border-emerald-500" />
                  </label>
                  <p className="text-xs text-muted-foreground">Your withdrawal will be sent to this M-Pesa number.</p>
                  <div className="flex gap-2">
                    <button onClick={() => setStep(1)} className="flex-1 rounded-lg border border-border bg-zinc-950 py-2.5 text-sm">Back</button>
                    <button onClick={() => setStep(3)} disabled={phone.replace(/\D/g, "").length < 9}
                      className="flex-1 rounded-lg bg-emerald-500 py-2.5 text-sm font-semibold text-black hover:bg-emerald-400 disabled:bg-zinc-800">Continue</button>
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-4 rounded-2xl border border-border bg-black p-5">
                  <div className="rounded-lg border border-border bg-zinc-950 p-4 text-sm">
                    <Row label="Deducted from wallet" value={`$${amountUsd.toFixed(2)}`} />
                    <Row label="Exchange rate" value={`1 USD = ${rate} KES`} />
                    <Row label="Withdrawal amount" value={`KES ${fmt(amount)}`} />
                    <Row label="Withdrawal fee" value={`KES ${fmt(feeKes)}`} />
                    <Row label="You receive" value={`KES ${fmt(netKes)}`} strong />
                    <Row label="M-Pesa number" value={phone.replace(/(\d{4})\d{4}(\d{3})/, "$1****$2")} />
                  </div>
                  <button disabled={busy} onClick={doSubmit}
                    className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-500 py-2.5 text-sm font-semibold text-black hover:bg-emerald-400 disabled:bg-zinc-800">
                    {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Smartphone className="h-4 w-4" />}
                    Confirm M-Pesa withdrawal
                  </button>
                  <button onClick={() => setStep(2)} className="w-full rounded-lg border border-border py-2 text-xs text-muted-foreground">Back</button>
                </div>
              )}
            </fieldset>
          </>
        )}
      </main>
    </div>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-muted-foreground">{label}</span>
      <span className={strong ? "font-semibold text-foreground" : "text-foreground"}>{value}</span>
    </div>
  );
}
