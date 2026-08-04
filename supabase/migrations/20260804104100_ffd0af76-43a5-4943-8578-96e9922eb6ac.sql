DROP POLICY IF EXISTS "Admins can delete faqs" ON public.faqs;
DROP POLICY IF EXISTS "Admins can update faqs" ON public.faqs;
DROP POLICY IF EXISTS "Admins can insert faqs" ON public.faqs;

CREATE POLICY "Admins can insert faqs" ON public.faqs FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) AND COALESCE(((auth.jwt() ->> 'is_anonymous'))::boolean, false) = false);

CREATE POLICY "Admins can update faqs" ON public.faqs FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role) AND COALESCE(((auth.jwt() ->> 'is_anonymous'))::boolean, false) = false)
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) AND COALESCE(((auth.jwt() ->> 'is_anonymous'))::boolean, false) = false);

CREATE POLICY "Admins can delete faqs" ON public.faqs FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role) AND COALESCE(((auth.jwt() ->> 'is_anonymous'))::boolean, false) = false);