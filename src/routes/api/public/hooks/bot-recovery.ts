import { createFileRoute } from "@tanstack/react-router";

/**
 * Scheduled recovery for bot sessions stuck in running/stopping/settling.
 * Invoked every 2 minutes by pg_cron; threshold = 180s of inactivity.
 */
export const Route = createFileRoute("/api/public/hooks/bot-recovery")({
  server: {
    handlers: {
      POST: async () => {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data, error } = await supabaseAdmin.rpc("recover_stuck_bot_sessions", { _older_than_seconds: 180 });
        if (error) {
          console.error("[bot-recovery] failed", error);
          return Response.json({ ok: false, error: error.message }, { status: 500 });
        }
        return Response.json({ ok: true, recovered: data ?? 0 });
      },
      GET: async () => new Response("Bot recovery cron", { status: 200 }),
    },
  },
});
