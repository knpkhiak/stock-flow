import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { AlertTriangle, RefreshCw, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { setInitialSetup } from "@/lib/initialSetup";
import { toast } from "sonner";

export default function DangerZoneCard() {
  const { user } = useAuth();
  const [step, setStep] = useState<0 | 1 | 2>(0);
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);

  const performReset = async () => {
    setBusy(true);
    try {
      const tables = [
        "trade_buys", "trade_closes", "trades",
        "longterm_buys", "longterm_sells", "longterm_holdings",
        "asset_snapshots", "cash_transactions", "kis_sync_log",
      ] as const;
      for (const t of tables) {
        const { error } = await supabase.from(t as never).delete().not("id", "is", null);
        if (error) throw new Error(`${t}: ${error.message}`);
      }
      if (user) {
        await supabase.from("kis_sync_log").insert({ user_id: user.id, last_sync_at: new Date().toISOString() });
      }
      setInitialSetup("pending");
      localStorage.removeItem("stock-flow-last-sync");
      toast.success("모든 매매 기록이 초기화되었습니다");
      setStep(0); setConfirm("");
    } catch (e: any) {
      toast.error(`초기화 실패: ${e.message}`);
    } finally { setBusy(false); }
  };

  return (
    <Card className="p-6 space-y-4 border-2 border-destructive/40 bg-destructive/5">
      <div className="flex items-center gap-2">
        <AlertTriangle className="h-5 w-5 text-destructive" />
        <h2 className="text-lg font-semibold text-destructive">위험 영역</h2>
      </div>
      <p className="text-sm text-muted-foreground">
        본인의 모든 매매 기록·자산 스냅샷·현금 거래·동기화 로그를 삭제합니다. API 키와 프로필은 보존됩니다.
        잘못 동기화된 데이터를 정리할 때 사용하세요.
      </p>
      <Button variant="destructive" onClick={() => setStep(1)}>
        <Trash2 className="h-4 w-4 mr-1" /> 전체 매매 데이터 초기화
      </Button>

      <Dialog open={step === 1} onOpenChange={(o) => !o && setStep(0)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-destructive flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" /> 정말로 모든 매매 기록을 삭제하시겠습니까?
            </DialogTitle>
            <DialogDescription>
              매매기록, 분할 매수/청산, 장기투자, 자산 스냅샷, 현금 거래, 한투 동기화 로그가 모두 삭제됩니다. 되돌릴 수 없습니다.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStep(0)}>취소</Button>
            <Button variant="destructive" onClick={() => setStep(2)}>다음</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={step === 2} onOpenChange={(o) => { if (!o) { setStep(0); setConfirm(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-destructive">최종 확인</DialogTitle>
            <DialogDescription>
              계속하려면 <span className="font-mono font-semibold text-foreground">RESET</span> 을 입력하세요.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            <Label htmlFor="reset-confirm" className="sr-only">RESET</Label>
            <Input id="reset-confirm" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="RESET" autoFocus />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setStep(0); setConfirm(""); }} disabled={busy}>취소</Button>
            <Button variant="destructive" disabled={confirm !== "RESET" || busy} onClick={performReset}>
              {busy ? <><RefreshCw className="h-4 w-4 mr-1 animate-spin" /> 삭제 중...</> : <><Trash2 className="h-4 w-4 mr-1" /> 최종 삭제</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
