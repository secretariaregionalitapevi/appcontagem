-- Schema creation script for MusicalizaÃ§Ã£o Module V3 (ALINHADO COM CADASTROMUSIC VERCEL)

-- 1. Tabela: musicalizacao_polos (Regionais / Centros de Ensino)
CREATE TABLE public.musicalizacao_polos (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    nome_polo TEXT NOT NULL,
    localidade TEXT,
    encarregado TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Tabela: musicalizacao_monitores (Monitores - Tabela usada pelo CADASTROMUSIC)
CREATE TABLE public.musicalizacao_monitores (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    nome_completo TEXT NOT NULL,
    comum_congregacao TEXT,
    data_nascimento TEXT, -- String dd/mm/aaaa no formulário
    idade INTEGER, -- Campo legado mantido para compatibilidade
    batizado TEXT, -- String Sim/NÃ£o no formulÃ¡rio
    data_batismo TEXT, -- String dd/mm/aaaa no formulÃ¡rio
    celular TEXT,
    email TEXT,
    polo_auxilio TEXT,
    musico_ou_musicista TEXT,
    oficializado TEXT,
    data_oficializacao TEXT,
    instrutor_atualmente TEXT,
    instrutor_em_qual_igreja TEXT,
    formacao_musica TEXT,
    formacao_qual TEXT,
    formacao_data TEXT,
    pedagogo TEXT,
    pedagogo_desde TEXT,
    atua_na_area TEXT,
    afinidade_criancas TEXT,
    cursos_conhecimentos TEXT,
    de_acordo_voluntario TEXT,
    autoriza_tratamento_dados TEXT,
    status TEXT DEFAULT 'Ativo',
    role TEXT DEFAULT 'Monitor(a)',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Tabela: musicalizacao_criancas (CrianÃ§as - Tabela usada pelo CADASTROMUSIC)
CREATE TABLE public.musicalizacao_criancas (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    nome_crianca TEXT NOT NULL,
    sexo TEXT,
    data_nascimento TEXT, -- String dd/mm/aaaa no formulÃ¡rio
    comum_congregacao TEXT,
    polo_participacao TEXT,
    nome_pai TEXT,
    pai_e_crente TEXT,
    nome_mae TEXT,
    mae_e_crente TEXT,
    pais_vivem_juntos TEXT,
    crianca_vive_com_os_pais TEXT,
    se_nao_vive_com_pais_com_quem_vive TEXT,
    nome_responsavel TEXT,
    celular_responsavel TEXT,
    tem_whatsapp TEXT,
    participa_reunioes_jovens_menores TEXT,
    participa_espaco_infantil TEXT,
    logradouro_numero TEXT,
    complemento TEXT,
    bairro TEXT,
    cidade TEXT,
    cep TEXT,
    dificuldade_aprendizagem TEXT,
    dificuldade_descricao TEXT,
    faz_terapia TEXT,
    terapia_especialidade TEXT,
    status TEXT DEFAULT 'Ativo',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Tabela: musicalizacao_aulas (Registro geral das aulas ministradas)
CREATE TABLE public.musicalizacao_aulas (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    data_aula DATE NOT NULL,
    cidade TEXT,
    polo TEXT,
    ciclo TEXT,
    numero_aula INTEGER,
    meninos_presentes INTEGER DEFAULT 0,
    meninas_presentes INTEGER DEFAULT 0,
    instrutores_presentes INTEGER DEFAULT 0,
    colaboradores_presentes INTEGER DEFAULT 0,
    coordenadores_presentes INTEGER DEFAULT 0,
    nome_atividade TEXT,
    observacoes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Tabela: musicalizacao_presenca (Chamada detalhada por aluno)
CREATE TABLE public.musicalizacao_presenca (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    aula_id UUID REFERENCES public.musicalizacao_aulas(id) ON DELETE CASCADE,
    aluno_id UUID REFERENCES public.musicalizacao_criancas(id) ON DELETE CASCADE,
    presente BOOLEAN DEFAULT false,
    status TEXT DEFAULT 'faltou' CHECK (status IN ('presente', 'faltou', 'justificado')),
    observacoes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(aula_id, aluno_id)
);

-- PermissÃµes
GRANT ALL ON TABLE public.musicalizacao_polos TO anon;
GRANT ALL ON TABLE public.musicalizacao_polos TO authenticated;

GRANT ALL ON TABLE public.musicalizacao_monitores TO anon;
GRANT ALL ON TABLE public.musicalizacao_monitores TO authenticated;

GRANT ALL ON TABLE public.musicalizacao_criancas TO anon;
GRANT ALL ON TABLE public.musicalizacao_criancas TO authenticated;

GRANT ALL ON TABLE public.musicalizacao_aulas TO anon;
GRANT ALL ON TABLE public.musicalizacao_aulas TO authenticated;

GRANT ALL ON TABLE public.musicalizacao_presenca TO anon;
GRANT ALL ON TABLE public.musicalizacao_presenca TO authenticated;
GRANT ALL ON TABLE public.musicalizacao_presenca TO service_role;

-- 6. Dados Iniciais: Polos
INSERT INTO public.musicalizacao_polos (nome_polo, localidade)
VALUES ('Vila Doutor Cardoso', 'ITAPEVI')
ON CONFLICT DO NOTHING;
