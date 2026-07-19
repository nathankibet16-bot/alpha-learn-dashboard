import { createFileRoute } from "@tanstack/react-router";
import { createHmac, timingSafeEqual } from "crypto";

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
              return new Response("Invalid signature", { status: 401 });
            }
          } catch {
            return new Response("Invalid signature", { status: 401 });
          }
        }

        let payload: Record<string, unknown>;
        try { payload = JSON.parse(raw); }
        catch { return new Response("Invalid JSON", { status: 400 }); }

        // Extract fields defensively — CloudPay payload shape may vary
        const status = String(payload.status ?? payload.transaction_status ?? "").toLowerCase();
        const internalRef =
          (payload.reference as string) ||
          (payload.internal_reference as string) ||
          (payload.merchant_reference as string) ||
          (payload.metadata as { reference?: string } | undefined)?.reference ||
          "";
        const receipt =
          (payload.mpesa_receipt as string) ||
          (payload.receipt as string) ||
          (payload.MpesaReceiptNumber as string) ||
          "";
        const providerRef =
          (payload.transaction_id as string) ||
          (payload.provider_reference as string) ||
          (payload.id as string) ||
          "";

        if (!internalRef) return new Response("Missing reference", { status: 400 });

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const success = ["success", "completed", "paid", "successful"].includes(status);
        const failed = ["failed", "cancelled", "canceled", "expired", "error"].includes(status);

        if (success) {
          const { error } = await supabaseAdmin.rpc("credit_mpesa_deposit", {
            _internal_reference: internalRef,
            _mpesa_receipt: receipt || `RCP-${Date.now()}`,
            _provider_reference: providerRef || "",
            _provider_response: payload as never,
          });
          if (error) {
            console.error("[cloudpay] credit failed", error);
            return new Response("Credit failed", { status: 500 });
          }
        } else if (failed) {
          await supabaseAdmin.rpc("fail_mpesa_deposit", {
            _internal_reference: internalRef,
            _reason: (payload.reason as string) || status || "Payment failed",
            _response: payload as never,
          });
        }

        return Response.json({ ok: true });
      },
      GET: async () => new Response("CloudPay webhook active", { status: 200 }),
    },
  },
});
