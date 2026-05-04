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

const OVERSEAS_EXCHANGES = [
  { value: "NAS", label: "NASDAQ (나스닥)" },
  { value: "NYS", label: "NYSE (뉴욕)" },
  { value: "AMS", label: "AMEX (아멕스)" },
  { value: "HKS", label: "홍콩" },
  { value: "TSE", label: "도쿄" },
  { value: "SHS", label: "상해" },
  { value: "SZS", label: "심천" },
  { value: "HNX", label: "하노이" },
  { value: "HSX", label: "호치민" },
];

/* ---------- 새 종목 추가 ---------- */
export function NewHoldingDialog({
  open, onOpenChange, onSaved,
}: { open: boolean; onOpenChange: (v: boolean) => void; onSaved: () => void }) {
  const [ticker, setTicker] = useState("");
  const [name, setName] = useState("");
  const [market, setMarket] = useState<string>("국내");
  const [excd, setExcd] = useState<string>("NAS");
  const [date, setDate] = useState(today());
  const [price, setPrice] = useState("");
  const [qty, setQty] = useState("");
  const [memo, setMemo] = useState("");
  const [saving, setSaving] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [verified, setVerified] = useState(false);
  const [livePrice, setLivePrice] = useState<number | null>(null);

  useEffect(() => {
    if (open) {
      setTicker(""); setName(""); setMarket("국내"); setExcd("NAS"); setDate(today());
      setPrice(""); setQty(""); setMemo("");
      setVerified(false); setLivePrice(null);
    }
  }, [open]);

  useEffect(() => { setVerified(false); setLivePrice(null); }, [ticker, market, excd]);

  const verifyTicker = async () => {
    const t = ticker.trim();
    if (!t) { toast.error("티커를 입력해주세요"); return; }
    if (market === "암호화폐") { toast.error("암호화폐는 한투 API 검증을 지원하지 않습니다"); return; }
    setVerifying(true);
    try {
      const isOverseas = market === "해외";
      const action = isOverseas ? "price_overseas" : "price";
      const body: Record<string, string> = { action, env: "real", ticker: t };
      if (isOverseas) body.excd = excd;

      const { data, error } = await supabase.functions.invoke("kis-proxy", { body });
      if (error) throw new Error(error.message);
      if ((data as any)?.error) throw new Error((data as any).error);

      // 국내: output.stck_prpr / 해외: output.last
      const priceVal = isOverseas
        ? Number((data as any)?.output?.last)
        : Number((data as any)?.output?.stck_prpr);
      if (!Number.isFinite(priceVal) || priceVal <= 0) throw new Error("유효한 가격을 받지 못했습니다");

      setLivePrice(priceVal);
      setVerified(true);
      if (!name.trim()) {
        const apiName = isOverseas
          ? (data as any)?.output?.name ?? t
          : t; // 국내 inquire-price는 종목명 미포함
        setName(apiName);
      }
      toast.success(`종목 확인 완료 · 현재가 ${priceVal.toLocaleString()}`);
    } catch (e: any) {
      setVerified(false);
      setLivePrice(null);
      toast.error(`종목 확인 실패: ${e.message}`);
    } finally { setVerifying(false); }
  };

  const submit = async () => {
    const p = Number(price), q = Number(qty);
    if (!ticker || !name || !p || !q) { toast.error("필수 항목을 입력해주세요"); return; }
    if (market !== "암호화폐" && !verified) { toast.error("한투 API로 종목 확인이 필요합니다"); return; }
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
          <div className="grid gap-1.5">
            <Label>시장</Label>
            <Select value={market} onValueChange={setMarket}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {MARKETS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {market === "해외" && (
            <div className="grid gap-1.5">
              <Label>거래소</Label>
              <Select value={excd} onValueChange={setExcd}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {OVERSEAS_EXCHANGES.map(x => <SelectItem key={x.value} value={x.value}>{x.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="grid grid-cols-[1fr_1fr_auto] gap-2 items-end">
            <div className="grid gap-1.5">
              <Label>티커</Label>
              <Input value={ticker} onChange={(e) => setTicker(e.target.value)} placeholder={market === "해외" ? "AAPL" : "010950"} />
            </div>
            <div className="grid gap-1.5">
              <Label>종목명</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={market === "해외" ? "Apple" : "S-Oil"} />
            </div>
            <Button type="button" variant="outline" onClick={verifyTicker} disabled={verifying || !ticker.trim() || market === "암호화폐"}>
              {verifying ? "확인중..." : verified ? "✓ 확인됨" : "종목 확인"}
            </Button>
          </div>
          {verified && livePrice != null && (
            <div className="rounded-md bg-secondary/10 border border-secondary/30 p-2 text-xs">
              ✓ 한투 API 검증 완료 · 현재가 <span className="font-medium tabular-nums">{livePrice.toLocaleString()}</span>
            </div>
          )}
          {market === "암호화폐" && (
            <p className="text-xs text-muted-foreground">※ 암호화폐는 한투 API 검증이 지원되지 않습니다 (수기 입력만 가능)</p>
          )}
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
