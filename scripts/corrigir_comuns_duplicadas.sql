-- Correcoes de comuns duplicadas/variantes na tabela public.cadastro.
-- Referencia: manter a grafia/codigo majoritario, com excecoes confirmadas:
-- - ALPHAVILLE permanece BR-21-1251
-- - CAPELA VELHA - SURU permanece BR-21-1303
-- - PEDRAS deve ficar BR-22-0424 - PEDRAS - COTIA
-- - PARQUE SANTANA deve ficar PARQUE SANTANA I / II
-- - FAZENDINHA (SANTANA DE PARNAIBA) deve ficar
--   BR-22-0272 - FAZENDINHA - STNA DE PARNAIBA
--
-- IMPORTANTE: as comuns exibidas no aplicativo sao derivadas dos valores da
-- coluna cadastro.comum. Nao apague registros da variante incorreta: mova os
-- membros para a grafia oficial.

BEGIN;

-- Aborta se o destino oficial nao existir, evitando consolidacao acidental em
-- um valor digitado incorretamente. U& mantem os literais Unicode portaveis.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.cadastro
    WHERE comum = U&'BR-22-0272 - FAZENDINHA - STNA DE PARNA\00CD BA'
      AND cidade = U&'SANTANA DE PARNA\00CD BA'
  ) THEN
    RAISE EXCEPTION
      'Comum oficial da Fazendinha nao encontrada; nenhuma alteracao foi aplicada';
  END IF;
END
$$;

-- Preserva id, nome, cargo, instrumento, nivel e todos os demais dados dos
-- membros. Somente comum/cidade sao corrigidas nas variantes inequivocas.
UPDATE public.cadastro
SET comum = U&'BR-22-0272 - FAZENDINHA - STNA DE PARNA\00CD BA',
    cidade = U&'SANTANA DE PARNA\00CD BA'
WHERE cidade ILIKE 'SANTANA DE PARNA%BA'
  AND comum IS NOT NULL
  AND comum <> U&'BR-22-0272 - FAZENDINHA - STNA DE PARNA\00CD BA'
  AND trim(upper(comum)) IN (
    'FAZENDINHA',
    'FAZENDINHA - SANTANA DE PARNAIBA',
    'FAZENDINHA - STNA DE PARNAIBA',
    'BR-22-0272 - FAZENDINHA',
    'BR-22-0272 - FAZENDINHA - SANTANA DE PARNAIBA'
  );

-- BR-22-0423 e exclusivamente CENTRAL - CAUCAIA DO ALTO.
UPDATE public.cadastro
SET comum = 'BR-22-0423 - CENTRAL - CAUCAIA DO ALTO'
WHERE comum LIKE 'BR-22-0423%';

UPDATE public.cadastro
SET comum = 'BR-21-1303 - CAPELA VELHA - SURU'
WHERE comum = 'BR-21-1251 - CAPELA VELHA - SURU';

UPDATE public.cadastro
SET comum = 'BR-22-0424 - PEDRAS - COTIA'
WHERE comum = 'BR-22-0424 - PEDRAS (CHÁCARA SANTA MARIA)';

UPDATE public.cadastro
SET comum = 'BR-22-2833 - PARQUE SANTANA I'
WHERE comum = 'BR-22-2833 - PARQUE SANTANA DE PARNAÍBA I';

UPDATE public.cadastro
SET comum = 'BR-22-2567 - PARQUE SANTANA II'
WHERE comum = 'BR-22-2567 - PARQUE SANTANA DE PARNAÍBA II';

UPDATE public.cadastro
SET comum = 'BR-21-1565 - PARQUE LARANJEIRAS II'
WHERE comum = 'BR-21-1565 - PARQUE LARANJEIRA II';

UPDATE public.cadastro
SET comum = 'BR-21-1588 - COLINAS DA ANHANGUERA II'
WHERE comum = 'BR-21-1588 - COLINAS DA ANHAGUERA II';

UPDATE public.cadastro
SET comum = 'BR-22-3193 - DOLORES PASCHOALLIN'
WHERE comum = 'BR-22-3193 - DOROLES PASCHOALIM';

UPDATE public.cadastro
SET comum = 'BR-22-2521 - COLINAS DA ANHANGUERA'
WHERE comum = 'BR-22-2521 - COLINAS DA ANHANGUERA I';

UPDATE public.cadastro
SET comum = 'BR-22-0676 - CURURUQUARA'
WHERE comum = 'BR-22-0676 - CURURUQUARA I';

UPDATE public.cadastro
SET comum = 'BR-22-1806 - ITAQUARA PARQUE'
WHERE comum = 'BR-22-1806 - ITAQUARA PARQUE - KM50';

UPDATE public.cadastro
SET comum = 'BR-22-2294 - JARDIM SANTA CECÍLIA - ITAPEVI'
WHERE comum = 'BR-22-2294 - JARDIM SANTA CECÍLIA';

UPDATE public.cadastro
SET comum = 'BR-22-3865 - JARDIM BANDEIRANTES'
WHERE comum = 'BR-22-3865 - JARDIM BANDEIRANTES - VOTUPARIM';

UPDATE public.cadastro
SET comum = 'BR-21-1312 - SITIO JOSÉ TEIXEIRA - ITAPEVI'
WHERE comum = 'BR-21-1312 - SÍTIO JOSÉ TEIXEIRA - ITAPEVI';

UPDATE public.cadastro
SET comum = 'BR-21-1481 - RECANTO DOS PASSAROS'
WHERE comum = 'BR-21-1481 - RECANTO DOS PÁSSAROS - JARDIM NOVA COTIA';

UPDATE public.cadastro
SET comum = 'BR-22-3396 - MORADAS SANTA FÉ'
WHERE comum = 'BR-21-1463 - MORADAS SANTA FÉ';

COMMIT;

-- Verificacao pos-correcao:
SELECT comum, cidade, COUNT(*) AS registros
FROM public.cadastro
WHERE comum ILIKE ANY (ARRAY[
  'BR-21-1251%',
  'BR-22-0423%',
  'BR-21-1303%',
  'BR-22-0424%',
  'BR-22-2833%',
  'BR-22-2567%',
  'BR-21-1565%',
  'BR-21-1588%',
  'BR-22-3193%',
  'BR-22-2521%',
  'BR-22-0676%',
  'BR-22-1806%',
  'BR-22-2294%',
  'BR-22-3865%',
  'BR-21-1312%',
  'BR-21-1481%',
  'BR-21-1463%',
  'BR-22-3396%',
  'BR-22-0272%',
  'FAZENDINHA%'
])
GROUP BY comum, cidade
ORDER BY comum, cidade;

-- Deve retornar zero linhas. Se retornar algo, ha uma variante nova que deve
-- ser analisada antes de ser consolidada; nao a apague.
SELECT comum, cidade, COUNT(*) AS membros_a_revisar
FROM public.cadastro
WHERE cidade ILIKE 'SANTANA DE PARNA%BA'
  AND comum ILIKE '%FAZENDINHA%'
  AND comum <> U&'BR-22-0272 - FAZENDINHA - STNA DE PARNA\00CD BA'
GROUP BY comum, cidade
ORDER BY comum;
