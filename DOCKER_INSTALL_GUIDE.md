# 📘 Guia Definitivo de Implantação SaaS - Sistema Administrativo de Contagem (SAC)

A Paz de Deus! Este guia foi elaborado para Administrações, Secretarias da Música ou Equipes de TI de diferentes Regionais do Brasil que desejam implantar o nosso **Sistema Administrativo de Contagem (SAC)**.

O SAC foi arquitetado para ser **altamente escalável e de fácil implantação (Plug & Play)**, semelhante a ferramentas como n8n, WordPress ou Portainer. Você não precisa alterar o código-fonte, basta informar as variáveis de ambiente (Chaves do Banco) da sua Regional e o sistema se adaptará automaticamente.

---

## 🏛️ 1. Arquitetura do Sistema

O ecossistema é dividido em 3 pilares independentes:
1. **Front-End PWA (A Tela):** Hospedado em uma VPS via Docker. É o aplicativo em si.
2. **Back-End (O Banco de Dados):** Onde os dados ficam guardados. Utilizamos o **Supabase** (BaaS gratuito baseado em PostgreSQL).
3. **Relatórios (Google Sheets):** O Supabase envia os dados consolidados automaticamente para planilhas do Google da sua administração.

---

## 🛑 2. Pré-requisitos (Banco de Dados e Planilha)

Antes de levantar o servidor do aplicativo, sua regional precisa ter o seu próprio banco de dados e suas planilhas de destino configuradas.

### 2.1. Configurando seu Supabase
1. Crie uma conta no **[Supabase](https://supabase.com/)** e inicie um Novo Projeto.
2. No menu **Project Settings > API**, copie a rota da sua `URL` e sua `anon public key`. (Você precisará delas depois).
3. No painel **SQL Editor**, aplique os scripts oficiais do SAC de criação das tabelas (tabelas `organistas_ensaio`, etc) e criação da tabela de Perfis do Usuário (veja o arquivo `SUPABASE_SETUP.md` do nosso repositório).

### 2.2. Configurando o Google Sheets
1. Crie uma planilha no Google Sheets da sua administração.
2. Nomeie a primeira aba, obrigatoriamente, como `Dados`.
3. Copie o **ID da Planilha** existente na URL do seu navegador (o código grande entre `/d/` e `/edit`).
*(As integrações dos Webhooks entre o Supabase e o Google Sheets são realizadas através dos arquivos `Code.gs`.)*

---

## 🚀 3. Opções de Implantação (Hospedagem)

O aplicativo SAC foi preparado em contêineres e é Agnóstico a Nuvem. Escolha o método que melhor se adequa ao conhecimento técnico da sua equipe.

---

### Opção A: Implantação em VPS via Docker Compose (Recomendado)
*Ideal para quem tem uma Máquina Virtual (VPS na Hostinger, AWS, Contabo, DigitalOcean, Oracle Cloud, etc).*

Este é o método mais popular, semelhante à instalação do n8n. Você cadastra o "Stack" e ele roda sozinho.

1. Acesse o terminal da sua VPS (via SSH) ou o painel Portainer da sua infraestrutura.
2. Certifique-se de que o Docker e o Docker Compose estão instalados.
3. Crie um arquivo chamado `docker-compose.yml` e cole o conteúdo abaixo:

```yaml
version: '3.8'

services:
  sac-app:
    image: regionalitapevi/regionalitapevi:latest
    container_name: ccb-sac-regional
    restart: unless-stopped
    ports:
      - "80:80" # Mapeia a porta 80 do container para a 80 da sua VPS
    environment:
      # Variáveis de Conexão Obrigatórias da SUA Regional
      - EXPO_PUBLIC_SUPABASE_URL=https://<SUA_URL_DO_SUPABASE>.supabase.co
      - EXPO_PUBLIC_SUPABASE_ANON_KEY=<SUA_CHAVE_PUBLICA_DO_SUPABASE>
      # (Opcional) Variável para nomear sua região no App, se o sistema suportar
      - EXPO_PUBLIC_NOME_REGIONAL=Campinas
    networks:
      - sac-network

networks:
  sac-network:
    driver: bridge
```

4. Suba o sistema digitando o comando:
```bash
docker-compose up -d
```
5. **Pronto!** Acesse o IP da sua VPS pelo navegador (Ex: `http://192.168.1.100`) e o seu aplicativo próprio já estará online integrado ao seu banco!
*(Recomendamos colocar um domínio e proxy reverso como Nginx Proxy Manager ou Traefik com SSL/HTTPS em produção).*

---

### Opção B: Implantação Simplificada (Apenas Docker Run)
*Para testes rápidos e de validação na sua máquina local ou em qualquer máquina com Docker sem criar arquivos.*

Rode em um terminal no servidor:
```bash
docker run -d \
  --name sac-app \
  -p 8080:80 \
  -e EXPO_PUBLIC_SUPABASE_URL="https://SUA_URL.supabase.co" \
  -e EXPO_PUBLIC_SUPABASE_ANON_KEY="SUA_CHAVE_LONGA" \
  regionalitapevi/regionalitapevi:latest
```
Acesse `http://localhost:8080` ou IP do servidor na porta indicada.

---

## 🛠️ Suporte e Dúvidas

O sistema em nuvem roda em Nginx Alpine. Caso ocorra erro de rotas nos PWAs dependendo da VPS, nós já embutimos na nossa imagem Docker o roteamento correto contra erros "404 page not found" quando atualizar a página. 

Dúvidas gerais devem ser tratadas preenchendo as configurações descritas em `SUPABASE_SETUP.md` da sua Regional antes da validação do aplicativo pelo time de testes locais.
