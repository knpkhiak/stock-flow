import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export type LikeTarget = "post" | "shared_idea" | "comment";

export function useLike(targetType: LikeTarget, targetId: string, initialCount = 0) {
  const { user } = useAuth();
  const [liked, setLiked] = useState(false);
  const [count, setCount] = useState(initialCount);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setCount(initialCount);
  }, [initialCount]);

  useEffect(() => {
    if (!user || !targetId) return;
    (async () => {
      const { data } = await supabase
        .from("likes")
        .select("user_id")
        .eq("user_id", user.id)
        .eq("target_type", targetType)
        .eq("target_id", targetId)
        .maybeSingle();
      setLiked(!!data);
    })();
  }, [user, targetType, targetId]);

  const toggle = useCallback(async () => {
    if (!user || busy) return;
    setBusy(true);
    const prevLiked = liked;
    const prevCount = count;
    setLiked(!prevLiked);
    setCount(prevCount + (prevLiked ? -1 : 1));
    try {
      const { data, error } = await supabase.rpc("toggle_like", {
        p_target_type: targetType,
        p_target_id: targetId,
      });
      if (error) throw error;
      const r = data as any;
      setLiked(r.liked);
      setCount(r.count);
    } catch {
      setLiked(prevLiked);
      setCount(prevCount);
    } finally {
      setBusy(false);
    }
  }, [user, busy, liked, count, targetType, targetId]);

  return { liked, count, toggle, busy };
}
