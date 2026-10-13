-- Supabase SQL Editor: run in a new Supabase project, or a database already using this schema.
-- Legacy PostgreSQL records need an explicit ID/account mapping before import.
DO $$ BEGIN
 IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='applicant')
 AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='applicant' AND column_name='user_id') THEN
  RAISE EXCEPTION 'Legacy applicant table detected. Use a new Supabase project and follow the migration guide.';
 END IF;
END $$;
CREATE TABLE IF NOT EXISTS public.profiles (
 id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
 name TEXT NOT NULL,
 role TEXT NOT NULL DEFAULT 'applicant' CHECK (role IN ('applicant','hiring_manager'))
);
CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
 INSERT INTO public.profiles (id,name,role) VALUES (NEW.id, COALESCE(NULLIF(NEW.raw_user_meta_data->>'name',''),split_part(NEW.email,'@',1)), 'applicant');
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS high5_auth_user_created ON auth.users;
CREATE TRIGGER high5_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
CREATE OR REPLACE FUNCTION public.is_hiring_manager() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
 SELECT EXISTS(SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'hiring_manager');
$$;
REVOKE ALL ON FUNCTION public.is_hiring_manager() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_hiring_manager() TO authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC;
CREATE TABLE IF NOT EXISTS public.job (
 job_id UUID PRIMARY KEY DEFAULT gen_random_uuid(), job TEXT NOT NULL,
 job_type TEXT NOT NULL CHECK (job_type IN ('Full-time','Part-time','Intern')),
 experience TEXT, education TEXT, requirement TEXT, description TEXT,
 status TEXT NOT NULL DEFAULT 'Draft' CHECK (status IN ('Active','Draft','Closed')),
 created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
 updated_at TIMESTAMPTZ NOT NULL DEFAULT now(), created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.applicant (
 applicant_id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
 applicant_name TEXT NOT NULL, contact_number TEXT, email TEXT NOT NULL, address TEXT, resume TEXT,
 role_applied UUID NOT NULL REFERENCES public.job(job_id) ON DELETE CASCADE,
 personality_type TEXT, status TEXT NOT NULL DEFAULT 'Reviewing' CHECK (status IN ('Reviewing','Shortlisted','Rejected')),
 personality_test_score TEXT, compatibility_score INT CHECK (compatibility_score BETWEEN 0 AND 100), compatibility_breakdown TEXT,
 updated_at TIMESTAMPTZ NOT NULL DEFAULT now(), created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 UNIQUE (user_id,role_applied)
);
CREATE INDEX IF NOT EXISTS applicant_user_idx ON public.applicant(user_id);
CREATE INDEX IF NOT EXISTS applicant_job_idx ON public.applicant(role_applied);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.applicant ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.profiles,public.job,public.applicant FROM anon,authenticated;
GRANT SELECT ON public.job TO anon;
GRANT SELECT ON public.profiles,public.job,public.applicant TO authenticated;
GRANT INSERT,UPDATE ON public.job TO authenticated;
-- Managers can change status, but cannot change ownership, stored resumes or scores.
GRANT UPDATE(status,updated_at) ON public.applicant TO authenticated;
GRANT ALL ON public.profiles,public.job,public.applicant TO service_role;
DROP POLICY IF EXISTS profiles_read ON public.profiles;
CREATE POLICY profiles_read ON public.profiles FOR SELECT TO authenticated USING (id=auth.uid());
DROP POLICY IF EXISTS jobs_public ON public.job;
CREATE POLICY jobs_public ON public.job FOR SELECT TO anon USING (status='Active');
DROP POLICY IF EXISTS jobs_read ON public.job;
CREATE POLICY jobs_read ON public.job FOR SELECT TO authenticated USING (
 status='Active' OR public.is_hiring_manager() OR EXISTS (SELECT 1 FROM public.applicant WHERE role_applied=job_id AND user_id=auth.uid())
);
DROP POLICY IF EXISTS jobs_insert ON public.job;
CREATE POLICY jobs_insert ON public.job FOR INSERT TO authenticated WITH CHECK (public.is_hiring_manager() AND created_by=auth.uid());
DROP POLICY IF EXISTS jobs_update ON public.job;
CREATE POLICY jobs_update ON public.job FOR UPDATE TO authenticated USING (public.is_hiring_manager()) WITH CHECK (public.is_hiring_manager());
DROP POLICY IF EXISTS applications_read ON public.applicant;
CREATE POLICY applications_read ON public.applicant FOR SELECT TO authenticated USING (user_id=auth.uid() OR public.is_hiring_manager());
DROP POLICY IF EXISTS applications_update ON public.applicant;
CREATE POLICY applications_update ON public.applicant FOR UPDATE TO authenticated USING (public.is_hiring_manager()) WITH CHECK (public.is_hiring_manager());
-- Applications and resume uploads are inserted only by the authenticated server handler,
-- using its secret key so applicants cannot forge compatibility scores or ownership.
INSERT INTO storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
VALUES ('resumes','resumes',false,10485760,ARRAY['application/pdf','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/msword','text/plain','application/octet-stream'])
ON CONFLICT (id) DO UPDATE SET public=false,file_size_limit=10485760,allowed_mime_types=EXCLUDED.allowed_mime_types;
DROP POLICY IF EXISTS high5_manager_resumes ON storage.objects;
CREATE POLICY high5_manager_resumes ON storage.objects FOR SELECT TO authenticated USING (bucket_id='resumes' AND public.is_hiring_manager());
