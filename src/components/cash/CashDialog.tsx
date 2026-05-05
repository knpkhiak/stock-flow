import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

export default function CashDialog({
  open, onOpenChange, onSaved,
}: { open: boolean; onOpenChange: (v: boolean) => void; onSaved: () => void }) {
  const today = new Date().toISOString().slice(0, 10);
  const { user } = useAuth();
  const [date, setDate] = useState(today);
  const [type, setType] = useState<"deposit" | "withdraw">("deposit");
  const [amount, setAmount] = useState("");
  const [memo, setMemo] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) { setDate(today); setType("deposit"); setAmount(""); setMemo(""); }
  }, [open]);

  const submit = async () => {
    if (!user) { toast.error("로그인이 필요합니다"); return; }
    const amt = Number(amount);
    if (!amt || amt <= 0) { toast.error("금액을 입력해주세요"); return; }
    setSaving(true);
    try {
      const { data: latest } = await supabase
        .from("cash_transactions")
        .select("balance_after")
        .order("transaction_date", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      const prev = Number(latest?.balance_after || 0);
      const balance_after = type === "deposit" ? prev + amt : prev - amt;
      const { error } = await supabase.from("cash_transactions").insert({
        user_id: user.id,
        transaction_date: date, type, amount: amt, balance_after, memo: memo || null,
      });
      if (error) throw error;
      toast.success("저장되었습니다");
      onSaved(); onOpenChange(false);
    } catch (e: any) { toast.error(e.message); }
    finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-card">
        <DialogHeader><DialogTitle>현금 입출금 기록</DialogTitle></DialogHeader>
        <div className="grid gap-4">
          <div className="grid gap-1.5"><Label>거래일</Label><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
          <div className="grid gap-1.5">
            <Label>종류</Label>
            <Select value={type} onValueChange={(v: "deposit" | "withdraw") => setType(v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="deposit">입금</SelectItem>
                <SelectItem value="withdraw">출금</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5"><Label>금액 (원)</Label><Input type="number" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} /></div>
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
