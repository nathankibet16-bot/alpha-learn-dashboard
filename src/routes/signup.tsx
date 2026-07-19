import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Check, Eye, EyeOff, KeyRound, Loader2, ShieldCheck } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { bypassVerifyEmail } from "@/lib/auth-actions.functions";
import { BrandHeader, Field, inputCls } from "./login";

export const Route = createFileRoute("/signup")({
  head: () => ({
    meta: [
      { title: "Create account — Alpha Trader Group" },
      { name: "description", content: "Create your Alpha Trader Group account." },
    ],
  }),
  component: SignupPage,
});

type Step = 1 | 2;

const CODE_LENGTH = 6;

function SignupPage() {
  const navigate = useNavigate();
  const bypassFn = useServerFn(bypassVerifyEmail);
  const [step, setStep] = useState<Step>(1);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.includes("@") || password.length < 6) {
      setErr("Fill all fields. Password must be at least 6 characters.");
      return;
    }
    setErr("");
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: name },
        emailRedirectTo: `${window.location.origin}/verify`,
      },
    });
    setLoading(false);
    if (error) {
      setErr(error.message);
      return;
    }
    setStep(2);
  };

  return (
    <div className="min-h-screen bg-zinc-950 px-4 py-10">
      <div className="mx-auto max-w-md">
        <BrandHeader />

        <div className="mt-8">
          <Stepper step={step} />
        </div>

        <div className="mt-6 rounded-2xl border border-border bg-card p-6 shadow-2xl">
          {step === 1 && (
            <form onSubmit={submit} className="space-y-4">
              <div>
                <h1 className="font-display text-2xl font-bold">Create your account</h1>
                <p className="mt-1 text-sm text-muted-foreground">Step 1 of 2 — your details</p>
              </div>
              <Field label="Full name">
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your full name" className={inputCls} required />
              </Field>
              <Field label="Email address">
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className={inputCls} required />
              </Field>
              <Field label="Password">
                <div className="relative">
                  <input type={show ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 6 characters" className={inputCls + " pr-10"} required />
                  <button type="button" onClick={() => setShow((s) => !s)} className="absolute inset-y-0 right-2 grid place-items-center text-muted-foreground hover:text-foreground">
                    {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </Field>
              {err && <p className="text-sm text-red-500">{err}</p>}
              <button disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-500 py-3 font-semibold text-black hover:bg-emerald-400 disabled:opacity-60">
                {loading && <Loader2 className="h-4 w-4 animate-spin" />} Continue
              </button>
              <p className="text-center text-sm text-muted-foreground">
                Already have an account? <Link to="/login" className="text-emerald-500 hover:underline">Sign in</Link>
              </p>
            </form>
          )}

          {step === 2 && (
            <OtpStep email={email} password={password} bypassFn={bypassFn} onDone={() => navigate({ to: "/dashboard" })} />
          )}
        </div>
      </div>
    </div>
  );
}

function OtpStep({ email, password, bypassFn, onDone }: { email: string; password: string; bypassFn: (args: { data: { code: string } }) => Promise<unknown>; onDone: () => void }) {
  const [digits, setDigits] = useState<string[]>(() => Array(CODE_LENGTH).fill(""));
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [showBypass, setShowBypass] = useState(false);
  const [bypass, setBypass] = useState("");
  const [cooldown, setCooldown] = useState(60);
  const inputs = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => {
    inputs.current[0]?.focus();
  }, []);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => setCooldown((c) => (c > 0 ? c - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  const code = digits.join("");

  const setDigit = (i: number, v: string) => {
    const clean = v.replace(/\D/g, "");
    if (!clean) {
      const next = [...digits];
      next[i] = "";
      setDigits(next);
      return;
    }
    const next = [...digits];
    const chars = clean.slice(0, CODE_LENGTH - i).split("");
    for (let k = 0; k < chars.length; k++) next[i + k] = chars[k];
    setDigits(next);
    const focusAt = Math.min(i + chars.length, CODE_LENGTH - 1);
    inputs.current[focusAt]?.focus();
  };

  const onKeyDown = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !digits[i] && i > 0) {
      inputs.current[i - 1]?.focus();
    } else if (e.key === "ArrowLeft" && i > 0) {
      inputs.current[i - 1]?.focus();
    } else if (e.key === "ArrowRight" && i < CODE_LENGTH - 1) {
      inputs.current[i + 1]?.focus();
    }
  };

  const verify = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setErr("");
    setMsg("");
    if (code.length < CODE_LENGTH) return;
    setLoading(true);
    const { error } = await supabase.auth.verifyOtp({ email, token: code, type: "signup" });
    setLoading(false);
    if (error) {
      setErr(error.message);
      return;
    }
    onDone();
  };

  const resend = async () => {
    if (cooldown > 0) return;
    setErr("");
    setMsg("");
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/verify`,
        },
      });
      if (error) throw error;
      setMsg("A new verification code has been sent. Please also check your spam / junk folder.");
      toast.success("Verification code re-sent.");
      setCooldown(60);
    } catch (ex) {
      const message = ex instanceof Error ? ex.message : "Could not resend the code.";
      const rateLimited = /rate|limit|too many|429/i.test(message);
      setErr(message);
      toast.error(
        rateLimited
          ? "Email provider is rate-limited. Please wait a minute and try again."
          : message,
      );
      setCooldown(30);
    }
  };

  const useBypass = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    setMsg("");
    setLoading(true);
    try {
      await bypassFn({ data: { code: bypass.trim() } });
      await supabase.auth.refreshSession();
      onDone();
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : "Invalid access code");
    } finally {
      setLoading(false);
    }
  };

  if (showBypass) {
    return (
      <form onSubmit={useBypass} className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-full bg-emerald-500/10 text-emerald-500">
            <KeyRound className="h-5 w-5" />
          </div>
          <div>
            <h1 className="font-display text-xl font-bold">Fallback access code</h1>
            <p className="text-xs text-muted-foreground">Use if email is delayed</p>
          </div>
        </div>
        <Field label="Access code">
          <input value={bypass} onChange={(e) => setBypass(e.target.value)} placeholder="ALPHA-TRADER-CODE" className={inputCls + " uppercase tracking-widest"} required />
        </Field>
        {err && <p className="text-sm text-red-500">{err}</p>}
        <button disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-500 py-3 font-semibold text-black hover:bg-emerald-400 disabled:opacity-60">
          {loading && <Loader2 className="h-4 w-4 animate-spin" />} Unlock account
        </button>
        <button type="button" onClick={() => setShowBypass(false)} className="w-full text-center text-sm text-muted-foreground hover:text-foreground">
          ← Back to code entry
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={verify} className="space-y-5">
      <div className="text-center">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-emerald-500/10 text-emerald-500">
          <ShieldCheck className="h-7 w-7" />
        </div>
        <h1 className="mt-4 font-display text-2xl font-bold">Enter verification code</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          We sent a 6-digit code to <span className="text-foreground">{email}</span>
        </p>
      </div>

      <div className="flex justify-center gap-1.5">
        {digits.map((d, i) => (
          <input
            key={i}
            ref={(el) => { inputs.current[i] = el; }}
            value={d}
            onChange={(e) => setDigit(i, e.target.value)}
            onKeyDown={(e) => onKeyDown(i, e)}
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={CODE_LENGTH}
            className="h-14 w-10 rounded-lg border border-border bg-zinc-950 text-center font-display text-2xl font-bold text-foreground outline-none transition-colors focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30"
          />
        ))}
      </div>

      {err && <p className="text-center text-sm text-red-500">{err}</p>}
      {msg && <p className="text-center text-sm text-emerald-500">{msg}</p>}

      <button disabled={loading || code.length < CODE_LENGTH} className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-500 py-3 font-semibold text-black hover:bg-emerald-400 disabled:opacity-60">
        {loading && <Loader2 className="h-4 w-4 animate-spin" />} Verify & continue
      </button>

      <div className="flex items-center justify-between text-sm">
        <button
          type="button"
          onClick={resend}
          disabled={cooldown > 0}
          className="text-emerald-500 hover:underline disabled:cursor-not-allowed disabled:text-muted-foreground disabled:no-underline"
        >
          {cooldown > 0 ? `Resend code in ${cooldown}s` : "Resend code"}
        </button>
        <button type="button" onClick={() => setShowBypass(true)} className="text-muted-foreground hover:text-foreground">
          Didn't receive it?
        </button>
      </div>
      <p className="text-center text-xs text-muted-foreground">
        Don't see the email? Check your <span className="text-foreground">spam / junk</span> folder.
      </p>
    </form>
  );
}

function Stepper({ step }: { step: Step }) {
  return (
    <div className="flex items-center justify-center gap-3">
      {[1, 2].map((d, i) => {
        const done = step > d;
        const active = step === d;
        return (
          <div key={d} className="flex items-center gap-3">
            <div
              className={`grid h-9 w-9 place-items-center rounded-full border-2 text-sm font-semibold transition-colors ${
                done
                  ? "border-emerald-500 bg-emerald-500 text-black"
                  : active
                  ? "border-emerald-500 text-emerald-500"
                  : "border-border text-muted-foreground"
              }`}
            >
              {done ? <Check className="h-4 w-4" strokeWidth={3} /> : d}
            </div>
            {i < 1 && <div className={`h-0.5 w-16 ${step >= 2 ? "bg-emerald-500" : "bg-border"}`} />}
          </div>
        );
      })}
    </div>
  );
}
