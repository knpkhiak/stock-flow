import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { CheckCircle2, Circle, AlertCircle, RefreshCw, KeyRound, Info } from "lucide-react";

type KisConfig = {
  appKey: string;
  appSecret: string;
  account: string;
  env: "real" | "paper";
};

const STORAGE_KEY = "stock-flow-kis-config";
const TOKEN_KEY = "stock-flow-kis-token";
const SYNC_KEY = "stock-flow-last-sync";

export function getKisConfig(): KisConfig | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export function getKisStatus(): "connected" | "expired" | "none" {
  const cfg = getKisConfig();
  if (!cfg?.appKey) return "none";
  try {
    const t = JSON.parse(localStorage.getItem(TOKEN_KEY) || "null");
    if (!t?.expires_at) return "expired";
    if (Date.now() >= t.expires_at) return "expired";
    return "connected";
  } catch { return "expired"; }
}

export default function SettingsPage() {
  const [cfg, setCfg] = useState<KisConfig>({ appKey: "", appSecret: "", account: "", env: "real" });
  const [status, setStatus] = useState<"connected" | "expired" | "none">("none");
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    const saved = getKisConfig();
    if (saved) setCfg(saved);
    setStatus(getKisStatus());
    setLastSync(localStorage.getItem(SYNC_KEY));
  }, []);

  const save = () => {
    if (!cfg.appKey || !cfg.appSecret || !cfg.account) {
      toast.error("앱키 / 시크릿 / 계좌번호를 모두 입력해주세요");
      return;
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg));
    toast.success("저장되었습니다");
    setStatus(getKisStatus());
  };

  const test = async () => {
    setTesting(true);
    try {
      // STEP 2에서 Edge Function으로 실제 토큰 발급 호출
      // 현재는 자리표시자 — 키가 입력되어 있으면 임시 통과
      if (!cfg.appKey || !cfg.appSecret) throw new Error("키가 비어있습니다");
      // 임시 토큰 저장 (실제 구현에서는 KIS oauth2/tokenP 호출)
      const expires_at = Date.now() + 23 * 60 * 60 * 1000;
      localStorage.setItem(TOKEN_KEY, JSON.stringify({ access_token: "PLACEHOLDER", expires_at }));
      toast.info("STEP 2에서 한국투자증권 OAuth 토큰 실연동 예정입니다");
      setStatus("connected");
    } catch (e: any) {
      toast.error(`연결 실패: ${e.message}`);
    } finally {
      setTesting(false);
    }
  };

  const StatusBadge = () => {
    if (status === "connected") return (
      <span className="inline-flex items-center gap-1 rounded-md border border-primary/30 bg-primary/15 px-2 py-1 text-xs font-medium text-primary">
        <CheckCircle2 className="h-3 w-3" />연결됨
      </span>
    );
    if (status === "expired") return (
      <span className="inline-flex items-center gap-1 rounded-md border border-yellow-500/30 bg-yellow-500/15 px-2 py-1 text-xs font-medium text-yellow-400">
        <AlertCircle className="h-3 w-3" />토큰만료
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
        <h1 className="text-2xl font-semibold">API 설정</h1>
        <p className="text-sm text-muted-foreground mt-1">한국투자증권 API 키를 등록하면 보유종목·체결내역이 자동 동기화됩니다</p>
      </div>

      <Card className="glass-card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">한국투자증권 OpenAPI</h2>
          </div>
          <StatusBadge />
        </div>

        <div className="grid gap-3">
          <div className="grid gap-1.5">
            <Label>앱키 (App Key)</Label>
            <Input value={cfg.appKey} onChange={(e) => setCfg({ ...cfg, appKey: e.target.value })} placeholder="P..." />
          </div>
          <div className="grid gap-1.5">
            <Label>시크릿키 (App Secret)</Label>
            <Input type="password" value={cfg.appSecret} onChange={(e) => setCfg({ ...cfg, appSecret: e.target.value })} placeholder="••••••••" />
          </div>
          <div className="grid gap-1.5">
            <Label>트레이딩 계좌번호</Label>
            <Input value={cfg.account} onChange={(e) => setCfg({ ...cfg, account: e.target.value })} placeholder="XXXXXXXX-XX" />
          </div>
          <div className="grid gap-1.5">
            <Label>투자 구분</Label>
            <Select value={cfg.env} onValueChange={(v: "real" | "paper") => setCfg({ ...cfg, env: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="real">실전투자</SelectItem>
                <SelectItem value="paper">모의투자</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 items-center pt-2">
          <Button onClick={save}>저장</Button>
          <Button variant="outline" onClick={test} disabled={testing}>
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
          <li><span className="text-foreground">동기화 방식</span>: 페이지 진입 시 + 수동 새로고침</li>
          <li><span className="text-foreground">동기화 대상</span>: 보유종목, 체결내역</li>
          <li><span className="text-foreground">자동 스냅샷</span>: 매월 말일 (또는 다음 달 첫 진입 시 소급)</li>
          <li><span className="text-foreground">중복 방지</span>: 한투 주문번호(odno) 기준</li>
        </ul>
        <div className="text-xs text-muted-foreground pt-2 border-t border-border">
          ⚠ 한국투자증권 API 실연동은 다음 단계(STEP 2)에서 Edge Function 프록시로 안전하게 구현됩니다.
          현재는 키 저장과 UI 골격만 동작합니다.
        </div>
      </Card>
    </div>
  );
}
