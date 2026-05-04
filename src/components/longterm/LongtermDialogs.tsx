import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { MARKETS } from "@/components/trades/marketStyle";
import type { LongtermHolding } from "@/types/longterm";

const today = () => new Date().toISOString().slice(0, 10);

/* ---------- 새 종목 추가 ---------- */
export function NewHoldingDialog({
  open, onOpenChange, onSaved,
}: { open: boolean; onOpenChange: (v: boolean) => void; onSaved: () => void }) {
  const [ticker, setTicker] = useState("");
  const [name, setName] = useState("");
  const [market, setMarket] = useState<string>("국내");
  const [date, setDate] = useState(today());
  const [price, setPrice] = useState("");
  const [qty, setQty] = useState("");
  const [memo, setMemo] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) { setTicker(""); setName(""); setMarket("국내"); setDate(today()); setPrice(""); setQty(""); setMemo(""); }
  }, [open]);

  const submit = async () => {
    const p = Number(price), q = Number(qty);
    if (!ticker || !name || !p || !q) { toast.error("필수 항목을 입력해주세요"); return; }
    setSaving(true);
    try {
      const { data: h, error: e1 } = await supabase.from("longterm_holdings").insert({
        ticker, name, market,
        avg_entry_price: p, total_quantity: q, remaining_quantity: q,
        first_buy_date: date, memo: memo || null,
      }).select("id").single();
      if (e1) throw e1;
      const { error: e2 } = await supabase.from("longterm_buys").insert({
        holding_id: h.id, buy_date: date, buy_price: p, buy_quantity: q, memo: memo || null,
      });
      if (e2) throw e2;
      toast.success("종목이 등록되었습니다");
      onSaved(); onOpenChange(false);
    } catch (e: any) { toast.error(e.message); }
    finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-card">
        <DialogHeader><DialogTitle>새 장기투자 종목 추가</DialogTitle></DialogHeader>
        <div className="grid gap-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5"><Label>티커</Label><Input value={ticker} onChange={(e) => setTicker(e.target.value)} placeholder="AAPL" /></div>
            <div className="grid gap-1.5"><Label>종목명</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="애플" /></div>
          </div>
          <div className="grid gap-1.5">
            <Label>시장</Label>
            <Select value={market} onValueChange={setMarket}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {MARKETS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="grid gap-1.5"><Label>첫 매수일</Label><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
            <div className="grid gap-1.5"><Label>매수가</Label><Input type="number" value={price} onChange={(e) => setPrice(e.target.value)} /></div>
            <div className="grid gap-1.5"><Label>매수수량</Label><Input type="number" value={qty} onChange={(e) => setQty(e.target.value)} /></div>
          </div>
          <div className="grid gap-1.5"><Label>메모 (선택)</Label><Textarea value={memo} onChange={(e) => setMemo(e.target.value)} rows={2} /></div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>취소</Button>
          <Button onClick={submit} disabled={saving}>{saving ? "저장중..." : "저장"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ---------- 추가 매수 ---------- */
export function AddBuyDialog({
  holding, onOpenChange, onSaved,
}: { holding: LongtermHolding | null; onOpenChange: (v: boolean) => void; onSaved: () => void }) {
  const [date, setDate] = useState(today());
  const [price, setPrice] = useState("");
  const [qty, setQty] = useState("");
  const [memo, setMemo] = useState("");
  const [saving, setSaving] = useState(false);
  const open = !!holding;

  useEffect(() => { if (open) { setDate(today()); setPrice(""); setQty(""); setMemo(""); } }, [open]);

  const submit = async () => {
    if (!holding) return;
    const p = Number(price), q = Number(qty);
    if (!p || !q) { toast.error("매수가/수량을 입력해주세요"); return; }
    setSaving(true);
    try {
      const newAvg = (holding.avg_entry_price * holding.total_quantity + p * q) / (holding.total_quantity + q);
      const { error: e1 } = await supabase.from("longterm_buys").insert({
        holding_id: holding.id, buy_date: date, buy_price: p, buy_quantity: q, memo: memo || null,
      });
      if (e1) throw e1;
      const { error: e2 } = await supabase.from("longterm_holdings").update({
        avg_entry_price: newAvg,
        total_quantity: holding.total_quantity + q,
        remaining_quantity: holding.remaining_quantity + q,
      }).eq("id", holding.id);
      if (e2) throw e2;
      toast.success("적립 매수 기록 완료");
      onSaved(); onOpenChange(false);
    } catch (e: any) { toast.error(e.message); }
    finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-card">
        <DialogHeader><DialogTitle>{holding?.name} - 추가 매수</DialogTitle></DialogHeader>
        <div className="grid gap-3">
          <div className="grid grid-cols-3 gap-3">
            <div className="grid gap-1.5"><Label>매수일</Label><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
            <div className="grid gap-1.5"><Label>매수가</Label><Input type="number" value={price} onChange={(e) => setPrice(e.target.value)} /></div>
            <div className="grid gap-1.5"><Label>수량</Label><Input type="number" value={qty} onChange={(e) => setQty(e.target.value)} /></div>
          </div>
          <div className="grid gap-1.5"><Label>메모 (선택)</Label><Textarea value={memo} onChange={(e) => setMemo(e.target.value)} rows={2} /></div>
          {holding && (
            <div className="rounded-md bg-muted/30 p-2 text-xs text-muted-foreground">
              현재 평균단가 {holding.avg_entry_price.toLocaleString()} · 보유 {holding.remaining_quantity}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>취소</Button>
          <Button onClick={submit} disabled={saving}>{saving ? "저장중..." : "저장"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ---------- 부분 매도 ---------- */
export function SellHoldingDialog({
  holding, onOpenChange, onSaved,
}: { holding: LongtermHolding | null; onOpenChange: (v: boolean) => void; onSaved: () => void }) {
  const [date, setDate] = useState(today());
  const [price, setPrice] = useState("");
  const [qty, setQty] = useState("");
  const [memo, setMemo] = useState("");
  const [saving, setSaving] = useState(false);
  const open = !!holding;

  useEffect(() => { if (open) { setDate(today()); setPrice(""); setQty(""); setMemo(""); } }, [open]);

  const submit = async () => {
    if (!holding) return;
    const p = Number(price), q = Number(qty);
    if (!p || !q) { toast.error("매도가/수량을 입력해주세요"); return; }
    if (q > holding.remaining_quantity) { toast.error("보유수량을 초과합니다"); return; }
    setSaving(true);
    try {
      const realized = (p - holding.avg_entry_price) * q;
      const rate = ((p - holding.avg_entry_price) / holding.avg_entry_price) * 100;
      const { error: e1 } = await supabase.from("longterm_sells").insert({
        holding_id: holding.id, sell_date: date, sell_price: p, sell_quantity: q,
        realized_pnl: realized, pnl_rate: rate, memo: memo || null,
      });
      if (e1) throw e1;
      const { error: e2 } = await supabase.from("longterm_holdings").update({
        remaining_quantity: holding.remaining_quantity - q,
      }).eq("id", holding.id);
      if (e2) throw e2;
      toast.success("매도 기록 완료");
      onSaved(); onOpenChange(false);
    } catch (e: any) { toast.error(e.message); }
    finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-card">
        <DialogHeader><DialogTitle>{holding?.name} - 부분 매도</DialogTitle></DialogHeader>
        <div className="grid gap-3">
          <div className="grid grid-cols-3 gap-3">
            <div className="grid gap-1.5"><Label>매도일</Label><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
            <div className="grid gap-1.5"><Label>매도가</Label><Input type="number" value={price} onChange={(e) => setPrice(e.target.value)} /></div>
            <div className="grid gap-1.5">
              <Label>수량 (max {holding?.remaining_quantity ?? 0})</Label>
              <Input type="number" value={qty} onChange={(e) => setQty(e.target.value)} max={holding?.remaining_quantity} />
            </div>
          </div>
          <div className="grid gap-1.5"><Label>메모 (선택)</Label><Textarea value={memo} onChange={(e) => setMemo(e.target.value)} rows={2} /></div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>취소</Button>
          <Button onClick={submit} disabled={saving}>{saving ? "저장중..." : "저장"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
