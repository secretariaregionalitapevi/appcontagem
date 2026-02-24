# Sistema de Contagem – SAC

Aplicativo mobile para registro de participantes em eventos (ensaios) da Congregação Cristã no Brasil.

## Tecnologias

- **React Native** com **Expo**
- **TypeScript**
- **Supabase** (autenticação + banco de dados)
- **Google Sheets API** (integração via REST)
- **SQLite** (armazenamento offline)
- **expo-secure-store** (armazenamento seguro de tokens)

## Pré-requisitos

- Node.js (versão 18 ou superior)
- npm ou yarn
- Expo CLI (`npm install -g expo-cli`)
- Conta no Supabase
- Conta no Google (para Google Sheets)

## Configuração

### 1. Instalar dependências

```bash
npm install
```

### 2. Configurar variáveis de ambiente

Crie um arquivo `.env` na raiz do projeto com as seguintes variáveis:

```env
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_ANON_KEY=sua_chave_anon_publica
SHEETS_ENDPOINT_URL=https://script.google.com/macros/s/SEU_SCRIPT_ID/exec
```

**Importante:** Nunca commite o arquivo `.env` no repositório. Ele já está no `.gitignore`.

### 3. Configurar Supabase

#### Criar tabelas no Supabase

Execute os seguintes SQL no SQL Editor do Supabase:

```sql
-- Tabela de comuns (congregações)
CREATE TABLE IF NOT EXISTS comuns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de cargos
CREATE TABLE IF NOT EXISTS cargos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome TEXT NOT NULL,
  is_musical BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de instrumentos
CREATE TABLE IF NOT EXISTS instrumentos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de pessoas
CREATE TABLE IF NOT EXISTS pessoas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome TEXT NOT NULL,
  sobrenome TEXT NOT NULL,
  comum_id UUID NOT NULL REFERENCES comuns(id),
  cargo_id UUID NOT NULL REFERENCES cargos(id),
  instrumento_id UUID REFERENCES instrumentos(id),
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de registros de presença
CREATE TABLE IF NOT EXISTS registros_presenca (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pessoa_id UUID NOT NULL REFERENCES pessoas(id),
  comum_id UUID NOT NULL REFERENCES comuns(id),
  cargo_id UUID NOT NULL REFERENCES cargos(id),
  instrumento_id UUID REFERENCES instrumentos(id),
  local_ensaio TEXT NOT NULL,
  data_hora_registro TIMESTAMP WITH TIME ZONE NOT NULL,
  usuario_responsavel UUID NOT NULL,
  status_sincronizacao TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_pessoas_comum_cargo ON pessoas(comum_id, cargo_id);
CREATE INDEX IF NOT EXISTS idx_pessoas_comum_cargo_instrumento ON pessoas(comum_id, cargo_id, instrumento_id);
CREATE INDEX IF NOT EXISTS idx_registros_status ON registros_presenca(status_sincronizacao);
```

#### Configurar Row Level Security (RLS)

Configure as políticas RLS no Supabase para permitir que usuários autenticados leiam e escrevam dados:

```sql
-- Habilitar RLS
ALTER TABLE comuns ENABLE ROW LEVEL SECURITY;
ALTER TABLE cargos ENABLE ROW LEVEL SECURITY;
ALTER TABLE instrumentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE pessoas ENABLE ROW LEVEL SECURITY;
ALTER TABLE registros_presenca ENABLE ROW LEVEL SECURITY;

-- Políticas para leitura (todos autenticados podem ler)
CREATE POLICY "Usuários autenticados podem ler comuns" ON comuns
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Usuários autenticados podem ler cargos" ON cargos
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Usuários autenticados podem ler instrumentos" ON instrumentos
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Usuários autenticados podem ler pessoas" ON pessoas
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Usuários autenticados podem ler registros" ON registros_presenca
  FOR SELECT USING (auth.role() = 'authenticated');

-- Políticas para escrita (todos autenticados podem criar registros)
CREATE POLICY "Usuários autenticados podem criar registros" ON registros_presenca
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');
```

### 4. Configurar Google Sheets

#### Criar um Apps Script

1. Crie uma nova planilha no Google Sheets
2. Vá em **Extensões** > **Apps Script**
3. Cole o seguinte código:

```javascript
function doPost(e) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    
    // Se a primeira linha estiver vazia, adicionar cabeçalhos
    if (sheet.getLastRow() === 0) {
      sheet.appendRow([
        'Data/Hora',
        'Pessoa ID',
        'Comum ID',
        'Cargo ID',
        'Instrumento ID',
        'Local Ensaio',
        'Usuário Responsável'
      ]);
    }
    
    const data = JSON.parse(e.postData.contents);
    
    // Adicionar linha com os dados
    sheet.appendRow([
      data.data_hora_registro,
      data.pessoa_id,
      data.comum_id,
      data.cargo_id,
      data.instrumento_id || '',
      data.local_ensaio,
      data.usuario_responsavel
    ]);
    
    return ContentService
      .createTextOutput(JSON.stringify({ success: true }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ 
        success: false, 
        message: error.toString() 
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
```

4. Salve o script
5. Publique como **Web App**:
   - Execute como: **Eu**
   - Quem tem acesso: **Qualquer pessoa**
   - Clique em **Implantar** > **Nova implantação**
   - Copie a URL do Web App e use como `SHEETS_ENDPOINT_URL` no `.env`

## Executando o aplicativo

### Desenvolvimento

```bash
npm start
```

Isso abrirá o Expo Dev Tools. Você pode:
- Pressionar `i` para abrir no iOS Simulator
- Pressionar `a` para abrir no Android Emulator
- Escanear o QR code com o app Expo Go no seu dispositivo físico

### Build para produção

```bash
# Android
expo build:android

# iOS
expo build:ios
```

## Estrutura do Projeto

```
src/
├── components/          # Componentes reutilizáveis
├── config/              # Configurações (env, etc)
├── context/             # Contextos React (Auth)
├── database/            # Configuração do SQLite
├── hooks/               # Hooks customizados
├── navigation/          # Configuração de navegação
├── screens/             # Telas do app
├── services/            # Serviços (Supabase, Google Sheets, etc)
├── theme/               # Tema (cores, espaçamentos)
├── types/               # Tipos TypeScript
└── utils/               # Utilitários
```

## Funcionalidades

### Autenticação
- Login e cadastro de usuários
- Armazenamento seguro de tokens com `expo-secure-store`
- Renovação automática de sessão

### Registro de Participantes
- Seleção de Comum, Cargo e Instrumento
- Filtro dinâmico de pessoas baseado nas seleções
- Busca por texto nos campos de seleção

### Modo Offline
- Armazenamento local de dados de referência (comuns, cargos, instrumentos, pessoas)
- Fila de registros pendentes quando offline
- Sincronização automática quando a conexão voltar
- Contador de itens pendentes na interface

### Integração com Google Sheets
- Envio automático de registros para planilha
- Tratamento de erros e retry automático

## Testes

```bash
npm test
```

## Licença

Este projeto é privado e de uso interno da Congregação Cristã no Brasil.

## Suporte

Para problemas ou dúvidas, entre em contato com a equipe de desenvolvimento.

