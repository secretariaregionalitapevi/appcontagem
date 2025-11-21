-- ============================================
-- SCRIPT DE ALTERAÇÃO: Ajustar tabela cadastro
-- existente para compatibilidade com o CSV
-- ============================================

-- Tornar comum nullable (se ainda não for)
ALTER TABLE public.cadastro 
ALTER COLUMN comum DROP NOT NULL;

-- Tornar cargo nullable (se ainda não for)
ALTER TABLE public.cadastro 
ALTER COLUMN cargo DROP NOT NULL;

-- Adicionar coluna localidade se não existir
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'cadastro' 
    AND column_name = 'localidade'
  ) THEN
    ALTER TABLE public.cadastro ADD COLUMN localidade text NULL;
  END IF;
END $$;

-- Atualizar comum com localidade onde comum está vazio
UPDATE public.cadastro 
SET comum = localidade 
WHERE (comum IS NULL OR comum = '') 
AND (localidade IS NOT NULL AND localidade != '');

