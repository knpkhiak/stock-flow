import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Wallet, TrendingUp, Activity, Trophy, Lightbulb, AlertTriangle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { fmtKRW, fmtSignedKRW, fmtPct, fmtCompactKRW } from "@/lib/format";
import { PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip as RTooltip } from "recharts";
import MarketBadge from "@/components/trades/MarketBadge";
import MarketSessionBadge from "@/components/MarketSessionBadge";

type Snapshot = {
  id: string;
  snapshot_date: string;
  trading_balance: number;
  longterm_balance: number;
  cash_balance: number;
  total_balance: number;
};
type Trade = { id: string; name: string; market: string; status: string; entry_date: string };
type Close = { id: string; close_date: string; realized_pnl: number; pnl_rate: number; trade_id: string };

const ASSET = {
  trading: "hsl(158 84% 39%)",
  longterm: "hsl(217 91% 60%)",
  cash: "hsl(38 92% 50%)",
};
// Korean stock convention: 빨강=수익, 파랑=손실
const POS = "hsl(var(--profit))";
const NEG = "hsl(var(--loss))";

export default function Dashboard() {
  const nav = useNavigate();
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [closes, setCloses] = useState<Close[]>([]);

  useEffect(() => {
    (async () => {
      const [s, t, c] = await Promise.all([
        supabase.from("asset_snapshots").select("*").order("snapshot_date", { ascending: false }),
        supabase.from("trades").select("id,name,market,status,entry_date"),
        supabase.from("trade_closes").select("id,close_date,realized_pnl,pnl_rate,trade_id").order("close_date", { ascending: false }),
      ]);
      setSnapshots((s.data as Snapshot[]) || []);
      setTrades((t.data as Trade[]) || []);
      setCloses((c.data as Close[]) || []);
    })();
  }, []);

  const latest = snapshots[0];
  const prevMonth = useMemo(() => {
    if (!latest) return null;
    const target = new Date(latest.snapshot_date);
    target.setMonth(target.getMonth() - 1);
    let best: Snapshot | null = null;
    let bestDiff = Infinity;
    for (const s of snapshots) {
      if (s.id === latest.id) continue;
      const diff = Math.abs(new Date(s.snapshot_date).getTime() - target.getTime());
      if (diff < bestDiff) { best = s; bestDiff = diff; }
    }
    return best;
  }, [snapshots, latest]);

  const totalDeltaPct = latest && prevMonth && prevMonth.total_balance > 0
    ? ((latest.total_balance - prevMonth.total_balance) / prevMonth.total_balance) * 100 : null;

  const now = new Date();
  const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const monthCloses = closes.filter(c => c.close_date.startsWith(ym));
  const monthPnl = monthCloses.reduce((s, c) => s + Number(c.realized_pnl), 0);

  const openTrades = trades.filter(t => t.status === "OPEN" || t.status === "PARTIAL");
  const today = new Date();
  const avgHolding = openTrades.length
    ? Math.round(openTrades.reduce((s, t) => s + Math.floor((today.getTime() - new Date(t.entry_date).getTime()) / 86400000), 0) / openTrades.length)
    : 0;
  const longHold = openTrades.filter(t => Math.floor((today.getTime() - new Date(t.entry_date).getTime()) / 86400000) > 21).length;

  const winRate = closes.length ? (closes.filter(c => Number(c.realized_pnl) > 0).length / closes.length) * 100 : null;

  const donutData = latest ? [
    { name: "트레이딩", value: latest.trading_balance, color: ASSET.trading },
    { name: "장기투자", value: latest.longterm_balance, color: ASSET.longterm },
    { name: "현금", value: latest.cash_balance, color: ASSET.cash },
  ].filter(d => d.value > 0) : [];

  // 30-day cumulative pnl
  const pnlTrend = useMemo(() => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 30);
    const recent = closes
      .filter(c => new Date(c.close_date) >= cutoff)
      .sort((a, b) => a.close_date.localeCompare(b.close_date));
    let cum = 0;
    return recent.map(c => {
      cum += Number(c.realized_pnl);
      return { date: c.close_date, cum };
    });
  }, [closes]);

  const recent5 = closes.slice(0, 5);
  const tradeMap = new Map(trades.map(t => [t.id, t]));

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-semibold">대시보드</h1>
        <p className="text-sm text-muted-foreground mt-1">전체 자산 현황을 한눈에 확인하세요</p>
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          icon={<Wallet className="h-5 w-5" />}
          label="총 금융자산"
          value={latest ? fmtKRW(latest.total_balance) : "—"}
          hint={totalDeltaPct !== null ? `전월 대비 ${fmtPct(totalDeltaPct)}` : "데이터 없음"}
          hintColor={totalDeltaPct === null ? undefined : totalDeltaPct >= 0 ? POS : NEG}
        />
        <SummaryCard
          icon={<TrendingUp className="h-5 w-5" />}
          label="이달 실현손익"
          value={fmtSignedKRW(monthPnl)}
          valueColor={monthPnl >= 0 ? POS : NEG}
          hint={`이번 달 매매 ${monthCloses.length}회`}
        />
        <SummaryCard
          icon={<Activity className="h-5 w-5" />}
          label="오픈 포지션"
          value={openTrades.length.toString()}
          hint={openTrades.length ? `평균 보유일 D+${avgHolding}` : "—"}
          warning={longHold > 0 ? `장기 보유 ${longHold}건` : undefined}
        />
        <SummaryCard
          icon={<Trophy className="h-5 w-5" />}
          label="누적 승률"
          value={winRate !== null ? `${winRate.toFixed(1)}%` : "—"}
          hint={`전체 매매 ${closes.length}회`}
        />
      </div>

      {/* Mid grid */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="glass-card p-6 cursor-pointer hover:border-primary/40 transition" onClick={() => nav("/assets")}>
          <h3 className="text-sm font-medium text-muted-foreground mb-3">자산 비중</h3>
          {donutData.length === 0 ? (
            <div className="h-44 flex items-center justify-center text-sm text-muted-foreground">데이터 없음</div>
          ) : (
            <div className="relative h-44">
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={donutData} dataKey="value" innerRadius={50} outerRadius={70} paddingAngle={2}>
                    {donutData.map((d, i) => <Cell key={i} fill={d.color} stroke="none" />)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <div className="text-xs text-muted-foreground">총 자산</div>
                <div className="text-base font-bold num">{fmtKRW(latest!.total_balance)}</div>
              </div>
            </div>
          )}
        </Card>

        <Card className="glass-card p-6 cursor-pointer hover:border-primary/40 transition" onClick={() => nav("/assets")}>
          <h3 className="text-sm font-medium text-muted-foreground mb-3">최근 30일 누적 손익</h3>
          {pnlTrend.length === 0 ? (
            <div className="h-44 flex items-center justify-center text-sm text-muted-foreground">최근 청산 없음</div>
          ) : (
            <div className="h-44">
              <ResponsiveContainer>
                <LineChart data={pnlTrend}>
                  <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={10} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} tickFormatter={fmtCompactKRW} />
                  <RTooltip
                    contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }}
                    formatter={(v: number) => fmtSignedKRW(v)}
                  />
                  <Line type="monotone" dataKey="cum" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>
      </div>

      {/* Bottom grid */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="glass-card p-6 cursor-pointer hover:border-primary/40 transition" onClick={() => nav("/trades")}>
          <h3 className="text-sm font-medium text-muted-foreground mb-3">최근 매매 5건</h3>
          {recent5.length === 0 ? (
            <div className="text-sm text-muted-foreground py-6 text-center">청산된 매매가 없습니다</div>
          ) : (
            <div className="space-y-2">
              {recent5.map(c => {
                const t = tradeMap.get(c.trade_id);
                const rate = Number(c.pnl_rate);
                return (
                  <div key={c.id} className="flex items-center justify-between gap-2 rounded-md border border-border/50 bg-muted/10 p-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="truncate text-sm">{t?.name ?? "—"}</span>
                      {t && <MarketBadge market={t.market} />}
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-muted-foreground">{c.close_date}</div>
                      <div className="text-sm font-semibold num" style={{ color: rate >= 0 ? POS : NEG }}>
                        {fmtPct(rate)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        <Card className="glass-card p-6">
          <div className="flex items-center gap-2 mb-3">
            <Lightbulb className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-medium text-muted-foreground">최근 아이디어 노트</h3>
          </div>
          <div className="text-sm text-muted-foreground py-6 text-center">STEP 4에서 연동 예정</div>
        </Card>
      </div>
    </div>
  );
}

function SummaryCard({
  icon, label, value, valueColor, hint, hintColor, warning,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  valueColor?: string;
  hint?: string;
  hintColor?: string;
  warning?: string;
}) {
  return (
    <Card className="glass-card p-5">
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold mt-2 num truncate" style={valueColor ? { color: valueColor } : undefined}>{value}</p>
          {hint && <p className="text-xs mt-1" style={{ color: hintColor || "hsl(var(--muted-foreground))" }}>{hint}</p>}
          {warning && (
            <p className="text-xs mt-1 flex items-center gap-1" style={{ color: "hsl(38 92% 50%)" }}>
              <AlertTriangle className="h-3 w-3" />{warning}
            </p>
          )}
        </div>
        <div className="h-9 w-9 rounded-lg bg-muted/50 flex items-center justify-center text-primary shrink-0">
          {icon}
        </div>
      </div>
    </Card>
  );
}
