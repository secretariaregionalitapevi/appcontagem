-- Migration Script: MusicalizaÃ§Ã£o Attendance & Polos V1
-- Este script atualiza o banco de dados de forma segura, sem apagar dados ou tabelas existentes.

-- 1. Criar tabela de Polos se nÃ£o existir
CREATE TABLE IF NOT EXISTS public.musicalizacao_polos (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    nome_polo TEXT NOT NULL,
    localidade TEXT,
    encarregado TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Adicionar colunas necessÃ¡rias na tabela musicalizacao_aulas
-- Usamos um bloco anÃ´nimo para adicionar colunas apenas se elas nÃ£o existirem
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='musicalizacao_aulas' AND column_name='polo') THEN
        ALTER TABLE public.musicalizacao_aulas ADD COLUMN polo TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='musicalizacao_aulas' AND column_name='ciclo') THEN
        ALTER TABLE public.musicalizacao_aulas ADD COLUMN ciclo TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='musicalizacao_aulas' AND column_name='numero_aula') THEN
        ALTER TABLE public.musicalizacao_aulas ADD COLUMN numero_aula INTEGER;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='musicalizacao_aulas' AND column_name='observacoes') THEN
        ALTER TABLE public.musicalizacao_aulas ADD COLUMN observacoes TEXT;
    END IF;
END $$;

-- 3. Garantir permissÃµes de acesso
GRANT ALL ON TABLE public.musicalizacao_polos TO anon;
GRANT ALL ON TABLE public.musicalizacao_polos TO authenticated;
GRANT ALL ON TABLE public.musicalizacao_polos TO service_role;

-- 4. Adicionar restriÃ§Ã£o de unicidade para evitar duplicados ao rodar o script mÃºltiplas vezes
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'unique_polo_localidade') THEN
        ALTER TABLE public.musicalizacao_polos ADD CONSTRAINT unique_polo_localidade UNIQUE (nome_polo, localidade);
    END IF;
END $$;

-- 5. Inserir polos iniciais de ITAPEVI
INSERT INTO public.musicalizacao_polos (nome_polo, localidade)
VALUES 
('Vila Doutor Cardoso', 'ITAPEVI'),
('Rosemary II', 'ITAPEVI'),
('Central de Itapevi', 'ITAPEVI')
ON CONFLICT (nome_polo, localidade) DO NOTHING;
