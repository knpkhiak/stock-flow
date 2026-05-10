import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useInviteCodes } from "@/hooks/useInviteCode";
import { useProfiles } from "@/hooks/useNickname";
import { Copy, Plus, Trash2, MessageSquare, UserCheck } from "lucide-react";
import { toast } from "sonner";

export default function InviteCodeManager() {
  const { codes, loading, issue, remove } = useInviteCodes();
  const [open, setOpen] = useState(false);
  const [memo, setMemo] = useState("");
  const [busy, setBusy] = useState(false);

  const usedByIds = codes.filter((c) => c.used_by).map((c) => c.used_by!) as string[];
  const profiles = useProfiles(usedByIds);

  const onIssue = async () => {
    setBusy(true);
    try {
      const code = await issue(memo.trim() || undefined);
      toast.success(`코드 발급: ${code}`);
      setOpen(false); setMemo("");
    } catch (e: any) {
      toast.error(`발급 실패: ${e.message}`);
    } finally { setBusy(false); }
  };

  const copy = async (text: string, label = "복사 완료") => {
    try { await navigator.clipboard.writeText(text); toast.success(label); }
    catch { toast.error("복사 실패"); }
  };

  const shareMessage = (code: string) => `STOCK-FLOW 초대장 🎉

내가 사용하는 트레이딩 일지 + 자산관리 앱이야.
한투 MTS에서 매매하면 자동으로 기록되고,
서로 분석 노트도 공유할 수 있어.

🔗 가입 URL:
${window.location.origin}/invite

🎟️ 초대 코드:
${code}`;

  const onRemove = async (id: string) => {
    if (!confirm("이 코드를 폐기하시겠습니까?")) return;
    try { await remove(id); toast.success("폐기되었습니다"); }
    catch (e: any) { toast.error(`폐기 실패: ${e.message}`); }
  };

  return (
    <Card className="glass-card p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <UserCheck className="h-5 w-5 text-primary" />친구 초대
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            친구를 STOCK-FLOW에 초대하려면 코드를 발급하세요. (8자리 1회용)
          </p>
        </div>
        <Button onClick={() => setOpen(true)} size="sm">
          <Plus className="h-4 w-4" />새 초대 코드
        </Button>
      </div>

      {loading ? (
        <div className="text-sm text-muted-foreground py-4 text-center">불러오는 중...</div>
      ) : codes.length === 0 ? (
        <div className="text-sm text-muted-foreground py-6 text-center">발급한 초대 코드가 없습니다</div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>코드</TableHead>
              <TableHead>메모</TableHead>
              <TableHead>상태</TableHead>
              <TableHead>발급일</TableHead>
              <TableHead className="text-right">작업</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {codes.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="font-mono font-semibold">{c.code}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{c.memo || "—"}</TableCell>
                <TableCell>
                  {c.is_used ? (
                    <span className="inline-flex items-center gap-1 text-xs text-primary">
                      🟢 {c.used_by ? profiles[c.used_by]?.nickname || "사용됨" : "사용됨"}
                    </span>
                  ) : (
                    <span className="text-xs text-yellow-500">🟡 미사용</span>
                  )}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {new Date(c.created_at).toLocaleDateString("ko-KR")}
                </TableCell>
                <TableCell className="text-right">
                  {c.is_used ? (
                    <span className="text-xs text-muted-foreground">
                      {c.used_at && new Date(c.used_at).toLocaleDateString("ko-KR")}
                    </span>
                  ) : (
                    <div className="flex gap-1 justify-end">
                      <Button size="sm" variant="ghost" onClick={() => copy(c.code, "코드 복사 완료")} title="코드 복사">
                        <Copy className="h-3 w-3" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => copy(shareMessage(c.code), "공유 메시지 복사 완료")} title="공유 메시지 복사">
                        <MessageSquare className="h-3 w-3" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => onRemove(c.id)} title="폐기" className="text-destructive">
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>새 초대 코드 발급</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label>메모 (선택)</Label>
            <Input value={memo} onChange={(e) => setMemo(e.target.value)} placeholder="예: 친구 OO에게 발급" maxLength={50} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>취소</Button>
            <Button onClick={onIssue} disabled={busy}>{busy ? "발급 중..." : "발급"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
