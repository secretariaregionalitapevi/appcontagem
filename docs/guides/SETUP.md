# Guia de Configuração Rápida

## Passo a Passo para Começar

### 1. Instalar Dependências

```bash
npm install
```

### 2. Configurar Variáveis de Ambiente

Crie um arquivo `.env` na raiz do projeto:

```env
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_ANON_KEY=sua_chave_anon_publica_aqui
SHEETS_ENDPOINT_URL=https://script.google.com/macros/s/SEU_SCRIPT_ID/exec
```

**Onde encontrar essas informações:**

- **SUPABASE_URL** e **SUPABASE_ANON_KEY**: 
  - Acesse seu projeto no Supabase
  - Vá em Settings > API
  - Copie a URL do projeto e a chave "anon public"

- **SHEETS_ENDPOINT_URL**:
  - Crie um Google Apps Script (veja README.md)
  - Publique como Web App
  - Copie a URL gerada

### 3. Configurar Banco de Dados no Supabase

Execute os scripts SQL fornecidos no README.md para criar as tabelas necessárias.

### 4. Executar o App

```bash
npm start
```

### 5. Testar no Dispositivo

- Instale o app Expo Go no seu celular
- Escaneie o QR code exibido no terminal
- Ou use um emulador Android/iOS

## Problemas Comuns

### Erro: "Missing required environment variable"
- Verifique se o arquivo `.env` existe na raiz do projeto
- Certifique-se de que as variáveis estão preenchidas corretamente
- Reinicie o servidor Expo após criar/editar o `.env`

### Erro de conexão com Supabase
- Verifique se a URL e a chave estão corretas
- Confirme que as políticas RLS estão configuradas
- Verifique se o projeto Supabase está ativo

### Erro ao sincronizar dados
- Verifique sua conexão com a internet
- Confirme que as tabelas foram criadas no Supabase
- Verifique os logs do console para mais detalhes

