export interface LongtermHolding {
  id: string;
  ticker: string;
  name: string;
  market: string;
  avg_entry_price: number;
  total_quantity: number;
  remaining_quantity: number;
  first_buy_date: string;
  memo: string | null;
  created_at: string;
}

export interface LongtermBuy {
  id: string;
  holding_id: string;
  buy_date: string;
  buy_price: number;
  buy_quantity: number;
  memo: string | null;
  created_at: string;
}

export interface LongtermSell {
  id: string;
  holding_id: string;
  sell_date: string;
  sell_price: number;
  sell_quantity: number;
  realized_pnl: number;
  pnl_rate: number;
  memo: string | null;
  created_at: string;
}

export interface CashTransaction {
  id: string;
  transaction_date: string;
  type: string; // 'deposit' | 'withdraw'
  amount: number;
  balance_after: number;
  memo: string | null;
  created_at: string;
}
