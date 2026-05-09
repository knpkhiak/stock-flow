import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ArrowLeft, Trash2, Link2, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useIdea } from "@/hooks/useIdeas";
import MarkdownEditor from "@/components/ideas/MarkdownEditor";
import IdeaStatusBadge from "@/components/ideas/StatusBadge";
import LinkedTradesCard from "@/components/ideas/LinkedTradesCard";
import TradeLinkModal from "@/components/ideas/TradeLinkModal";
import { deleteIdeaImagesFolder } from "@/lib/imageUpload";
import { useAuth } from "@/hooks/useAuth";
import type { IdeaStatus } from "@/types/idea";
import { STATUS_LABEL } from "@/types/idea";
import MarketIcon from "@/components/MarketIcon";

type SaveState = "saved" | "saving" | "error" | "dirty";

export default function IdeaDetail() {
  const { id } = useParams<{ id: string }>();
  const nav = useNavigate();
  const { user } = useAuth();
  const { idea, loading, refresh, setIdea } = useIdea(id);

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [status, setStatus] = useState<IdeaStatus>("watching");
  const [saveState, setSaveState] = useState<SaveState>("saved");
  const [linkOpen, setLinkOpen] = useState(false);
  const [delOpen, setDelOpen] = useState(false);
  const debouncer = useRef<number | null>(null);
  const initial = useRef(true);

  useEffect(() => {
    if (idea) {
      setTitle(idea.title);
      setContent(idea.content || "");
      setTagsInput(idea.tags.join(", "));
      setStatus(idea.status);
      initial.current = true;
    }
  }, [idea]);

  // 자동 저장 (5초 디바운스)
  useEffect(() => {
    if (!idea) return;
    if (initial.current) { initial.current = false; return; }
    setSaveState("dirty");
    if (debouncer.current) window.clearTimeout(debouncer.current);
    debouncer.current = window.setTimeout(() => { void save(); }, 5000);
    return () => { if (debouncer.current) window.clearTimeout(debouncer.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, content, tagsInput, status]);

  const save = async () => {
    if (!idea) return;
    setSaveState("saving");
    try {
      const tags = tagsInput.split(",").map((s) => s.trim()).filter(Boolean);
      const { error } = await supabase
        .from("ideas")
        .update({ title: title.trim() || "(제목 없음)", content, tags, status })
        .eq("id", idea.id);
      if (error) throw error;
      setSaveState("saved");
      setIdea({ ...idea, title, content, tags, status, updated_at: new Date().toISOString() });
    } catch (e: any) {
      setSaveState("error");
      toast.error(`저장 실패: ${e.message}`);
    }
  };

  const onStatusChange = (next: IdeaStatus) => {
    setStatus(next);
    if (next === "entered") setLinkOpen(true);
    if (next === "passed") {
      setTimeout(() => {
        if (confirm("연결된 매매도 함께 해제하시겠습니까?")) {
          supabase.from("trades").update({ idea_id: null }).eq("idea_id", idea!.id).then(() => {
            toast.success("연결 해제 완료");
          });
        }
      }, 100);
    }
  };

  const handleDelete = async () => {
    if (!idea || !user) return;
    try {
      // trades.idea_id는 ON DELETE SET NULL
      await supabase.from("ideas").delete().eq("id", idea.id);
      await deleteIdeaImagesFolder(user.id, idea.id);
      toast.success("아이디어를 삭제했습니다");
      nav("/ideas");
    } catch (e: any) {
      toast.error(`삭제 실패: ${e.message}`);
    }
  };

  if (loading) return <div className="text-center text-muted-foreground py-12">불러오는 중...</div>;
  if (!idea) return <div className="text-center text-muted-foreground py-12">아이디어를 찾을 수 없습니다.</div>;

  return (
    <div className="space-y-4 max-w-5xl mx-auto">
      <div className="flex items-center justify-between gap-2">
        <Button variant="ghost" size="sm" onClick={() => nav("/ideas")}>
          <ArrowLeft className="h-4 w-4" />목록으로
        </Button>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {saveState === "saved" && "저장됨"}
            {saveState === "saving" && "저장 중..."}
            {saveState === "dirty" && "변경됨"}
            {saveState === "error" && <span className="text-destructive">저장 실패</span>}
          </span>
          <Button size="sm" variant="outline" onClick={save}>저장</Button>
          <Button size="sm" variant="destructive" onClick={() => setDelOpen(true)}>
            <Trash2 className="h-4 w-4" />삭제
          </Button>
        </div>
      </div>

      <Card className="glass-card p-5 space-y-3">
        <div className="flex items-start gap-3 flex-wrap">
          <Input
            className="text-xl font-semibold flex-1 min-w-[200px]"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="제목"
          />
          <Select value={status} onValueChange={(v) => onStatusChange(v as IdeaStatus)}>
            <SelectTrigger className="w-32">
              <SelectValue>
                <IdeaStatusBadge status={status} />
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {(["watching", "entered", "passed"] as IdeaStatus[]).map((s) => (
                <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {idea.ticker && (
            <>
              {idea.market && <MarketIcon market={idea.market} />}
              <span>{idea.ticker}</span>
              <span>·</span>
            </>
          )}
          <span>작성 {new Date(idea.created_at).toLocaleDateString("ko-KR")}</span>
          <span>·</span>
          <span>수정 {new Date(idea.updated_at).toLocaleDateString("ko-KR")}</span>
        </div>
      </Card>

      <Card className="glass-card p-2">
        <MarkdownEditor value={content} onChange={setContent} ideaId={idea.id} height={500} />
      </Card>

      <Card className="glass-card p-4">
        <label className="text-xs text-muted-foreground">태그 (쉼표 구분)</label>
        <Input value={tagsInput} onChange={(e) => setTagsInput(e.target.value)} placeholder="반도체, 사이클, 장기" />
      </Card>

      <Card className="glass-card p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm">💼 연결된 매매</h3>
          <Button size="sm" variant="outline" onClick={() => setLinkOpen(true)}>
            <Link2 className="h-4 w-4" />매매 연결
          </Button>
        </div>
        <LinkedTradesCard ideaId={idea.id} />
      </Card>

      <TradeLinkModal open={linkOpen} onOpenChange={setLinkOpen} ideaId={idea.id} onLinked={refresh} />

      <AlertDialog open={delOpen} onOpenChange={setDelOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>아이디어 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              이 아이디어와 연결된 매매의 연결이 해제됩니다. 첨부 이미지도 함께 삭제됩니다. 정말 삭제하시겠습니까?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>삭제</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
