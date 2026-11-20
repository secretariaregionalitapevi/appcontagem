-- Inclusao/atualizacao de cooperadores confirmados em 10/09/2026.
-- Este script pode ser executado novamente sem duplicar o cadastro de Rafael.

BEGIN;

-- Rafael ja esta cadastrado como musico/clarinetista em Jardim Alabama.
-- Preserva o cadastro musical e acrescenta seu ministerio em uma nova linha.
INSERT INTO public.cadastro (
  id,
  nome,
  instrumento,
  comum,
  cidade,
  cargo,
  nivel
)
SELECT
  gen_random_uuid(),
  'RAFAEL PEDROSO VITOLO',
  NULL,
  'BR-22-3062 - JARDIM ALABAMA',
  'ITAPEVI',
  'COOPERADOR DE JOVENS',
  NULL
WHERE NOT EXISTS (
  SELECT 1
  FROM public.cadastro
  WHERE UPPER(TRIM(nome)) = 'RAFAEL PEDROSO VITOLO'
    AND comum = 'BR-22-3062 - JARDIM ALABAMA'
    AND cargo = 'COOPERADOR DE JOVENS'
);

-- Daniel ja possui um cadastro ministerial. Atualiza a linha existente,
-- transferindo comum e ministerio sem criar uma segunda identidade.
UPDATE public.cadastro
SET
  comum = 'BR-22-2093 - ALTO DA COLINA - COHAB',
  cidade = 'ITAPEVI',
  cargo = 'COOPERADOR DO OFÍCIO',
  instrumento = NULL,
  nivel = NULL
WHERE id = 'ae4b1d93-9584-4dfe-9e78-93e255d741df'
  AND UPPER(TRIM(nome)) = 'DANIEL MOREIRA';

-- Conferencia final: devem aparecer tres linhas:
-- Rafael como musico e Cooperador de Jovens; Daniel como Cooperador do Oficio.
SELECT
  id,
  nome,
  instrumento,
  comum,
  cidade,
  cargo,
  nivel
FROM public.cadastro
WHERE UPPER(TRIM(nome)) IN (
  'RAFAEL PEDROSO VITOLO',
  'DANIEL MOREIRA'
)
ORDER BY nome, cargo;

COMMIT;
