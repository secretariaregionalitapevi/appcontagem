-- Atualiza a tabela de frequência da musicalização para o modelo com status por aluno.
-- Compatível com o padrão do APP_SAM.

ALTER TABLE public.musicalizacao_presenca
    ADD COLUMN IF NOT EXISTS status TEXT;

ALTER TABLE public.musicalizacao_presenca
    ADD COLUMN IF NOT EXISTS observacoes TEXT;

UPDATE public.musicalizacao_presenca
SET status = CASE
    WHEN presente IS TRUE THEN 'presente'
    ELSE 'faltou'
END
WHERE status IS NULL OR btrim(status) = '';

ALTER TABLE public.musicalizacao_presenca
    ALTER COLUMN status SET DEFAULT 'faltou';

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'musicalizacao_presenca_status_check'
    ) THEN
        ALTER TABLE public.musicalizacao_presenca
            ADD CONSTRAINT musicalizacao_presenca_status_check
            CHECK (status IN ('presente', 'faltou', 'justificado'));
    END IF;
END $$;
