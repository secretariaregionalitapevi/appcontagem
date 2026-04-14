-- EBI (EspaÃ§o BÃ­blico Infantil) Schema

-- 1. Tabela: ebi_criancas
CREATE TABLE IF NOT EXISTS public.ebi_criancas (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    nome_crianca TEXT NOT NULL,
    sexo TEXT, -- 'M' ou 'F'
    data_nascimento TEXT, -- dd/mm/aaaa
    localidade TEXT,
    nome_responsavel TEXT,
    celular_responsavel TEXT,
    status TEXT DEFAULT 'Ativo',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Tabela: ebi_monitores
CREATE TABLE IF NOT EXISTS public.ebi_monitores (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    nome_completo TEXT NOT NULL,
    celular TEXT,
    email TEXT,
    localidade TEXT,
    status TEXT DEFAULT 'Ativo',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Tabela: ebi_atividades (Registro de Aulas)
CREATE TABLE IF NOT EXISTS public.ebi_atividades (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    data_reuniao DATE NOT NULL,
    localidade TEXT, -- EspaÃ§o Infantil (CongregaÃ§Ã£o)
    livro TEXT,
    capitulo TEXT,
    versiculo TEXT,
    titulo_historia TEXT,
    contadora TEXT, -- IrmÃ£ Contadora da HistÃ³ria
    meninas INTEGER DEFAULT 0,
    meninos INTEGER DEFAULT 0,
    colaboradoras INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- PermissÃµes
GRANT ALL ON TABLE public.ebi_criancas TO anon, authenticated;
GRANT ALL ON TABLE public.ebi_monitores TO anon, authenticated;
GRANT ALL ON TABLE public.ebi_atividades TO anon, authenticated;
