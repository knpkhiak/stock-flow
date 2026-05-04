// Korean stock convention: 상승=빨강(profit), 하락=파랑(loss)
export const pnlClass = (n: number): string => {
  if (n > 0) return "text-profit";
  if (n < 0) return "text-loss";
  return "text-muted-foreground";
};

export const pnlSign = (n: number): string => (n > 0 ? "+" : "");

// Holding-day buckets per spec
export const holdingClass = (d: number): string => {
  if (d <= 20) return "text-hold-good";
  if (d <= 30) return "text-hold-warn";
  return "text-hold-bad";
};

export const fmtNum = (n: number): string =>
  new Intl.NumberFormat("ko-KR").format(n);

export const fmtSignedNum = (n: number): string =>
  `${pnlSign(n)}${fmtNum(Math.round(n))}`;
