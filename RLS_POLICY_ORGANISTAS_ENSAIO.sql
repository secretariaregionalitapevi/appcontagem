-- ========================================
-- POLÍTICAS RLS PARA TABELA ORGANISTAS_ENSAIO
-- Sistema de Registro de Presença CCB
-- ========================================
-- 
-- IMPORTANTE: Este arquivo corrige o problema de RLS que estava bloqueando
-- a leitura de registros da tabela organistas_ensaio pelo Google Apps Script.
-- O Google Apps Script usa a chave anônima, então precisa de permissão pública para leitura.
--

-- 1. Verificar se RLS está habilitado (e habilitar se necessário)
ALTER TABLE public.organistas_ensaio ENABLE ROW LEVEL SECURITY;

-- 2. Remover política existente se já existir (para evitar erro ao recriar)
DROP POLICY IF EXISTS "Permitir leitura pública da tabela organistas_ensaio" ON public.organistas_ensaio;

-- 3. Adicionar política para permitir leitura pública (SELECT) de todas as colunas
-- Esta política permite que qualquer usuário (incluindo anônimos) leia os dados
-- NECESSÁRIO para o Google Apps Script funcionar corretamente
CREATE POLICY "Permitir leitura pública da tabela organistas_ensaio"
ON public.organistas_ensaio
FOR SELECT
TO public
USING (true);

-- 4. Verificar se a política foi criada corretamente
-- Execute este comando para verificar:
-- SELECT * FROM pg_policies WHERE tablename = 'organistas_ensaio';

-- ========================================
-- NOTAS IMPORTANTES
-- ========================================
-- 
-- Esta política permite APENAS LEITURA (SELECT) para usuários anônimos.
-- As políticas existentes para INSERT, UPDATE e DELETE continuam restritas
-- apenas para usuários autenticados, mantendo a segurança dos dados.
--
-- Se precisar remover esta política no futuro:
-- DROP POLICY IF EXISTS "Permitir leitura pública da tabela organistas_ensaio" ON public.organistas_ensaio;
--

