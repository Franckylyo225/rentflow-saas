
CREATE TABLE public.growth_chat_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_growth_chat_messages_created ON public.growth_chat_messages(created_at);

ALTER TABLE public.growth_chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can view chat history"
ON public.growth_chat_messages FOR SELECT
TO authenticated
USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Super admins can insert chat messages"
ON public.growth_chat_messages FOR INSERT
TO authenticated
WITH CHECK (public.is_super_admin(auth.uid()) AND user_id = auth.uid());

CREATE POLICY "Super admins can delete chat messages"
ON public.growth_chat_messages FOR DELETE
TO authenticated
USING (public.is_super_admin(auth.uid()));
