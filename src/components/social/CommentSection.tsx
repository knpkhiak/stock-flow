import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useComments, type Comment } from "@/hooks/useComments";
import { useAuth } from "@/hooks/useAuth";
import CommentItem from "./CommentItem";
import { toast } from "sonner";

interface Props {
  targetType: "post" | "shared_idea";
  targetId: string;
}

export default function CommentSection({ targetType, targetId }: Props) {
  const { user } = useAuth();
  const { comments, loading, add, update, softDelete } = useComments(targetType, targetId);
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!text.trim()) return;
    setSubmitting(true);
    try {
      await add(text);
      setText("");
    } catch (e: any) {
      toast.error(`댓글 작성 실패: ${e.message}`);
    } finally { setSubmitting(false); }
  };

  // 트리 구조 (1단계만)
  const roots: Comment[] = comments.filter((c) => !c.parent_comment_id);
  const childrenOf = (id: string) => comments.filter((c) => c.parent_comment_id === id);

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold flex items-center gap-2">
        💬 댓글 <span className="text-muted-foreground font-normal">{comments.filter((c) => !c.is_deleted).length}</span>
      </h3>

      {user && (
        <div className="space-y-2">
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="댓글을 작성해주세요"
            rows={3}
            className="resize-none"
          />
          <div className="flex justify-end">
            <Button size="sm" onClick={submit} disabled={!text.trim() || submitting}>
              {submitting ? "작성 중..." : "댓글 작성"}
            </Button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-sm text-muted-foreground py-4 text-center">불러오는 중...</div>
      ) : roots.length === 0 ? (
        <div className="text-sm text-muted-foreground py-6 text-center">아직 댓글이 없습니다</div>
      ) : (
        <div className="space-y-3">
          {roots.map((root) => (
            <div key={root.id} className="space-y-2">
              <CommentItem
                comment={root}
                isMine={user?.id === root.author_id}
                onReply={(content) => add(content, root.id)}
                onUpdate={(content) => update(root.id, content)}
                onDelete={() => softDelete(root.id)}
              />
              <div className="ml-8 space-y-2">
                {childrenOf(root.id).map((child) => (
                  <CommentItem
                    key={child.id}
                    comment={child}
                    isMine={user?.id === child.author_id}
                    isReply
                    onUpdate={(content) => update(child.id, content)}
                    onDelete={() => softDelete(child.id)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
