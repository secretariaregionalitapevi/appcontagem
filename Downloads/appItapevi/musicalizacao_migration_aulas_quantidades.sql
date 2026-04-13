-- Alinha o schema de musicalizacao_aulas com o front atual.
-- Pode ser executado com segurança mais de uma vez.

ALTER TABLE public.musicalizacao_aulas
    ADD COLUMN IF NOT EXISTS instrutores_presentes INTEGER DEFAULT 0;

ALTER TABLE public.musicalizacao_aulas
    ADD COLUMN IF NOT EXISTS colaboradores_presentes INTEGER DEFAULT 0;

ALTER TABLE public.musicalizacao_aulas
    ADD COLUMN IF NOT EXISTS coordenadores_presentes INTEGER DEFAULT 0;

UPDATE public.musicalizacao_aulas
SET instrutores_presentes = COALESCE(instrutores_presentes, 0),
    colaboradores_presentes = COALESCE(colaboradores_presentes, 0),
    coordenadores_presentes = COALESCE(coordenadores_presentes, 0);
