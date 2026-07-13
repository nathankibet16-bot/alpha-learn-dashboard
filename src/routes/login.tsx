import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign in — Alpha Trader Group" },
      { name: "description", content: "Sign in to your Alpha Trader Group account." },
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
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setErr(error.message);
      return;
    }
    if (!data.user?.email_confirmed_at) {
      navigate({ to: "/verify" });
      return;
    }
    navigate({ to: "/dashboard" });
  };

  return (
    <div className="min-h-screen bg-zinc-950 px-4 py-10">
      <div className="mx-auto max-w-md">
        <BrandHeader />
        <div className="mt-8 rounded-2xl border border-border bg-card p-6 shadow-2xl">
          <h1 className="font-display text-3xl font-bold">Welcome back</h1>
          <p className="mt-1 text-sm text-muted-foreground">Sign in to your Alpha Trader Group account</p>

          <form onSubmit={submit} className="mt-6 space-y-4">
            <Field label="Email address">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className={inputCls}
              />
            </Field>
            <Field label="Password">
              <div className="relative">
                <input
                  type={show ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className={inputCls + " pr-10"}
                />
                <button type="button" onClick={() => setShow((s) => !s)} className="absolute inset-y-0 right-2 grid place-items-center text-muted-foreground hover:text-foreground">
                  {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </Field>

            {err && <p className="text-sm text-red-500">{err}</p>}

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-500 py-3 font-semibold text-black transition-colors hover:bg-emerald-400 disabled:opacity-60"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
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
      </div>
    </div>
  );
}

export function BrandHeader() {
  return (
    <div className="flex items-center justify-center gap-3">
      <div className="grid h-11 w-11 place-items-center rounded-xl bg-emerald-500 font-display text-xl font-bold text-black">α</div>
      <div>
        <p className="font-display text-lg font-bold leading-none">Alpha Trader Group</p>
        <p className="text-xs text-emerald-500">Trader Portal</p>
      </div>
    </div>
  );
}

export const inputCls =
  "w-full rounded-lg border border-input bg-zinc-950 px-3 py-3 text-sm outline-none ring-emerald-500/50 focus:border-emerald-500 focus:ring-2";

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}
