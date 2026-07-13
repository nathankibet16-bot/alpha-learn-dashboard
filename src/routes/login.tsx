import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { setUser, getUser } from "@/lib/auth";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign in — AlphaGroup Simulation" },
      { name: "description", content: "Sign in to your AlphaGroup educational trading simulation account." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [err, setErr] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.includes("@") || password.length < 6) {
      setErr("Enter a valid email and password (6+ characters).");
      return;
    }
    const existing = getUser();
    const name = existing?.name ?? email.split("@")[0];
    setUser({ name, email, balance: existing?.balance ?? 10000 });
    navigate({ to: "/dashboard" });
  };

  return (
    <div className="min-h-screen bg-zinc-950 px-4 py-10">
      <div className="mx-auto max-w-md">
        <BrandHeader />
        <div className="mt-8 rounded-2xl border border-border bg-card p-6 shadow-2xl">
          <h1 className="font-display text-3xl font-bold">Welcome back</h1>
          <p className="mt-1 text-sm text-muted-foreground">Sign in to your simulation account</p>

          <form onSubmit={submit} className="mt-6 space-y-4">
            <Field label="Email address">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-lg border border-input bg-zinc-950 px-3 py-3 text-sm outline-none ring-emerald-500/50 focus:border-emerald-500 focus:ring-2"
              />
            </Field>
            <Field label="Password">
              <div className="relative">
                <input
                  type={show ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-lg border border-input bg-zinc-950 px-3 py-3 pr-10 text-sm outline-none ring-emerald-500/50 focus:border-emerald-500 focus:ring-2"
                />
                <button type="button" onClick={() => setShow((s) => !s)} className="absolute inset-y-0 right-2 grid place-items-center text-muted-foreground hover:text-foreground">
                  {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </Field>

            {err && <p className="text-sm text-red-500">{err}</p>}

            <button
              type="submit"
              className="w-full rounded-lg bg-emerald-500 py-3 font-semibold text-black transition-colors hover:bg-emerald-400 glow-emerald"
            >
              Sign in
            </button>
          </form>

          <p className="mt-5 text-center text-sm text-muted-foreground">
            Don't have an account?{" "}
            <Link to="/signup" className="text-emerald-500 hover:underline">
              Create account
            </Link>
          </p>
        </div>
        <p className="mt-6 text-center text-xs text-muted-foreground">
          For educational simulation only. Not financial advice.
        </p>
      </div>
    </div>
  );
}

export function BrandHeader() {
  return (
    <div className="flex items-center justify-center gap-3">
      <div className="grid h-11 w-11 place-items-center rounded-xl bg-emerald-500 font-display text-xl font-bold text-black">α</div>
      <div>
        <p className="font-display text-lg font-bold leading-none">AlphaGroup</p>
        <p className="text-xs text-emerald-500">Educational Simulation</p>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}
