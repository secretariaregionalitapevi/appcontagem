-- Correcoes de comuns duplicadas/variantes na tabela public.cadastro.
-- Referencia: manter a grafia/codigo majoritario, com excecoes confirmadas:
-- - ALPHAVILLE permanece BR-21-1251
-- - CAPELA VELHA - SURU permanece BR-21-1303
-- - PEDRAS deve ficar BR-22-0424 - PEDRAS - COTIA
-- - PARQUE SANTANA deve ficar PARQUE SANTANA I / II

BEGIN;

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
  'BR-22-3396%'
])
GROUP BY comum, cidade
ORDER BY comum, cidade;
