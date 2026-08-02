DROP POLICY IF EXISTS "Admins can delete university info" ON public.university_info;
DROP POLICY IF EXISTS "Admins can update university info" ON public.university_info;
DROP POLICY IF EXISTS "Admins can insert university info" ON public.university_info;

CREATE POLICY "Admins can delete university info"
ON public.university_info FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role) AND coalesce(((auth.jwt() ->> 'is_anonymous'))::boolean, false) = false);

CREATE POLICY "Admins can update university info"
ON public.university_info FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role) AND coalesce(((auth.jwt() ->> 'is_anonymous'))::boolean, false) = false)
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) AND coalesce(((auth.jwt() ->> 'is_anonymous'))::boolean, false) = false);

CREATE POLICY "Admins can insert university info"
ON public.university_info FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) AND coalesce(((auth.jwt() ->> 'is_anonymous'))::boolean, false) = false);

REVOKE INSERT, UPDATE, DELETE ON public.university_info FROM anon;