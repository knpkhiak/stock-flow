-- Add UNIQUE constraint on trade_buys.kis_order_id (used for dedupe in sync)
-- Use partial unique index since kis_order_id is nullable for manual entries
CREATE UNIQUE INDEX IF NOT EXISTS trade_buys_kis_order_id_unique
  ON public.trade_buys (kis_order_id)
  WHERE kis_order_id IS NOT NULL;

-- Same for trade_closes
CREATE UNIQUE INDEX IF NOT EXISTS trade_closes_kis_order_id_unique
  ON public.trade_closes (kis_order_id)
  WHERE kis_order_id IS NOT NULL;

-- Index for performance: looking up buys/closes by trade_id
CREATE INDEX IF NOT EXISTS trade_buys_trade_id_idx ON public.trade_buys (trade_id);
CREATE INDEX IF NOT EXISTS trade_closes_trade_id_idx ON public.trade_closes (trade_id);

-- Backfill: for any existing trade that has NO trade_buys row yet,
-- insert a synthetic 1st-buy row from the trade's entry_date / entry_price / total_quantity.
-- This ensures the new "매수 히스토리" panel shows existing positions.
INSERT INTO public.trade_buys (
  user_id, trade_id, buy_date, buy_price, buy_quantity, buy_amount,
  cumulative_avg_price, source
)
SELECT
  t.user_id,
  t.id,
  t.entry_date,
  t.entry_price,
  t.total_quantity,
  t.entry_price * t.total_quantity,
  t.entry_price,
  COALESCE(t.source, 'manual')
FROM public.trades t
WHERE NOT EXISTS (
  SELECT 1 FROM public.trade_buys b WHERE b.trade_id = t.id
);