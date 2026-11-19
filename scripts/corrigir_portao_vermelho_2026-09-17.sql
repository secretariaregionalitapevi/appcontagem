-- Consolida as variantes da comum BR-22-0417 no nome oficial.
-- Nenhum membro e removido; somente o campo comum e padronizado.

BEGIN;

UPDATE public.cadastro
SET comum = 'BR-22-0417 - CENTRAL DE VGP - PORTÃO VERMELHO'
WHERE UPPER(TRIM(comum)) LIKE 'BR-22-0417%'
  AND TRIM(comum) <> 'BR-22-0417 - CENTRAL DE VGP - PORTÃO VERMELHO';

-- Interrompe a transacao se ainda restar alguma variante desse codigo.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.cadastro
    WHERE UPPER(TRIM(comum)) LIKE 'BR-22-0417%'
      AND TRIM(comum) <> 'BR-22-0417 - CENTRAL DE VGP - PORTÃO VERMELHO'
  ) THEN
    RAISE EXCEPTION 'Ainda existem variantes da comum BR-22-0417';
  END IF;
END
$$;

COMMIT;

-- Deve retornar uma unica linha, contendo todos os membros da comum.
SELECT comum, cidade, COUNT(*) AS membros
FROM public.cadastro
WHERE UPPER(TRIM(comum)) LIKE 'BR-22-0417%'
GROUP BY comum, cidade
ORDER BY comum, cidade;
