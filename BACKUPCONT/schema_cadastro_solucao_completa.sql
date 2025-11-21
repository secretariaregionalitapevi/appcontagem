-- ============================================
-- SOLUÇÃO COMPLETA: Tabela cadastro com
-- compatibilidade total para importação CSV
-- ============================================

-- DROP da tabela existente se precisar recriar (descomente se necessário)
-- DROP TABLE IF EXISTS public.cadastro CASCADE;

-- Criar a tabela principal com nomes em minúsculas (padrão PostgreSQL)
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

-- Função auxiliar para remover acentos e caracteres especiais
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

-- Função para limpar caracteres especiais problemáticos (incluindo ◆ e outros símbolos)
CREATE OR REPLACE FUNCTION public.clean_special_chars(text)
RETURNS text AS $$
BEGIN
  -- Remove caracteres especiais unicode problemáticos (diamante, etc)
  RETURN regexp_replace(
    $1,
    '[^\x20-\x7E\xC0-\xFF]',  -- Mantém apenas ASCII printável e Latin-1
    '',
    'g'
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Função de normalização para a tabela cadastro
CREATE OR REPLACE FUNCTION public.set_norm_cadastro()
RETURNS TRIGGER AS $$
BEGIN
  -- Limpa e normaliza nome
  NEW.nome := clean_special_chars(NEW.nome);
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
-- FUNÇÃO PARA IMPORTAR CSV (ALTERNATIVA)
-- Caso o import direto não funcione
-- ============================================

-- Esta função permite importar dados com nomes de colunas em maiúsculas
CREATE OR REPLACE FUNCTION public.importar_cadastro_csv(
  p_nome text,
  p_instrumento text DEFAULT NULL,
  p_localidade text DEFAULT NULL,
  p_cidade text DEFAULT NULL
)
RETURNS uuid AS $$
DECLARE
  v_id uuid;
BEGIN
  INSERT INTO public.cadastro (nome, instrumento, localidade, cidade)
  VALUES (p_nome, p_instrumento, p_localidade, p_cidade)
  RETURNING id INTO v_id;
  
  RETURN v_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- COMENTÁRIOS
-- ============================================

COMMENT ON TABLE public.cadastro IS 'Tabela de cadastro de músicos e organistas da Regional Itapevi';
COMMENT ON COLUMN public.cadastro.nome IS 'Nome completo do músico/organista';
COMMENT ON COLUMN public.cadastro.instrumento IS 'Instrumento musical tocado (caracteres especiais serão removidos automaticamente)';
COMMENT ON COLUMN public.cadastro.localidade IS 'Nome da localidade/comunidade (campo do CSV)';
COMMENT ON COLUMN public.cadastro.cidade IS 'Cidade de residência/atuação';

