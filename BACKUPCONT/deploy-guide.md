# 🚀 Guia de Deploy na Hostinger - Sistema CCB

## 📋 Checklist de Deploy

### ✅ **1. Preparação dos Arquivos**

**Arquivos necessários para upload:**
- ✅ `index.html` (página principal)
- ✅ `app.js` (lógica da aplicação)
- ✅ `editar.html` (página de edição)
- ✅ `login.html` (página de login)
- ✅ `supabase.html` (configuração Supabase)
- ✅ `manifest.json` (PWA)
- ✅ `sw.js` (Service Worker)
- ✅ `.htaccess` (configurações do servidor)
- ✅ `Code.gs` (Google Apps Script - não precisa ir para o servidor)

### ✅ **2. Configuração do Supabase**

**Antes do deploy, configure as variáveis no Supabase:**

1. **Acesse o Supabase Dashboard**
2. **Vá em Settings > API**
3. **Copie as credenciais:**
   - Project URL
   - Anon Key

4. **Configure no arquivo `supabase.html`:**
   ```javascript
   const SUPABASE_URL = 'https://seu-projeto.supabase.co'
   const SUPABASE_ANON_KEY = 'sua-chave-anonima'
   ```

### ✅ **3. Upload para Hostinger**

**Método 1: File Manager (Recomendado)**
1. Acesse o painel da Hostinger
2. Vá em **File Manager**
3. Navegue até a pasta `public_html`
4. Faça upload de todos os arquivos
5. **IMPORTANTE:** Renomeie `.htaccess` para `.htaccess` (certifique-se que não tenha extensão)

**Método 2: FTP**
1. Use um cliente FTP (FileZilla, WinSCP)
2. Conecte com as credenciais da Hostinger
3. Navegue até `public_html`
4. Faça upload de todos os arquivos

### ✅ **4. Configurações da Hostinger**

**No painel da Hostinger:**

1. **SSL Certificate:**
   - Ative o SSL gratuito
   - Force HTTPS (redirecionamento)

2. **PHP Version:**
   - Use PHP 8.0 ou superior

3. **Cache:**
   - Ative o cache do navegador
   - Configure cache de 1 mês para CSS/JS

### ✅ **5. Teste de Funcionamento**

**Após o upload, teste:**

1. **Acesse o site:** `https://seudominio.com`
2. **Teste o login:** Use as credenciais do Supabase
3. **Teste o registro:** Faça um registro de teste
4. **Teste o modal:** Abra o modal de novo registro
5. **Teste mobile:** Acesse pelo celular

### ✅ **6. Configuração do Google Sheets**

**O Google Apps Script já está configurado, mas verifique:**

1. **Acesse:** [script.google.com](https://script.google.com)
2. **Abra o projeto:** "Sistema CCB"
3. **Verifique a URL:** Deve estar ativa
4. **Teste a API:** Faça uma requisição de teste

### ✅ **7. Configurações de Segurança**

**No Supabase Dashboard:**

1. **Vá em Authentication > Settings**
2. **Configure Site URL:** `https://seudominio.com`
3. **Adicione Redirect URLs:**
   - `https://seudominio.com`
   - `https://seudominio.com/login.html`

### ✅ **8. PWA (Progressive Web App)**

**Para instalar como app:**

1. **Acesse o site no mobile**
2. **Chrome:** Menu > "Adicionar à tela inicial"
3. **Safari:** Compartilhar > "Adicionar à tela inicial"
4. **Teste offline:** Desconecte a internet e teste

## 🔧 **Solução de Problemas**

### ❌ **Erro 500 - Internal Server Error**
- Verifique se o `.htaccess` está correto
- Verifique as permissões dos arquivos (644)

### ❌ **Erro de CORS no Supabase**
- Verifique as URLs no Supabase Dashboard
- Confirme se o SSL está ativo

### ❌ **Modal não abre**
- Verifique se o Bootstrap está carregando
- Verifique o console do navegador

### ❌ **Dados não salvam**
- Verifique a conexão com Supabase
- Verifique as credenciais
- Verifique o Google Apps Script

## 📱 **Teste em Dispositivos**

**Teste obrigatório em:**
- ✅ Chrome Desktop
- ✅ Chrome Mobile (Android)
- ✅ Safari Mobile (iOS)
- ✅ Firefox Desktop
- ✅ Edge Desktop

## 🎯 **URLs Importantes**

- **Site principal:** `https://seudominio.com`
- **Login:** `https://seudominio.com/login.html`
- **Edição:** `https://seudominio.com/editar.html`
- **Supabase:** `https://seudominio.com/supabase.html`

## 📞 **Suporte**

Se encontrar problemas:
1. Verifique o console do navegador (F12)
2. Verifique os logs da Hostinger
3. Teste em modo incógnito
4. Limpe o cache do navegador

---

**🎉 Após seguir este guia, seu sistema estará 100% funcional na Hostinger!**
