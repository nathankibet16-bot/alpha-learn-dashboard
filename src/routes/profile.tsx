import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Menu, LogOut } from "lucide-react";
import { Sidebar } from "@/components/Sidebar";
import { getUser, setUser, type DemoUser } from "@/lib/auth";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [{ title: "Profile — AlphaGroup" }, { name: "description", content: "Manage your AlphaGroup simulation profile." }],
  }),
  component: Profile,
});

function Profile() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [user, setLocalUser] = useState<DemoUser | null>(null);

  useEffect(() => {
    const u = getUser();
    if (!u) navigate({ to: "/login" });
    else setLocalUser(u);
  }, [navigate]);

  if (!user) return null;

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
            {user.name[0]?.toUpperCase()}
          </div>
          <p className="mt-3 font-display text-xl font-semibold">{user.name}</p>
          <p className="text-sm text-muted-foreground">{user.email}</p>
          <p className="mt-4 text-xs uppercase tracking-widest text-muted-foreground">Demo balance</p>
          <p className="font-display text-3xl font-bold">${user.balance.toLocaleString()}</p>
        </div>
        <button
          onClick={() => { setUser(null); navigate({ to: "/login" }); }}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-500/40 bg-red-500/10 py-3 text-sm font-semibold text-red-500 hover:bg-red-500/20"
        >
          <LogOut className="h-4 w-4" /> Sign out of simulation
        </button>
      </main>
    </div>
  );
}
