import { createEmailWebhookHandler } from "@lovable.dev/email-js";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/lovable/email/events")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apiKey = process.env.LOVABLE_API_KEY;
        if (!apiKey) return Response.json({ error: "Server configuration error" }, { status: 500 });

        const handler = createEmailWebhookHandler({
          apiKey,
          on: {
            "email.bounced": async (event) => {
              const { updateDeliveryEvent } = await import("@/lib/email-delivery.server");
              await updateDeliveryEvent(event.data.message_id, "bounced", event.type);
            },
            "email.complaint": async (event) => {
              const { updateDeliveryEvent } = await import("@/lib/email-delivery.server");
              await updateDeliveryEvent(event.data.message_id, "complained", event.type);
            },
            "email.unsubscribed": async (event) => {
              const { updateDeliveryEvent } = await import("@/lib/email-delivery.server");
              await updateDeliveryEvent(event.data.message_id, "suppressed", event.type);
            },
            "email.resubscribed": async (event) => {
              const { updateDeliveryEvent } = await import("@/lib/email-delivery.server");
              await updateDeliveryEvent(event.data.message_id, "accepted", event.type);
            },
          },
        });

        return handler(request);
      },
    },
  },
});