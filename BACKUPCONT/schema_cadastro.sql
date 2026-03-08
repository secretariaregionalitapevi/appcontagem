-- ============================================
-- SCHEMA: Tabela cadastro baseada na planilha
-- musicos_ornaganistas_reg_itapevi
-- ============================================

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

-- ============================================
-- ÍNDICES
-- ============================================

-- Índice para busca por comum normalizado
CREATE INDEX IF NOT EXISTS idx_cadastro_comum_norm 
ON public.cadastro USING btree (comum_norm) 
TABLESPACE pg_default;

-- Índice para busca por instrumento normalizado
CREATE INDEX IF NOT EXISTS idx_cadastro_instrumento_norm 
ON public.cadastro USING btree (instrumento_norm) 
TABLESPACE pg_default;

-- Índice para busca por cargo normalizado
CREATE INDEX IF NOT EXISTS idx_cadastro_cargo_norm 
ON public.cadastro USING btree (cargo_norm) 
TABLESPACE pg_default;

-- Índice composto para busca combinada (comum, instrumento, cargo)
CREATE INDEX IF NOT EXISTS idx_cadastro_comum_ins_cargo_norm 
ON public.cadastro USING btree (comum_norm, instrumento_norm, cargo_norm) 
TABLESPACE pg_default;

-- Índice para busca por nome normalizado
CREATE INDEX IF NOT EXISTS idx_cadastro_nome_norm 
ON public.cadastro USING btree (nome_norm) 
TABLESPACE pg_default;

-- Índice para busca por nível normalizado
CREATE INDEX IF NOT EXISTS idx_cadastro_nivel_norm 
ON public.cadastro USING btree (nivel_norm) 
TABLESPACE pg_default;

-- Índice para filtro de ativo
CREATE INDEX IF NOT EXISTS idx_cadastro_ativo 
ON public.cadastro USING btree (ativo) 
TABLESPACE pg_default;

-- Índice para busca por cidade
CREATE INDEX IF NOT EXISTS idx_cadastro_cidade 
ON public.cadastro USING btree (cidade) 
TABLESPACE pg_default;

-- Índice para busca por localidade normalizada
CREATE INDEX IF NOT EXISTS idx_cadastro_localidade_norm 
ON public.cadastro USING btree (localidade_norm) 
TABLESPACE pg_default;

-- ============================================
-- FUNÇÃO DE NORMALIZAÇÃO
-- ============================================

-- Função auxiliar para remover acentos (se não existir)
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

-- Função de normalização para a tabela cadastro
CREATE OR REPLACE FUNCTION public.set_norm_cadastro()
RETURNS TRIGGER AS $$
BEGIN
  -- Normaliza nome (remove acentos, converte para maiúsculas, remove espaços extras)
  NEW.nome_norm := upper(trim(regexp_replace(
    unaccent_string(COALESCE(NEW.nome, '')),
    '\s+', ' ', 'g'
  )));
  
  -- Normaliza instrumento
  NEW.instrumento_norm := upper(trim(regexp_replace(
    unaccent_string(COALESCE(NEW.instrumento, '')),
    '\s+', ' ', 'g'
  )));
  
  -- Normaliza localidade (prioriza localidade, depois comum)
  NEW.localidade_norm := upper(trim(regexp_replace(
    unaccent_string(COALESCE(NEW.localidade, NEW.comum, '')),
    '\s+', ' ', 'g'
  )));
  
  -- Normaliza comum (usa localidade se comum não estiver preenchido)
  NEW.comum_norm := upper(trim(regexp_replace(
    unaccent_string(COALESCE(NEW.comum, NEW.localidade, '')),
    '\s+', ' ', 'g'
  )));
  
  -- Se comum não estiver preenchido mas localidade estiver, copia para comum
  IF (NEW.comum IS NULL OR NEW.comum = '') AND (NEW.localidade IS NOT NULL AND NEW.localidade != '') THEN
    NEW.comum := NEW.localidade;
  END IF;
  
  -- Normaliza cargo
  NEW.cargo_norm := upper(trim(regexp_replace(
    unaccent_string(COALESCE(NEW.cargo, '')),
    '\s+', ' ', 'g'
  )));
  
  -- Normaliza nível
  NEW.nivel_norm := upper(trim(regexp_replace(
    unaccent_string(COALESCE(NEW.nivel, '')),
    '\s+', ' ', 'g'
  )));
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- TRIGGER DE NORMALIZAÇÃO
-- ============================================

-- Trigger para normalizar campos automaticamente antes de INSERT ou UPDATE
CREATE TRIGGER trg_norm_cadastro 
BEFORE INSERT OR UPDATE ON public.cadastro
FOR EACH ROW
EXECUTE FUNCTION public.set_norm_cadastro();

-- ============================================
-- COMENTÁRIOS PARA DOCUMENTAÇÃO
-- ============================================

COMMENT ON TABLE public.cadastro IS 'Tabela de cadastro de músicos e organistas da Regional Itapevi';
COMMENT ON COLUMN public.cadastro.id IS 'Identificador único UUID';
COMMENT ON COLUMN public.cadastro.nome IS 'Nome completo do músico/organista';
COMMENT ON COLUMN public.cadastro.instrumento IS 'Instrumento musical tocado';
COMMENT ON COLUMN public.cadastro.localidade IS 'Nome da localidade/comunidade (campo do CSV)';
COMMENT ON COLUMN public.cadastro.cidade IS 'Cidade de residência/atuação';
COMMENT ON COLUMN public.cadastro.comum IS 'Nome da comunidade/localidade (preenchido automaticamente se vazio)';
COMMENT ON COLUMN public.cadastro.cargo IS 'Cargo ocupado (MÚSICO, ORGANISTA, etc.) - opcional';
COMMENT ON COLUMN public.cadastro.nivel IS 'Nível ou status (OFICIALIZADO(A), RJM / ENSAIO, etc.)';
COMMENT ON COLUMN public.cadastro.ativo IS 'Indica se o registro está ativo';
COMMENT ON COLUMN public.cadastro.nome_norm IS 'Nome normalizado para buscas (sem acentos, maiúsculas)';
COMMENT ON COLUMN public.cadastro.instrumento_norm IS 'Instrumento normalizado para buscas';
COMMENT ON COLUMN public.cadastro.comum_norm IS 'Comum normalizado para buscas';
COMMENT ON COLUMN public.cadastro.cargo_norm IS 'Cargo normalizado para buscas';
COMMENT ON COLUMN public.cadastro.nivel_norm IS 'Nível normalizado para buscas';
COMMENT ON COLUMN public.cadastro.localidade_norm IS 'Localidade normalizada (cidade ou comum)';

