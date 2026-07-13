const BALANCE_KEY_PREFIX = "alphatrader_balance_";
export const BALANCE_EVENT = "alphatrader:balance";

export function getBalance(userId: string): number {
  if (typeof window === "undefined") return 10000;
  const raw = localStorage.getItem(BALANCE_KEY_PREFIX + userId);
  if (raw == null) return 10000;
  const n = Number(raw);
  return Number.isFinite(n) ? n : 10000;
}

export function setBalance(userId: string, value: number) {
  if (typeof window === "undefined") return;
  const next = Math.max(0, value);
  localStorage.setItem(BALANCE_KEY_PREFIX + userId, String(next));
  window.dispatchEvent(new CustomEvent(BALANCE_EVENT, { detail: { userId, value: next } }));
}

export function adjustBalance(userId: string, delta: number): number {
  const next = Math.max(0, getBalance(userId) + delta);
  setBalance(userId, next);
  return next;
}
