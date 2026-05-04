-- Create table for partial close events of trades
CREATE TABLE public.trade_closes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  trade_id UUID NOT NULL REFERENCES public.trades(id) ON DELETE CASCADE,
  close_date DATE NOT NULL,
  close_price NUMERIC NOT NULL,
  quantity NUMERIC NOT NULL,
  realized_pnl NUMERIC NOT NULL,
  pnl_rate NUMERIC NOT NULL,
  memo TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_trade_closes_trade_id ON public.trade_closes(trade_id);

ALTER TABLE public.trade_closes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view trade_closes" ON public.trade_closes FOR SELECT USING (true);
CREATE POLICY "Anyone can insert trade_closes" ON public.trade_closes FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update trade_closes" ON public.trade_closes FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete trade_closes" ON public.trade_closes FOR DELETE USING (true);
