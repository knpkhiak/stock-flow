export const MARKETS = ["국내", "해외", "암호화폐"] as const;
export type Market = (typeof MARKETS)[number];

export const marketColorVar = (m: string) =>
  m === "국내" ? "var(--market-domestic)"
  : m === "해외" ? "var(--market-overseas)"
  : "var(--market-crypto)";

export const marketTailwindBase = (m: string) =>
  m === "국내" ? "market-domestic"
  : m === "해외" ? "market-overseas"
  : "market-crypto";
