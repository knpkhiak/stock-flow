import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface BoardPost {
  id: string;
  author_id: string;
  title: string;
  content: any;
  view_count: number;
  like_count: number;
  comment_count: number;
  created_at: string;
  updated_at: string;
}

export type BoardSort = "latest" | "popular" | "views";

export function useBoardPosts(sort: BoardSort = "latest", search = "") {
  const [posts, setPosts] = useState<BoardPost[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    let q = supabase.from("board_posts").select("*");
    if (search.trim()) q = q.ilike("title", `%${search.trim()}%`);
    if (sort === "latest") q = q.order("created_at", { ascending: false });
    else if (sort === "popular") q = q.order("like_count", { ascending: false });
    else q = q.order("view_count", { ascending: false });
    const { data } = await q;
    setPosts((data as BoardPost[]) || []);
    setLoading(false);
  }, [sort, search]);

  useEffect(() => { refresh(); }, [refresh]);
  return { posts, loading, refresh };
}

export function useBoardPost(id: string | undefined) {
  const [post, setPost] = useState<BoardPost | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    const { data } = await supabase.from("board_posts").select("*").eq("id", id).maybeSingle();
    setPost((data as BoardPost) || null);
    setLoading(false);
  }, [id]);

  useEffect(() => { refresh(); }, [refresh]);
  return { post, loading, refresh };
}
