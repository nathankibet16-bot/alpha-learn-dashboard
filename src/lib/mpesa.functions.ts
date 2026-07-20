import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const CLOUDPAY_BASE = "https://www.pay.cloud.or.ke";

function normalizePhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  let n = digits;
  if (n.startsWith("0") && n.length === 10) n = "254" + n.slice(1);
  else if (n.startsWith("254") && n.length === 12) n = n;
  else if (n.length === 9 && (n.startsWith("7") || n.startsWith("1"))) n = "254" + n;
  else return null;
  if (!/^254(7|1)\d{8}$/.test(n)) return null;
  return n;
}

function genRef(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`.toUpperCase();
}

const DepositInput = z.object({
  amount_kes: z.number().int().positive(),
  phone: z.string().min(9),
});

/** Initiate an M-Pesa STK Push deposit through CloudPay. */
export const initiateMpesaDeposit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => DepositInput.parse(d))
  .handler(async ({ data, context }) => {
    const phone = normalizePhone(data.phone);
    if (!phone) throw new Error("Invalid Kenyan phone number");

    const { supabase, userId } = context;
    const { data: profile } = await supabase.from("profiles").select("email").eq("id", userId).maybeSingle();
    const { data: settings } = await supabase.from("mpesa_settings").select("*").eq("id", true).maybeSingle();
    if (!settings) throw new Error("Payment settings unavailable");
    if (!settings.deposits_enabled) throw new Error("M-Pesa deposits are temporarily disabled");
    if (data.amount_kes < settings.min_deposit_kes) throw new Error(`Minimum deposit is KES ${settings.min_deposit_kes}`);

    const fee = Number(settings.deposit_fee_kes);
    const total = data.amount_kes + fee;
    const rate = Number(settings.kes_to_usd_rate);
    const creditedUsd = Number((data.amount_kes / rate).toFixed(2));
    const internalRef = genRef("MPD");

    // Insert row in awaiting_customer state BEFORE calling provider (idempotency anchor)
    const { data: inserted, error: insErr } = await supabase.from("mpesa_deposits").insert({
      user_id: userId,
      user_email: profile?.email ?? null,
      internal_reference: internalRef,
      amount_kes: data.amount_kes,
      exchange_rate: rate,
      credited_amount_usd: creditedUsd,
      fee_kes: fee,
      total_paid_kes: total,
      phone,
      status: "awaiting_customer",
    }).select("id").single();
    if (insErr) throw new Error(insErr.message);

    // Call CloudPay
    const apiKey = process.env.CLOUDPAY_API_KEY;
    if (!apiKey) throw new Error("Payment provider not configured");

    let providerResponse: unknown = null;
    let providerRef: string | null = null;
    let checkoutRequestId: string | null = null;
    let ok = false;
    let providerError: string | null = null;
    try {
      const res = await fetch(`${CLOUDPAY_BASE}/api/wallet/deposit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": apiKey,
          Accept: "application/json",
        },
        body: JSON.stringify({ phone, amount: total, reference: internalRef }),
      });
      const text = await res.text();
      try { providerResponse = JSON.parse(text); } catch { providerResponse = { raw: text }; }
      ok = res.ok;
      const pr = providerResponse as Record<string, unknown> | null;
      if (pr) {
        providerRef = (pr.reference as string) || (pr.transaction_id as string) || (pr.id as string) || null;
        checkoutRequestId = (pr.checkout_request_id as string) || (pr.CheckoutRequestID as string) || null;
        if (!ok) providerError = (pr.message as string) || (pr.error as string) || `Provider returned ${res.status}`;
      }
    } catch (e) {
      providerResponse = { error: e instanceof Error ? e.message : "Provider unreachable" };
      providerError = "Could not reach payment provider";
      ok = false;
    }

    await supabase.from("mpesa_deposits").update({
      provider_reference: providerRef,
      checkout_request_id: checkoutRequestId,
      provider_response: providerResponse as never,
      status: ok ? "processing" : "failed",
      failure_reason: ok ? null : providerError,
    }).eq("id", inserted.id);

    if (!ok) throw new Error(providerError || "Failed to send M-Pesa request. Please try again.");

    return {
      deposit_id: inserted.id,
      internal_reference: internalRef,
      phone_masked: `${phone.slice(0, 6)}****${phone.slice(-3)}`,
      credited_usd: creditedUsd,
    };
  });


/** Poll deposit status from our DB (webhook updates it). */
export const getMpesaDepositStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ deposit_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: row } = await context.supabase
      .from("mpesa_deposits")
      .select("status,credited,mpesa_receipt,failure_reason")
      .eq("id", data.deposit_id)
      .eq("user_id", context.userId)
      .maybeSingle();
    return row ?? { status: "unknown", credited: false, mpesa_receipt: null, failure_reason: null };
  });

const WithdrawInput = z.object({
  amount_kes: z.number().int().positive(),
  phone: z.string().min(9),
});

/** Submit an M-Pesa withdrawal — reserves balance atomically, admin processes payout. */
export const submitMpesaWithdrawal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => WithdrawInput.parse(d))
  .handler(async ({ data, context }) => {
    const phone = normalizePhone(data.phone);
    if (!phone) throw new Error("Invalid Kenyan phone number");

    const { supabase } = context;
    const { data: settings } = await supabase.from("mpesa_settings").select("*").eq("id", true).maybeSingle();
    if (!settings) throw new Error("Payment settings unavailable");
    if (!settings.withdrawals_enabled) throw new Error("M-Pesa withdrawals are temporarily disabled");
    // Silently reject below minimum
    if (data.amount_kes < settings.min_withdrawal_kes) throw new Error("Enter a valid withdrawal amount.");
    if (data.amount_kes > settings.max_withdrawal_kes) throw new Error("Enter a valid withdrawal amount.");

    const rate = Number(settings.usd_to_kes_rate);
    const feePct = Number(settings.withdrawal_fee_percent);
    const feeFixed = Number(settings.withdrawal_fee_fixed_kes);
    const grossKes = data.amount_kes;
    const feeKes = Math.round(grossKes * (feePct / 100) + feeFixed);
    const netKes = grossKes - feeKes;
    const amountUsd = Number((grossKes / rate).toFixed(2));
    const internalRef = genRef("MPW");

    const { data: wid, error } = await supabase.rpc("reserve_mpesa_withdrawal", {
      _amount_usd: amountUsd,
      _exchange_rate: rate,
      _gross_kes: grossKes,
      _fee_kes: feeKes,
      _net_kes: netKes,
      _phone: phone,
      _internal_reference: internalRef,
    });
    if (error) throw new Error(error.message);

    return {
      withdrawal_id: wid as unknown as string,
      internal_reference: internalRef,
      net_kes: netKes,
      fee_kes: feeKes,
      amount_usd: amountUsd,
    };
  });
