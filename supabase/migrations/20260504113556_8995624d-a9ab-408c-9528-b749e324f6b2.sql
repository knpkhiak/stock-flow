-- trade_buys: 단기 매매 분할 매수 회차 기록
CREATE TABLE public.trade_buys (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  trade_id UUID NOT NULL REFERENCES public.trades(id) ON DELETE CASCADE,
  buy_date DATE NOT NULL,
  buy_price NUMERIC NOT NULL,
  buy_quantity NUMERIC NOT NULL,
  buy_amount NUMERIC NOT NULL,
  cumulative_avg_price NUMERIC NOT NULL,
  kis_order_id TEXT,
  source TEXT NOT NULL DEFAULT 'manual',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_trade_buys_trade_id ON public.trade_buys(trade_id);
CREATE UNIQUE INDEX idx_trade_buys_kis_order_id
  ON public.trade_buys(kis_order_id)
  WHERE kis_order_id IS NOT NULL;

ALTER TABLE public.trade_buys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view trade_buys"
  ON public.trade_buys FOR SELECT USING (true);
CREATE POLICY "Anyone can insert trade_buys"
  ON public.trade_buys FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update trade_buys"
  ON public.trade_buys FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete trade_buys"
  ON public.trade_buys FOR DELETE USING (true);