-- Migration: Add 'cidade' column to ebi_atividades
-- Run this in the Supabase SQL Editor

ALTER TABLE public.ebi_atividades 
ADD COLUMN IF NOT EXISTS cidade TEXT;

-- Optional: also add contadora if you want to use it in the future
-- ALTER TABLE public.ebi_atividades ADD COLUMN IF NOT EXISTS contadora TEXT;
