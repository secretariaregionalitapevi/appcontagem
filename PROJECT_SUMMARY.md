# Resumo do Projeto - Sistema de Contagem SAC

## Visão Geral

Aplicativo mobile completo desenvolvido com React Native + Expo para registro de participantes em eventos da Congregação Cristã no Brasil.

## Arquitetura

### Stack Tecnológico
- **Frontend**: React Native com Expo SDK 50
- **Linguagem**: TypeScript
- **Backend**: Supabase (PostgreSQL + Auth)
- **Integração**: Google Sheets API (REST)
- **Armazenamento Local**: SQLite (expo-sqlite)
- **Segurança**: expo-secure-store para tokens

### Estrutura de Pastas

```
src/
├── components/       # Componentes reutilizáveis da UI
├── config/          # Configurações (env, etc)
├── context/         # Contextos React (Auth)
├── database/        # Configuração SQLite local
├── hooks/           # Hooks customizados
├── navigation/      # Navegação do app
├── screens/         # Telas principais
├── services/        # Lógica de negócio e integrações
├── theme/           # Tema e estilos
├── types/           # Tipos TypeScript
└── utils/           # Utilitários
```

## Funcionalidades Principais

### 1. Autenticação
- ✅ Login e cadastro de usuários
- ✅ Armazenamento seguro de sessão
- ✅ Renovação automática de tokens
- ✅ Persistência de sessão offline

### 2. Registro de Participantes
- ✅ Seleção de Comum (congregação)
- ✅ Seleção de Cargo/Ministério
- ✅ Seleção de Instrumento (para cargos musicais)
- ✅ Filtro dinâmico de pessoas baseado nas seleções
- ✅ Busca por texto nos campos

### 3. Modo Offline
- ✅ Armazenamento local de dados de referência
- ✅ Fila de registros pendentes
- ✅ Sincronização automática quando online
- ✅ Contador de itens pendentes na UI

### 4. Integrações
- ✅ Supabase (autenticação + banco de dados)
- ✅ Google Sheets (envio de registros)
- ✅ Tratamento de erros e retry automático

## Fluxo de Dados

### Registro de Presença
1. Usuário seleciona Comum → Cargo → Instrumento (se aplicável)
2. Sistema filtra pessoas disponíveis
3. Usuário seleciona pessoa
4. Ao enviar:
   - Se online: envia para Supabase + Google Sheets
   - Se offline: salva localmente na fila
5. Sincronização automática quando conexão volta

### Sincronização
1. App detecta conexão online
2. Verifica sessão válida
3. Sincroniza dados de referência (comuns, cargos, etc)
4. Processa fila de registros pendentes
5. Atualiza status de sincronização

## Segurança

- ✅ Tokens armazenados em expo-secure-store
- ✅ Variáveis de ambiente para chaves sensíveis
- ✅ Row Level Security no Supabase
- ✅ Validação de sessão antes de operações remotas

## Próximos Passos

1. Configurar variáveis de ambiente no `.env`
2. Criar tabelas no Supabase (SQL fornecido no README)
3. Configurar Google Apps Script para Sheets
4. Testar fluxo completo de registro
5. Adicionar dados de teste (comuns, cargos, pessoas)

## Notas de Desenvolvimento

- O app funciona completamente offline após primeira sincronização
- Dados de referência são cacheados localmente
- Registros pendentes são sincronizados automaticamente
- Interface inspirada nos designs fornecidos
- Código totalmente tipado com TypeScript

