-- Run once in Supabase SQL Editor AFTER the existing High5 schema.
-- Existing policies still decide which records a user owns. These restrictive
-- policies add MFA requirements without broadening any record permissions.
BEGIN;
CREATE OR REPLACE FUNCTION public.high5_mfa_satisfied() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
 SELECT auth.uid() IS NOT NULL AND (
  (auth.jwt()->>'aal') = 'aal2'
  OR (
   EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'applicant')
   AND NOT EXISTS (
    SELECT 1 FROM auth.mfa_factors WHERE user_id = auth.uid() AND status = 'verified'
   )
  )
 );
$$;
REVOKE ALL ON FUNCTION public.high5_mfa_satisfied() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.high5_mfa_satisfied() TO authenticated;
-- Own profile stays readable at AAL1 so the login/setup flow can identify role.
DROP POLICY IF EXISTS high5_jobs_mfa ON public.job;
CREATE POLICY high5_jobs_mfa ON public.job AS RESTRICTIVE FOR ALL TO authenticated
 USING (public.high5_mfa_satisfied()) WITH CHECK (public.high5_mfa_satisfied());
DROP POLICY IF EXISTS high5_applications_mfa ON public.applicant;
CREATE POLICY high5_applications_mfa ON public.applicant AS RESTRICTIVE FOR ALL TO authenticated
 USING (public.high5_mfa_satisfied()) WITH CHECK (public.high5_mfa_satisfied());
DROP POLICY IF EXISTS high5_resumes_mfa ON storage.objects;
CREATE POLICY high5_resumes_mfa ON storage.objects AS RESTRICTIVE FOR ALL TO authenticated
 USING (bucket_id <> 'resumes' OR public.high5_mfa_satisfied())
 WITH CHECK (bucket_id <> 'resumes' OR public.high5_mfa_satisfied());
COMMIT;
