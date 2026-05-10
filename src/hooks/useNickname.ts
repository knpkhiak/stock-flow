import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface UserProfile {
  user_id: string;
  nickname: string;
  avatar_url: string | null;
}

export function useMyProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) { setProfile(null); setLoading(false); return; }
    setLoading(true);
    const { data } = await supabase
      .from("user_profiles")
      .select("user_id,nickname,avatar_url")
      .eq("user_id", user.id)
      .maybeSingle();
    setProfile((data as UserProfile) || null);
    setLoading(false);
  }, [user]);

  useEffect(() => { refresh(); }, [refresh]);
  return { profile, loading, refresh };
}

// 닉네임 캐시 (한 페이지 내에서 다수의 닉네임 lookup용)
const profileCache = new Map<string, UserProfile>();

export function useProfiles(userIds: string[]) {
  const [map, setMap] = useState<Record<string, UserProfile>>({});
  useEffect(() => {
    const unique = Array.from(new Set(userIds.filter(Boolean)));
    const missing = unique.filter((id) => !profileCache.has(id));
    if (missing.length === 0) {
      const next: Record<string, UserProfile> = {};
      unique.forEach((id) => { const p = profileCache.get(id); if (p) next[id] = p; });
      setMap(next);
      return;
    }
    (async () => {
      const { data } = await supabase
        .from("user_profiles")
        .select("user_id,nickname,avatar_url")
        .in("user_id", missing);
      (data || []).forEach((p: any) => profileCache.set(p.user_id, p));
      const next: Record<string, UserProfile> = {};
      unique.forEach((id) => { const p = profileCache.get(id); if (p) next[id] = p; });
      setMap(next);
    })();
  }, [userIds.join("|")]);
  return map;
}

export async function checkNicknameAvailable(nickname: string, exceptUserId?: string): Promise<boolean> {
  let q = supabase.from("user_profiles").select("user_id").eq("nickname", nickname);
  if (exceptUserId) q = q.neq("user_id", exceptUserId);
  const { data } = await q.limit(1);
  return !data || data.length === 0;
}
