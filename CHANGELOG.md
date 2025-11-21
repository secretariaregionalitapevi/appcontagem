# Changelog

Todas as mudanças notáveis neste projeto serão documentadas neste arquivo.

O formato é baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/),
e este projeto adere ao [Versionamento Semântico](https://semver.org/lang/pt-BR/).

## [1.1.0] - 2025-01-27

### Adicionado
- **Modal de Novo Registro**: Permite cadastrar visitantes de outras cidades/regionais que não estão no sistema
  - Campos: Comum, Cidade, Cargo/Ministério, Instrumento (se Músico), Classe (se Organista), Nome completo
  - Validação completa de campos obrigatórios
  - Envio direto para Google Sheets com anotação "Cadastro fora da Regional"
  - Link "+ Novo registro" abaixo do campo de Comum Congregação
- **Sistema de Fila Offline Melhorado**:
  - Indicador visual de quantidade de itens em fila ("X itens em fila")
  - Badge de status com três estados: VAZIO (verde), Pendente (amarelo), Sincronizando (azul)
  - Atualização automática do contador a cada 3 segundos
  - Sincronização automática quando a conexão é restaurada
  - Logs de debug para rastreamento
- **Componente NewRegistrationModal**: Modal completo para registro de visitantes externos
- **Melhorias no OfflineBadge**: Exibe texto "X itens em fila" + badge de status
- **Sincronização Automática**: Detecta restauração de conexão e sincroniza automaticamente

### Modificado
- **useOfflineQueue**: Atualização mais frequente (3s ao invés de 5s) e logs melhorados
- **RegisterScreen**: 
  - Adiciona função `handleSaveNewRegistration` para salvar registros externos
  - Melhora sincronização automática com atualização de contador
  - Adiciona atualização de contador após criar registro
- **OfflineBadge**: Layout melhorado com texto "X itens em fila" + badge
- **PrimaryButton**: Adiciona suporte para ícone customizado

### Corrigido
- Botão "+ Novo registro" agora funciona corretamente ao clicar
- Sincronização automática ao restaurar conexão funciona corretamente
- Contador de fila atualiza em tempo real

## [1.0.0] - 2024-01-XX

### Adicionado
- Tela de autenticação (login/cadastro)
- Tela de registro de participantes
- Integração com Supabase (autenticação + banco de dados)
- Integração com Google Sheets via API REST
- Armazenamento offline com SQLite
- Sincronização automática de dados
- Fila de registros pendentes
- Componentes reutilizáveis (SelectField, TextInputField, PrimaryButton, OfflineBadge)
- Hooks customizados (useAuth, useOnlineStatus, useOfflineQueue)
- Contexto de autenticação
- Tema e estilos globais
- Documentação completa (README, SETUP, CONTRIBUTING)

### Funcionalidades
- Login e cadastro de usuários
- Seleção de comum, cargo e instrumento
- Filtro dinâmico de pessoas baseado nas seleções
- Busca por texto nos campos de seleção
- Registro de presença online e offline
- Sincronização automática quando a conexão volta
- Contador de itens pendentes na interface
- Armazenamento seguro de tokens

