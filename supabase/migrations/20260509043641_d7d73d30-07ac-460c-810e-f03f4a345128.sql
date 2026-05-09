ALTER TABLE public.ideas ALTER COLUMN content DROP DEFAULT;

ALTER TABLE public.ideas ALTER COLUMN content TYPE jsonb USING 
  CASE 
    WHEN content IS NULL OR content = '' THEN '{"type":"doc","content":[{"type":"paragraph"}]}'::jsonb
    ELSE jsonb_build_object('type', 'doc', 'content', jsonb_build_array(
      jsonb_build_object('type', 'paragraph', 'content', jsonb_build_array(
        jsonb_build_object('type', 'text', 'text', content)
      ))
    ))
  END;

ALTER TABLE public.ideas ALTER COLUMN content SET DEFAULT '{"type":"doc","content":[{"type":"paragraph"}]}'::jsonb;
ALTER TABLE public.ideas ALTER COLUMN content SET NOT NULL;