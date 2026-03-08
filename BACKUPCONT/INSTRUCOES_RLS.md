# 🔒 Configuração de RLS (Row Level Security) para Tabela MUSICOS_UNIFICADO

## 📋 Problema Resolvido
O sistema não estava retornando as comuns e nomes porque as políticas RLS estavam bloqueando o acesso à tabela `musicos_unificado`. Agora vamos configurar RLS de forma segura.

## ⚠️ IMPORTANTE
A tabela correta é **`musicos_unificado`**, não `cadastro`. Use o arquivo `RLS_POLICY_MUSICOS_UNIFICADO.sql` para corrigir o problema.

## 🛠️ Como Aplicar

### Opção 1: SQL Editor no Supabase (Recomendado)

1. Acesse o **Supabase Dashboard**
2. Vá em **SQL Editor**
3. Cole o conteúdo do arquivo `RLS_POLICY_MUSICOS_UNIFICADO.sql`
4. Execute o script
5. Verifique se as políticas foram criadas corretamente

### Opção 2: Table Editor no Supabase

1. Acesse o **Supabase Dashboard**
2. Vá em **Table Editor** → **musicos_unificado**
3. Clique em **"Add RLS policy"**
4. Configure:
   - **Policy name**: `Permitir leitura pública da tabela musicos_unificado`
   - **Allowed operation**: `SELECT`
   - **Target roles**: `public`
   - **USING expression**: `true`

## 🔐 Políticas de Segurança

### Política Aplicada:
- **Permite**: Leitura (SELECT) de todos os registros
- **Para**: Usuários públicos (incluindo anônimos)
- **Bloqueia**: Inserção, atualização e exclusão por usuários anônimos

### Segurança Mantida:
✅ Usuários anônimos podem apenas **LER** os dados
❌ Usuários anônimos **NÃO podem** inserir, atualizar ou deletar
✅ Apenas usuários autenticados podem modificar dados (se configurado)

## 📝 Notas Importantes

- A política permite leitura pública porque os dados de cadastro são públicos (nomes, comuns, cargos)
- Se precisar restringir mais, use a política comentada no SQL para apenas usuários autenticados
- Para dados mais sensíveis, considere criar uma VIEW com apenas as colunas necessárias

## 🔍 Verificar Políticas

Para verificar se as políticas estão ativas:
```sql
SELECT * FROM pg_policies WHERE tablename = 'musicos_unificado';
```

Para testar se a política está funcionando:
```sql
-- Deve retornar dados (não vazio)
SELECT COUNT(*) FROM public.musicos_unificado WHERE ativo = true;

-- Deve retornar comuns
SELECT DISTINCT comum FROM public.musicos_unificado WHERE ativo = true LIMIT 10;
```

## 🚨 CORREÇÃO CRÍTICA

Se o sistema estava funcionando antes e parou de funcionar, provavelmente:
1. RLS foi habilitado na tabela `musicos_unificado` sem políticas
2. Ou as políticas foram removidas/modificadas

**Solução**: Execute o script `RLS_POLICY_MUSICOS_UNIFICADO.sql` para restaurar as políticas corretas.

