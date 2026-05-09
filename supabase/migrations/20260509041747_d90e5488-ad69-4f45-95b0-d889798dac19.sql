-- updated_at trigger function (shared)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- ideas table
CREATE TABLE public.ideas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL DEFAULT auth.uid(),
  title TEXT NOT NULL,
  ticker TEXT,
  market TEXT,
  content TEXT NOT NULL DEFAULT '',
  tags TEXT[] NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'watching',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.ideas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own ideas" ON public.ideas
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own ideas" ON public.ideas
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own ideas" ON public.ideas
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own ideas" ON public.ideas
  FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_ideas_updated_at
BEFORE UPDATE ON public.ideas
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_ideas_user_id ON public.ideas(user_id);
CREATE INDEX idx_ideas_status ON public.ideas(status);
CREATE INDEX idx_ideas_updated_at ON public.ideas(updated_at DESC);

-- trades.idea_id FK
ALTER TABLE public.trades
  ADD CONSTRAINT trades_idea_id_fkey
  FOREIGN KEY (idea_id) REFERENCES public.ideas(id) ON DELETE SET NULL;

CREATE INDEX idx_trades_idea_id ON public.trades(idea_id);

-- Storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'ideas-images',
  'ideas-images',
  false,
  5242880,
  ARRAY['image/webp', 'image/jpeg', 'image/png', 'image/gif']
);

CREATE POLICY "Users can upload own idea images"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'ideas-images'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can view own idea images"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'ideas-images'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete own idea images"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'ideas-images'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );