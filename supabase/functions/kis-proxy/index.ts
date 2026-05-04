// KIS (한국투자증권) OpenAPI 프록시
// actions: test | balance | executions
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";

const APP_KEY = Deno.env.get("KIS_APP_KEY") ?? "";
const APP_SECRET = Deno.env.get("KIS_APP_SECRET") ?? "";
const CANO = Deno.env.get("KIS_CANO") ?? "";
const ACNT_PRDT_CD = Deno.env.get("KIS_ACNT_PRDT_CD") ?? "01";

// 기본은 실전. paper로 호출 시 모의투자 베이스 + VTTC TR_ID 사용
const REAL_BASE = "https://openapi.koreainvestment.com:9443";
const PAPER_BASE = "https://openapivts.koreainvestment.com:29443";

// 토큰 인메모리 캐시 (Edge instance 동안 유지)
let cachedToken: { token: string; expires_at: number; env: string } | null = null;

async function getToken(env: "real" | "paper"): Promise<string> {
  const base = env === "paper" ? PAPER_BASE : REAL_BASE;
  if (cachedToken && cachedToken.env === env && Date.now() < cachedToken.expires_at - 60_000) {
    return cachedToken.token;
  }
  const res = await fetch(`${base}/oauth2/tokenP`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      grant_type: "client_credentials",
      appkey: APP_KEY,
      appsecret: APP_SECRET,
    }),
  });
  const data = await res.json();
  if (!res.ok || !data.access_token) {
    throw new Error(`token issue failed: ${JSON.stringify(data)}`);
  }
  cachedToken = {
    token: data.access_token,
    expires_at: Date.now() + (Number(data.expires_in) || 86400) * 1000,
    env,
  };
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

async function inquireExecutions(env: "real" | "paper", fromDate: string, toDate: string) {
  // YYYYMMDD
  const base = env === "paper" ? PAPER_BASE : REAL_BASE;
  const trId = env === "paper" ? "VTTC8001R" : "TTTC8001R";
  const token = await getToken(env);
  const params = new URLSearchParams({
    CANO,
    ACNT_PRDT_CD,
    INQR_STRT_DT: fromDate,
    INQR_END_DT: toDate,
    SLL_BUY_DVSN_CD: "00", // 전체
    INQR_DVSN: "00",
    PDNO: "",
    CCLD_DVSN: "01", // 체결만
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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    if (!APP_KEY || !APP_SECRET || !CANO) {
      return new Response(
        JSON.stringify({ error: "KIS 시크릿이 설정되지 않았습니다 (KIS_APP_KEY / KIS_APP_SECRET / KIS_CANO)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

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
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
