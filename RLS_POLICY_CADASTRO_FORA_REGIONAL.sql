-- 1. Habilitar a segurança em nível de linha (RLS) para a tabela
ALTER TABLE public.cadastro_fora_regional ENABLE ROW LEVEL SECURITY;

-- 2. Criar a política que permite leitura plena (SELECT)
-- Isso permite que tanto usuários anônimos (anon) quanto logados vejam a lista de comuns.
CREATE POLICY "Permitir leitura (SELECT) para todos"
ON public.cadastro_fora_regional
FOR SELECT
USING (true);

-- 3. (Opcional) Política de INSERT, UPDATE, DELETE caso o aplicativo precise fazer edições
-- Se a tabela é apenas para consulta no app, pule as linhas abaixo.
-- CREATE POLICY "Permitir inserção" ON public.cadastro_fora_regional FOR INSERT WITH CHECK (true);
-- CREATE POLICY "Permitir atualização" ON public.cadastro_fora_regional FOR UPDATE USING (true);
-- CREATE POLICY "Permitir deleção" ON public.cadastro_fora_regional FOR DELETE USING (true);
