import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { LayoutDashboard, LineChart, ScrollText, UserCircle, X, LogOut, Bot, ArrowDownToLine, ArrowUpFromLine, ShieldCheck, Sun, Moon } from "lucide-react";
import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useIsAdmin } from "@/lib/admin";
import { useTheme } from "@/lib/theme";

const baseLinks = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/markets", label: "Markets", icon: LineChart },
  { to: "/bot", label: "AI Trading Bot", icon: Bot },
  { to: "/deposit", label: "Deposit", icon: ArrowDownToLine },
  { to: "/withdraw", label: "Withdraw", icon: ArrowUpFromLine },
  { to: "/logs", label: "Analysis Logs", icon: ScrollText },
  { to: "/profile", label: "Profile", icon: UserCircle },
] as const;

export function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const { isAdmin } = useIsAdmin();
  const { theme, toggle } = useTheme();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
  }, []);

  const logout = async () => {
    await supabase.auth.signOut();
    onClose();
    navigate({ to: "/login" });
  };

  const name = (user?.user_metadata?.full_name as string) || user?.email?.split("@")[0] || "Trader";
  const links = isAdmin
    ? ([...baseLinks, { to: "/admin", label: "Admin Dashboard", icon: ShieldCheck }] as const)
    : baseLinks;

  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={onClose}
      />
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-border bg-zinc-950 transition-transform ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div className="flex items-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-emerald-500 text-black font-bold">
              α
            </div>
            <div>
              <p className="font-display text-sm font-semibold leading-none">Alpha Trader Group</p>
              <p className="text-xs text-emerald-500">Trader Portal</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-md p-1.5 hover:bg-accent">
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-4">
          {links.map((l) => {
            const active = pathname === l.to;
            const Icon = l.icon;
            return (
              <Link
                key={l.to}
                to={l.to}
                onClick={onClose}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                  active
                    ? "bg-emerald-500/10 text-emerald-500"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                }`}
              >
                <Icon className="h-4 w-4" />
                {l.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-border p-4">
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-full bg-emerald-500/20 text-emerald-500 font-semibold">
              {name[0]?.toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="truncate text-sm font-medium">{name}</p>
              <p className="truncate text-xs text-muted-foreground">{user?.email ?? ""}</p>
            </div>
            <button onClick={logout} className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground">
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
