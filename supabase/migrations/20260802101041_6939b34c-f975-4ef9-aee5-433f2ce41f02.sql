DROP POLICY IF EXISTS "Admins can insert courses" ON public.courses;
DROP POLICY IF EXISTS "Admins can update courses" ON public.courses;
DROP POLICY IF EXISTS "Admins can delete courses" ON public.courses;
CREATE POLICY "Admins can insert courses" ON public.courses FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update courses" ON public.courses FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete courses" ON public.courses FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can insert faqs" ON public.faqs;
DROP POLICY IF EXISTS "Admins can update faqs" ON public.faqs;
DROP POLICY IF EXISTS "Admins can delete faqs" ON public.faqs;
CREATE POLICY "Admins can insert faqs" ON public.faqs FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update faqs" ON public.faqs FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete faqs" ON public.faqs FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can insert university info" ON public.university_info;
DROP POLICY IF EXISTS "Admins can update university info" ON public.university_info;
DROP POLICY IF EXISTS "Admins can delete university info" ON public.university_info;
CREATE POLICY "Admins can insert university info" ON public.university_info FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update university info" ON public.university_info FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete university info" ON public.university_info FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Anyone can view courses" ON public.courses;
CREATE POLICY "Anyone can view courses" ON public.courses FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "Anyone can view faqs" ON public.faqs;
CREATE POLICY "Anyone can view faqs" ON public.faqs FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "Anyone can view university info" ON public.university_info;
CREATE POLICY "Anyone can view university info" ON public.university_info FOR SELECT TO anon, authenticated USING (true);

GRANT SELECT ON public.courses TO anon;
GRANT SELECT ON public.faqs TO anon;
GRANT SELECT ON public.university_info TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.courses TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.faqs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.university_info TO authenticated;
GRANT ALL ON public.courses TO service_role;
GRANT ALL ON public.faqs TO service_role;
GRANT ALL ON public.university_info TO service_role;