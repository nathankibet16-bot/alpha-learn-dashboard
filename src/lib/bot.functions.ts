import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { randomInt } from "crypto";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const ASSETS = [
  { symbol: "BTC/USDT", base: 67420, dp: 2 },
  { symbol: "ETH/USDT", base: 3540, dp: 2 },
  { symbol: "SOL/USDT", base: 168, dp: 2 },
  { symbol: "BNB/USDT", base: 612, dp: 2 },
  { symbol: "XRP/USDT", base: 0.62, dp: 4 },
] as const;

// Cryptographically-secure float in [0, 1)
function secureRand() {
  return randomInt(0, 2 ** 30) / 2 ** 30;
}

/** Start a server-authoritative bot session. Validates stake ≤ balance. */
export const startBotSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ stake: z.number().positive() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: sid, error } = await context.supabase.rpc("start_bot_session", { _stake: data.stake });
    if (error) throw new Error(error.message);
    return { session_id: sid as unknown as string };
  });

/**
 * Generate one server-side trade for the session and persist it.
 * ~10% chance of loss per tick → yields ~0-2 losses in a typical session.
 * Win: +10%-15% of stake. Loss: -20%-25% of stake. Caps enforced in RPC.
 */
export const tickBotTrade = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ session_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    // Read session to know stake
    const { data: session, error: sErr } = await context.supabase
      .from("bot_sessions").select("stake_amount,status").eq("id", data.session_id).maybeSingle();
    if (sErr) throw new Error(sErr.message);
    if (!session || session.status !== "running") throw new Error("Session not running");

    const stake = Number(session.stake_amount);
    const asset = ASSETS[randomInt(0, ASSETS.length)];
    const action = secureRand() < 0.5 ? "BUY" : "SELL";
    const drift = (secureRand() - 0.5) * 0.008;
    const entry = Number((asset.base * (1 + drift)).toFixed(asset.dp));
    const isWin = secureRand() < 0.9;

    let profit: number;
    let exit: number;
    if (isWin) {
      const pct = 0.10 + secureRand() * 0.05;
      profit = Number((stake * pct).toFixed(2));
      const dir = action === "BUY" ? 1 : -1;
      exit = Number((entry * (1 + dir * 0.0035)).toFixed(asset.dp));
    } else {
      const pct = 0.20 + secureRand() * 0.05;
      profit = -Number((stake * pct).toFixed(2));
      const dir = action === "BUY" ? -1 : 1;
      exit = Number((entry * (1 + dir * 0.0025)).toFixed(asset.dp));
    }

    const { data: res, error: rErr } = await context.supabase.rpc("record_bot_trade", {
      _session_id: data.session_id,
      _asset: asset.symbol,
      _action: action,
      _entry: entry,
      _exit: exit,
      _profit: profit,
      _is_win: isWin,
    });
    if (rErr) throw new Error(rErr.message);

    const r = res as { applied: number; realized_pnl: number; capped: boolean } | null;
    return {
      asset: asset.symbol,
      action,
      entry_price: entry,
      exit_price: exit,
      profit: r?.applied ?? profit,
      is_win: isWin,
      realized_pnl: r?.realized_pnl ?? 0,
      capped: r?.capped ?? false,
    };
  });

/** Settle a bot session atomically. Idempotent — safe to call twice. */
export const settleBotSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ session_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    // Mark stopping first (best-effort). settle_bot_session accepts any state and short-circuits if already settled.
    const { data: res, error } = await context.supabase.rpc("settle_bot_session", { _session_id: data.session_id });
    if (error) throw new Error(error.message);
    return res as {
      session_id: string;
      net_result: number;
      balance_before: number;
      balance_after: number;
      ledger_id: string;
      trade_count: number;
      loss_count: number;
      already_settled: boolean;
    };
  });

/** Fetch current session state (for realtime fallback / recovery UI). */
export const getBotSession = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ session_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: row } = await context.supabase
      .from("bot_sessions").select("*").eq("id", data.session_id).maybeSingle();
    return row;
  });
