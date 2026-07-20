import { createFileRoute } from "@tanstack/react-router";

/**
 * Periodic hook: auto-expires stale M-Pesa deposits that never received a
 * webhook callback (default: older than 3 minutes). Safe to call repeatedly.
 */
export const Route = createFileRoute("/api/public/hooks/mpesa-recovery")({
  server: {
    handlers: {
      POST: async () => {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data, error } = await supabaseAdmin.rpc("expire_stuck_mpesa_deposits", {
          _older_than_seconds: 180,
        });
        if (error) {
          console.error("[mpesa-recovery] failed", error);
          return new Response(JSON.stringify({ ok: false, error: error.message }), {
            status: 500, headers: { "Content-Type": "application/json" },
          });
        }
        return Response.json({ ok: true, expired: data ?? 0 });
      },
      GET: async () => new Response("mpesa-recovery hook active", { status: 200 }),
    },
  },
});
