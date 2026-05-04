/**
 * KST 기준 정규장 판정.
 * - 평일 09:00~15:30 KST → "open"
 * - 그 외 (주말, 공휴일은 시간만으로는 알 수 없으나 KIS API가 종가 반환) → "closed"
 *
 * 해외/암호화폐는 일단 KST 기준으로 통일 (사양 J).
 */
export type SessionState = "open" | "closed";

export function getMarketSession(now: Date = new Date()): SessionState {
  // KST 시각 계산 (브라우저 timezone 무관)
  const kst = new Date(now.getTime() + (now.getTimezoneOffset() + 9 * 60) * 60_000);
  const day = kst.getUTCDay(); // 0=일, 6=토
  if (day === 0 || day === 6) return "closed";
  const minutes = kst.getUTCHours() * 60 + kst.getUTCMinutes();
  const open = 9 * 60;          // 09:00
  const close = 15 * 60 + 30;   // 15:30
  return minutes >= open && minutes < close ? "open" : "closed";
}

/** 가격 옆 부제: 장중="(실시간)" / 장외="(M/D 종가)" */
export function priceCaption(session: SessionState, asOf?: Date): string {
  if (session === "open") return "(실시간)";
  const d = asOf ?? new Date();
  return `(${d.getMonth() + 1}/${d.getDate()} 종가)`;
}
