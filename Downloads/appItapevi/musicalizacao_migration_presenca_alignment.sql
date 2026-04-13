-- Alinha a tabela musicalizacao_presenca ao schema atual da Musicalizacao.
-- Resolve:
-- 1. FK antiga apontando para public.musicalizacao_alunos
-- 2. Falta das colunas status e observacoes
-- 3. Dados legados ainda presentes apenas em musicalizacao_alunos

BEGIN;

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

-- Se a tabela legada existir, copia os IDs antigos para a tabela atual
-- antes de religar a FK da presenca.
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = 'musicalizacao_alunos'
    ) THEN
        INSERT INTO public.musicalizacao_criancas (
            id,
            nome_crianca,
            sexo,
            data_nascimento,
            comum_congregacao,
            polo_participacao,
            nome_pai,
            pai_e_crente,
            nome_mae,
            mae_e_crente,
            pais_vivem_juntos,
            crianca_vive_com_os_pais,
            se_nao_vive_com_pais_com_quem_vive,
            nome_responsavel,
            celular_responsavel,
            tem_whatsapp,
            participa_reunioes_jovens_menores,
            participa_espaco_infantil,
            logradouro_numero,
            complemento,
            bairro,
            cidade,
            cep,
            dificuldade_aprendizagem,
            dificuldade_descricao,
            faz_terapia,
            terapia_especialidade,
            status,
            created_at
        )
        SELECT
            a.id,
            COALESCE(a.nome_aluno, a.nome, ''),
            a.sexo,
            CASE
                WHEN a.nascimento IS NULL THEN NULL
                ELSE TO_CHAR(a.nascimento, 'DD/MM/YYYY')
            END,
            a.comum_congregacao,
            a.polo,
            a.nome_pai,
            CASE WHEN a.pai_crente IS TRUE THEN 'Sim' WHEN a.pai_crente IS FALSE THEN 'Não' ELSE NULL END,
            a.nome_mae,
            CASE WHEN a.mae_crente IS TRUE THEN 'Sim' WHEN a.mae_crente IS FALSE THEN 'Não' ELSE NULL END,
            CASE WHEN a.pais_juntos IS TRUE THEN 'Sim' WHEN a.pais_juntos IS FALSE THEN 'Não' ELSE NULL END,
            CASE WHEN a.crianca_com_pais IS TRUE THEN 'Sim' WHEN a.crianca_com_pais IS FALSE THEN 'Não' ELSE NULL END,
            a.vive_com_quem,
            a.responsavel,
            a.celular_responsavel,
            CASE WHEN a.whatsapp IS TRUE THEN 'Sim' WHEN a.whatsapp IS FALSE THEN 'Não' ELSE NULL END,
            CASE WHEN a.reunioes IS TRUE THEN 'Sim' WHEN a.reunioes IS FALSE THEN 'Não' ELSE NULL END,
            CASE WHEN a.espaco_infantil IS TRUE THEN 'Sim' WHEN a.espaco_infantil IS FALSE THEN 'Não' ELSE NULL END,
            a.rua_numero,
            a.complemento,
            a.bairro,
            a.cidade,
            a.cep,
            CASE WHEN a.dificuldade_aprendizagem IS TRUE THEN 'Sim' WHEN a.dificuldade_aprendizagem IS FALSE THEN 'Não' ELSE NULL END,
            a.desc_dificuldade,
            CASE WHEN a.faz_terapia IS TRUE THEN 'Sim' WHEN a.faz_terapia IS FALSE THEN 'Não' ELSE NULL END,
            a.desc_terapia,
            'Ativo',
            a.created_at
        FROM public.musicalizacao_alunos a
        ON CONFLICT (id) DO NOTHING;
    END IF;
END $$;

DO $$
DECLARE
    fk_name text;
BEGIN
    SELECT tc.constraint_name
    INTO fk_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name
     AND tc.table_schema = kcu.table_schema
    WHERE tc.table_schema = 'public'
      AND tc.table_name = 'musicalizacao_presenca'
      AND tc.constraint_type = 'FOREIGN KEY'
      AND kcu.column_name = 'aluno_id'
    LIMIT 1;

    IF fk_name IS NOT NULL THEN
        EXECUTE format(
            'ALTER TABLE public.musicalizacao_presenca DROP CONSTRAINT %I',
            fk_name
        );
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.table_constraints
        WHERE table_schema = 'public'
          AND table_name = 'musicalizacao_presenca'
          AND constraint_name = 'musicalizacao_presenca_aluno_id_fkey'
    ) THEN
        ALTER TABLE public.musicalizacao_presenca
            ADD CONSTRAINT musicalizacao_presenca_aluno_id_fkey
            FOREIGN KEY (aluno_id)
            REFERENCES public.musicalizacao_criancas(id)
            ON DELETE CASCADE;
    END IF;
END $$;

COMMIT;
