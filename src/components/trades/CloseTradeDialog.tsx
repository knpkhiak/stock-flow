import { useEffect, useState } from "react";
import { format } from "date-fns";
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
  const closedQty = closes.reduce((s, c) => s + Number(c.quantity), 0);
  const remaining = trade ? Number(trade.quantity) - closedQty : 0;

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

    setSaving(true);

    const { error: insErr } = await supabase.from("trade_closes").insert({
      trade_id: trade.id,
      close_date: format(exitDate, "yyyy-MM-dd"),
      close_price: ep,
      quantity: q,
      realized_pnl: realized,
      pnl_rate: rate,
      memo: memo || null,
    });

    if (insErr) {
      setSaving(false);
      toast.error(insErr.message);
      return;
    }

    const isFinal = q >= remaining;
    if (isFinal) {
      // aggregate across all closes
      const allCloses = [
        ...closes,
        { close_price: ep, quantity: q, realized_pnl: realized } as any,
      ];
      const totalQty = allCloses.reduce((s, c) => s + Number(c.quantity), 0);
      const totalPnl = allCloses.reduce((s, c) => s + Number(c.realized_pnl), 0);
      const wAvgExit = allCloses.reduce((s, c) => s + Number(c.close_price) * Number(c.quantity), 0) / totalQty;
      const aggRate = ((wAvgExit - Number(trade.entry_price)) / Number(trade.entry_price)) * 100;

      const { error: updErr } = await supabase.from("trades").update({
        status: "CLOSED",
        exit_date: format(exitDate, "yyyy-MM-dd"),
        exit_price: wAvgExit,
        realized_pnl: totalPnl,
        pnl_rate: aggRate,
      }).eq("id", trade.id);
      if (updErr) {
        setSaving(false);
        toast.error(updErr.message);
        return;
      }
    }

    setSaving(false);
    toast.success(isFinal ? "포지션이 전부 청산되었습니다" : "분할 청산이 기록되었습니다");
    onOpenChange(false);
    onSaved();
  };

  const previewPnl = trade && exitPrice && qty
    ? (Number(exitPrice) - Number(trade.entry_price)) * Number(qty)
    : 0;
  const previewRate = trade && exitPrice
    ? ((Number(exitPrice) - Number(trade.entry_price)) / Number(trade.entry_price)) * 100
    : 0;

  return (
    <Dialog open={!!trade} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>포지션 닫기 — {trade?.name} ({trade?.ticker})</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="rounded-lg border border-border bg-muted/20 p-3 text-sm space-y-1">
            <div>진입가 <span className="tabular-nums font-medium">{trade?.entry_price}</span> · 원 수량 <span className="tabular-nums">{trade?.quantity}</span></div>
            <div>이미 청산: <span className="tabular-nums">{closedQty}</span> / 잔여: <span className="tabular-nums font-medium text-primary">{remaining}</span></div>
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
