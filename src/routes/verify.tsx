import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
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
  const [email, setEmail] = useState("");
  const [checking, setChecking] = useState(true);
  const [code, setCode] = useState("");
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

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
    setResending(true);
    try {
      const { error } = await supabase.auth.resend({ type: "signup", email });
      if (error) throw error;
      setMsg("Verification code sent.");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "We couldn’t send the verification email. Please try again.");
    } finally {
      setResending(false);
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

          <form onSubmit={verify} className="space-y-4">
              <Field label="8-digit verification code">
                <input
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 8))}
                  placeholder="12345678"
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
                <button type="button" onClick={resend} disabled={resending} className="text-emerald-500 hover:underline disabled:cursor-not-allowed disabled:text-muted-foreground disabled:no-underline">
                  {resending ? "Sending…" : "Resend code"}
                </button>
              </div>
            </form>

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
