-- ========================================
-- POLÍTICAS RLS PARA TABELA CADASTRO
-- Sistema de Registro de Presença CCB
-- ========================================

-- 1. Habilitar RLS na tabela cadastro
ALTER TABLE public.cadastro ENABLE ROW LEVEL SECURITY;

-- 2. Política para permitir leitura pública (SELECT) de todas as colunas
-- Esta política permite que qualquer usuário (incluindo anônimos) leia os dados
CREATE POLICY "Permitir leitura pública da tabela cadastro"
ON public.cadastro
FOR SELECT
TO public
USING (true);

-- 3. (OPCIONAL) Se quiser restringir apenas para usuários autenticados:
-- Descomente a política abaixo e remova/comente a política acima
/*
CREATE POLICY "Permitir leitura para usuários autenticados"
ON public.cadastro
FOR SELECT
TO authenticated
USING (true);
*/

-- 4. (OPCIONAL) Se quiser permitir apenas leitura de colunas específicas:
-- Você pode criar uma VIEW com apenas as colunas necessárias
/*
CREATE VIEW public.cadastro_publico AS
SELECT id, nome, comum, cargo_ministerio, instrumento, nivel, cidade
FROM public.cadastro;

-- E então criar política apenas para a view
CREATE POLICY "Permitir leitura da view cadastro_publico"
ON public.cadastro_publico
FOR SELECT
TO public
USING (true);
*/

-- ========================================
-- VERIFICAÇÃO
-- ========================================
-- Para verificar se as políticas foram criadas:
-- SELECT * FROM pg_policies WHERE tablename = 'cadastro';

-- Para remover uma política (se necessário):
-- DROP POLICY "Permitir leitura pública da tabela cadastro" ON public.cadastro;

