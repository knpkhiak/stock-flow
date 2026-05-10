import { Activity, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  status: string; // OPEN | PARTIAL_CLOSE | CLOSED 등
  pnlRate: number; // % 단위
}

// 한국식: 빨강=수익, 파랑=손실
export default function CertifiedBadge({ status, pnlRate }: Props) {
  const closed = status === "CLOSED";
  const positive = pnlRate >= 0;
  const Icon = closed ? ShieldCheck : Activity;
  const sign = positive ? "+" : "";
  return (
    <span
      title="한국투자증권 API에서 자동 동기화된 매매 데이터입니다. 위조가 불가능해요."
      className={cn(
        "inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold border shadow-sm",
        closed
          ? "border-primary/40 bg-primary/15"
          : "border-border bg-muted/40 text-foreground",
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      <span className="text-foreground/90">{closed ? "한투 인증" : "진행 중"}</span>
      <span
        className="num tabular-nums"
        style={{ color: positive ? "hsl(var(--profit))" : "hsl(var(--loss))" }}
      >
        {sign}{pnlRate.toFixed(1)}%
      </span>
    </span>
  );
}
