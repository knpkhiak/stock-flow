// KIS (한국투자증권) OpenAPI 프록시
// actions: test | balance | executions | sync
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";

const APP_KEY = (Deno.env.get("KIS_APP_KEY") ?? "").trim();
const APP_SECRET = (Deno.env.get("KIS_APP_SECRET") ?? "").trim();
const CANO = (Deno.env.get("KIS_CANO") ?? "").trim();
const ACNT_PRDT_CD = (Deno.env.get("KIS_ACNT_PRDT_CD") ?? "01").trim();

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const REAL_BASE = "https://openapi.koreainvestment.com:9443";
const PAPER_BASE = "https://openapivts.koreainvestment.com:29443";

let memToken: { token: string; expires_at: number; env: string } | null = null;
const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function mask(value: string, keep = 4) {
  if (!value) return "(empty)";
  if (value.length <= keep * 2) return `${value.slice(0, keep)}...`;
  return `${value.slice(0, keep)}...${value.slice(-keep)}`;
}

async function getToken(env: "real" | "paper"): Promise<string> {
  const now = Date.now();
  // 1) memory cache (warm instance)
  if (memToken && memToken.env === env && now < memToken.expires_at - 60_000) {
    return memToken.token;
  }
  // 2) DB cache (shared across cold starts)
  const { data: row } = await adminClient
    .from("kis_token_cache")
    .select("access_token, expires_at")
    .eq("env", env)
    .maybeSingle();
  if (row) {
    const exp = new Date(row.expires_at).getTime();
    if (now < exp - 60_000) {
      memToken = { token: row.access_token, expires_at: exp, env };
      return row.access_token;
    }
  }
  // 3) issue new token from KIS
  const base = env === "paper" ? PAPER_BASE : REAL_BASE;
  const res = await fetch(`${base}/oauth2/tokenP`, {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=UTF-8" },
    body: JSON.stringify({
      grant_type: "client_credentials",
      appkey: APP_KEY,
      appsecret: APP_SECRET,
    }),
  });
  const data = await res.json();
  if (!res.ok || !data.access_token) {
    console.error("kis token failed", {
      env,
      appKeyPreview: mask(APP_KEY),
      appSecretLength: APP_SECRET.length,
      canoPreview: mask(CANO),
      response: data,
    });
    // If rate-limited but we have any (even soon-expiring) DB token, fall back to it
    if (row?.access_token) {
      console.warn("kis token rate-limited; falling back to existing DB token");
      const exp = new Date(row.expires_at).getTime();
      memToken = { token: row.access_token, expires_at: exp, env };
      return row.access_token;
    }
    throw new Error(`token issue failed: ${JSON.stringify(data)}`);
  }
  const expiresAtMs = now + (Number(data.expires_in) || 86400) * 1000;
  memToken = { token: data.access_token, expires_at: expiresAtMs, env };
  await adminClient
    .from("kis_token_cache")
    .upsert({
      env,
      access_token: data.access_token,
      expires_at: new Date(expiresAtMs).toISOString(),
      updated_at: new Date().toISOString(),
    });
  return data.access_token;
}

async function inquireBalance(env: "real" | "paper") {
  const base = env === "paper" ? PAPER_BASE : REAL_BASE;
  const trId = env === "paper" ? "VTTC8434R" : "TTTC8434R";
  const token = await getToken(env);
  const params = new URLSearchParams({
    CANO,
    ACNT_PRDT_CD,
    AFHR_FLPR_YN: "N",
    OFL_YN: "",
    INQR_DVSN: "02",
    UNPR_DVSN: "01",
    FUND_STTL_ICLD_YN: "N",
    FNCG_AMT_AUTO_RDPT_YN: "N",
    PRCS_DVSN: "01",
    CTX_AREA_FK100: "",
    CTX_AREA_NK100: "",
  });
  const res = await fetch(`${base}/uapi/domestic-stock/v1/trading/inquire-balance?${params}`, {
    headers: {
      "Content-Type": "application/json",
      authorization: `Bearer ${token}`,
      appkey: APP_KEY,
      appsecret: APP_SECRET,
      tr_id: trId,
    },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`balance failed: ${JSON.stringify(data)}`);
  return data;
}

interface KisExecution {
  ord_dt: string;       // 주문일자 YYYYMMDD
  ord_tmd: string;      // 주문시각 HHMMSS
  odno: string;         // 주문번호
  pdno: string;         // 종목코드
  prdt_name: string;    // 종목명
  sll_buy_dvsn_cd: string; // 01=매도, 02=매수
  tot_ccld_qty: string; // 체결수량
  avg_prvs: string;     // 평균가 (체결단가) - field name varies, use ccld_unpr if present
  ccld_unpr?: string;
  tot_ccld_amt?: string;
}

// 국내 주식 현재가 조회. 장 외 시간엔 KIS가 마지막 정규장 종가 반환.
async function inquirePrice(env: "real" | "paper", ticker: string) {
  const base = env === "paper" ? PAPER_BASE : REAL_BASE;
  const trId = "FHKST01010100"; // 주식현재가 시세 (실전·모의 동일)
  const token = await getToken(env);
  const params = new URLSearchParams({
    FID_COND_MRKT_DIV_CODE: "J",
    FID_INPUT_ISCD: ticker,
  });
  const res = await fetch(
    `${base}/uapi/domestic-stock/v1/quotations/inquire-price?${params}`,
    {
      headers: {
        "Content-Type": "application/json",
        authorization: `Bearer ${token}`,
        appkey: APP_KEY,
        appsecret: APP_SECRET,
        tr_id: trId,
      },
    },
  );
  const data = await res.json();
  if (!res.ok) throw new Error(`price failed: ${JSON.stringify(data)}`);
  return data;
}

// 해외 주식 현재가 조회. EXCD: NAS, NYS, AMS, HKS, TSE, SHS, SZS 등
async function inquireOverseasPrice(env: "real" | "paper", excd: string, ticker: string) {
  const base = env === "paper" ? PAPER_BASE : REAL_BASE;
  const trId = "HHDFS00000300";
  const token = await getToken(env);
  const params = new URLSearchParams({
    AUTH: "",
    EXCD: excd,
    SYMB: ticker,
  });
  const res = await fetch(
    `${base}/uapi/overseas-price/v1/quotations/price?${params}`,
    {
      headers: {
        "Content-Type": "application/json",
        authorization: `Bearer ${token}`,
        appkey: APP_KEY,
        appsecret: APP_SECRET,
        tr_id: trId,
      },
    },
  );
  const data = await res.json();
  if (!res.ok) throw new Error(`overseas price failed: ${JSON.stringify(data)}`);
  return data;
}

// 국내 상품기본조회 - 종목명/표준상품정보 (실전 전용)
async function searchStockInfo(env: "real" | "paper", ticker: string) {
  const base = env === "paper" ? PAPER_BASE : REAL_BASE;
  const trId = "CTPF1002R";
  const token = await getToken(env);
  const params = new URLSearchParams({
    PRDT_TYPE_CD: "300", // 주식
    PDNO: ticker,
  });
  const res = await fetch(
    `${base}/uapi/domestic-stock/v1/quotations/search-stock-info?${params}`,
    {
      headers: {
        "Content-Type": "application/json",
        authorization: `Bearer ${token}`,
        appkey: APP_KEY,
        appsecret: APP_SECRET,
        tr_id: trId,
        custtype: "P",
      },
    },
  );
  const data = await res.json();
  if (!res.ok) throw new Error(`stock_info failed: ${JSON.stringify(data)}`);
  return data;
}

async function inquireExecutions(env: "real" | "paper", fromDate: string, toDate: string) {
  const base = env === "paper" ? PAPER_BASE : REAL_BASE;
  const trId = env === "paper" ? "VTTC8001R" : "TTTC8001R";
  const token = await getToken(env);
  const params = new URLSearchParams({
    CANO,
    ACNT_PRDT_CD,
    INQR_STRT_DT: fromDate,
    INQR_END_DT: toDate,
    SLL_BUY_DVSN_CD: "00",
    INQR_DVSN: "00",
    PDNO: "",
    CCLD_DVSN: "01",
    ORD_GNO_BRNO: "",
    ODNO: "",
    INQR_DVSN_3: "00",
    INQR_DVSN_1: "",
    CTX_AREA_FK100: "",
    CTX_AREA_NK100: "",
  });
  const res = await fetch(`${base}/uapi/domestic-stock/v1/trading/inquire-daily-ccld?${params}`, {
    headers: {
      "Content-Type": "application/json",
      authorization: `Bearer ${token}`,
      appkey: APP_KEY,
      appsecret: APP_SECRET,
      tr_id: trId,
    },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`executions failed: ${JSON.stringify(data)}`);
  return data;
}

// YYYYMMDD + HHMMSS → ms timestamp (KST)
function execTimestamp(ord_dt: string, ord_tmd: string): number {
  const y = Number(ord_dt.slice(0, 4));
  const mo = Number(ord_dt.slice(4, 6)) - 1;
  const d = Number(ord_dt.slice(6, 8));
  const hh = Number((ord_tmd ?? "000000").slice(0, 2));
  const mm = Number((ord_tmd ?? "000000").slice(2, 4));
  const ss = Number((ord_tmd ?? "000000").slice(4, 6));
  // KST = UTC+9
  return Date.UTC(y, mo, d, hh - 9, mm, ss);
}

// YYYYMMDD → YYYY-MM-DD
function isoDate(ord_dt: string): string {
  return `${ord_dt.slice(0, 4)}-${ord_dt.slice(4, 6)}-${ord_dt.slice(6, 8)}`;
}

function daysBetween(fromIso: string, toIso: string): number {
  const a = new Date(fromIso).getTime();
  const b = new Date(toIso).getTime();
  return Math.max(0, Math.round((b - a) / 86400000));
}

interface SyncResult {
  considered: number;
  skipped_before_cutoff: number;
  inserted_buys: number;
  inserted_closes: number;
  new_trades: number;
  closed_trades: number;
  duplicates: number;
  errors: string[];
  last_sync_at: string;
}

async function runSync(env: "real" | "paper", lookbackDays: number, userId: string): Promise<SyncResult> {
  const supa = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
  const result: SyncResult = {
    considered: 0,
    skipped_before_cutoff: 0,
    inserted_buys: 0,
    inserted_closes: 0,
    new_trades: 0,
    closed_trades: 0,
    duplicates: 0,
    errors: [],
    last_sync_at: new Date().toISOString(),
  };

  // 1) cutoff = last_sync_at for THIS user (or epoch if none)
  const { data: logRows } = await supa
    .from("kis_sync_log")
    .select("id, last_sync_at")
    .eq("user_id", userId)
    .order("last_sync_at", { ascending: false })
    .limit(1);
  const lastSyncAt = logRows?.[0]?.last_sync_at ? new Date(logRows[0].last_sync_at).getTime() : 0;

  // 2) fetch executions for window
  const today = new Date();
  const yyyymmdd = (d: Date) =>
    `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  const from = new Date(today);
  from.setDate(today.getDate() - Math.max(1, lookbackDays));
  const raw = await inquireExecutions(env, yyyymmdd(from), yyyymmdd(today));
  const list: KisExecution[] = (raw as { output1?: KisExecution[] }).output1 ?? [];

  // 3) sort oldest → newest so weighted-avg recomputes in real order
  const sorted = [...list].sort(
    (a, b) => execTimestamp(a.ord_dt, a.ord_tmd) - execTimestamp(b.ord_dt, b.ord_tmd),
  );
  result.considered = sorted.length;

  for (const e of sorted) {
    const ts = execTimestamp(e.ord_dt, e.ord_tmd);
    if (ts <= lastSyncAt) {
      result.skipped_before_cutoff++;
      continue;
    }
    const qty = Number(e.tot_ccld_qty ?? 0);
    const priceStr = e.ccld_unpr ?? e.avg_prvs ?? "0";
    const price = Number(priceStr);
    if (!qty || !price || !e.pdno) continue;

    const tradeDate = isoDate(e.ord_dt);
    const orderId = e.odno;

    if (e.sll_buy_dvsn_cd === "02") {
      // === BUY ===
      // Dedupe via unique kis_order_id on trade_buys
      const { data: existingBuy } = await supa
        .from("trade_buys")
        .select("id")
        .eq("kis_order_id", orderId)
        .maybeSingle();
      if (existingBuy) {
        result.duplicates++;
        continue;
      }

      // Find currently-open trade for this ticker (this user)
      const { data: openTrades } = await supa
        .from("trades")
        .select("id, total_quantity, remaining_quantity, entry_price, entry_date, status")
        .eq("user_id", userId)
        .eq("ticker", e.pdno)
        .in("status", ["OPEN", "PARTIAL"])
        .order("created_at", { ascending: true })
        .limit(1);
      const openTrade = openTrades?.[0];

      if (!openTrade) {
        // New trade
        const { data: newTrade, error: tErr } = await supa
          .from("trades")
          .insert({
            user_id: userId,
            ticker: e.pdno,
            name: e.prdt_name ?? e.pdno,
            market: "국내",
            status: "OPEN",
            entry_date: tradeDate,
            entry_price: price,
            total_quantity: qty,
            remaining_quantity: qty,
            source: "kis_auto",
            kis_order_id: orderId,
          })
          .select("id")
          .single();
        if (tErr || !newTrade) {
          result.errors.push(`trade insert ${orderId}: ${tErr?.message}`);
          continue;
        }
        const { error: bErr } = await supa.from("trade_buys").insert({
          user_id: userId,
          trade_id: newTrade.id,
          buy_date: tradeDate,
          buy_price: price,
          buy_quantity: qty,
          buy_amount: price * qty,
          cumulative_avg_price: price,
          kis_order_id: orderId,
          source: "kis_auto",
        });
        if (bErr) {
          result.errors.push(`buy insert ${orderId}: ${bErr.message}`);
          continue;
        }
        result.new_trades++;
        result.inserted_buys++;
      } else {
        // Additional buy → recompute weighted average
        const oldQty = Number(openTrade.total_quantity);
        const oldAvg = Number(openTrade.entry_price);
        const newQty = oldQty + qty;
        const newAvg = (oldAvg * oldQty + price * qty) / newQty;

        const { error: bErr } = await supa.from("trade_buys").insert({
          user_id: userId,
          trade_id: openTrade.id,
          buy_date: tradeDate,
          buy_price: price,
          buy_quantity: qty,
          buy_amount: price * qty,
          cumulative_avg_price: newAvg,
          kis_order_id: orderId,
          source: "kis_auto",
        });
        if (bErr) {
          result.errors.push(`buy insert ${orderId}: ${bErr.message}`);
          continue;
        }
        const { error: uErr } = await supa
          .from("trades")
          .update({
            entry_price: newAvg,
            total_quantity: newQty,
            remaining_quantity: Number(openTrade.remaining_quantity) + qty,
            // keep original entry_date / status
          })
          .eq("id", openTrade.id);
        if (uErr) {
          result.errors.push(`trade update ${orderId}: ${uErr.message}`);
          continue;
        }
        result.inserted_buys++;
      }
    } else if (e.sll_buy_dvsn_cd === "01") {
      // === SELL ===
      const { data: existingClose } = await supa
        .from("trade_closes")
        .select("id")
        .eq("kis_order_id", orderId)
        .maybeSingle();
      if (existingClose) {
        result.duplicates++;
        continue;
      }

      const { data: openTrades } = await supa
        .from("trades")
        .select("id, entry_price, entry_date, remaining_quantity, total_realized_pnl, status")
        .eq("user_id", userId)
        .eq("ticker", e.pdno)
        .in("status", ["OPEN", "PARTIAL"])
        .order("created_at", { ascending: true })
        .limit(1);
      const openTrade = openTrades?.[0];
      if (!openTrade) {
        result.errors.push(`sell ${orderId}: no open trade for ${e.pdno}`);
        continue;
      }
      const avg = Number(openTrade.entry_price);
      const realized = (price - avg) * qty;
      const pnlRate = avg > 0 ? ((price - avg) / avg) * 100 : 0;
      const holdingDays = daysBetween(openTrade.entry_date as string, tradeDate);

      const { error: cErr } = await supa.from("trade_closes").insert({
        user_id: userId,
        trade_id: openTrade.id,
        close_date: tradeDate,
        close_price: price,
        close_quantity: qty,
        realized_pnl: realized,
        pnl_rate: pnlRate,
        holding_days: holdingDays,
        kis_order_id: orderId,
        source: "kis_auto",
      });
      if (cErr) {
        result.errors.push(`close insert ${orderId}: ${cErr.message}`);
        continue;
      }

      const newRemaining = Number(openTrade.remaining_quantity) - qty;
      const newRealizedTotal = Number(openTrade.total_realized_pnl ?? 0) + realized;
      const fullyClosed = newRemaining <= 0.0000001;
      const { error: uErr } = await supa
        .from("trades")
        .update({
          remaining_quantity: Math.max(0, newRemaining),
          total_realized_pnl: newRealizedTotal,
          status: fullyClosed ? "CLOSED" : "PARTIAL",
        })
        .eq("id", openTrade.id);
      if (uErr) {
        result.errors.push(`trade update ${orderId}: ${uErr.message}`);
        continue;
      }
      result.inserted_closes++;
      if (fullyClosed) result.closed_trades++;
    }
  }

  // 4) advance kis_sync_log cursor (per-user)
  const nowIso = new Date().toISOString();
  if (logRows && logRows.length > 0) {
    await supa
      .from("kis_sync_log")
      .update({ last_sync_at: nowIso })
      .eq("id", logRows[0].id);
  } else {
    await supa.from("kis_sync_log").insert({ user_id: userId, last_sync_at: nowIso });
  }
  result.last_sync_at = nowIso;
  return result;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    if (!APP_KEY || !APP_SECRET || !CANO) {
      return new Response(
        JSON.stringify({ error: "KIS 시크릿이 설정되지 않았습니다 (KIS_APP_KEY / KIS_APP_SECRET / KIS_CANO)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // === Authenticate caller via JWT ===
    const authHeader = req.headers.get("Authorization") ?? "";
    const jwt = authHeader.replace(/^Bearer\s+/i, "").trim();
    if (!jwt) {
      return new Response(JSON.stringify({ error: "Unauthorized: missing token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: userData, error: userErr } = await adminClient.auth.getUser(jwt);
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized: invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = userData.user.id;

    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const action = body.action ?? new URL(req.url).searchParams.get("action") ?? "test";
    const env: "real" | "paper" = body.env === "paper" ? "paper" : "real";

    let payload: unknown;
    if (action === "test") {
      const token = await getToken(env);
      payload = { ok: true, token_preview: `${token.slice(0, 8)}...`, env };
    } else if (action === "balance") {
      payload = await inquireBalance(env);
    } else if (action === "executions") {
      const today = new Date();
      const yyyymmdd = (d: Date) =>
        `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
      const def_from = new Date(today);
      def_from.setDate(today.getDate() - 30);
      const fromDate = body.from ?? yyyymmdd(def_from);
      const toDate = body.to ?? yyyymmdd(today);
      payload = await inquireExecutions(env, fromDate, toDate);
    } else if (action === "sync") {
      const lookback = Math.max(1, Math.min(90, Number(body.lookback_days ?? 30)));
      payload = await runSync(env, lookback, userId);
    } else if (action === "price") {
      const ticker = String(body.ticker ?? "").trim();
      if (!ticker) {
        return new Response(JSON.stringify({ error: "ticker is required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      payload = await inquirePrice(env, ticker);
    } else if (action === "price_overseas") {
      const ticker = String(body.ticker ?? "").trim().toUpperCase();
      const excd = String(body.excd ?? "").trim().toUpperCase();
      if (!ticker || !excd) {
        return new Response(JSON.stringify({ error: "ticker and excd are required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      payload = await inquireOverseasPrice(env, excd, ticker);
    } else {
      return new Response(JSON.stringify({ error: `unknown action: ${action}` }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify(payload), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("kis-proxy error:", msg);
    // KIS rate-limit (EGW00201) → return 200 with error so frontend doesn't crash.
    const isRateLimit = /EGW00201|초당 거래건수/.test(msg);
    return new Response(
      JSON.stringify({ error: msg, rate_limited: isRateLimit }),
      {
        status: isRateLimit ? 200 : 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
