import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft } from "lucide-react";
import RichEditor from "@/components/ideas/RichEditor";
import { useBoardPost } from "@/hooks/useBoardPosts";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function BoardEdit() {
  const { id } = useParams<{ id: string }>();
  const nav = useNavigate();
  const { user } = useAuth();
  const { post, loading } = useBoardPost(id);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState<any>({ type: "doc", content: [{ type: "paragraph" }] });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (post) { setTitle(post.title); setContent(post.content); }
  }, [post]);

  if (loading) return <div className="text-center text-muted-foreground py-12">불러오는 중...</div>;
  if (!post) return <div className="text-center text-muted-foreground py-12">게시글을 찾을 수 없습니다.</div>;
  if (post.author_id !== user?.id) return <div className="text-center text-muted-foreground py-12">권한이 없습니다.</div>;

  const submit = async () => {
    if (!title.trim()) { toast.error("제목을 입력해주세요"); return; }
    setBusy(true);
    try {
      const { error } = await supabase.from("board_posts")
        .update({ title: title.trim(), content }).eq("id", post.id);
      if (error) throw error;
      toast.success("수정되었습니다");
      nav(`/board/${post.id}`);
    } catch (e: any) {
      toast.error(`수정 실패: ${e.message}`);
    } finally { setBusy(false); }
  };

  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      <div className="flex items-center justify-between gap-2">
        <Button variant="ghost" size="sm" onClick={() => nav(`/board/${post.id}`)}>
          <ArrowLeft className="h-4 w-4" />취소
        </Button>
        <Button size="sm" onClick={submit} disabled={busy}>{busy ? "저장 중..." : "저장"}</Button>
      </div>
      <Card className="glass-card p-5">
        <Input className="text-xl font-semibold" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={100} />
      </Card>
      <Card className="glass-card p-0 overflow-hidden">
        <RichEditor value={content} onChange={setContent} ideaId={`board-${post.id}`} />
      </Card>
    </div>
  );
}
