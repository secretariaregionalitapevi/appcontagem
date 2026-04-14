-- Corrige divergências de schema da Musicalização entre o front atual e o banco.
-- Pode ser executado com segurança mais de uma vez.

ALTER TABLE public.musicalizacao_criancas
    ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Ativo';

UPDATE public.musicalizacao_criancas
SET status = 'Ativo'
WHERE status IS NULL OR btrim(status) = '';

ALTER TABLE public.musicalizacao_monitores
    ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Ativo';

UPDATE public.musicalizacao_monitores
SET status = 'Ativo'
WHERE status IS NULL OR btrim(status) = '';
