-- Alinha o cadastro de monitores/instrutores para usar data de nascimento.
-- Pode ser executado com segurança mais de uma vez.

ALTER TABLE public.musicalizacao_monitores
    ADD COLUMN IF NOT EXISTS data_nascimento TEXT;

COMMENT ON COLUMN public.musicalizacao_monitores.data_nascimento IS 'Data de nascimento no formato dd/mm/aaaa.';

