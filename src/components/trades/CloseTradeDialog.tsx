import { useEffect, useState } from "react";
import { format, differenceInCalendarDays } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Trade, TradeClose } from "@/pages/Trades";

interface Props {
  trade: Trade | null;
  closes: TradeClose[];
  onOpenChange: (o: boolean) => void;
  onSaved: () => void;
}

export default function CloseTradeDialog({ trade, closes, onOpenChange, onSaved }: Props) {
  const remaining = trade ? Number(trade.remaining_quantity) : 0;

  const [exitDate, setExitDate] = useState<Date | undefined>(new Date());
  const [exitPrice, setExitPrice] = useState("");
  const [qty, setQty] = useState("");
  const [memo, setMemo] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (trade) {
      setExitDate(new Date());
      setExitPrice("");
      setQty(String(remaining));
      setMemo("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trade?.id]);

  const submit = async () => {
    if (!trade || !exitDate || !exitPrice || !qty) {
      toast.error("청산일, 청산가, 수량을 입력해주세요");
      return;
    }
    const ep = Number(exitPrice);
    const q = Number(qty);
    if (q <= 0 || q > remaining) {
      toast.error(`수량은 1 ~ ${remaining} 사이여야 합니다`);
      return;
    }
    const realized = (ep - Number(trade.entry_price)) * q;
    const rate = ((ep - Number(trade.entry_price)) / Number(trade.entry_price)) * 100;
    const holdingDays = Math.max(0, differenceInCalendarDays(exitDate, new Date(trade.entry_date)));

    setSaving(true);

    const { error: insErr } = await supabase.from("trade_closes").insert({
      trade_id: trade.id,
      close_date: format(exitDate, "yyyy-MM-dd"),
      close_price: ep,
      close_quantity: q,
      realized_pnl: realized,
      pnl_rate: rate,
      holding_days: holdingDays,
      memo: memo || null,
    });

    if (insErr) { setSaving(false); toast.error(insErr.message); return; }

    // recompute aggregates from all closes
    const all = [
      ...closes.map((c) => ({ p: Number(c.close_price), q: Number(c.close_quantity), r: Number(c.realized_pnl) })),
      { p: ep, q, r: realized },
    ];
    const totalQty = all.reduce((s, x) => s + x.q, 0);
    const totalPnl = all.reduce((s, x) => s + x.r, 0);
    const wAvg = all.reduce((s, x) => s + x.p * x.q, 0) / totalQty;

    const newRemaining = Number(trade.total_quantity) - totalQty;
    const newStatus = newRemaining <= 0 ? "CLOSED" : "PARTIAL";

    const { error: updErr } = await supabase.from("trades").update({
      remaining_quantity: Math.max(0, newRemaining),
      avg_close_price: wAvg,
      total_realized_pnl: totalPnl,
      status: newStatus,
    }).eq("id", trade.id);

    setSaving(false);
    if (updErr) { toast.error(updErr.message); return; }
    toast.success(newStatus === "CLOSED" ? "포지션이 전부 청산되었습니다" : "분할 청산이 기록되었습니다");
    onOpenChange(false);
    onSaved();
  };

  const previewPnl = trade && exitPrice && qty
    ? (Number(exitPrice) - Number(trade.entry_price)) * Number(qty) : 0;
  const previewRate = trade && exitPrice
    ? ((Number(exitPrice) - Number(trade.entry_price)) / Number(trade.entry_price)) * 100 : 0;

  return (
    <Dialog open={!!trade} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>부분 청산 — {trade?.name} ({trade?.ticker})</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="rounded-lg border border-border bg-muted/20 p-3 text-sm space-y-1">
            <div>진입가 <span className="tabular-nums font-medium">{trade?.entry_price}</span> · 총수량 <span className="tabular-nums">{trade?.total_quantity}</span></div>
            <div>잔여: <span className="tabular-nums font-medium text-primary">{remaining}</span></div>
          </div>

          <div className="space-y-1">
            <Label>청산일 *</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !exitDate && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {exitDate ? format(exitDate, "yyyy-MM-dd") : "날짜 선택"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={exitDate} onSelect={setExitDate} initialFocus className={cn("p-3 pointer-events-auto")} />
              </PopoverContent>
            </Popover>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>청산가 *</Label>
              <Input type="number" value={exitPrice} onChange={(e) => setExitPrice(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>청산 수량 * (잔여 {remaining})</Label>
              <Input type="number" value={qty} onChange={(e) => setQty(e.target.value)} />
            </div>
          </div>

          <div className="space-y-1">
            <Label>메모</Label>
            <Textarea value={memo} onChange={(e) => setMemo(e.target.value)} placeholder="청산 사유 등" rows={2} />
          </div>

          {trade && exitPrice && qty && (
            <div className="rounded-lg border border-border bg-muted/20 p-3 text-sm space-y-1">
              <div>이번 분할 실현손익: <span className="tabular-nums font-medium">{previewPnl.toLocaleString()}</span></div>
              <div>이번 수익률: <span className="tabular-nums font-medium">{previewRate.toFixed(2)}%</span></div>
              {Number(qty) >= remaining && <div className="text-primary">→ 전량 청산: 포지션이 종료됩니다</div>}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>취소</Button>
          <Button onClick={submit} disabled={saving}>{saving ? "저장 중..." : "청산"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
