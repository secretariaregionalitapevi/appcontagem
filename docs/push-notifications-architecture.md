# Arquitetura e Viabilidade: Push Notifications (Web/PWA)

## 1. Visão Geral e Viabilidade
Adicionar Web Push Notifications é plenamente viável e compatível com a arquitetura atual do projeto (Expo Web, React, Supabase, PWA com `manifest.json` e `sw.js`). É uma excelente forma de manter usuários engajados e informados sobre eventos e atualizações importantes.

## 2. Arquitetura Proposta
O fluxo de Web Push moderno utiliza o padrão VAPID e se divide em três partes:

### A. Frontend (PWA do Celular/Computador)
* O aplicativo solicita permissão ao usuário para enviar notificações.
* Se aceito, o navegador gera uma "Push Subscription" junto aos servidores da Apple/Google.
* O aplicativo envia essa Subscription para ser salva no banco de dados.
* O Service Worker (`public/sw.js`) fica rodando em segundo plano para interceptar as mensagens push e exibi-las mesmo com o app fechado.

### B. Banco de Dados (Supabase)
* Criação de uma tabela (ex: `push_subscriptions`).
* Armazenamento da inscrição (Subscription) do usuário associada ao seu `user_id`, permitindo o envio direcionado (ex: apenas para uma cidade específica ou para todos).

### C. Backend (Disparador)
* Necessário um gatilho/serviço para disparar a mensagem quando um evento ou notícia for criado.
* Pode ser implementado via **Supabase Edge Functions**, n8n, servidor Node.js ou Google Apps Script.
* O backend utiliza as chaves de segurança VAPID, consulta os destinatários no banco e envia o "push" para os servidores de notificação.

## 3. Limitações Importantes (Mundo Web Push)
Como o foco é um **PWA baseado em Navegador**:

* **Android e Computadores (Windows/Mac):** O Web Push funciona perfeitamente, similar às notificações de aplicativos nativos.
* **iPhones (iOS):** 
  * A Apple suporta Web Push apenas a partir do **iOS 16.4** (início de 2023).
  * O usuário **precisa adicionar o site à Tela de Início** (instalar o PWA) para poder receber/aceitar notificações.
  * (O esforço recente de melhoria do ícone do PWA e de instruir usuários a instalar o app já ajuda a preparar esse terreno).

*Nota Alternativa:* Se o projeto for compilado futuramente para as lojas oficiais (App Store via `.ipa` e Google Play via `.apk`) utilizando `expo-notifications`, o envio de push fica ainda mais nativo e dribla as restrições da Apple no navegador.

## 4. Vale a pena implementar?

**Vale muito a pena SE:**
* A comunicação imediata (cancelamentos, novas inscrições, avisos da regional) for crucial para o projeto.
* Grupos de WhatsApp estiverem ineficientes, custosos ou desorganizados.
* Desejar uma aparência mais profissional e imersiva para o sistema.

**Pode ser adiado para uma "Versão 2.0" SE:**
* Houver muitas tarefas críticas/urgentes pendentes para o funcionamento básico do app.
* O público-alvo utilizar predominantemente iPhones muito antigos (incompatíveis com iOS 16.4+).
* O esforço de implementação (frontend, banco, API de disparo e testes cross-device) não couber no cronograma atual.

---
*Documento gerado para referência futura.*
