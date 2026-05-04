export const fmtKRW = (n: number | null | undefined) => {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  return `${sign}₩${abs.toLocaleString("ko-KR", { maximumFractionDigits: 0 })}`;
};

export const fmtSignedKRW = (n: number | null | undefined) => {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  const sign = n > 0 ? "+" : n < 0 ? "-" : "";
  return `${sign}₩${Math.abs(n).toLocaleString("ko-KR", { maximumFractionDigits: 0 })}`;
};

export const fmtPct = (n: number | null | undefined, digits = 2) => {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  const sign = n > 0 ? "+" : "";
  return `${sign}${n.toFixed(digits)}%`;
};

export const fmtCompactKRW = (n: number) => {
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (abs >= 1e8) return `${sign}${(abs / 1e8).toFixed(1)}억`;
  if (abs >= 1e4) return `${sign}${(abs / 1e4).toFixed(0)}만`;
  return `${sign}${abs.toLocaleString("ko-KR")}`;
};
