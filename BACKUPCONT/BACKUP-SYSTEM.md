# Sistema de Backup Automático

## Visão Geral

O sistema de backup automático foi implementado para garantir a segurança dos dados do aplicativo, criando backups regulares de todas as informações importantes armazenadas no localStorage.

## Funcionalidades

### 🔄 Backup Automático
- **Intervalo configurável**: 1 hora, 6 horas, 12 horas, 24 horas ou 7 dias
- **Retenção inteligente**: Mantém apenas os backups mais recentes (3, 7, 14 ou 30 backups)
- **Compressão**: Reduz o tamanho dos backups para economizar espaço
- **Inclusão da fila offline**: Backup inclui dados pendentes de sincronização

### 💾 Dados Incluídos no Backup
- Fila de envio offline (`fila_envio`)
- Dados de sessão do usuário (`session_user`, `session_role`, `session_local`)
- Informações do usuário atual (`current_user_id`, `current_user_name`)
- Preferências do usuário (`user_preferences`)
- Dados offline (`offline_data`)
- Configurações de backup (`backup_settings`)

### 🎛️ Interface de Gerenciamento
- **Acesso**: Botão de backup (💾) no cabeçalho da aplicação
- **Configurações**: Ativar/desativar backup automático, definir intervalo e retenção
- **Status**: Visualizar informações sobre backups (total, último backup, próximo backup)
- **Lista de backups**: Ver todos os backups disponíveis com data e tamanho
- **Ações**: Criar backup manual, restaurar backup, excluir backup

## Como Usar

### 1. Acessar o Gerenciador de Backup
1. Clique no botão de backup (💾) no cabeçalho da aplicação
2. O modal de gerenciamento será aberto

### 2. Configurar Backup Automático
1. Na seção "Configurações":
   - Marque/desmarque "Backup automático ativado"
   - Selecione o intervalo desejado
   - Escolha quantos backups manter
2. Clique em "Salvar Configurações"

### 3. Criar Backup Manual
1. Na seção "Status", clique em "Criar Backup Agora"
2. O backup será criado imediatamente

### 4. Restaurar Backup
1. Na lista de backups disponíveis, clique no botão de restaurar (🔄)
2. Confirme a ação (todos os dados atuais serão substituídos)
3. A página será recarregada automaticamente

### 5. Excluir Backup
1. Na lista de backups, clique no botão de excluir (🗑️)
2. Confirme a exclusão

## Configurações Padrão

```javascript
const BACKUP_CONFIG = {
  interval: 24 * 60 * 60 * 1000, // 24 horas
  retention: 7, // Manter 7 backups
  autoBackup: true, // Backup automático ativado
  compress: true, // Comprimir backups
  includeQueue: true, // Incluir fila offline
  includeSettings: true // Incluir configurações
};
```

## Estrutura dos Backups

Cada backup é armazenado no localStorage com a chave `backup_[timestamp]` e contém:

```javascript
{
  timestamp: 1234567890123, // Timestamp da criação
  date: "01/01/2024 12:00:00", // Data formatada
  version: "1.0", // Versão do formato
  data: {
    // Dados do localStorage
    fila_envio: [...],
    session_user: "...",
    // ... outros dados
  }
}
```

## Monitoramento

### Logs do Console
- `💾 Iniciando criação de backup...` - Backup iniciado
- `✅ Backup criado com sucesso` - Backup concluído
- `🗑️ Backup antigo removido` - Limpeza de backups antigos
- `⏰ Verificando necessidade de backup automático...` - Verificação periódica

### Notificações
- Toast de sucesso quando backup é criado
- Toast de erro se houver falha
- Toast de confirmação para ações de restauração/exclusão

## Segurança

- **Validação**: Backups são validados antes da restauração
- **Confirmação**: Ações destrutivas requerem confirmação
- **Isolamento**: Backups não interferem no funcionamento normal do app
- **Recuperação**: Sistema continua funcionando mesmo se backup falhar

## Limitações

- Backups são armazenados no localStorage (limitado pelo navegador)
- Não inclui dados do servidor (apenas dados locais)
- Restauração substitui todos os dados atuais
- Requer JavaScript ativo para funcionar

## Solução de Problemas

### Backup não está sendo criado
1. Verifique se o backup automático está ativado
2. Verifique os logs do console para erros
3. Tente criar um backup manual

### Erro ao restaurar backup
1. Verifique se o backup não está corrompido
2. Tente restaurar um backup mais recente
3. Verifique se há espaço suficiente no localStorage

### Interface não abre
1. Verifique se o jQuery está carregado
2. Verifique se há erros JavaScript no console
3. Tente recarregar a página

## Desenvolvimento

### Funções Principais
- `createBackup()` - Cria um novo backup
- `restoreBackup(key)` - Restaura um backup específico
- `listBackups()` - Lista todos os backups disponíveis
- `startAutoBackup()` - Inicia backup automático
- `stopAutoBackup()` - Para backup automático
- `getBackupStatus()` - Retorna status do sistema

### Personalização
Para modificar as configurações, edite o objeto `BACKUP_CONFIG` no início do arquivo `app.js`.

Para adicionar novos dados ao backup, inclua as chaves no array `BACKUP_KEYS`.
