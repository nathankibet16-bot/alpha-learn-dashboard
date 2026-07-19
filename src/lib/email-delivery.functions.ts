import { createServerFn } from "@tanstack/react-start";
import { listEmailLogs } from "@lovable.dev/email-js";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const LOG_STATUSES = ["accepted", "sent", "failed", "bounced", "rejected", "suppressed", "rate_limited", "complained", "unsubscribed"] as const;

const listSchema = z.object({
  status: z.enum(LOG_STATUSES).optional(),
});

const testSchema = z.object({
  recipient: z.string().trim().email(),
});

async function assertAdmin(context: { supabase: any; userId: string }) {
  const { data: isAdmin, error } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (error || !isAdmin) throw new Error("Not authorized");
}

export const getEmailDeliveryLogs = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => listSchema.parse(d ?? {}))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("Email provider is not configured");
    const logs = await listEmailLogs(
      { limit: 100, event_type: data.status === "accepted" ? "sent" : data.status },
      { apiKey },
    );
    return logs.data.map((event, index) => ({
      id: `${event.message_id ?? event.timestamp}-${index}`,
      recipient: event.recipient,
      email_type: event.tags?.[0] ?? event.event_type,
      provider: "lovable-email",
      provider_message_id: event.message_id ?? null,
      sender: "Alpha Traders <no-reply@notify.alphatradersgrp.com>",
      status: event.event_type === "sent" ? "accepted" : event.event_type,
      provider_status: event.status ?? event.event_type,
      error_code: ["rejected", "bounced", "complained", "suppressed", "rate_limited"].includes(event.event_type) ? (event.status ?? event.event_type) : null,
      error_message: null,
      environment: "production",
      created_at: event.timestamp,
    }));
  });

export const sendAdminTestEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => testSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { EMAIL_FROM, sendLoggedEmail } = await import("@/lib/email-delivery.server");
    const html = `
      <div style="background:#ffffff;padding:24px;font-family:Arial,Helvetica,sans-serif">
        <div style="max-width:560px;margin:0 auto;background:#0a0a0a;border:1px solid #1f2a24;border-radius:14px;padding:28px;color:#d1d5db">
          <p style="display:inline-block;background:#10b981;color:#000;padding:7px 12px;border-radius:999px;font-size:12px;font-weight:700;margin:0 0 20px">Alpha Traders</p>
          <h1 style="color:#fff;font-size:22px;margin:0 0 12px">Email delivery test</h1>
          <p style="font-size:15px;line-height:23px;margin:0">This is a harmless delivery test from Alpha Traders.</p>
        </div>
      </div>`;
    const text = "Alpha Traders\n\nEmail delivery test\n\nThis is a harmless delivery test from Alpha Traders.";
    const result = await sendLoggedEmail({
      recipient: data.recipient.toLowerCase(),
      emailType: "admin-test",
      subject: "Alpha Traders email delivery test",
      html,
      text,
      userId: context.userId,
      idempotencyKey: `admin-test-${context.userId}-${Date.now()}`,
    });
    return {
      accepted: result.accepted,
      status: result.status,
      providerMessageId: result.providerMessageId ?? null,
      providerStatus: result.providerStatus ?? null,
      sender: EMAIL_FROM,
      errorCode: result.errorCode ?? null,
    };
  });