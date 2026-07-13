import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Check, Eye, EyeOff } from "lucide-react";
import { setUser } from "@/lib/auth";
import { BrandHeader } from "./login";

export const Route = createFileRoute("/signup")({
  head: () => ({
    meta: [
      { title: "Create account — AlphaGroup Simulation" },
      { name: "description", content: "Create a free AlphaGroup account to explore the educational crypto market simulator." },
    ],
  }),
  component: SignupPage,
});

type Step = 1 | 2 | 3;

function SignupPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>(1);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [show, setShow] = useState(false);
  const [err, setErr] = useState("");

  const next1 = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.includes("@") || password.length < 6) {
      setErr("Fill all fields. Password must be 6+ characters.");
      return;
    }
    setErr("");
    setStep(2);
  };

  const next2 = (e: React.FormEvent) => {
    e.preventDefault();
    if (code.trim().length < 4) {
      setErr("Enter the 6-digit code from your email (any 4+ digits for demo).");
      return;
    }
    setErr("");
    setUser({ name, email, balance: 10000 });
    setStep(3);
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
            <form onSubmit={next1} className="space-y-4">
              <div>
                <h1 className="font-display text-2xl font-bold">Create your account</h1>
                <p className="mt-1 text-sm text-muted-foreground">Step 1 of 2 — your details</p>
              </div>
              <Field label="Full name">
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nathan Kibet" className={inputCls} />
              </Field>
              <Field label="Email address">
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className={inputCls} />
              </Field>
              <Field label="Password">
                <div className="relative">
                  <input type={show ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 6 characters" className={inputCls + " pr-10"} />
                  <button type="button" onClick={() => setShow((s) => !s)} className="absolute inset-y-0 right-2 grid place-items-center text-muted-foreground hover:text-foreground">
                    {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </Field>
              {err && <p className="text-sm text-red-500">{err}</p>}
              <button className="w-full rounded-lg bg-emerald-500 py-3 font-semibold text-black hover:bg-emerald-400 glow-emerald">Continue</button>
              <p className="text-center text-sm text-muted-foreground">
                Already have an account? <Link to="/login" className="text-emerald-500 hover:underline">Sign in</Link>
              </p>
            </form>
          )}

          {step === 2 && (
            <form onSubmit={next2} className="space-y-4">
              <div>
                <h1 className="font-display text-2xl font-bold">Verify your email</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  Step 2 of 2 — We sent a verification code to <span className="text-foreground">{email}</span>
                </p>
              </div>
              <Field label="Verification code">
                <input
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="123456"
                  inputMode="numeric"
                  className={inputCls + " tracking-[0.5em] text-center text-lg"}
                />
              </Field>
              {err && <p className="text-sm text-red-500">{err}</p>}
              <button className="w-full rounded-lg bg-emerald-500 py-3 font-semibold text-black hover:bg-emerald-400 glow-emerald">Verify & continue</button>
              <button type="button" onClick={() => setStep(1)} className="w-full text-center text-sm text-muted-foreground hover:text-foreground">
                ← Back
              </button>
            </form>
          )}

          {step === 3 && (
            <div className="text-center">
              <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-emerald-500/10">
                <div className="grid h-14 w-14 place-items-center rounded-full bg-emerald-500 text-black">
                  <Check className="h-8 w-8" strokeWidth={3} />
                </div>
              </div>
              <h1 className="mt-5 font-display text-3xl font-bold">Account created!</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Your email has been verified. You're ready to explore the simulator.
              </p>
              <button
                onClick={() => navigate({ to: "/dashboard" })}
                className="mt-6 w-full rounded-lg bg-emerald-500 py-3 font-semibold text-black hover:bg-emerald-400 glow-emerald"
              >
                Enter simulation dashboard
              </button>
              <Link to="/login" className="mt-3 block text-sm text-muted-foreground hover:text-foreground">
                Sign in to your account
              </Link>
            </div>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          AlphaGroup is a paper-trading learning tool. All balances are simulated.
        </p>
      </div>
    </div>
  );
}

const inputCls =
  "w-full rounded-lg border border-input bg-zinc-950 px-3 py-3 text-sm outline-none ring-emerald-500/50 focus:border-emerald-500 focus:ring-2";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

function Stepper({ step }: { step: Step }) {
  const dots = [1, 2] as const;
  return (
    <div className="flex items-center justify-center gap-3">
      {dots.map((d, i) => {
        const done = step > d || step === 3;
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
            {i < dots.length - 1 && (
              <div className={`h-0.5 w-16 ${step >= 2 ? "bg-emerald-500" : "bg-border"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}
