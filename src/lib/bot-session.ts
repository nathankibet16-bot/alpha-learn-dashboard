const KEY = "alphatrader_bot_session";
export const BOT_PASSKEY = "ATG-ALPHA-2026";

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
