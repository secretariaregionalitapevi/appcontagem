# Guia de Debug

## Problemas Comuns e Soluções

### 1. Página em Branco no Web

**Causa:** Erro de JavaScript não capturado ou problema com imports.

**Solução:**
- Abra o console do navegador (F12)
- Verifique erros no console
- O ErrorBoundary agora captura erros e mostra mensagens

### 2. App Não Carrega no Celular

**Causa:** Problemas com assets ou imports nativos.

**Solução:**
- Verifique se todas as dependências estão instaladas: `npm install`
- Limpe o cache: `npx expo start -c`
- Verifique logs no terminal

### 3. Erro de Asset Não Encontrado

**Causa:** Referência a arquivos de imagem que não existem.

**Solução:**
- Os assets foram removidos da configuração obrigatória
- O app funciona sem eles
- Para produção, adicione os arquivos de imagem em `assets/`

### 4. Navegação Não Funciona

**Causa:** Problema com React Navigation.

**Solução:**
- Verifique se `@react-navigation/native` está instalado
- O AppNavigator agora sempre mostra ambas as telas
- A navegação é baseada no estado de autenticação

### 5. Erros no Console

**Como debugar:**
1. Abra o console do navegador (F12) ou logs do Expo
2. Procure por mensagens que começam com `[SAC]`
3. Verifique erros de rede (Supabase)
4. Verifique erros de autenticação

## Comandos Úteis

```bash
# Limpar cache e reinstalar
rm -rf node_modules
npm install
npx expo start -c

# Ver logs detalhados
npx expo start --verbose

# Testar no web
npm run web

# Testar no dispositivo
npx expo start
# Depois escaneie o QR code
```

## Verificações

- [ ] Variáveis de ambiente configuradas no `.env`
- [ ] Supabase configurado corretamente
- [ ] Todas as dependências instaladas
- [ ] Cache limpo
- [ ] Console do navegador sem erros críticos

