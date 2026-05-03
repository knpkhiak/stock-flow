import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus } from "lucide-react";
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

const fmtNum = (n: number) => new Intl.NumberFormat("ko-KR").format(n);

export default function Trades() {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [openNew, setOpenNew] = useState(false);
  const [closeTarget, setCloseTarget] = useState<Trade | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("trades")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    else setTrades((data || []) as Trade[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const open = trades.filter((t) => t.status === "OPEN");
  const closed = trades.filter((t) => t.status === "CLOSED");

  const totalCount = closed.length;
  const winCount = closed.filter((t) => (t.realized_pnl ?? 0) > 0).length;
  const winRate = totalCount > 0 ? (winCount / totalCount) * 100 : 0;
  const cumPnl = closed.reduce((s, t) => s + (t.realized_pnl ?? 0), 0);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-semibold">매매기록</h1>
        <p className="text-sm text-muted-foreground mt-1">오픈 포지션과 매매 히스토리를 관리하세요</p>
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
                  <TableHead>종목</TableHead>
                  <TableHead>시장</TableHead>
                  <TableHead>진입일</TableHead>
                  <TableHead className="text-right">진입가</TableHead>
                  <TableHead className="text-right">수량</TableHead>
                  <TableHead>메모</TableHead>
                  <TableHead className="text-right">액션</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">불러오는 중...</TableCell></TableRow>
                ) : open.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">오픈 포지션이 없습니다</TableCell></TableRow>
                ) : open.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell>
                      <div className="font-medium">{t.name}</div>
                      <div className="text-xs text-muted-foreground">{t.ticker}</div>
                    </TableCell>
                    <TableCell>{t.market}</TableCell>
                    <TableCell>{t.entry_date}</TableCell>
                    <TableCell className="text-right tabular-nums">{fmtNum(t.entry_price)}</TableCell>
                    <TableCell className="text-right tabular-nums">{fmtNum(t.quantity)}</TableCell>
                    <TableCell className="max-w-xs truncate text-muted-foreground">{t.memo}</TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="outline" onClick={() => setCloseTarget(t)}>포지션 닫기</Button>
                    </TableCell>
                  </TableRow>
                ))}
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
                  <TableHead>종목</TableHead>
                  <TableHead>시장</TableHead>
                  <TableHead>기간</TableHead>
                  <TableHead className="text-right">진입가</TableHead>
                  <TableHead className="text-right">청산가</TableHead>
                  <TableHead className="text-right">수량</TableHead>
                  <TableHead className="text-right">실현손익</TableHead>
                  <TableHead className="text-right">수익률</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">불러오는 중...</TableCell></TableRow>
                ) : closed.length === 0 ? (
                  <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">매매 히스토리가 없습니다</TableCell></TableRow>
                ) : closed.map((t) => {
                  const rate = t.pnl_rate ?? 0;
                  const pnl = t.realized_pnl ?? 0;
                  const pos = rate > 0;
                  const neg = rate < 0;
                  const cls = pos ? "text-primary" : neg ? "text-destructive" : "";
                  return (
                    <TableRow key={t.id}>
                      <TableCell>
                        <div className="font-medium">{t.name}</div>
                        <div className="text-xs text-muted-foreground">{t.ticker}</div>
                      </TableCell>
                      <TableCell>{t.market}</TableCell>
                      <TableCell className="text-sm">{t.entry_date} ~ {t.exit_date}</TableCell>
                      <TableCell className="text-right tabular-nums">{fmtNum(t.entry_price)}</TableCell>
                      <TableCell className="text-right tabular-nums">{t.exit_price ? fmtNum(t.exit_price) : "-"}</TableCell>
                      <TableCell className="text-right tabular-nums">{fmtNum(t.quantity)}</TableCell>
                      <TableCell className={`text-right tabular-nums ${cls}`}>{pos ? "+" : ""}{fmtNum(Math.round(pnl))}</TableCell>
                      <TableCell className={`text-right tabular-nums ${cls}`}>{pos ? "+" : ""}{rate.toFixed(2)}%</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>

      <NewTradeDialog open={openNew} onOpenChange={setOpenNew} onSaved={load} />
      <CloseTradeDialog trade={closeTarget} onOpenChange={(o) => !o && setCloseTarget(null)} onSaved={load} />
    </div>
  );
}
