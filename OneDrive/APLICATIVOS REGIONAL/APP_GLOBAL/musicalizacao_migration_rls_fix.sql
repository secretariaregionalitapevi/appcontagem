-- Corrige acesso com RLS para o modulo de Musicalizacao.
-- Execute esta migration no Supabase SQL Editor se as tabelas estiverem com RLS ativo.

BEGIN;

GRANT ALL ON TABLE public.musicalizacao_criancas TO authenticated;
GRANT ALL ON TABLE public.musicalizacao_monitores TO authenticated;
GRANT ALL ON TABLE public.musicalizacao_aulas TO authenticated;
GRANT ALL ON TABLE public.musicalizacao_presenca TO authenticated;

ALTER TABLE public.musicalizacao_criancas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.musicalizacao_monitores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.musicalizacao_aulas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.musicalizacao_presenca ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "musicalizacao_criancas_select_authenticated" ON public.musicalizacao_criancas;
CREATE POLICY "musicalizacao_criancas_select_authenticated"
ON public.musicalizacao_criancas
FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "musicalizacao_criancas_insert_authenticated" ON public.musicalizacao_criancas;
CREATE POLICY "musicalizacao_criancas_insert_authenticated"
ON public.musicalizacao_criancas
FOR INSERT
TO authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "musicalizacao_criancas_update_authenticated" ON public.musicalizacao_criancas;
CREATE POLICY "musicalizacao_criancas_update_authenticated"
ON public.musicalizacao_criancas
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "musicalizacao_criancas_delete_authenticated" ON public.musicalizacao_criancas;
CREATE POLICY "musicalizacao_criancas_delete_authenticated"
ON public.musicalizacao_criancas
FOR DELETE
TO authenticated
USING (true);

DROP POLICY IF EXISTS "musicalizacao_monitores_select_authenticated" ON public.musicalizacao_monitores;
CREATE POLICY "musicalizacao_monitores_select_authenticated"
ON public.musicalizacao_monitores
FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "musicalizacao_monitores_insert_authenticated" ON public.musicalizacao_monitores;
CREATE POLICY "musicalizacao_monitores_insert_authenticated"
ON public.musicalizacao_monitores
FOR INSERT
TO authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "musicalizacao_monitores_update_authenticated" ON public.musicalizacao_monitores;
CREATE POLICY "musicalizacao_monitores_update_authenticated"
ON public.musicalizacao_monitores
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "musicalizacao_monitores_delete_authenticated" ON public.musicalizacao_monitores;
CREATE POLICY "musicalizacao_monitores_delete_authenticated"
ON public.musicalizacao_monitores
FOR DELETE
TO authenticated
USING (true);

DROP POLICY IF EXISTS "musicalizacao_aulas_select_authenticated" ON public.musicalizacao_aulas;
CREATE POLICY "musicalizacao_aulas_select_authenticated"
ON public.musicalizacao_aulas
FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "musicalizacao_aulas_insert_authenticated" ON public.musicalizacao_aulas;
CREATE POLICY "musicalizacao_aulas_insert_authenticated"
ON public.musicalizacao_aulas
FOR INSERT
TO authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "musicalizacao_aulas_update_authenticated" ON public.musicalizacao_aulas;
CREATE POLICY "musicalizacao_aulas_update_authenticated"
ON public.musicalizacao_aulas
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "musicalizacao_aulas_delete_authenticated" ON public.musicalizacao_aulas;
CREATE POLICY "musicalizacao_aulas_delete_authenticated"
ON public.musicalizacao_aulas
FOR DELETE
TO authenticated
USING (true);

DROP POLICY IF EXISTS "musicalizacao_presenca_select_authenticated" ON public.musicalizacao_presenca;
CREATE POLICY "musicalizacao_presenca_select_authenticated"
ON public.musicalizacao_presenca
FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "musicalizacao_presenca_insert_authenticated" ON public.musicalizacao_presenca;
CREATE POLICY "musicalizacao_presenca_insert_authenticated"
ON public.musicalizacao_presenca
FOR INSERT
TO authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "musicalizacao_presenca_update_authenticated" ON public.musicalizacao_presenca;
CREATE POLICY "musicalizacao_presenca_update_authenticated"
ON public.musicalizacao_presenca
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "musicalizacao_presenca_delete_authenticated" ON public.musicalizacao_presenca;
CREATE POLICY "musicalizacao_presenca_delete_authenticated"
ON public.musicalizacao_presenca
FOR DELETE
TO authenticated
USING (true);

COMMIT;
