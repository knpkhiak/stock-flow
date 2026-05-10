import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { generateInviteCode } from "@/lib/inviteCodeGenerator";

export interface InviteCode {
  id: string;
  code: string;
  is_used: boolean;
  used_by: string | null;
  used_at: string | null;
  memo: string | null;
  created_at: string;
}

export function useInviteCodes() {
  const { user } = useAuth();
  const [codes, setCodes] = useState<InviteCode[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from("invite_codes")
      .select("*")
      .eq("created_by", user.id)
      .order("created_at", { ascending: false });
    setCodes((data as InviteCode[]) || []);
    setLoading(false);
  }, [user]);

  useEffect(() => { refresh(); }, [refresh]);

  const issue = useCallback(async (memo?: string) => {
    if (!user) throw new Error("로그인 필요");
    // 충돌 시 재시도
    for (let i = 0; i < 5; i++) {
      const code = generateInviteCode(8);
      const { error } = await supabase.from("invite_codes").insert({
        code, created_by: user.id, memo: memo || null,
      });
      if (!error) { await refresh(); return code; }
      if (!error || (error as any).code !== "23505") throw error;
    }
    throw new Error("코드 생성 실패");
  }, [user, refresh]);

  const remove = useCallback(async (id: string) => {
    const { error } = await supabase.from("invite_codes").delete().eq("id", id);
    if (error) throw error;
    await refresh();
  }, [refresh]);

  return { codes, loading, refresh, issue, remove };
}
