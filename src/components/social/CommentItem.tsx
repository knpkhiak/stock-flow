import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import AuthorBadge from "./AuthorBadge";
import LikeButton from "./LikeButton";
import type { Comment } from "@/hooks/useComments";
import { Pencil, Reply, Trash2, X, Check } from "lucide-react";
import { toast } from "sonner";

interface Props {
  comment: Comment;
  isMine: boolean;
  isReply?: boolean;
  onReply?: (content: string) => Promise<void>;
  onUpdate: (content: string) => Promise<void>;
  onDelete: () => Promise<void>;
}

export default function CommentItem({ comment, isMine, isReply, onReply, onUpdate, onDelete }: Props) {
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(comment.content);
  const [replying, setReplying] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [busy, setBusy] = useState(false);

  if (comment.is_deleted) {
    return (
      <div className="rounded-md border border-border/50 bg-muted/10 p-3 text-xs text-muted-foreground italic">
        삭제된 댓글입니다
      </div>
    );
  }

  const submitEdit = async () => {
    if (!editText.trim()) return;
    setBusy(true);
    try { await onUpdate(editText); setEditing(false); }
    catch (e: any) { toast.error(`수정 실패: ${e.message}`); }
    finally { setBusy(false); }
  };

  const submitReply = async () => {
    if (!replyText.trim() || !onReply) return;
    setBusy(true);
    try { await onReply(replyText); setReplyText(""); setReplying(false); }
    catch (e: any) { toast.error(`답글 실패: ${e.message}`); }
    finally { setBusy(false); }
  };

  const handleDelete = async () => {
    if (!confirm("댓글을 삭제하시겠습니까?")) return;
    try { await onDelete(); }
    catch (e: any) { toast.error(`삭제 실패: ${e.message}`); }
  };

  const wasEdited = comment.updated_at && comment.updated_at !== comment.created_at;

  return (
    <div className="rounded-md border border-border/50 bg-muted/10 p-3 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <AuthorBadge userId={comment.author_id} timestamp={comment.created_at} />
        {isMine && !editing && (
          <div className="flex gap-0.5">
            <button onClick={() => setEditing(true)} className="p-1 rounded hover:bg-accent text-muted-foreground" title="수정">
              <Pencil className="h-3 w-3" />
            </button>
            <button onClick={handleDelete} className="p-1 rounded hover:bg-accent text-destructive" title="삭제">
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        )}
      </div>

      {editing ? (
        <div className="space-y-2">
          <Textarea value={editText} onChange={(e) => setEditText(e.target.value)} rows={2} className="resize-none text-sm" />
          <div className="flex gap-1 justify-end">
            <Button size="sm" variant="ghost" onClick={() => { setEditing(false); setEditText(comment.content); }}>
              <X className="h-3 w-3" />취소
            </Button>
            <Button size="sm" onClick={submitEdit} disabled={busy}>
              <Check className="h-3 w-3" />저장
            </Button>
          </div>
        </div>
      ) : (
        <p className="text-sm whitespace-pre-wrap break-words">
          {comment.content}
          {wasEdited && <span className="ml-1 text-[10px] text-muted-foreground">(수정됨)</span>}
        </p>
      )}

      <div className="flex items-center gap-2">
        <LikeButton targetType="comment" targetId={comment.id} size="sm" />
        {!isReply && onReply && (
          <button
            onClick={() => setReplying((v) => !v)}
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <Reply className="h-3 w-3" />답글
          </button>
        )}
      </div>

      {replying && (
        <div className="space-y-2 pt-2 border-t border-border/30">
          <Textarea value={replyText} onChange={(e) => setReplyText(e.target.value)} rows={2}
            placeholder="답글을 입력하세요" className="resize-none text-sm" />
          <div className="flex gap-1 justify-end">
            <Button size="sm" variant="ghost" onClick={() => { setReplying(false); setReplyText(""); }}>취소</Button>
            <Button size="sm" onClick={submitReply} disabled={busy || !replyText.trim()}>답글 작성</Button>
          </div>
        </div>
      )}
    </div>
  );
}
