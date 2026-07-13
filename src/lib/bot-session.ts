const KEY = "alphatrader_bot_session";
const TRADE_COUNT_PREFIX = "alphatrader_trade_count_";
export const TRADE_COUNT_EVENT = "alphatrader:tradecount";

// Legacy static passkeys retained for backwards compatibility with previously activated sessions.
export const SYSTEM_PASSKEYS = ["ALPHA88", "MATRIX99", "ATG-ALPHA-2026"] as const;

export function isValidPasskey(input: string, firstName?: string | null): boolean {
  const v = input.trim().toUpperCase();
  if (!v) return false;
  if (SYSTEM_PASSKEYS.includes(v as (typeof SYSTEM_PASSKEYS)[number])) return true;
  if (firstName) {
    const dyn = `${firstName.trim().toUpperCase()}2026`;
    if (dyn.length > 4 && v === dyn) return true;
  }
  return false;
}

export function isBotActive(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(KEY) === "active";
}

export function activateBot() {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, "active");
}

export function deactivateBot() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(KEY);
}

export function getTradeCount(userId: string): number {
  if (typeof window === "undefined") return 0;
  const raw = localStorage.getItem(TRADE_COUNT_PREFIX + userId);
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

export function incrementTradeCount(userId: string): number {
  if (typeof window === "undefined") return 0;
  const next = getTradeCount(userId) + 1;
  localStorage.setItem(TRADE_COUNT_PREFIX + userId, String(next));
  window.dispatchEvent(new CustomEvent(TRADE_COUNT_EVENT, { detail: { userId, value: next } }));
  return next;
}
