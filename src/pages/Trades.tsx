import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, ChevronDown, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import NewTradeDialog from "@/components/trades/NewTradeDialog";
import CloseTradeDialog from "@/components/trades/CloseTradeDialog";

export interface Trade {
  id: string;
  ticker: string;
  name: string;
  market: string;
  status: string;
  entry_date: string;
  entry_price: number;
  quantity: number;
  exit_date: string | null;
  exit_price: number | null;
  realized_pnl: number | null;
  pnl_rate: number | null;
  memo: string | null;
  idea_id: string | null;
  created_at: string;
}

export interface TradeClose {
  id: string;
  trade_id: string;
  close_date: string;
  close_price: number;
  quantity: number;
  realized_pnl: number;
  pnl_rate: number;
  memo: string | null;
  created_at: string;
}

const fmtNum = (n: number) => new Intl.NumberFormat("ko-KR").format(n);
const TARGET_DAYS = 21; // 3주

const daysBetween = (from: string, to: string) => {
  const a = new Date(from).getTime();
  const b = new Date(to).getTime();
  return Math.max(0, Math.round((b - a) / (1000 * 60 * 60 * 24)));
};

function HoldingBadge({ days, target = TARGET_DAYS }: { days: number; target?: number }) {
  const ratio = days / target;
  let cls = "bg-primary/15 text-primary border-primary/30";
  if (ratio >= 1) cls = "bg-destructive/15 text-destructive border-destructive/30";
  else if (ratio >= 0.66) cls = "bg-yellow-500/15 text-yellow-400 border-yellow-500/30";
  return (
    <Badge variant="outline" className={`${cls} tabular-nums`}>
      {days}일 / 목표 {target}일
    </Badge>
  );
}

export default function Trades() {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [closes, setCloses] = useState<TradeClose[]>([]);
  const [loading, setLoading] = useState(true);
  const [openNew, setOpenNew] = useState(false);
  const [closeTarget, setCloseTarget] = useState<Trade | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const load = async () => {
    setLoading(true);
    const [{ data: t, error: e1 }, { data: c, error: e2 }] = await Promise.all([
      supabase.from("trades").select("*").order("created_at", { ascending: false }),
      supabase.from("trade_closes").select("*").order("close_date", { ascending: true }),
    ]);
    if (e1) toast.error(e1.message);
    if (e2) toast.error(e2.message);
    setTrades((t || []) as Trade[]);
    setCloses((c || []) as TradeClose[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const closesByTrade = useMemo(() => {
    const m: Record<string, TradeClose[]> = {};
    for (const c of closes) (m[c.trade_id] ||= []).push(c);
    return m;
  }, [closes]);

  const open = trades.filter((t) => t.status === "OPEN");
  const closed = trades.filter((t) => t.status === "CLOSED");

  const totalCount = closed.length;
  const winCount = closed.filter((t) => (t.realized_pnl ?? 0) > 0).length;
  const winRate = totalCount > 0 ? (winCount / totalCount) * 100 : 0;
  const cumPnl = closed.reduce((s, t) => s + (t.realized_pnl ?? 0), 0);

  const today = new Date().toISOString().slice(0, 10);

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
          <TabsTrigger value="history">매매 히스토리 ({closed.length})</TabsTrigger>
        </TabsList>

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
                  <TableHead>진입일 / 보유</TableHead>
                  <TableHead className="text-right">진입가</TableHead>
                  <TableHead className="text-right">잔여 / 원수량</TableHead>
                  <TableHead>메모</TableHead>
                  <TableHead className="text-right">액션</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">불러오는 중...</TableCell></TableRow>
                ) : open.length === 0 ? (
                  <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">오픈 포지션이 없습니다</TableCell></TableRow>
                ) : open.map((t) => {
                  const tc = closesByTrade[t.id] || [];
                  const closedQty = tc.reduce((s, c) => s + Number(c.quantity), 0);
                  const remaining = Number(t.quantity) - closedQty;
                  const days = daysBetween(t.entry_date, today);
                  const isOpen = expanded[t.id];
                  return (
                    <>
                      <TableRow key={t.id}>
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
                        <TableCell>{t.market}</TableCell>
                        <TableCell>
                          <div className="text-sm">{t.entry_date}</div>
                          <div className="mt-1"><HoldingBadge days={days} /></div>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{fmtNum(t.entry_price)}</TableCell>
                        <TableCell className="text-right tabular-nums">
                          <span className="font-medium text-primary">{fmtNum(remaining)}</span>
                          <span className="text-muted-foreground"> / {fmtNum(t.quantity)}</span>
                          {tc.length > 0 && <div className="text-xs text-muted-foreground">분할 {tc.length}회</div>}
                        </TableCell>
                        <TableCell className="max-w-xs truncate text-muted-foreground">{t.memo}</TableCell>
                        <TableCell className="text-right">
                          <Button size="sm" variant="outline" onClick={() => setCloseTarget(t)}>분할 청산</Button>
                        </TableCell>
                      </TableRow>
                      {isOpen && tc.length > 0 && (
                        <TableRow key={t.id + "-x"} className="bg-muted/10">
                          <TableCell />
                          <TableCell colSpan={7}>
                            <div className="text-xs text-muted-foreground mb-2">분할 청산 내역</div>
                            <div className="space-y-1">
                              {tc.map((c) => {
                                const cls = c.realized_pnl > 0 ? "text-primary" : c.realized_pnl < 0 ? "text-destructive" : "";
                                const heldDays = daysBetween(t.entry_date, c.close_date);
                                return (
                                  <div key={c.id} className="grid grid-cols-6 gap-2 text-sm tabular-nums">
                                    <div>{c.close_date}</div>
                                    <div className="text-muted-foreground">보유 {heldDays}일</div>
                                    <div>가격 {fmtNum(c.close_price)}</div>
                                    <div>수량 {fmtNum(c.quantity)}</div>
                                    <div className={cls}>{c.realized_pnl >= 0 ? "+" : ""}{fmtNum(Math.round(c.realized_pnl))}</div>
                                    <div className={cls}>{c.pnl_rate >= 0 ? "+" : ""}{c.pnl_rate.toFixed(2)}%</div>
                                  </div>
                                );
                              })}
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  );
                })}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="glass-card p-4">
              <div className="text-xs text-muted-foreground">총 매매횟수</div>
              <div className="text-2xl font-semibold tabular-nums mt-1">{totalCount}</div>
            </Card>
            <Card className="glass-card p-4">
              <div className="text-xs text-muted-foreground">승률</div>
              <div className="text-2xl font-semibold tabular-nums mt-1">{winRate.toFixed(1)}%</div>
            </Card>
            <Card className="glass-card p-4">
              <div className="text-xs text-muted-foreground">누적 실현손익</div>
              <div className={`text-2xl font-semibold tabular-nums mt-1 ${cumPnl > 0 ? "text-primary" : cumPnl < 0 ? "text-destructive" : ""}`}>
                {cumPnl >= 0 ? "+" : ""}{fmtNum(Math.round(cumPnl))}
              </div>
            </Card>
          </div>

          <Card className="glass-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8" />
                  <TableHead>종목</TableHead>
                  <TableHead>시장</TableHead>
                  <TableHead>기간 / 보유일</TableHead>
                  <TableHead className="text-right">진입가</TableHead>
                  <TableHead className="text-right">평균 청산가</TableHead>
                  <TableHead className="text-right">수량</TableHead>
                  <TableHead className="text-right">실현손익</TableHead>
                  <TableHead className="text-right">수익률</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-8">불러오는 중...</TableCell></TableRow>
                ) : closed.length === 0 ? (
                  <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-8">매매 히스토리가 없습니다</TableCell></TableRow>
                ) : closed.map((t) => {
                  const rate = t.pnl_rate ?? 0;
                  const pnl = t.realized_pnl ?? 0;
                  const pos = rate > 0;
                  const neg = rate < 0;
                  const cls = pos ? "text-primary" : neg ? "text-destructive" : "";
                  const tc = closesByTrade[t.id] || [];
                  const heldDays = t.exit_date ? daysBetween(t.entry_date, t.exit_date) : 0;
                  const isOpen = expanded[t.id];
                  return (
                    <>
                      <TableRow key={t.id}>
                        <TableCell>
                          {tc.length > 1 ? (
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => toggle(t.id)}>
                              {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                            </Button>
                          ) : null}
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{t.name}</div>
                          <div className="text-xs text-muted-foreground">{t.ticker}</div>
                        </TableCell>
                        <TableCell>{t.market}</TableCell>
                        <TableCell className="text-sm">
                          <div>{t.entry_date} ~ {t.exit_date}</div>
                          <div className="mt-1"><HoldingBadge days={heldDays} /></div>
                          {tc.length > 1 && <div className="text-xs text-muted-foreground mt-1">분할 {tc.length}회</div>}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{fmtNum(t.entry_price)}</TableCell>
                        <TableCell className="text-right tabular-nums">{t.exit_price ? fmtNum(Math.round(Number(t.exit_price))) : "-"}</TableCell>
                        <TableCell className="text-right tabular-nums">{fmtNum(t.quantity)}</TableCell>
                        <TableCell className={`text-right tabular-nums ${cls}`}>{pos ? "+" : ""}{fmtNum(Math.round(pnl))}</TableCell>
                        <TableCell className={`text-right tabular-nums ${cls}`}>{pos ? "+" : ""}{rate.toFixed(2)}%</TableCell>
                      </TableRow>
                      {isOpen && tc.length > 1 && (
                        <TableRow key={t.id + "-x"} className="bg-muted/10">
                          <TableCell />
                          <TableCell colSpan={8}>
                            <div className="text-xs text-muted-foreground mb-2">분할 청산 내역</div>
                            <div className="space-y-1">
                              {tc.map((c) => {
                                const ccls = c.realized_pnl > 0 ? "text-primary" : c.realized_pnl < 0 ? "text-destructive" : "";
                                const d = daysBetween(t.entry_date, c.close_date);
                                return (
                                  <div key={c.id} className="grid grid-cols-6 gap-2 text-sm tabular-nums">
                                    <div>{c.close_date}</div>
                                    <div className="text-muted-foreground">보유 {d}일</div>
                                    <div>가격 {fmtNum(c.close_price)}</div>
                                    <div>수량 {fmtNum(c.quantity)}</div>
                                    <div className={ccls}>{c.realized_pnl >= 0 ? "+" : ""}{fmtNum(Math.round(c.realized_pnl))}</div>
                                    <div className={ccls}>{c.pnl_rate >= 0 ? "+" : ""}{c.pnl_rate.toFixed(2)}%</div>
                                  </div>
                                );
                              })}
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </>
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
