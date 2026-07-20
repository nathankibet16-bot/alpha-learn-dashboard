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
 * Paced so 80% profit cap is reached over ~10–15 min (≈40–60 trades at 15s cadence).
 * Win: +1.5%–2.2% of stake. Loss: -2%–3% of stake. Caps enforced in RPC.
 */
export const tickBotTrade = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ session_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    // Read session to know stake
    const { data: session, error: sErr } = await context.supabase
      .from("bot_sessions").select("stake_amount,status,started_at,realized_pnl").eq("id", data.session_id).maybeSingle();
    if (sErr) throw new Error(sErr.message);
    if (!session || session.status !== "running") throw new Error("Session not running");

    const stake = Number(session.stake_amount);
    const realized = Number(session.realized_pnl ?? 0);
    const elapsedSec = (Date.now() - new Date(session.started_at as string).getTime()) / 1000;
    const asset = ASSETS[randomInt(0, ASSETS.length)];
    const action = secureRand() < 0.5 ? "BUY" : "SELL";
    const drift = (secureRand() - 0.5) * 0.008;
    const entry = Number((asset.base * (1 + drift)).toFixed(asset.dp));
    const isWin = secureRand() < 0.96;

    // Variable payout by time window with a soft governor so we still land near
    // the 80% cap around the 10–15 min mark instead of overshooting early.
    // Boost windows: 60–150s and 360–480s → occasional larger wins.
    // Governor: if realized pnl is already ahead of the ideal glide-path
    // (linear to 80% of stake over 12 min), shrink payouts; if behind, allow bigger ones.
    const targetPct = Math.min(0.8, (elapsedSec / (12 * 60)) * 0.8);
    const currentPct = stake > 0 ? realized / stake : 0;
    const ahead = currentPct - targetPct; // >0 means ahead of schedule

    const inBoost1 = elapsedSec >= 60 && elapsedSec <= 150;
    const inBoost2 = elapsedSec >= 360 && elapsedSec <= 480;
    const boostRoll = secureRand();
    // In boost windows, ~35% chance of a chunky payout; otherwise small/steady
    const isBoost = (inBoost1 || inBoost2) && boostRoll < 0.35 && ahead < 0.05;

    let profit: number;
    let exit: number;
    if (isWin) {
      let pct: number;
      if (isBoost) {
        pct = 0.04 + secureRand() * 0.035;      // 4%–7.5% of stake
      } else if (ahead > 0.03) {
        pct = 0.003 + secureRand() * 0.007;     // cool-down: 0.3%–1%
      } else if (ahead < -0.05) {
        pct = 0.02 + secureRand() * 0.015;      // catch-up: 2%–3.5%
      } else {
        pct = 0.008 + secureRand() * 0.012;     // steady: 0.8%–2%
      }
      profit = Math.max(0.01, Number((stake * pct).toFixed(2)));
      const dir = action === "BUY" ? 1 : -1;
      exit = Number((entry * (1 + dir * 0.0035)).toFixed(asset.dp));
    } else {
      const pct = 0.015 + secureRand() * 0.015; // Loss: 1.5%–3% of stake
      profit = -Math.max(0.01, Number((stake * pct).toFixed(2)));
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
