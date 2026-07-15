import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { Menu, ShieldCheck, Check, X, RefreshCw, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { Sidebar } from "@/components/Sidebar";
import { supabase } from "@/integrations/supabase/client";
import { useIsAdmin } from "@/lib/admin";
import { sendNotificationEmail } from "@/lib/notifications.functions";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin Dashboard — Alpha Trader Group" },
      { name: "description", content: "Administrative controls for Alpha Trader Group deposits and withdrawals." },
    ],
  }),
  component: AdminPage,
});

type Deposit = {
  id: string;
  user_email: string | null;
  amount: number;
  network: string;
  address: string;
  status: string;
  created_at: string;
};
type Withdrawal = {
  id: string;
  user_email: string | null;
  amount: number;
  network: string;
  wallet_address: string;
  status: string;
  created_at: string;
};

function AdminPage() {
  const navigate = useNavigate();
  const { loading, isAdmin } = useIsAdmin();
  const [open, setOpen] = useState(false);
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setRefreshing(true);
    const [d, w] = await Promise.all([
      supabase.from("deposits").select("id,user_email,amount,network,address,status,created_at").order("created_at", { ascending: false }).limit(100),
      supabase.from("withdrawals").select("id,user_email,amount,network,wallet_address,status,created_at").order("created_at", { ascending: false }).limit(100),
    ]);
    if (d.data) setDeposits(d.data as Deposit[]);
    if (w.data) setWithdrawals(w.data as Withdrawal[]);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    if (loading) return;
    if (!isAdmin) { navigate({ to: "/dashboard", replace: true }); return; }
    void load();
  }, [loading, isAdmin, navigate, load]);

  const sendEmail = useServerFn(sendNotificationEmail);

  const firstName = (email: string | null) => (email?.split("@")[0] ?? "trader");

  const approveDeposit = async (id: string) => {
    setBusyId(id);
    const dep = deposits.find((x) => x.id === id);
    const { error } = await supabase.rpc("admin_approve_deposit", { _deposit_id: id });
    setBusyId(null);
    if (error) { toast.error(error.message); return; }
    toast.success("Deposit approved — balance credited");
    if (dep?.user_email) {
      sendEmail({ data: {
        template: "deposit-approved",
        to: dep.user_email,
        data: { name: firstName(dep.user_email), amount: Number(dep.amount).toFixed(2), network: dep.network },
        idempotencyKey: `deposit-approved-${id}`,
      } }).catch(() => {});
    }
    void load();
  };
  const rejectDeposit = async (id: string) => {
    setBusyId(id);
    const { error } = await supabase.rpc("admin_reject_deposit", { _deposit_id: id });
    setBusyId(null);
    if (error) { toast.error(error.message); return; }
    toast("Deposit rejected");
    void load();
  };
  const approveWithdrawal = async (id: string) => {
    setBusyId(id);
    const wd = withdrawals.find((x) => x.id === id);
    const { error } = await supabase.rpc("admin_approve_withdrawal", { _withdrawal_id: id });
    setBusyId(null);
    if (error) { toast.error(error.message); return; }
    toast.success("Withdrawal completed");
    if (wd?.user_email) {
      sendEmail({ data: {
        template: "withdrawal-completed",
        to: wd.user_email,
        data: { name: firstName(wd.user_email), amount: Number(wd.amount).toFixed(2), network: wd.network, wallet: wd.wallet_address },
        idempotencyKey: `withdrawal-completed-${id}`,
      } }).catch(() => {});
    }
    void load();
  };
  const rejectWithdrawal = async (id: string) => {
    setBusyId(id);
    const wd = withdrawals.find((x) => x.id === id);
    const { error } = await supabase.rpc("admin_reject_withdrawal", { _withdrawal_id: id });
    setBusyId(null);
    if (error) { toast.error(error.message); return; }
    toast("Withdrawal rejected");
    if (wd?.user_email) {
      sendEmail({ data: {
        template: "withdrawal-rejected",
        to: wd.user_email,
        data: { name: firstName(wd.user_email), amount: Number(wd.amount).toFixed(2), network: wd.network },
        idempotencyKey: `withdrawal-rejected-${id}`,
      } }).catch(() => {});
    }
    void load();
  };

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center bg-[#09090b] text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin text-emerald-500" />
      </div>
    );
  }
  if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-[#09090b] text-foreground">
      <Sidebar open={open} onClose={() => setOpen(false)} />
      <header className="sticky top-0 z-30 border-b border-border bg-[#09090b]/90 backdrop-blur">
        <div className="flex items-center justify-between px-4 py-3">
          <button onClick={() => setOpen(true)} className="rounded-md p-2 hover:bg-accent">
            <Menu className="h-5 w-5" />
          </button>
          <h1 className="flex items-center gap-2 font-display text-lg font-semibold">
            <ShieldCheck className="h-5 w-5 text-emerald-500" /> Admin Dashboard
          </h1>
          <button onClick={load} className="rounded-md p-2 hover:bg-accent" title="Refresh">
            <RefreshCw className={`h-5 w-5 ${refreshing ? "animate-spin text-emerald-500" : ""}`} />
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-8 px-4 py-6">
        <section>
          <h2 className="mb-3 font-display text-lg font-semibold text-emerald-400">Pending Deposits</h2>
          <TableWrap>
            <table className="w-full text-left text-sm">
              <thead className="bg-zinc-950 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <Th>User Email</Th><Th>Amount</Th><Th>Network</Th><Th>Address</Th><Th>Time</Th><Th>Status</Th><Th>Actions</Th>
                </tr>
              </thead>
              <tbody>
                {deposits.length === 0 && (
                  <tr><td colSpan={7} className="p-6 text-center text-muted-foreground">No deposits yet.</td></tr>
                )}
                {deposits.map((d) => (
                  <tr key={d.id} className="border-t border-border">
                    <Td>{d.user_email ?? "—"}</Td>
                    <Td className="font-semibold text-emerald-400">${Number(d.amount).toFixed(2)}</Td>
                    <Td>{d.network}</Td>
                    <Td className="max-w-[180px]"><code className="block truncate text-xs">{d.address}</code></Td>
                    <Td className="text-xs text-muted-foreground">{new Date(d.created_at).toLocaleString()}</Td>
                    <Td><StatusBadge status={d.status} /></Td>
                    <Td>
                      {d.status === "pending" ? (
                        <div className="flex gap-2">
                          <ActionBtn onClick={() => approveDeposit(d.id)} busy={busyId === d.id} variant="approve" />
                          <ActionBtn onClick={() => rejectDeposit(d.id)} busy={busyId === d.id} variant="reject" />
                        </div>
                      ) : <span className="text-xs text-muted-foreground">—</span>}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableWrap>
        </section>

        <section>
          <h2 className="mb-3 font-display text-lg font-semibold text-emerald-400">Pending Withdrawals</h2>
          <TableWrap>
            <table className="w-full text-left text-sm">
              <thead className="bg-zinc-950 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <Th>User Email</Th><Th>Amount</Th><Th>Wallet</Th><Th>Network</Th><Th>Time</Th><Th>Status</Th><Th>Actions</Th>
                </tr>
              </thead>
              <tbody>
                {withdrawals.length === 0 && (
                  <tr><td colSpan={7} className="p-6 text-center text-muted-foreground">No withdrawals yet.</td></tr>
                )}
                {withdrawals.map((w) => (
                  <tr key={w.id} className="border-t border-border">
                    <Td>{w.user_email ?? "—"}</Td>
                    <Td className="font-semibold text-emerald-400">${Number(w.amount).toFixed(2)}</Td>
                    <Td className="max-w-[180px]"><code className="block truncate text-xs">{w.wallet_address}</code></Td>
                    <Td>{w.network}</Td>
                    <Td className="text-xs text-muted-foreground">{new Date(w.created_at).toLocaleString()}</Td>
                    <Td><StatusBadge status={w.status} /></Td>
                    <Td>
                      {w.status === "pending" ? (
                        <div className="flex gap-2">
                          <ActionBtn onClick={() => approveWithdrawal(w.id)} busy={busyId === w.id} variant="approve" />
                          <ActionBtn onClick={() => rejectWithdrawal(w.id)} busy={busyId === w.id} variant="reject" />
                        </div>
                      ) : <span className="text-xs text-muted-foreground">—</span>}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableWrap>
        </section>
      </main>
    </div>
  );
}

function TableWrap({ children }: { children: React.ReactNode }) {
  return <div className="overflow-x-auto rounded-2xl border border-border bg-black">{children}</div>;
}
function Th({ children }: { children: React.ReactNode }) {
  return <th className="px-3 py-2.5 font-medium">{children}</th>;
}
function Td({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-3 py-2.5 align-middle ${className}`}>{children}</td>;
}
function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending: "border-yellow-500/40 bg-yellow-500/10 text-yellow-300",
    approved: "border-emerald-500/40 bg-emerald-500/10 text-emerald-400",
    completed: "border-emerald-500/40 bg-emerald-500/10 text-emerald-400",
    rejected: "border-red-500/40 bg-red-500/10 text-red-400",
  };
  return (
    <span className={`rounded-full border px-2 py-0.5 text-[11px] uppercase tracking-wide ${map[status] ?? "border-border text-muted-foreground"}`}>
      {status}
    </span>
  );
}
function ActionBtn({ onClick, busy, variant }: { onClick: () => void; busy: boolean; variant: "approve" | "reject" }) {
  const approve = variant === "approve";
  return (
    <button
      onClick={onClick}
      disabled={busy}
      className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold disabled:opacity-60 ${
        approve ? "bg-emerald-500 text-black hover:bg-emerald-400" : "border border-red-500/40 bg-red-500/10 text-red-300 hover:bg-red-500/20"
      }`}
    >
      {approve ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
      {approve ? "Approve" : "Reject"}
    </button>
  );
}
