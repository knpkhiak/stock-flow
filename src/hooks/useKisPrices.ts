import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getKisEnv } from "@/pages/Settings";

interface PriceEntry {
  price: number | null;
  loading: boolean;
  fetchedAt: number;
}

const TTL_MS = 60_000; // 1분 캐시

/**
 * 한투 inquire-price를 호출해 ticker별 현재가를 가져오는 훅.
 * - 같은 ticker는 1분간 캐시.
 * - kis-proxy `price` 액션을 호출.
 */
export function useKisPrices(tickers: string[]) {
  const [prices, setPrices] = useState<Record<string, PriceEntry>>({});
  const cacheRef = useRef<Record<string, PriceEntry>>({});

  useEffect(() => {
    const unique = Array.from(new Set(tickers.filter(Boolean)));
    if (unique.length === 0) return;
    const now = Date.now();
    const need = unique.filter((t) => {
      const c = cacheRef.current[t];
      return !c || now - c.fetchedAt > TTL_MS;
    });
    if (need.length === 0) {
      // Hydrate state from cache if missing
      setPrices((p) => {
        const next = { ...p };
        for (const t of unique) if (cacheRef.current[t]) next[t] = cacheRef.current[t];
        return next;
      });
      return;
    }

    // Mark loading
    setPrices((p) => {
      const next = { ...p };
      for (const t of need) next[t] = { price: null, loading: true, fetchedAt: 0 };
      return next;
    });

    let cancelled = false;
    (async () => {
      const env = getKisEnv();
      // Serial fetch w/ small delay to respect KIS rate limit (real: ~20/s, paper: ~2/s).
      const results: { ticker: string; price: number | null }[] = [];
      for (const ticker of need) {
        if (cancelled) return;
        try {
          const { data, error } = await supabase.functions.invoke("kis-proxy", {
            body: { action: "price", env, ticker },
          });
          if (error) throw new Error(error.message);
          if ((data as any)?.error) throw new Error((data as any).error);
          const stck = Number((data as any)?.output?.stck_prpr);
          results.push({ ticker, price: Number.isFinite(stck) ? stck : null });
        } catch {
          results.push({ ticker, price: null });
        }
        // Throttle: 150ms between requests
        await new Promise((r) => setTimeout(r, 150));
      }
      if (cancelled) return;
      const stamped = Date.now();
      const updates: Record<string, PriceEntry> = {};
      for (const r of results) {
        const entry = { price: r.price, loading: false, fetchedAt: stamped };
        cacheRef.current[r.ticker] = entry;
        updates[r.ticker] = entry;
      }
      setPrices((p) => ({ ...p, ...updates }));
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tickers.join(",")]);

  return prices;
}
