import { EmailAPIError, sendLovableEmail } from "@lovable.dev/email-js";

export const EMAIL_PROVIDER = "lovable-email";
export const EMAIL_SENDER_DOMAIN = "notify.alphatradersgrp.com";
export const EMAIL_FROM = `Alpha Traders <no-reply@${EMAIL_SENDER_DOMAIN}>`;

type DeliveryStatus = "queued" | "accepted" | "delivered" | "bounced" | "rejected" | "complained" | "failed" | "suppressed";

export type SendLoggedEmailResult = {
  accepted: boolean;
  attemptId: string;
  providerMessageId?: string;
  providerStatus?: string;
  status: DeliveryStatus;
  errorCode?: string;
  retryable?: boolean;
};

type SendLoggedEmailInput = {
  recipient: string;
  emailType: string;
  subject: string;
  html: string;
  text: string;
  runId?: string;
  idempotencyKey?: string;
  userId?: string | null;
  sender?: string;
  senderDomain?: string;
  label?: string;
};

const nowIso = () => new Date().toISOString();

function environmentName() {
  return process.env.NODE_ENV === "production" ? "production" : "preview";
}

function maskRecipient(recipient: string) {
  const [local, domain] = recipient.split("@");
  if (!domain) return "invalid-recipient";
  return `${local.slice(0, 2)}***@${domain}`;
}

function sanitizeErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return message.replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/gi, "Bearer [redacted]").slice(0, 700);
}

function classifyError(error: unknown): { status: DeliveryStatus; code: string; providerStatus: string; retryable: boolean } {
  if (error instanceof EmailAPIError) {
    if (error.code === "recipient_suppressed") return { status: "suppressed", code: "recipient_suppressed", providerStatus: String(error.status), retryable: false };
    if (error.code === "domain_not_verified") return { status: "failed", code: "domain_not_verified", providerStatus: String(error.status), retryable: false };
    if (error.status === 401 || error.status === 403) return { status: "failed", code: error.code || "provider_authentication_failed", providerStatus: String(error.status), retryable: false };
    if (error.status === 429) return { status: "failed", code: "rate_limited", providerStatus: String(error.status), retryable: true };
    if (error.status >= 400 && error.status < 500) return { status: "rejected", code: error.code || "provider_rejected", providerStatus: String(error.status), retryable: false };
    return { status: "failed", code: error.code || "provider_error", providerStatus: String(error.status), retryable: error.retryable };
  }
  const message = sanitizeErrorMessage(error);
  if (/timeout/i.test(message)) return { status: "failed", code: "function_timeout", providerStatus: "timeout", retryable: true };
  if (/network|fetch/i.test(message)) return { status: "failed", code: "network_failure", providerStatus: "network", retryable: true };
  return { status: "failed", code: "unknown_error", providerStatus: "unknown", retryable: true };
}

async function updateAttempt(attemptId: string, values: Record<string, unknown>) {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await (supabaseAdmin as any).from("email_delivery_logs").update(values).eq("id", attemptId);
  } catch (error) {
    console.error("[email-delivery] log update failed", { attemptId, error: sanitizeErrorMessage(error) });
  }
}

export async function sendLoggedEmail(input: SendLoggedEmailInput): Promise<SendLoggedEmailResult> {
  const attemptId = crypto.randomUUID();
  const sender = input.sender || EMAIL_FROM;
  const senderDomain = input.senderDomain || EMAIL_SENDER_DOMAIN;
  const environment = environmentName();

  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await (supabaseAdmin as any).from("email_delivery_logs").insert({
      id: attemptId,
      user_id: input.userId ?? null,
      recipient: input.recipient,
      email_type: input.emailType,
      provider: EMAIL_PROVIDER,
      sender,
      status: "queued",
      environment,
    });
  } catch (error) {
    console.error("[email-delivery] log insert failed", { attemptId, recipient: maskRecipient(input.recipient), error: sanitizeErrorMessage(error) });
  }

  const apiKey = process.env.LOVABLE_API_KEY;
  console.info("[email-delivery] attempt", {
    attemptId,
    recipient: maskRecipient(input.recipient),
    emailType: input.emailType,
    provider: EMAIL_PROVIDER,
    sender,
    environment,
    apiKeyPresent: Boolean(apiKey),
  });

  if (!apiKey) {
    await updateAttempt(attemptId, {
      status: "failed",
      error_code: "missing_api_key",
      error_message: "Email provider API key is not configured",
      provider_status: "configuration_error",
      failed_at: nowIso(),
    });
    return { accepted: false, attemptId, status: "failed", errorCode: "missing_api_key", providerStatus: "configuration_error", retryable: false };
  }

  try {
    const response = await sendLovableEmail(
      {
        run_id: input.runId,
        to: input.recipient,
        from: sender,
        sender_domain: senderDomain,
        subject: input.subject,
        html: input.html,
        text: input.text,
        purpose: "transactional",
        label: input.label || input.emailType,
        idempotency_key: input.idempotencyKey,
      },
      { apiKey, sendUrl: process.env.LOVABLE_SEND_URL, idempotencyKey: input.idempotencyKey || input.runId },
    );

    if (response.success !== true || !response.message_id) {
      await updateAttempt(attemptId, {
        status: "rejected",
        provider_status: response.status || "not_accepted",
        error_code: "provider_not_accepted",
        error_message: "Email provider did not return an accepted message ID",
        failed_at: nowIso(),
      });
      console.warn("[email-delivery] not accepted", { attemptId, recipient: maskRecipient(input.recipient), providerStatus: response.status || "not_accepted" });
      return { accepted: false, attemptId, status: "rejected", providerStatus: response.status || "not_accepted", errorCode: "provider_not_accepted", retryable: false };
    }

    await updateAttempt(attemptId, {
      status: "accepted",
      provider_message_id: response.message_id,
      provider_status: response.status || "accepted",
      error_code: null,
      error_message: null,
    });
    console.info("[email-delivery] accepted", { attemptId, recipient: maskRecipient(input.recipient), providerMessageId: response.message_id });
    return { accepted: true, attemptId, providerMessageId: response.message_id, providerStatus: response.status || "accepted", status: "accepted" };
  } catch (error) {
    const classified = classifyError(error);
    await updateAttempt(attemptId, {
      status: classified.status,
      provider_status: classified.providerStatus,
      error_code: classified.code,
      error_message: sanitizeErrorMessage(error),
      failed_at: nowIso(),
    });
    console.warn("[email-delivery] failed", {
      attemptId,
      recipient: maskRecipient(input.recipient),
      status: classified.status,
      errorCode: classified.code,
      providerStatus: classified.providerStatus,
      retryable: classified.retryable,
    });
    return { accepted: false, attemptId, status: classified.status, providerStatus: classified.providerStatus, errorCode: classified.code, retryable: classified.retryable };
  }
}

export async function updateDeliveryEvent(messageId: string, status: DeliveryStatus, providerStatus: string) {
  if (!messageId) return;
  const values: Record<string, unknown> = { status, provider_status: providerStatus };
  if (status === "delivered") values.delivered_at = nowIso();
  if (["bounced", "rejected", "complained", "failed", "suppressed"].includes(status)) values.failed_at = nowIso();
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  await (supabaseAdmin as any).from("email_delivery_logs").update(values).eq("provider_message_id", messageId);
}