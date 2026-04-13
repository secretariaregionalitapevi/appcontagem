-- Migration: Professional Security & Audit System (v3)
-- Project: SISTEMA REG-IT (Inspinia)

-- 1. Ensure access_levels table exists
CREATE EXTENSION IF NOT EXISTS unaccent;

CREATE TABLE IF NOT EXISTS public.access_levels (
    id INT PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    description TEXT,
    level_order INT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Populate access_levels (if not already populated)
-- 2. Populate access_levels (incluindo 'Membro' para bater com o legado)
INSERT INTO public.access_levels (id, name, description, level_order)
VALUES 
    (1, 'Master', 'Acesso total ao sistema - administradores gerais', 1),
    (2, 'Admin', 'Administradores regionais', 2),
    (3, 'Coordenador', 'Coordenadores - acesso a exportação', 3),
    (4, 'Instrutor', 'Instrutores - lançamentos e cadastros', 4),
    (5, 'Músico', 'Músicos - leitura básica', 5),
    (6, 'Candidato', 'Candidatos / Inscrição', 6),
    (7, 'Membro', 'Membro padrão (legado)', 7)
ON CONFLICT (id) DO UPDATE SET 
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    level_order = EXCLUDED.level_order;

-- 2.1. Ensure sectors table exists for the "List" in Supabase
CREATE TABLE IF NOT EXISTS public.sectors (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2.2. Populate sectors (ajustado para bater com os dados existentes no banco)
INSERT INTO public.sectors (name, description)
VALUES 
    ('Global', 'Acesso global do sistema para perfil Master'),
    ('Administrativo', 'Acesso administrativo do sistema para perfil Admin'),
    ('Musicalizacao', 'Setor de Musicalização Infantil'),
    ('Musica', 'Setor de Música Geral'),
    ('Ebi', 'Espaço Bíblico Infantil'),
    ('RJM', 'Reunião de Jovens e Menores'),
    ('Visitas', 'Setor de Visitas e Atendimentos'),
    ('Darpe', 'Administração Regional I (DARPE)'),
    ('Depac', 'Administração Regional II (DEPAC)'),
    ('Gem', 'Gestão de Ensino Musical'),
    ('Inscrição', 'Setor Inicial para Novos Cadastros')
ON CONFLICT (name) DO NOTHING;

-- 3. Create audit_logs table
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    action VARCHAR(100) NOT NULL, -- e.g., 'LOGIN', 'LOGOUT', 'VIEW_PAGE', 'INSERT_RECORD', 'DELETE_RECORD'
    module VARCHAR(50), -- e.g., 'EBI', 'MUSICALIZACAO', 'GLOBAL'
    details JSONB, -- dynamic details like { table: 'ebi_atividades', id: 123 }
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id_created_at
    ON public.audit_logs (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_logs_action_created_at
    ON public.audit_logs (action, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_logs_module_created_at
    ON public.audit_logs (module, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_logs_details_gin
    ON public.audit_logs
    USING GIN (details);

-- 3.1. Ensure profiles table exists with the minimum legacy + current structure
CREATE TABLE IF NOT EXISTS public.profiles (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT,
    role TEXT DEFAULT 'Candidato',
    comum TEXT,
    role_id INT DEFAULT 6 REFERENCES public.access_levels(id),
    sector TEXT DEFAULT 'Inscrição',
    status TEXT DEFAULT 'pending',
    cargo TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Update profiles table with security fields
DO $$ 
BEGIN 
    -- Add user_id
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'profiles' AND COLUMN_NAME = 'user_id') THEN
        ALTER TABLE public.profiles ADD COLUMN user_id UUID REFERENCES auth.users(id);
    END IF;

    -- Add full_name
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'profiles' AND COLUMN_NAME = 'full_name') THEN
        ALTER TABLE public.profiles ADD COLUMN full_name TEXT;
    END IF;

    -- Add legacy role
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'profiles' AND COLUMN_NAME = 'role') THEN
        ALTER TABLE public.profiles ADD COLUMN role TEXT DEFAULT 'Candidato';
    END IF;

    -- Add comum
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'profiles' AND COLUMN_NAME = 'comum') THEN
        ALTER TABLE public.profiles ADD COLUMN comum TEXT;
    END IF;

    -- Add role_id
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'profiles' AND COLUMN_NAME = 'role_id') THEN
        ALTER TABLE public.profiles ADD COLUMN role_id INT DEFAULT 6 REFERENCES public.access_levels(id);
    END IF;

    -- Add sector
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'profiles' AND COLUMN_NAME = 'sector') THEN
        ALTER TABLE public.profiles ADD COLUMN sector TEXT DEFAULT 'Inscrição';
    END IF;

    -- Add status
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'profiles' AND COLUMN_NAME = 'status') THEN
        ALTER TABLE public.profiles ADD COLUMN status TEXT DEFAULT 'pending';
    END IF;

    -- Add cargo
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'profiles' AND COLUMN_NAME = 'cargo') THEN
        ALTER TABLE public.profiles ADD COLUMN cargo TEXT;
    END IF;

    -- Add avatar_url
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'profiles' AND COLUMN_NAME = 'avatar_url') THEN
        ALTER TABLE public.profiles ADD COLUMN avatar_url TEXT;
    END IF;
END $$;

ALTER TABLE public.profiles
    ALTER COLUMN role SET DEFAULT 'Candidato',
    ALTER COLUMN role_id SET DEFAULT 6,
    ALTER COLUMN sector SET DEFAULT 'Inscrição',
    ALTER COLUMN status SET DEFAULT 'pending';

UPDATE public.profiles
SET
    role = COALESCE(NULLIF(role, ''), 'Candidato'),
    role_id = COALESCE(role_id, 6),
    sector = COALESCE(NULLIF(sector, ''), 'Inscrição'),
    status = COALESCE(NULLIF(status, ''), 'pending')
WHERE
    role IS NULL
    OR role_id IS NULL
    OR sector IS NULL
    OR btrim(sector) = ''
    OR status IS NULL
    OR btrim(status) = '';

UPDATE public.profiles
SET
    role_id = CASE
        WHEN lower(unaccent(coalesce(role, ''))) = 'master' THEN 1
        WHEN lower(unaccent(coalesce(role, ''))) = 'admin' THEN 2
        WHEN lower(unaccent(coalesce(role, ''))) IN ('coordenador', 'coordinator') THEN 3
        WHEN lower(unaccent(coalesce(role, ''))) = 'instrutor' THEN 4
        WHEN lower(unaccent(coalesce(role, ''))) = 'musico' THEN 5
        WHEN lower(unaccent(coalesce(role, ''))) = 'candidato' THEN 6
        WHEN lower(unaccent(coalesce(role, ''))) IN ('membro', 'member') THEN 7
        ELSE role_id
    END,
    sector = CASE
        WHEN lower(unaccent(coalesce(role, ''))) = 'master' THEN 'Global'
        WHEN lower(unaccent(coalesce(role, ''))) = 'admin' THEN 'Administrativo'
        WHEN role_id = 1 THEN 'Global'
        WHEN role_id = 2 THEN 'Administrativo'
        WHEN lower(unaccent(coalesce(sector, ''))) = 'musicalizacao' THEN 'Musicalizacao'
        WHEN lower(unaccent(coalesce(sector, ''))) = 'musica' THEN 'Musica'
        WHEN lower(unaccent(coalesce(sector, ''))) = 'ebi' THEN 'Ebi'
        WHEN lower(unaccent(coalesce(sector, ''))) = 'rjm' THEN 'RJM'
        WHEN lower(unaccent(coalesce(sector, ''))) = 'visitas' THEN 'Visitas'
        WHEN lower(unaccent(coalesce(sector, ''))) = 'darpe' THEN 'Darpe'
        WHEN lower(unaccent(coalesce(sector, ''))) = 'depac' THEN 'Depac'
        WHEN lower(unaccent(coalesce(sector, ''))) = 'gem' THEN 'Gem'
        WHEN lower(unaccent(coalesce(sector, ''))) = 'inscricao' THEN 'Inscrição'
        ELSE sector
    END
WHERE role IS NOT NULL
   OR sector IS NOT NULL;

UPDATE public.profiles
SET
    role = CASE COALESCE(role_id, 6)
        WHEN 1 THEN 'Master'
        WHEN 2 THEN 'Admin'
        WHEN 3 THEN 'Coordenador'
        WHEN 4 THEN 'Instrutor'
        WHEN 5 THEN 'Músico'
        WHEN 6 THEN 'Candidato'
        WHEN 7 THEN 'Membro'
        ELSE COALESCE(NULLIF(role, ''), 'Candidato')
    END,
    sector = CASE COALESCE(role_id, 6)
        WHEN 1 THEN 'Global'
        WHEN 2 THEN 'Administrativo'
        ELSE CASE
            WHEN lower(unaccent(coalesce(sector, ''))) = 'administrativo' THEN 'Administrativo'
            WHEN lower(unaccent(coalesce(sector, ''))) = 'musicalizacao' THEN 'Musicalizacao'
            WHEN lower(unaccent(coalesce(sector, ''))) = 'musica' THEN 'Musica'
            WHEN lower(unaccent(coalesce(sector, ''))) = 'ebi' THEN 'Ebi'
            WHEN lower(unaccent(coalesce(sector, ''))) = 'rjm' THEN 'RJM'
            WHEN lower(unaccent(coalesce(sector, ''))) = 'visitas' THEN 'Visitas'
            WHEN lower(unaccent(coalesce(sector, ''))) = 'darpe' THEN 'Darpe'
            WHEN lower(unaccent(coalesce(sector, ''))) = 'depac' THEN 'Depac'
            WHEN lower(unaccent(coalesce(sector, ''))) = 'gem' THEN 'Gem'
            ELSE 'Inscrição'
        END
    END,
    status = CASE
        WHEN lower(unaccent(coalesce(status, ''))) IN ('approved', 'aprovado') THEN 'approved'
        WHEN lower(unaccent(coalesce(status, ''))) IN ('rejected', 'rejeitado') THEN 'rejected'
        ELSE 'pending'
    END;

CREATE OR REPLACE FUNCTION public.normalize_profile_access_fields()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.role_id := COALESCE(NEW.role_id, CASE
        WHEN lower(unaccent(coalesce(NEW.role, ''))) = 'master' THEN 1
        WHEN lower(unaccent(coalesce(NEW.role, ''))) = 'admin' THEN 2
        WHEN lower(unaccent(coalesce(NEW.role, ''))) IN ('coordenador', 'coordinator') THEN 3
        WHEN lower(unaccent(coalesce(NEW.role, ''))) = 'instrutor' THEN 4
        WHEN lower(unaccent(coalesce(NEW.role, ''))) = 'musico' THEN 5
        WHEN lower(unaccent(coalesce(NEW.role, ''))) = 'candidato' THEN 6
        WHEN lower(unaccent(coalesce(NEW.role, ''))) IN ('membro', 'member') THEN 7
        ELSE 6
    END);

    NEW.role := CASE COALESCE(NEW.role_id, 6)
        WHEN 1 THEN 'Master'
        WHEN 2 THEN 'Admin'
        WHEN 3 THEN 'Coordenador'
        WHEN 4 THEN 'Instrutor'
        WHEN 5 THEN 'Músico'
        WHEN 6 THEN 'Candidato'
        WHEN 7 THEN 'Membro'
        ELSE 'Candidato'
    END;

    NEW.sector := CASE COALESCE(NEW.role_id, 6)
        WHEN 1 THEN 'Global'
        WHEN 2 THEN 'Administrativo'
        ELSE CASE
            WHEN lower(unaccent(coalesce(NEW.sector, ''))) = 'administrativo' THEN 'Administrativo'
            WHEN lower(unaccent(coalesce(NEW.sector, ''))) = 'musicalizacao' THEN 'Musicalizacao'
            WHEN lower(unaccent(coalesce(NEW.sector, ''))) = 'musica' THEN 'Musica'
            WHEN lower(unaccent(coalesce(NEW.sector, ''))) = 'ebi' THEN 'Ebi'
            WHEN lower(unaccent(coalesce(NEW.sector, ''))) = 'rjm' THEN 'RJM'
            WHEN lower(unaccent(coalesce(NEW.sector, ''))) = 'visitas' THEN 'Visitas'
            WHEN lower(unaccent(coalesce(NEW.sector, ''))) = 'darpe' THEN 'Darpe'
            WHEN lower(unaccent(coalesce(NEW.sector, ''))) = 'depac' THEN 'Depac'
            WHEN lower(unaccent(coalesce(NEW.sector, ''))) = 'gem' THEN 'Gem'
            ELSE 'Inscrição'
        END
    END;

    NEW.status := CASE
        WHEN lower(unaccent(coalesce(NEW.status, ''))) IN ('approved', 'aprovado') THEN 'approved'
        WHEN lower(unaccent(coalesce(NEW.status, ''))) IN ('rejected', 'rejeitado') THEN 'rejected'
        ELSE 'pending'
    END;

    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS normalize_profile_access_fields_trigger ON public.profiles;
CREATE TRIGGER normalize_profile_access_fields_trigger
BEFORE INSERT OR UPDATE OF role, role_id, sector, status
ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.normalize_profile_access_fields();

-- 5. Audit Retention Function (Deletes logs older than 90 days)
CREATE OR REPLACE FUNCTION public.clean_audit_logs() 
RETURNS void AS $$
BEGIN
    DELETE FROM public.audit_logs WHERE created_at < NOW() - INTERVAL '90 days';
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.get_public_dashboard_summary()
RETURNS TABLE (
    comuns_count BIGINT,
    usuarios_count BIGINT,
    candidatos_count BIGINT,
    municipios_count INT,
    municipios TEXT[],
    musicos_count BIGINT,
    organistas_count BIGINT,
    total_tocam_count BIGINT,
    igrejas_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT
        COALESCE((
            SELECT COUNT(DISTINCT p.comum)
            FROM public.profiles p
            WHERE NULLIF(BTRIM(p.comum), '') IS NOT NULL
        ), 0)::BIGINT AS comuns_count,
        COALESCE((
            SELECT COUNT(*)
            FROM public.profiles p
        ), 0)::BIGINT AS usuarios_count,
        COALESCE((
            SELECT COUNT(*)
            FROM public.profiles p
            WHERE COALESCE(p.role_id, 6) = 6
        ), 0)::BIGINT AS candidatos_count,
        7::INT AS municipios_count,
        ARRAY[
            'Caucaia do Alto',
            'Cotia',
            'Itapevi',
            'Jandira',
            'Pirapora do Bom Jesus',
            'Santana de Parnaiba',
            'Vargem Grande Paulista'
        ]::TEXT[] AS municipios,
        NULL::BIGINT AS musicos_count,
        NULL::BIGINT AS organistas_count,
        NULL::BIGINT AS total_tocam_count,
        COALESCE((
            SELECT COUNT(DISTINCT p.comum)
            FROM public.profiles p
            WHERE NULLIF(BTRIM(p.comum), '') IS NOT NULL
        ), 0)::BIGINT AS igrejas_count;
END;
$$;

-- 6. Trigger to automatically clean logs on every new log (stochastic or manual)
-- For simplicity, we can call this via an Edge Function or just a scheduled task.
-- Alternatively, we can just run it occasionally.

-- 7. Add Comment
COMMENT ON TABLE public.audit_logs IS 'Professional security audit trail for REG-IT system.';

-- 8. Enable RLS and define policies
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- 8.1. Policy: Anyone authenticated can INSERT their own logs
DROP POLICY IF EXISTS "Allow insert for all authenticated users" ON public.audit_logs;
CREATE POLICY "Allow insert for all authenticated users" 
ON public.audit_logs 
FOR INSERT 
TO authenticated 
WITH CHECK (true); -- Permitimos o insert para que qualquer ação do sistema seja gravada

-- 9. Security Function to avoid RLS Recursion
CREATE OR REPLACE FUNCTION public.get_my_role_id() 
RETURNS int AS $$
  -- SECURITY DEFINER ignora o RLS nesta consulta interna
  SELECT role_id FROM public.profiles WHERE user_id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

DROP POLICY IF EXISTS "Only Master can delete profiles" ON public.profiles;
CREATE POLICY "Only Master can delete profiles"
ON public.profiles
FOR DELETE
TO authenticated
USING (public.get_my_role_id() = 1);

-- 10. Audit Logs RLS Fix
DROP POLICY IF EXISTS "Allow select for Master and Admin only" ON public.audit_logs;
CREATE POLICY "Allow select for Master and Admin only" 
ON public.audit_logs 
FOR SELECT 
TO authenticated 
USING (public.get_my_role_id() <= 2);

-- 11. Profiles RLS Update (Fixing recursion)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile" 
ON public.profiles 
FOR SELECT 
TO authenticated 
USING (auth.uid() = user_id OR public.get_my_role_id() <= 2);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile" 
ON public.profiles 
FOR UPDATE 
TO authenticated 
USING (auth.uid() = user_id OR public.get_my_role_id() <= 2)
WITH CHECK (auth.uid() = user_id OR public.get_my_role_id() <= 2);

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- 12. Trigger seguro para criar perfil automaticamente ao cadastrar no Auth
-- Evita o erro "Database error saving new user" quando o perfil não é criado
-- corretamente por bloqueio de RLS, ausência de trigger ou falha na rotina.
CREATE OR REPLACE FUNCTION public.handle_new_user_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_full_name TEXT;
    v_comum TEXT;
    v_has_role BOOLEAN;
BEGIN
    v_full_name := COALESCE(
        NEW.raw_user_meta_data->>'full_name',
        NEW.raw_user_meta_data->>'name',
        split_part(NEW.email, '@', 1)
    );
    v_comum := COALESCE(
        NULLIF(NEW.raw_user_meta_data->>'comum', ''),
        NULLIF(NEW.raw_user_meta_data->>'comum_congregacao', '')
    );

    SELECT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'profiles'
          AND column_name = 'role'
    ) INTO v_has_role;

    IF EXISTS (
        SELECT 1
        FROM public.profiles
        WHERE user_id = NEW.id
    ) THEN
        UPDATE public.profiles
        SET
            full_name = COALESCE(NULLIF(public.profiles.full_name, ''), v_full_name),
            comum = COALESCE(NULLIF(public.profiles.comum, ''), v_comum),
            role = CASE
                WHEN v_has_role THEN COALESCE(NULLIF(public.profiles.role, ''), 'Candidato')
                ELSE public.profiles.role
            END,
            role_id = COALESCE(public.profiles.role_id, 6),
            sector = COALESCE(NULLIF(public.profiles.sector, ''), 'Inscrição'),
            status = COALESCE(NULLIF(public.profiles.status, ''), 'pending')
        WHERE user_id = NEW.id;
    ELSE
        INSERT INTO public.profiles (
            user_id,
            full_name,
            comum,
            role,
            role_id,
            sector,
            status
        )
        VALUES (
            NEW.id,
            v_full_name,
            v_comum,
            'Candidato',
            6,
            'Inscrição',
            'pending'
        );
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_create_profile ON auth.users;
CREATE TRIGGER on_auth_user_created_create_profile
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user_profile();

COMMENT ON FUNCTION public.handle_new_user_profile() IS
'Cria ou completa automaticamente o perfil em public.profiles quando um usuário é criado em auth.users.';
