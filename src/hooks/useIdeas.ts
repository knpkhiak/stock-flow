import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Idea } from "@/types/idea";
import { useAuth } from "./useAuth";

export function useIdeas() {
  const { user } = useAuth();
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) { setIdeas([]); setLoading(false); return; }
    setLoading(true);
    // 본인 노트만 (공유 노트는 별도 페이지에서 useSharedIdeas 사용)
    const { data, error } = await supabase
      .from("ideas")
      .select("*")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false });
    if (!error && data) setIdeas(data as Idea[]);
    setLoading(false);
  }, [user]);

  useEffect(() => { refresh(); }, [refresh]);

  return { ideas, loading, refresh };
}

export function useIdea(id: string | undefined) {
  const [idea, setIdea] = useState<Idea | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    const { data } = await supabase.from("ideas").select("*").eq("id", id).maybeSingle();
    setIdea((data as Idea) || null);
    setLoading(false);
  }, [id]);

  useEffect(() => { refresh(); }, [refresh]);

  return { idea, loading, refresh, setIdea };
}
