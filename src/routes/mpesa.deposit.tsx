import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Menu, Smartphone, Loader2, CheckCircle2, XCircle, Bitcoin, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { Sidebar } from "@/components/Sidebar";
import { supabase } from "@/integrations/supabase/client";
import { initiateMpesaDeposit, getMpesaDepositStatus, queryMpesaDepositStatus, submitManualMpesaDeposit } from "@/lib/mpesa.functions";
import { syncBalanceFromServer } from "@/lib/auth";

export const Route = createFileRoute("/mpesa/deposit")({
  head: () => ({ meta: [{ title: "M-Pesa Deposit — Alpha Trader Group" }] }),
  component: MpesaDepositPage,
});

const PRESETS = [500, 1000, 3000, 5000, 10000];
const MIN = 500;
const POLL_MS = 3000;
const QUERY_AFTER_MS = 15000;
const MANUAL_CHECK_AFTER_MS = 120000;
const MANUAL_TILL_AFTER_MS = 60000;
const TILL_NUMBER = "3405451";
const TILL_NAME = "TUMAME NETWORKS";
const fmt = (n: number) => n.toLocaleString("en-KE");

function MpesaDepositPage() {
  const navigate = useNavigate();
  const initiate = useServerFn(initiateMpesaDeposit);
  const getStatus = useServerFn(getMpesaDepositStatus);
  const queryStatus = useServerFn(queryMpesaDepositStatus);
  const submitManual = useServerFn(submitManualMpesaDeposit);
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [amount, setAmount] = useState(500);
  const [phone, setPhone] = useState("");
  const [rate, setRate] = useState(129);
  const [fee, setFee] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [depositId, setDepositId] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "waiting" | "success" | "failed" | "manual_submitted">("idle");
  const [receipt, setReceipt] = useState<string | null>(null);
  const [creditedKes, setCreditedKes] = useState<number>(0);
  const [showManualCheck, setShowManualCheck] = useState(false);
  const [showManualTill, setShowManualTill] = useState(false);
  const [checking, setChecking] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const [manualCode, setManualCode] = useState("");
  const [manualPhone, setManualPhone] = useState("");
  const [manualAmount, setManualAmount] = useState<number>(0);
  const [manualSubmitting, setManualSubmitting] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const queryTriggered = useRef(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) navigate({ to: "/login", replace: true });
    });
    supabase.from("mpesa_settings").select("kes_to_usd_rate,deposit_fee_kes").eq("id", true).maybeSingle()
      .then(({ data }) => { if (data) { setRate(Number(data.kes_to_usd_rate)); setFee(Number(data.deposit_fee_kes)); } });
  }, [navigate]);

  const finalizeSuccess = async (r: { mpesa_receipt: string | null; amount_kes: number }) => {
    setStatus("success");
    setReceipt(r.mpesa_receipt);
    setCreditedKes(r.amount_kes || amount);
    if (pollRef.current) clearInterval(pollRef.current);
    const { data } = await supabase.auth.getUser();
    if (data.user) await syncBalanceFromServer(data.user.id);
    toast.success("Deposit successful");
  };

  useEffect(() => {
    if (!depositId || status !== "waiting") return;
    let elapsed = 0;
    queryTriggered.current = false;
    setShowManualCheck(false);
    setShowManualTill(false);
    pollRef.current = setInterval(async () => {
      elapsed += POLL_MS;
      try {
        const r = await getStatus({ data: { deposit_id: depositId } });
        if (r.credited) {
          await finalizeSuccess({ mpesa_receipt: r.mpesa_receipt, amount_kes: Number(r.amount_kes ?? amount) });
          return;
        }
        // Only stop polling on EXPLICIT final failure statuses persisted by
        // the webhook or a confirmed provider response.
        if (["failed", "cancelled", "expired"].includes(r.status ?? "")) {
          setStatus("failed");
          if (pollRef.current) clearInterval(pollRef.current);
          return;
        }
      } catch { /* transient poll error — keep waiting */ }

      // Backend fallback query if webhook is late.
      if (!queryTriggered.current && elapsed >= QUERY_AFTER_MS) {
        queryTriggered.current = true;
        try {
          const q = await queryStatus({ data: { deposit_id: depositId } });
          if (q.ok && q.credited) {
            const r2 = await getStatus({ data: { deposit_id: depositId } });
            await finalizeSuccess({ mpesa_receipt: r2.mpesa_receipt, amount_kes: Number(r2.amount_kes ?? amount) });
            return;
          }
          // Only mark failed if provider EXPLICITLY returned a final failure.
          // Transient/unreachable/processing => keep waiting.
        } catch { /* ignore — keep waiting */ }
      }

      if (elapsed >= MANUAL_TILL_AFTER_MS) {
        setShowManualTill(true);
      }
      if (elapsed >= MANUAL_CHECK_AFTER_MS) {
        setShowManualCheck(true);
      }
    }, POLL_MS);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [depositId, status, getStatus, queryStatus, amount]);


  const total = amount + fee;
  const creditedUsd = (amount / rate).toFixed(2);
  const validAmount = Number.isInteger(amount) && amount >= MIN;

  const submit = async () => {
    setSubmitting(true);
    try {
      const res = await initiate({ data: { amount_kes: amount, phone } });
      setDepositId(res.deposit_id);
      setStatus("waiting");
      toast.success("Check your phone for M-Pesa prompt");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally { setSubmitting(false); }
  };

  const manualCheck = async () => {
    if (!depositId) return;
    setChecking(true);
    try {
      const q = await queryStatus({ data: { deposit_id: depositId } });
      if (q.ok && q.credited) {
        const r2 = await getStatus({ data: { deposit_id: depositId } });
        await finalizeSuccess({ mpesa_receipt: r2.mpesa_receipt, amount_kes: Number(r2.amount_kes ?? amount) });
      } else if (q.ok && (q as { status?: string }).status && ["failed", "cancelled", "expired"].includes((q as { status: string }).status)) {
        setStatus("failed");
        if (pollRef.current) clearInterval(pollRef.current);
      } else {
        toast.info("We are still confirming your payment.");
      }
    } catch {
      toast.info("We are still confirming your payment.");
    } finally { setChecking(false); }
  };

  const openManualForm = () => {
    setManualCode("");
    setManualPhone(phone);
    setManualAmount(amount);
    setManualOpen(true);
  };

  const submitManualForm = async () => {
    const code = manualCode.trim().toUpperCase();
    if (!/^[A-Z0-9]{6,24}$/.test(code)) { toast.error("Enter a valid M-Pesa transaction code"); return; }
    if (manualPhone.replace(/\D/g, "").length < 9) { toast.error("Enter a valid phone number"); return; }
    if (!Number.isInteger(manualAmount) || manualAmount < MIN) { toast.error(`Minimum amount is KES ${fmt(MIN)}`); return; }
    setManualSubmitting(true);
    try {
      await submitManual({ data: { amount_kes: manualAmount, phone: manualPhone, mpesa_code: code } });
      if (pollRef.current) clearInterval(pollRef.current);
      setStatus("manual_submitted");
      setManualOpen(false);
      toast.success("Deposit submitted for verification");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to submit");
    } finally { setManualSubmitting(false); }
  };





  return (
    <div className="min-h-screen bg-[#09090b] text-foreground">
      <Sidebar open={open} onClose={() => setOpen(false)} />
      <header className="sticky top-0 z-30 border-b border-border bg-[#09090b]/90 backdrop-blur">
        <div className="flex items-center justify-between px-4 py-3">
          <button onClick={() => setOpen(true)} className="rounded-md p-2 hover:bg-accent"><Menu className="h-5 w-5" /></button>
          <h1 className="font-display text-lg font-semibold">Deposit with M-Pesa</h1>
          <span className="w-9" />
        </div>
      </header>

      <main className="mx-auto max-w-2xl space-y-5 px-4 py-6">
        {/* Method tabs */}
        <div className="grid grid-cols-2 rounded-xl border border-border bg-black p-1 text-sm">
          <Link to="/deposit" className="flex items-center justify-center gap-2 rounded-lg py-2 text-muted-foreground hover:text-foreground">
            <Bitcoin className="h-4 w-4" /> Crypto
          </Link>
          <span className="flex items-center justify-center gap-2 rounded-lg bg-emerald-500 py-2 font-semibold text-black">
            <Smartphone className="h-4 w-4" /> M-Pesa
          </span>
        </div>

        {/* Stepper */}
        <div className="flex items-center gap-2 text-xs">
          {(["Amount", "Phone", "Pay"] as const).map((label, i) => {
            const n = (i + 1) as 1 | 2 | 3;
            const active = step === n;
            const done = step > n;
            return (
              <div key={label} className="flex flex-1 items-center gap-2">
                <div className={`flex h-7 w-7 items-center justify-center rounded-full border ${active ? "border-emerald-500 bg-emerald-500 text-black" : done ? "border-emerald-500/50 bg-emerald-500/20 text-emerald-300" : "border-border text-muted-foreground"}`}>{n}</div>
                <span className={active ? "font-medium" : "text-muted-foreground"}>{label}</span>
                {i < 2 && <div className={`h-px flex-1 ${done ? "bg-emerald-500/50" : "bg-border"}`} />}
              </div>
            );
          })}
        </div>

        {step === 1 && (
          <div className="space-y-4 rounded-2xl border border-border bg-black p-5">
            <p className="text-sm text-muted-foreground">Select the amount you want to deposit.</p>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
              {PRESETS.map((p) => (
                <button key={p} onClick={() => setAmount(p)}
                  className={`rounded-lg border px-3 py-2 text-sm font-medium ${amount === p ? "border-emerald-500 bg-emerald-500 text-black" : "border-border bg-zinc-950 text-foreground hover:border-emerald-500/50"}`}>
                  KES {fmt(p)}
                </button>
              ))}
            </div>
            <label className="block">
              <span className="mb-1.5 block text-xs uppercase tracking-wide text-muted-foreground">Custom amount (KES)</span>
              <input type="number" min={MIN} step={1} value={amount}
                onChange={(e) => setAmount(Math.max(0, Math.floor(Number(e.target.value) || 0)))}
                className="w-full rounded-lg border border-border bg-zinc-950 px-3 py-2.5 outline-none focus:border-emerald-500" />
            </label>
            {!validAmount && amount > 0 && <p className="text-xs text-red-400">Minimum M-Pesa deposit is KES {fmt(MIN)}.</p>}

            <div className="rounded-lg border border-border bg-zinc-950 p-4 text-sm">
              <Row label="Deposit amount" value={`KES ${fmt(amount)}`} />
              <Row label="Deposit fee" value={`KES ${fmt(fee)}`} />
              <Row label="Total to pay" value={`KES ${fmt(total)}`} strong />
            </div>
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
            <p className="text-xs text-muted-foreground">An M-Pesa payment request will be sent to this phone.</p>
            <div className="flex gap-2">
              <button onClick={() => setStep(1)} className="flex-1 rounded-lg border border-border bg-zinc-950 py-2.5 text-sm">Back</button>
              <button onClick={() => setStep(3)} disabled={phone.replace(/\D/g, "").length < 9}
                className="flex-1 rounded-lg bg-emerald-500 py-2.5 text-sm font-semibold text-black hover:bg-emerald-400 disabled:bg-zinc-800 disabled:text-muted-foreground">Continue</button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4 rounded-2xl border border-border bg-black p-5">
            {status === "idle" && (
              <>
                <div className="rounded-lg border border-border bg-zinc-950 p-4 text-sm">
                  <Row label="Deposit amount" value={`KES ${fmt(amount)}`} />
                  <Row label="M-Pesa number" value={phone} />
                  <Row label="Deposit fee" value={`KES ${fmt(fee)}`} />
                  <Row label="Total to pay" value={`KES ${fmt(total)}`} strong />
                  <Row label="Exchange rate" value={`1 USD = ${rate} KES`} />
                  <Row label="Estimated credit" value={`$${creditedUsd}`} />
                </div>
                <button disabled={submitting} onClick={submit}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-500 py-2.5 text-sm font-semibold text-black hover:bg-emerald-400 disabled:bg-zinc-800">
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Smartphone className="h-4 w-4" />}
                  Pay with M-Pesa
                </button>
                <button onClick={() => setStep(2)} className="w-full rounded-lg border border-border py-2 text-xs text-muted-foreground">Back</button>
              </>
            )}
            {status === "waiting" && (
              <div className="flex flex-col items-center gap-3 py-8 text-center">
                <Loader2 className="h-10 w-10 animate-spin text-emerald-400" />
                <p className="font-semibold">Check your phone</p>
                <p className="text-sm text-muted-foreground">An M-Pesa payment request has been sent to {phone}.<br/>Enter your M-Pesa PIN to complete the deposit.</p>
                <span className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-300">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" /> Waiting for payment
                </span>
                {showManualCheck && (
                  <button onClick={manualCheck} disabled={checking}
                    className="mt-3 inline-flex items-center gap-2 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-4 py-2 text-sm font-medium text-emerald-300 hover:bg-emerald-500/20 disabled:opacity-60">
                    {checking ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                    Check payment status
                  </button>
                )}

                {showManualTill && !manualOpen && (
                  <div className="mt-4 w-full space-y-3 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 text-left">
                    <p className="text-center text-sm font-semibold text-emerald-300">Pay manually using M-Pesa Till</p>
                    <ol className="list-decimal space-y-1 pl-5 text-xs text-muted-foreground">
                      <li>Open M-Pesa.</li>
                      <li>Select <span className="text-foreground">Lipa na M-Pesa</span>.</li>
                      <li>Select <span className="text-foreground">Buy Goods and Services</span>.</li>
                      <li>Enter Till Number: <span className="font-mono font-semibold text-emerald-300">{TILL_NUMBER}</span></li>
                      <li>Confirm the Till name is <span className="font-semibold text-foreground">{TILL_NAME}</span>.</li>
                      <li>Enter the exact deposit amount (KES {fmt(amount)}).</li>
                      <li>Complete payment and copy the M-Pesa transaction code.</li>
                    </ol>
                    <button onClick={openManualForm}
                      className="w-full rounded-lg bg-emerald-500 py-2 text-sm font-semibold text-black hover:bg-emerald-400">
                      Already paid? Verify deposit
                    </button>
                  </div>
                )}

                {manualOpen && (
                  <div className="mt-4 w-full space-y-3 rounded-xl border border-border bg-zinc-950 p-4 text-left">
                    <p className="text-center text-sm font-semibold">Verify M-Pesa payment</p>
                    <label className="block">
                      <span className="mb-1 block text-[11px] uppercase tracking-wide text-muted-foreground">M-Pesa transaction code</span>
                      <input value={manualCode} onChange={(e) => setManualCode(e.target.value.toUpperCase())}
                        placeholder="e.g. QK7A2BXYZ1" maxLength={24}
                        className="w-full rounded-lg border border-border bg-black px-3 py-2 font-mono text-sm outline-none focus:border-emerald-500" />
                    </label>
                    <label className="block">
                      <span className="mb-1 block text-[11px] uppercase tracking-wide text-muted-foreground">Phone number</span>
                      <input value={manualPhone} onChange={(e) => setManualPhone(e.target.value)}
                        placeholder="0712 345 678"
                        className="w-full rounded-lg border border-border bg-black px-3 py-2 text-sm outline-none focus:border-emerald-500" />
                    </label>
                    <label className="block">
                      <span className="mb-1 block text-[11px] uppercase tracking-wide text-muted-foreground">Amount paid (KES)</span>
                      <input type="number" min={MIN} value={manualAmount || ""}
                        onChange={(e) => setManualAmount(Math.max(0, Math.floor(Number(e.target.value) || 0)))}
                        className="w-full rounded-lg border border-border bg-black px-3 py-2 text-sm outline-none focus:border-emerald-500" />
                    </label>
                    <div className="flex gap-2">
                      <button onClick={() => setManualOpen(false)}
                        className="flex-1 rounded-lg border border-border py-2 text-xs text-muted-foreground">Cancel</button>
                      <button onClick={submitManualForm} disabled={manualSubmitting}
                        className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-emerald-500 py-2 text-sm font-semibold text-black hover:bg-emerald-400 disabled:opacity-60">
                        {manualSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                        Submit for verification
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
            {status === "manual_submitted" && (
              <div className="flex flex-col items-center gap-3 py-8 text-center">
                <CheckCircle2 className="h-12 w-12 text-emerald-400" />
                <p className="font-semibold text-emerald-300">Deposit submitted</p>
                <p className="text-sm text-muted-foreground">Your payment will be verified and reflected in your account shortly.</p>
                <Link to="/dashboard" className="mt-2 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-black">Back to dashboard</Link>
              </div>
            )}
            {status === "success" && (
              <div className="flex flex-col items-center gap-3 py-8 text-center">
                <CheckCircle2 className="h-12 w-12 text-emerald-400" />
                <p className="font-semibold text-emerald-300">Deposit successful</p>
                <p className="text-sm text-foreground">KES {fmt(creditedKes)} has been received and added to your account.</p>
                {receipt && <p className="text-xs text-muted-foreground">M-Pesa receipt: {receipt}</p>}
                <Link to="/dashboard" className="mt-2 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-black">Back to dashboard</Link>
              </div>
            )}
            {status === "failed" && (
              <div className="flex flex-col items-center gap-3 py-8 text-center">
                <XCircle className="h-12 w-12 text-red-400" />
                <p className="font-semibold text-red-300">Payment failed</p>
                <p className="text-sm text-muted-foreground">Please try again.</p>
                <button onClick={() => { setStatus("idle"); setDepositId(null); setStep(1); }} className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-black">Try again</button>
              </div>
            )}
          </div>
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
