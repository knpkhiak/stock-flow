import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useMyProfile } from "@/hooks/useNickname";
import NicknameSetup from "@/components/social/NicknameSetup";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function ProfileCard() {
  const { user } = useAuth();
  const { profile, refresh } = useMyProfile();
  const [open, setOpen] = useState(false);
  const [resetting, setResetting] = useState(false);

  const onResetPassword = async () => {
    if (!user?.email) return;
    setResetting(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
        redirectTo: `${window.location.origin}/login`,
      });
      if (error) throw error;
      toast.success("비밀번호 재설정 메일을 보냈습니다");
    } catch (e: any) {
      toast.error(`전송 실패: ${e.message}`);
    } finally { setResetting(false); }
  };

  return (
    <Card className="glass-card p-6 space-y-4">
      <h2 className="text-lg font-semibold">프로필</h2>
      <div className="grid gap-1.5">
        <Label className="text-xs">이메일</Label>
        <Input value={user?.email ?? ""} readOnly />
      </div>
      <div className="flex items-end gap-3">
        <div className="flex-1 grid gap-1.5">
          <Label className="text-xs">닉네임</Label>
          <Input value={profile?.nickname ?? ""} readOnly />
        </div>
        <Button variant="outline" onClick={() => setOpen(true)}>변경</Button>
      </div>
      <div>
        <Button variant="ghost" size="sm" onClick={onResetPassword} disabled={resetting}>
          {resetting ? "전송 중..." : "비밀번호 재설정 메일 보내기"}
        </Button>
      </div>
      <NicknameSetup
        open={open}
        onOpenChange={setOpen}
        initialNickname={profile?.nickname || ""}
        onSaved={() => { setOpen(false); refresh(); }}
      />
    </Card>
  );
}
