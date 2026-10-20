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
 role TEXT NOT NULL DEFAULT 'applicant' CHECK (role IN ('applicant','hiring_manager')),
 deleted_at TIMESTAMPTZ, is_deleted BOOLEAN NOT NULL DEFAULT false
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
 updated_at TIMESTAMPTZ NOT NULL DEFAULT now(), created_at TIMESTAMPTZ NOT NULL DEFAULT now(), deleted_at TIMESTAMPTZ, is_deleted BOOLEAN NOT NULL DEFAULT false
);
CREATE TABLE IF NOT EXISTS public.applicant (
 applicant_id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
 applicant_name TEXT NOT NULL, contact_number TEXT, email TEXT NOT NULL, address TEXT, resume TEXT,
 role_applied UUID NOT NULL REFERENCES public.job(job_id) ON DELETE CASCADE,
 personality_type TEXT, status TEXT NOT NULL DEFAULT 'Reviewing' CHECK (status IN ('Reviewing','Shortlisted','Rejected')),
 personality_test_score TEXT, compatibility_score INT CHECK (compatibility_score BETWEEN 0 AND 100), compatibility_breakdown TEXT,
 updated_at TIMESTAMPTZ NOT NULL DEFAULT now(), created_at TIMESTAMPTZ NOT NULL DEFAULT now(), deleted_at TIMESTAMPTZ, is_deleted BOOLEAN NOT NULL DEFAULT false,
 UNIQUE (user_id,role_applied)
);
-- Keep this script safe to reapply to installations created from earlier schema revisions.
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE public.job ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE public.applicant ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.job ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.applicant ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT false;
UPDATE public.profiles SET is_deleted=(deleted_at IS NOT NULL) WHERE is_deleted IS DISTINCT FROM (deleted_at IS NOT NULL);
UPDATE public.job SET is_deleted=(deleted_at IS NOT NULL) WHERE is_deleted IS DISTINCT FROM (deleted_at IS NOT NULL);
UPDATE public.applicant SET is_deleted=(deleted_at IS NOT NULL) WHERE is_deleted IS DISTINCT FROM (deleted_at IS NOT NULL);
-- Field-level change history. Values are JSON so the log works across all business tables.
CREATE TABLE IF NOT EXISTS public.audit_log (
 audit_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 table_name TEXT NOT NULL,
 record_id TEXT NOT NULL,
 action TEXT NOT NULL CHECK (action IN ('INSERT','UPDATE','DELETE')),
 changed_by UUID,
 changed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 changes JSONB NOT NULL DEFAULT '{}'::jsonb,
 old_values JSONB,
 new_values JSONB
);
CREATE INDEX IF NOT EXISTS audit_log_record_idx ON public.audit_log(table_name, record_id, changed_at DESC);
CREATE INDEX IF NOT EXISTS audit_log_actor_idx ON public.audit_log(changed_by, changed_at DESC);

CREATE OR REPLACE FUNCTION public.sync_soft_delete_fields() RETURNS trigger
LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
 IF TG_OP = 'INSERT' THEN
  NEW.is_deleted := COALESCE(NEW.is_deleted, false) OR NEW.deleted_at IS NOT NULL;
  IF NEW.is_deleted AND NEW.deleted_at IS NULL THEN NEW.deleted_at := now(); END IF;
 ELSIF NEW.is_deleted IS DISTINCT FROM OLD.is_deleted THEN
  IF NEW.is_deleted THEN NEW.deleted_at := COALESCE(NEW.deleted_at, now());
  ELSE NEW.deleted_at := NULL; END IF;
 ELSIF NEW.deleted_at IS DISTINCT FROM OLD.deleted_at THEN
  NEW.is_deleted := NEW.deleted_at IS NOT NULL;
 END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.sync_soft_delete_fields() FROM PUBLIC;
DROP TRIGGER IF EXISTS profiles_sync_soft_delete ON public.profiles;
CREATE TRIGGER profiles_sync_soft_delete BEFORE INSERT OR UPDATE OF is_deleted,deleted_at ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.sync_soft_delete_fields();
DROP TRIGGER IF EXISTS job_sync_soft_delete ON public.job;
CREATE TRIGGER job_sync_soft_delete BEFORE INSERT OR UPDATE OF is_deleted,deleted_at ON public.job FOR EACH ROW EXECUTE FUNCTION public.sync_soft_delete_fields();
DROP TRIGGER IF EXISTS applicant_sync_soft_delete ON public.applicant;
CREATE TRIGGER applicant_sync_soft_delete BEFORE INSERT OR UPDATE OF is_deleted,deleted_at ON public.applicant FOR EACH ROW EXECUTE FUNCTION public.sync_soft_delete_fields();

CREATE OR REPLACE FUNCTION public.capture_audit_change() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
 old_row JSONB; new_row JSONB; delta JSONB := '{}'::jsonb; item RECORD; row_id TEXT;
BEGIN
 old_row := CASE WHEN TG_OP IN ('UPDATE','DELETE') THEN to_jsonb(OLD) ELSE NULL END;
 new_row := CASE WHEN TG_OP IN ('INSERT','UPDATE') THEN to_jsonb(NEW) ELSE NULL END;
 row_id := COALESCE(new_row->>'job_id', new_row->>'applicant_id', new_row->>'id', old_row->>'job_id', old_row->>'applicant_id', old_row->>'id');
 IF TG_OP = 'INSERT' THEN
  FOR item IN SELECT key, value FROM jsonb_each(new_row) LOOP
   delta := delta || jsonb_build_object(item.key, jsonb_build_object('old', NULL, 'new', item.value));
  END LOOP;
 ELSIF TG_OP = 'UPDATE' THEN
  FOR item IN SELECT key, value FROM jsonb_each(old_row) LOOP
   IF item.value IS DISTINCT FROM new_row->item.key THEN
    delta := delta || jsonb_build_object(item.key, jsonb_build_object('old', item.value, 'new', new_row->item.key));
   END IF;
  END LOOP;
 ELSE
  FOR item IN SELECT key, value FROM jsonb_each(old_row) LOOP
   delta := delta || jsonb_build_object(item.key, jsonb_build_object('old', item.value, 'new', NULL));
  END LOOP;
 END IF;
 INSERT INTO public.audit_log(table_name,record_id,action,changed_by,changes,old_values,new_values)
 VALUES (TG_TABLE_NAME,row_id,TG_OP,COALESCE(auth.uid(), CASE WHEN TG_TABLE_NAME='profiles' AND TG_OP='INSERT' THEN (new_row->>'id')::uuid END),delta,old_row,new_row);
 IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.capture_audit_change() FROM PUBLIC;
REVOKE ALL ON public.audit_log FROM anon,authenticated;
GRANT ALL ON public.audit_log TO service_role;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
DROP TRIGGER IF EXISTS profiles_audit ON public.profiles;
CREATE TRIGGER profiles_audit AFTER INSERT OR UPDATE OR DELETE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.capture_audit_change();
DROP TRIGGER IF EXISTS job_audit ON public.job;
CREATE TRIGGER job_audit AFTER INSERT OR UPDATE OR DELETE ON public.job FOR EACH ROW EXECUTE FUNCTION public.capture_audit_change();
DROP TRIGGER IF EXISTS applicant_audit ON public.applicant;
CREATE TRIGGER applicant_audit AFTER INSERT OR UPDATE OR DELETE ON public.applicant FOR EACH ROW EXECUTE FUNCTION public.capture_audit_change();
-- Treat accidental SQL DELETEs on jobs as soft deletes too, preserving linked applications.
CREATE OR REPLACE FUNCTION public.preserve_deleted_job() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
 IF NOT OLD.is_deleted THEN
  UPDATE public.job SET deleted_at=now(), is_deleted=true, updated_at=now() WHERE job_id=OLD.job_id;
 END IF;
 RETURN NULL;
END $$;
REVOKE ALL ON FUNCTION public.preserve_deleted_job() FROM PUBLIC;
DROP TRIGGER IF EXISTS job_soft_delete ON public.job;
CREATE TRIGGER job_soft_delete BEFORE DELETE ON public.job FOR EACH ROW EXECUTE FUNCTION public.preserve_deleted_job();
CREATE INDEX IF NOT EXISTS applicant_user_idx ON public.applicant(user_id);
CREATE INDEX IF NOT EXISTS applicant_job_idx ON public.applicant(role_applied);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.applicant ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.profiles,public.job,public.applicant FROM anon,authenticated;
GRANT SELECT ON public.job TO anon;
GRANT SELECT ON public.profiles,public.job,public.applicant TO authenticated;
GRANT INSERT,UPDATE ON public.job TO authenticated;
GRANT UPDATE(deleted_at,is_deleted,updated_at) ON public.job TO authenticated;
-- Managers can change status, but cannot change ownership, stored resumes or scores.
GRANT UPDATE(status,updated_at) ON public.applicant TO authenticated;
GRANT UPDATE(is_deleted,deleted_at,updated_at) ON public.applicant TO authenticated;
GRANT UPDATE(is_deleted,deleted_at) ON public.profiles TO authenticated;
GRANT ALL ON public.profiles,public.job,public.applicant TO service_role;
DROP POLICY IF EXISTS profiles_read ON public.profiles;
CREATE POLICY profiles_read ON public.profiles FOR SELECT TO authenticated USING (id=auth.uid() AND NOT is_deleted);
DROP POLICY IF EXISTS profiles_self_delete ON public.profiles;
CREATE POLICY profiles_self_delete ON public.profiles FOR UPDATE TO authenticated USING (id=auth.uid() AND NOT is_deleted) WITH CHECK (id=auth.uid() AND is_deleted);
DROP POLICY IF EXISTS jobs_public ON public.job;
CREATE POLICY jobs_public ON public.job FOR SELECT TO anon USING (status='Active' AND NOT is_deleted);
DROP POLICY IF EXISTS jobs_read ON public.job;
CREATE POLICY jobs_read ON public.job FOR SELECT TO authenticated USING (
 NOT is_deleted AND (status='Active' OR public.is_hiring_manager() OR EXISTS (SELECT 1 FROM public.applicant WHERE role_applied=job_id AND user_id=auth.uid() AND NOT is_deleted))
);
DROP POLICY IF EXISTS jobs_insert ON public.job;
CREATE POLICY jobs_insert ON public.job FOR INSERT TO authenticated WITH CHECK (public.is_hiring_manager() AND created_by=auth.uid());
DROP POLICY IF EXISTS jobs_update ON public.job;
CREATE POLICY jobs_update ON public.job FOR UPDATE TO authenticated USING (public.is_hiring_manager()) WITH CHECK (public.is_hiring_manager());
DROP POLICY IF EXISTS applications_read ON public.applicant;
CREATE POLICY applications_read ON public.applicant FOR SELECT TO authenticated USING (NOT is_deleted AND (user_id=auth.uid() OR public.is_hiring_manager()));
DROP POLICY IF EXISTS applications_update ON public.applicant;
CREATE POLICY applications_update ON public.applicant FOR UPDATE TO authenticated USING (public.is_hiring_manager()) WITH CHECK (public.is_hiring_manager());
DROP POLICY IF EXISTS applications_self_delete ON public.applicant;
CREATE POLICY applications_self_delete ON public.applicant FOR UPDATE TO authenticated USING (user_id=auth.uid() AND NOT is_deleted) WITH CHECK (user_id=auth.uid() AND is_deleted);
-- Applications and resume uploads are inserted only by the authenticated server handler,
-- using its secret key so applicants cannot forge compatibility scores or ownership.
INSERT INTO storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
VALUES ('resumes','resumes',false,10485760,ARRAY['application/pdf','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/msword','text/plain','application/octet-stream'])
ON CONFLICT (id) DO UPDATE SET public=false,file_size_limit=10485760,allowed_mime_types=EXCLUDED.allowed_mime_types;
DROP POLICY IF EXISTS high5_manager_resumes ON storage.objects;
CREATE POLICY high5_manager_resumes ON storage.objects FOR SELECT TO authenticated USING (bucket_id='resumes' AND public.is_hiring_manager());
