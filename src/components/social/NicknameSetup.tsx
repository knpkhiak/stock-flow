import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { validateNickname } from "@/lib/profileUtils";
import { checkNicknameAvailable } from "@/hooks/useNickname";
import { Check, X } from "lucide-react";

interface Props {
  open: boolean;
  initialNickname?: string;
  forced?: boolean;
  onSaved: (nickname: string) => void;
  onOpenChange?: (o: boolean) => void;
}

export default function NicknameSetup({ open, initialNickname = "", forced, onSaved, onOpenChange }: Props) {
  const [value, setValue] = useState(initialNickname);
  const [available, setAvailable] = useState<boolean | null>(null);
  const [reason, setReason] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setValue(initialNickname);
  }, [initialNickname, open]);

  useEffect(() => {
    setAvailable(null); setReason(null);
    const v = value.trim();
    const check = validateNickname(v);
    if (!check.ok) { setReason(check.reason || ""); return; }
    if (v === initialNickname) { setAvailable(true); return; }
    const t = setTimeout(async () => {
      const ok = await checkNicknameAvailable(v);
      setAvailable(ok);
      if (!ok) setReason("이미 사용 중인 닉네임");
    }, 500);
    return () => clearTimeout(t);
  }, [value, initialNickname]);

  const submit = async () => {
    if (!available) return;
    setBusy(true);
    try {
      const { error } = await supabase.rpc("change_nickname", { new_nickname: value.trim() });
      if (error) throw error;
      toast.success("닉네임이 저장되었습니다");
      onSaved(value.trim());
    } catch (e: any) {
      toast.error(`저장 실패: ${e.message}`);
    } finally { setBusy(false); }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!forced) onOpenChange?.(o); }}>
      <DialogContent onPointerDownOutside={(e) => forced && e.preventDefault()} onEscapeKeyDown={(e) => forced && e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>닉네임 설정</DialogTitle>
          <DialogDescription>
            친구들에게 보여질 닉네임을 입력해주세요. (2~20자, 한글/영문/숫자)
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="nickname">닉네임</Label>
          <div className="relative">
            <Input
              id="nickname"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              maxLength={20}
              autoFocus
            />
            {value.trim().length >= 2 && available !== null && (
              <span className="absolute right-2 top-1/2 -translate-y-1/2">
                {available
                  ? <Check className="h-4 w-4 text-primary" />
                  : <X className="h-4 w-4 text-destructive" />}
              </span>
            )}
          </div>
          {reason && <p className="text-xs text-destructive">{reason}</p>}
          {available && <p className="text-xs text-primary">사용 가능한 닉네임입니다</p>}
        </div>
        <DialogFooter>
          <Button onClick={submit} disabled={!available || busy}>
            {busy ? "저장 중..." : "저장"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
