// Monthly auto-snapshot helper.
// Creates an asset_snapshot row with source='auto' once per calendar month.
// Idempotent: if a snapshot already exists for the current YYYY-MM (any source), skip.
import { supabase } from "@/integrations/supabase/client";

export interface AutoSnapshotInput {
  userId: string;
  trading: number;
  longterm: number;
  cash: number;
}

const KEY = "stock-flow-last-auto-snapshot-month";

function currentMonthKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export async function maybeCreateMonthlySnapshot(i: AutoSnapshotInput): Promise<boolean> {
  const month = currentMonthKey();
  if (localStorage.getItem(KEY) === month) return false;

  // Check DB: any snapshot in this calendar month?
  const monthStart = `${month}-01`;
  const { data: existing } = await supabase
    .from("asset_snapshots")
    .select("id")
    .gte("snapshot_date", monthStart)
    .limit(1)
    .maybeSingle();
  if (existing) {
    localStorage.setItem(KEY, month);
    return false;
  }

  const today = new Date().toISOString().slice(0, 10);
  const total = i.trading + i.longterm + i.cash;
  const { error } = await supabase.from("asset_snapshots").insert({
    user_id: i.userId,
    snapshot_date: today,
    trading_balance: i.trading,
    longterm_balance: i.longterm,
    cash_balance: i.cash,
    total_balance: total,
    source: "auto",
    memo: "월별 자동 스냅샷",
  });
  if (error) {
    console.error("auto snapshot failed:", error.message);
    return false;
  }
  localStorage.setItem(KEY, month);
  return true;
}
