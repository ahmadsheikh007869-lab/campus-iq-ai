
-- 1. Add user_id to chat_sessions
ALTER TABLE public.chat_sessions ADD COLUMN IF NOT EXISTS user_id uuid;

-- Delete any legacy anonymous data (no owner can be assigned)
DELETE FROM public.chat_messages WHERE session_id IN (SELECT id FROM public.chat_sessions WHERE user_id IS NULL);
DELETE FROM public.chat_sessions WHERE user_id IS NULL;

ALTER TABLE public.chat_sessions ALTER COLUMN user_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_id ON public.chat_sessions(user_id);

-- 2. Replace permissive policies on chat_sessions
DROP POLICY IF EXISTS "Anyone can manage chat sessions" ON public.chat_sessions;

CREATE POLICY "Users can view their own chat sessions"
  ON public.chat_sessions FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own chat sessions"
  ON public.chat_sessions FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own chat sessions"
  ON public.chat_sessions FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own chat sessions"
  ON public.chat_sessions FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- 3. Replace permissive policies on chat_messages (scoped via parent session ownership)
DROP POLICY IF EXISTS "Anyone can manage chat messages" ON public.chat_messages;

CREATE POLICY "Users can view messages in their own sessions"
  ON public.chat_messages FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.chat_sessions s
    WHERE s.id = chat_messages.session_id AND s.user_id = auth.uid()
  ));

CREATE POLICY "Users can insert messages in their own sessions"
  ON public.chat_messages FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.chat_sessions s
    WHERE s.id = chat_messages.session_id AND s.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete messages in their own sessions"
  ON public.chat_messages FOR DELETE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.chat_sessions s
    WHERE s.id = chat_messages.session_id AND s.user_id = auth.uid()
  ));

-- 4. Lock down has_role security-definer function
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;
