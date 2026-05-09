import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Trade, TradeBuy, TradeClose } from "@/pages/Trades";

export function useLinkedTrades(ideaId: string | undefined) {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [buys, setBuys] = useState<TradeBuy[]>([]);
  const [closes, setCloses] = useState<TradeClose[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!ideaId) { setTrades([]); setBuys([]); setCloses([]); setLoading(false); return; }
    setLoading(true);
    const { data: t } = await supabase.from("trades").select("*").eq("idea_id", ideaId).order("entry_date", { ascending: false });
    const tradeRows = (t as Trade[]) || [];
    setTrades(tradeRows);
    if (tradeRows.length) {
      const ids = tradeRows.map((x) => x.id);
      const [{ data: b }, { data: c }] = await Promise.all([
        supabase.from("trade_buys").select("*").in("trade_id", ids).order("buy_date"),
        supabase.from("trade_closes").select("*").in("trade_id", ids).order("close_date"),
      ]);
      setBuys((b as TradeBuy[]) || []);
      setCloses((c as TradeClose[]) || []);
    } else {
      setBuys([]); setCloses([]);
    }
    setLoading(false);
  }, [ideaId]);

  useEffect(() => { refresh(); }, [refresh]);

  return { trades, buys, closes, loading, refresh };
}
