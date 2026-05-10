
-- ============================================
-- USER PROFILES
-- ============================================
CREATE TABLE public.user_profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nickname text NOT NULL UNIQUE,
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profiles are viewable by authenticated"
  ON public.user_profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert own profile"
  ON public.user_profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own profile"
  ON public.user_profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own profile"
  ON public.user_profiles FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER user_profiles_updated_at
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- INVITE CODES
-- ============================================
CREATE TABLE public.invite_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  used_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  is_used boolean NOT NULL DEFAULT false,
  memo text,
  created_at timestamptz NOT NULL DEFAULT now(),
  used_at timestamptz
);
ALTER TABLE public.invite_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own invite codes"
  ON public.invite_codes FOR SELECT TO authenticated USING (auth.uid() = created_by);
CREATE POLICY "Users can insert own invite codes"
  ON public.invite_codes FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Users can delete own unused invite codes"
  ON public.invite_codes FOR DELETE TO authenticated USING (auth.uid() = created_by AND is_used = false);

-- ============================================
-- BOARD POSTS
-- ============================================
CREATE TABLE public.board_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  content jsonb NOT NULL DEFAULT '{"type":"doc","content":[{"type":"paragraph"}]}'::jsonb,
  view_count integer NOT NULL DEFAULT 0,
  like_count integer NOT NULL DEFAULT 0,
  comment_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.board_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Posts viewable by authenticated"
  ON public.board_posts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users insert own posts"
  ON public.board_posts FOR INSERT TO authenticated WITH CHECK (auth.uid() = author_id);
CREATE POLICY "Users update own posts"
  ON public.board_posts FOR UPDATE TO authenticated USING (auth.uid() = author_id) WITH CHECK (auth.uid() = author_id);
CREATE POLICY "Users delete own posts"
  ON public.board_posts FOR DELETE TO authenticated USING (auth.uid() = author_id);

CREATE TRIGGER board_posts_updated_at
  BEFORE UPDATE ON public.board_posts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- COMMENTS
-- ============================================
CREATE TABLE public.comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  target_type text NOT NULL CHECK (target_type IN ('post','shared_idea')),
  target_id uuid NOT NULL,
  author_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  parent_comment_id uuid REFERENCES public.comments(id) ON DELETE CASCADE,
  content text NOT NULL,
  is_deleted boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Comments viewable by authenticated"
  ON public.comments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users insert own comments"
  ON public.comments FOR INSERT TO authenticated WITH CHECK (auth.uid() = author_id);
CREATE POLICY "Users update own comments"
  ON public.comments FOR UPDATE TO authenticated USING (auth.uid() = author_id) WITH CHECK (auth.uid() = author_id);
CREATE POLICY "Users delete own comments"
  ON public.comments FOR DELETE TO authenticated USING (auth.uid() = author_id);

CREATE INDEX idx_comments_target ON public.comments(target_type, target_id);
CREATE INDEX idx_comments_parent ON public.comments(parent_comment_id);

CREATE TRIGGER comments_updated_at
  BEFORE UPDATE ON public.comments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 답글의 답글 차단
CREATE OR REPLACE FUNCTION public.prevent_nested_replies()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE
  parent_parent uuid;
BEGIN
  IF NEW.parent_comment_id IS NOT NULL THEN
    SELECT parent_comment_id INTO parent_parent FROM public.comments WHERE id = NEW.parent_comment_id;
    IF parent_parent IS NOT NULL THEN
      RAISE EXCEPTION 'Nested replies not allowed (max depth 1)';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER comments_prevent_nested
  BEFORE INSERT ON public.comments
  FOR EACH ROW EXECUTE FUNCTION public.prevent_nested_replies();

-- ============================================
-- LIKES
-- ============================================
CREATE TABLE public.likes (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_type text NOT NULL CHECK (target_type IN ('post','shared_idea','comment')),
  target_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, target_type, target_id)
);
ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Likes viewable by authenticated"
  ON public.likes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users insert own likes"
  ON public.likes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own likes"
  ON public.likes FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX idx_likes_target ON public.likes(target_type, target_id);

-- ============================================
-- IDEAS 컬럼 확장
-- ============================================
ALTER TABLE public.ideas
  ADD COLUMN IF NOT EXISTS is_shared boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS shared_at timestamptz,
  ADD COLUMN IF NOT EXISTS share_pnl_rate boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS like_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS comment_count integer NOT NULL DEFAULT 0;

DROP POLICY IF EXISTS "Users can view own ideas" ON public.ideas;
CREATE POLICY "Users can view own or shared ideas"
  ON public.ideas FOR SELECT
  USING (auth.uid() = user_id OR is_shared = true);

-- ============================================
-- 카운트 갱신 트리거
-- ============================================
CREATE OR REPLACE FUNCTION public.update_like_count()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.target_type = 'post' THEN
      UPDATE public.board_posts SET like_count = like_count + 1 WHERE id = NEW.target_id;
    ELSIF NEW.target_type = 'shared_idea' THEN
      UPDATE public.ideas SET like_count = like_count + 1 WHERE id = NEW.target_id;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.target_type = 'post' THEN
      UPDATE public.board_posts SET like_count = GREATEST(like_count - 1, 0) WHERE id = OLD.target_id;
    ELSIF OLD.target_type = 'shared_idea' THEN
      UPDATE public.ideas SET like_count = GREATEST(like_count - 1, 0) WHERE id = OLD.target_id;
    END IF;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;
CREATE TRIGGER likes_count_trigger
  AFTER INSERT OR DELETE ON public.likes
  FOR EACH ROW EXECUTE FUNCTION public.update_like_count();

CREATE OR REPLACE FUNCTION public.update_comment_count()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.is_deleted = false THEN
      IF NEW.target_type = 'post' THEN
        UPDATE public.board_posts SET comment_count = comment_count + 1 WHERE id = NEW.target_id;
      ELSIF NEW.target_type = 'shared_idea' THEN
        UPDATE public.ideas SET comment_count = comment_count + 1 WHERE id = NEW.target_id;
      END IF;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.is_deleted = false AND NEW.is_deleted = true THEN
      IF NEW.target_type = 'post' THEN
        UPDATE public.board_posts SET comment_count = GREATEST(comment_count - 1, 0) WHERE id = NEW.target_id;
      ELSIF NEW.target_type = 'shared_idea' THEN
        UPDATE public.ideas SET comment_count = GREATEST(comment_count - 1, 0) WHERE id = NEW.target_id;
      END IF;
    ELSIF OLD.is_deleted = true AND NEW.is_deleted = false THEN
      IF NEW.target_type = 'post' THEN
        UPDATE public.board_posts SET comment_count = comment_count + 1 WHERE id = NEW.target_id;
      ELSIF NEW.target_type = 'shared_idea' THEN
        UPDATE public.ideas SET comment_count = comment_count + 1 WHERE id = NEW.target_id;
      END IF;
    END IF;
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$;
CREATE TRIGGER comments_count_trigger
  AFTER INSERT OR UPDATE ON public.comments
  FOR EACH ROW EXECUTE FUNCTION public.update_comment_count();

-- ============================================
-- RPC FUNCTIONS
-- ============================================
CREATE OR REPLACE FUNCTION public.change_nickname(new_nickname text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  uid uuid := auth.uid();
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF length(trim(new_nickname)) < 2 OR length(trim(new_nickname)) > 20 THEN
    RAISE EXCEPTION 'Nickname must be 2-20 chars';
  END IF;
  IF EXISTS (SELECT 1 FROM public.user_profiles WHERE nickname = new_nickname AND user_id <> uid) THEN
    RAISE EXCEPTION 'Nickname already taken';
  END IF;
  INSERT INTO public.user_profiles (user_id, nickname)
    VALUES (uid, new_nickname)
    ON CONFLICT (user_id) DO UPDATE SET nickname = EXCLUDED.nickname, updated_at = now();
END;
$$;

CREATE OR REPLACE FUNCTION public.verify_invite_code(p_code text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  rec record;
BEGIN
  SELECT id, is_used INTO rec FROM public.invite_codes WHERE code = p_code;
  IF NOT FOUND THEN RETURN jsonb_build_object('valid', false, 'reason', 'not_found'); END IF;
  IF rec.is_used THEN RETURN jsonb_build_object('valid', false, 'reason', 'already_used'); END IF;
  RETURN jsonb_build_object('valid', true, 'code_id', rec.id);
END;
$$;

CREATE OR REPLACE FUNCTION public.use_invite_code(p_code text, p_user_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.invite_codes
    SET is_used = true, used_by = p_user_id, used_at = now()
    WHERE code = p_code AND is_used = false;
  IF NOT FOUND THEN RAISE EXCEPTION 'Invalid or already used invite code'; END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.toggle_like(p_target_type text, p_target_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  uid uuid := auth.uid();
  liked boolean;
  cnt integer;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF EXISTS (SELECT 1 FROM public.likes WHERE user_id = uid AND target_type = p_target_type AND target_id = p_target_id) THEN
    DELETE FROM public.likes WHERE user_id = uid AND target_type = p_target_type AND target_id = p_target_id;
    liked := false;
  ELSE
    INSERT INTO public.likes (user_id, target_type, target_id) VALUES (uid, p_target_type, p_target_id);
    liked := true;
  END IF;
  SELECT count(*) INTO cnt FROM public.likes WHERE target_type = p_target_type AND target_id = p_target_id;
  RETURN jsonb_build_object('liked', liked, 'count', cnt);
END;
$$;

CREATE OR REPLACE FUNCTION public.increment_post_view(p_post_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.board_posts SET view_count = view_count + 1 WHERE id = p_post_id;
END;
$$;
