import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getKisEnv } from "@/pages/Settings";

export type PriceCurrency = "KRW" | "USD";

export interface PriceEntry {
  price: number | null;
  prevDayChangeRate: number | null; // 전일 대비 등락률 (%)
  currency: PriceCurrency;
  loading: boolean;
  fetchedAt: number;
}

export interface PriceQuery {
  ticker: string;
  market?: string; // "국내" | "해외" | "암호화폐" 등
}

const TTL_MS = 60_000; // 1분 캐시
const OVERSEAS_EXCDS = ["NAS", "NYS", "AMS"]; // try in order

// 캐시 키 (market 분리해서 동일 ticker가 시장 다를 수 있는 케이스 대응)
const cacheKey = (q: PriceQuery) => `${q.market ?? "국내"}::${q.ticker}`;

/**
 * 한투 시세를 ticker별로 가져오는 훅.
 * - 국내: inquire-price (KRW)
 * - 해외: overseas price (USD), EXCD 자동 시도 (NAS → NYS → AMS)
 * - 같은 ticker는 1분간 캐시.
 *
 * 호환성: tickers를 string[]으로 넘기면 모두 국내로 간주.
 */
export function useKisPrices(input: string[] | PriceQuery[]) {
  const [prices, setPrices] = useState<Record<string, PriceEntry>>({});
  const cacheRef = useRef<Record<string, PriceEntry>>({});

  // Normalize input
  const queries: PriceQuery[] = (input as any[]).map((x) =>
    typeof x === "string" ? { ticker: x, market: "국내" } : { ticker: x.ticker, market: x.market ?? "국내" },
  );

  // dedupe by cache key
  const seen = new Set<string>();
  const unique: PriceQuery[] = [];
  for (const q of queries) {
    if (!q.ticker) continue;
    const k = cacheKey(q);
    if (seen.has(k)) continue;
    seen.add(k);
    unique.push(q);
  }

  const depKey = unique.map(cacheKey).join(",");

  useEffect(() => {
    if (unique.length === 0) return;
    const now = Date.now();
    const need = unique.filter((q) => {
      const c = cacheRef.current[q.ticker]; // expose by ticker (consumers index by ticker)
      return !c || now - c.fetchedAt > TTL_MS;
    });

    if (need.length === 0) {
      setPrices((p) => {
        const next = { ...p };
        for (const q of unique) if (cacheRef.current[q.ticker]) next[q.ticker] = cacheRef.current[q.ticker];
        return next;
      });
      return;
    }

    setPrices((p) => {
      const next = { ...p };
      for (const q of need) {
        next[q.ticker] = {
          price: null,
          prevDayChangeRate: null,
          currency: q.market === "해외" ? "USD" : "KRW",
          loading: true,
          fetchedAt: 0,
        };
      }
      return next;
    });

    let cancelled = false;
    (async () => {
      const env = getKisEnv();
      const results: Array<{ ticker: string; entry: PriceEntry }> = [];

      for (const q of need) {
        if (cancelled) return;
        const isOverseas = q.market === "해외";
        let price: number | null = null;
        let rate: number | null = null;

        try {
          if (isOverseas) {
            // try multiple exchanges
            for (const excd of OVERSEAS_EXCDS) {
              try {
                const { data, error } = await supabase.functions.invoke("kis-proxy", {
                  body: { action: "price_overseas", env, ticker: q.ticker, excd },
                });
                if (error) throw new Error(error.message);
                if ((data as any)?.error) throw new Error((data as any).error);
                const out = (data as any)?.output ?? {};
                const last = Number(out.last);
                const r = Number(out.rate); // 등락률(%)
                if (Number.isFinite(last) && last > 0) {
                  price = last;
                  rate = Number.isFinite(r) ? r : null;
                  break;
                }
              } catch {
                /* try next excd */
              }
              await new Promise((r) => setTimeout(r, 120));
            }
          } else {
            const { data, error } = await supabase.functions.invoke("kis-proxy", {
              body: { action: "price", env, ticker: q.ticker },
            });
            if (error) throw new Error(error.message);
            if ((data as any)?.error) throw new Error((data as any).error);
            const out = (data as any)?.output ?? {};
            const stck = Number(out.stck_prpr);
            const r = Number(out.prdy_vrss_rate);
            if (Number.isFinite(stck)) price = stck;
            if (Number.isFinite(r)) rate = r;
          }
        } catch {
          /* leave nulls */
        }

        results.push({
          ticker: q.ticker,
          entry: {
            price,
            prevDayChangeRate: rate,
            currency: isOverseas ? "USD" : "KRW",
            loading: false,
            fetchedAt: Date.now(),
          },
        });

        await new Promise((r) => setTimeout(r, 150));
      }

      if (cancelled) return;
      const updates: Record<string, PriceEntry> = {};
      for (const r of results) {
        cacheRef.current[r.ticker] = r.entry;
        updates[r.ticker] = r.entry;
      }
      setPrices((p) => ({ ...p, ...updates }));
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [depKey]);

  return prices;
}
