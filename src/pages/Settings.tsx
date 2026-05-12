import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ApiSettingsCard from "@/components/settings/ApiSettingsCard";
import ProfileCard from "@/components/settings/ProfileCard";
import DangerZoneCard from "@/components/settings/DangerZoneCard";

// 기존 코드 호환을 위한 헬퍼 (Trades/Assets 등에서 import)
const ENV_KEY = "stock-flow-kis-env";
const STATUS_KEY = "stock-flow-kis-status";
export function getKisEnv(): "real" | "paper" {
  return (localStorage.getItem(ENV_KEY) as "real" | "paper") || "real";
}
export function getKisStatus(): "connected" | "expired" | "none" {
  return (localStorage.getItem(STATUS_KEY) as any) || "none";
}

export default function SettingsPage() {
  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div>
        <h1 className="text-2xl font-semibold">설정</h1>
        <p className="text-sm text-muted-foreground mt-1">
          한국투자증권 API 연결, 프로필, 위험 영역을 관리합니다
        </p>
      </div>

      <Tabs defaultValue="api" className="w-full">
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="api">🔑 API 연결</TabsTrigger>
          <TabsTrigger value="profile">👤 프로필</TabsTrigger>
          <TabsTrigger value="danger">⚠️ 위험 영역</TabsTrigger>
        </TabsList>

        <TabsContent value="api" className="space-y-6 mt-4">
          <ApiSettingsCard />
        </TabsContent>
        <TabsContent value="profile" className="space-y-6 mt-4">
          <ProfileCard />
        </TabsContent>
        <TabsContent value="danger" className="space-y-6 mt-4">
          <DangerZoneCard />
        </TabsContent>
      </Tabs>
    </div>
  );
}
