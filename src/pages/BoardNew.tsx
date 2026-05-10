import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft } from "lucide-react";
import RichEditor from "@/components/ideas/RichEditor";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

const EMPTY = { type: "doc", content: [{ type: "paragraph" }] };

export default function BoardNew() {
  const nav = useNavigate();
  const { user } = useAuth();
  const [postId] = useState(() => crypto.randomUUID());
  const [title, setTitle] = useState("");
  const [content, setContent] = useState<any>(EMPTY);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!user) return;
    if (!title.trim()) { toast.error("제목을 입력해주세요"); return; }
    setBusy(true);
    try {
      const { data, error } = await supabase.from("board_posts")
        .insert({ id: postId, author_id: user.id, title: title.trim(), content })
        .select("id").single();
      if (error) throw error;
      toast.success("작성되었습니다");
      nav(`/board/${data.id}`);
    } catch (e: any) {
      toast.error(`작성 실패: ${e.message}`);
    } finally { setBusy(false); }
  };

  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      <div className="flex items-center justify-between gap-2">
        <Button variant="ghost" size="sm" onClick={() => nav("/board")}>
          <ArrowLeft className="h-4 w-4" />목록으로
        </Button>
        <Button size="sm" onClick={submit} disabled={busy}>{busy ? "작성 중..." : "작성 완료"}</Button>
      </div>
      <Card className="glass-card p-5">
        <Input className="text-xl font-semibold" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="제목" maxLength={100} />
      </Card>
      <Card className="glass-card p-0 overflow-hidden">
        <RichEditor value={content} onChange={setContent} ideaId={`board-${postId}`} placeholder="자유롭게 작성해주세요..." />
      </Card>
    </div>
  );
}
