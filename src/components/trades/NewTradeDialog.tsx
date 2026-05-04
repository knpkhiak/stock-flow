import { useState } from "react";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { MARKETS } from "./marketStyle";
import { MarketDot } from "./MarketBadge";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onSaved: () => void;
}

export default function NewTradeDialog({ open, onOpenChange, onSaved }: Props) {
  const [ticker, setTicker] = useState("");
  const [name, setName] = useState("");
  const [market, setMarket] = useState<string>("국내");
  const [entryDate, setEntryDate] = useState<Date | undefined>(new Date());
  const [entryPrice, setEntryPrice] = useState("");
  const [totalQty, setTotalQty] = useState("");
  const [memo, setMemo] = useState("");
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setTicker(""); setName(""); setMarket("국내"); setEntryDate(new Date());
    setEntryPrice(""); setTotalQty(""); setMemo("");
  };

  const submit = async () => {
    if (!ticker.trim() || !name.trim() || !entryDate || !entryPrice || !totalQty) {
      toast.error("필수 항목을 모두 입력해주세요");
      return;
    }
    const qty = Number(totalQty);
    setSaving(true);
    const { error } = await supabase.from("trades").insert({
      ticker: ticker.trim(),
      name: name.trim(),
      market,
      status: "OPEN",
      entry_date: format(entryDate, "yyyy-MM-dd"),
      entry_price: Number(entryPrice),
      total_quantity: qty,
      remaining_quantity: qty,
      memo: memo.trim() || null,
    });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("새 포지션이 추가되었습니다");
    reset();
    onOpenChange(false);
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>새 포지션 열기</DialogTitle></DialogHeader>
        <div className="grid gap-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>티커 *</Label>
              <Input value={ticker} onChange={(e) => setTicker(e.target.value)} placeholder="AAPL" />
            </div>
            <div className="space-y-1">
              <Label>종목명 *</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="애플" />
            </div>
          </div>
          <div className="space-y-1">
            <Label>시장 구분</Label>
            <Select value={market} onValueChange={setMarket}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {MARKETS.map((m) => (
                  <SelectItem key={m} value={m}>
                    <span className="flex items-center gap-2">
                      <MarketDot market={m} /> {m}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>진입일 *</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !entryDate && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {entryDate ? format(entryDate, "yyyy-MM-dd") : "날짜 선택"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={entryDate} onSelect={setEntryDate} initialFocus className={cn("p-3 pointer-events-auto")} />
              </PopoverContent>
            </Popover>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>진입가 *</Label>
              <Input type="number" value={entryPrice} onChange={(e) => setEntryPrice(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>총 수량 *</Label>
              <Input type="number" value={totalQty} onChange={(e) => setTotalQty(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1">
            <Label>메모</Label>
            <Textarea value={memo} onChange={(e) => setMemo(e.target.value)} rows={3} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>취소</Button>
          <Button onClick={submit} disabled={saving}>{saving ? "저장 중..." : "저장"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
