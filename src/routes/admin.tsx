import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { Menu, ShieldCheck, Check, X, RefreshCw, Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { Sidebar } from "@/components/Sidebar";
import { supabase } from "@/integrations/supabase/client";
import { useIsAdmin } from "@/lib/admin";
import { sendNotificationEmail } from "@/lib/notifications.functions";
import { getEmailDeliveryLogs, sendAdminTestEmail } from "@/lib/email-delivery.functions";

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
type MpesaDep = { id: string; user_email: string | null; amount_kes: number; credited_amount_usd: number; phone: string; mpesa_receipt: string | null; status: string; credited: boolean; created_at: string };
type MpesaWd = { id: string; user_email: string | null; amount_usd: number; gross_amount_kes: number; net_amount_kes: number; phone: string; status: string; mpesa_receipt: string | null; created_at: string };
type EmailLog = { id: string; recipient: string; email_type: string; provider: string | null; provider_message_id: string | null; sender: string | null; status: string; provider_status: string | null; error_code: string | null; error_message: string | null; environment: string | null; created_at: string };
type EmailStatusFilter = "all" | "accepted" | "delivered" | "failed" | "bounced" | "rejected" | "suppressed";

function AdminPage() {
  const navigate = useNavigate();
  const { loading, isAdmin } = useIsAdmin();
  const [open, setOpen] = useState(false);
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [mpesaDeposits, setMpesaDeposits] = useState<MpesaDep[]>([]);
  const [mpesaWithdrawals, setMpesaWithdrawals] = useState<MpesaWd[]>([]);
  const [emailLogs, setEmailLogs] = useState<EmailLog[]>([]);
  const [emailFilter, setEmailFilter] = useState<EmailStatusFilter>("all");
  const [testRecipient, setTestRecipient] = useState("");
  const [testingEmail, setTestingEmail] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const sendEmail = useServerFn(sendNotificationEmail);
  const fetchEmailLogs = useServerFn(getEmailDeliveryLogs);
  const sendTestEmail = useServerFn(sendAdminTestEmail);

  const load = useCallback(async () => {
    setRefreshing(true);
    const [d, w, md, mw, el] = await Promise.all([
      supabase.from("deposits").select("id,user_email,amount,network,address,status,created_at").order("created_at", { ascending: false }).limit(100),
      supabase.from("withdrawals").select("id,user_email,amount,network,wallet_address,status,created_at").order("created_at", { ascending: false }).limit(100),
      supabase.from("mpesa_deposits").select("id,user_email,amount_kes,credited_amount_usd,phone,mpesa_receipt,status,credited,created_at").order("created_at", { ascending: false }).limit(100),
      supabase.from("mpesa_withdrawals").select("id,user_email,amount_usd,gross_amount_kes,net_amount_kes,phone,status,mpesa_receipt,created_at").order("created_at", { ascending: false }).limit(100),
      fetchEmailLogs({ data: { status: emailFilter === "all" ? undefined : emailFilter } }),
    ]);
    if (d.data) setDeposits(d.data as Deposit[]);
    if (w.data) setWithdrawals(w.data as Withdrawal[]);
    if (md.data) setMpesaDeposits(md.data as MpesaDep[]);
    if (mw.data) setMpesaWithdrawals(mw.data as MpesaWd[]);
    setEmailLogs(el as EmailLog[]);
    setRefreshing(false);
  }, [emailFilter, fetchEmailLogs]);

  useEffect(() => {
    if (loading) return;
    if (!isAdmin) { navigate({ to: "/dashboard", replace: true }); return; }
    void load();
  }, [loading, isAdmin, navigate, load]);

  const firstName = (email: string | null) => (email?.split("@")[0] ?? "trader");

  const submitTestEmail = async () => {
    if (!testRecipient.trim()) return;
    setTestingEmail(true);
    try {
      const result = await sendTestEmail({ data: { recipient: testRecipient.trim() } });
      if (result.accepted) {
        toast.success(`Email accepted: ${result.providerMessageId}`);
      } else {
        toast.error("Email was not accepted by the provider");
      }
      void load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Test email failed");
    } finally {
      setTestingEmail(false);
    }
  };

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
                      {(d.status === "pending" || d.status === "awaiting_confirmation") ? (
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

        <section>
          <h2 className="mb-3 font-display text-lg font-semibold text-emerald-400">M-Pesa Deposits</h2>
          <TableWrap>
            <table className="w-full text-left text-sm">
              <thead className="bg-zinc-950 text-xs uppercase tracking-wide text-muted-foreground">
                <tr><Th>User</Th><Th>Phone</Th><Th>KES</Th><Th>USD Credited</Th><Th>Receipt</Th><Th>Status</Th><Th>Time</Th></tr>
              </thead>
              <tbody>
                {mpesaDeposits.length === 0 && <tr><td colSpan={7} className="p-6 text-center text-muted-foreground">No M-Pesa deposits.</td></tr>}
                {mpesaDeposits.map((d) => (
                  <tr key={d.id} className="border-t border-border">
                    <Td>{d.user_email ?? "—"}</Td>
                    <Td className="text-xs">{d.phone}</Td>
                    <Td>KES {Number(d.amount_kes).toLocaleString("en-KE")}</Td>
                    <Td className="text-emerald-400">${Number(d.credited_amount_usd).toFixed(2)}</Td>
                    <Td className="text-xs">{d.mpesa_receipt ?? "—"}</Td>
                    <Td><StatusBadge status={d.status} /></Td>
                    <Td className="text-xs text-muted-foreground">{new Date(d.created_at).toLocaleString()}</Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableWrap>
        </section>

        <section>
          <h2 className="mb-3 font-display text-lg font-semibold text-emerald-400">M-Pesa Withdrawals</h2>
          <TableWrap>
            <table className="w-full text-left text-sm">
              <thead className="bg-zinc-950 text-xs uppercase tracking-wide text-muted-foreground">
                <tr><Th>User</Th><Th>Phone</Th><Th>USD</Th><Th>Gross KES</Th><Th>Net KES</Th><Th>Receipt</Th><Th>Status</Th><Th>Actions</Th></tr>
              </thead>
              <tbody>
                {mpesaWithdrawals.length === 0 && <tr><td colSpan={8} className="p-6 text-center text-muted-foreground">No M-Pesa withdrawals.</td></tr>}
                {mpesaWithdrawals.map((w) => (
                  <tr key={w.id} className="border-t border-border">
                    <Td>{w.user_email ?? "—"}</Td>
                    <Td className="text-xs">{w.phone}</Td>
                    <Td className="text-emerald-400">${Number(w.amount_usd).toFixed(2)}</Td>
                    <Td>KES {Number(w.gross_amount_kes).toLocaleString("en-KE")}</Td>
                    <Td>KES {Number(w.net_amount_kes).toLocaleString("en-KE")}</Td>
                    <Td className="text-xs">{w.mpesa_receipt ?? "—"}</Td>
                    <Td><StatusBadge status={w.status} /></Td>
                    <Td>
                      {w.status === "pending" ? (
                        <div className="flex gap-2">
                          <button disabled={busyId === w.id} onClick={async () => {
                            const receipt = window.prompt("Enter M-Pesa receipt from CloudPay dashboard:");
                            if (!receipt) return;
                            setBusyId(w.id);
                            const { error } = await supabase.rpc("admin_complete_mpesa_withdrawal", { _withdrawal_id: w.id, _mpesa_receipt: receipt, _provider_reference: receipt });
                            setBusyId(null);
                            if (error) toast.error(error.message); else { toast.success("Withdrawal completed"); void load(); }
                          }} className="rounded-md bg-emerald-500 px-2 py-1 text-xs font-semibold text-black hover:bg-emerald-400 disabled:opacity-60">Complete</button>
                          <button disabled={busyId === w.id} onClick={async () => {
                            const reason = window.prompt("Reason for refund:") ?? "Rejected";
                            setBusyId(w.id);
                            const { error } = await supabase.rpc("admin_refund_mpesa_withdrawal", { _withdrawal_id: w.id, _reason: reason });
                            setBusyId(null);
                            if (error) toast.error(error.message); else { toast("Refunded"); void load(); }
                          }} className="rounded-md border border-red-500/40 bg-red-500/10 px-2 py-1 text-xs font-semibold text-red-300 hover:bg-red-500/20 disabled:opacity-60">Refund</button>
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
          <div className="mb-3 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="font-display text-lg font-semibold text-emerald-400">Email Delivery</h2>
              <p className="text-xs text-muted-foreground">Provider acceptance, sender, and sanitized failure diagnostics.</p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <select value={emailFilter} onChange={(e) => setEmailFilter(e.target.value as EmailStatusFilter)} className="rounded-lg border border-border bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-emerald-500">
                {(["all", "accepted", "delivered", "failed", "bounced", "rejected", "suppressed"] as EmailStatusFilter[]).map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
              <div className="flex gap-2">
                <input value={testRecipient} onChange={(e) => setTestRecipient(e.target.value)} type="email" placeholder="test@example.com" className="w-48 rounded-lg border border-border bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-emerald-500" />
                <button onClick={submitTestEmail} disabled={testingEmail || !testRecipient.trim()} className="inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-3 py-2 text-sm font-semibold text-black hover:bg-emerald-400 disabled:opacity-60">
                  {testingEmail ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Test
                </button>
              </div>
            </div>
          </div>
          <TableWrap>
            <table className="w-full text-left text-sm">
              <thead className="bg-zinc-950 text-xs uppercase tracking-wide text-muted-foreground">
                <tr><Th>Recipient</Th><Th>Type</Th><Th>Sender</Th><Th>Provider ID</Th><Th>Status</Th><Th>Error</Th><Th>Environment</Th><Th>Date</Th></tr>
              </thead>
              <tbody>
                {emailLogs.length === 0 && <tr><td colSpan={8} className="p-6 text-center text-muted-foreground">No email diagnostics yet.</td></tr>}
                {emailLogs.map((log) => (
                  <tr key={log.id} className="border-t border-border">
                    <Td>{log.recipient}</Td>
                    <Td>{log.email_type}</Td>
                    <Td className="max-w-[180px]"><code className="block truncate text-xs">{log.sender ?? "—"}</code></Td>
                    <Td className="max-w-[170px]"><code className="block truncate text-xs">{log.provider_message_id ?? "—"}</code></Td>
                    <Td><StatusBadge status={log.status} /></Td>
                    <Td className="max-w-[240px]"><span className="block truncate text-xs text-muted-foreground">{log.error_code || log.error_message || log.provider_status || "—"}</span></Td>
                    <Td>{log.environment ?? "—"}</Td>
                    <Td className="text-xs text-muted-foreground">{new Date(log.created_at).toLocaleString()}</Td>
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
