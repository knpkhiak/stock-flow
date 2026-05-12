import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface MyProfile {
  user_id: string;
  nickname: string;
  avatar_url: string | null;
  is_admin: boolean;
}

export function useUserProfile() {
  const { user } = useAuth();
  const [data, setData] = useState<MyProfile | null>(null);
  const [isLoading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) { setData(null); setLoading(false); return; }
    setLoading(true);
    const { data: row } = await supabase
      .from("user_profiles")
      .select("user_id,nickname,avatar_url,is_admin")
      .eq("user_id", user.id)
      .maybeSingle();
    setData((row as MyProfile) ?? null);
    setLoading(false);
  }, [user]);

  useEffect(() => { refresh(); }, [refresh]);
  return { data, isLoading, refresh };
}
