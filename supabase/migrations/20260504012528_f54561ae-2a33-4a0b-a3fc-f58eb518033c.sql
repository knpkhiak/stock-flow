CREATE TABLE public.asset_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_date date NOT NULL,
  trading_balance numeric NOT NULL DEFAULT 0,
  longterm_balance numeric NOT NULL DEFAULT 0,
  cash_balance numeric NOT NULL DEFAULT 0,
  total_balance numeric NOT NULL DEFAULT 0,
  memo text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.asset_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view asset_snapshots" ON public.asset_snapshots FOR SELECT USING (true);
CREATE POLICY "Anyone can insert asset_snapshots" ON public.asset_snapshots FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update asset_snapshots" ON public.asset_snapshots FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete asset_snapshots" ON public.asset_snapshots FOR DELETE USING (true);

CREATE INDEX idx_asset_snapshots_date ON public.asset_snapshots(snapshot_date DESC);