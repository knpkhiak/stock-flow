import { Fragment, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Plus, ChevronDown, ChevronRight, RefreshCw, Download, AlertTriangle, Check, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import CloseTradeDialog from "@/components/trades/CloseTradeDialog";
import { NewHoldingDialog, AddBuyDialog, SellHoldingDialog } from "@/components/longterm/LongtermDialogs";
import ImportHoldingsDialog from "@/components/trades/ImportHoldingsDialog";
import MarketIcon from "@/components/MarketIcon";
import MarketSessionBadge from "@/components/MarketSessionBadge";
import type { LongtermHolding, LongtermBuy, LongtermSell } from "@/types/longterm";
import { getInitialSetup, setInitialSetup, type InitialSetupStatus } from "@/lib/initialSetup";
import { getKisEnv } from "@/pages/Settings";
import { fmtNum, fmtSignedNum, holdingClass, pnlClass, pnlSign } from "@/lib/pnl";
import { getMarketSession, priceCaption } from "@/lib/marketSession";
import { useKisPrices } from "@/hooks/useKisPrices";

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
  source?: string;
  stop_loss?: number | null;
}

export interface TradeBuy {
  id: string;
  trade_id: string;
  buy_date: string;
  buy_price: number;
  buy_quantity: number;
  buy_amount: number;
  cumulative_avg_price: number;
  source: string;
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

const daysSince = (from: string) => {
  const a = new Date(from).getTime();
  const b = Date.now();
  return Math.max(0, Math.round((b - a) / 86400000));
};

function StatusBadge({ status }: { status: string }) {
  if (status === "PARTIAL") {
    return (
      <span className="inline-flex items-center rounded-md border border-status-partial/30 bg-status-partial/15 px-2 py-0.5 text-[11px] font-medium text-status-partial">
        PARTIAL CLOSE
      </span>
    );
  }
  if (status === "CLOSED") {
    return (
      <span className="inline-flex items-center rounded-md border border-status-closed/30 bg-status-closed/15 px-2 py-0.5 text-[11px] font-medium text-status-closed">
        CLOSED
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-md border border-status-open/30 bg-status-open/15 px-2 py-0.5 text-[11px] font-medium text-status-open">
      OPEN
    </span>
  );
}

function TickerCell({ name, ticker, market }: { name: string; ticker: string; market: string }) {
  return (
    <div>
      <div className="font-medium flex items-center gap-1.5">
        <MarketIcon market={market} />
        <span>{name}</span>
        <span className="text-xs text-muted-foreground">({ticker})</span>
      </div>
    </div>
  );
}

function PriceCell({ price, session }: { price: number | null; session: ReturnType<typeof getMarketSession> }) {
  if (price === null) return <span className="text-muted-foreground text-xs">-</span>;
  return (
    <span>
      <span className="tabular-nums">{fmtNum(price)}</span>
      <span className="text-[10px] text-muted-foreground ml-1">{priceCaption(session)}</span>
    </span>
  );
}

function StopLossCell({
  tradeId,
  value,
  currentPrice,
  onSaved,
}: {
  tradeId: string;
  value: number | null;
  currentPrice: number | null;
  onSaved: () => void;
}) {
  const [editing, setEditing] = useState(value == null);
  const [draft, setDraft] = useState<string>(value != null ? String(value) : "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!editing) setDraft(value != null ? String(value) : "");
  }, [value, editing]);

  const triggered = value != null && currentPrice != null && currentPrice <= value;

  const save = async () => {
    const num = Number(draft);
    if (!draft || !Number.isFinite(num) || num <= 0) {
      toast.error("스탑로스는 0보다 큰 숫자로 입력하세요");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("trades").update({ stop_loss: num }).eq("id", tradeId);
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setEditing(false);
    onSaved();
  };

  if (editing) {
    return (
      <div className="flex items-center gap-1 justify-end" onClick={(e) => e.stopPropagation()}>
        <Input
          type="number"
          inputMode="decimal"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") save();
            if (e.key === "Escape" && value != null) setEditing(false);
          }}
          autoFocus
          disabled={saving}
          className="h-7 w-24 text-right tabular-nums"
          placeholder="필수"
        />
        <Button size="icon" variant="ghost" className="h-6 w-6" onClick={save} disabled={saving}>
          <Check className="h-3.5 w-3.5" />
        </Button>
        {value != null && (
          <Button
            size="icon"
            variant="ghost"
            className="h-6 w-6"
            onClick={() => setEditing(false)}
            disabled={saving}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    );
  }

  return (
    <div
      className="flex items-center justify-end gap-1 cursor-pointer group"
      onClick={(e) => {
        e.stopPropagation();
        setEditing(true);
      }}
      title="클릭하여 수정"
    >
      {triggered && <AlertTriangle className="h-3.5 w-3.5 text-profit animate-pulse" />}
      <span
        className={`tabular-nums text-sm group-hover:underline ${
          triggered ? "text-profit font-semibold" : ""
        }`}
      >
        {fmtNum(Number(value))}
      </span>
    </div>
  );
}


type Granularity = "month" | "quarter" | "year" | "all";
type MarketFilter = "all" | "국내" | "해외" | "암호화폐";

export default function Trades() {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [buys, setBuys] = useState<TradeBuy[]>([]);
  const [closes, setCloses] = useState<TradeClose[]>([]);
  const [holdings, setHoldings] = useState<LongtermHolding[]>([]);
  const [ltBuys, setLtBuys] = useState<LongtermBuy[]>([]);
  const [ltSells, setLtSells] = useState<LongtermSell[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [closeTarget, setCloseTarget] = useState<Trade | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [newHoldingOpen, setNewHoldingOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [buyTarget, setBuyTarget] = useState<LongtermHolding | null>(null);
  const [sellTarget, setSellTarget] = useState<LongtermHolding | null>(null);
  const [setupStatus, setSetupStatus] = useState<InitialSetupStatus>(getInitialSetup());
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(localStorage.getItem("stock-flow-last-sync"));

  // history filter
  const now = new Date();
  const [granularity, setGranularity] = useState<Granularity>("month");
  const [year, setYear] = useState<number>(now.getFullYear());
  const [month, setMonth] = useState<number>(now.getMonth() + 1);
  const [quarter, setQuarter] = useState<number>(Math.floor(now.getMonth() / 3) + 1);
  const [marketFilter, setMarketFilter] = useState<MarketFilter>("all");

  useEffect(() => {
    const sync = () => setSetupStatus(getInitialSetup());
    window.addEventListener("stock-flow-initial-setup-changed", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("stock-flow-initial-setup-changed", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const load = async () => {
    setLoading(true);
    const [
      { data: t, error: e1 },
      { data: b },
      { data: c, error: e2 },
      { data: h },
      { data: lb },
      { data: ls },
    ] = await Promise.all([
      supabase.from("trades").select("*").order("created_at", { ascending: false }),
      supabase.from("trade_buys").select("*").order("buy_date", { ascending: true }),
      supabase.from("trade_closes").select("*").order("close_date", { ascending: true }),
      supabase.from("longterm_holdings").select("*").order("created_at", { ascending: false }),
      supabase.from("longterm_buys").select("*").order("buy_date", { ascending: true }),
      supabase.from("longterm_sells").select("*").order("sell_date", { ascending: true }),
    ]);
    if (e1) toast.error(e1.message);
    if (e2) toast.error(e2.message);
    setTrades((t || []) as unknown as Trade[]);
    setBuys((b || []) as unknown as TradeBuy[]);
    setCloses((c || []) as unknown as TradeClose[]);
    setHoldings((h || []) as unknown as LongtermHolding[]);
    setLtBuys((lb || []) as unknown as LongtermBuy[]);
    setLtSells((ls || []) as unknown as LongtermSell[]);
    setLoading(false);
  };

  const syncExecutions = async () => {
    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke("kis-proxy", {
        body: { action: "sync", env: getKisEnv(), lookback_days: 30 },
      });
      if (error) throw new Error(error.message);
      if ((data as any)?.error) throw new Error((data as any).error);
      const r = data as {
        inserted_buys: number; inserted_closes: number; new_trades: number;
        closed_trades: number; duplicates: number; errors: string[];
      };
      const summary = `매수 +${r.inserted_buys} / 청산 +${r.inserted_closes} / 신규 ${r.new_trades} / 전량청산 ${r.closed_trades} (중복 ${r.duplicates})`;
      if (r.errors?.length) {
        toast.warning(`동기화 완료 (오류 ${r.errors.length}건): ${summary}`);
        console.warn("sync errors", r.errors);
      } else {
        toast.success(`동기화 완료: ${summary}`);
      }
      const stamp = new Date().toISOString();
      localStorage.setItem("stock-flow-last-sync", stamp);
      setLastSync(stamp);
      if (r.inserted_buys > 0 || r.inserted_closes > 0) {
        setInitialSetup("completed");
        setSetupStatus("completed");
      }
      await load();
    } catch (e: any) {
      toast.error(`동기화 실패: ${e.message}`);
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => { load(); }, []);

  const buysByTrade = useMemo(() => {
    const m: Record<string, TradeBuy[]> = {};
    for (const x of buys) (m[x.trade_id] ||= []).push(x);
    return m;
  }, [buys]);

  const closesByTrade = useMemo(() => {
    const m: Record<string, TradeClose[]> = {};
    for (const c of closes) (m[c.trade_id] ||= []).push(c);
    return m;
  }, [closes]);

  const open = trades.filter((t) => t.status === "OPEN" || t.status === "PARTIAL");
  const closedTrades = trades.filter((t) => t.status === "CLOSED");

  // === current price hook ===
  const session = getMarketSession();
  const openTickers = useMemo(() => open.map((t) => t.ticker), [open]);
  const ltTickers = useMemo(() => holdings.map((h) => h.ticker), [holdings]);
  const tradePrices = useKisPrices(openTickers);
  const ltPrices = useKisPrices(ltTickers);

  // history filter — closed trades only
  const availableYears = useMemo(() => {
    if (closes.length === 0) return [now.getFullYear()];
    const ys = new Set<number>();
    closes.forEach((c) => ys.add(new Date(c.close_date).getFullYear()));
    ys.add(now.getFullYear());
    return [...ys].sort((a, b) => b - a);
  }, [closes, now]);

  // For history tab: only consider trades that are CLOSED.
  // Filter by market + by "lastClose date in period".
  const historyRows = useMemo(() => {
    const rows = closedTrades
      .filter((t) => marketFilter === "all" || t.market === marketFilter)
      .map((t) => {
        const tBuys = buysByTrade[t.id] || [];
        const tCloses = (closesByTrade[t.id] || []).slice().sort((a, b) => a.close_date.localeCompare(b.close_date));
        if (tCloses.length === 0) return null;
        const lastClose = tCloses[tCloses.length - 1].close_date;
        const totalRealized = tCloses.reduce((s, c) => s + Number(c.realized_pnl), 0);
        const totalCloseQty = tCloses.reduce((s, c) => s + Number(c.close_quantity), 0);
        const totalBuyAmt = tBuys.reduce((s, b) => s + Number(b.buy_amount), 0);
        const avgRate = totalCloseQty > 0
          ? tCloses.reduce((s, c) => s + Number(c.pnl_rate) * Number(c.close_quantity), 0) / totalCloseQty
          : 0;
        return { trade: t, tBuys, tCloses, lastClose, totalRealized, totalBuyAmt, totalCloseQty, avgRate };
      })
      .filter(Boolean) as Array<{
        trade: Trade; tBuys: TradeBuy[]; tCloses: TradeClose[]; lastClose: string;
        totalRealized: number; totalBuyAmt: number; totalCloseQty: number; avgRate: number;
      }>;

    return rows.filter(({ lastClose }) => {
      const d = new Date(lastClose);
      if (granularity === "all") return true;
      if (d.getFullYear() !== year) return false;
      if (granularity === "year") return true;
      if (granularity === "month") return d.getMonth() + 1 === month;
      if (granularity === "quarter") return Math.floor(d.getMonth() / 3) + 1 === quarter;
      return true;
    });
  }, [closedTrades, buysByTrade, closesByTrade, granularity, year, month, quarter, marketFilter]);

  // Summary across history rows
  const summary = useMemo(() => {
    const allCloseRecords = historyRows.flatMap((r) => r.tCloses);
    const tradeCount = historyRows.length;
    const splitCount = allCloseRecords.length;
    const winCount = allCloseRecords.filter((c) => Number(c.realized_pnl) > 0).length;
    const winRate = splitCount > 0 ? (winCount / splitCount) * 100 : 0;
    const cumPnl = allCloseRecords.reduce((s, c) => s + Number(c.realized_pnl), 0);
    const avgHold = splitCount > 0
      ? Math.round(allCloseRecords.reduce((s, c) => s + Number(c.holding_days), 0) / splitCount)
      : 0;
    return { tradeCount, splitCount, winRate, cumPnl, avgHold };
  }, [historyRows]);

  const periodLabel = useMemo(() => {
    if (granularity === "all") return "전체 기간";
    if (granularity === "year") return `${year}년`;
    if (granularity === "quarter") return `${year}년 Q${quarter}`;
    return `${year}년 ${month}월`;
  }, [granularity, year, month, quarter]);

  // Market distribution (by absolute realized pnl)
  const marketPnl = useMemo(() => {
    const m: Record<string, number> = { 국내: 0, 해외: 0, 암호화폐: 0 };
    historyRows.forEach((r) => {
      m[r.trade.market] = (m[r.trade.market] || 0) + r.totalRealized;
    });
    const totalAbs = Object.values(m).reduce((s, v) => s + Math.abs(v), 0);
    return { perMarket: m, totalAbs };
  }, [historyRows]);

  const toggle = (id: string) => setExpanded((p) => ({ ...p, [id]: !p[id] }));

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">매매기록</h1>
          <p className="text-sm text-muted-foreground mt-1">오픈 포지션, 분할 청산, 매매 히스토리를 관리하세요</p>
        </div>
        <MarketSessionBadge lastSyncAt={lastSync} onRefresh={load} refreshing={loading} />
      </div>

      <Tabs defaultValue="open">
        <TabsList>
          <TabsTrigger value="open">오픈 포지션 ({open.length})</TabsTrigger>
          <TabsTrigger value="history">매매 히스토리 ({closedTrades.length})</TabsTrigger>
          <TabsTrigger value="longterm">장기투자 종목 ({holdings.length})</TabsTrigger>
        </TabsList>

        {/* OPEN POSITIONS */}
        <TabsContent value="open" className="space-y-4">
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setImportOpen(true)}>
              <Download className="h-4 w-4 mr-1" /> 한투 보유종목 가져오기
            </Button>
            <Button variant="outline" onClick={syncExecutions} disabled={syncing}>
              <RefreshCw className={`h-4 w-4 mr-1 ${syncing ? "animate-spin" : ""}`} /> 체결내역 동기화
            </Button>
          </div>

          {!loading && setupStatus === "pending" && open.length === 0 && (
            <Card className="glass-card p-5 space-y-3 border border-primary/20">
              <div className="text-sm text-foreground">
                STOCK-FLOW는 <span className="font-medium">첫 매매부터 자동으로 기록</span>합니다.
                <br />
                기존 보유종목을 가져오려면 아래 [초기 보유종목 등록]을 사용하세요.
              </div>
              <Button size="sm" variant="secondary" onClick={() => setImportOpen(true)}>
                <Download className="h-4 w-4 mr-1" /> 초기 보유종목 등록
              </Button>
            </Card>
          )}

          <Card className="glass-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8" />
                  <TableHead>종목</TableHead>
                  <TableHead>진입</TableHead>
                  <TableHead>
                    진입가 / 현재가
                    <div className="text-[10px] font-normal text-muted-foreground">(전일 대비 등락률)</div>
                  </TableHead>
                  <TableHead className="text-right">보유수량</TableHead>
                  <TableHead className="text-right">
                    스탑로스
                    <div className="text-[10px] font-normal text-muted-foreground">(클릭 편집)</div>
                  </TableHead>
                  <TableHead className="text-right">
                    총 평가액
                    <div className="text-[10px] font-normal text-muted-foreground">(현재가×수량)</div>
                  </TableHead>
                  <TableHead className="text-right">
                    평가손익
                    <div className="text-[10px] font-normal text-muted-foreground">(진입 대비)</div>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">불러오는 중...</TableCell></TableRow>
                ) : open.length === 0 ? (
                  <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">오픈 포지션이 없습니다</TableCell></TableRow>
                ) : open.map((t) => {
                  const tBuys = buysByTrade[t.id] || [];
                  const tCloses = closesByTrade[t.id] || [];
                  const days = daysSince(t.entry_date);
                  const isOpen = expanded[t.id];
                  const priceEntry = tradePrices[t.ticker];
                  const cur = priceEntry?.price ?? null;
                  const prevDayRate = priceEntry?.prevDayChangeRate ?? null;
                  const avg = Number(t.entry_price);
                  const remaining = Number(t.remaining_quantity);
                  const total = Number(t.total_quantity);
                  const unrealized = cur != null ? (cur - avg) * remaining : null;
                  const unrealizedRate = cur && avg > 0 ? ((cur - avg) / avg) * 100 : null;
                  const realizedSum = tCloses.reduce((s, c) => s + Number(c.realized_pnl), 0);
                  const stopLoss = t.stop_loss != null ? Number(t.stop_loss) : null;
                  const stopTriggered = stopLoss != null && cur != null && cur <= stopLoss;
                  // 5% within stop-loss → 근접 경고 (노랑 테두리)
                  const stopNear =
                    !stopTriggered &&
                    stopLoss != null &&
                    cur != null &&
                    cur > stopLoss &&
                    (cur - stopLoss) / cur <= 0.05;
                  const marketValue = cur != null ? cur * remaining : null;
                  const totalClosedQty = tCloses.reduce((s, c) => s + Number(c.close_quantity), 0);
                  const qtyTooltip =
                    tCloses.length > 0
                      ? `최초 ${fmtNum(total)}주 → 부분청산 ${fmtNum(totalClosedQty)}주 → 잔여 ${fmtNum(remaining)}주`
                      : null;
                  return (
                    <Fragment key={t.id}>
                      <TableRow
                        className={`cursor-pointer ${
                          stopTriggered
                            ? "bg-profit/5 outline outline-1 outline-profit/40"
                            : stopNear
                            ? "outline outline-1 outline-status-partial/50"
                            : ""
                        }`}
                        onClick={() => toggle(t.id)}
                      >
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => toggle(t.id)}>
                            {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                          </Button>
                        </TableCell>
                        {/* 종목 */}
                        <TableCell>
                          <TickerCell name={t.name} ticker={t.ticker} market={t.market} />
                          <div className="mt-1 flex items-center gap-1.5">
                            <StatusBadge status={t.status} />
                            {stopTriggered && (
                              <span className="inline-flex items-center gap-1 rounded-md border border-profit/30 bg-profit/15 px-1.5 py-0.5 text-[10px] font-medium text-profit">
                                <AlertTriangle className="h-3 w-3" /> STOP
                              </span>
                            )}
                            {stopNear && (
                              <span className="inline-flex items-center gap-1 rounded-md border border-status-partial/30 bg-status-partial/15 px-1.5 py-0.5 text-[10px] font-medium text-status-partial">
                                ⚠️ STOP 근접
                              </span>
                            )}
                          </div>
                        </TableCell>
                        {/* 진입 */}
                        <TableCell className="text-sm">
                          <div>{t.entry_date.replace(/-/g, ".")}</div>
                          <div className={`text-xs font-medium ${holdingClass(days)} flex items-center gap-1`}>
                            {days > 21 && <AlertTriangle className="h-3 w-3" />}
                            D+{days}
                          </div>
                        </TableCell>
                        {/* 진입가 / 현재가 (전일 대비 등락률) */}
                        <TableCell className="text-sm">
                          <div className="tabular-nums">
                            {fmtNum(avg)} <span className="text-muted-foreground">→</span>{" "}
                            {cur != null ? <PriceCell price={cur} session={session} /> : <span className="text-muted-foreground">-</span>}
                          </div>
                          {prevDayRate != null && (
                            <div className={`text-xs tabular-nums ${pnlClass(prevDayRate)}`}>
                              {prevDayRate >= 0 ? "↗" : "↘"} {pnlSign(prevDayRate)}{prevDayRate.toFixed(2)}%
                              <span className="text-[10px] text-muted-foreground ml-1">전일대비</span>
                            </div>
                          )}
                        </TableCell>
                        {/* 보유수량 */}
                        <TableCell className="text-right" title={qtyTooltip ?? undefined}>
                          <div className="font-medium tabular-nums">{fmtNum(remaining)}주</div>
                          {remaining !== total && (
                            <div className="text-xs text-muted-foreground tabular-nums">/ 최초 {fmtNum(total)}주</div>
                          )}
                        </TableCell>
                        {/* 스탑로스 */}
                        <TableCell className="text-right">
                          <StopLossCell
                            tradeId={t.id}
                            value={stopLoss}
                            currentPrice={cur}
                            onSaved={load}
                          />
                        </TableCell>
                        {/* 총 평가액 */}
                        <TableCell className="text-right">
                          {marketValue != null ? (
                            <div className="tabular-nums font-medium">{fmtNum(marketValue)}</div>
                          ) : (
                            <span className="text-muted-foreground text-xs">-</span>
                          )}
                        </TableCell>
                        {/* 평가손익 (미실현) */}
                        <TableCell className="text-right">
                          {unrealized != null ? (
                            <>
                              <div className={`tabular-nums font-medium ${pnlClass(unrealized)}`}>
                                {fmtSignedNum(unrealized)}
                              </div>
                              {unrealizedRate != null && (
                                <div className={`text-xs tabular-nums ${pnlClass(unrealizedRate)}`}>
                                  {pnlSign(unrealizedRate)}{unrealizedRate.toFixed(2)}%
                                </div>
                              )}
                            </>
                          ) : (
                            <span className="text-muted-foreground text-xs">시세 조회 중</span>
                          )}
                        </TableCell>
                      </TableRow>
                      {isOpen && (
                        <TableRow className="bg-muted/10">
                          <TableCell />
                          <TableCell colSpan={7}>
                            <ExpandedSections
                              tBuys={tBuys}
                              tCloses={tCloses}
                              avg={avg}
                              currentPrice={cur}
                              remaining={remaining}
                              realizedSum={realizedSum}
                              showCloseAction
                              onCloseAction={() => setCloseTarget(t)}
                            />
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
          {/* Period & market filter */}
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
                    {[1, 2, 3, 4].map((q) => <SelectItem key={q} value={String(q)}>Q{q}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}

              <div className="ml-auto">
                <ToggleGroup type="single" value={marketFilter} onValueChange={(v) => v && setMarketFilter(v as MarketFilter)} variant="outline" size="sm">
                  <ToggleGroupItem value="all">전체</ToggleGroupItem>
                  <ToggleGroupItem value="국내"><MarketIcon market="국내" /> 국내</ToggleGroupItem>
                  <ToggleGroupItem value="해외"><MarketIcon market="해외" /> 해외</ToggleGroupItem>
                  <ToggleGroupItem value="암호화폐"><MarketIcon market="암호화폐" /> 암호화폐</ToggleGroupItem>
                </ToggleGroup>
              </div>
            </div>
          </Card>

          {/* Summary cards */}
          <div className="grid gap-4 md:grid-cols-4">
            <SummaryCard
              label="매매 횟수"
              value={`${summary.tradeCount}`}
              sub={`종목 ${summary.tradeCount} / 분할청산 ${summary.splitCount}회`}
            />
            <SummaryCard label="승률" value={`${summary.winRate.toFixed(1)}%`} sub={`수익 청산 회차 기준`} />
            <SummaryCard
              label="누적 실현손익"
              value={fmtSignedNum(summary.cumPnl)}
              valueClass={pnlClass(summary.cumPnl)}
              sub={periodLabel}
            />
            <SummaryCard
              label="평균 보유일"
              value={`${summary.avgHold}일`}
              valueClass={holdingClass(summary.avgHold)}
              sub={`목표: 3주(21일)`}
            />
          </div>

          {/* Market distribution */}
          <Card className="glass-card p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs text-muted-foreground">시장별 실현손익 분포 (절대값 기준)</div>
              <div className="text-xs text-muted-foreground">{periodLabel}</div>
            </div>
            {marketPnl.totalAbs === 0 ? (
              <div className="text-xs text-muted-foreground py-2">데이터가 없습니다</div>
            ) : (
              <TooltipProvider>
                <div className="flex h-3 w-full overflow-hidden rounded-md border border-border">
                  {(["국내", "해외", "암호화폐"] as const).map((mk) => {
                    const v = marketPnl.perMarket[mk] || 0;
                    const w = (Math.abs(v) / marketPnl.totalAbs) * 100;
                    if (w === 0) return null;
                    return (
                      <Tooltip key={mk}>
                        <TooltipTrigger asChild>
                          <div
                            style={{ width: `${w}%` }}
                            className={`h-full ${v >= 0 ? "bg-profit/70" : "bg-loss/70"}`}
                          />
                        </TooltipTrigger>
                        <TooltipContent>
                          <div className="text-xs">
                            <div className="font-medium flex items-center gap-1"><MarketIcon market={mk} /> {mk}</div>
                            <div className={pnlClass(v)}>{fmtSignedNum(v)}</div>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    );
                  })}
                </div>
                <div className="mt-2 flex flex-wrap gap-3 text-[11px] text-muted-foreground">
                  {(["국내", "해외", "암호화폐"] as const).map((mk) => (
                    <div key={mk} className="flex items-center gap-1">
                      <MarketIcon market={mk} />
                      <span>{mk}</span>
                      <span className={pnlClass(marketPnl.perMarket[mk] || 0)}>
                        {fmtSignedNum(marketPnl.perMarket[mk] || 0)}
                      </span>
                    </div>
                  ))}
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
                  <TableHead>거래 기간</TableHead>
                  <TableHead className="text-right">총 수량 / 분할 횟수</TableHead>
                  <TableHead className="text-right">총 실현손익</TableHead>
                  <TableHead className="text-right">평균 손익률</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">불러오는 중...</TableCell></TableRow>
                ) : historyRows.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">해당 기간에 매매 기록이 없습니다</TableCell></TableRow>
                ) : historyRows.map(({ trade: t, tBuys, tCloses, lastClose, totalRealized, totalBuyAmt, totalCloseQty, avgRate }) => {
                  const isOpen = expanded[`h-${t.id}`];
                  const periodDays = daysSince(t.entry_date) - daysSince(lastClose);
                  return (
                    <Fragment key={`h-${t.id}`}>
                      <TableRow className="cursor-pointer" onClick={() => toggle(`h-${t.id}`)}>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => toggle(`h-${t.id}`)}>
                            {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                          </Button>
                        </TableCell>
                        <TableCell>
                          <TickerCell name={t.name} ticker={t.ticker} market={t.market} />
                          <div className="mt-1"><StatusBadge status="CLOSED" /></div>
                        </TableCell>
                        <TableCell className="text-sm">
                          <div>{t.entry_date.replace(/-/g, ".")} ~ {lastClose.replace(/-/g, ".")}</div>
                          <div className="text-xs text-muted-foreground">총 {periodDays}일</div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="tabular-nums">총 {fmtNum(totalCloseQty)}주</div>
                          <div className="text-xs text-muted-foreground tabular-nums">매수 {tBuys.length}회 / 청산 {tCloses.length}회</div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className={`tabular-nums font-medium ${pnlClass(totalRealized)}`}>
                            {fmtSignedNum(totalRealized)}
                          </div>
                          <div className="text-xs text-muted-foreground tabular-nums">매수 총액 {fmtNum(Math.round(totalBuyAmt))}</div>
                        </TableCell>
                        <TableCell className={`text-right tabular-nums font-medium ${pnlClass(avgRate)}`}>
                          {pnlSign(avgRate)}{avgRate.toFixed(2)}%
                        </TableCell>
                      </TableRow>
                      {isOpen && (
                        <TableRow className="bg-muted/10">
                          <TableCell />
                          <TableCell colSpan={5}>
                            <ExpandedSections
                              tBuys={tBuys}
                              tCloses={tCloses}
                              avg={Number(t.entry_price)}
                              currentPrice={null}
                              remaining={0}
                              realizedSum={totalRealized}
                              hideEstimateBox
                            />
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

        {/* LONGTERM HOLDINGS */}
        <TabsContent value="longterm" className="space-y-4">
          <div className="flex justify-between items-center">
            <div className="text-xs text-muted-foreground">
              장기 적립식 투자 종목입니다. 매수/매도 시 평균단가가 자동 계산됩니다.
            </div>
            <Button onClick={() => setNewHoldingOpen(true)}>
              <Plus className="h-4 w-4 mr-1" /> 새 종목 추가
            </Button>
          </div>

          <Card className="glass-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8" />
                  <TableHead>종목</TableHead>
                  <TableHead>평균매입가 / 현재가</TableHead>
                  <TableHead className="text-right">보유수량</TableHead>
                  <TableHead className="text-right">
                    평가손익
                    <div className="text-[10px] font-normal text-muted-foreground">(미실현)</div>
                  </TableHead>
                  <TableHead className="text-right">누적 실현</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">불러오는 중...</TableCell></TableRow>
                ) : holdings.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">장기투자 종목을 추가해주세요</TableCell></TableRow>
                ) : holdings.map((h) => {
                  const hBuys = ltBuys.filter((b) => b.holding_id === h.id);
                  const hSells = ltSells.filter((s) => s.holding_id === h.id);
                  const isOpen = expanded[`lt-${h.id}`];
                  const avg = Number(h.avg_entry_price);
                  const remaining = Number(h.remaining_quantity);
                  const cur = ltPrices[h.ticker]?.price ?? null;
                  const changeRate = cur && avg > 0 ? ((cur - avg) / avg) * 100 : null;
                  const unrealized = cur != null ? (cur - avg) * remaining : null;
                  const unrealizedRate = changeRate;
                  const realizedSum = hSells.reduce((s, x) => s + Number(x.realized_pnl), 0);
                  return (
                    <Fragment key={h.id}>
                      <TableRow className="cursor-pointer" onClick={() => toggle(`lt-${h.id}`)}>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => toggle(`lt-${h.id}`)}>
                            {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                          </Button>
                        </TableCell>
                        <TableCell>
                          <TickerCell name={h.name} ticker={h.ticker} market={h.market} />
                        </TableCell>
                        <TableCell className="text-sm">
                          <div className="tabular-nums">
                            {fmtNum(avg)} <span className="text-muted-foreground">→</span>{" "}
                            {cur != null ? <PriceCell price={cur} session={session} /> : <span className="text-muted-foreground">-</span>}
                          </div>
                          {changeRate != null && (
                            <div className={`text-xs tabular-nums ${pnlClass(changeRate)}`}>
                              {changeRate >= 0 ? "↗" : "↘"} {pnlSign(changeRate)}{changeRate.toFixed(2)}%
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="font-medium tabular-nums">{fmtNum(remaining)}주</div>
                          <div className="text-xs text-muted-foreground tabular-nums">매수 {hBuys.length}회</div>
                        </TableCell>
                        <TableCell className="text-right">
                          {unrealized != null ? (
                            <>
                              <div className={`tabular-nums font-medium ${pnlClass(unrealized)}`}>
                                {fmtSignedNum(unrealized)}
                              </div>
                              {unrealizedRate != null && (
                                <div className={`text-xs tabular-nums ${pnlClass(unrealizedRate)}`}>
                                  {pnlSign(unrealizedRate)}{unrealizedRate.toFixed(2)}%
                                </div>
                              )}
                            </>
                          ) : (
                            <span className="text-muted-foreground text-xs">시세 조회 중</span>
                          )}
                        </TableCell>
                        <TableCell className={`text-right tabular-nums font-medium ${pnlClass(realizedSum)}`}>
                          {realizedSum === 0 ? "-" : fmtSignedNum(realizedSum)}
                        </TableCell>
                      </TableRow>
                      {isOpen && (
                        <TableRow className="bg-muted/10">
                          <TableCell />
                          <TableCell colSpan={5}>
                            <LongtermExpanded
                              hBuys={hBuys}
                              hSells={hSells}
                              avg={avg}
                              currentPrice={cur}
                              remaining={remaining}
                              realizedSum={realizedSum}
                              onAddBuy={() => setBuyTarget(h)}
                              onSell={() => setSellTarget(h)}
                              canSell={remaining > 0}
                            />
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

      
      <CloseTradeDialog
        trade={closeTarget}
        closes={closeTarget ? (closesByTrade[closeTarget.id] || []) : []}
        onOpenChange={(o) => !o && setCloseTarget(null)}
        onSaved={load}
      />
      <NewHoldingDialog open={newHoldingOpen} onOpenChange={setNewHoldingOpen} onSaved={load} />
      <AddBuyDialog holding={buyTarget} onOpenChange={(o) => !o && setBuyTarget(null)} onSaved={load} />
      <SellHoldingDialog holding={sellTarget} onOpenChange={(o) => !o && setSellTarget(null)} onSaved={load} />
      <ImportHoldingsDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        onSaved={() => {
          setInitialSetup("completed");
          setSetupStatus("completed");
          load();
        }}
        existingTickers={trades.filter((t) => t.status !== "CLOSED").map((t) => t.ticker)}
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

/* ============ Expanded sections (E-1, E-2, E-3) ============ */

interface ExpandedProps {
  tBuys: TradeBuy[];
  tCloses: TradeClose[];
  avg: number;
  currentPrice: number | null;
  remaining: number;
  realizedSum: number;
  hideEstimateBox?: boolean;
  showCloseAction?: boolean;
  onCloseAction?: () => void;
}

function ExpandedSections({
  tBuys, tCloses, avg, currentPrice, remaining, realizedSum,
  hideEstimateBox, showCloseAction, onCloseAction,
}: ExpandedProps) {
  const sortedBuys = [...tBuys].sort((a, b) => a.buy_date.localeCompare(b.buy_date));
  const sortedCloses = [...tCloses].sort((a, b) => a.close_date.localeCompare(b.close_date));
  const totalBuyQty = sortedBuys.reduce((s, b) => s + Number(b.buy_quantity), 0);
  const totalBuyAmt = sortedBuys.reduce((s, b) => s + Number(b.buy_amount), 0);

  const unrealized = currentPrice != null && remaining > 0 ? (currentPrice - avg) * remaining : null;
  const estimatedTotal = unrealized != null ? realizedSum + unrealized : null;

  return (
    <div className="space-y-4 py-2">
      {/* E-1 : 추정 청산 박스 */}
      {!hideEstimateBox && sortedCloses.length > 0 && (
        <div className="rounded-lg bg-muted/30 border border-border p-3 space-y-1 text-sm">
          <div className="text-xs text-muted-foreground">📊 이 포지션 누적 실현 / 미실현</div>
          <div className="flex flex-wrap gap-x-6 gap-y-1 tabular-nums">
            <div>
              누적 실현: <span className={pnlClass(realizedSum)}>{fmtSignedNum(realizedSum)}</span>
              <span className="text-muted-foreground text-xs ml-1">(청산 {sortedCloses.length}회)</span>
            </div>
            {unrealized != null && (
              <div>
                남은 {fmtNum(remaining)}주 미실현:{" "}
                <span className={pnlClass(unrealized)}>{fmtSignedNum(unrealized)}</span>
              </div>
            )}
          </div>
          {estimatedTotal != null && (
            <div className="border-t border-border pt-1 mt-1">
              <span className="text-muted-foreground">예상 총 손익: </span>
              <span className={`font-medium tabular-nums ${pnlClass(estimatedTotal)}`}>
                {fmtSignedNum(estimatedTotal)}
              </span>
            </div>
          )}
          <div className="text-[11px] text-muted-foreground">※ 미실현 부분은 시장 변동에 따라 달라집니다</div>
        </div>
      )}

      {/* E-2 : 매수 히스토리 */}
      <div>
        <div className="text-xs text-muted-foreground mb-2 flex items-center justify-between">
          <span>매수 히스토리</span>
          {showCloseAction && (
            <Button size="sm" variant="outline" onClick={onCloseAction}>부분 청산</Button>
          )}
        </div>
        <div className="rounded border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/30 text-xs text-muted-foreground">
              <tr>
                <th className="text-left p-2">회차</th>
                <th className="text-left p-2">매수일</th>
                <th className="text-right p-2">매수가</th>
                <th className="text-right p-2">수량</th>
                <th className="text-right p-2">매수금액</th>
                <th className="text-right p-2">누적 평균단가</th>
              </tr>
            </thead>
            <tbody>
              {sortedBuys.length === 0 ? (
                <tr><td colSpan={6} className="p-2 text-center text-muted-foreground">매수 기록이 없습니다</td></tr>
              ) : sortedBuys.map((b, i) => (
                <tr key={b.id} className="border-t border-border tabular-nums">
                  <td className="p-2">{i + 1}차</td>
                  <td className="p-2">{b.buy_date.replace(/-/g, ".")}</td>
                  <td className="p-2 text-right">{fmtNum(Number(b.buy_price))}</td>
                  <td className="p-2 text-right">{fmtNum(Number(b.buy_quantity))}주</td>
                  <td className="p-2 text-right">{fmtNum(Math.round(Number(b.buy_amount)))}</td>
                  <td className="p-2 text-right">
                    {fmtNum(Math.round(Number(b.cumulative_avg_price)))}
                    {i === sortedBuys.length - 1 && (
                      <span className="text-[10px] text-muted-foreground ml-1">(현재)</span>
                    )}
                  </td>
                </tr>
              ))}
              {sortedBuys.length > 0 && (
                <tr className="border-t border-border bg-muted/20 font-medium tabular-nums">
                  <td className="p-2">합계</td>
                  <td className="p-2" />
                  <td className="p-2" />
                  <td className="p-2 text-right">{fmtNum(totalBuyQty)}주</td>
                  <td className="p-2 text-right">{fmtNum(Math.round(totalBuyAmt))}</td>
                  <td className="p-2" />
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* E-3 : 청산 히스토리 */}
      <div>
        <div className="text-xs text-muted-foreground mb-2">부분 청산 히스토리</div>
        {sortedCloses.length === 0 ? (
          <div className="text-xs text-muted-foreground p-2">아직 청산된 부분이 없습니다</div>
        ) : (
          <div className="rounded border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/30 text-xs text-muted-foreground">
                <tr>
                  <th className="text-left p-2">회차</th>
                  <th className="text-left p-2">청산일</th>
                  <th className="text-left p-2">보유일</th>
                  <th className="text-right p-2">청산가</th>
                  <th className="text-right p-2">수량</th>
                  <th className="text-right p-2">청산금액</th>
                  <th className="text-right p-2">실현손익</th>
                  <th className="text-right p-2">손익률</th>
                </tr>
              </thead>
              <tbody>
                {sortedCloses.map((c, i) => {
                  const amt = Number(c.close_price) * Number(c.close_quantity);
                  return (
                    <tr key={c.id} className="border-t border-border tabular-nums">
                      <td className="p-2">{i + 1}차</td>
                      <td className="p-2">{c.close_date.replace(/-/g, ".")}</td>
                      <td className={`p-2 ${holdingClass(c.holding_days)}`}>D+{c.holding_days}</td>
                      <td className="p-2 text-right">{fmtNum(Number(c.close_price))}</td>
                      <td className="p-2 text-right">{fmtNum(Number(c.close_quantity))}주</td>
                      <td className="p-2 text-right">{fmtNum(Math.round(amt))}</td>
                      <td className={`p-2 text-right ${pnlClass(Number(c.realized_pnl))}`}>
                        {fmtSignedNum(Number(c.realized_pnl))}
                      </td>
                      <td className={`p-2 text-right ${pnlClass(Number(c.pnl_rate))}`}>
                        {pnlSign(Number(c.pnl_rate))}{Number(c.pnl_rate).toFixed(2)}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {!hideEstimateBox && (
        <div className="text-[11px] text-muted-foreground">
          ※ 위쪽 평가손익은 현재 보유 {fmtNum(remaining)}주에 대한 미실현 손익,
          청산 히스토리는 이미 실현한 부분의 손익입니다. 별도 계산됩니다.
        </div>
      )}
    </div>
  );
}

/* ============ Longterm expanded ============ */

function LongtermExpanded({
  hBuys, hSells, avg, currentPrice, remaining, realizedSum, onAddBuy, onSell, canSell,
}: {
  hBuys: LongtermBuy[]; hSells: LongtermSell[]; avg: number;
  currentPrice: number | null; remaining: number; realizedSum: number;
  onAddBuy: () => void; onSell: () => void; canSell: boolean;
}) {
  const sortedBuys = [...hBuys].sort((a, b) => a.buy_date.localeCompare(b.buy_date));
  const sortedSells = [...hSells].sort((a, b) => a.sell_date.localeCompare(b.sell_date));
  const totalBuyQty = sortedBuys.reduce((s, b) => s + Number(b.buy_quantity), 0);
  const totalBuyAmt = sortedBuys.reduce((s, b) => s + Number(b.buy_price) * Number(b.buy_quantity), 0);
  const unrealized = currentPrice != null && remaining > 0 ? (currentPrice - avg) * remaining : null;
  const estimatedTotal = unrealized != null ? realizedSum + unrealized : null;

  return (
    <div className="space-y-4 py-2">
      <div className="flex justify-end gap-2">
        <Button size="sm" variant="outline" onClick={onAddBuy}>추가매수</Button>
        <Button size="sm" variant="outline" onClick={onSell} disabled={!canSell}>매도</Button>
      </div>

      {sortedSells.length > 0 && (
        <div className="rounded-lg bg-muted/30 border border-border p-3 space-y-1 text-sm">
          <div className="text-xs text-muted-foreground">📊 누적 실현 / 미실현</div>
          <div className="flex flex-wrap gap-x-6 gap-y-1 tabular-nums">
            <div>
              누적 실현: <span className={pnlClass(realizedSum)}>{fmtSignedNum(realizedSum)}</span>
              <span className="text-muted-foreground text-xs ml-1">(매도 {sortedSells.length}회)</span>
            </div>
            {unrealized != null && (
              <div>
                남은 {fmtNum(remaining)}주 미실현:{" "}
                <span className={pnlClass(unrealized)}>{fmtSignedNum(unrealized)}</span>
              </div>
            )}
          </div>
          {estimatedTotal != null && (
            <div className="border-t border-border pt-1 mt-1">
              <span className="text-muted-foreground">예상 총 손익: </span>
              <span className={`font-medium tabular-nums ${pnlClass(estimatedTotal)}`}>
                {fmtSignedNum(estimatedTotal)}
              </span>
            </div>
          )}
        </div>
      )}

      <div>
        <div className="text-xs text-muted-foreground mb-2">매수 히스토리</div>
        <div className="rounded border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/30 text-xs text-muted-foreground">
              <tr>
                <th className="text-left p-2">회차</th>
                <th className="text-left p-2">매수일</th>
                <th className="text-right p-2">매수가</th>
                <th className="text-right p-2">수량</th>
                <th className="text-right p-2">매수금액</th>
              </tr>
            </thead>
            <tbody>
              {sortedBuys.length === 0 ? (
                <tr><td colSpan={5} className="p-2 text-center text-muted-foreground">매수 기록이 없습니다</td></tr>
              ) : sortedBuys.map((b, i) => (
                <tr key={b.id} className="border-t border-border tabular-nums">
                  <td className="p-2">{i + 1}차</td>
                  <td className="p-2">{b.buy_date.replace(/-/g, ".")}</td>
                  <td className="p-2 text-right">{fmtNum(Number(b.buy_price))}</td>
                  <td className="p-2 text-right">{fmtNum(Number(b.buy_quantity))}주</td>
                  <td className="p-2 text-right">
                    {fmtNum(Math.round(Number(b.buy_price) * Number(b.buy_quantity)))}
                  </td>
                </tr>
              ))}
              {sortedBuys.length > 0 && (
                <tr className="border-t border-border bg-muted/20 font-medium tabular-nums">
                  <td className="p-2">합계</td>
                  <td className="p-2" />
                  <td className="p-2" />
                  <td className="p-2 text-right">{fmtNum(totalBuyQty)}주</td>
                  <td className="p-2 text-right">{fmtNum(Math.round(totalBuyAmt))}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <div className="text-xs text-muted-foreground mb-2">매도 히스토리</div>
        {sortedSells.length === 0 ? (
          <div className="text-xs text-muted-foreground p-2">아직 매도된 부분이 없습니다</div>
        ) : (
          <div className="rounded border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/30 text-xs text-muted-foreground">
                <tr>
                  <th className="text-left p-2">회차</th>
                  <th className="text-left p-2">매도일</th>
                  <th className="text-right p-2">매도가</th>
                  <th className="text-right p-2">수량</th>
                  <th className="text-right p-2">실현손익</th>
                  <th className="text-right p-2">손익률</th>
                </tr>
              </thead>
              <tbody>
                {sortedSells.map((s, i) => (
                  <tr key={s.id} className="border-t border-border tabular-nums">
                    <td className="p-2">{i + 1}차</td>
                    <td className="p-2">{s.sell_date.replace(/-/g, ".")}</td>
                    <td className="p-2 text-right">{fmtNum(Number(s.sell_price))}</td>
                    <td className="p-2 text-right">{fmtNum(Number(s.sell_quantity))}주</td>
                    <td className={`p-2 text-right ${pnlClass(Number(s.realized_pnl))}`}>
                      {fmtSignedNum(Number(s.realized_pnl))}
                    </td>
                    <td className={`p-2 text-right ${pnlClass(Number(s.pnl_rate))}`}>
                      {pnlSign(Number(s.pnl_rate))}{Number(s.pnl_rate).toFixed(2)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
