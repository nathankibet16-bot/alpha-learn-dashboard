import { supabase } from "@/integrations/supabase/client";

const BALANCE_KEY_PREFIX = "alphatrader_balance_";
export const BALANCE_EVENT = "alphatrader:balance";

// Local cache mirrors the profiles.balance value. Server (profiles table) is the source of truth;
// the local mirror keeps the trading simulator responsive without an extra round-trip each tick.

export function getBalance(userId: string): number {
  if (typeof window === "undefined") return 10000;
  const raw = localStorage.getItem(BALANCE_KEY_PREFIX + userId);
  if (raw == null) return 10000;
  const n = Number(raw);
  return Number.isFinite(n) ? n : 10000;
}

function writeCache(userId: string, value: number) {
  if (typeof window === "undefined") return;
  const next = Math.max(0, Number(value.toFixed(2)));
  localStorage.setItem(BALANCE_KEY_PREFIX + userId, String(next));
  window.dispatchEvent(new CustomEvent(BALANCE_EVENT, { detail: { userId, value: next } }));
}

export async function setBalance(userId: string, value: number): Promise<number> {
  const next = Math.max(0, Number(value.toFixed(2)));
  writeCache(userId, next);
  await supabase.from("profiles").update({ balance: next }).eq("id", userId);
  // Re-dispatch after server confirms so any listener that polled in between resyncs.
  writeCache(userId, next);
  return next;
}

export function adjustBalance(userId: string, delta: number): number {
  const next = Math.max(0, Number((getBalance(userId) + delta).toFixed(2)));
  void setBalance(userId, next);
  return next;
}

// Refresh from the server. Call on load or after admin-driven changes.
export async function syncBalanceFromServer(userId: string): Promise<number | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("balance")
    .eq("id", userId)
    .maybeSingle();
  if (error || !data) return null;
  const val = Number(data.balance);
  writeCache(userId, val);
  return val;
}
