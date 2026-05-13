import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  targetUserId: string | null;
  targetLabel: string;
}

export default function ResetPasswordDialog({ open, onOpenChange, targetUserId, targetLabel }: Props) {
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!targetUserId) return;
    if (pw.length < 6) return toast.error("비밀번호는 6자 이상이어야 합니다");
    if (pw !== pw2) return toast.error("비밀번호가 일치하지 않습니다");
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-reset-password", {
        body: { target_user_id: targetUserId, new_password: pw },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      toast.success(`${targetLabel} 비밀번호를 재설정했습니다`);
      setPw(""); setPw2("");
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message ?? "재설정 실패");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!busy) { onOpenChange(v); if (!v) { setPw(""); setPw2(""); } } }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>비밀번호 재설정 — {targetLabel}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid gap-1.5">
            <Label className="text-xs">새 비밀번호 (6자 이상)</Label>
            <Input type="password" value={pw} onChange={(e) => setPw(e.target.value)} autoFocus />
          </div>
          <div className="grid gap-1.5">
            <Label className="text-xs">비밀번호 확인</Label>
            <Input type="password" value={pw2} onChange={(e) => setPw2(e.target.value)} />
          </div>
          <p className="text-xs text-muted-foreground">
            재설정 후 사용자에게 새 비밀번호를 안전하게 전달하세요.
          </p>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={busy}>취소</Button>
          <Button onClick={submit} disabled={busy}>{busy ? "재설정 중..." : "재설정"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
