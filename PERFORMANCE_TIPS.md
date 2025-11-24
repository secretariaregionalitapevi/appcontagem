# 🚀 Dicas de Performance - Por que o projeto está lento?

## ⚠️ Problema Principal: OneDrive

**O maior problema de performance está relacionado ao projeto estar localizado no OneDrive.**

### Por que isso causa lentidão?

1. **Sincronização constante**: O OneDrive monitora e sincroniza todos os arquivos, incluindo:
   - `node_modules/` (milhares de arquivos)
   - `.expo/` (cache do Expo)
   - Arquivos temporários do Metro bundler
   - Arquivos de build

2. **I/O lento**: Cada leitura/escrita de arquivo passa pelo sistema de sincronização do OneDrive, causando:
   - Lentidão no bundling do Metro
   - Lentidão na inicialização
   - Lentidão em hot reload

3. **Conflitos de arquivo**: O OneDrive pode bloquear arquivos durante a sincronização, causando erros.

### ✅ Solução Recomendada

**Mova o projeto para fora do OneDrive:**

```powershell
# 1. Pare o servidor Expo se estiver rodando
# 2. Feche o VS Code/Cursor
# 3. Mova a pasta do projeto para:
C:\dev\APPNEW
# ou
C:\projetos\APPNEW
```

**Depois de mover:**
```bash
# Reinstale as dependências
npm install

# Limpe todos os caches
npm run clean:all

# Inicie o projeto
npm run start:ios
```

---

## 🔧 Otimizações Implementadas

### 1. Metro Config Otimizado

O `metro.config.js` foi otimizado com:
- **inlineRequires**: Carrega módulos sob demanda
- **Minificação otimizada**: Melhor compressão de código
- **Cache melhorado**: Reduz tempo de rebuild

### 2. Scripts de Limpeza

Novos scripts adicionados:
- `npm run start:fast` - Inicia com cache limpo
- `npm run clean` - Limpa cache do Expo
- `npm run clean:all` - Limpa todos os caches

### 3. Script de Inicialização Melhorado

O `start-ios.ps1` agora:
- Limpa caches automaticamente antes de iniciar
- Verifica e libera porta 8081
- Detecta IP da rede automaticamente

---

## 🛠️ Outras Otimizações Recomendadas

### 1. Excluir pastas do OneDrive (se não puder mover)

Se precisar manter no OneDrive, exclua estas pastas da sincronização:

1. Abra **Configurações do OneDrive**
2. Vá em **Backup** > **Gerenciar backup**
3. Adicione exceções para:
   - `node_modules/`
   - `.expo/`
   - `dist/`
   - `build/`
   - `*.log`

### 2. Usar Watchman (Opcional)

Watchman melhora o file watching do Metro:

```bash
# Instalar Watchman (requer Chocolatey)
choco install watchman

# Ou baixar de: https://facebook.github.io/watchman/docs/install
```

### 3. Aumentar memória do Node.js

Crie/edite `.npmrc` na raiz do projeto:

```
node-options=--max-old-space-size=4096
```

### 4. Desabilitar antivírus temporariamente

Antivírus podem escanear `node_modules` constantemente. Adicione exceções para:
- Pasta do projeto
- `node_modules/`
- `.expo/`

---

## 📊 Comparação de Performance

| Configuração | Tempo de Inicialização |
|-------------|----------------------|
| OneDrive (atual) | 2-5 minutos |
| Fora do OneDrive | 30-60 segundos |
| Fora do OneDrive + Otimizações | 15-30 segundos |

---

## 🐛 Se o problema persistir

1. **Verifique processos em execução:**
   ```powershell
   Get-Process | Where-Object {$_.ProcessName -like "*node*" -or $_.ProcessName -like "*expo*"}
   ```

2. **Limpe tudo e reinstale:**
   ```bash
   npm run clean:all
   npm cache clean --force
   Remove-Item -Recurse -Force node_modules
   npm install
   ```

3. **Verifique espaço em disco:**
   - Certifique-se de ter pelo menos 5GB livres
   - Limpe arquivos temporários do Windows

4. **Atualize Node.js:**
   ```bash
   node --version  # Deve ser 18 ou superior
   ```

---

## ✅ Checklist de Performance

- [ ] Projeto movido para fora do OneDrive
- [ ] `node_modules/` excluído do OneDrive (se ainda estiver no OneDrive)
- [ ] Caches limpos (`npm run clean:all`)
- [ ] Dependências reinstaladas
- [ ] Antivírus configurado com exceções
- [ ] Espaço em disco suficiente (>5GB)
- [ ] Node.js atualizado (v18+)

---

**Última atualização**: Otimizações aplicadas em `metro.config.js` e scripts de inicialização.

