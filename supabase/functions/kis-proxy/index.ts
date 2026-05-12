// KIS (한국투자증권) OpenAPI 프록시 — 사용자별 API 키 격리 버전
// actions: test | balance | executions | sync | price | price_overseas | stock_info | stock_info_overseas
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const REAL_BASE = "https://openapi.koreainvestment.com:9443";
const PAPER_BASE = "https://openapivts.koreainvestment.com:29443";

const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

interface UserKeys {
  app_key: string;
  app_secret: string;
  cano: string;
  acnt_prdt_cd: string;
  account_type: "REAL" | "VIRTUAL";
  last_token: string | null;
  token_expires_at: string | null;
}

async function loadUserKeys(userId: string): Promise<UserKeys | null> {
  const { data } = await adminClient
    .from("api_settings")
    .select("kis_app_key, kis_app_secret, kis_account_number, kis_account_type, last_token, token_expires_at")
    .eq("user_id", userId)
    .maybeSingle();
  if (!data?.kis_app_key || !data?.kis_app_secret || !data?.kis_account_number) return null;
  // KIS 계좌번호: "12345678-01" 또는 "1234567801" 형태 → CANO(8) + ACNT_PRDT_CD(2) 분리
  const raw = String(data.kis_account_number).replace(/[^0-9]/g, "");
  const cano = raw.length >= 10 ? raw.slice(0, 8) : raw;
  const prdt = raw.length >= 10 ? raw.slice(8, 10) : "01";
  return {
    app_key: data.kis_app_key.trim(),
    app_secret: data.kis_app_secret.trim(),
    cano,
    acnt_prdt_cd: prdt,
    account_type: (data.kis_account_type as "REAL" | "VIRTUAL") ?? "REAL",
    last_token: data.last_token,
    token_expires_at: data.token_expires_at,
  };
}

async function getToken(userId: string, keys: UserKeys, env: "real" | "paper"): Promise<string> {
  const now = Date.now();
  if (keys.last_token && keys.token_expires_at) {
    const exp = new Date(keys.token_expires_at).getTime();
    if (now < exp - 60_000) return keys.last_token;
  }
  const base = env === "paper" ? PAPER_BASE : REAL_BASE;
  const res = await fetch(`${base}/oauth2/tokenP`, {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=UTF-8" },
    body: JSON.stringify({
      grant_type: "client_credentials",
      appkey: keys.app_key,
      appsecret: keys.app_secret,
    }),
  });
  const data = await res.json();
  if (!res.ok || !data.access_token) {
    if (keys.last_token) {
      console.warn("kis token issue failed; falling back to existing token", { user: userId });
      return keys.last_token;
    }
    throw new Error(`token issue failed: ${JSON.stringify(data)}`);
  }
  const expiresAtMs = now + (Number(data.expires_in) || 86400) * 1000;
  await adminClient.from("api_settings").update({
    last_token: data.access_token,
    token_expires_at: new Date(expiresAtMs).toISOString(),
    is_connected: true,
    last_connected_at: new Date().toISOString(),
  }).eq("user_id", userId);
  keys.last_token = data.access_token;
  keys.token_expires_at = new Date(expiresAtMs).toISOString();
  return data.access_token;
}

async function inquireBalance(userId: string, keys: UserKeys, env: "real" | "paper") {
  const base = env === "paper" ? PAPER_BASE : REAL_BASE;
  const trId = env === "paper" ? "VTTC8434R" : "TTTC8434R";
  const token = await getToken(userId, keys, env);
  const params = new URLSearchParams({
    CANO: keys.cano,
    ACNT_PRDT_CD: keys.acnt_prdt_cd,
    AFHR_FLPR_YN: "N", OFL_YN: "", INQR_DVSN: "02", UNPR_DVSN: "01",
    FUND_STTL_ICLD_YN: "N", FNCG_AMT_AUTO_RDPT_YN: "N", PRCS_DVSN: "01",
    CTX_AREA_FK100: "", CTX_AREA_NK100: "",
  });
  const res = await fetch(`${base}/uapi/domestic-stock/v1/trading/inquire-balance?${params}`, {
    headers: {
      "Content-Type": "application/json",
      authorization: `Bearer ${token}`,
      appkey: keys.app_key, appsecret: keys.app_secret, tr_id: trId,
    },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`balance failed: ${JSON.stringify(data)}`);
  return data;
}

interface KisExecution {
  ord_dt: string; ord_tmd: string; odno: string; pdno: string; prdt_name: string;
  sll_buy_dvsn_cd: string; tot_ccld_qty: string; avg_prvs: string;
  ccld_unpr?: string; tot_ccld_amt?: string;
}

async function inquirePrice(userId: string, keys: UserKeys, env: "real" | "paper", ticker: string) {
  const base = env === "paper" ? PAPER_BASE : REAL_BASE;
  const token = await getToken(userId, keys, env);
  const params = new URLSearchParams({ FID_COND_MRKT_DIV_CODE: "J", FID_INPUT_ISCD: ticker });
  const res = await fetch(`${base}/uapi/domestic-stock/v1/quotations/inquire-price?${params}`, {
    headers: {
      "Content-Type": "application/json", authorization: `Bearer ${token}`,
      appkey: keys.app_key, appsecret: keys.app_secret, tr_id: "FHKST01010100",
    },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`price failed: ${JSON.stringify(data)}`);
  return data;
}

async function inquireOverseasPrice(userId: string, keys: UserKeys, env: "real" | "paper", excd: string, ticker: string) {
  const base = env === "paper" ? PAPER_BASE : REAL_BASE;
  const token = await getToken(userId, keys, env);
  const params = new URLSearchParams({ AUTH: "", EXCD: excd, SYMB: ticker });
  const res = await fetch(`${base}/uapi/overseas-price/v1/quotations/price?${params}`, {
    headers: {
      "Content-Type": "application/json", authorization: `Bearer ${token}`,
      appkey: keys.app_key, appsecret: keys.app_secret, tr_id: "HHDFS00000300",
    },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`overseas price failed: ${JSON.stringify(data)}`);
  return data;
}

async function searchStockInfo(userId: string, keys: UserKeys, env: "real" | "paper", ticker: string) {
  const base = env === "paper" ? PAPER_BASE : REAL_BASE;
  const token = await getToken(userId, keys, env);
  const params = new URLSearchParams({ PRDT_TYPE_CD: "300", PDNO: ticker });
  const res = await fetch(`${base}/uapi/domestic-stock/v1/quotations/search-stock-info?${params}`, {
    headers: {
      "Content-Type": "application/json", authorization: `Bearer ${token}`,
      appkey: keys.app_key, appsecret: keys.app_secret, tr_id: "CTPF1002R", custtype: "P",
    },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`stock_info failed: ${JSON.stringify(data)}`);
  return data;
}

async function searchOverseasStockInfo(userId: string, keys: UserKeys, env: "real" | "paper", excd: string, ticker: string) {
  const base = env === "paper" ? PAPER_BASE : REAL_BASE;
  const token = await getToken(userId, keys, env);
  const typeMap: Record<string, string> = {
    NAS: "512", NYS: "513", AMS: "529", TSE: "515", HKS: "501",
    SHS: "551", SZS: "552", HNX: "507", HSX: "508",
  };
  const params = new URLSearchParams({ PRDT_TYPE_CD: typeMap[excd] ?? "512", PDNO: ticker });
  const res = await fetch(`${base}/uapi/overseas-price/v1/quotations/search-info?${params}`, {
    headers: {
      "Content-Type": "application/json", authorization: `Bearer ${token}`,
      appkey: keys.app_key, appsecret: keys.app_secret, tr_id: "CTPF1702R", custtype: "P",
    },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`overseas stock_info failed: ${JSON.stringify(data)}`);
  return data;
}

async function inquireExecutions(userId: string, keys: UserKeys, env: "real" | "paper", fromDate: string, toDate: string) {
  const base = env === "paper" ? PAPER_BASE : REAL_BASE;
  const trId = env === "paper" ? "VTTC8001R" : "TTTC8001R";
  const token = await getToken(userId, keys, env);
  const params = new URLSearchParams({
    CANO: keys.cano, ACNT_PRDT_CD: keys.acnt_prdt_cd,
    INQR_STRT_DT: fromDate, INQR_END_DT: toDate,
    SLL_BUY_DVSN_CD: "00", INQR_DVSN: "00", PDNO: "", CCLD_DVSN: "01",
    ORD_GNO_BRNO: "", ODNO: "", INQR_DVSN_3: "00", INQR_DVSN_1: "",
    CTX_AREA_FK100: "", CTX_AREA_NK100: "",
  });
  const res = await fetch(`${base}/uapi/domestic-stock/v1/trading/inquire-daily-ccld?${params}`, {
    headers: {
      "Content-Type": "application/json", authorization: `Bearer ${token}`,
      appkey: keys.app_key, appsecret: keys.app_secret, tr_id: trId,
    },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`executions failed: ${JSON.stringify(data)}`);
  return data;
}

function execTimestamp(ord_dt: string, ord_tmd: string): number {
  const y = Number(ord_dt.slice(0, 4));
  const mo = Number(ord_dt.slice(4, 6)) - 1;
  const d = Number(ord_dt.slice(6, 8));
  const hh = Number((ord_tmd ?? "000000").slice(0, 2));
  const mm = Number((ord_tmd ?? "000000").slice(2, 4));
  const ss = Number((ord_tmd ?? "000000").slice(4, 6));
  return Date.UTC(y, mo, d, hh - 9, mm, ss);
}
function isoDate(ord_dt: string): string {
  return `${ord_dt.slice(0, 4)}-${ord_dt.slice(4, 6)}-${ord_dt.slice(6, 8)}`;
}
function daysBetween(fromIso: string, toIso: string): number {
  const a = new Date(fromIso).getTime();
  const b = new Date(toIso).getTime();
  return Math.max(0, Math.round((b - a) / 86400000));
}

interface SyncResult {
  considered: number; skipped_before_cutoff: number;
  inserted_buys: number; inserted_closes: number;
  new_trades: number; closed_trades: number;
  duplicates: number; errors: string[]; last_sync_at: string;
}

async function runSync(userId: string, keys: UserKeys, env: "real" | "paper", lookbackDays: number): Promise<SyncResult> {
  const supa = adminClient;
  const result: SyncResult = {
    considered: 0, skipped_before_cutoff: 0, inserted_buys: 0, inserted_closes: 0,
    new_trades: 0, closed_trades: 0, duplicates: 0, errors: [],
    last_sync_at: new Date().toISOString(),
  };

  const { data: logRows } = await supa
    .from("kis_sync_log").select("id, last_sync_at")
    .eq("user_id", userId).order("last_sync_at", { ascending: false }).limit(1);
  const lastSyncAt = logRows?.[0]?.last_sync_at ? new Date(logRows[0].last_sync_at).getTime() : 0;

  const today = new Date();
  const yyyymmdd = (d: Date) =>
    `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  const from = new Date(today);
  from.setDate(today.getDate() - Math.max(1, lookbackDays));
  const raw = await inquireExecutions(userId, keys, env, yyyymmdd(from), yyyymmdd(today));
  const list: KisExecution[] = (raw as { output1?: KisExecution[] }).output1 ?? [];
  const sorted = [...list].sort(
    (a, b) => execTimestamp(a.ord_dt, a.ord_tmd) - execTimestamp(b.ord_dt, b.ord_tmd),
  );
  result.considered = sorted.length;

  for (const e of sorted) {
    const ts = execTimestamp(e.ord_dt, e.ord_tmd);
    if (ts <= lastSyncAt) { result.skipped_before_cutoff++; continue; }
    const qty = Number(e.tot_ccld_qty ?? 0);
    const priceStr = e.ccld_unpr ?? e.avg_prvs ?? "0";
    const price = Number(priceStr);
    if (!qty || !price || !e.pdno) continue;
    const tradeDate = isoDate(e.ord_dt);
    const orderId = e.odno;

    if (e.sll_buy_dvsn_cd === "02") {
      const { data: existingBuy } = await supa
        .from("trade_buys").select("id").eq("kis_order_id", orderId).maybeSingle();
      if (existingBuy) { result.duplicates++; continue; }
      const { data: openTrades } = await supa
        .from("trades")
        .select("id, total_quantity, remaining_quantity, entry_price, entry_date, status")
        .eq("user_id", userId).eq("ticker", e.pdno)
        .in("status", ["OPEN", "PARTIAL"])
        .order("created_at", { ascending: true }).limit(1);
      const openTrade = openTrades?.[0];
      if (!openTrade) {
        const { data: newTrade, error: tErr } = await supa.from("trades").insert({
          user_id: userId, ticker: e.pdno, name: e.prdt_name ?? e.pdno,
          market: "국내", status: "OPEN", entry_date: tradeDate,
          entry_price: price, total_quantity: qty, remaining_quantity: qty,
          source: "kis_auto", kis_order_id: orderId,
        }).select("id").single();
        if (tErr || !newTrade) { result.errors.push(`trade insert ${orderId}: ${tErr?.message}`); continue; }
        const { error: bErr } = await supa.from("trade_buys").insert({
          user_id: userId, trade_id: newTrade.id, buy_date: tradeDate,
          buy_price: price, buy_quantity: qty, buy_amount: price * qty,
          cumulative_avg_price: price, kis_order_id: orderId, source: "kis_auto",
        });
        if (bErr) { result.errors.push(`buy insert ${orderId}: ${bErr.message}`); continue; }
        result.new_trades++; result.inserted_buys++;
      } else {
        const oldQty = Number(openTrade.total_quantity);
        const oldAvg = Number(openTrade.entry_price);
        const newQty = oldQty + qty;
        const newAvg = (oldAvg * oldQty + price * qty) / newQty;
        const { error: bErr } = await supa.from("trade_buys").insert({
          user_id: userId, trade_id: openTrade.id, buy_date: tradeDate,
          buy_price: price, buy_quantity: qty, buy_amount: price * qty,
          cumulative_avg_price: newAvg, kis_order_id: orderId, source: "kis_auto",
        });
        if (bErr) { result.errors.push(`buy insert ${orderId}: ${bErr.message}`); continue; }
        const { error: uErr } = await supa.from("trades").update({
          entry_price: newAvg, total_quantity: newQty,
          remaining_quantity: Number(openTrade.remaining_quantity) + qty,
        }).eq("id", openTrade.id);
        if (uErr) { result.errors.push(`trade update ${orderId}: ${uErr.message}`); continue; }
        result.inserted_buys++;
      }
    } else if (e.sll_buy_dvsn_cd === "01") {
      const { data: existingClose } = await supa
        .from("trade_closes").select("id").eq("kis_order_id", orderId).maybeSingle();
      if (existingClose) { result.duplicates++; continue; }
      const { data: openTrades } = await supa.from("trades")
        .select("id, entry_price, entry_date, remaining_quantity, total_realized_pnl, status")
        .eq("user_id", userId).eq("ticker", e.pdno)
        .in("status", ["OPEN", "PARTIAL"])
        .order("created_at", { ascending: true }).limit(1);
      const openTrade = openTrades?.[0];
      if (!openTrade) { result.errors.push(`sell ${orderId}: no open trade for ${e.pdno}`); continue; }
      const avg = Number(openTrade.entry_price);
      const realized = (price - avg) * qty;
      const pnlRate = avg > 0 ? ((price - avg) / avg) * 100 : 0;
      const holdingDays = daysBetween(openTrade.entry_date as string, tradeDate);
      const { error: cErr } = await supa.from("trade_closes").insert({
        user_id: userId, trade_id: openTrade.id, close_date: tradeDate,
        close_price: price, close_quantity: qty, realized_pnl: realized,
        pnl_rate: pnlRate, holding_days: holdingDays,
        kis_order_id: orderId, source: "kis_auto",
      });
      if (cErr) { result.errors.push(`close insert ${orderId}: ${cErr.message}`); continue; }
      const newRemaining = Number(openTrade.remaining_quantity) - qty;
      const newRealizedTotal = Number(openTrade.total_realized_pnl ?? 0) + realized;
      const fullyClosed = newRemaining <= 0.0000001;
      const { error: uErr } = await supa.from("trades").update({
        remaining_quantity: Math.max(0, newRemaining),
        total_realized_pnl: newRealizedTotal,
        status: fullyClosed ? "CLOSED" : "PARTIAL",
      }).eq("id", openTrade.id);
      if (uErr) { result.errors.push(`trade update ${orderId}: ${uErr.message}`); continue; }
      result.inserted_closes++;
      if (fullyClosed) result.closed_trades++;
    }
  }

  const nowIso = new Date().toISOString();
  if (logRows && logRows.length > 0) {
    await supa.from("kis_sync_log").update({ last_sync_at: nowIso }).eq("id", logRows[0].id);
  } else {
    await supa.from("kis_sync_log").insert({ user_id: userId, last_sync_at: nowIso });
  }
  result.last_sync_at = nowIso;
  return result;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const jwt = authHeader.replace(/^Bearer\s+/i, "").trim();
    if (!jwt) return json({ error: "Unauthorized: missing token" }, 401);
    const { data: userData, error: userErr } = await adminClient.auth.getUser(jwt);
    if (userErr || !userData?.user) return json({ error: "Unauthorized: invalid token" }, 401);
    const userId = userData.user.id;

    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const action = body.action ?? new URL(req.url).searchParams.get("action") ?? "test";

    const keys = await loadUserKeys(userId);
    if (!keys) {
      return json({
        error: "한투 API 키가 설정되지 않았습니다. 설정 → API 연결에서 본인 키를 입력하세요.",
        code: "API_NOT_CONFIGURED",
      }, 400);
    }
    const env: "real" | "paper" = (body.env === "paper" || keys.account_type === "VIRTUAL") ? "paper" : "real";

    let payload: unknown;
    if (action === "test") {
      const token = await getToken(userId, keys, env);
      payload = { ok: true, token_preview: `${token.slice(0, 8)}...`, env };
    } else if (action === "balance") {
      payload = await inquireBalance(userId, keys, env);
    } else if (action === "executions") {
      const today = new Date();
      const yyyymmdd = (d: Date) =>
        `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
      const def_from = new Date(today);
      def_from.setDate(today.getDate() - 30);
      payload = await inquireExecutions(userId, keys, env, body.from ?? yyyymmdd(def_from), body.to ?? yyyymmdd(today));
    } else if (action === "sync") {
      const lookback = Math.max(1, Math.min(90, Number(body.lookback_days ?? 30)));
      payload = await runSync(userId, keys, env, lookback);
    } else if (action === "price") {
      const ticker = String(body.ticker ?? "").trim();
      if (!ticker) return json({ error: "ticker is required" }, 400);
      payload = await inquirePrice(userId, keys, env, ticker);
    } else if (action === "price_overseas") {
      const ticker = String(body.ticker ?? "").trim().toUpperCase();
      const excd = String(body.excd ?? "").trim().toUpperCase();
      if (!ticker || !excd) return json({ error: "ticker and excd are required" }, 400);
      payload = await inquireOverseasPrice(userId, keys, env, excd, ticker);
    } else if (action === "stock_info") {
      const ticker = String(body.ticker ?? "").trim();
      if (!ticker) return json({ error: "ticker is required" }, 400);
      payload = await searchStockInfo(userId, keys, env, ticker);
    } else if (action === "stock_info_overseas") {
      const ticker = String(body.ticker ?? "").trim().toUpperCase();
      const excd = String(body.excd ?? "").trim().toUpperCase();
      if (!ticker || !excd) return json({ error: "ticker and excd are required" }, 400);
      payload = await searchOverseasStockInfo(userId, keys, env, excd, ticker);
    } else {
      return json({ error: `unknown action: ${action}` }, 400);
    }
    return json(payload);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("kis-proxy error:", msg);
    const isRateLimit = /EGW00201|초당 거래건수/.test(msg);
    return new Response(
      JSON.stringify({ error: msg, rate_limited: isRateLimit }),
      { status: isRateLimit ? 200 : 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
