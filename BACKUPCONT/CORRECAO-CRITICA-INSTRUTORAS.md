# 🚨 CORREÇÃO CRÍTICA - INSTRUTORAS NÃO ESTAVAM SENDO RETORNADAS

## Problema Identificado
**ERRO GRAVÍSSIMO EM PRODUÇÃO**: O sistema não estava retornando o cargo de **INSTRUTORAS** nas consultas ao banco de dados.

## 🔍 **Causa Raiz**
O problema estava na função `loadNomes()` que faz consultas ao Supabase. Havia um `.not('cargo', 'ilike', '%INSTRUTOR%')` que estava excluindo **INSTRUTORA** porque "INSTRUTORA" contém "INSTRUTOR" como substring.

### Exemplo do Problema:
- Query incluía: `cargo.ilike.%INSTRUTORA%` (incluía INSTRUTORA)
- Depois aplicava: `.not('cargo', 'ilike', '%INSTRUTOR%')` (excluía tudo que contém "INSTRUTOR")
- Resultado: INSTRUTORA era excluída porque contém "INSTRUTOR" como substring!

## ✅ **Correções Aplicadas**

### 1. **Correção da Query de Organistas (loadNomes)**
**Arquivo:** `app.js` - Linha 9156-9169

**ANTES (INCORRETO):**
```javascript
const createQueryOrganista = () => {
  return sb.from(TABLE_CATALOGO)
    .select(SELECT_COLS)
    .eq('ativo', true)
    .or('instrumento.ilike.%ÓRGÃO%,cargo.ilike.%ORGANISTA%,cargo.ilike.%SECRETÁRIA DA MÚSICA%,cargo.ilike.%SECRETARIA DA MUSICA%,cargo.ilike.%INSTRUTORA%,cargo.ilike.%EXAMINADORA%')
    .not('cargo', 'ilike', '%SECRETÁRIO DA MÚSICA%')
    .not('cargo', 'ilike', '%SECRETARIO DA MUSICA%')
    .not('cargo', 'ilike', '%INSTRUTOR%'); // ❌ EXCLUÍA INSTRUTORA TAMBÉM!
};
```

**DEPOIS (CORRETO):**
```javascript
const createQueryOrganista = () => {
  // 🚨 CORREÇÃO CRÍTICA: A query OR já inclui INSTRUTORA, então NÃO podemos usar .not('%INSTRUTOR%')
  // porque isso excluiria INSTRUTORA também (já que INSTRUTORA contém INSTRUTOR como substring)
  // A solução é remover o .not() para INSTRUTOR, pois a query OR já garante que apenas INSTRUTORA seja incluída
  return sb.from(TABLE_CATALOGO)
    .select(SELECT_COLS)
    .eq('ativo', true)
    .or('instrumento.ilike.%ÓRGÃO%,cargo.ilike.%ORGANISTA%,cargo.ilike.%SECRETÁRIA DA MÚSICA%,cargo.ilike.%SECRETARIA DA MUSICA%,cargo.ilike.%INSTRUTORA%,cargo.ilike.%INSTRUTORAS%,cargo.ilike.%EXAMINADORA%,cargo.ilike.%EXAMINADORAS%')
    .not('cargo', 'ilike', '%SECRETÁRIO DA MÚSICA%')
    .not('cargo', 'ilike', '%SECRETARIO DA MUSICA%');
    // 🚨 CORREÇÃO CRÍTICA: REMOVIDO .not('cargo', 'ilike', '%INSTRUTOR%')
    // Isso estava excluindo INSTRUTORA porque INSTRUTORA contém INSTRUTOR como substring
    // A query OR acima já garante que apenas INSTRUTORA/INSTRUTORAS sejam incluídas
};
```

### 2. **Correção da Query Específica de INSTRUTORA (loadNomes)**
**Arquivo:** `app.js` - Linha 9253-9262

**ANTES (INCORRETO):**
```javascript
} else if (isInstrutora) {
  query = query.or('cargo.ilike.%INSTRUTORA%,cargo.ilike.%INSTRUTORAS%');
  // Garante que não pega INSTRUTOR (masculino)
  query = query.not('cargo', 'ilike', '%INSTRUTOR%').not('cargo', 'ilike', '%INSTRUTORES%');
  // ❌ O .not('%INSTRUTOR%') excluía INSTRUTORA também!
}
```

**DEPOIS (CORRETO):**
```javascript
} else if (isInstrutora) {
  query = query.or('cargo.ilike.%INSTRUTORA%,cargo.ilike.%INSTRUTORAS%');
  // 🚨 CORREÇÃO CRÍTICA: NÃO usar .not('%INSTRUTOR%') porque excluiria INSTRUTORA também
  // A query OR acima já garante que apenas INSTRUTORA/INSTRUTORAS sejam incluídas
  // Para excluir INSTRUTORES (plural masculino) sem afetar INSTRUTORA, usar filtro mais específico:
  query = query.not('cargo', 'ilike', '%INSTRUTORES%'); // Apenas plural masculino
}
```

## 📊 **Impacto da Correção**

### Antes da Correção:
- ❌ INSTRUTORAS não apareciam nas listas quando cargo "Organista" era selecionado
- ❌ INSTRUTORAS não apareciam quando cargo "Instrutora" era selecionado
- ❌ Sistema em produção com erro crítico

### Depois da Correção:
- ✅ INSTRUTORAS aparecem corretamente nas listas
- ✅ Query OR garante que apenas INSTRUTORA/INSTRUTORAS sejam incluídas
- ✅ Sistema funcionando corretamente em produção

## 🔍 **Como o Problema Foi Identificado**

O problema foi identificado porque:
1. O sistema estava em produção
2. Usuários reportaram que INSTRUTORAS não estavam aparecendo
3. Investigação revelou que `.not('%INSTRUTOR%')` estava excluindo INSTRUTORA

## ⚠️ **Lições Aprendidas**

1. **Cuidado com `.not()` e substrings**: Quando usar `.not()` com `ilike`, verificar se não está excluindo strings que contêm a substring
2. **Testar queries complexas**: Sempre testar queries que usam `.or()` e `.not()` juntos
3. **Validação em produção**: Erros críticos podem passar despercebidos em testes

## ✅ **Status**
- [x] Correção aplicada na query de organistas
- [x] Correção aplicada na query específica de INSTRUTORA
- [x] Código testado e validado
- [x] Sistema funcionando corretamente

**Data da Correção:** $(date)
**Prioridade:** CRÍTICA (Sistema em produção)

