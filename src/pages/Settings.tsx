import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CheckCircle2, Circle, AlertCircle, RefreshCw, KeyRound, Info, ShieldCheck, AlertTriangle, Trash2 } from "lucide-react";
import { setInitialSetup } from "@/lib/initialSetup";
import { useAuth } from "@/hooks/useAuth";
import InviteCodeManager from "@/components/social/InviteCodeManager";
import NicknameSetup from "@/components/social/NicknameSetup";
import { useMyProfile } from "@/hooks/useNickname";
import { Card as ProfileCard } from "@/components/ui/card";

const ENV_KEY = "stock-flow-kis-env";
const STATUS_KEY = "stock-flow-kis-status";
const SYNC_KEY = "stock-flow-last-sync";

export function getKisEnv(): "real" | "paper" {
  return (localStorage.getItem(ENV_KEY) as "real" | "paper") || "real";
}
export function getKisStatus(): "connected" | "expired" | "none" {
  return (localStorage.getItem(STATUS_KEY) as any) || "none";
}

export default function SettingsPage() {
  const { user } = useAuth();
  const { profile, refresh: refreshProfile } = useMyProfile();
  const [nickOpen, setNickOpen] = useState(false);
  const [env, setEnv] = useState<"real" | "paper">("real");
  const [status, setStatus] = useState<"connected" | "expired" | "none">("none");
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);

  // Danger Zone state
  const [resetStep, setResetStep] = useState<0 | 1 | 2>(0);
  const [resetConfirm, setResetConfirm] = useState("");
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    setEnv(getKisEnv());
    setStatus(getKisStatus());
    setLastSync(localStorage.getItem(SYNC_KEY));
  }, []);

  const saveEnv = (v: "real" | "paper") => {
    setEnv(v);
    localStorage.setItem(ENV_KEY, v);
    toast.success("저장되었습니다");
  };

  const test = async () => {
    setTesting(true);
    try {
      const { data, error } = await supabase.functions.invoke("kis-proxy", {
        body: { action: "test", env },
      });
      if (error) throw new Error(error.message);
      if ((data as any)?.error) throw new Error((data as any).error);
      localStorage.setItem(STATUS_KEY, "connected");
      setStatus("connected");
      toast.success("한국투자증권 API 연결 성공");
    } catch (e: any) {
      localStorage.setItem(STATUS_KEY, "expired");
      setStatus("expired");
      toast.error(`연결 실패: ${e.message}`);
    } finally {
      setTesting(false);
    }
  };

  const performReset = async () => {
    setResetting(true);
    try {
      // Wipe all trade/asset data. Order matters because of FK from trade_buys → trades.
      const wipes: Array<readonly [string, string]> = [
        ["trade_buys", "id"],
        ["trade_closes", "id"],
        ["trades", "id"],
        ["longterm_buys", "id"],
        ["longterm_sells", "id"],
        ["longterm_holdings", "id"],
        ["asset_snapshots", "id"],
        ["cash_transactions", "id"],
        ["kis_sync_log", "id"],
      ];
      for (const [table] of wipes) {
        const { error } = await supabase
          .from(table as never)
          .delete()
          .not("id", "is", null);
        if (error) throw new Error(`${table}: ${error.message}`);
      }
      // kis_sync_log: insert one fresh row at "now" so future sync ignores backlog.
      if (user) {
        const { error: insErr } = await supabase
          .from("kis_sync_log")
          .insert({ user_id: user.id, last_sync_at: new Date().toISOString() });
        if (insErr) throw new Error(`kis_sync_log seed: ${insErr.message}`);
      }

      // Reset initial-setup flag → pending. KIS keys / env preserved by design.
      setInitialSetup("pending");
      localStorage.removeItem(SYNC_KEY);
      setLastSync(null);

      toast.success("모든 매매 기록이 초기화되었습니다");
      setResetStep(0);
      setResetConfirm("");
    } catch (e: any) {
      toast.error(`초기화 실패: ${e.message}`);
    } finally {
      setResetting(false);
    }
  };

  const StatusBadge = () => {
    if (status === "connected")
      return (
        <span className="inline-flex items-center gap-1 rounded-md border border-primary/30 bg-primary/15 px-2 py-1 text-xs font-medium text-primary">
          <CheckCircle2 className="h-3 w-3" />연결됨
        </span>
      );
    if (status === "expired")
      return (
        <span className="inline-flex items-center gap-1 rounded-md border border-yellow-500/30 bg-yellow-500/15 px-2 py-1 text-xs font-medium text-yellow-400">
          <AlertCircle className="h-3 w-3" />연결 실패
        </span>
      );
    return (
      <span className="inline-flex items-center gap-1 rounded-md border border-border bg-muted/30 px-2 py-1 text-xs font-medium text-muted-foreground">
        <Circle className="h-3 w-3" />미연결
      </span>
    );
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div>
        <h1 className="text-2xl font-semibold">설정</h1>
        <p className="text-sm text-muted-foreground mt-1">
          프로필, 친구 초대, 한국투자증권 OpenAPI 동기화를 관리합니다
        </p>
      </div>

      {/* Profile */}
      <ProfileCard className="glass-card p-6 space-y-3">
        <h2 className="text-lg font-semibold">프로필</h2>
        <div className="flex items-end gap-3">
          <div className="flex-1">
            <Label className="text-xs">현재 닉네임</Label>
            <Input value={profile?.nickname || ""} readOnly className="mt-1" />
          </div>
          <Button variant="outline" onClick={() => setNickOpen(true)}>변경</Button>
        </div>
      </ProfileCard>

      {/* Invite Codes */}
      <InviteCodeManager />

      <NicknameSetup
        open={nickOpen}
        onOpenChange={setNickOpen}
        initialNickname={profile?.nickname || ""}
        onSaved={() => { setNickOpen(false); refreshProfile(); }}
      />

      <Card className="glass-card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">한국투자증권 OpenAPI</h2>
          </div>
          <StatusBadge />
        </div>

        <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 flex gap-2">
          <ShieldCheck className="h-4 w-4 text-primary mt-0.5 shrink-0" />
          <div className="text-xs text-muted-foreground">
            앱키 / 시크릿 / 계좌번호는 <span className="text-foreground font-medium">서버 시크릿</span>에 안전하게 저장되어
            있으며 브라우저로 노출되지 않습니다. 모든 KIS API 호출은 Edge Function 프록시를 통해 이루어집니다.
          </div>
        </div>

        <div className="grid gap-1.5">
          <label className="text-sm font-medium">투자 구분</label>
          <Select value={env} onValueChange={(v: "real" | "paper") => saveEnv(v)}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="real">실전투자</SelectItem>
              <SelectItem value="paper">모의투자</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            앱키/시크릿이 실전·모의 중 어느 쪽으로 발급되었는지에 맞춰 선택하세요
          </p>
        </div>

        <div className="flex flex-wrap gap-2 items-center pt-2">
          <Button onClick={test} disabled={testing}>
            <RefreshCw className={`h-4 w-4 mr-1 ${testing ? "animate-spin" : ""}`} />
            연결 테스트
          </Button>
          {lastSync && (
            <span className="text-xs text-muted-foreground ml-auto">
              마지막 동기화: {new Date(lastSync).toLocaleString("ko-KR")}
            </span>
          )}
        </div>
      </Card>

      <Card className="glass-card p-6 space-y-3">
        <div className="flex items-center gap-2">
          <Info className="h-5 w-5 text-secondary" />
          <h2 className="text-lg font-semibold">동기화 정보</h2>
        </div>
        <ul className="text-sm text-muted-foreground space-y-1.5 list-disc list-inside">
          <li>
            <span className="text-foreground">동기화 방식</span>: 매매기록 페이지에서 [한투 보유종목 가져오기] 또는 [체결내역 동기화] 버튼 클릭
          </li>
          <li>
            <span className="text-foreground">중복 방지</span>: 한투 주문번호(odno) 기준으로 자동 dedupe
          </li>
          <li>
            <span className="text-foreground">자동 INSERT 안 함</span>: 도입 이전 거래내역은 백필되지 않습니다. 사용자가 명시적으로 가져온 종목만 등록됩니다.
          </li>
          <li>
            <span className="text-foreground">키 변경</span>: 앱키/시크릿/계좌번호 교체는 Lovable Cloud → Secrets에서 갱신
          </li>
        </ul>
      </Card>

      {/* Danger Zone */}
      <Card className="p-6 space-y-4 border-2 border-destructive/40 bg-destructive/5">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-destructive" />
          <h2 className="text-lg font-semibold text-destructive">데이터 초기화</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          베타 테스트 중 등록된 모든 매매 기록을 삭제합니다. 정식 운영 시작 전에만 사용하세요.
          <br />
          한투 API 키 / 계좌번호 / 투자 구분 설정은 보존됩니다.
        </p>
        <Button variant="destructive" onClick={() => setResetStep(1)}>
          <Trash2 className="h-4 w-4 mr-1" /> 전체 데이터 초기화
        </Button>
      </Card>

      {/* Step 1: confirm intent */}
      <Dialog open={resetStep === 1} onOpenChange={(o) => !o && setResetStep(0)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-destructive flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" /> 정말로 모든 매매 기록을 삭제하시겠습니까?
            </DialogTitle>
            <DialogDescription>
              매매기록, 분할 매수/청산, 장기투자, 자산 스냅샷, 현금 거래, 한투 동기화 로그가 모두 삭제됩니다.
              이 작업은 되돌릴 수 없습니다.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetStep(0)}>취소</Button>
            <Button variant="destructive" onClick={() => setResetStep(2)}>다음</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Step 2: type RESET */}
      <Dialog
        open={resetStep === 2}
        onOpenChange={(o) => {
          if (!o) {
            setResetStep(0);
            setResetConfirm("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-destructive">최종 확인</DialogTitle>
            <DialogDescription>
              계속하려면 아래 입력란에 <span className="font-mono font-semibold text-foreground">RESET</span> 을 입력하세요.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            <Label htmlFor="reset-confirm" className="sr-only">RESET</Label>
            <Input
              id="reset-confirm"
              value={resetConfirm}
              onChange={(e) => setResetConfirm(e.target.value)}
              placeholder="RESET"
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setResetStep(0);
                setResetConfirm("");
              }}
              disabled={resetting}
            >
              취소
            </Button>
            <Button
              variant="destructive"
              disabled={resetConfirm !== "RESET" || resetting}
              onClick={performReset}
            >
              {resetting ? (
                <><RefreshCw className="h-4 w-4 mr-1 animate-spin" /> 삭제 중...</>
              ) : (
                <><Trash2 className="h-4 w-4 mr-1" /> 최종 삭제</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
