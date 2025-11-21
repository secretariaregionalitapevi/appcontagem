# 📋 Guia de Versionamento

Este documento descreve o sistema de versionamento utilizado neste projeto e como fazer releases.

## 📌 Sistema de Versionamento Semântico (SemVer)

Utilizamos [Semantic Versioning](https://semver.org/) no formato `MAJOR.MINOR.PATCH`:

- **MAJOR** (X.0.0): Mudanças incompatíveis na API ou funcionalidades que quebram compatibilidade
- **MINOR** (0.X.0): Novas funcionalidades adicionadas de forma compatível com versões anteriores
- **PATCH** (0.0.X): Correções de bugs e pequenas melhorias que não alteram funcionalidades existentes

## 🏷️ Formato de Versão

```
vMAJOR.MINOR.PATCH[-PRERELEASE][+BUILD]
```

**Exemplos:**
- `v1.0.0` - Release inicial estável
- `v1.1.0` - Nova funcionalidade (modal de novo registro)
- `v1.1.1` - Correção de bug
- `v1.2.0-beta.1` - Pré-release para testes
- `v1.2.0+20240127` - Build com metadata

## 📝 Estrutura do CHANGELOG.md

O arquivo `CHANGELOG.md` segue o formato [Keep a Changelog](https://keepachangelog.com/):

```markdown
## [Versão] - YYYY-MM-DD

### Adicionado
- Novas funcionalidades

### Modificado
- Mudanças em funcionalidades existentes

### Corrigido
- Correções de bugs

### Removido
- Funcionalidades removidas

### Segurança
- Correções de segurança
```

## 🔄 Processo de Release

### 1. Preparação

1. Atualizar a versão no `package.json`:
   ```json
   {
     "version": "1.1.0"
   }
   ```

2. Atualizar o `CHANGELOG.md` com as mudanças da versão

3. Verificar se todos os testes passam

### 2. Commit e Tag

```bash
# Adicionar arquivos modificados
git add .

# Commit com mensagem descritiva
git commit -m "feat: Adiciona modal de novo registro e sistema de fila offline melhorado

- Adiciona modal para registro de visitantes de outras cidades
- Melhora sistema de fila offline com indicadores visuais
- Implementa sincronização automática ao restaurar conexão
- Adiciona contador de itens em fila em tempo real"

# Criar tag da versão
git tag -a v1.1.0 -m "Release v1.1.0: Modal de novo registro e melhorias na fila offline"

# Push do commit e tags
git push origin master
git push origin v1.1.0
```

### 3. Mensagens de Commit

Seguimos o padrão [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` Nova funcionalidade
- `fix:` Correção de bug
- `docs:` Mudanças na documentação
- `style:` Formatação, ponto e vírgula faltando, etc
- `refactor:` Refatoração de código
- `perf:` Melhoria de performance
- `test:` Adição ou correção de testes
- `chore:` Mudanças em build, dependências, etc

**Formato:**
```
<tipo>(<escopo>): <descrição curta>

<descrição detalhada opcional>

<rodapé opcional>
```

## 📊 Histórico de Versões

### v1.1.0 - 2025-01-27
- Modal de novo registro para visitantes de outras cidades
- Sistema de fila offline melhorado com indicadores visuais
- Sincronização automática ao restaurar conexão
- Contador de itens em fila em tempo real

### v1.0.0 - 2024-01-XX
- Release inicial
- Sistema completo de registro de presença
- Integração com Supabase e Google Sheets
- Armazenamento offline

## 🎯 Próximas Versões Planejadas

### v1.2.0 (Planejado)
- [ ] Melhorias na interface do modal de novo registro
- [ ] Histórico de sincronizações
- [ ] Relatórios de registros

### v1.3.0 (Planejado)
- [ ] Exportação de dados
- [ ] Filtros avançados
- [ ] Dashboard de estatísticas

## 📌 Tags e Branches

- **master**: Branch principal com código estável
- **develop**: Branch de desenvolvimento
- **feature/**: Branches para novas funcionalidades
- **fix/**: Branches para correções de bugs
- **release/**: Branches para preparação de releases

## 🔍 Verificação de Versão

Para verificar a versão atual:

```bash
# Versão no package.json
cat package.json | grep version

# Última tag
git describe --tags --abbrev=0

# Todas as tags
git tag -l
```

## 📝 Notas Importantes

1. **Sempre atualize o CHANGELOG.md** antes de fazer release
2. **Use tags semânticas** para facilitar rastreamento
3. **Teste em dispositivos móveis** antes de fazer release
4. **Documente breaking changes** claramente
5. **Mantenha o histórico** de versões atualizado

## 🚀 Checklist de Release

- [ ] Versão atualizada no `package.json`
- [ ] `CHANGELOG.md` atualizado
- [ ] Testes passando
- [ ] Testado em dispositivos móveis (Android/iOS)
- [ ] Testado em navegadores (Chrome, Firefox, Safari)
- [ ] Commit criado com mensagem descritiva
- [ ] Tag criada com versão
- [ ] Push realizado (commit + tag)
- [ ] Documentação atualizada (se necessário)

