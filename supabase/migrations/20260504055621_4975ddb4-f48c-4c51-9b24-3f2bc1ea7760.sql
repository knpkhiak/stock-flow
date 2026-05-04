
-- asset_snapshots: source column
ALTER TABLE public.asset_snapshots ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'manual';
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'asset_snapshots_snapshot_date_key') THEN
    BEGIN
      ALTER TABLE public.asset_snapshots ADD CONSTRAINT asset_snapshots_snapshot_date_key UNIQUE (snapshot_date);
    EXCEPTION WHEN duplicate_table THEN NULL; WHEN unique_violation THEN NULL; END;
  END IF;
END $$;

-- trades: kis fields
ALTER TABLE public.trades ADD COLUMN IF NOT EXISTS kis_order_id text;
ALTER TABLE public.trades ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'manual';
CREATE UNIQUE INDEX IF NOT EXISTS trades_kis_order_id_key ON public.trades(kis_order_id) WHERE kis_order_id IS NOT NULL;

-- trade_closes: kis fields
ALTER TABLE public.trade_closes ADD COLUMN IF NOT EXISTS kis_order_id text;
ALTER TABLE public.trade_closes ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'manual';
CREATE UNIQUE INDEX IF NOT EXISTS trade_closes_kis_order_id_key ON public.trade_closes(kis_order_id) WHERE kis_order_id IS NOT NULL;

-- longterm_holdings
CREATE TABLE IF NOT EXISTS public.longterm_holdings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticker text NOT NULL,
  name text NOT NULL,
  market text NOT NULL,
  avg_entry_price numeric NOT NULL DEFAULT 0,
  total_quantity numeric NOT NULL DEFAULT 0,
  remaining_quantity numeric NOT NULL DEFAULT 0,
  first_buy_date date NOT NULL,
  memo text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.longterm_holdings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can view longterm_holdings" ON public.longterm_holdings;
DROP POLICY IF EXISTS "Anyone can insert longterm_holdings" ON public.longterm_holdings;
DROP POLICY IF EXISTS "Anyone can update longterm_holdings" ON public.longterm_holdings;
DROP POLICY IF EXISTS "Anyone can delete longterm_holdings" ON public.longterm_holdings;
CREATE POLICY "Anyone can view longterm_holdings" ON public.longterm_holdings FOR SELECT USING (true);
CREATE POLICY "Anyone can insert longterm_holdings" ON public.longterm_holdings FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update longterm_holdings" ON public.longterm_holdings FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete longterm_holdings" ON public.longterm_holdings FOR DELETE USING (true);

-- longterm_buys
CREATE TABLE IF NOT EXISTS public.longterm_buys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  holding_id uuid NOT NULL REFERENCES public.longterm_holdings(id) ON DELETE CASCADE,
  buy_date date NOT NULL,
  buy_price numeric NOT NULL,
  buy_quantity numeric NOT NULL,
  memo text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.longterm_buys ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can view longterm_buys" ON public.longterm_buys;
DROP POLICY IF EXISTS "Anyone can insert longterm_buys" ON public.longterm_buys;
DROP POLICY IF EXISTS "Anyone can update longterm_buys" ON public.longterm_buys;
DROP POLICY IF EXISTS "Anyone can delete longterm_buys" ON public.longterm_buys;
CREATE POLICY "Anyone can view longterm_buys" ON public.longterm_buys FOR SELECT USING (true);
CREATE POLICY "Anyone can insert longterm_buys" ON public.longterm_buys FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update longterm_buys" ON public.longterm_buys FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete longterm_buys" ON public.longterm_buys FOR DELETE USING (true);

-- longterm_sells
CREATE TABLE IF NOT EXISTS public.longterm_sells (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  holding_id uuid NOT NULL REFERENCES public.longterm_holdings(id) ON DELETE CASCADE,
  sell_date date NOT NULL,
  sell_price numeric NOT NULL,
  sell_quantity numeric NOT NULL,
  realized_pnl numeric NOT NULL DEFAULT 0,
  pnl_rate numeric NOT NULL DEFAULT 0,
  memo text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.longterm_sells ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can view longterm_sells" ON public.longterm_sells;
DROP POLICY IF EXISTS "Anyone can insert longterm_sells" ON public.longterm_sells;
DROP POLICY IF EXISTS "Anyone can update longterm_sells" ON public.longterm_sells;
DROP POLICY IF EXISTS "Anyone can delete longterm_sells" ON public.longterm_sells;
CREATE POLICY "Anyone can view longterm_sells" ON public.longterm_sells FOR SELECT USING (true);
CREATE POLICY "Anyone can insert longterm_sells" ON public.longterm_sells FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update longterm_sells" ON public.longterm_sells FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete longterm_sells" ON public.longterm_sells FOR DELETE USING (true);

-- cash_transactions
CREATE TABLE IF NOT EXISTS public.cash_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_date date NOT NULL,
  type text NOT NULL,
  amount numeric NOT NULL,
  balance_after numeric NOT NULL,
  memo text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.cash_transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can view cash_transactions" ON public.cash_transactions;
DROP POLICY IF EXISTS "Anyone can insert cash_transactions" ON public.cash_transactions;
DROP POLICY IF EXISTS "Anyone can update cash_transactions" ON public.cash_transactions;
DROP POLICY IF EXISTS "Anyone can delete cash_transactions" ON public.cash_transactions;
CREATE POLICY "Anyone can view cash_transactions" ON public.cash_transactions FOR SELECT USING (true);
CREATE POLICY "Anyone can insert cash_transactions" ON public.cash_transactions FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update cash_transactions" ON public.cash_transactions FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete cash_transactions" ON public.cash_transactions FOR DELETE USING (true);

-- kis_sync_log
CREATE TABLE IF NOT EXISTS public.kis_sync_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  last_sync_at timestamptz NOT NULL DEFAULT now(),
  last_processed_order_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.kis_sync_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can view kis_sync_log" ON public.kis_sync_log;
DROP POLICY IF EXISTS "Anyone can insert kis_sync_log" ON public.kis_sync_log;
DROP POLICY IF EXISTS "Anyone can update kis_sync_log" ON public.kis_sync_log;
DROP POLICY IF EXISTS "Anyone can delete kis_sync_log" ON public.kis_sync_log;
CREATE POLICY "Anyone can view kis_sync_log" ON public.kis_sync_log FOR SELECT USING (true);
CREATE POLICY "Anyone can insert kis_sync_log" ON public.kis_sync_log FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update kis_sync_log" ON public.kis_sync_log FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete kis_sync_log" ON public.kis_sync_log FOR DELETE USING (true);
