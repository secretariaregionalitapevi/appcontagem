-- ============================================
-- SOLUÇÃO: Adicionar colunas em MAIÚSCULAS
-- para compatibilidade com CSV
-- ============================================

-- Adicionar colunas em maiúsculas se não existirem
DO $$ 
BEGIN
  -- Adicionar NOME (se não existir)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'cadastro' 
    AND column_name = 'NOME'
  ) THEN
    ALTER TABLE public.cadastro ADD COLUMN "NOME" text;
    -- Criar trigger para sincronizar NOME com nome
  END IF;
  
  -- Adicionar INSTRUMENTO (se não existir)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'cadastro' 
    AND column_name = 'INSTRUMENTO'
  ) THEN
    ALTER TABLE public.cadastro ADD COLUMN "INSTRUMENTO" text;
  END IF;
  
  -- Adicionar LOCALIDADE (se não existir)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'cadastro' 
    AND column_name = 'LOCALIDADE'
  ) THEN
    ALTER TABLE public.cadastro ADD COLUMN "LOCALIDADE" text;
  END IF;
  
  -- Adicionar CIDADE (se não existir)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'cadastro' 
    AND column_name = 'CIDADE'
  ) THEN
    ALTER TABLE public.cadastro ADD COLUMN "CIDADE" text;
  END IF;
END $$;

-- Atualizar função de normalização para sincronizar maiúsculas/minúsculas
CREATE OR REPLACE FUNCTION public.set_norm_cadastro()
RETURNS TRIGGER AS $$
BEGIN
  -- Sincronizar maiúsculas com minúsculas
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    NEW.nome := COALESCE(NEW."NOME", NEW.nome);
    NEW."NOME" := NEW.nome;
    
    NEW.instrumento := COALESCE(NEW."INSTRUMENTO", NEW.instrumento);
    NEW."INSTRUMENTO" := NEW.instrumento;
    
    NEW.localidade := COALESCE(NEW."LOCALIDADE", NEW.localidade);
    NEW."LOCALIDADE" := NEW.localidade;
    
    NEW.cidade := COALESCE(NEW."CIDADE", NEW.cidade);
    NEW."CIDADE" := NEW.cidade;
  END IF;
  
  -- Limpa caracteres especiais
  NEW.nome := regexp_replace(NEW.nome, '[^\x20-\x7E\xC0-\xFF]', '', 'g');
  NEW.instrumento := regexp_replace(NEW.instrumento, '[^\x20-\x7E\xC0-\xFF]', '', 'g');
  NEW.localidade := regexp_replace(NEW.localidade, '[^\x20-\x7E\xC0-\xFF]', '', 'g');
  NEW.cidade := regexp_replace(NEW.cidade, '[^\x20-\x7E\xC0-\xFF]', '', 'g');
  
  -- Normaliza nome
  NEW.nome_norm := upper(trim(regexp_replace(
    translate(
      COALESCE(NEW.nome, ''),
      'áàâãäéèêëíìîïóòôõöúùûüçÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇ',
      'aaaaaeeeeiiiooooouuuucAAAAAEEEEIIIOOOOOUUUUC'
    ),
    '\s+', ' ', 'g'
  )));
  
  -- Normaliza instrumento
  NEW.instrumento_norm := upper(trim(regexp_replace(
    translate(
      COALESCE(NEW.instrumento, ''),
      'áàâãäéèêëíìîïóòôõöúùûüçÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇ',
      'aaaaaeeeeiiiooooouuuucAAAAAEEEEIIIOOOOOUUUUC'
    ),
    '\s+', ' ', 'g'
  )));
  
  -- Normaliza localidade
  NEW.localidade_norm := upper(trim(regexp_replace(
    translate(
      COALESCE(NEW.localidade, NEW.comum, ''),
      'áàâãäéèêëíìîïóòôõöúùûüçÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇ',
      'aaaaaeeeeiiiooooouuuucAAAAAEEEEIIIOOOOOUUUUC'
    ),
    '\s+', ' ', 'g'
  )));
  
  -- Normaliza comum
  NEW.comum_norm := upper(trim(regexp_replace(
    translate(
      COALESCE(NEW.comum, NEW.localidade, ''),
      'áàâãäéèêëíìîïóòôõöúùûüçÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇ',
      'aaaaaeeeeiiiooooouuuucAAAAAEEEEIIIOOOOOUUUUC'
    ),
    '\s+', ' ', 'g'
  )));
  
  -- Se comum não estiver preenchido, copia de localidade
  IF (NEW.comum IS NULL OR trim(NEW.comum) = '') AND (NEW.localidade IS NOT NULL AND trim(NEW.localidade) != '') THEN
    NEW.comum := NEW.localidade;
    NEW.comum_norm := NEW.localidade_norm;
  END IF;
  
  -- Normaliza cargo
  NEW.cargo_norm := upper(trim(regexp_replace(
    translate(
      COALESCE(NEW.cargo, ''),
      'áàâãäéèêëíìîïóòôõöúùûüçÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇ',
      'aaaaaeeeeiiiooooouuuucAAAAAEEEEIIIOOOOOUUUUC'
    ),
    '\s+', ' ', 'g'
  )));
  
  -- Normaliza nível
  NEW.nivel_norm := upper(trim(regexp_replace(
    translate(
      COALESCE(NEW.nivel, ''),
      'áàâãäéèêëíìîïóòôõöúùûüçÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇ',
      'aaaaaeeeeiiiooooouuuucAAAAAEEEEIIIOOOOOUUUUC'
    ),
    '\s+', ' ', 'g'
  )));
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recriar trigger
DROP TRIGGER IF EXISTS trg_norm_cadastro ON public.cadastro;
CREATE TRIGGER trg_norm_cadastro 
BEFORE INSERT OR UPDATE ON public.cadastro
FOR EACH ROW
EXECUTE FUNCTION public.set_norm_cadastro();

