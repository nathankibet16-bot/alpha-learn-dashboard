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

function pickString(obj: Record<string, unknown> | null, ...keys: string[]): string | null {
  if (!obj) return null;
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === "string" && v.length > 0) return v;
  }
  return null;
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

    // Insert row in awaiting_customer state BEFORE calling provider (idempotency anchor).
    // credited defaults to false. Uses user's RLS client (INSERT policy allows this).
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

    console.log("[mpesa.initiate] created deposit", {
      deposit_id: inserted.id,
      internal_reference: internalRef,
      user_id: userId,
      amount_kes: data.amount_kes,
      total_paid_kes: total,
    });

    // Call CloudPay STK Push
    const apiKey = process.env.CLOUDPAY_API_KEY;
    if (!apiKey) throw new Error("Payment provider not configured");

    let providerResponse: unknown = null;
    let providerRef: string | null = null;
    let checkoutRequestId: string | null = null;
    let merchantRequestId: string | null = null;
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
      // Look at top-level AND nested "data" object (CloudPay sometimes wraps).
      const nested = (pr?.data && typeof pr.data === "object") ? pr.data as Record<string, unknown> : null;
      providerRef = pickString(pr, "reference", "transaction_id", "id", "provider_reference")
                 ?? pickString(nested, "reference", "transaction_id", "id", "provider_reference");
      checkoutRequestId = pickString(pr, "checkout_request_id", "CheckoutRequestID", "checkoutRequestID")
                       ?? pickString(nested, "checkout_request_id", "CheckoutRequestID", "checkoutRequestID");
      merchantRequestId = pickString(pr, "merchant_request_id", "MerchantRequestID", "merchantRequestID")
                       ?? pickString(nested, "merchant_request_id", "MerchantRequestID", "merchantRequestID");
      if (!ok) providerError = pickString(pr, "message", "error") ?? `Provider returned ${res.status}`;
    } catch (e) {
      providerResponse = { error: e instanceof Error ? e.message : "Provider unreachable" };
      providerError = "Could not reach payment provider";
      ok = false;
    }

    console.log("[mpesa.initiate] CloudPay response", {
      internal_reference: internalRef,
      ok,
      provider_reference: providerRef,
      checkout_request_id: checkoutRequestId,
      merchant_request_id: merchantRequestId,
      error: providerError,
    });

    // Persist provider IDs via SECURITY DEFINER RPC (bypasses missing UPDATE policy).
    const { error: attachErr } = await supabase.rpc("attach_mpesa_provider_ids", {
      _internal_reference: internalRef,
      _provider_reference: providerRef as unknown as string,
      _checkout_request_id: checkoutRequestId as unknown as string,
      _merchant_request_id: merchantRequestId as unknown as string,
      _provider_response: providerResponse as never,
      _status: ok ? "processing" : "failed",
      _failure_reason: (ok ? null : providerError) as unknown as string,
    });
    if (attachErr) {
      console.error("[mpesa.initiate] attach_mpesa_provider_ids failed", attachErr);
    }

    if (!ok) throw new Error(providerError || "Failed to send M-Pesa request. Please try again.");

    return {
      deposit_id: inserted.id,
      internal_reference: internalRef,
      phone_masked: `${phone.slice(0, 6)}****${phone.slice(-3)}`,
      credited_usd: creditedUsd,
      amount_kes: data.amount_kes,
    };
  });


/** Poll deposit status from our DB (webhook updates it). */
export const getMpesaDepositStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ deposit_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: row } = await context.supabase
      .from("mpesa_deposits")
      .select("status,credited,mpesa_receipt,failure_reason,amount_kes")
      .eq("id", data.deposit_id)
      .eq("user_id", context.userId)
      .maybeSingle();
    return row ?? { status: "unknown", credited: false, mpesa_receipt: null, failure_reason: null, amount_kes: 0 };
  });

/**
 * Backend fallback: if the webhook hasn't arrived, ask CloudPay for the
 * transaction status and, if successful, credit the wallet. Never calls
 * CloudPay from the browser. Idempotent — credit RPC returns silently if
 * already credited.
 */
export const queryMpesaDepositStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ deposit_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: dep } = await context.supabase
      .from("mpesa_deposits")
      .select("id,internal_reference,provider_reference,checkout_request_id,status,credited,mpesa_receipt")
      .eq("id", data.deposit_id)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (!dep) return { ok: false, reason: "not_found" as const };

    // If already terminal, nothing to do.
    if (dep.credited) return { ok: true, credited: true, status: "completed" as const };
    if (["failed", "cancelled", "expired"].includes(dep.status)) {
      return { ok: true, credited: false, status: dep.status as "failed" | "cancelled" | "expired" };
    }

    const apiKey = process.env.CLOUDPAY_API_KEY;
    if (!apiKey) return { ok: false, reason: "not_configured" as const };

    // Try the reference-based status endpoints CloudPay commonly exposes.
    // IMPORTANT: prefer provider_reference (CloudPay's own id, e.g. DEP-XXXX)
    // over our internal_reference (MPD-XXXX). Some CloudPay endpoints only
    // recognise their own reference and 404 on ours — a 404 is transport,
    // not a payment failure.
    const candidates = [
      dep.provider_reference
        ? `${CLOUDPAY_BASE}/api/wallet/deposit/status?reference=${encodeURIComponent(dep.provider_reference)}`
        : null,
      dep.provider_reference
        ? `${CLOUDPAY_BASE}/api/wallet/deposit/${encodeURIComponent(dep.provider_reference)}`
        : null,
      dep.checkout_request_id
        ? `${CLOUDPAY_BASE}/api/wallet/deposit/status?checkout_request_id=${encodeURIComponent(dep.checkout_request_id)}`
        : null,
      `${CLOUDPAY_BASE}/api/wallet/deposit/status?reference=${encodeURIComponent(dep.internal_reference)}`,
      `${CLOUDPAY_BASE}/api/wallet/deposit/${encodeURIComponent(dep.internal_reference)}`,
    ].filter((u): u is string => !!u);

    let payload: Record<string, unknown> | null = null;
    let httpOk = false;
    let lastHttpStatus = 0;
    for (const url of candidates) {
      try {
        const res = await fetch(url, {
          method: "GET",
          headers: { "X-API-Key": apiKey, Accept: "application/json" },
        });
        lastHttpStatus = res.status;
        const text = await res.text();
        try { payload = JSON.parse(text) as Record<string, unknown>; } catch { payload = { raw: text }; }
        if (res.ok) { httpOk = true; break; }
      } catch (e) {
        console.error("[mpesa.query] fetch failed", url, e);
      }
    }

    console.log("[mpesa.query] CloudPay status", {
      internal_reference: dep.internal_reference,
      provider_reference: dep.provider_reference,
      checkout_request_id: dep.checkout_request_id,
      http_ok: httpOk,
      http_status: lastHttpStatus,
      payload,
    });

    // Transport / provider unavailability MUST NOT mark the deposit failed.
    // Keep the row in its current pending/processing state and let the
    // webhook (or a later status check) resolve it.
    if (!httpOk || !payload) {
      return { ok: false, reason: "transient" as const, status: "processing" as const };
    }

    const nested = (payload.data && typeof payload.data === "object") ? payload.data as Record<string, unknown> : null;
    const source = nested ?? payload;
    const providerStatus = String(source.status ?? source.transaction_status ?? "").toLowerCase();
    const receipt = pickString(source, "mpesa_receipt", "receipt", "MpesaReceiptNumber");
    const provRef = pickString(source, "transaction_id", "provider_reference", "id");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    if (["success", "completed", "paid", "successful"].includes(providerStatus)) {
      const { error } = await supabaseAdmin.rpc("credit_mpesa_deposit", {
        _internal_reference: dep.internal_reference,
        _mpesa_receipt: receipt || `RCP-${Date.now()}`,
        _provider_reference: provRef || "",
        _provider_response: payload as never,
      });
      if (error) {
        console.error("[mpesa.query] credit failed", error);
        return { ok: false, reason: "credit_failed" as const };
      }
      console.log("[mpesa.query] wallet credited via status query", {
        internal_reference: dep.internal_reference,
      });
      return { ok: true, credited: true, status: "completed" as const };
    }

    // Only EXPLICIT final failures from the provider mark the row failed.
    // "error", "unknown", missing status, etc. are treated as transient.
    if (["failed", "cancelled", "canceled", "expired", "rejected"].includes(providerStatus)) {
      await supabaseAdmin.rpc("fail_mpesa_deposit", {
        _internal_reference: dep.internal_reference,
        _reason: pickString(source, "reason", "message") ?? providerStatus,
        _response: payload as never,
      });
      return { ok: true, credited: false, status: (providerStatus === "canceled" ? "cancelled" : providerStatus) as "failed" | "cancelled" | "expired" };
    }

    return { ok: true, credited: false, status: "processing" as const };
  });

const ManualDepositInput = z.object({
  amount_kes: z.number().int().positive(),
  phone: z.string().min(9),
  mpesa_code: z.string().trim().min(6).max(24),
});

/** Manual M-Pesa Till fallback — user submits their own transaction code for admin verification. Never credits directly. */
export const submitManualMpesaDeposit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => ManualDepositInput.parse(d))
  .handler(async ({ data, context }) => {
    const phone = normalizePhone(data.phone);
    if (!phone) throw new Error("Invalid Kenyan phone number");
    const code = data.mpesa_code.toUpperCase().replace(/\s+/g, "");
    if (!/^[A-Z0-9]{6,24}$/.test(code)) throw new Error("Invalid M-Pesa transaction code");

    const { supabase, userId } = context;
    const { data: profile } = await supabase.from("profiles").select("email").eq("id", userId).maybeSingle();
    const { data: settings } = await supabase.from("mpesa_settings").select("*").eq("id", true).maybeSingle();
    if (!settings) throw new Error("Payment settings unavailable");
    if (data.amount_kes < settings.min_deposit_kes) throw new Error(`Minimum deposit is KES ${settings.min_deposit_kes}`);

    const rate = Number(settings.kes_to_usd_rate);
    const creditedUsd = Number((data.amount_kes / rate).toFixed(2));
    const internalRef = genRef("MPM");

    // Reject duplicate M-Pesa codes (unique index also enforces this).
    const { data: existing } = await supabase
      .from("mpesa_deposits").select("id,credited,user_id").eq("mpesa_receipt", code).maybeSingle();
    if (existing) throw new Error("This M-Pesa code has already been submitted");

    const { data: inserted, error } = await supabase.from("mpesa_deposits").insert({
      user_id: userId,
      user_email: profile?.email ?? null,
      internal_reference: internalRef,
      amount_kes: data.amount_kes,
      exchange_rate: rate,
      credited_amount_usd: creditedUsd,
      fee_kes: 0,
      total_paid_kes: data.amount_kes,
      phone,
      mpesa_receipt: code,
      status: "awaiting_verification",
    }).select("id").single();
    if (error) {
      if (error.code === "23505" || /duplicate/i.test(error.message)) {
        throw new Error("This M-Pesa code has already been submitted");
      }
      throw new Error(error.message);
    }

    console.log("[mpesa.manual] submitted", { deposit_id: inserted.id, internal_reference: internalRef, code });
    return { deposit_id: inserted.id, internal_reference: internalRef };
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
