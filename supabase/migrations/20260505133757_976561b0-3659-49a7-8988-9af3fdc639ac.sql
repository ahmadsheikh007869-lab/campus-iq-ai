ALTER TABLE public.chat_sessions ADD COLUMN IF NOT EXISTS pinned BOOLEAN NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS idx_chat_sessions_pinned ON public.chat_sessions(pinned, updated_at DESC);