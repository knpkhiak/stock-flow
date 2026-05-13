import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Check, X } from "lucide-react";
import { validateNickname } from "@/lib/profileUtils";
import { checkNicknameAvailable } from "@/hooks/useNickname";
import { INVITE_KEY } from "./Invite";

// 아이디 → 내부 이메일 변환 (Supabase Auth는 이메일을 요구하므로 가짜 도메인 사용)
const USERNAME_DOMAIN = "stockflow.local";
const usernameToEmail = (u: string) => `${u.trim().toLowerCase()}@${USERNAME_DOMAIN}`;
const isValidUsername = (u: string) => /^[a-zA-Z0-9_]{4,20}$/.test(u.trim());

export default function Login() {
  const location = useLocation();
  const nav = useNavigate();
  const { user } = useAuth();
  const isSignup = location.pathname === "/signup";
  const [mode, setMode] = useState<"login" | "signup">(isSignup ? "signup" : "login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [nickname, setNickname] = useState("");
  const [nickAvail, setNickAvail] = useState<boolean | null>(null);
  const [nickReason, setNickReason] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // 회원가입 모드는 초대 코드 필요
  useEffect(() => {
    if (mode === "signup" && !sessionStorage.getItem(INVITE_KEY)) {
      nav("/invite", { replace: true });
    }
  }, [mode, nav]);

  useEffect(() => {
    if (user) nav("/dashboard", { replace: true });
  }, [user, nav]);

  // 닉네임 실시간 검증
  useEffect(() => {
    if (mode !== "signup") return;
    setNickAvail(null); setNickReason(null);
    const v = nickname.trim();
    if (!v) return;
    const c = validateNickname(v);
    if (!c.ok) { setNickReason(c.reason || ""); return; }
    const t = setTimeout(async () => {
      const ok = await checkNicknameAvailable(v);
      setNickAvail(ok);
      if (!ok) setNickReason("이미 사용 중인 닉네임");
    }, 500);
    return () => clearTimeout(t);
  }, [nickname, mode]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidUsername(username)) {
      toast.error("아이디는 영문/숫자/_ 4~20자");
      return;
    }
    setBusy(true);
    const email = usernameToEmail(username);
    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("로그인 성공");
      } else {
        if (!nickAvail) { toast.error("닉네임을 확인해주세요"); return; }
        const inviteCode = sessionStorage.getItem(INVITE_KEY);
        if (!inviteCode) { nav("/invite", { replace: true }); return; }

        const { data: signUp, error: sErr } = await supabase.auth.signUp({
          email, password,
          options: { emailRedirectTo: `${window.location.origin}/dashboard` },
        });
        if (sErr) throw sErr;
        const newUserId = signUp.user?.id;

        if (!signUp.session) {
          await supabase.auth.signInWithPassword({ email, password });
        }

        if (newUserId) {
          const { error: pErr } = await supabase.from("user_profiles").insert({
            user_id: newUserId, nickname: nickname.trim(),
          });
          if (pErr) throw pErr;
          const { error: uErr } = await supabase.rpc("use_invite_code", {
            p_code: inviteCode, p_user_id: newUserId,
          });
          if (uErr) throw uErr;
        }
        sessionStorage.removeItem(INVITE_KEY);
        toast.success("가입이 완료되었습니다");
      }
    } catch (err: any) {
      toast.error(err.message ?? "오류가 발생했습니다");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,hsl(158_84%_39%/0.15),transparent_60%)]" />
      <Card className="glass-card w-full max-w-md p-8 relative">
        <div className="flex items-center gap-3 mb-8">
          <div className="h-10 w-10 rounded-lg bg-[image:var(--gradient-primary)] flex items-center justify-center font-bold text-primary-foreground shadow-[var(--shadow-glow)]">
            S
          </div>
          <div>
            <h1 className="text-xl font-semibold">STOCK-FLOW</h1>
            <p className="text-xs text-muted-foreground">개인 금융자산 관리</p>
          </div>
        </div>

        <h2 className="text-2xl font-semibold mb-6">
          {mode === "login" ? "로그인" : "회원가입"}
        </h2>

        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">이메일</Label>
            <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">비밀번호</Label>
            <Input id="password" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          {mode === "signup" && (
            <div className="space-y-2">
              <Label htmlFor="nickname">닉네임 (2~20자)</Label>
              <div className="relative">
                <Input
                  id="nickname"
                  required
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  maxLength={20}
                />
                {nickname.trim().length >= 2 && nickAvail !== null && (
                  <span className="absolute right-2 top-1/2 -translate-y-1/2">
                    {nickAvail
                      ? <Check className="h-4 w-4 text-primary" />
                      : <X className="h-4 w-4 text-destructive" />}
                  </span>
                )}
              </div>
              {nickReason && <p className="text-xs text-destructive">{nickReason}</p>}
              {nickAvail && <p className="text-xs text-primary">사용 가능</p>}
            </div>
          )}
          <Button type="submit" disabled={busy} className="w-full">
            {busy ? "처리 중..." : mode === "login" ? "로그인" : "가입하기"}
          </Button>
        </form>

        <div className="mt-6 text-center text-sm text-muted-foreground">
          {mode === "login" ? (
            <>
              초대 코드를 받으셨나요?{" "}
              <button type="button" onClick={() => nav("/invite")} className="text-primary hover:underline font-medium">
                회원가입
              </button>
            </>
          ) : (
            <>
              이미 계정이 있으신가요?{" "}
              <button type="button" onClick={() => setMode("login")} className="text-primary hover:underline font-medium">
                로그인
              </button>
            </>
          )}
        </div>
      </Card>
    </div>
  );
}
