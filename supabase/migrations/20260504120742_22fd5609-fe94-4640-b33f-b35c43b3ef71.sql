CREATE TABLE IF NOT EXISTS public.kis_token_cache (
  env text PRIMARY KEY,
  access_token text NOT NULL,
  expires_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.kis_token_cache ENABLE ROW LEVEL SECURITY;
-- No policies: only service role (which bypasses RLS) can access. Clients have no access.