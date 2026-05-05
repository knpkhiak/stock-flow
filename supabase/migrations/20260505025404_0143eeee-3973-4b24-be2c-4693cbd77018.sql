
-- =========================================================
-- 1) 베타 데이터 전부 삭제 (FK 순서 고려)
-- =========================================================
DELETE FROM public.trade_buys;
DELETE FROM public.trade_closes;
DELETE FROM public.trades;
DELETE FROM public.longterm_buys;
DELETE FROM public.longterm_sells;
DELETE FROM public.longterm_holdings;
DELETE FROM public.asset_snapshots;
DELETE FROM public.cash_transactions;
DELETE FROM public.kis_sync_log;

-- =========================================================
-- 2) 모든 테이블에 user_id 컬럼 추가 (NOT NULL + auth.uid() 기본값)
-- =========================================================
DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'trades','trade_buys','trade_closes',
    'longterm_holdings','longterm_buys','longterm_sells',
    'asset_snapshots','cash_transactions','kis_sync_log'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format(
      'ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE',
      t
    );
    EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON public.%I(user_id)', 'idx_'||t||'_user_id', t);
  END LOOP;
END$$;

-- =========================================================
-- 3) 기존 'Anyone can ...' 정책 모두 삭제 + 사용자별 정책 생성
-- =========================================================
DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'trades','trade_buys','trade_closes',
    'longterm_holdings','longterm_buys','longterm_sells',
    'asset_snapshots','cash_transactions','kis_sync_log'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Anyone can view %1$s" ON public.%1$I', t);
    EXECUTE format('DROP POLICY IF EXISTS "Anyone can insert %1$s" ON public.%1$I', t);
    EXECUTE format('DROP POLICY IF EXISTS "Anyone can update %1$s" ON public.%1$I', t);
    EXECUTE format('DROP POLICY IF EXISTS "Anyone can delete %1$s" ON public.%1$I', t);

    EXECUTE format($p$
      CREATE POLICY "Users can view own data" ON public.%I
      FOR SELECT TO authenticated
      USING (auth.uid() = user_id)
    $p$, t);

    EXECUTE format($p$
      CREATE POLICY "Users can insert own data" ON public.%I
      FOR INSERT TO authenticated
      WITH CHECK (auth.uid() = user_id)
    $p$, t);

    EXECUTE format($p$
      CREATE POLICY "Users can update own data" ON public.%I
      FOR UPDATE TO authenticated
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id)
    $p$, t);

    EXECUTE format($p$
      CREATE POLICY "Users can delete own data" ON public.%I
      FOR DELETE TO authenticated
      USING (auth.uid() = user_id)
    $p$, t);
  END LOOP;
END$$;

-- =========================================================
-- 4) kis_token_cache: 전역 토큰 캐시 (서비스 역할 전용, 클라이언트 차단)
--    RLS는 이미 활성화. 정책 0개 = 클라이언트 접근 불가.
-- =========================================================
ALTER TABLE public.kis_token_cache ENABLE ROW LEVEL SECURITY;
