-- ========================================
-- POLÍTICAS RLS PARA TABELA MUSICOS_UNIFICADO
-- Sistema de Registro de Presença CCB
-- ========================================
-- 
-- IMPORTANTE: Este arquivo corrige o problema de RLS que estava bloqueando
-- a leitura de comuns e nomes. A tabela correta é 'musicos_unificado', não 'cadastro'.
--

-- 1. Verificar se RLS está habilitado (e habilitar se necessário)
ALTER TABLE public.musicos_unificado ENABLE ROW LEVEL SECURITY;

-- 2. Remover políticas antigas que possam estar bloqueando (se existirem)
DROP POLICY IF EXISTS "Permitir leitura pública da tabela musicos_unificado" ON public.musicos_unificado;
DROP POLICY IF EXISTS "Permitir leitura para usuários autenticados" ON public.musicos_unificado;
DROP POLICY IF EXISTS "Permitir leitura pública" ON public.musicos_unificado;

-- 3. Política para permitir leitura pública (SELECT) de todas as colunas
-- Esta política permite que qualquer usuário (incluindo anônimos) leia os dados
-- NECESSÁRIO para o sistema funcionar corretamente
CREATE POLICY "Permitir leitura pública da tabela musicos_unificado"
ON public.musicos_unificado
FOR SELECT
TO public
USING (true);

-- 4. Verificar se a política foi criada corretamente
-- Execute este comando para verificar:
-- SELECT * FROM pg_policies WHERE tablename = 'musicos_unificado' AND policyname = 'Permitir leitura pública da tabela musicos_unificado';

-- ========================================
-- POLÍTICAS ADICIONAIS (OPCIONAL)
-- ========================================

-- 5. (OPCIONAL) Se quiser restringir apenas para usuários autenticados:
-- Descomente a política abaixo e remova/comente a política acima
/*
DROP POLICY IF EXISTS "Permitir leitura pública da tabela musicos_unificado" ON public.musicos_unificado;

CREATE POLICY "Permitir leitura para usuários autenticados"
ON public.musicos_unificado
FOR SELECT
TO authenticated
USING (true);
*/

-- 6. (OPCIONAL) Política para permitir INSERT apenas para usuários autenticados
-- Descomente se quiser permitir inserção de dados
/*
CREATE POLICY "Permitir inserção para usuários autenticados"
ON public.musicos_unificado
FOR INSERT
TO authenticated
WITH CHECK (true);
*/

-- 7. (OPCIONAL) Política para permitir UPDATE apenas para usuários autenticados
-- Descomente se quiser permitir atualização de dados
/*
CREATE POLICY "Permitir atualização para usuários autenticados"
ON public.musicos_unificado
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);
*/

-- ========================================
-- VERIFICAÇÃO E DIAGNÓSTICO
-- ========================================

-- Para verificar se RLS está habilitado:
-- SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'musicos_unificado';

-- Para verificar todas as políticas da tabela:
-- SELECT * FROM pg_policies WHERE tablename = 'musicos_unificado';

-- Para testar se a política está funcionando (deve retornar dados):
-- SELECT COUNT(*) FROM public.musicos_unificado WHERE ativo = true;

-- Para testar se consegue ler comuns:
-- SELECT DISTINCT comum FROM public.musicos_unificado WHERE ativo = true LIMIT 10;

-- ========================================
-- REMOÇÃO DE POLÍTICAS (se necessário)
-- ========================================

-- Para remover uma política específica:
-- DROP POLICY "Permitir leitura pública da tabela musicos_unificado" ON public.musicos_unificado;

-- Para desabilitar RLS completamente (NÃO RECOMENDADO):
-- ALTER TABLE public.musicos_unificado DISABLE ROW LEVEL SECURITY;

