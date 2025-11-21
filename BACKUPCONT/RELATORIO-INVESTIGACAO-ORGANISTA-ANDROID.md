# 🔍 Relatório de Investigação: Problema de Envio de Registros de Organista no Android

## 📋 Resumo Executivo

**Problema Reportado:** Um usuário está conseguindo enviar registros normalmente, mas especificamente os registros de **organista** não estão sendo enviados no celular Android dela.

**Status:** Sistema funcionando normalmente para outros usuários/dispositivos. Investigação realizada sem alterações no código.

**Data da Investigação:** $(date)

---

## 🎯 Pontos de Investigação Identificados

### 1. **Validações de Segurança que Podem Bloquear o Envio**

#### 1.1. Filtro de Gênero para Organistas
**Localização:** `app.js` - Função `enviarDadosModal()` (linhas 14112-14151) e `collectFormData()` (linhas 15756-15774)

**Descrição:** O sistema possui um filtro de segurança que **comporta-se de forma diferente** dependendo do fluxo utilizado:

**A. Modal (`enviarDadosModal`) - BLOQUEIA O ENVIO:**
```javascript
if (isOrganistaFilter) {
  const cargoReal = cargoEl ? cargoEl.getAttribute('data-cargo-real') : null;
  if (cargoReal) {
    const cargoRealUpper = cargoReal.toUpperCase();
    const isCargoMasculino = (cargoRealUpper.includes('INSTRUTOR') && !cargoRealUpper.includes('INSTRUTORA')) ||
                            cargoRealUpper.includes('SECRETÁRIO DO GEM') ||
                            cargoRealUpper.includes('SECRETARIO DO GEM') ||
                            (cargoRealUpper.includes('SECRETÁRIO') && cargoRealUpper.includes('MÚSICA') && !cargoRealUpper.includes('SECRETÁRIA'));
    
    if (isCargoMasculino) {
      showToast('error', 'Erro de Gênero', 'Organistas não podem ter cargos masculinos. Cadastro desatualizado no SAM.', 8000);
      isModalProcessing = false;
      return; // ⚠️ BLOQUEIA O ENVIO NO MODAL
    }
  }
}
```

**B. Formulário Principal (`collectFormData`) - NÃO BLOQUEIA:**
```javascript
if (cargoOriginalUpper === 'ORGANISTA') {
  const isCargoMasculino = (cargoRealUpper.includes('INSTRUTOR') && !cargoRealUpper.includes('INSTRUTORA')) ||
                          cargoRealUpper.includes('SECRETÁRIO DO GEM') ||
                          cargoRealUpper.includes('SECRETARIO DO GEM') ||
                          (cargoRealUpper.includes('SECRETÁRIO') && cargoRealUpper.includes('MÚSICA') && !cargoRealUpper.includes('SECRETÁRIA'));
  
  if (isCargoMasculino) {
    console.log('🚨 ERRO CRÍTICO BLOQUEADO: Tentativa de usar cargo masculino para organista:', cargoReal);
    console.log('🚨 Mantendo cargo original "Organista" para evitar erro de gênero');
    // 🚨 CORREÇÃO: Não bloquear envio - apenas manter cargo como "Organista"
    // showToast('error', 'Erro de Gênero', 'Organistas não podem ter cargos masculinos. Verifique o cadastro.', 5000);
    // return null; // Removido - não bloquear envio
    // Manter cargo como "Organista" e continuar
  }
}
```

**⚠️ DIFERENÇA CRÍTICA:** 
- **Modal:** Bloqueia o envio se detectar cargo masculino
- **Formulário Principal:** Mantém cargo como "Organista" e continua o envio

**Possível Causa:** Se o usuário estiver usando o **modal** e o cadastro no SAM tiver cargo masculino associado, o sistema bloqueia o envio. No Android, a mensagem de erro pode não estar sendo exibida corretamente ou o usuário pode não estar percebendo.

**Recomendação:** 
1. Verificar qual fluxo o usuário está usando (modal ou formulário principal)
2. Verificar se o usuário está vendo alguma mensagem de erro ao tentar enviar
3. Verificar o cadastro no SAM da organista para confirmar se há cargo masculino associado

---

### 2. **Validações de Classe de Organista**

#### 2.1. Validação de Classe Obrigatória
**Localização:** `app.js` - Múltiplas validações em `enviarDadosModal()` e `collectFormData()`

**Descrição:** O sistema possui várias validações que garantem que organistas sempre tenham uma classe definida. Se a classe não for encontrada, o sistema aplica automaticamente "OFICIALIZADA".

**Validações Encontradas:**

1. **Linha 13753** - Modal (Mobile Fix):
```javascript
if (isMobileDevice && isOrganista && !classe) {
  console.log('📱 MOBILE FIX: Organista sem classe no modal - aplicando padrão OFICIALIZADA');
  classe = 'OFICIALIZADA';
}
```

2. **Linha 13812** - Modal (Correção Geral):
```javascript
if (isOrganista && !classe) {
  console.log('⚠️ Organista sem classe definida - aplicando padrão "OFICIALIZADA"');
  classe = 'OFICIALIZADA';
}
```

3. **Linha 13919** - Modal Offline (Mobile Fix):
```javascript
if (isMobileDeviceOffline && isOrganista && !dadosModal["CLASSE_ORGANISTA"]) {
  console.error('🚨 ERRO CRÍTICO MOBILE MODAL OFFLINE: Organista sem classe! Corrigindo...');
  dadosModal["CLASSE_ORGANISTA"] = classe || 'OFICIALIZADA';
}
```

4. **Linha 14079** - Modal Online (Mobile Fix):
```javascript
if (isMobileDevice && isOrganista && !dadosModal["CLASSE_ORGANISTA"]) {
  console.error('🚨 ERRO CRÍTICO MOBILE MODAL: Organista sem classe! Corrigindo...');
  dadosModal["CLASSE_ORGANISTA"] = classe || 'OFICIALIZADA';
}
```

5. **Linha 16297** - Formulário Principal:
```javascript
if ((isOrganista || isExaminadora) && !classe) {
  console.log('🎹 Organista ou cargo relacionado sem classe, tentando buscar novamente...');
  // Busca classe no cache ou faz consulta direta
}
```

6. **Linha 16584** - Formulário Principal (Correção Crítica):
```javascript
if (isOrganista && !classeFinal) {
  classeFinal = 'OFICIALIZADA';
  console.log(`🎯 MOBILE FIX: Aplicando classe automática OFICIALIZADA para ORGANISTA`);
}
```

7. **Linha 16648** - Formulário Principal (Validação Final):
```javascript
if (isOrganista && !isNomeManual && !classeParaPayload) {
  console.error('🚨 ERRO CRÍTICO MOBILE: Organista sem classe no payload! Forçando OFICIALIZADA');
  classeFinal = 'OFICIALIZADA';
}
```

8. **Linha 16675** - Formulário Principal (Validação do Payload):
```javascript
if (isMobileDevice && isOrganista && !isNomeManual) {
  if (!payload.classe && !payload.nivel) {
    console.error('🚨 ERRO CRÍTICO MOBILE: Payload de organista sem classe! Corrigindo...');
    payload.classe = classeFinal || 'OFICIALIZADA';
    payload.nivel = classeFinal || nivel || 'OFICIALIZADA';
  }
}
```

**Análise:** O sistema possui **múltiplas camadas de validação** que garantem que organistas sempre tenham classe. Se uma validação falhar, a próxima deve corrigir. No entanto, se todas falharem, o registro pode ser enviado sem classe, o que pode causar problemas no backend.

**Possível Causa:** Se todas as validações falharem simultaneamente (cenário raro), o registro pode ser enviado sem classe, e o backend pode estar rejeitando esses registros.

---

### 3. **Detecção de Organista**

#### 3.1. Lógica de Detecção
**Localização:** `app.js` - Múltiplas funções

**Descrição:** O sistema detecta organistas através de comparação case-insensitive do cargo:

```javascript
const cargoUP = ucase(cargo);
const isOrganista = cargoUP === 'ORGANISTA' || cargoOriginal.toUpperCase() === 'ORGANISTA';
```

**Possível Causa:** Se o cargo não estiver exatamente como "ORGANISTA" (com espaços extras, caracteres especiais, etc.), a detecção pode falhar. No Android, pode haver problemas com normalização de strings.

**Recomendação:** Verificar se o cargo está sendo selecionado corretamente no formulário Android. Verificar também se há espaços extras ou caracteres invisíveis.

---

### 4. **Coleta de Classe do Banco de Dados**

#### 4.1. Busca de Classe de Organista
**Localização:** `app.js` - Função `collectFormData()` (linhas 15865-15935)

**Descrição:** O sistema busca a classe de organista no banco de dados quando detecta um cargo musical:

```javascript
if (isCargoMusical && nomeCompleto && comum && !classe) {
  const { data } = await sb
    .from(TABLE_CATALOGO)
    .select('cargo, nivel, instrumento')
    .ilike('nome', `%${nomeCompleto}%`)
    .ilike(COL_COMUM, `%${comum}%`)
    .ilike('cargo', '%ORGANISTA%')
    .eq('ativo', true)
    .limit(1);
}
```

**Possível Causa:** 
- Se a conexão com o Supabase estiver lenta ou instável no Android, a consulta pode falhar ou demorar muito
- Se o nome ou comum não corresponderem exatamente ao banco, a classe não será encontrada
- Se o registro no banco não tiver a flag `ativo = true`, a classe não será encontrada

**Recomendação:** Verificar logs do console no Android para ver se há erros na consulta ao banco. Verificar também se o nome e comum estão corretos no banco de dados.

---

### 5. **Validações em `sendToGoogleSheets()`**

#### 5.1. Validações que Podem Lançar Erros
**Localização:** `app.js` - Função `sendToGoogleSheets()` (linhas 2271-2304)

**Descrição:** A função `sendToGoogleSheets()` possui validações críticas que lançam erros se campos obrigatórios estiverem vazios:

```javascript
// Validação crítica: Verificar se cargo está preenchido corretamente
const cargo = dadosProcessados.cargo || dadosProcessados.CARGO;
if (!cargo || cargo.trim() === '') {
  console.error('❌ ERRO CRÍTICO: Cargo não pode estar vazio ao enviar');
  if (uuid && window.activeSubmissions) window.activeSubmissions.delete(uuid);
  throw new Error('Cargo é obrigatório');
}

// Validação crítica: Verificar se nome está preenchido corretamente
const nome = dadosProcessados.nome || dadosProcessados.NOME;
if (!nome || nome.trim() === '') {
  console.error('❌ ERRO CRÍTICO: Nome não pode estar vazio ao enviar');
  if (uuid && window.activeSubmissions) window.activeSubmissions.delete(uuid);
  throw new Error('Nome é obrigatório');
}

// Validação crítica: Verificar se comum está preenchido corretamente
const comum = dadosProcessados.comum || dadosProcessados.COMUM;
if (!comum || comum.trim() === '') {
  console.error('❌ ERRO CRÍTICO: Comum não pode estar vazia ao enviar');
  if (uuid && window.activeSubmissions) window.activeSubmissions.delete(uuid);
  throw new Error('Comum é obrigatória');
}
```

**Possível Causa:** Se algum desses campos estiver vazio ou não for passado corretamente no payload, a função lança um erro que pode interromper o envio. No Android, esses erros podem não estar sendo tratados corretamente ou podem estar sendo silenciados.

**Recomendação:** Verificar logs do console para ver se há erros sendo lançados por essas validações. Verificar também se o payload está sendo montado corretamente antes de chamar `sendToGoogleSheets()`.

---

### 6. **Problemas Específicos do Android**

#### 6.1. Detecção de Dispositivo Mobile
**Localização:** `app.js` - Linha 38-59

**Descrição:** O sistema detecta Android através do user agent:

```javascript
var isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
var isAndroid = /Android/.test(navigator.userAgent) && isMobile;
```

**Possível Causa:** Se o user agent do navegador Android não contiver "Android", o sistema pode não aplicar as correções específicas para mobile.

**Recomendação:** Verificar se `isMobile` e `isAndroid` estão sendo detectados corretamente no dispositivo da usuária.

---

#### 6.2. Timeout de Requisições
**Localização:** `app.js` - Função `enviarParaSheets()` e outras funções de envio

**Descrição:** O sistema possui timeouts de 8 segundos para requisições:

```javascript
const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 segundos timeout
```

**Possível Causa:** Se a conexão do Android estiver lenta, a requisição pode ser cancelada antes de completar. Nesse caso, o registro seria salvo na fila offline, mas pode não ser sincronizado imediatamente.

**Recomendação:** Verificar se há registros na fila offline do dispositivo. Verificar também a velocidade da conexão do usuário.

---

### 7. **Fluxo de Envio de Dados**

#### 7.1. Formulário Principal vs Modal
**Descrição:** O sistema possui dois fluxos de envio com comportamentos diferentes:

1. **Formulário Principal** (`collectFormData()` → `sendToGoogleSheets()`):
   - Usado para registros normais da regional
   - Filtro de gênero NÃO bloqueia (apenas mantém cargo como "Organista")
   - Múltiplas validações de classe
   - Envia para Google Sheets via `sendToGoogleSheets()`

2. **Modal** (`enviarDadosModal()`):
   - Usado para registros de outras regionais
   - Filtro de gênero BLOQUEIA o envio se detectar cargo masculino
   - Validações de classe específicas para mobile
   - Envia diretamente para Google Sheets via fetch

**⚠️ DIFERENÇAS CRÍTICAS:**
- **Filtro de Gênero:** Modal bloqueia, formulário principal não bloqueia
- **Validações:** Modal tem validações específicas para mobile
- **Fluxo de Envio:** Modal envia diretamente, formulário principal passa por `sendToGoogleSheets()`

**Possível Causa:** Se o usuário estiver usando o modal e o cadastro tiver cargo masculino, o envio será bloqueado. Se estiver usando o formulário principal, o envio continuará mas com cargo corrigido.

**Recomendação:** 
1. Verificar qual fluxo o usuário está usando (modal ou formulário principal)
2. Verificar se há diferenças no comportamento entre os dois fluxos
3. Verificar se o problema ocorre apenas no modal ou também no formulário principal

---

## 🔍 Checklist de Diagnóstico

Para identificar a causa raiz do problema, recomenda-se verificar:

### ✅ Verificações Imediatas

1. **Console do Navegador Android:**
   - Abrir o console do navegador no Android (via Chrome DevTools remoto)
   - Tentar enviar um registro de organista
   - Verificar se há erros no console
   - Verificar se há mensagens de validação sendo exibidas

2. **Mensagens de Erro:**
   - Verificar se o usuário está vendo alguma mensagem de erro ao tentar enviar
   - Verificar se há mensagens de "Erro de Gênero" ou outras validações

3. **Cadastro no SAM:**
   - Verificar se a organista tem cargo masculino associado no SAM
   - Verificar se o nome e comum estão corretos no banco de dados
   - Verificar se o registro está ativo (`ativo = true`)

4. **Classe de Organista:**
   - Verificar se a classe está sendo preenchida automaticamente
   - Verificar se o campo de classe está visível e acessível no Android
   - Verificar se há classe no banco de dados para essa organista

5. **Conexão e Sincronização:**
   - Verificar se há registros na fila offline
   - Verificar se a sincronização está funcionando
   - Verificar a velocidade da conexão do usuário

6. **User Agent:**
   - Verificar se o sistema está detectando corretamente o Android
   - Verificar se `isMobile` e `isAndroid` estão `true`

7. **Fluxo Utilizado (CRÍTICO):**
   - Verificar se o usuário está usando o formulário principal ou o modal
   - **IMPORTANTE:** O filtro de gênero bloqueia apenas no modal, não no formulário principal
   - Verificar se há diferenças no comportamento entre os dois
   - Verificar se o problema ocorre apenas em um dos fluxos

---

## 📊 Pontos Críticos Identificados

### 🚨 Alto Risco

1. **Filtro de Gênero Bloqueando Envio (APENAS NO MODAL):**
   - Se o cadastro tiver cargo masculino E o usuário estiver usando o MODAL, o sistema bloqueia o envio
   - No formulário principal, o sistema mantém cargo como "Organista" e continua
   - A mensagem de erro pode não estar sendo exibida corretamente no Android
   - **Ação:** Verificar qual fluxo está sendo usado (modal ou formulário principal), cadastro no SAM e mensagens de erro

2. **Falha em Múltiplas Validações de Classe:**
   - Se todas as validações de classe falharem, o registro pode ser enviado sem classe
   - O backend pode estar rejeitando esses registros
   - **Ação:** Verificar logs do backend para ver se há registros sendo rejeitados

### ⚠️ Médio Risco

3. **Timeout de Requisições:**
   - Conexão lenta pode causar cancelamento de requisições
   - Registros podem ficar na fila offline sem sincronizar
   - **Ação:** Verificar fila offline e velocidade de conexão

4. **Detecção de Organista Falhando:**
   - Problemas com normalização de strings podem fazer a detecção falhar
   - **Ação:** Verificar se o cargo está sendo selecionado corretamente

5. **Consulta ao Banco de Dados Falhando:**
   - Conexão instável pode fazer a consulta falhar
   - Nome/comum não correspondendo pode fazer a classe não ser encontrada
   - **Ação:** Verificar logs de consulta e dados no banco

---

## 💡 Recomendações

### Imediatas

1. **Solicitar ao usuário:**
   - Abrir o console do navegador (Chrome DevTools remoto)
   - Tentar enviar um registro de organista
   - Copiar todos os logs do console
   - Verificar se há mensagens de erro sendo exibidas na tela

2. **Verificar no backend:**
   - Verificar se há registros de organista sendo rejeitados
   - Verificar se há registros sem classe sendo enviados
   - Verificar logs de erro relacionados a organistas

3. **Verificar cadastro:**
   - Verificar se a organista tem cargo masculino no SAM
   - Verificar se o nome e comum estão corretos
   - Verificar se há classe no banco de dados

### Futuras (se necessário)

1. **Melhorar Logging:**
   - Adicionar mais logs específicos para Android
   - Adicionar logs de todas as validações de organista
   - Adicionar logs de erros de envio

2. **Melhorar Mensagens de Erro:**
   - Garantir que mensagens de erro sejam exibidas corretamente no Android
   - Adicionar mensagens mais específicas para cada tipo de erro

3. **Melhorar Validações:**
   - Adicionar validação final antes do envio que garanta que organistas sempre tenham classe
   - Adicionar fallback mais robusto para casos de falha

---

## 📝 Conclusão

O sistema possui **múltiplas camadas de validação e correção** para garantir que registros de organista sejam enviados corretamente. No entanto, há alguns pontos críticos que podem estar causando o problema:

1. **Filtro de gênero bloqueando envio NO MODAL** (mais provável se usuário estiver usando modal)
   - ⚠️ **IMPORTANTE:** O bloqueio ocorre APENAS no modal, não no formulário principal
   - Se o usuário estiver usando o formulário principal, o sistema mantém cargo como "Organista" e continua
2. **Falha em todas as validações de classe** (menos provável, mas possível)
3. **Problemas de conexão/timeout** (possível em conexões lentas)
4. **Detecção de organista falhando** (possível com problemas de normalização)
5. **Validações em `sendToGoogleSheets()`** (linhas 2271-2304) que podem lançar erros se campos estiverem vazios

**Próximos Passos:**
1. Solicitar logs do console do Android
2. Verificar cadastro no SAM
3. Verificar logs do backend
4. Verificar fila offline do dispositivo

**Importante:** Não foram feitas alterações no código durante esta investigação, conforme solicitado. Este relatório serve como base para diagnóstico e futuras correções, se necessário.

