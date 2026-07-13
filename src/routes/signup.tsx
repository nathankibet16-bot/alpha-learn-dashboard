import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Check, Eye, EyeOff, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
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

function SignupPage() {
  const navigate = useNavigate();
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
            <div className="text-center">
              <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-emerald-500/10">
                <div className="grid h-14 w-14 place-items-center rounded-full bg-emerald-500 text-black">
                  <Check className="h-8 w-8" strokeWidth={3} />
                </div>
              </div>
              <h1 className="mt-5 font-display text-3xl font-bold">Check your email</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                We sent a verification code to <span className="text-foreground">{email}</span>. Enter it on the next screen to activate your account.
              </p>
              <button
                onClick={() => navigate({ to: "/verify" })}
                className="mt-6 w-full rounded-lg bg-emerald-500 py-3 font-semibold text-black hover:bg-emerald-400"
              >
                Enter verification code
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
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
