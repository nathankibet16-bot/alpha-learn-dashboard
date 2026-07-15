import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const TEMPLATE_NAMES = [
  "deposit-submitted",
  "deposit-approved",
  "withdrawal-submitted",
  "withdrawal-completed",
  "withdrawal-rejected",
] as const;

const USER_TRIGGERED = new Set(["deposit-submitted", "withdrawal-submitted"]);
const ADMIN_TRIGGERED = new Set(["deposit-approved", "withdrawal-completed", "withdrawal-rejected"]);

const schema = z.object({
  template: z.enum(TEMPLATE_NAMES),
  to: z.string().email().optional(),
  data: z.object({
    name: z.string().optional(),
    amount: z.string().optional(),
    network: z.string().optional(),
    address: z.string().optional(),
    wallet: z.string().optional(),
  }).default({}),
  idempotencyKey: z.string().min(4).max(120),
});

export const sendNotificationEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => schema.parse(d))
  .handler(async ({ data, context }) => {
    // User-triggered emails always go to the authenticated user (ignore client `to`).
    // Admin-triggered emails require admin role and use the provided recipient.
    let recipient: string;
    if (USER_TRIGGERED.has(data.template)) {
      const email = (context.claims as { email?: string }).email;
      if (!email) throw new Error("No email on session");
      recipient = email;
    } else if (ADMIN_TRIGGERED.has(data.template)) {
      const { data: isAdmin, error } = await context.supabase.rpc("has_role", {
        _user_id: context.userId,
        _role: "admin",
      });
      if (error || !isAdmin) throw new Error("Not authorized");
      if (!data.to) throw new Error("Recipient required");
      recipient = data.to;
    } else {
      throw new Error("Unsupported template");
    }

    const { sendTemplateEmail } = await import("@/lib/email-templates/send-email");
    const result = await sendTemplateEmail(data.template, recipient, {
      templateData: data.data,
      idempotencyKey: data.idempotencyKey,
    });
    return { ok: true, sent: result.sent };
  });
