import { createFileRoute } from "@tanstack/react-router";
import { createHmac, timingSafeEqual } from "crypto";

function pick(obj: Record<string, unknown> | null, ...keys: string[]): string {
  if (!obj) return "";
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === "string" && v.length > 0) return v;
    if (typeof v === "number") return String(v);
  }
  return "";
}

export const Route = createFileRoute("/api/public/webhooks/cloudpay")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const raw = await request.text();
        const secret = process.env.CLOUDPAY_WEBHOOK_SECRET;

        // If a signing secret is configured, verify HMAC-SHA256 signature
        if (secret) {
          const sig = request.headers.get("x-cloudpay-signature") || request.headers.get("x-signature") || "";
          const expected = createHmac("sha256", secret).update(raw).digest("hex");
          try {
            const a = Buffer.from(sig, "hex");
            const b = Buffer.from(expected, "hex");
            if (a.length !== b.length || !timingSafeEqual(a, b)) {
              console.warn("[cloudpay.webhook] invalid signature");
              return new Response("Invalid signature", { status: 401 });
            }
          } catch {
            return new Response("Invalid signature", { status: 401 });
          }
        }

        let payload: Record<string, unknown>;
        try { payload = JSON.parse(raw); }
        catch { return new Response("Invalid JSON", { status: 400 }); }

        // CloudPay may nest fields under `data`
        const nested = (payload.data && typeof payload.data === "object")
          ? payload.data as Record<string, unknown>
          : null;
        const src = nested ?? payload;

        const status = String(src.status ?? src.transaction_status ?? payload.status ?? "").toLowerCase();
        const internalRef = pick(src, "reference", "internal_reference", "merchant_reference")
                         || pick(payload, "reference", "internal_reference", "merchant_reference");
        const receipt = pick(src, "mpesa_receipt", "receipt", "MpesaReceiptNumber")
                     || pick(payload, "mpesa_receipt", "receipt", "MpesaReceiptNumber");
        const providerRef = pick(src, "transaction_id", "provider_reference", "id")
                         || pick(payload, "transaction_id", "provider_reference", "id");
        const checkoutId = pick(src, "checkout_request_id", "CheckoutRequestID", "checkoutRequestID")
                        || pick(payload, "checkout_request_id", "CheckoutRequestID", "checkoutRequestID");

        console.log("[cloudpay.webhook] received", {
          status,
          internal_reference: internalRef,
          provider_reference: providerRef,
          checkout_request_id: checkoutId,
          receipt,
        });

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        // Resolve the deposit's internal_reference from ANY id the callback carries.
        let resolvedRef = internalRef;
        if (!resolvedRef && (providerRef || checkoutId)) {
          const { data: rref } = await supabaseAdmin.rpc("resolve_mpesa_deposit_ref", {
            _internal_reference: internalRef || (null as unknown as string),
            _provider_reference: providerRef || (null as unknown as string),
            _checkout_request_id: checkoutId || (null as unknown as string),
          });
          resolvedRef = (rref as unknown as string) || "";
          console.log("[cloudpay.webhook] resolved reference", { resolvedRef });
        }

        if (!resolvedRef) {
          console.error("[cloudpay.webhook] no matching deposit for payload", payload);
          return new Response("Missing reference", { status: 400 });
        }

        const success = ["success", "completed", "paid", "successful"].includes(status);
        const failed = ["failed", "cancelled", "canceled", "expired", "error"].includes(status);

        if (success) {
          const { error } = await supabaseAdmin.rpc("credit_mpesa_deposit", {
            _internal_reference: resolvedRef,
            _mpesa_receipt: receipt || `RCP-${Date.now()}`,
            _provider_reference: providerRef || "",
            _provider_response: payload as never,
          });
          if (error) {
            console.error("[cloudpay.webhook] credit failed", { resolvedRef, error });
            return new Response("Credit failed", { status: 500 });
          }
          console.log("[cloudpay.webhook] wallet credited", { resolvedRef, receipt });
        } else if (failed) {
          await supabaseAdmin.rpc("fail_mpesa_deposit", {
            _internal_reference: resolvedRef,
            _reason: (payload.reason as string) || (src.reason as string) || status || "Payment failed",
            _response: payload as never,
          });
          console.log("[cloudpay.webhook] marked failed", { resolvedRef, status });
        } else {
          console.log("[cloudpay.webhook] non-terminal status, ignoring", { status, resolvedRef });
        }

        return Response.json({ ok: true });
      },
      GET: async () => new Response("CloudPay webhook active", { status: 200 }),
    },
  },
});
