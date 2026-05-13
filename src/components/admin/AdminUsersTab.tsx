import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Shield, ShieldOff, Users, KeyRound, Lock } from "lucide-react";
import { useAdminUsers } from "@/hooks/useAdminUsers";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { useState } from "react";
import ResetPasswordDialog from "./ResetPasswordDialog";

export default function AdminUsersTab() {
  const { users, loading, error, setAdmin } = useAdminUsers();
  const { user } = useAuth();
  const [resetTarget, setResetTarget] = useState<{ id: string; label: string } | null>(null);

  const stats = useMemo(() => {
    const total = users.length;
    const admins = users.filter((u) => u.is_admin).length;
    const connected = users.filter((u) => u.api_connected).length;
    return { total, admins, connected };
  }, [users]);

  const onToggle = async (uid: string, current: boolean, nickname: string | null) => {
    const next = !current;
    if (!confirm(`${nickname ?? "이 사용자"}에게 운영자 권한을 ${next ? "부여" : "해제"}하시겠습니까?`)) return;
    try {
      await setAdmin(uid, next);
      toast.success(next ? "운영자 권한이 부여되었습니다" : "운영자 권한이 해제되었습니다");
    } catch (e: any) {
      toast.error(e.message ?? "처리 실패");
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <StatCard icon={<Users className="h-4 w-4" />} label="총 사용자" value={stats.total} />
        <StatCard icon={<Shield className="h-4 w-4" />} label="운영자" value={stats.admins} />
        <StatCard icon={<KeyRound className="h-4 w-4" />} label="API 연결" value={stats.connected} />
      </div>

      <Card className="glass-card p-4">
        {loading ? (
          <div className="text-sm text-muted-foreground py-6 text-center">불러오는 중...</div>
        ) : error ? (
          <div className="text-sm text-destructive py-6 text-center">{error}</div>
        ) : users.length === 0 ? (
          <div className="text-sm text-muted-foreground py-6 text-center">사용자가 없습니다</div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>닉네임</TableHead>
                  <TableHead>이메일</TableHead>
                  <TableHead>가입일</TableHead>
                  <TableHead>API</TableHead>
                  <TableHead>운영자</TableHead>
                  <TableHead className="text-right">권한</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u) => {
                  const isMe = u.user_id === user?.id;
                  return (
                    <TableRow key={u.user_id}>
                      <TableCell className="font-medium">{u.nickname ?? "—"}{isMe && <span className="ml-1 text-xs text-muted-foreground">(나)</span>}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{u.email ?? "—"}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{new Date(u.created_at).toLocaleDateString("ko-KR")}</TableCell>
                      <TableCell>{u.api_connected ? "🟢" : "⚪"}</TableCell>
                      <TableCell>{u.is_admin ? "✓" : "—"}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1.5">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setResetTarget({ id: u.user_id, label: u.nickname ?? u.email ?? u.user_id.slice(0, 8) })}
                            disabled={isMe}
                            title={isMe ? "본인 비밀번호는 설정 화면에서 변경하세요" : "비밀번호 재설정"}
                          >
                            <Lock className="h-3 w-3 mr-1" />비밀번호
                          </Button>
                          <Button
                            size="sm"
                            variant={u.is_admin ? "ghost" : "outline"}
                            onClick={() => onToggle(u.user_id, u.is_admin, u.nickname)}
                            disabled={isMe && u.is_admin}
                            title={isMe && u.is_admin ? "본인 권한은 해제할 수 없습니다" : ""}
                          >
                            {u.is_admin ? <><ShieldOff className="h-3 w-3 mr-1" />해제</> : <><Shield className="h-3 w-3 mr-1" />부여</>}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <Card className="glass-card p-4 flex items-center gap-3">
      <div className="h-9 w-9 rounded-lg bg-primary/15 text-primary flex items-center justify-center">{icon}</div>
      <div>
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="text-xl font-semibold">{value}</div>
      </div>
    </Card>
  );
}
