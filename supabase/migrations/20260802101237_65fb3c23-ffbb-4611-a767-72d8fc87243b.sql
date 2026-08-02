DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;

CREATE POLICY "Users can view own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id
  AND coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) = false
);

CREATE POLICY "Admins can manage roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  AND coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) = false
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin')
  AND coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) = false
);

REVOKE ALL ON public.user_roles FROM anon;
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;