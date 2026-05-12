import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle2, AlertCircle, Circle, KeyRound, RefreshCw, ShieldCheck, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useApiSettings } from "@/hooks/useApiSettings";
import { toast } from "sonner";

export default function ApiSettingsCard() {
  const { data, loading, save, clear, refresh } = useApiSettings();
  const [appKey, setAppKey] = useState("");
  const [appSecret, setAppSecret] = useState("");
  const [account, setAccount] = useState("");
  const [type, setType] = useState<"REAL" | "VIRTUAL">("REAL");
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    if (!data) return;
    setAccount(data.kis_account_number ?? "");
    setType(data.kis_account_type ?? "REAL");
  }, [data]);

  const onSave = async () => {
    if (!appKey.trim() || !appSecret.trim() || !account.trim()) {
      toast.error("앱키, 시크릿, 계좌번호를 모두 입력하세요");
      return;
    }
    setSaving(true);
    try {
      await save({ kis_app_key: appKey, kis_app_secret: appSecret, kis_account_number: account, kis_account_type: type });
      setAppKey(""); setAppSecret("");
      toast.success("API 키가 저장되었습니다");
    } catch (e: any) {
      toast.error(`저장 실패: ${e.message}`);
    } finally { setSaving(false); }
  };

  const onTest = async () => {
    setTesting(true);
    try {
      const env = type === "VIRTUAL" ? "paper" : "real";
      const { data: r, error } = await supabase.functions.invoke("kis-proxy", { body: { action: "test", env } });
      if (error) throw new Error(error.message);
      if ((r as any)?.error) throw new Error((r as any).error);
      toast.success("연결 성공");
      refresh();
    } catch (e: any) {
      toast.error(`연결 실패: ${e.message}`);
    } finally { setTesting(false); }
  };

  const onClear = async () => {
    if (!confirm("저장된 API 키를 삭제하시겠습니까?")) return;
    await clear();
    toast.success("삭제되었습니다");
  };

  const StatusBadge = () => {
    if (data?.is_connected)
      return <span className="inline-flex items-center gap-1 rounded-md border border-primary/30 bg-primary/15 px-2 py-1 text-xs font-medium text-primary"><CheckCircle2 className="h-3 w-3" />연결됨</span>;
    if (data?.kis_app_key)
      return <span className="inline-flex items-center gap-1 rounded-md border border-yellow-500/30 bg-yellow-500/15 px-2 py-1 text-xs font-medium text-yellow-400"><AlertCircle className="h-3 w-3" />미테스트</span>;
    return <span className="inline-flex items-center gap-1 rounded-md border border-border bg-muted/30 px-2 py-1 text-xs font-medium text-muted-foreground"><Circle className="h-3 w-3" />미연결</span>;
  };

  return (
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
          본인의 한투 API 키는 <span className="text-foreground font-medium">사용자 본인만</span> 조회·수정 가능합니다.
          운영자도 다른 사용자 키를 볼 수 없습니다. 모든 KIS 호출은 Edge Function 프록시를 통해 본인 키로만 실행됩니다.
        </div>
      </div>

      {loading ? (
        <div className="text-sm text-muted-foreground py-4">불러오는 중...</div>
      ) : (
        <div className="grid gap-3">
          <div className="grid gap-1.5">
            <Label>앱키 (App Key) {data?.kis_app_key && <span className="text-xs text-muted-foreground">— 저장됨 (보안상 비표시)</span>}</Label>
            <Input type="password" value={appKey} onChange={(e) => setAppKey(e.target.value)} placeholder={data?.kis_app_key ? "변경 시에만 입력" : "한투 OpenAPI App Key"} />
          </div>
          <div className="grid gap-1.5">
            <Label>앱 시크릿 (App Secret)</Label>
            <Input type="password" value={appSecret} onChange={(e) => setAppSecret(e.target.value)} placeholder={data?.kis_app_secret ? "변경 시에만 입력" : "한투 OpenAPI App Secret"} />
          </div>
          <div className="grid gap-1.5">
            <Label>계좌번호 (10자리, 예: 12345678-01)</Label>
            <Input value={account} onChange={(e) => setAccount(e.target.value)} placeholder="12345678-01" />
          </div>
          <div className="grid gap-1.5">
            <Label>계좌 유형</Label>
            <Select value={type} onValueChange={(v: "REAL" | "VIRTUAL") => setType(v)}>
              <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="REAL">실전투자</SelectItem>
                <SelectItem value="VIRTUAL">모의투자</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-wrap gap-2 pt-2">
            <Button onClick={onSave} disabled={saving}>
              {saving ? "저장 중..." : data?.kis_app_key ? "키 업데이트" : "저장"}
            </Button>
            <Button variant="outline" onClick={onTest} disabled={testing || !data?.kis_app_key}>
              <RefreshCw className={`h-4 w-4 mr-1 ${testing ? "animate-spin" : ""}`} />
              연결 테스트
            </Button>
            {data?.kis_app_key && (
              <Button variant="ghost" onClick={onClear} className="text-destructive ml-auto">
                <Trash2 className="h-4 w-4 mr-1" />키 삭제
              </Button>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}
