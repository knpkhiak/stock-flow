import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AdminInvitesTab from "@/components/admin/AdminInvitesTab";
import AdminUsersTab from "@/components/admin/AdminUsersTab";
import { Shield } from "lucide-react";

export default function AdminPage() {
  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-semibold flex items-center gap-2">
          <Shield className="h-6 w-6 text-primary" /> 관리자
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          초대 코드 발급과 사용자 권한을 관리합니다 (운영자 전용)
        </p>
      </div>

      <Tabs defaultValue="invites" className="w-full">
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="invites">🎟️ 초대 코드</TabsTrigger>
          <TabsTrigger value="users">👥 사용자 관리</TabsTrigger>
        </TabsList>
        <TabsContent value="invites" className="mt-4"><AdminInvitesTab /></TabsContent>
        <TabsContent value="users" className="mt-4"><AdminUsersTab /></TabsContent>
      </Tabs>
    </div>
  );
}
