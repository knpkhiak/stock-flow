import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export const INVITE_KEY = "stock-flow-invite-code";

export default function Invite() {
  const nav = useNavigate();
  const { user } = useAuth();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (user) nav("/dashboard", { replace: true });
  }, [user, nav]);

  const verify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length < 8) { toast.error("초대 코드를 입력해주세요"); return; }
    setBusy(true);
    try {
      const { data, error } = await supabase.rpc("verify_invite_code", { p_code: code });
      if (error) throw error;
      const r = data as any;
      if (!r?.valid) {
        const msg = r?.reason === "already_used" ? "이미 사용된 코드입니다" : "유효하지 않은 코드입니다";
        toast.error(msg);
        return;
      }
      sessionStorage.setItem(INVITE_KEY, code);
      nav("/signup", { replace: true });
    } catch (e: any) {
      toast.error(`확인 실패: ${e.message}`);
    } finally { setBusy(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,hsl(158_84%_39%/0.15),transparent_60%)]" />
      <Card className="glass-card w-full max-w-md p-8 relative">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-10 w-10 rounded-lg bg-[image:var(--gradient-primary)] flex items-center justify-center font-bold text-primary-foreground shadow-[var(--shadow-glow)]">
            S
          </div>
          <div>
            <h1 className="text-xl font-semibold">STOCK-FLOW</h1>
            <p className="text-xs text-muted-foreground">초대 전용 가입</p>
          </div>
        </div>

        <h2 className="text-lg font-semibold mb-2">초대 코드 입력</h2>
        <p className="text-sm text-muted-foreground mb-6">
          STOCK-FLOW는 초대받은 사용자만 가입 가능합니다.
        </p>

        <form onSubmit={verify} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="code">초대 코드</Label>
            <Input
              id="code"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 24))}
              maxLength={24}
              autoFocus
              placeholder="예: ABCD2345"
              className="font-mono tracking-widest text-center text-lg"
            />
          </div>
          <Button type="submit" disabled={busy || code.length < 8} className="w-full">
            {busy ? "확인 중..." : "코드 확인"}
          </Button>
        </form>

        <div className="mt-6 text-center text-sm text-muted-foreground">
          이미 계정이 있으신가요?{" "}
          <button onClick={() => nav("/login")} className="text-primary hover:underline font-medium">
            로그인
          </button>
        </div>
      </Card>
    </div>
  );
}
