import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Idea } from "@/types/idea";

export function useIdeas() {
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("ideas")
      .select("*")
      .order("updated_at", { ascending: false });
    if (!error && data) setIdeas(data as Idea[]);
    setLoading(false);
  }, []);

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
