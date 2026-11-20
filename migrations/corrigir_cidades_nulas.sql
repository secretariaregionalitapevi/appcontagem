  -- Correcoes de cidade nula/vazia na tabela public.cadastro.
  -- Confirmado pelo usuario:
  -- - BR-22-3950 - SITIO LAJEADO => SANTANA DE PARNAIBA

  BEGIN;

  UPDATE public.cadastro
  SET cidade = 'SANTANA DE PARNAÍBA'
  WHERE comum = 'BR-22-3950 - SITIO LAJEADO'
    AND (cidade IS NULL OR cidade = '');

  UPDATE public.cadastro
  SET cidade = 'COTIA'
  WHERE comum = 'BR-22-2797 - LAGEADO - COTIA'
    AND (cidade IS NULL OR cidade = '');

  UPDATE public.cadastro
  SET cidade = 'CAUCAIA DO ALTO'
  WHERE comum = 'BR-21-1390 - JARDIM SÃO LUIZ - CAUCAIA - COTIA'
    AND (cidade IS NULL OR cidade = '');

  COMMIT;

  -- Verificacao pos-correcao dos casos confirmados:
  SELECT comum, cidade, COUNT(*) AS registros
  FROM public.cadastro
  WHERE comum IN (
    'BR-22-3950 - SITIO LAJEADO',
    'BR-22-2797 - LAGEADO - COTIA',
    'BR-21-1390 - JARDIM SÃO LUIZ - CAUCAIA - COTIA'
  )
  GROUP BY comum, cidade
  ORDER BY comum, cidade NULLS FIRST;

  -- Relatorio geral de registros ainda sem cidade:
  SELECT comum, COUNT(*) AS registros
  FROM public.cadastro
  WHERE cidade IS NULL OR cidade = ''
  GROUP BY comum
  ORDER BY registros DESC, comum;
