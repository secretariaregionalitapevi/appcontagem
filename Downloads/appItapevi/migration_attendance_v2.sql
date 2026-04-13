-- Migration to add colaboradores and coordenadores to official attendance summary
-- Run this in Supabase SQL Editor

ALTER TABLE public.musicalizacao_aulas 
ADD COLUMN IF NOT EXISTS colaboradores_presentes INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS coordenadores_presentes INTEGER DEFAULT 0;

-- Refresh permissions
GRANT ALL ON TABLE public.musicalizacao_aulas TO anon;
GRANT ALL ON TABLE public.musicalizacao_aulas TO authenticated;
