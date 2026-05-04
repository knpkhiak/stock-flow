import { Fragment, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Plus, ChevronDown, ChevronRight, RefreshCw, ArrowUpRight, ArrowDownRight, BarChart3 } from "lucide-react";
import { toast } from "sonner";
import NewTradeDialog from "@/components/trades/NewTradeDialog";
import CloseTradeDialog from "@/components/trades/CloseTradeDialog";
import MarketBadge from "@/components/trades/MarketBadge";
import { marketColorVar } from "@/components/trades/marketStyle";
import { NewHoldingDialog, AddBuyDialog, SellHoldingDialog } from "@/components/longterm/LongtermDialogs";
import type { LongtermHolding, LongtermBuy, LongtermSell } from "@/types/longterm";

export interface Trade {
  id: string;
  ticker: string;
  name: string;
  market: string;
  status: string; // OPEN | PARTIAL | CLOSED
  entry_date: string;
  entry_price: number;
  total_quantity: number;
  remaining_quantity: number;
  avg_close_price: number | null;
  total_realized_pnl: number | null;
  memo: string | null;
  idea_id: string | null;
  created_at: string;
}

export interface TradeClose {
  id: string;
  trade_id: string;
  close_date: string;
  close_price: number;
  close_quantity: number;
  realized_pnl: number;
  pnl_rate: number;
  holding_days: number;
  memo: string | null;
  created_at: string;
}

const fmtNum = (n: number) => new Intl.NumberFormat("ko-KR").format(n);
const TARGET_DAYS = 21;

const daysSince = (from: string) => {
  const a = new Date(from).getTime();
  const b = Date.now();
  return Math.max(0, Math.round((b - a) / 86400000));
};

const holdingClass = (d: number) => {
  if (d <= 20) return "text-primary";
  if (d <= 30) return "text-yellow-400";
  return "text-destructive";
};

function StatusBadge({ status }: { status: string }) {
  if (status === "PARTIAL") {
    return (
      <span className="inline-flex items-center rounded-md border border-yellow-500/30 bg-yellow-500/15 px-2 py-0.5 text-xs font-medium text-yellow-400">
        부분청산
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-md border border-secondary/30 bg-secondary/15 px-2 py-0.5 text-xs font-medium text-secondary">
      OPEN
    </span>
  );
}

type Granularity = "month" | "quarter" | "year" | "all";

export default function Trades() {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [closes, setCloses] = useState<TradeClose[]>([]);
  const [holdings, setHoldings] = useState<LongtermHolding[]>([]);
  const [ltBuys, setLtBuys] = useState<LongtermBuy[]>([]);
  const [ltSells, setLtSells] = useState<LongtermSell[]>([]);
  const [loading, setLoading] = useState(true);
  const [openNew, setOpenNew] = useState(false);
  const [closeTarget, setCloseTarget] = useState<Trade | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [newHoldingOpen, setNewHoldingOpen] = useState(false);
  const [buyTarget, setBuyTarget] = useState<LongtermHolding | null>(null);
  const [sellTarget, setSellTarget] = useState<LongtermHolding | null>(null);

  // history filter
  const now = new Date();
  const [granularity, setGranularity] = useState<Granularity>("month");
  const [year, setYear] = useState<number>(now.getFullYear());
  const [month, setMonth] = useState<number>(now.getMonth() + 1);
  const [quarter, setQuarter] = useState<number>(Math.floor(now.getMonth() / 3) + 1);

  const load = async () => {
    setLoading(true);
    const [{ data: t, error: e1 }, { data: c, error: e2 }, { data: h }, { data: lb }, { data: ls }] = await Promise.all([
      supabase.from("trades").select("*").order("created_at", { ascending: false }),
      supabase.from("trade_closes").select("*").order("close_date", { ascending: true }),
      supabase.from("longterm_holdings").select("*").order("created_at", { ascending: false }),
      supabase.from("longterm_buys").select("*").order("buy_date", { ascending: true }),
      supabase.from("longterm_sells").select("*").order("sell_date", { ascending: true }),
    ]);
    if (e1) toast.error(e1.message);
    if (e2) toast.error(e2.message);
    setTrades((t || []) as unknown as Trade[]);
    setCloses((c || []) as unknown as TradeClose[]);
    setHoldings((h || []) as unknown as LongtermHolding[]);
    setLtBuys((lb || []) as unknown as LongtermBuy[]);
    setLtSells((ls || []) as unknown as LongtermSell[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const closesByTrade = useMemo(() => {
    const m: Record<string, TradeClose[]> = {};
    for (const c of closes) (m[c.trade_id] ||= []).push(c);
    return m;
  }, [closes]);

  const open = trades.filter((t) => t.status === "OPEN" || t.status === "PARTIAL");
  const closedTrades = trades.filter((t) => t.status === "CLOSED" || (closesByTrade[t.id]?.length ?? 0) > 0);

  // Available year options (from oldest close_date)
  const availableYears = useMemo(() => {
    if (closes.length === 0) return [now.getFullYear()];
    const years = new Set<number>();
    closes.forEach((c) => years.add(new Date(c.close_date).getFullYear()));
    years.add(now.getFullYear());
    return [...years].sort((a, b) => b - a);
  }, [closes, now]);

  // Filter closes for the selected period
  const filteredCloses = useMemo(() => {
    return closes.filter((c) => {
      const d = new Date(c.close_date);
      if (granularity === "all") return true;
      if (d.getFullYear() !== year) return false;
      if (granularity === "year") return true;
      if (granularity === "month") return d.getMonth() + 1 === month;
      if (granularity === "quarter") return Math.floor(d.getMonth() / 3) + 1 === quarter;
      return true;
    });
  }, [closes, granularity, year, month, quarter]);

  const periodLabel = useMemo(() => {
    if (granularity === "all") return "전체 기간";
    if (granularity === "year") return `${year}년 기준`;
    if (granularity === "quarter") return `${year}년 Q${quarter} 기준`;
    return `${year}년 ${month}월 기준`;
  }, [granularity, year, month, quarter]);

  // Summary across filtered closes
  const tradeCount = filteredCloses.length;
  const winCount = filteredCloses.filter((c) => Number(c.realized_pnl) > 0).length;
  const winRate = tradeCount > 0 ? (winCount / tradeCount) * 100 : 0;
  const cumPnl = filteredCloses.reduce((s, c) => s + Number(c.realized_pnl), 0);
  const avgHold = tradeCount > 0
    ? Math.round(filteredCloses.reduce((s, c) => s + Number(c.holding_days), 0) / tradeCount)
    : 0;

  // Market distribution (absolute pnl share)
  const marketPnl = useMemo(() => {
    const tradeMarket: Record<string, string> = {};
    trades.forEach((t) => { tradeMarket[t.id] = t.market; });
    const m: Record<string, number> = { 국내: 0, 해외: 0, 암호화폐: 0 };
    filteredCloses.forEach((c) => {
      const mk = tradeMarket[c.trade_id] || "국내";
      m[mk] = (m[mk] || 0) + Number(c.realized_pnl);
    });
    const totalAbs = Object.values(m).reduce((s, v) => s + Math.abs(v), 0);
    return { perMarket: m, totalAbs };
  }, [filteredCloses, trades]);

  // Group filtered closes by trade for history rows
  const filteredByTrade = useMemo(() => {
    const m: Record<string, TradeClose[]> = {};
    filteredCloses.forEach((c) => (m[c.trade_id] ||= []).push(c));
    return m;
  }, [filteredCloses]);

  const historyRows = useMemo(() => {
    return Object.entries(filteredByTrade).map(([tradeId, cs]) => {
      const t = trades.find((x) => x.id === tradeId);
      if (!t) return null;
      const totalQty = cs.reduce((s, c) => s + Number(c.close_quantity), 0);
      const totalPnl = cs.reduce((s, c) => s + Number(c.realized_pnl), 0);
      const avgRate = cs.reduce((s, c) => s + Number(c.pnl_rate) * Number(c.close_quantity), 0) / (totalQty || 1);
      const totalHold = cs.reduce((s, c) => s + Number(c.holding_days), 0);
      const dates = cs.map((c) => c.close_date).sort();
      return {
        trade: t,
        closes: cs.sort((a, b) => a.close_date.localeCompare(b.close_date)),
        totalQty, totalPnl, avgRate, totalHold,
        firstClose: dates[0],
        lastClose: dates[dates.length - 1],
      };
    }).filter(Boolean) as Array<{
      trade: Trade; closes: TradeClose[]; totalQty: number; totalPnl: number;
      avgRate: number; totalHold: number; firstClose: string; lastClose: string;
    }>;
  }, [filteredByTrade, trades]);

  const toggle = (id: string) => setExpanded((p) => ({ ...p, [id]: !p[id] }));

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-semibold">매매기록</h1>
        <p className="text-sm text-muted-foreground mt-1">오픈 포지션, 분할 청산, 매매 히스토리를 관리하세요</p>
      </div>

      <Tabs defaultValue="open">
        <TabsList>
          <TabsTrigger value="open">오픈 포지션 ({open.length})</TabsTrigger>
          <TabsTrigger value="history">매매 히스토리 ({closedTrades.length})</TabsTrigger>
          <TabsTrigger value="longterm">장기투자 종목 ({holdings.length})</TabsTrigger>
        </TabsList>

        {/* OPEN POSITIONS */}
        <TabsContent value="open" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => setOpenNew(true)}>
              <Plus className="h-4 w-4 mr-1" /> 새 포지션 열기
            </Button>
          </div>
          <Card className="glass-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8" />
                  <TableHead>종목</TableHead>
                  <TableHead>시장</TableHead>
                  <TableHead>진입일</TableHead>
                  <TableHead className="text-right">진입가</TableHead>
                  <TableHead className="text-right">총수량</TableHead>
                  <TableHead className="text-right">남은수량</TableHead>
                  <TableHead className="text-right">보유일</TableHead>
                  <TableHead>상태</TableHead>
                  <TableHead className="text-right">액션</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={10} className="text-center text-muted-foreground py-8">불러오는 중...</TableCell></TableRow>
                ) : open.length === 0 ? (
                  <TableRow><TableCell colSpan={10} className="text-center text-muted-foreground py-8">오픈 포지션이 없습니다</TableCell></TableRow>
                ) : open.map((t) => {
                  const tc = closesByTrade[t.id] || [];
                  const days = daysSince(t.entry_date);
                  const isOpen = expanded[t.id];
                  return (
                    <Fragment key={t.id}>
                      <TableRow>
                        <TableCell>
                          {tc.length > 0 ? (
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => toggle(t.id)}>
                              {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                            </Button>
                          ) : null}
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{t.name}</div>
                          <div className="text-xs text-muted-foreground">{t.ticker}</div>
                        </TableCell>
                        <TableCell><MarketBadge market={t.market} /></TableCell>
                        <TableCell className="text-sm">{t.entry_date}</TableCell>
                        <TableCell className="text-right tabular-nums">{fmtNum(Number(t.entry_price))}</TableCell>
                        <TableCell className="text-right tabular-nums">{fmtNum(Number(t.total_quantity))}</TableCell>
                        <TableCell className="text-right tabular-nums font-medium text-primary">
                          {fmtNum(Number(t.remaining_quantity))}
                        </TableCell>
                        <TableCell className={`text-right tabular-nums font-medium ${holdingClass(days)}`}>
                          D+{days}
                        </TableCell>
                        <TableCell><StatusBadge status={t.status} /></TableCell>
                        <TableCell className="text-right">
                          <Button size="sm" variant="outline" onClick={() => setCloseTarget(t)}>부분 청산</Button>
                        </TableCell>
                      </TableRow>
                      {isOpen && tc.length > 0 && (
                        <TableRow className="bg-muted/10">
                          <TableCell />
                          <TableCell colSpan={9}>
                            <div className="text-xs text-muted-foreground mb-2">분할 청산 내역</div>
                            <div className="space-y-1">
                              {tc.map((c, i) => {
                                const cls = c.realized_pnl > 0 ? "text-primary" : c.realized_pnl < 0 ? "text-destructive" : "";
                                return (
                                  <div key={c.id} className="grid grid-cols-7 gap-2 text-sm tabular-nums">
                                    <div className="text-muted-foreground">{i + 1}회</div>
                                    <div>{c.close_date}</div>
                                    <div className={holdingClass(c.holding_days)}>D+{c.holding_days}</div>
                                    <div>가격 {fmtNum(Number(c.close_price))}</div>
                                    <div>수량 {fmtNum(Number(c.close_quantity))}</div>
                                    <div className={cls}>{c.realized_pnl >= 0 ? "+" : ""}{fmtNum(Math.round(Number(c.realized_pnl)))}</div>
                                    <div className={cls}>{c.pnl_rate >= 0 ? "+" : ""}{Number(c.pnl_rate).toFixed(2)}%</div>
                                  </div>
                                );
                              })}
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </Fragment>
                  );
                })}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* HISTORY */}
        <TabsContent value="history" className="space-y-4">
          {/* Period filter */}
          <Card className="glass-card p-4 space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <ToggleGroup type="single" value={granularity} onValueChange={(v) => v && setGranularity(v as Granularity)} variant="outline" size="sm">
                <ToggleGroupItem value="month">월별</ToggleGroupItem>
                <ToggleGroupItem value="quarter">분기별</ToggleGroupItem>
                <ToggleGroupItem value="year">연도별</ToggleGroupItem>
                <ToggleGroupItem value="all">전체 누적</ToggleGroupItem>
              </ToggleGroup>

              {granularity !== "all" && (
                <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
                  <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {availableYears.map((y) => <SelectItem key={y} value={String(y)}>{y}년</SelectItem>)}
                  </SelectContent>
                </Select>
              )}

              {granularity === "month" && (
                <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
                  <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                      <SelectItem key={m} value={String(m)}>{m}월</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {granularity === "quarter" && (
                <Select value={String(quarter)} onValueChange={(v) => setQuarter(Number(v))}>
                  <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[1,2,3,4].map((q) => <SelectItem key={q} value={String(q)}>Q{q}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
            </div>
          </Card>

          {/* Summary cards */}
          <div className="grid gap-4 md:grid-cols-4">
            <SummaryCard label="매매 횟수" value={`${tradeCount}`} sub={periodLabel} />
            <SummaryCard label="승률" value={`${winRate.toFixed(1)}%`} sub={periodLabel} />
            <SummaryCard
              label="누적 실현손익"
              value={`${cumPnl >= 0 ? "+" : ""}${fmtNum(Math.round(cumPnl))}`}
              valueClass={cumPnl > 0 ? "text-primary" : cumPnl < 0 ? "text-destructive" : ""}
              sub={periodLabel}
            />
            <SummaryCard
              label="평균 보유일"
              value={`${avgHold}일`}
              valueClass={holdingClass(avgHold)}
              sub={`목표: 3주(21일) · ${periodLabel}`}
            />
          </div>

          {/* Market distribution stack bar */}
          <Card className="glass-card p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs text-muted-foreground">시장별 손익 분포 (절대값 기준)</div>
              <div className="text-xs text-muted-foreground">{periodLabel}</div>
            </div>
            {marketPnl.totalAbs === 0 ? (
              <div className="text-xs text-muted-foreground py-2">데이터가 없습니다</div>
            ) : (
              <TooltipProvider>
                <div className="flex h-3 w-full overflow-hidden rounded-md">
                  {(["국내", "해외", "암호화폐"] as const).map((mk) => {
                    const v = marketPnl.perMarket[mk] || 0;
                    const w = (Math.abs(v) / marketPnl.totalAbs) * 100;
                    if (w === 0) return null;
                    return (
                      <Tooltip key={mk}>
                        <TooltipTrigger asChild>
                          <div
                            style={{ width: `${w}%`, backgroundColor: `hsl(${marketColorVar(mk)})` }}
                            className="h-full"
                          />
                        </TooltipTrigger>
                        <TooltipContent>
                          <div className="text-xs">
                            <div className="font-medium">{mk}</div>
                            <div className={v >= 0 ? "text-primary" : "text-destructive"}>
                              {v >= 0 ? "+" : ""}{fmtNum(Math.round(v))}
                            </div>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    );
                  })}
                </div>
              </TooltipProvider>
            )}
          </Card>

          {/* History table */}
          <Card className="glass-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8" />
                  <TableHead>종목</TableHead>
                  <TableHead>시장</TableHead>
                  <TableHead>기간</TableHead>
                  <TableHead className="text-right">청산수량</TableHead>
                  <TableHead className="text-right">총 보유일</TableHead>
                  <TableHead className="text-right">실현손익</TableHead>
                  <TableHead className="text-right">평균 수익률</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">불러오는 중...</TableCell></TableRow>
                ) : historyRows.length === 0 ? (
                  <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">해당 기간에 매매 기록이 없습니다</TableCell></TableRow>
                ) : historyRows.map(({ trade: t, closes: cs, totalQty, totalPnl, avgRate, totalHold, firstClose, lastClose }) => {
                  const cls = totalPnl > 0 ? "text-primary" : totalPnl < 0 ? "text-destructive" : "";
                  const isOpen = expanded[t.id];
                  return (
                    <Fragment key={t.id}>
                      <TableRow>
                        <TableCell>
                          {cs.length > 1 ? (
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => toggle(t.id)}>
                              {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                            </Button>
                          ) : null}
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{t.name}</div>
                          <div className="text-xs text-muted-foreground">{t.ticker}</div>
                        </TableCell>
                        <TableCell><MarketBadge market={t.market} /></TableCell>
                        <TableCell className="text-sm">
                          <div>{t.entry_date} ~ {lastClose}</div>
                          {cs.length > 1 && <div className="text-xs text-muted-foreground">분할 {cs.length}회 (첫 청산 {firstClose})</div>}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{fmtNum(totalQty)}</TableCell>
                        <TableCell className={`text-right tabular-nums font-medium ${holdingClass(Math.round(totalHold / cs.length))}`}>
                          {totalHold}일
                        </TableCell>
                        <TableCell className={`text-right tabular-nums ${cls}`}>{totalPnl >= 0 ? "+" : ""}{fmtNum(Math.round(totalPnl))}</TableCell>
                        <TableCell className={`text-right tabular-nums ${cls}`}>{avgRate >= 0 ? "+" : ""}{avgRate.toFixed(2)}%</TableCell>
                      </TableRow>
                      {isOpen && cs.length > 1 && (
                        <TableRow className="bg-muted/10">
                          <TableCell />
                          <TableCell colSpan={7}>
                            <div className="text-xs text-muted-foreground mb-2">분할 청산 내역</div>
                            <div className="space-y-1">
                              {cs.map((c, i) => {
                                const ccls = c.realized_pnl > 0 ? "text-primary" : c.realized_pnl < 0 ? "text-destructive" : "";
                                return (
                                  <div key={c.id} className="grid grid-cols-7 gap-2 text-sm tabular-nums">
                                    <div className="text-muted-foreground">{i + 1}회</div>
                                    <div>{c.close_date}</div>
                                    <div className={holdingClass(c.holding_days)}>D+{c.holding_days}</div>
                                    <div>가격 {fmtNum(Number(c.close_price))}</div>
                                    <div>수량 {fmtNum(Number(c.close_quantity))}</div>
                                    <div className={ccls}>{c.realized_pnl >= 0 ? "+" : ""}{fmtNum(Math.round(Number(c.realized_pnl)))}</div>
                                    <div className={ccls}>{c.pnl_rate >= 0 ? "+" : ""}{Number(c.pnl_rate).toFixed(2)}%</div>
                                  </div>
                                );
                              })}
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </Fragment>
                  );
                })}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>

      <NewTradeDialog open={openNew} onOpenChange={setOpenNew} onSaved={load} />
      <CloseTradeDialog
        trade={closeTarget}
        closes={closeTarget ? (closesByTrade[closeTarget.id] || []) : []}
        onOpenChange={(o) => !o && setCloseTarget(null)}
        onSaved={load}
      />
    </div>
  );
}

function SummaryCard({ label, value, valueClass = "", sub }: { label: string; value: string; valueClass?: string; sub?: string }) {
  return (
    <Card className="glass-card p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`text-2xl font-semibold tabular-nums mt-1 ${valueClass}`}>{value}</div>
      {sub && <div className="text-[11px] text-muted-foreground mt-1">{sub}</div>}
    </Card>
  );
}
