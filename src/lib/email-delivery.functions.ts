import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const LOG_STATUSES = ["accepted", "delivered", "failed", "bounced", "rejected", "suppressed"] as const;

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
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let query = (supabaseAdmin as any)
      .from("email_delivery_logs")
      .select("id,user_id,recipient,email_type,provider,provider_message_id,sender,status,provider_status,error_code,error_message,environment,created_at,delivered_at,failed_at")
      .order("created_at", { ascending: false })
      .limit(100);
    if (data.status) query = query.eq("status", data.status);
    const { data: rows, error } = await query;
    if (error) throw new Error(error.message);
    return rows ?? [];
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