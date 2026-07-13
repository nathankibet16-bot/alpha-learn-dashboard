const BALANCE_KEY_PREFIX = "alphatrader_balance_";

export function getBalance(userId: string): number {
  if (typeof window === "undefined") return 10000;
  const raw = localStorage.getItem(BALANCE_KEY_PREFIX + userId);
  if (raw == null) return 10000;
  const n = Number(raw);
  return Number.isFinite(n) ? n : 10000;
}

export function setBalance(userId: string, value: number) {
  if (typeof window === "undefined") return;
  localStorage.setItem(BALANCE_KEY_PREFIX + userId, String(Math.max(0, value)));
}
