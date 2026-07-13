import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Menu, LogOut } from "lucide-react";
import type { User } from "@supabase/supabase-js";
import { Sidebar } from "@/components/Sidebar";
import { supabase } from "@/integrations/supabase/client";
import { getBalance } from "@/lib/auth";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [{ title: "Profile — Alpha Trader Group" }, { name: "description", content: "Manage your Alpha Trader Group profile." }],
  }),
  component: Profile,
});

function Profile() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) navigate({ to: "/login" });
      else setUser(data.user);
    });
  }, [navigate]);

  if (!user) return null;
  const name = (user.user_metadata?.full_name as string) || user.email?.split("@")[0] || "Trader";
  const balance = getBalance(user.id);

  return (
    <div className="min-h-screen bg-zinc-950">
      <Sidebar open={open} onClose={() => setOpen(false)} />
      <header className="sticky top-0 z-30 border-b border-border bg-zinc-950/90 backdrop-blur">
        <div className="flex items-center gap-3 px-4 py-3">
          <button onClick={() => setOpen(true)} className="rounded-md p-2 hover:bg-accent"><Menu className="h-5 w-5" /></button>
          <h1 className="font-display text-lg font-semibold">Profile</h1>
        </div>
      </header>
      <main className="mx-auto max-w-2xl space-y-6 px-4 py-6">
        <div className="rounded-2xl border border-border bg-card p-6 text-center">
          <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-emerald-500/20 text-2xl font-bold text-emerald-500">
            {name[0]?.toUpperCase()}
          </div>
          <p className="mt-3 font-display text-xl font-semibold">{name}</p>
          <p className="text-sm text-muted-foreground">{user.email}</p>
          <p className="mt-4 text-xs uppercase tracking-widest text-muted-foreground">Current Balance</p>
          <p className="font-display text-3xl font-bold">${balance.toLocaleString()}</p>
        </div>
        <button
          onClick={async () => { await supabase.auth.signOut(); navigate({ to: "/login" }); }}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-500/40 bg-red-500/10 py-3 text-sm font-semibold text-red-500 hover:bg-red-500/20"
        >
          <LogOut className="h-4 w-4" /> Sign out
        </button>
      </main>
    </div>
  );
}
