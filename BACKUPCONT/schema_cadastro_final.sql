-- ============================================
-- SCHEMA FINAL: Tabela cadastro otimizada
-- para importação CSV do Supabase
-- ============================================

-- IMPORTANTE: Certifique-se de que o CSV NÃO tenha coluna 'id'
-- O UUID será gerado automaticamente para cada registro

-- Criar a tabela principal
CREATE TABLE IF NOT EXISTS public.cadastro (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  instrumento text NULL,
  localidade text NULL,
  cidade text NULL,
  comum text NULL,
  cargo text NULL,
  nivel text NULL,
  ativo boolean NOT NULL DEFAULT true,
  
  -- Campos normalizados para busca otimizada
  instrumento_norm text NULL,
  comum_norm text NULL,
  cargo_norm text NULL,
  nome_norm text NULL,
  nivel_norm text NULL,
  localidade_norm text NULL,
  
  CONSTRAINT cadastro_pkey PRIMARY KEY (id)
) TABLESPACE pg_default;

-- Garantir que o UUID sempre seja gerado automaticamente
-- Mesmo se alguém tentar inserir NULL, será gerado automaticamente
ALTER TABLE public.cadastro 
ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- Impedir que a coluna id seja atualizada (proteção)
CREATE OR REPLACE FUNCTION public.prevent_id_update()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.id IS DISTINCT FROM NEW.id THEN
    NEW.id := OLD.id;  -- Mantém o ID original
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_prevent_id_update
BEFORE UPDATE ON public.cadastro
FOR EACH ROW
EXECUTE FUNCTION public.prevent_id_update();

-- ============================================
-- ÍNDICES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_cadastro_comum_norm 
ON public.cadastro USING btree (comum_norm) 
TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_cadastro_instrumento_norm 
ON public.cadastro USING btree (instrumento_norm) 
TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_cadastro_cargo_norm 
ON public.cadastro USING btree (cargo_norm) 
TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_cadastro_comum_ins_cargo_norm 
ON public.cadastro USING btree (comum_norm, instrumento_norm, cargo_norm) 
TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_cadastro_nome_norm 
ON public.cadastro USING btree (nome_norm) 
TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_cadastro_nivel_norm 
ON public.cadastro USING btree (nivel_norm) 
TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_cadastro_ativo 
ON public.cadastro USING btree (ativo) 
TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_cadastro_cidade 
ON public.cadastro USING btree (cidade) 
TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_cadastro_localidade_norm 
ON public.cadastro USING btree (localidade_norm) 
TABLESPACE pg_default;

-- ============================================
-- FUNÇÃO PARA LIMPAR CARACTERES ESPECIAIS
-- ============================================

CREATE OR REPLACE FUNCTION public.unaccent_string(text)
RETURNS text AS $$
BEGIN
  RETURN translate(
    $1,
    'áàâãäéèêëíìîïóòôõöúùûüçÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇ',
    'aaaaaeeeeiiiooooouuuucAAAAAEEEEIIIOOOOOUUUUC'
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION public.clean_special_chars(text)
RETURNS text AS $$
BEGIN
  IF $1 IS NULL THEN
    RETURN NULL;
  END IF;
  -- Remove caracteres especiais unicode problemáticos (diamante, etc)
  RETURN regexp_replace(
    $1,
    '[^\x20-\x7E\xC0-\xFF]',  -- Mantém apenas ASCII printável e Latin-1
    '',
    'g'
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================
-- FUNÇÃO DE NORMALIZAÇÃO
-- ============================================

CREATE OR REPLACE FUNCTION public.set_norm_cadastro()
RETURNS TRIGGER AS $$
BEGIN
  -- Garante que o ID sempre seja gerado se estiver NULL
  IF NEW.id IS NULL THEN
    NEW.id := gen_random_uuid();
  END IF;
  
  -- Limpa e normaliza nome
  NEW.nome := clean_special_chars(NEW.nome);
  IF NEW.nome IS NULL OR trim(NEW.nome) = '' THEN
    RAISE EXCEPTION 'Campo nome é obrigatório e não pode estar vazio';
  END IF;
  
  NEW.nome_norm := upper(trim(regexp_replace(
    unaccent_string(COALESCE(NEW.nome, '')),
    '\s+', ' ', 'g'
  )));
  
  -- Limpa e normaliza instrumento (remove símbolos especiais como ◆)
  NEW.instrumento := clean_special_chars(NEW.instrumento);
  NEW.instrumento_norm := upper(trim(regexp_replace(
    unaccent_string(COALESCE(NEW.instrumento, '')),
    '\s+', ' ', 'g'
  )));
  
  -- Normaliza localidade
  NEW.localidade := clean_special_chars(NEW.localidade);
  NEW.localidade_norm := upper(trim(regexp_replace(
    unaccent_string(COALESCE(NEW.localidade, NEW.comum, '')),
    '\s+', ' ', 'g'
  )));
  
  -- Normaliza comum (usa localidade se comum não estiver preenchido)
  NEW.comum := clean_special_chars(NEW.comum);
  NEW.comum_norm := upper(trim(regexp_replace(
    unaccent_string(COALESCE(NEW.comum, NEW.localidade, '')),
    '\s+', ' ', 'g'
  )));
  
  -- Se comum não estiver preenchido mas localidade estiver, copia para comum
  IF (NEW.comum IS NULL OR trim(NEW.comum) = '') AND (NEW.localidade IS NOT NULL AND trim(NEW.localidade) != '') THEN
    NEW.comum := NEW.localidade;
    NEW.comum_norm := NEW.localidade_norm;
  END IF;
  
  -- Normaliza cargo
  NEW.cargo := clean_special_chars(NEW.cargo);
  NEW.cargo_norm := upper(trim(regexp_replace(
    unaccent_string(COALESCE(NEW.cargo, '')),
    '\s+', ' ', 'g'
  )));
  
  -- Normaliza nível
  NEW.nivel := clean_special_chars(NEW.nivel);
  NEW.nivel_norm := upper(trim(regexp_replace(
    unaccent_string(COALESCE(NEW.nivel, '')),
    '\s+', ' ', 'g'
  )));
  
  -- Limpa cidade também
  NEW.cidade := clean_special_chars(NEW.cidade);
  
  -- Garante que ativo tenha um valor padrão
  IF NEW.ativo IS NULL THEN
    NEW.ativo := true;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- TRIGGER DE NORMALIZAÇÃO
-- ============================================

DROP TRIGGER IF EXISTS trg_norm_cadastro ON public.cadastro;

CREATE TRIGGER trg_norm_cadastro 
BEFORE INSERT OR UPDATE ON public.cadastro
FOR EACH ROW
EXECUTE FUNCTION public.set_norm_cadastro();

-- ============================================
-- COMENTÁRIOS
-- ============================================

COMMENT ON TABLE public.cadastro IS 'Tabela de cadastro de músicos e organistas da Regional Itapevi';
COMMENT ON COLUMN public.cadastro.id IS 'ID único UUID gerado automaticamente (NÃO incluir no CSV)';
COMMENT ON COLUMN public.cadastro.nome IS 'Nome completo do músico/organista (OBRIGATÓRIO)';
COMMENT ON COLUMN public.cadastro.instrumento IS 'Instrumento musical tocado (caracteres especiais serão removidos automaticamente)';
COMMENT ON COLUMN public.cadastro.localidade IS 'Nome da localidade/comunidade (campo do CSV)';
COMMENT ON COLUMN public.cadastro.cidade IS 'Cidade de residência/atuação';
COMMENT ON COLUMN public.cadastro.comum IS 'Nome da comunidade/localidade (preenchido automaticamente com localidade se vazio)';
COMMENT ON COLUMN public.cadastro.cargo IS 'Cargo ocupado (MÚSICO, ORGANISTA, etc.) - opcional';
COMMENT ON COLUMN public.cadastro.nivel IS 'Nível ou status (OFICIALIZADO(A), RJM / ENSAIO, etc.)';
COMMENT ON COLUMN public.cadastro.ativo IS 'Indica se o registro está ativo (padrão: true)';

