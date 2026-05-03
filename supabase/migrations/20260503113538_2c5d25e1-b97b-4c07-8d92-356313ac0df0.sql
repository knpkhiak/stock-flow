CREATE TABLE public.trades (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticker TEXT NOT NULL,
  name TEXT NOT NULL,
  market TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'OPEN',
  entry_date DATE NOT NULL,
  entry_price NUMERIC NOT NULL,
  quantity NUMERIC NOT NULL,
  exit_date DATE,
  exit_price NUMERIC,
  realized_pnl NUMERIC,
  pnl_rate NUMERIC,
  memo TEXT,
  idea_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.trades ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view trades" ON public.trades FOR SELECT USING (true);
CREATE POLICY "Anyone can insert trades" ON public.trades FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update trades" ON public.trades FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete trades" ON public.trades FOR DELETE USING (true);