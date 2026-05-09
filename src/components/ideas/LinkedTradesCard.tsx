import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import MarketIcon from "@/components/MarketIcon";
import { fmtSignedKRW } from "@/lib/format";
import { useLinkedTrades } from "@/hooks/useLinkedTrades";

export default function LinkedTradesCard({ ideaId }: { ideaId: string }) {
  const nav = useNavigate();
  const { trades, buys, closes, loading } = useLinkedTrades(ideaId);

  if (loading) return <div className="text-sm text-muted-foreground">불러오는 중...</div>;
  if (!trades.length) {
    return <div className="text-sm text-muted-foreground">아직 연결된 매매가 없습니다.</div>;
  }

  const totalRealized = closes.reduce((s, c) => s + Number(c.realized_pnl || 0), 0);
  const wins = closes.filter((c) => Number(c.realized_pnl) > 0).length;

  return (
    <div className="space-y-3">
      {trades.length > 1 && (
        <Card className="glass-card p-4">
          <h4 className="text-sm font-semibold mb-2">📊 이 아이디어의 매매 성과</h4>
          <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
            <div>연결된 매매: {trades.length}건</div>
            <div>누적 실현: <span className="num">{fmtSignedKRW(totalRealized)}</span></div>
            <div>청산 횟수: {closes.length}회</div>
            <div>승률: {closes.length ? `${((wins / closes.length) * 100).toFixed(1)}%` : "—"}</div>
          </div>
        </Card>
      )}

      {trades.map((t) => {
        const tBuys = buys.filter((b) => b.trade_id === t.id);
        const tCloses = closes.filter((c) => c.trade_id === t.id);
        const realized = tCloses.reduce((s, c) => s + Number(c.realized_pnl || 0), 0);
        return (
          <Card key={t.id} className="glass-card p-4">
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                <MarketIcon market={t.market} />
                <span className="font-medium text-sm">{t.name}</span>
                <span className="text-xs text-muted-foreground">({t.ticker})</span>
              </div>
              <span className="text-[11px] text-muted-foreground">{t.status}</span>
            </div>
            <div className="text-xs text-muted-foreground mb-3">
              진입 {t.entry_date} · 평균진입가 <span className="num">{Number(t.entry_price).toLocaleString()}</span>
            </div>

            {tBuys.length > 0 && (
              <details className="text-xs mb-2">
                <summary className="cursor-pointer text-muted-foreground">매수 히스토리 ({tBuys.length}건)</summary>
                <ul className="mt-1 space-y-0.5 pl-3">
                  {tBuys.map((b) => (
                    <li key={b.id} className="num">
                      {b.buy_date} · {b.buy_quantity}주 @ {Number(b.buy_price).toLocaleString()}
                    </li>
                  ))}
                </ul>
              </details>
            )}

            {tCloses.length > 0 && (
              <details className="text-xs mb-2" open>
                <summary className="cursor-pointer text-muted-foreground">청산 히스토리 ({tCloses.length}건)</summary>
                <ul className="mt-1 space-y-0.5 pl-3">
                  {tCloses.map((c) => (
                    <li key={c.id} className="num">
                      {c.close_date} · {c.close_quantity}주 @ {Number(c.close_price).toLocaleString()} ·{" "}
                      <span style={{ color: Number(c.realized_pnl) >= 0 ? "hsl(var(--profit))" : "hsl(var(--loss))" }}>
                        {fmtSignedKRW(Number(c.realized_pnl))}
                      </span>
                    </li>
                  ))}
                </ul>
              </details>
            )}

            <div className="flex items-center justify-between mt-2">
              <div className="text-xs">
                보유 {Number(t.remaining_quantity)}주 · 누적 실현{" "}
                <span className="num" style={{ color: realized >= 0 ? "hsl(var(--profit))" : "hsl(var(--loss))" }}>
                  {fmtSignedKRW(realized)}
                </span>
              </div>
              <Button size="sm" variant="ghost" onClick={() => nav("/trades")}>매매기록 →</Button>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
