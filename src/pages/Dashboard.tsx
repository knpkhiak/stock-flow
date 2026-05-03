import { Wallet, TrendingUp, Activity, Lightbulb } from "lucide-react";
import { Card } from "@/components/ui/card";
import { StatCard } from "@/components/StatCard";

export default function Dashboard() {
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-semibold">대시보드</h1>
        <p className="text-sm text-muted-foreground mt-1">전체 자산 현황을 한눈에 확인하세요</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <StatCard label="총 금융자산" value="₩0" hint="모든 계좌 합계" icon={Wallet} accent="primary" />
        <StatCard label="이달 실현손익" value="+₩0" hint="2026년 5월" icon={TrendingUp} accent="primary" />
        <StatCard label="오픈 포지션" value="0" hint="현재 보유 중" icon={Activity} accent="secondary" />
      </div>

      <Card className="glass-card p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">최근 아이디어 노트</h2>
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {[1, 2].map((i) => (
            <div key={i} className="rounded-lg border border-border bg-muted/20 p-4">
              <div className="text-sm text-muted-foreground">아이디어 #{i}</div>
              <div className="mt-1 text-foreground">아직 작성된 노트가 없습니다.</div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
