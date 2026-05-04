
ALTER TABLE public.trade_closes RENAME COLUMN quantity TO close_quantity;
ALTER TABLE public.trade_closes ADD COLUMN IF NOT EXISTS holding_days integer;

UPDATE public.trade_closes tc
SET holding_days = GREATEST(0, (tc.close_date - t.entry_date))
FROM public.trades t
WHERE tc.trade_id = t.id AND tc.holding_days IS NULL;

ALTER TABLE public.trade_closes ALTER COLUMN holding_days SET NOT NULL;

ALTER TABLE public.trades RENAME COLUMN quantity TO total_quantity;
ALTER TABLE public.trades ADD COLUMN IF NOT EXISTS remaining_quantity numeric;
ALTER TABLE public.trades ADD COLUMN IF NOT EXISTS avg_close_price numeric;
ALTER TABLE public.trades ADD COLUMN IF NOT EXISTS total_realized_pnl numeric;

INSERT INTO public.trade_closes (trade_id, close_date, close_price, close_quantity, realized_pnl, pnl_rate, holding_days, memo)
SELECT t.id, t.exit_date, t.exit_price, t.total_quantity,
       COALESCE(t.realized_pnl, (t.exit_price - t.entry_price) * t.total_quantity),
       COALESCE(t.pnl_rate, ((t.exit_price - t.entry_price) / NULLIF(t.entry_price, 0)) * 100),
       GREATEST(0, (t.exit_date - t.entry_date)),
       NULL
FROM public.trades t
WHERE t.status = 'CLOSED'
  AND t.exit_date IS NOT NULL
  AND t.exit_price IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.trade_closes c WHERE c.trade_id = t.id);

UPDATE public.trades t SET
  remaining_quantity = t.total_quantity - COALESCE((SELECT SUM(close_quantity) FROM public.trade_closes c WHERE c.trade_id = t.id), 0),
  total_realized_pnl = (SELECT SUM(realized_pnl) FROM public.trade_closes c WHERE c.trade_id = t.id),
  avg_close_price = CASE
    WHEN (SELECT SUM(close_quantity) FROM public.trade_closes c WHERE c.trade_id = t.id) > 0
    THEN (SELECT SUM(close_price * close_quantity) / SUM(close_quantity) FROM public.trade_closes c WHERE c.trade_id = t.id)
    ELSE NULL
  END;

UPDATE public.trades SET remaining_quantity = total_quantity WHERE remaining_quantity IS NULL;

ALTER TABLE public.trades ALTER COLUMN remaining_quantity SET NOT NULL;
ALTER TABLE public.trades ALTER COLUMN remaining_quantity SET DEFAULT 0;

UPDATE public.trades SET status = 'PARTIAL'
WHERE remaining_quantity > 0
  AND remaining_quantity < total_quantity
  AND status = 'OPEN';

ALTER TABLE public.trades DROP COLUMN IF EXISTS exit_date;
ALTER TABLE public.trades DROP COLUMN IF EXISTS exit_price;
ALTER TABLE public.trades DROP COLUMN IF EXISTS realized_pnl;
ALTER TABLE public.trades DROP COLUMN IF EXISTS pnl_rate;
