-- Corrige a cidade/municipio dos lancamentos antigos da EBI
-- usando a tabela oficial public.comum como fonte principal.
-- Compativel com variacoes de nomes de colunas comuns na tabela comum.

CREATE EXTENSION IF NOT EXISTS unaccent;

DO $$
DECLARE
    v_nome_col TEXT;
    v_cidade_col TEXT;
    v_sql TEXT;
BEGIN
    SELECT column_name
    INTO v_nome_col
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'comum'
      AND column_name IN ('nome', 'comum', 'nome_comum', 'descricao', 'description', 'name')
    ORDER BY CASE column_name
        WHEN 'nome' THEN 1
        WHEN 'comum' THEN 2
        WHEN 'nome_comum' THEN 3
        WHEN 'name' THEN 4
        WHEN 'descricao' THEN 5
        WHEN 'description' THEN 6
        ELSE 99
    END
    LIMIT 1;

    SELECT column_name
    INTO v_cidade_col
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'comum'
      AND column_name IN (
          'cidade',
          'municipio',
          'cidade_nome',
          'municipio_nome',
          'nome_municipio',
          'nome_cidade',
          'cidade_comum',
          'municipio_comum',
          'regional_cidade',
          'regional_municipio'
      )
    ORDER BY CASE column_name
        WHEN 'cidade' THEN 1
        WHEN 'municipio' THEN 2
        WHEN 'cidade_nome' THEN 3
        WHEN 'municipio_nome' THEN 4
        WHEN 'nome_municipio' THEN 5
        WHEN 'nome_cidade' THEN 6
        WHEN 'cidade_comum' THEN 7
        WHEN 'municipio_comum' THEN 8
        WHEN 'regional_cidade' THEN 9
        WHEN 'regional_municipio' THEN 10
        ELSE 99
    END
    LIMIT 1;

    IF v_nome_col IS NULL OR v_cidade_col IS NULL THEN
        RAISE NOTICE 'Tabela public.comum sem colunas compativeis para backfill. Nome: %, Cidade: %', v_nome_col, v_cidade_col;
        RETURN;
    END IF;

    v_sql := format($f$
        WITH comum_normalizada AS (
            SELECT
                %1$I AS nome_comum,
                %2$I AS cidade_comum,
                regexp_replace(
                    upper(unaccent(coalesce(%1$I, ''))),
                    '\s+',
                    ' ',
                    'g'
                ) AS nome_normalizado,
                CASE
                    WHEN upper(unaccent(coalesce(%2$I, ''))) LIKE '%%CAUCAIA%%' THEN 'CAUCAIA DO ALTO'
                    WHEN upper(unaccent(coalesce(%2$I, ''))) LIKE '%%COTIA%%' THEN 'COTIA'
                    WHEN upper(unaccent(coalesce(%2$I, ''))) LIKE '%%ITAPEVI%%' THEN 'ITAPEVI'
                    WHEN upper(unaccent(coalesce(%2$I, ''))) LIKE '%%JANDIRA%%' THEN 'JANDIRA'
                    WHEN upper(unaccent(coalesce(%2$I, ''))) LIKE '%%PIRAPORA%%' THEN 'PIRAPORA DO BOM JESUS'
                    WHEN upper(unaccent(coalesce(%2$I, ''))) LIKE '%%SANTANA%%'
                         AND upper(unaccent(coalesce(%2$I, ''))) LIKE '%%PARNA%%' THEN 'SANTANA DE PARNAIBA'
                    WHEN upper(unaccent(coalesce(%2$I, ''))) LIKE '%%VARGEM%%'
                         AND upper(unaccent(coalesce(%2$I, ''))) LIKE '%%PAULISTA%%' THEN 'VARGEM GRANDE PAULISTA'
                    ELSE NULL
                END AS cidade_oficial
            FROM public.comum
            WHERE nullif(trim(coalesce(%1$I::text, '')), '') IS NOT NULL
        ),
        comum_match AS (
            SELECT
                a.id,
                coalesce(
                    (
                        SELECT c.cidade_oficial
                        FROM comum_normalizada c
                        WHERE c.cidade_oficial IS NOT NULL
                          AND regexp_replace(
                              upper(unaccent(coalesce(a.localidade, ''))),
                              '\s+',
                              ' ',
                              'g'
                          ) LIKE '%%' || c.nome_normalizado || '%%'
                        ORDER BY length(c.nome_normalizado) DESC
                        LIMIT 1
                    ),
                    CASE
                        WHEN upper(unaccent(coalesce(a.localidade, ''))) LIKE '%%PORTAO VERMELHO%%' THEN 'VARGEM GRANDE PAULISTA'
                        WHEN upper(unaccent(coalesce(a.localidade, ''))) LIKE '%%PARQUE DO AGRESTE%%' THEN 'VARGEM GRANDE PAULISTA'
                        WHEN upper(unaccent(coalesce(a.localidade, ''))) LIKE '%%JANDIRA - CENTRAL%%' THEN 'JANDIRA'
                        WHEN upper(unaccent(coalesce(a.localidade, ''))) LIKE '%%JANDIRA%%' THEN 'JANDIRA'
                        WHEN upper(unaccent(coalesce(a.localidade, ''))) LIKE '%%NOVA PIRAPORA%%' THEN 'PIRAPORA DO BOM JESUS'
                        WHEN upper(unaccent(coalesce(a.localidade, ''))) LIKE '%%JABOTICABEIRA%%' THEN 'SANTANA DE PARNAIBA'
                        WHEN upper(unaccent(coalesce(a.localidade, ''))) LIKE '%%VILA DOUTOR CARDOSO%%' THEN 'ITAPEVI'
                        ELSE NULL
                    END
                ) AS cidade_corrigida
            FROM public.ebi_atividades a
        )
        UPDATE public.ebi_atividades AS a
        SET cidade = m.cidade_corrigida
        FROM comum_match AS m
        WHERE a.id = m.id
          AND m.cidade_corrigida IS NOT NULL
          AND coalesce(a.cidade, '') IS DISTINCT FROM m.cidade_corrigida;
    $f$, v_nome_col, v_cidade_col);

    EXECUTE v_sql;
END $$;
