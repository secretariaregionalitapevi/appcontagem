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

