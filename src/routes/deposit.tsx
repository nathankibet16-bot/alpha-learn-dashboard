import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Menu, Check, Copy, Loader2, RefreshCw } from "lucide-react";
import QRCode from "qrcode";
import { useServerFn } from "@tanstack/react-start";
import { Sidebar } from "@/components/Sidebar";
import { supabase } from "@/integrations/supabase/client";
import { sendNotificationEmail } from "@/lib/notifications.functions";

export const Route = createFileRoute("/deposit")({
  head: () => ({
    meta: [
      { title: "Deposit — Alpha Trader Group" },
      { name: "description", content: "Deposit crypto to your Alpha Trader Group account." },
    ],
  }),
  component: DepositPage,
});

const FEE = 1;
const MIN_AMOUNT = 20;
const PRESETS = [20, 50, 100, 250, 500, 1000, 2000];

type Coin = { id: string; name: string; network: string; symbol: string; rate: number; address: string };
const COINS: Coin[] = [
  { id: "usdt-bep20", name: "Tether USDT", network: "BEP20", symbol: "USDT", rate: 1, address: "0x273fc532e0FA69e2ABA54Db97dD3b324bb57C413" },
  { id: "usdt-trc20", name: "Tether USDT", network: "TRC20", symbol: "USDT", rate: 1, address: "TDYjkNwL3rDcQCYY2CNtnzHVkDooLdm18P" },
  { id: "usdt-sol", name: "Tether USDT", network: "Solana", symbol: "USDT", rate: 1, address: "8EPHpLpATRACgsr8gzgNbNXCkn3DYZjvK4yDEfNAtjsq" },
  { id: "btc", name: "Bitcoin", network: "BTC", symbol: "BTC", rate: 68420, address: "18VcqpYQS93pHdAK19JNFrhyi7RqBBb1xy" },
];

function DepositPage() {
  const navigate = useNavigate();
  const sendEmail = useServerFn(sendNotificationEmail);
  const [open, setOpen] = useState(false);
  const [ready, setReady] = useState(false);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [amount, setAmount] = useState<number>(20);
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [invoice, setInvoice] = useState<null | { id: string; total: number; crypto: string; coin: Coin; qr: string }>(null);
  const [expires, setExpires] = useState(59 * 60 + 59);
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) { navigate({ to: "/login", replace: true }); return; }
      setReady(true);
    });
  }, [navigate]);

  useEffect(() => {
    if (step !== 3 || !invoice) return;
    timerRef.current = setInterval(() => setExpires((s) => Math.max(0, s - 1)), 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [step, invoice]);

  const total = useMemo(() => Number((amount + FEE).toFixed(2)), [amount]);

  if (!ready) return null;

  const generate = async () => {
    const coin = COINS.find((c) => c.id === selected);
    if (!coin) return;
    setStep(3);
    setLoading(true);
    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;
    await new Promise((r) => setTimeout(r, 1800));
    const cryptoAmt = (total / coin.rate).toFixed(coin.rate < 5 ? 2 : 6);
    const qr = await QRCode.toDataURL(coin.address, { margin: 1, width: 260, color: { dark: "#000000", light: "#ffffff" } });
    if (user) {
      const { data: inserted } = await supabase.from("deposits").insert({
        user_id: user.id,
        user_email: user.email ?? null,
        amount: total,
        network: `${coin.symbol} · ${coin.network}`,
        address: coin.address,
      }).select("id").single();
      if (inserted?.id) {
        const name = (user.user_metadata?.full_name as string | undefined)?.split(" ")[0]
          ?? user.email?.split("@")[0];
        sendEmail({ data: {
          template: "deposit-submitted",
          data: { name, amount: total.toFixed(2), network: `${coin.symbol} · ${coin.network}`, address: coin.address },
          idempotencyKey: `deposit-submitted-${inserted.id}`,
        } }).catch(() => { /* non-blocking */ });
      }
    }
    setInvoice({
      id: "ATG-" + Math.random().toString(36).slice(2, 10).toUpperCase(),
      total,
      crypto: `${cryptoAmt} ${coin.symbol}`,
      coin,
      qr,
    });
    setExpires(59 * 60 + 59);
    setLoading(false);
  };

  const reset = () => {
    setStep(1);
    setAmount(100);
    setSelected(null);
    setInvoice(null);
  };

  const copy = () => {
    if (!invoice) return;
    navigator.clipboard.writeText(invoice.coin.address);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const mm = String(Math.floor(expires / 60)).padStart(2, "0");
  const ss = String(expires % 60).padStart(2, "0");

  return (
    <div className="min-h-screen bg-[#09090b] text-foreground">
      <Sidebar open={open} onClose={() => setOpen(false)} />
      <header className="sticky top-0 z-30 border-b border-border bg-[#09090b]/90 backdrop-blur">
        <div className="flex items-center justify-between px-4 py-3">
          <button onClick={() => setOpen(true)} className="rounded-md p-2 hover:bg-accent">
            <Menu className="h-5 w-5" />
          </button>
          <h1 className="font-display text-lg font-semibold">Deposit</h1>
          <span className="w-9" />
        </div>
      </header>

      <main className="mx-auto max-w-2xl space-y-6 px-4 py-6">
        <Stepper step={step} />

        {step === 1 && (
          <div className="space-y-4 rounded-2xl border border-border bg-black p-5">
            <p className="text-sm font-medium">Select amount</p>
            <div className="grid grid-cols-4 gap-2">
              {PRESETS.map((v) => (
                <button
                  key={v}
                  onClick={() => setAmount(v)}
                  className={`rounded-lg border px-2 py-2.5 text-sm font-semibold transition-colors ${
                    amount === v ? "border-emerald-500 bg-emerald-500/10 text-emerald-400" : "border-border bg-zinc-950 hover:border-emerald-500/50"
                  }`}
                >
                  ${v}
                </button>
              ))}
            </div>

            <label className="block">
              <span className="mb-1.5 block text-xs uppercase tracking-wide text-muted-foreground">Custom amount</span>
              <div className="flex items-center rounded-lg border border-border bg-zinc-950 px-3 focus-within:border-emerald-500">
                <span className="text-muted-foreground">$</span>
                <input
                  type="number"
                  min={50}
                  step={1}
                  value={amount}
                  onChange={(e) => setAmount(Number(e.target.value))}
                  className="w-full bg-transparent px-2 py-2.5 text-sm outline-none"
                />
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">Minimum $50.00</p>
            </label>

            <div className="space-y-1.5 rounded-lg border border-border bg-zinc-950 p-3 text-sm">
              <Row label="Deposit amount" value={`$${amount.toFixed(2)}`} />
              <Row label="Transaction fee" value={`$${FEE.toFixed(2)}`} />
              <div className="my-1 h-px bg-border" />
              <Row label="Total to pay" value={`$${total.toFixed(2)}`} bold />
            </div>

            <button
              disabled={amount < 50}
              onClick={() => setStep(2)}
              className="w-full rounded-lg bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-black hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-zinc-800 disabled:text-muted-foreground"
            >
              Continue
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4 rounded-2xl border border-border bg-black p-5">
            <p className="text-sm font-medium">Select crypto & network</p>
            <div className="space-y-2">
              {COINS.map((c) => {
                const active = selected === c.id;
                return (
                  <button
                    key={c.id}
                    onClick={() => setSelected(c.id)}
                    className={`flex w-full items-center justify-between rounded-lg border px-3 py-3 text-left transition-colors ${
                      active ? "border-emerald-500 bg-emerald-500/10" : "border-border bg-zinc-950 hover:border-emerald-500/50"
                    }`}
                  >
                    <div>
                      <p className="text-sm font-semibold">{c.name}</p>
                      <p className="text-xs text-muted-foreground">{c.symbol} · {c.network}</p>
                    </div>
                    {active && <Check className="h-5 w-5 text-emerald-500" />}
                  </button>
                );
              })}
            </div>
            <div className="flex gap-2">
              <button onClick={() => setStep(1)} className="flex-1 rounded-lg border border-border bg-zinc-950 px-4 py-2.5 text-sm hover:bg-zinc-900">Back</button>
              <button
                onClick={generate}
                disabled={!selected}
                className="flex-1 rounded-lg bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-black hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-zinc-800 disabled:text-muted-foreground"
              >
                Generate Payment
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="rounded-2xl border border-border bg-black p-5">
            {loading || !invoice ? (
              <div className="flex flex-col items-center gap-3 py-10 text-center">
                <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
                <p className="font-semibold">Creating payment invoice...</p>
                <p className="text-xs text-muted-foreground">Generating your payment invoice — This takes just a moment</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Invoice Ready</p>
                    <p className="font-display text-lg font-semibold">Deposit #{invoice.id}</p>
                  </div>
                  <span className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-1 text-xs text-emerald-500">
                    {invoice.coin.symbol} · {invoice.coin.network}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg border border-border bg-zinc-950 p-3">
                    <p className="text-[11px] uppercase text-muted-foreground">Total USD</p>
                    <p className="mt-1 font-display text-lg font-semibold">${invoice.total.toFixed(2)}</p>
                  </div>
                  <div className="rounded-lg border border-border bg-zinc-950 p-3">
                    <p className="text-[11px] uppercase text-muted-foreground">Crypto amount</p>
                    <p className="mt-1 font-display text-lg font-semibold text-emerald-400">{invoice.crypto}</p>
                  </div>
                </div>

                <div className="flex flex-col items-center gap-3 rounded-lg border border-border bg-zinc-950 p-4">
                  <img src={invoice.qr} alt="Payment QR" className="rounded-md" width={220} height={220} />
                  <div className="w-full">
                    <p className="text-[11px] uppercase text-muted-foreground">Destination Address</p>
                    <div className="mt-1 flex items-center gap-2 rounded-md border border-border bg-black px-2 py-2">
                      <code className="flex-1 truncate text-xs">{invoice.coin.address}</code>
                      <button onClick={copy} className="rounded-md bg-emerald-500 px-2 py-1 text-xs font-semibold text-black hover:bg-emerald-400">
                        {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between rounded-lg border border-border bg-zinc-950 p-3 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-yellow-400 opacity-75" />
                      <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-yellow-400" />
                    </span>
                    <span>Status: <span className="text-yellow-300">Waiting</span></span>
                  </div>
                  <div className="text-right">
                    <p className="text-[11px] text-muted-foreground">Invoice Expires In</p>
                    <p className="font-display text-base font-semibold text-emerald-400 tabular-nums">{mm}:{ss}</p>
                  </div>
                </div>

                <button onClick={reset} className="flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-zinc-950 px-4 py-2.5 text-sm hover:bg-zinc-900">
                  <RefreshCw className="h-4 w-4" /> New Payment
                </button>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className={`flex items-center justify-between ${bold ? "font-semibold" : "text-muted-foreground"}`}>
      <span>{label}</span>
      <span className={bold ? "text-emerald-400" : ""}>{value}</span>
    </div>
  );
}

function Stepper({ step }: { step: 1 | 2 | 3 }) {
  const items = [
    { n: 1, label: "Amount" },
    { n: 2, label: "Crypto & Network" },
    { n: 3, label: "Pay" },
  ];
  return (
    <div className="flex items-center gap-2">
      {items.map((it, i) => {
        const done = step > it.n;
        const active = step === it.n;
        return (
          <div key={it.n} className="flex flex-1 items-center gap-2">
            <div className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-semibold ${
              done ? "bg-emerald-500 text-black" : active ? "bg-emerald-500 text-black" : "bg-zinc-900 text-muted-foreground border border-border"
            }`}>
              {done ? <Check className="h-4 w-4" /> : it.n}
            </div>
            <span className={`text-xs ${active ? "text-foreground" : "text-muted-foreground"}`}>{it.label}</span>
            {i < items.length - 1 && <div className={`mx-1 h-px flex-1 ${step > it.n ? "bg-emerald-500" : "bg-border"}`} />}
          </div>
        );
      })}
    </div>
  );
}
