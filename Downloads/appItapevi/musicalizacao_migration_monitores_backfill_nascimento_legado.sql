-- Garante a coluna de data de nascimento e documenta o tratamento dos cadastros legados.
-- Pode ser executado com segurança mais de uma vez.
-- Observação: quando o cadastro antigo possui apenas a coluna "idade" numérica,
-- não há informação suficiente para reconstruir a data de nascimento real.

ALTER TABLE public.musicalizacao_monitores
    ADD COLUMN IF NOT EXISTS data_nascimento TEXT;

COMMENT ON COLUMN public.musicalizacao_monitores.data_nascimento IS
    'Data de nascimento no formato dd/mm/aaaa. Cadastros antigos podem ter apenas a coluna idade preenchida.';

COMMENT ON COLUMN public.musicalizacao_monitores.idade IS
    'Campo legado. Mantido apenas para compatibilidade com cadastros antigos sem data_nascimento.';

-- Backfill defensivo apenas para casos excepcionais em que a coluna legado "idade"
-- tenha recebido indevidamente um valor em formato de data.
UPDATE public.musicalizacao_monitores
SET data_nascimento = trim(idade::text)
WHERE (data_nascimento IS NULL OR btrim(data_nascimento) = '')
  AND idade IS NOT NULL
  AND idade::text ~ '^\d{2}/\d{2}/\d{4}$';
