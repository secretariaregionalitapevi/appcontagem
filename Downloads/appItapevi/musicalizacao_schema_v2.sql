-- Schema creation script for MusicalizaÃ§Ã£o Module V2 (Completo com campos do Vercel App)

-- 1. Tabela: musicalizacao_polos (Regionais / Centros de Ensino)
CREATE TABLE public.musicalizacao_polos (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    nome_polo TEXT NOT NULL,
    localidade TEXT,
    encarregado TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Tabela: musicalizacao_instrutores (Monitores e Equipe de Ensino)
CREATE TABLE public.musicalizacao_instrutores (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    nome TEXT NOT NULL,
    full_name TEXT, -- Alias
    comum_congregacao TEXT,
    idade INTEGER,
    batizado BOOLEAN DEFAULT false,
    data_batismo DATE,
    celular TEXT,
    phone TEXT, -- Alias
    email TEXT,
    polo TEXT,
    musico BOOLEAN DEFAULT false,
    oficializado BOOLEAN DEFAULT false,
    data_oficializacao DATE,
    instrutor_atualmente BOOLEAN DEFAULT false,
    igreja_instrutor TEXT,
    formacao_musica BOOLEAN DEFAULT false,
    qual_formacao TEXT,
    data_formacao DATE,
    pedagogo BOOLEAN DEFAULT false,
    desde_quando_pedagogo DATE,
    atua_area_pedagogo BOOLEAN DEFAULT false,
    afinidade_criancas BOOLEAN DEFAULT false,
    cursos_workshop TEXT,
    role TEXT DEFAULT 'Monitor(a)',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Tabela: musicalizacao_alunos (CrianÃ§as cadastradas)
CREATE TABLE public.musicalizacao_alunos (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    nome TEXT NOT NULL,
    nome_aluno TEXT, -- Alias
    sexo TEXT,
    nascimento DATE,
    idade INTEGER,
    comum_congregacao TEXT,
    polo TEXT,
    nome_pai TEXT,
    pai_crente BOOLEAN DEFAULT false,
    nome_mae TEXT,
    mae_crente BOOLEAN DEFAULT false,
    pais_juntos BOOLEAN DEFAULT false,
    crianca_com_pais BOOLEAN DEFAULT false,
    vive_com_quem TEXT,
    responsavel TEXT,
    celular_responsavel TEXT,
    whatsapp BOOLEAN DEFAULT false,
    reunioes BOOLEAN DEFAULT false,
    espaco_infantil BOOLEAN DEFAULT false,
    rua_numero TEXT,
    complemento TEXT,
    bairro TEXT,
    cidade TEXT,
    cep TEXT,
    dificuldade_aprendizagem BOOLEAN DEFAULT false,
    desc_dificuldade TEXT,
    faz_terapia BOOLEAN DEFAULT false,
    desc_terapia TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Tabela: musicalizacao_aulas (Registro geral das aulas ministradas)
CREATE TABLE public.musicalizacao_aulas (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    data_aula DATE NOT NULL,
    cidade TEXT,
    nome_atividade TEXT,
    meninos_presentes INTEGER DEFAULT 0,
    meninas_presentes INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Tabela: musicalizacao_presenca (Chamada detalhada por aluno)
CREATE TABLE public.musicalizacao_presenca (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    aula_id UUID REFERENCES public.musicalizacao_aulas(id) ON DELETE CASCADE,
    aluno_id UUID REFERENCES public.musicalizacao_alunos(id) ON DELETE CASCADE,
    presente BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(aula_id, aluno_id)
);

-- Habilitar leitura/escrita pÃºblica temporariamente para o Vercel conseguir gravar
GRANT ALL ON TABLE public.musicalizacao_polos TO anon;
GRANT ALL ON TABLE public.musicalizacao_polos TO authenticated;

GRANT ALL ON TABLE public.musicalizacao_instrutores TO anon;
GRANT ALL ON TABLE public.musicalizacao_instrutores TO authenticated;

GRANT ALL ON TABLE public.musicalizacao_alunos TO anon;
GRANT ALL ON TABLE public.musicalizacao_alunos TO authenticated;

GRANT ALL ON TABLE public.musicalizacao_aulas TO anon;
GRANT ALL ON TABLE public.musicalizacao_aulas TO authenticated;

GRANT ALL ON TABLE public.musicalizacao_presenca TO anon;
GRANT ALL ON TABLE public.musicalizacao_presenca TO authenticated;
