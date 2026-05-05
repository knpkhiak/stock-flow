import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { fmtKRW } from "@/lib/format";
import { useAuth } from "@/hooks/useAuth";

type Initial = {
  id?: string;
  snapshot_date?: string;
  trading_balance?: number;
  longterm_balance?: number;
  cash_balance?: number;
  memo?: string | null;
};

export default function SnapshotDialog({
  open,
  onOpenChange,
  onSaved,
  initial,
  liveDefaults,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSaved: () => void;
  initial?: Initial;
  liveDefaults?: { trading: number; longterm: number; cash: number };
}) {
  const today = new Date().toISOString().slice(0, 10);
  const { user } = useAuth();
  const [date, setDate] = useState(today);
  const [trading, setTrading] = useState("");
  const [longterm, setLongterm] = useState("");
  const [cash, setCash] = useState("");
  const [memo, setMemo] = useState("");
  const [saving, setSaving] = useState(false);
  const autofilled = !initial?.id && !!liveDefaults;

  useEffect(() => {
    if (open) {
      setDate(initial?.snapshot_date ?? today);
      setTrading(initial?.trading_balance?.toString() ?? (liveDefaults ? String(Math.round(liveDefaults.trading)) : ""));
      setLongterm(initial?.longterm_balance?.toString() ?? (liveDefaults ? String(Math.round(liveDefaults.longterm)) : ""));
      setCash(initial?.cash_balance?.toString() ?? (liveDefaults ? String(Math.round(liveDefaults.cash)) : ""));
      setMemo(initial?.memo ?? "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initial]);

  const t = Number(trading) || 0;
  const l = Number(longterm) || 0;
  const c = Number(cash) || 0;
  const total = t + l + c;

  const submit = async () => {
    if (!user) { toast.error("로그인이 필요합니다"); return; }
    setSaving(true);
    try {
      const payload = {
        snapshot_date: date,
        trading_balance: t,
        longterm_balance: l,
        cash_balance: c,
        total_balance: total,
        memo: memo || null,
      };

      if (initial?.id) {
        const { error } = await supabase.from("asset_snapshots").update(payload).eq("id", initial.id);
        if (error) throw error;
      } else {
        // check duplicate
        const { data: existing } = await supabase
          .from("asset_snapshots")
          .select("id")
          .eq("snapshot_date", date)
          .maybeSingle();
        if (existing) {
          if (!confirm("해당 날짜에 이미 기록이 있습니다. 덮어쓸까요?")) {
            setSaving(false);
            return;
          }
          const { error } = await supabase.from("asset_snapshots").update(payload).eq("id", existing.id);
          if (error) throw error;
        } else {
          const { error } = await supabase.from("asset_snapshots").insert({ ...payload, user_id: user.id });
          if (error) throw error;
        }
      }
      toast.success("자산 스냅샷이 저장되었습니다");
      onSaved();
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-card">
        <DialogHeader>
          <DialogTitle>{initial?.id ? "스냅샷 수정" : "오늘 자산 기록"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label>날짜</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label>트레이딩 잔고</Label>
            <Input type="number" inputMode="decimal" value={trading} onChange={(e) => setTrading(e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label>장기투자 잔고</Label>
            <Input type="number" inputMode="decimal" value={longterm} onChange={(e) => setLongterm(e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label>현금 잔고</Label>
            <Input type="number" inputMode="decimal" value={cash} onChange={(e) => setCash(e.target.value)} />
          </div>
          <div className="rounded-md border border-border bg-muted/20 p-3 flex items-center justify-between">
            <span className="text-sm text-muted-foreground">합계 미리보기</span>
            <span className="text-lg font-semibold num text-primary">{fmtKRW(total)}</span>
          </div>
          <div className="grid gap-2">
            <Label>메모 (선택)</Label>
            <Textarea value={memo} onChange={(e) => setMemo(e.target.value)} rows={2} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>취소</Button>
          <Button onClick={submit} disabled={saving}>{saving ? "저장중..." : "저장"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
