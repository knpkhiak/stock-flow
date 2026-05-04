import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { getMarketSession, type SessionState } from "@/lib/marketSession";

interface Props {
  lastSyncAt?: string | null;
  onRefresh?: () => void;
  refreshing?: boolean;
}

/**
 * 페이지 우상단 공통 뱃지.
 * 장중: 초록 점멸 + "장중"
 * 장외: 회색 + "장 마감"
 * + 마지막 동기화 시각 + [새로고침] 버튼.
 */
export default function MarketSessionBadge({ lastSyncAt, onRefresh, refreshing }: Props) {
  const [session, setSession] = useState<SessionState>(getMarketSession());

  useEffect(() => {
    const id = setInterval(() => setSession(getMarketSession()), 60_000);
    return () => clearInterval(id);
  }, []);

  const isOpen = session === "open";
  return (
    <div className="flex items-center gap-2">
      <div
        className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium ${
          isOpen
            ? "bg-session-open/15 text-session-open"
            : "bg-session-closed/15 text-session-closed"
        }`}
      >
        <span
          className={`inline-block h-2 w-2 rounded-full ${
            isOpen ? "bg-session-open animate-pulse" : "bg-session-closed"
          }`}
        />
        {isOpen ? "장중" : "장 마감"}
        {lastSyncAt && (
          <span className="text-muted-foreground font-normal ml-1">
            · {new Date(lastSyncAt).toLocaleString("ko-KR", {
              month: "2-digit",
              day: "2-digit",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        )}
      </div>
      {onRefresh && (
        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={onRefresh} disabled={refreshing}>
          <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
        </Button>
      )}
    </div>
  );
}
