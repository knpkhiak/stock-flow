import { useEffect, useState } from "react";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Trade } from "@/pages/Trades";

interface Props {
  trade: Trade | null;
  onOpenChange: (o: boolean) => void;
  onSaved: () => void;
}

export default function CloseTradeDialog({ trade, onOpenChange, onSaved }: Props) {
  const [exitDate, setExitDate] = useState<Date | undefined>(new Date());
  const [exitPrice, setExitPrice] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (trade) { setExitDate(new Date()); setExitPrice(""); }
  }, [trade]);

  const submit = async () => {
    if (!trade || !exitDate || !exitPrice) {
      toast.error("청산일과 청산가를 입력해주세요");
      return;
    }
    const ep = Number(exitPrice);
    const realized = (ep - trade.entry_price) * trade.quantity;
    const rate = ((ep - trade.entry_price) / trade.entry_price) * 100;
    setSaving(true);
    const { error } = await supabase.from("trades").update({
      status: "CLOSED",
      exit_date: format(exitDate, "yyyy-MM-dd"),
      exit_price: ep,
      realized_pnl: realized,
      pnl_rate: rate,
    }).eq("id", trade.id);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("포지션이 청산되었습니다");
    onOpenChange(false);
    onSaved();
  };

  return (
    <Dialog open={!!trade} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>포지션 닫기 — {trade?.name} ({trade?.ticker})</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="text-sm text-muted-foreground">
            진입가 {trade?.entry_price} · 수량 {trade?.quantity}
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
          <div className="space-y-1">
            <Label>청산가 *</Label>
            <Input type="number" value={exitPrice} onChange={(e) => setExitPrice(e.target.value)} />
          </div>
          {trade && exitPrice && (
            <div className="rounded-lg border border-border bg-muted/20 p-3 text-sm space-y-1">
              <div>실현손익: <span className="tabular-nums font-medium">{((Number(exitPrice) - trade.entry_price) * trade.quantity).toLocaleString()}</span></div>
              <div>수익률: <span className="tabular-nums font-medium">{(((Number(exitPrice) - trade.entry_price) / trade.entry_price) * 100).toFixed(2)}%</span></div>
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
