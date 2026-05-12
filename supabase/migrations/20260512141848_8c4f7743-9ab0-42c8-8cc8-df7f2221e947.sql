
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS is_admin boolean NOT NULL DEFAULT false;
ALTER TABLE public.invite_codes ADD COLUMN IF NOT EXISTS is_master boolean NOT NULL DEFAULT false;
ALTER TABLE public.invite_codes ALTER COLUMN created_by DROP NOT NULL;

INSERT INTO public.invite_codes (code, is_master, is_used, created_by, memo)
SELECT 'STOCKFLOWADMIN2026', true, false, NULL, '시스템 마스터 코드 (운영자 권한 자동 부여)'
WHERE NOT EXISTS (SELECT 1 FROM public.invite_codes WHERE code = 'STOCKFLOWADMIN2026');

CREATE TABLE IF NOT EXISTS public.api_settings (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  kis_app_key text,
  kis_app_secret text,
  kis_account_number text,
  kis_account_type text NOT NULL DEFAULT 'REAL',
  last_token text,
  token_expires_at timestamptz,
  is_connected boolean NOT NULL DEFAULT false,
  last_connected_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.api_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own API settings" ON public.api_settings;
CREATE POLICY "Users can view own API settings" ON public.api_settings
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert own API settings" ON public.api_settings;
CREATE POLICY "Users can insert own API settings" ON public.api_settings
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update own API settings" ON public.api_settings;
CREATE POLICY "Users can update own API settings" ON public.api_settings
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete own API settings" ON public.api_settings;
CREATE POLICY "Users can delete own API settings" ON public.api_settings
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

DROP TRIGGER IF EXISTS update_api_settings_updated_at ON public.api_settings;
CREATE TRIGGER update_api_settings_updated_at
  BEFORE UPDATE ON public.api_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.use_invite_code(p_code text, p_user_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_is_master boolean;
BEGIN
  UPDATE public.invite_codes
    SET is_used = true, used_by = p_user_id, used_at = now()
    WHERE code = p_code AND is_used = false
    RETURNING is_master INTO v_is_master;
  IF NOT FOUND THEN RAISE EXCEPTION 'Invalid or already used invite code'; END IF;
  IF v_is_master THEN
    UPDATE public.user_profiles SET is_admin = true, updated_at = now()
      WHERE user_id = p_user_id;
  END IF;
END; $$;

CREATE OR REPLACE FUNCTION public.set_user_admin(p_target_user_id uuid, p_is_admin boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.user_profiles WHERE user_id = auth.uid() AND is_admin = true) THEN
    RAISE EXCEPTION 'Admin privilege required';
  END IF;
  IF p_target_user_id = auth.uid() AND p_is_admin = false THEN
    RAISE EXCEPTION '본인의 운영자 권한은 해제할 수 없습니다';
  END IF;
  UPDATE public.user_profiles SET is_admin = p_is_admin, updated_at = now()
    WHERE user_id = p_target_user_id;
END; $$;

CREATE OR REPLACE FUNCTION public.admin_list_users()
RETURNS TABLE (
  user_id uuid, email text, nickname text, is_admin boolean,
  created_at timestamptz, last_sign_in_at timestamptz, api_connected boolean
) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.user_profiles WHERE user_id = auth.uid() AND is_admin = true) THEN
    RAISE EXCEPTION 'Admin privilege required';
  END IF;
  RETURN QUERY
  SELECT u.id, u.email::text, p.nickname, COALESCE(p.is_admin, false),
         u.created_at, u.last_sign_in_at, COALESCE(a.is_connected, false)
  FROM auth.users u
  LEFT JOIN public.user_profiles p ON p.user_id = u.id
  LEFT JOIN public.api_settings a ON a.user_id = u.id
  ORDER BY u.created_at DESC;
END; $$;
