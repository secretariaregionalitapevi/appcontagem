# Configuração do Supabase - Tabela de Perfis

## Estrutura da Tabela `profiles`

Para que a autenticação funcione corretamente, você precisa criar a tabela `profiles` no Supabase.

### SQL para criar a tabela `profiles`

Execute este SQL no SQL Editor do Supabase:

```sql
-- Criar tabela de perfis de usuário
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  nome TEXT,
  role TEXT DEFAULT 'user',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar índice para melhor performance
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);

-- Habilitar Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Política: Usuários podem ler seu próprio perfil
CREATE POLICY "Usuários podem ler seu próprio perfil"
ON public.profiles
FOR SELECT
USING (auth.uid() = id);

-- Política: Usuários podem atualizar seu próprio perfil
CREATE POLICY "Usuários podem atualizar seu próprio perfil"
ON public.profiles
FOR UPDATE
USING (auth.uid() = id);

-- Política: Sistema pode inserir perfis (via service role ou função)
CREATE POLICY "Sistema pode inserir perfis"
ON public.profiles
FOR INSERT
WITH CHECK (true);

-- Função para criar perfil automaticamente quando um usuário é criado
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, nome, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'nome', NULL),
    COALESCE(NEW.raw_user_meta_data->>'role', 'user')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para criar perfil automaticamente
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
```

## Roles Disponíveis

Os seguintes roles podem ser usados:
- `user` - Usuário padrão
- `admin` - Administrador
- `supervisor` - Supervisor

## Como Funciona

1. **Cadastro (signUp)**:
   - Cria usuário na autenticação do Supabase
   - Cria perfil na tabela `profiles` automaticamente (via trigger)
   - Ou cria manualmente se o trigger não funcionar

2. **Login (signIn)**:
   - Autentica o usuário
   - Busca o perfil na tabela `profiles`
   - Retorna dados completos do usuário

3. **Atualização**:
   - O perfil é atualizado automaticamente quando o usuário faz login
   - Dados são sincronizados entre `auth.users` e `profiles`

## Verificação

Para verificar se está funcionando:

1. Crie um usuário através do app
2. Vá ao Supabase Dashboard > Table Editor > `profiles`
3. Verifique se o perfil foi criado automaticamente

## Troubleshooting

### Perfil não é criado automaticamente

Se o trigger não funcionar, o app criará o perfil manualmente no primeiro login.

### Erro de permissão

Certifique-se de que as políticas RLS estão configuradas corretamente e que o usuário está autenticado.

---

# Configurações Adicionais de Tabelas (Docker Install)

As tabelas abaixo são essenciais para o funcionamento pleno de todas as funcionalidades do SAC (Cadastro de Músicos, Registro de Presença e Controle de Organistas).

## 1. Estrutura da Tabela `cadastro`

Esta tabela contém o banco de dados de músicos, comuns, instrumentos e cargos da regional.

### SQL para criar a tabela `cadastro`

Execute este SQL no SQL Editor do Supabase:

```sql
CREATE TABLE IF NOT EXISTS public.cadastro (
  id uuid not null default extensions.uuid_generate_v4 (),
  nome text not null,
  instrumento text null,
  comum text null,
  cidade text null,
  cargo text null,
  nivel text null,
  constraint cadastro_pkey primary key (id)
) TABLESPACE pg_default;

-- Habilitar Row Level Security (RLS)
ALTER TABLE public.cadastro ENABLE ROW LEVEL SECURITY;

-- Política simples para permitir leitura
CREATE POLICY "Permitir leitura para todos" ON public.cadastro FOR SELECT USING (true);
```

## 2. Estrutura da Tabela `presencas`

Esta tabela armazena todos os registros de presença (contagem) realizados pelo aplicativo.

### SQL para criar a tabela `presencas`

```sql
CREATE TABLE IF NOT EXISTS public.presencas (
  uuid UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  nome_completo TEXT NOT NULL,
  comum TEXT NOT NULL,
  cargo TEXT NOT NULL,
  instrumento TEXT,
  naipe_instrumento TEXT,
  classe_organista TEXT,
  nivel TEXT,
  cidade TEXT,
  local_ensaio TEXT,
  data_ensaio TIMESTAMP WITH TIME ZONE NOT NULL,
  registrado_por TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices recomendados para relatórios e busca de duplicatas
CREATE INDEX IF NOT EXISTS idx_presencas_nome_data ON public.presencas (nome_completo, data_ensaio);
CREATE INDEX IF NOT EXISTS idx_presencas_comum ON public.presencas (comum);
CREATE INDEX IF NOT EXISTS idx_presencas_data ON public.presencas (data_ensaio);

-- Habilitar RLS
ALTER TABLE public.presencas ENABLE ROW LEVEL SECURITY;

-- Política para usuários autenticados
CREATE POLICY "Usuarios autenticados podem interagir" 
ON public.presencas 
FOR ALL 
TO authenticated 
USING (true);
```

## 3. Estrutura da Tabela `organistas_ensaio`

Tabela específica para o registro de rodízio e presença de organistas nos ensaios.

### SQL para criar a tabela `organistas_ensaio`

```sql
CREATE TABLE IF NOT EXISTS public.organistas_ensaio (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organista_nome TEXT NOT NULL,
  organista_comum TEXT,
  organista_cidade TEXT,
  local_ensaio TEXT NOT NULL,
  data_ensaio DATE NOT NULL,
  tocou BOOLEAN NOT NULL DEFAULT false,
  usuario_responsavel TEXT NOT NULL,
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT organistas_ensaio_local_data_idx UNIQUE (organista_nome, local_ensaio, data_ensaio)
);

CREATE INDEX IF NOT EXISTS idx_organistas_ensaio_local ON organistas_ensaio(local_ensaio);
CREATE INDEX IF NOT EXISTS idx_organistas_ensaio_data ON organistas_ensaio(data_ensaio);

-- Habilitar RLS
ALTER TABLE public.organistas_ensaio ENABLE ROW LEVEL SECURITY;

-- Política de acesso total para usuários logados
CREATE POLICY "Acesso total autenticado" 
ON public.organistas_ensaio 
FOR ALL 
TO authenticated 
USING (true);
```

