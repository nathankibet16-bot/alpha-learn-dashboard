import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, ShieldCheck, KeyRound } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { bypassVerifyEmail } from "@/lib/auth-actions.functions";
import { BrandHeader, Field, inputCls } from "./login";

export const Route = createFileRoute("/verify")({
  head: () => ({
    meta: [
      { title: "Verify email — Alpha Trader Group" },
      { name: "description", content: "Verify your Alpha Trader Group email to access your account." },
    ],
  }),
  component: VerifyPage,
});

function VerifyPage() {
  const navigate = useNavigate();
  const bypassFn = useServerFn(bypassVerifyEmail);
  const [email, setEmail] = useState("");
  const [checking, setChecking] = useState(true);
  const [code, setCode] = useState("");
  const [bypass, setBypass] = useState("");
  const [showBypass, setShowBypass] = useState(false);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const user = data.user;
      if (!user) {
        navigate({ to: "/login", replace: true });
        return;
      }
      if (user.email_confirmed_at) {
        navigate({ to: "/dashboard", replace: true });
        return;
      }
      setEmail(user.email ?? "");
      setChecking(false);
    });
  }, [navigate]);

  const verify = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    setMsg("");
    setLoading(true);
    const { error } = await supabase.auth.verifyOtp({ email, token: code.trim(), type: "signup" });
    setLoading(false);
    if (error) {
      setErr(error.message);
      return;
    }
    navigate({ to: "/dashboard" });
  };

  const resend = async () => {
    setErr("");
    setMsg("");
    const { error } = await supabase.auth.resend({ type: "signup", email });
    if (error) setErr(error.message);
    else setMsg("Verification email re-sent.");
  };

  const useBypass = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    setMsg("");
    setLoading(true);
    try {
      await bypassFn({ data: { code: bypass.trim() } });
      // Refresh session to pick up email_confirmed_at
      await supabase.auth.refreshSession();
      navigate({ to: "/dashboard" });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Invalid access code");
    } finally {
      setLoading(false);
    }
  };

  if (checking) return <div className="min-h-screen bg-zinc-950" />;

  return (
    <div className="min-h-screen bg-zinc-950 px-4 py-10">
      <div className="mx-auto max-w-md">
        <BrandHeader />
        <div className="mt-8 rounded-2xl border border-border bg-card p-6 shadow-2xl">
          <div className="mb-5 flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-full bg-emerald-500/10 text-emerald-500">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h1 className="font-display text-xl font-bold">Verify your email</h1>
              <p className="text-xs text-muted-foreground">Code sent to {email || "your inbox"}</p>
            </div>
          </div>

          {!showBypass ? (
            <form onSubmit={verify} className="space-y-4">
              <Field label="6-digit verification code">
                <input
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="123456"
                  inputMode="numeric"
                  className={inputCls + " tracking-[0.5em] text-center text-lg"}
                  required
                />
              </Field>
              {err && <p className="text-sm text-red-500">{err}</p>}
              {msg && <p className="text-sm text-emerald-500">{msg}</p>}
              <button disabled={loading || code.length < 6} className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-500 py-3 font-semibold text-black hover:bg-emerald-400 disabled:opacity-60">
                {loading && <Loader2 className="h-4 w-4 animate-spin" />} Verify email
              </button>
              <div className="flex items-center justify-between text-sm">
                <button type="button" onClick={resend} className="text-emerald-500 hover:underline">
                  Resend code
                </button>
                <button type="button" onClick={() => setShowBypass(true)} className="text-muted-foreground hover:text-foreground">
                  Didn't receive it?
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={useBypass} className="space-y-4">
              <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3 text-xs text-muted-foreground">
                <KeyRound className="h-4 w-4 shrink-0 text-emerald-500" />
                <span>If email delivery is unavailable, enter the fallback access code provided by Alpha Trader Group support to unlock your account.</span>
              </div>
              <Field label="Fallback access code">
                <input
                  value={bypass}
                  onChange={(e) => setBypass(e.target.value)}
                  placeholder="ALPHA-TRADER-CODE"
                  className={inputCls + " uppercase tracking-widest"}
                  required
                />
              </Field>
              {err && <p className="text-sm text-red-500">{err}</p>}
              <button disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-500 py-3 font-semibold text-black hover:bg-emerald-400 disabled:opacity-60">
                {loading && <Loader2 className="h-4 w-4 animate-spin" />} Unlock account
              </button>
              <button type="button" onClick={() => setShowBypass(false)} className="w-full text-center text-sm text-muted-foreground hover:text-foreground">
                ← Back to code entry
              </button>
            </form>
          )}

          <button
            onClick={async () => { await supabase.auth.signOut(); navigate({ to: "/login" }); }}
            className="mt-6 w-full text-center text-xs text-muted-foreground hover:text-foreground"
          >
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}
