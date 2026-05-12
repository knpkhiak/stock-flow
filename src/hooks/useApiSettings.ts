import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface ApiSettings {
  user_id: string;
  kis_app_key: string | null;
  kis_app_secret: string | null;
  kis_account_number: string | null;
  kis_account_type: "REAL" | "VIRTUAL";
  is_connected: boolean;
  last_connected_at: string | null;
}

export function useApiSettings() {
  const { user } = useAuth();
  const [data, setData] = useState<ApiSettings | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) { setData(null); setLoading(false); return; }
    setLoading(true);
    const { data: row } = await supabase
      .from("api_settings")
      .select("user_id,kis_app_key,kis_app_secret,kis_account_number,kis_account_type,is_connected,last_connected_at")
      .eq("user_id", user.id)
      .maybeSingle();
    setData((row as ApiSettings) ?? null);
    setLoading(false);
  }, [user]);

  useEffect(() => { refresh(); }, [refresh]);

  const save = useCallback(
    async (input: { kis_app_key: string; kis_app_secret: string; kis_account_number: string; kis_account_type: "REAL" | "VIRTUAL" }) => {
      if (!user) throw new Error("로그인 필요");
      const { error } = await supabase.from("api_settings").upsert({
        user_id: user.id,
        kis_app_key: input.kis_app_key.trim(),
        kis_app_secret: input.kis_app_secret.trim(),
        kis_account_number: input.kis_account_number.trim(),
        kis_account_type: input.kis_account_type,
        is_connected: false,
        last_token: null,
        token_expires_at: null,
      }, { onConflict: "user_id" });
      if (error) throw error;
      await refresh();
    },
    [user, refresh],
  );

  const clear = useCallback(async () => {
    if (!user) return;
    await supabase.from("api_settings").delete().eq("user_id", user.id);
    await refresh();
  }, [user, refresh]);

  return { data, loading, refresh, save, clear };
}
