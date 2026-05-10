import { useNavigate, useParams } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Globe, GlobeLock, Pencil } from "lucide-react";
import { useSharedIdea } from "@/hooks/useSharedIdeas";
import { useAuth } from "@/hooks/useAuth";
import { useLinkedTrades } from "@/hooks/useLinkedTrades";
import RichEditor from "@/components/ideas/RichEditor";
import AuthorBadge from "@/components/social/AuthorBadge";
import LikeButton from "@/components/social/LikeButton";
import CommentSection from "@/components/social/CommentSection";
import CertifiedBadge from "@/components/social/CertifiedBadge";
import MarketIcon from "@/components/MarketIcon";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function SharedDetail() {
  const { id } = useParams<{ id: string }>();
  const nav = useNavigate();
  const { user } = useAuth();
  const { idea, loading, refresh } = useSharedIdea(id);
  const { trades, buys, closes } = useLinkedTrades(id);

  if (loading) return <div className="text-center text-muted-foreground py-12">불러오는 중...</div>;
  if (!idea) return <div className="text-center text-muted-foreground py-12">노트를 찾을 수 없습니다.</div>;
  if (!idea.is_shared && idea.user_id !== user?.id) {
    return <div className="text-center text-muted-foreground py-12">비공개 노트입니다.</div>;
  }

  const isMine = user?.id === idea.user_id;

  const unshare = async () => {
    if (!confirm("공유를 해제하시겠습니까?")) return;
    const { error } = await supabase.from("ideas").update({ is_shared: false }).eq("id", idea.id);
    if (error) { toast.error(error.message); return; }
    toast.success("공유 해제되었습니다");
    refresh();
    nav("/shared");
  };

  // 인증 뱃지 계산
  let pnlInfo: { rate: number; status: string } | null = null;
  if (idea.share_pnl_rate && trades.length > 0) {
    const t = trades[0];
    const tBuys = buys.filter((b) => b.trade_id === t.id);
    const tCloses = closes.filter((c) => c.trade_id === t.id);
    const totalQty = tBuys.reduce((s, b) => s + Number(b.buy_quantity || 0), 0);
    const totalAmt = tBuys.reduce((s, b) => s + Number(b.buy_quantity || 0) * Number(b.buy_price || 0), 0);
    const avgEntry = totalQty > 0 ? totalAmt / totalQty : Number(t.entry_price || 0);
    let rate = 0;
    if (tCloses.length > 0) {
      const cQty = tCloses.reduce((s, c) => s + Number(c.close_quantity || 0), 0);
      const cAmt = tCloses.reduce((s, c) => s + Number(c.close_quantity || 0) * Number(c.close_price || 0), 0);
      const avgClose = cQty > 0 ? cAmt / cQty : 0;
      rate = avgEntry > 0 ? ((avgClose - avgEntry) / avgEntry) * 100 : 0;
    }
    pnlInfo = { rate, status: t.status };
  }

  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      <div className="flex items-center justify-between gap-2">
        <Button variant="ghost" size="sm" onClick={() => nav("/shared")}>
          <ArrowLeft className="h-4 w-4" />목록으로
        </Button>
        {isMine && (
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => nav(`/ideas/${idea.id}`)}>
              <Pencil className="h-4 w-4" />편집
            </Button>
            <Button size="sm" variant="outline" onClick={unshare}>
              <GlobeLock className="h-4 w-4" />공유 해제
            </Button>
          </div>
        )}
      </div>

      <Card className="glass-card p-6 space-y-4">
        <AuthorBadge userId={idea.user_id} timestamp={idea.shared_at} isMine={isMine} />
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Globe className="h-4 w-4 text-primary/70" />
            <h1 className="text-2xl font-semibold">{idea.title}</h1>
          </div>
          {idea.ticker && (
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              {idea.market && <MarketIcon market={idea.market} />}
              <span>{idea.ticker}</span>
            </div>
          )}
        </div>

        {idea.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {idea.tags.map((t) => (
              <span key={t} className="rounded bg-muted/40 px-2 py-0.5 text-xs text-muted-foreground">#{t}</span>
            ))}
          </div>
        )}

        {pnlInfo && (
          <div>
            <CertifiedBadge status={pnlInfo.status} pnlRate={pnlInfo.rate} />
          </div>
        )}
      </Card>

      <Card className="glass-card p-0 overflow-hidden">
        <RichEditor value={idea.content} onChange={() => {}} ideaId={idea.id} editable={false} />
      </Card>

      <Card className="glass-card p-6 space-y-2">
        <div className="flex items-center gap-3">
          <LikeButton targetType="shared_idea" targetId={idea.id} initialCount={idea.like_count} />
          <span className="text-xs text-muted-foreground">💬 {idea.comment_count}</span>
        </div>
      </Card>

      <Card className="glass-card p-6">
        <CommentSection targetType="shared_idea" targetId={idea.id} />
      </Card>
    </div>
  );
}
