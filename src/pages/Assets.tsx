import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Pencil, Trash2, ArrowUp, ArrowDown, TrendingUp, Wallet, PiggyBank, Banknote, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import SnapshotDialog from "@/components/assets/SnapshotDialog";
import CashDialog from "@/components/cash/CashDialog";
import MarketSessionBadge from "@/components/MarketSessionBadge";
import { getKisEnv } from "@/pages/Settings";
import { fmtKRW, fmtSignedKRW, fmtPct, fmtCompactKRW } from "@/lib/format";
import {
  PieChart, Pie, Cell, Tooltip as RTooltip, ResponsiveContainer,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Legend,
  BarChart, Bar, ReferenceLine,
} from "recharts";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { MARKETS, marketColorVar } from "@/components/trades/marketStyle";
import MarketBadge from "@/components/trades/MarketBadge";
import type { LongtermHolding, LongtermSell, CashTransaction } from "@/types/longterm";

type Snapshot = {
  id: string;
  snapshot_date: string;
  trading_balance: number;
  longterm_balance: number;
  cash_balance: number;
  total_balance: number;
  memo: string | null;
};

type TradeClose = {
  id: string;
  close_date: string;
  realized_pnl: number;
  trade_id: string;
};

type Trade = {
  id: string;
  market: string;
  status: string;
  entry_price?: number;
  remaining_quantity?: number;
};

const ASSET_COLORS = {
  trading: "hsl(158 84% 39%)",   // emerald
  longterm: "hsl(217 91% 60%)",  // blue
  cash: "hsl(38 92% 50%)",       // amber
  total: "hsl(210 40% 98%)",
};

// Korean stock convention: 빨강=수익, 파랑=손실
const POS = "hsl(var(--profit))";
const NEG = "hsl(var(--loss))";

const PERIODS = [
  { k: "1m", label: "1개월", days: 30 },
  { k: "3m", label: "3개월", days: 90 },
  { k: "6m", label: "6개월", days: 180 },
  { k: "1y", label: "1년", days: 365 },
  { k: "all", label: "전체", days: Infinity },
] as const;

export default function Assets() {
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [closes, setCloses] = useState<TradeClose[]>([]);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [holdings, setHoldings] = useState<LongtermHolding[]>([]);
  const [ltSells, setLtSells] = useState<LongtermSell[]>([]);
  const [cash, setCash] = useState<CashTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [dlgOpen, setDlgOpen] = useState(false);
  const [cashDlgOpen, setCashDlgOpen] = useState(false);
  const [editing, setEditing] = useState<Snapshot | undefined>();
  const [period, setPeriod] = useState<(typeof PERIODS)[number]["k"]>("3m");
  const [pnlGran, setPnlGran] = useState<"month" | "quarter" | "year" | "all">("month");
  const [pnlMarket, setPnlMarket] = useState<string>("전체");
  const [page, setPage] = useState(1);
  const [lines, setLines] = useState({ total: true, trading: true, longterm: true, cash: true });
  const [kisBalance, setKisBalance] = useState<{ holdings: number; cash: number; total: number } | null>(null);
  const [kisSyncing, setKisSyncing] = useState(false);
  const [lastKisSync, setLastKisSync] = useState<string | null>(localStorage.getItem("stock-flow-assets-kis-sync"));

  const load = async () => {
    setLoading(true);
    const [s, c, t, h, ls, ct] = await Promise.all([
      supabase.from("asset_snapshots").select("*").order("snapshot_date", { ascending: false }),
      supabase.from("trade_closes").select("id,close_date,realized_pnl,trade_id"),
      supabase.from("trades").select("id,market,status,entry_price,remaining_quantity"),
      supabase.from("longterm_holdings").select("*"),
      supabase.from("longterm_sells").select("*").order("sell_date", { ascending: true }),
      supabase.from("cash_transactions").select("*").order("transaction_date", { ascending: false }).order("created_at", { ascending: false }),
    ]);
    if (s.error) toast.error(s.error.message);
    setSnapshots((s.data as Snapshot[]) || []);
    setCloses((c.data as TradeClose[]) || []);
    setTrades((t.data as Trade[]) || []);
    setHoldings((h.data as LongtermHolding[]) || []);
    setLtSells((ls.data as LongtermSell[]) || []);
    setCash((ct.data as CashTransaction[]) || []);
    setLoading(false);
  };

  const syncKisBalance = async () => {
    setKisSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke("kis-proxy", {
        body: { action: "balance", env: getKisEnv() },
      });
      if (error) throw new Error(error.message);
      if ((data as any)?.error) throw new Error((data as any).error);
      const out2 = ((data as any)?.output2 ?? [])[0] ?? {};
      const total = Number(out2.tot_evlu_amt ?? 0);
      const cashBal = Number(out2.dnca_tot_amt ?? 0);
      const holdings = Math.max(0, total - cashBal);
      setKisBalance({ holdings, cash: cashBal, total });
      const stamp = new Date().toISOString();
      localStorage.setItem("stock-flow-assets-kis-sync", stamp);
      setLastKisSync(stamp);
      toast.success(`한투 동기화 완료: 총평가 ${fmtKRW(total)}`);
    } catch (e: any) {
      toast.error(`동기화 실패: ${e.message}`);
    } finally {
      setKisSyncing(false);
    }
  };

  useEffect(() => { load(); syncKisBalance(); }, []);

  const latest = snapshots[0];
  const prevMonth = useMemo(() => {
    if (!latest) return null;
    const d = new Date(latest.snapshot_date);
    d.setMonth(d.getMonth() - 1);
    const target = d.getTime();
    let best: Snapshot | null = null;
    let bestDiff = Infinity;
    for (const s of snapshots) {
      const diff = Math.abs(new Date(s.snapshot_date).getTime() - target);
      if (diff < bestDiff && s.id !== latest.id) { best = s; bestDiff = diff; }
    }
    return best;
  }, [snapshots, latest]);

  const totalDelta = latest && prevMonth ? latest.total_balance - prevMonth.total_balance : null;
  const totalDeltaPct = latest && prevMonth && prevMonth.total_balance > 0
    ? ((latest.total_balance - prevMonth.total_balance) / prevMonth.total_balance) * 100 : null;

  const openCount = trades.filter(t => t.status === "OPEN" || t.status === "PARTIAL").length;

  const tradeMarketMap = useMemo(() => {
    const m = new Map<string, string>();
    trades.forEach(t => m.set(t.id, t.market));
    return m;
  }, [trades]);

  // Donut data
  const donutData = latest ? [
    { name: "트레이딩", value: latest.trading_balance, color: ASSET_COLORS.trading },
    { name: "장기투자", value: latest.longterm_balance, color: ASSET_COLORS.longterm },
    { name: "현금", value: latest.cash_balance, color: ASSET_COLORS.cash },
  ].filter(d => d.value > 0) : [];

  // Line chart data filtered by period
  const lineData = useMemo(() => {
    const sorted = [...snapshots].sort((a, b) => a.snapshot_date.localeCompare(b.snapshot_date));
    const cutoff = PERIODS.find(p => p.k === period)!.days;
    if (!Number.isFinite(cutoff)) return sorted;
    const cutDate = new Date();
    cutDate.setDate(cutDate.getDate() - cutoff);
    return sorted.filter(s => new Date(s.snapshot_date) >= cutDate);
  }, [snapshots, period]);

  // Realized PnL aggregated
  const pnlChartData = useMemo(() => {
    const filtered = pnlMarket === "전체"
      ? closes
      : closes.filter(c => tradeMarketMap.get(c.trade_id) === pnlMarket);

    const buckets = new Map<string, { pnl: number; count: number; wins: number }>();

    const keyFn = (date: string) => {
      const d = new Date(date);
      if (pnlGran === "month") return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (pnlGran === "quarter") return `${d.getFullYear()} Q${Math.floor(d.getMonth() / 3) + 1}`;
      if (pnlGran === "year") return `${d.getFullYear()}`;
      return "전체";
    };

    for (const c of filtered) {
      const k = keyFn(c.close_date);
      const b = buckets.get(k) || { pnl: 0, count: 0, wins: 0 };
      b.pnl += Number(c.realized_pnl);
      b.count += 1;
      if (Number(c.realized_pnl) > 0) b.wins += 1;
      buckets.set(k, b);
    }

    let arr = Array.from(buckets.entries()).map(([key, v]) => ({
      key,
      pnl: v.pnl,
      count: v.count,
      winRate: v.count ? (v.wins / v.count) * 100 : 0,
    })).sort((a, b) => a.key.localeCompare(b.key));

    if (pnlGran === "month") arr = arr.slice(-12);
    return arr;
  }, [closes, pnlGran, pnlMarket, tradeMarketMap]);

  const avgPnl = pnlChartData.length ? pnlChartData.reduce((s, x) => s + x.pnl, 0) / pnlChartData.length : 0;

  // Market breakdown
  const marketStats = useMemo(() => {
    return MARKETS.map(m => {
      const list = closes.filter(c => tradeMarketMap.get(c.trade_id) === m);
      const pnl = list.reduce((s, c) => s + Number(c.realized_pnl), 0);
      const count = list.length;
      const avgRate = count ? list.reduce((s, c) => s + (Number((c as any).pnl_rate) || 0), 0) / count : 0;
      return { market: m, pnl, count, avgRate, abs: Math.abs(pnl) };
    });
  }, [closes, tradeMarketMap]);
  const totalAbs = marketStats.reduce((s, x) => s + x.abs, 0) || 1;

  // Pagination
  const pageSize = 10;
  const pageCount = Math.max(1, Math.ceil(snapshots.length / pageSize));
  const pageData = snapshots.slice((page - 1) * pageSize, page * pageSize);

  const remove = async (id: string) => {
    if (!confirm("삭제하시겠습니까?")) return;
    const { error } = await supabase.from("asset_snapshots").delete().eq("id", id);
    if (error) toast.error(error.message); else { toast.success("삭제됨"); load(); }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">자산관리</h1>
          <p className="text-sm text-muted-foreground mt-1">계좌별 자산 배분과 잔고 추이를 관리하세요</p>
        </div>
        <Button onClick={() => { setEditing(undefined); setDlgOpen(true); }}>
          <Plus className="h-4 w-4 mr-1" /> 오늘 자산 기록
        </Button>
      </div>

      {/* Total summary */}
      <Card className="glass-card p-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <div className="text-sm text-muted-foreground">총 금융자산</div>
            <div className="text-4xl font-bold num mt-1">{latest ? fmtKRW(latest.total_balance) : "—"}</div>
          </div>
          {totalDelta !== null && (
            <div className="text-right">
              <div className="text-xs text-muted-foreground">전월 대비</div>
              <div
                className="text-lg font-semibold num flex items-center gap-1 justify-end"
                style={{ color: totalDelta >= 0 ? POS : NEG }}
              >
                {totalDelta >= 0 ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
                {fmtSignedKRW(totalDelta)} ({fmtPct(totalDeltaPct)})
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Sub cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <SubBalanceCard
          title="트레이딩 자산"
          icon={<TrendingUp className="h-4 w-4" style={{ color: ASSET_COLORS.trading }} />}
          value={latest?.trading_balance ?? null}
          subtitle={`오픈 포지션 ${openCount}건`}
          onUpdate={() => { setEditing(latest); setDlgOpen(true); }}
        />
        <SubBalanceCard
          title="장기적립식 투자"
          icon={<PiggyBank className="h-4 w-4" style={{ color: ASSET_COLORS.longterm }} />}
          value={latest?.longterm_balance ?? null}
          onUpdate={() => { setEditing(latest); setDlgOpen(true); }}
        />
        <SubBalanceCard
          title="현금 자산"
          icon={<Banknote className="h-4 w-4" style={{ color: ASSET_COLORS.cash }} />}
          value={latest?.cash_balance ?? null}
          onUpdate={() => { setEditing(latest); setDlgOpen(true); }}
        />
      </div>

      {/* Donut */}
      <Card className="glass-card p-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2"><Wallet className="h-5 w-5 text-primary" />자산 비중</h2>
        {!latest ? (
          <EmptyState message="첫 자산 스냅샷을 기록해주세요" cta={() => { setEditing(undefined); setDlgOpen(true); }} />
        ) : (
          <div className="grid md:grid-cols-2 gap-6 items-center">
            <div className="relative h-64">
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={donutData} dataKey="value" cx="50%" cy="50%" innerRadius={70} outerRadius={100} paddingAngle={2}>
                    {donutData.map((d, i) => <Cell key={i} fill={d.color} stroke="none" />)}
                  </Pie>
                  <RTooltip
                    contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }}
                    formatter={(v: number, n) => {
                      const pct = (v / latest.total_balance) * 100;
                      return [`${fmtKRW(v)} (${pct.toFixed(1)}%)`, n];
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <div className="text-xs text-muted-foreground">총 자산</div>
                <div className="text-xl font-bold num">{fmtKRW(latest.total_balance)}</div>
              </div>
            </div>
            <div className="space-y-3">
              {donutData.map((d) => {
                const pct = (d.value / latest.total_balance) * 100;
                return (
                  <div key={d.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="h-3 w-3 rounded-sm" style={{ background: d.color }} />
                      <span className="text-sm">{d.name}</span>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold num">{fmtKRW(d.value)}</div>
                      <div className="text-xs text-muted-foreground">{pct.toFixed(1)}%</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </Card>

      {/* Line chart */}
      <Card className="glass-card p-6">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <h2 className="text-lg font-semibold">자산 변화</h2>
          <div className="flex items-center gap-1 flex-wrap">
            {PERIODS.map(p => (
              <Button key={p.k} size="sm" variant={period === p.k ? "default" : "ghost"} onClick={() => setPeriod(p.k)}>
                {p.label}
              </Button>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap gap-4 mb-4 text-sm">
          {[
            { k: "total", label: "총자산", color: ASSET_COLORS.total },
            { k: "trading", label: "트레이딩", color: ASSET_COLORS.trading },
            { k: "longterm", label: "장기투자", color: ASSET_COLORS.longterm },
            { k: "cash", label: "현금", color: ASSET_COLORS.cash },
          ].map(o => (
            <label key={o.k} className="flex items-center gap-2 cursor-pointer">
              <Checkbox
                checked={(lines as any)[o.k]}
                onCheckedChange={(v) => setLines(s => ({ ...s, [o.k]: !!v }))}
              />
              <span className="h-2 w-3 rounded-sm" style={{ background: o.color }} />
              {o.label}
            </label>
          ))}
        </div>
        {snapshots.length < 2 ? (
          <div className="py-12 text-center text-sm text-muted-foreground">
            자산 스냅샷을 2건 이상 기록하면 변화 추이를 확인할 수 있습니다
          </div>
        ) : (
          <div className="h-72">
            <ResponsiveContainer>
              <LineChart data={lineData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="snapshot_date" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickFormatter={fmtCompactKRW} />
                <RTooltip
                  contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }}
                  formatter={(v: number) => fmtKRW(v)}
                />
                <Legend />
                {lines.total && <Line type="monotone" dataKey="total_balance" name="총자산" stroke={ASSET_COLORS.total} strokeWidth={3} dot={false} />}
                {lines.trading && <Line type="monotone" dataKey="trading_balance" name="트레이딩" stroke={ASSET_COLORS.trading} strokeWidth={1.5} dot={false} />}
                {lines.longterm && <Line type="monotone" dataKey="longterm_balance" name="장기투자" stroke={ASSET_COLORS.longterm} strokeWidth={1.5} dot={false} />}
                {lines.cash && <Line type="monotone" dataKey="cash_balance" name="현금" stroke={ASSET_COLORS.cash} strokeWidth={1.5} dot={false} />}
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>

      {/* Realized PnL */}
      <Card className="glass-card p-6">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <h2 className="text-lg font-semibold">실현손익 추이</h2>
          <div className="flex items-center gap-2 flex-wrap">
            <Tabs value={pnlGran} onValueChange={(v) => setPnlGran(v as any)}>
              <TabsList>
                <TabsTrigger value="month">월별</TabsTrigger>
                <TabsTrigger value="quarter">분기별</TabsTrigger>
                <TabsTrigger value="year">연도별</TabsTrigger>
                <TabsTrigger value="all">누적</TabsTrigger>
              </TabsList>
            </Tabs>
            <Tabs value={pnlMarket} onValueChange={setPnlMarket}>
              <TabsList>
                <TabsTrigger value="전체">전체</TabsTrigger>
                {MARKETS.map(m => <TabsTrigger key={m} value={m}>{m}</TabsTrigger>)}
              </TabsList>
            </Tabs>
          </div>
        </div>
        {closes.length === 0 ? (
          <div className="py-12 text-center text-sm text-muted-foreground">아직 청산된 매매가 없습니다</div>
        ) : (
          <div className="h-72">
            <ResponsiveContainer>
              <BarChart data={pnlChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="key" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickFormatter={fmtCompactKRW} />
                <RTooltip
                  contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }}
                  formatter={(v: number, _n, p: any) => [
                    `${fmtSignedKRW(v)} · ${p.payload.count}회 · 승률 ${p.payload.winRate.toFixed(0)}%`,
                    "손익",
                  ]}
                />
                <ReferenceLine y={avgPnl} stroke="hsl(var(--muted-foreground))" strokeDasharray="4 4" label={{ value: "평균", fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                <Bar dataKey="pnl">
                  {pnlChartData.map((d, i) => <Cell key={i} fill={d.pnl >= 0 ? POS : NEG} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>

      {/* Market breakdown */}
      <Card className="glass-card p-6">
        <h2 className="text-lg font-semibold mb-4">시장별 손익 분석</h2>
        {closes.length === 0 ? (
          <div className="py-6 text-center text-sm text-muted-foreground">데이터 없음</div>
        ) : (
          <>
            <div className="flex h-3 w-full rounded-full overflow-hidden mb-4">
              {marketStats.filter(s => s.abs > 0).map(s => (
                <div
                  key={s.market}
                  title={`${s.market}: ${fmtSignedKRW(s.pnl)}`}
                  style={{
                    width: `${(s.abs / totalAbs) * 100}%`,
                    backgroundColor: `hsl(${marketColorVar(s.market)})`,
                  }}
                />
              ))}
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              {marketStats.map(s => (
                <div key={s.market} className="rounded-md border border-border bg-muted/10 p-3">
                  <MarketBadge market={s.market} />
                  <div className="mt-2 text-lg font-semibold num" style={{ color: s.pnl >= 0 ? POS : NEG }}>
                    {fmtSignedKRW(s.pnl)}
                  </div>
                  <div className="text-xs text-muted-foreground">매매 {s.count}회 · 평균 {s.avgRate.toFixed(2)}%</div>
                </div>
              ))}
            </div>
          </>
        )}
      </Card>

      {/* Snapshot table */}
      <Card className="glass-card p-6">
        <h2 className="text-lg font-semibold mb-4">자산 스냅샷 기록</h2>
        {snapshots.length === 0 ? (
          <div className="py-12 text-center text-sm text-muted-foreground">기록된 스냅샷이 없습니다</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-xs text-muted-foreground border-b border-border">
                  <tr>
                    <th className="text-left py-2 px-2">날짜</th>
                    <th className="text-right px-2">트레이딩</th>
                    <th className="text-right px-2">장기투자</th>
                    <th className="text-right px-2">현금</th>
                    <th className="text-right px-2">총자산</th>
                    <th className="text-right px-2">전회 대비</th>
                    <th className="text-left px-2">메모</th>
                    <th className="px-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {pageData.map((s, i) => {
                    const globalIdx = (page - 1) * pageSize + i;
                    const prev = snapshots[globalIdx + 1];
                    const delta = prev ? s.total_balance - prev.total_balance : null;
                    return (
                      <tr key={s.id} className="border-b border-border/50 hover:bg-muted/10">
                        <td className="py-2 px-2">{s.snapshot_date}</td>
                        <td className="text-right px-2 num">{fmtKRW(s.trading_balance)}</td>
                        <td className="text-right px-2 num">{fmtKRW(s.longterm_balance)}</td>
                        <td className="text-right px-2 num">{fmtKRW(s.cash_balance)}</td>
                        <td className="text-right px-2 num font-semibold">{fmtKRW(s.total_balance)}</td>
                        <td className="text-right px-2 num" style={{ color: delta == null ? undefined : delta >= 0 ? POS : NEG }}>
                          {delta == null ? "—" : fmtSignedKRW(delta)}
                        </td>
                        <td className="px-2 text-muted-foreground truncate max-w-[160px]">{s.memo || "—"}</td>
                        <td className="px-2 whitespace-nowrap">
                          <Button size="icon" variant="ghost" onClick={() => { setEditing(s); setDlgOpen(true); }}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => remove(s.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {pageCount > 1 && (
              <div className="flex justify-center items-center gap-2 mt-4">
                <Button size="sm" variant="ghost" disabled={page === 1} onClick={() => setPage(p => p - 1)}>이전</Button>
                <span className="text-xs text-muted-foreground">{page} / {pageCount}</span>
                <Button size="sm" variant="ghost" disabled={page === pageCount} onClick={() => setPage(p => p + 1)}>다음</Button>
              </div>
            )}
          </>
        )}
      </Card>

      <SnapshotDialog open={dlgOpen} onOpenChange={setDlgOpen} onSaved={load} initial={editing} />
    </div>
  );
}

function SubBalanceCard({
  title, icon, value, subtitle, onUpdate,
}: {
  title: string;
  icon: React.ReactNode;
  value: number | null;
  subtitle?: string;
  onUpdate: () => void;
}) {
  return (
    <Card className="glass-card p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          {icon}
          {title}
        </div>
        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={onUpdate}>
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>
      <div className="text-2xl font-bold num">{value !== null ? fmtKRW(value) : "—"}</div>
      {subtitle && <div className="text-xs text-muted-foreground mt-1">{subtitle}</div>}
    </Card>
  );
}

function EmptyState({ message, cta }: { message: string; cta: () => void }) {
  return (
    <div className="py-12 text-center">
      <p className="text-sm text-muted-foreground mb-3">{message}</p>
      <Button onClick={cta}><Plus className="h-4 w-4 mr-1" />기록하기</Button>
    </div>
  );
}
