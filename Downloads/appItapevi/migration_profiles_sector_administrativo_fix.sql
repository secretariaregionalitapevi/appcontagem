-- Permite que perfis nao-Admin tambem mantenham o setor "Administrativo"
-- quando esse setor for escolhido explicitamente na tabela profiles.

CREATE EXTENSION IF NOT EXISTS unaccent;

UPDATE public.profiles
SET sector = 'Administrativo'
WHERE lower(unaccent(coalesce(sector, ''))) = 'administrativo';

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
