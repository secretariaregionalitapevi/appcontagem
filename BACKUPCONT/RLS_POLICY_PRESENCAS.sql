-- ========================================
-- POLÍTICAS RLS PARA TABELA PRESENCAS
-- Sistema de Registro de Presença CCB
-- ========================================
-- 
-- IMPORTANTE: Este arquivo corrige o problema de RLS que estava bloqueando
-- a inserção de registros na tabela 'presencas'.
--

-- 1. Verificar se RLS está habilitado (e habilitar se necessário)
ALTER TABLE public.presencas ENABLE ROW LEVEL SECURITY;

-- 2. Remover políticas antigas que possam estar bloqueando (se existirem)
DROP POLICY IF EXISTS "Permitir leitura pública da tabela presencas" ON public.presencas;
DROP POLICY IF EXISTS "Permitir inserção pública da tabela presencas" ON public.presencas;
DROP POLICY IF EXISTS "Permitir leitura para usuários autenticados" ON public.presencas;
DROP POLICY IF EXISTS "Permitir inserção para usuários autenticados" ON public.presencas;
DROP POLICY IF EXISTS "Permitir leitura pública" ON public.presencas;
DROP POLICY IF EXISTS "Permitir inserção pública" ON public.presencas;

-- 3. Política para permitir leitura pública (SELECT) de todas as colunas
-- Esta política permite que qualquer usuário (incluindo anônimos) leia os dados
CREATE POLICY "Permitir leitura pública da tabela presencas"
ON public.presencas
FOR SELECT
TO public
USING (true);

-- 4. Política para permitir inserção pública (INSERT) de registros
-- Esta política permite que qualquer usuário (incluindo anônimos) insira registros
-- NECESSÁRIO para o sistema funcionar corretamente
CREATE POLICY "Permitir inserção pública da tabela presencas"
ON public.presencas
FOR INSERT
TO public
WITH CHECK (true);

-- 5. Verificar se as políticas foram criadas corretamente
-- Execute este comando para verificar:
-- SELECT * FROM pg_policies WHERE tablename = 'presencas';

-- ========================================
-- POLÍTICAS ADICIONAIS (OPCIONAL)
-- ========================================

-- 6. (OPCIONAL) Se quiser restringir apenas para usuários autenticados:
-- Descomente as políticas abaixo e remova/comente as políticas acima
/*
DROP POLICY IF EXISTS "Permitir leitura pública da tabela presencas" ON public.presencas;
DROP POLICY IF EXISTS "Permitir inserção pública da tabela presencas" ON public.presencas;

CREATE POLICY "Permitir leitura para usuários autenticados"
ON public.presencas
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Permitir inserção para usuários autenticados"
ON public.presencas
FOR INSERT
TO authenticated
WITH CHECK (true);
*/

-- 7. (OPCIONAL) Política para permitir UPDATE apenas para usuários autenticados
-- Descomente se quiser permitir atualização de dados
/*
CREATE POLICY "Permitir atualização para usuários autenticados"
ON public.presencas
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);
*/

-- 8. (OPCIONAL) Política para permitir DELETE apenas para usuários autenticados
-- Descomente se quiser permitir exclusão de dados
/*
CREATE POLICY "Permitir exclusão para usuários autenticados"
ON public.presencas
FOR DELETE
TO authenticated
USING (true);
*/

-- ========================================
-- VERIFICAÇÃO E DIAGNÓSTICO
-- ========================================

-- Para verificar se RLS está habilitado:
-- SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'presencas';

-- Para verificar todas as políticas da tabela:
-- SELECT * FROM pg_policies WHERE tablename = 'presencas';

-- Para testar se a política está funcionando (deve retornar dados):
-- SELECT COUNT(*) FROM public.presencas;

-- Para testar se consegue inserir (deve funcionar):
-- INSERT INTO public.presencas (uuid, nome_completo, comum, cargo, created_at) 
-- VALUES (gen_random_uuid(), 'Teste', 'Teste', 'Teste', NOW());

-- ========================================
-- REMOÇÃO DE POLÍTICAS (se necessário)
-- ========================================

-- Para remover uma política específica:
-- DROP POLICY "Permitir leitura pública da tabela presencas" ON public.presencas;
-- DROP POLICY "Permitir inserção pública da tabela presencas" ON public.presencas;

-- Para desabilitar RLS completamente (NÃO RECOMENDADO):
-- ALTER TABLE public.presencas DISABLE ROW LEVEL SECURITY;

