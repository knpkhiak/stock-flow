import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Pencil, Trash2 } from "lucide-react";
import { useBoardPost } from "@/hooks/useBoardPosts";
import { useAuth } from "@/hooks/useAuth";
import RichEditor from "@/components/ideas/RichEditor";
import AuthorBadge from "@/components/social/AuthorBadge";
import LikeButton from "@/components/social/LikeButton";
import CommentSection from "@/components/social/CommentSection";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function BoardDetail() {
  const { id } = useParams<{ id: string }>();
  const nav = useNavigate();
  const { user } = useAuth();
  const { post, loading } = useBoardPost(id);

  useEffect(() => {
    if (id) supabase.rpc("increment_post_view", { p_post_id: id });
  }, [id]);

  if (loading) return <div className="text-center text-muted-foreground py-12">불러오는 중...</div>;
  if (!post) return <div className="text-center text-muted-foreground py-12">게시글을 찾을 수 없습니다.</div>;

  const isMine = user?.id === post.author_id;

  const onDelete = async () => {
    if (!confirm("게시글을 삭제하시겠습니까?")) return;
    const { error } = await supabase.from("board_posts").delete().eq("id", post.id);
    if (error) { toast.error(error.message); return; }
    toast.success("삭제되었습니다");
    nav("/board");
  };

  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      <div className="flex items-center justify-between gap-2">
        <Button variant="ghost" size="sm" onClick={() => nav("/board")}>
          <ArrowLeft className="h-4 w-4" />목록으로
        </Button>
        {isMine && (
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => nav(`/board/${post.id}/edit`)}><Pencil className="h-4 w-4" />편집</Button>
            <Button size="sm" variant="destructive" onClick={onDelete}><Trash2 className="h-4 w-4" />삭제</Button>
          </div>
        )}
      </div>

      <Card className="glass-card p-6 space-y-3">
        <h1 className="text-2xl font-semibold">{post.title}</h1>
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <AuthorBadge userId={post.author_id} timestamp={post.created_at} isMine={isMine} />
          <span className="text-xs text-muted-foreground">조회 {post.view_count}</span>
        </div>
      </Card>

      <Card className="glass-card p-0 overflow-hidden">
        <RichEditor value={post.content} onChange={() => {}} ideaId={`board-${post.id}`} editable={false} />
      </Card>

      <Card className="glass-card p-6">
        <div className="flex items-center gap-3 mb-4">
          <LikeButton targetType="post" targetId={post.id} initialCount={post.like_count} />
          <span className="text-xs text-muted-foreground">💬 {post.comment_count}</span>
        </div>
        <CommentSection targetType="post" targetId={post.id} />
      </Card>
    </div>
  );
}
