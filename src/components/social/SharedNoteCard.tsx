import { Card } from "@/components/ui/card";
import { Globe } from "lucide-react";
import MarketIcon from "@/components/MarketIcon";
import LikeButton from "./LikeButton";
import AuthorBadge from "./AuthorBadge";
import CertifiedBadge from "./CertifiedBadge";
import { useLinkedTrades } from "@/hooks/useLinkedTrades";
import { extractTextFromJSON } from "@/lib/extractText";
import type { Idea } from "@/types/idea";
import { useAuth } from "@/hooks/useAuth";

interface Props {
  idea: Idea;
  onClick?: () => void;
}

export default function SharedNoteCard({ idea, onClick }: Props) {
  const { user } = useAuth();
  const isMine = user?.id === idea.user_id;
  const preview = extractTextFromJSON(idea.content).slice(0, 200);
  const tagsShown = idea.tags.slice(0, 3);

  return (
    <Card
      onClick={onClick}
      className="glass-card p-4 cursor-pointer transition hover:-translate-y-0.5 hover:shadow-lg hover:border-primary/40 relative"
    >
      <div className="absolute top-3 right-3 text-primary/70" aria-label="공유 중">
        <Globe className="h-3.5 w-3.5" />
      </div>

      <div className="mb-3">
        <AuthorBadge userId={idea.user_id} timestamp={idea.shared_at} isMine={isMine} />
      </div>

      <h3 className="font-semibold text-base truncate mb-2 pr-6">{idea.title}</h3>

      {idea.ticker && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2">
          {idea.market && <MarketIcon market={idea.market} />}
          <span>{idea.ticker}</span>
        </div>
      )}

      {preview && <p className="text-xs text-muted-foreground line-clamp-3 mb-3">{preview}</p>}

      {tagsShown.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {tagsShown.map((t) => (
            <span key={t} className="rounded bg-muted/40 px-1.5 py-0.5 text-[10px] text-muted-foreground">#{t}</span>
          ))}
        </div>
      )}

      {idea.share_pnl_rate && <TradeBadgeMini ideaId={idea.id} />}

      <div className="flex items-center gap-3 mt-3 pt-2 border-t border-border/30">
        <LikeButton targetType="shared_idea" targetId={idea.id} initialCount={idea.like_count} size="sm" />
        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
          💬 <span className="num">{idea.comment_count}</span>
        </span>
      </div>
    </Card>
  );
}

function TradeBadgeMini({ ideaId }: { ideaId: string }) {
  const { trades, buys, closes, loading } = useLinkedTrades(ideaId);
  if (loading || trades.length === 0) return null;
  // 합산 평균 (수익률 가중평균은 단순화 — 평균 사용)
  const t = trades[0];
  const tradeBuys = buys.filter((b) => b.trade_id === t.id);
  const tradeCloses = closes.filter((c) => c.trade_id === t.id);
  const totalQty = tradeBuys.reduce((s, b) => s + Number(b.buy_quantity || 0), 0);
  const totalAmt = tradeBuys.reduce((s, b) => s + Number(b.buy_quantity || 0) * Number(b.buy_price || 0), 0);
  const avgEntry = totalQty > 0 ? totalAmt / totalQty : Number(t.entry_price || 0);

  let pnlRate = 0;
  if (t.status === "CLOSED" && tradeCloses.length > 0) {
    const closeQty = tradeCloses.reduce((s, c) => s + Number(c.close_quantity || 0), 0);
    const closeAmt = tradeCloses.reduce((s, c) => s + Number(c.close_quantity || 0) * Number(c.close_price || 0), 0);
    const avgClose = closeQty > 0 ? closeAmt / closeQty : 0;
    pnlRate = avgEntry > 0 ? ((avgClose - avgEntry) / avgEntry) * 100 : 0;
  } else {
    // OPEN/PARTIAL: 청산된 부분만 표기
    if (tradeCloses.length > 0) {
      const closeQty = tradeCloses.reduce((s, c) => s + Number(c.close_quantity || 0), 0);
      const closeAmt = tradeCloses.reduce((s, c) => s + Number(c.close_quantity || 0) * Number(c.close_price || 0), 0);
      const avgClose = closeQty > 0 ? closeAmt / closeQty : 0;
      pnlRate = avgEntry > 0 ? ((avgClose - avgEntry) / avgEntry) * 100 : 0;
    }
  }
  return (
    <div className="mt-2">
      <CertifiedBadge status={t.status} pnlRate={pnlRate} />
    </div>
  );
}
