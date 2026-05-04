import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Download, RefreshCw } from "lucide-react";
import { getKisEnv } from "@/pages/Settings";

interface KisHolding {
  pdno: string;          // 종목코드
  prdt_name: string;     // 종목명
  hldg_qty: string;      // 보유수량
  pchs_avg_pric: string; // 매입평균가
}

export default function ImportHoldingsDialog({
  open,
  onOpenChange,
  onSaved,
  existingTickers,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onSaved: () => void;
  existingTickers: string[];
}) {
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<KisHolding[]>([]);
  const [picked, setPicked] = useState<Record<string, boolean>>({});
  const [entryDate, setEntryDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setItems([]);
      setPicked({});
      void fetchHoldings();
    }
  }, [open]);

  const fetchHoldings = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("kis-proxy", {
        body: { action: "balance", env: getKisEnv() },
      });
      if (error) throw new Error(error.message);
      if ((data as any)?.error) throw new Error((data as any).error);
      const list: KisHolding[] = (data as any)?.output1 ?? [];
      const filtered = list.filter((x) => Number(x.hldg_qty) > 0);
      setItems(filtered);
      localStorage.setItem("stock-flow-last-sync", new Date().toISOString());
    } catch (e: any) {
      toast.error(`보유종목 조회 실패: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const toggleAll = (v: boolean) => {
    const m: Record<string, boolean> = {};
    items.forEach((x) => {
      if (!existingTickers.includes(x.pdno)) m[x.pdno] = v;
    });
    setPicked(m);
  };

  const save = async () => {
    const selected = items.filter((x) => picked[x.pdno]);
    if (selected.length === 0) {
      toast.error("가져올 종목을 선택해주세요");
      return;
    }
    setSaving(true);
    try {
      // Insert one trade per holding, then mirror a 1st buy lot for each.
      const tradeRows = selected.map((x) => {
        const qty = Number(x.hldg_qty);
        const price = Number(x.pchs_avg_pric);
        return {
          ticker: x.pdno,
          name: x.prdt_name,
          market: "국내",
          status: "OPEN",
          entry_date: entryDate,
          entry_price: price,
          total_quantity: qty,
          remaining_quantity: qty,
          source: "manual",
        };
      });
      const { data: inserted, error } = await supabase
        .from("trades")
        .insert(tradeRows)
        .select("id, ticker, entry_price, total_quantity, entry_date");
      if (error) throw new Error(error.message);

      const buyRows = (inserted ?? []).map((t) => ({
        trade_id: t.id,
        buy_date: t.entry_date,
        buy_price: Number(t.entry_price),
        buy_quantity: Number(t.total_quantity),
        buy_amount: Number(t.entry_price) * Number(t.total_quantity),
        cumulative_avg_price: Number(t.entry_price),
        source: "manual",
      }));
      if (buyRows.length > 0) {
        const { error: buyErr } = await supabase.from("trade_buys").insert(buyRows);
        if (buyErr) throw new Error(`매수 히스토리 저장 실패: ${buyErr.message}`);
      }

      toast.success(`${tradeRows.length}개 종목 등록 완료`);
      onSaved();
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  const selectableCount = items.filter((x) => !existingTickers.includes(x.pdno)).length;
  const pickedCount = Object.values(picked).filter(Boolean).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>한투 보유종목 가져오기</DialogTitle>
        </DialogHeader>

        <div className="flex items-center justify-between gap-3">
          <div className="grid gap-1.5">
            <Label className="text-xs">진입일 (가져올 종목 공통)</Label>
            <Input type="date" value={entryDate} onChange={(e) => setEntryDate(e.target.value)} className="w-44" />
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={fetchHoldings} disabled={loading}>
              <RefreshCw className={`h-3 w-3 mr-1 ${loading ? "animate-spin" : ""}`} />새로고침
            </Button>
            <Button size="sm" variant="ghost" onClick={() => toggleAll(true)} disabled={selectableCount === 0}>
              전체선택
            </Button>
            <Button size="sm" variant="ghost" onClick={() => toggleAll(false)}>
              해제
            </Button>
          </div>
        </div>

        <div className="border border-border rounded-md max-h-[420px] overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10" />
                <TableHead>종목</TableHead>
                <TableHead className="text-right">매입평균가</TableHead>
                <TableHead className="text-right">보유수량</TableHead>
                <TableHead>상태</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">조회 중...</TableCell></TableRow>
              ) : items.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">보유종목이 없습니다</TableCell></TableRow>
              ) : items.map((x) => {
                const exists = existingTickers.includes(x.pdno);
                return (
                  <TableRow key={x.pdno} className={exists ? "opacity-50" : ""}>
                    <TableCell>
                      <Checkbox
                        checked={!!picked[x.pdno]}
                        disabled={exists}
                        onCheckedChange={(v) => setPicked((p) => ({ ...p, [x.pdno]: !!v }))}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{x.prdt_name}</div>
                      <div className="text-xs text-muted-foreground">{x.pdno}</div>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {new Intl.NumberFormat("ko-KR").format(Number(x.pchs_avg_pric))}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {new Intl.NumberFormat("ko-KR").format(Number(x.hldg_qty))}
                    </TableCell>
                    <TableCell>
                      {exists ? (
                        <span className="text-xs text-muted-foreground">이미 등록됨</span>
                      ) : (
                        <span className="text-xs text-secondary">신규</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>취소</Button>
          <Button onClick={save} disabled={saving || pickedCount === 0}>
            <Download className="h-4 w-4 mr-1" />
            {pickedCount}개 종목 등록
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
