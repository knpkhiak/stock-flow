import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface Comment {
  id: string;
  target_type: "post" | "shared_idea";
  target_id: string;
  author_id: string;
  parent_comment_id: string | null;
  content: string;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
}

export function useComments(targetType: "post" | "shared_idea", targetId: string | undefined) {
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!targetId) return;
    setLoading(true);
    const { data } = await supabase
      .from("comments")
      .select("*")
      .eq("target_type", targetType)
      .eq("target_id", targetId)
      .order("created_at", { ascending: true });
    setComments((data as Comment[]) || []);
    setLoading(false);
  }, [targetType, targetId]);

  useEffect(() => { refresh(); }, [refresh]);

  const add = useCallback(async (content: string, parentId?: string | null) => {
    if (!user || !targetId) throw new Error("로그인 필요");
    const { error } = await supabase.from("comments").insert({
      target_type: targetType,
      target_id: targetId,
      author_id: user.id,
      parent_comment_id: parentId || null,
      content: content.trim(),
    });
    if (error) throw error;
    await refresh();
  }, [user, targetType, targetId, refresh]);

  const update = useCallback(async (id: string, content: string) => {
    const { error } = await supabase.from("comments").update({ content: content.trim() }).eq("id", id);
    if (error) throw error;
    await refresh();
  }, [refresh]);

  const softDelete = useCallback(async (id: string) => {
    const { error } = await supabase.from("comments").update({ is_deleted: true }).eq("id", id);
    if (error) throw error;
    await refresh();
  }, [refresh]);

  return { comments, loading, refresh, add, update, softDelete };
}
