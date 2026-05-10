import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Idea } from "@/types/idea";

export type SharedSort = "latest" | "popular" | "comments";

export function useSharedIdeas(sort: SharedSort = "latest") {
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    let q = supabase.from("ideas").select("*").eq("is_shared", true);
    if (sort === "latest") q = q.order("shared_at", { ascending: false });
    else if (sort === "popular") q = q.order("like_count", { ascending: false });
    else q = q.order("comment_count", { ascending: false });
    const { data } = await q;
    setIdeas((data as Idea[]) || []);
    setLoading(false);
  }, [sort]);

  useEffect(() => { refresh(); }, [refresh]);
  return { ideas, loading, refresh };
}

export function useSharedIdea(id: string | undefined) {
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
  return { idea, loading, refresh };
}
