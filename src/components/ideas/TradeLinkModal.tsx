import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import MarketIcon from "@/components/MarketIcon";
import type { Trade } from "@/pages/Trades";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  ideaId: string;
  onLinked?: () => void;
}

export default function TradeLinkModal({ open, onOpenChange, ideaId, onLinked }: Props) {
  const [openTrades, setOpenTrades] = useState<Trade[]>([]);
  const [linkedIds, setLinkedIds] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [otherLinks, setOtherLinks] = useState<Record<string, string>>({}); // tradeId -> existing idea_id
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    (async () => {
      const { data } = await supabase
        .from("trades")
        .select("*")
        .in("status", ["OPEN", "PARTIAL"])
        .order("entry_date", { ascending: false });
      const rows = (data as Trade[]) || [];
      setOpenTrades(rows);
      const linked = new Set<string>();
      const others: Record<string, string> = {};
      rows.forEach((t) => {
        if (t.idea_id === ideaId) linked.add(t.id);
        else if (t.idea_id) others[t.id] = t.idea_id;
      });
      setLinkedIds(linked);
      setSelected(new Set(linked));
      setOtherLinks(others);
    })();
  }, [open, ideaId]);

  const toggle = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else {
      if (otherLinks[id]) {
        if (!confirm("이 매매는 이미 다른 아이디어에 연결되어 있습니다. 변경하시겠습니까?")) return;
      }
      next.add(id);
    }
    setSelected(next);
  };

  const apply = async () => {
    setSaving(true);
    try {
      const toUnlink = [...linkedIds].filter((id) => !selected.has(id));
      const toLink = [...selected].filter((id) => !linkedIds.has(id));
      if (toUnlink.length) {
        await supabase.from("trades").update({ idea_id: null }).in("id", toUnlink);
      }
      if (toLink.length) {
        await supabase.from("trades").update({ idea_id: ideaId }).in("id", toLink);
        await supabase.from("ideas").update({ status: "entered" }).eq("id", ideaId);
      }
      toast.success(`매매 ${selected.size}건 연결됨`);
      onOpenChange(false);
      onLinked?.();
    } catch (e: any) {
      toast.error(`연결 실패: ${e.message}`);
    } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader><DialogTitle>매매 연결</DialogTitle></DialogHeader>
        <p className="text-sm text-muted-foreground">이 아이디어로 진입한 매매를 선택하세요.</p>
        {openTrades.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            현재 오픈 상태인 매매가 없습니다.<br />한투 MTS에서 매수 후 다시 시도해주세요.
          </div>
        ) : (
          <div className="max-h-80 overflow-y-auto space-y-1">
            {openTrades.map((t) => {
              const checked = selected.has(t.id);
              const otherLinked = !!otherLinks[t.id] && !linkedIds.has(t.id);
              return (
                <label
                  key={t.id}
                  className="flex items-center gap-3 rounded-md border border-border/40 p-2 cursor-pointer hover:bg-muted/30"
                >
                  <Checkbox checked={checked} onCheckedChange={() => toggle(t.id)} />
                  <MarketIcon market={t.market} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm truncate">{t.name} <span className="text-xs text-muted-foreground">({t.ticker})</span></div>
                    <div className="text-xs text-muted-foreground">진입 {t.entry_date} · {t.remaining_quantity}주 보유</div>
                  </div>
                  {otherLinked && <span className="text-[10px] text-warning">다른 아이디어와 연결됨</span>}
                </label>
              );
            })}
          </div>
        )}
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>취소</Button>
          <Button onClick={apply} disabled={saving || openTrades.length === 0}>적용</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
