# Guia de Conteinerização (Docker) - Sistema Administrativo de Contagem (SAC)

Este guia ensina o passo a passo de como empacotar a aplicação web (PWA) em uma imagem **Docker** e publicá-la no repositório Docker Hub da **Regional Itapevi**, para que o sistema possa ser facilmente replicado e distribuído.

---

## 🏗️ 1. Como a Imagem Funciona?

O aplicativo será construído em duas etapas dentro do Docker (*Multi-stage build*):
1. **Compilação**: Instala o Node.js, baixa as dependências (`npm install`) e gera a versão de produção pesada (`npx expo export -p web`).
2. **Hospedagem (Servidor Base)**: Descarta o código-fonte original e copia apenas os arquivos gerados, colocando-os dentro de um servidor **Nginx** levíssimo.
Isso garante uma imagem incrivelmente minúscula e super rápida para qualquer computador.

---

## 📝 2. Arquivos Necessários

Para criar a imagem, você precisará adicionar três novos arquivos na raiz do projeto (onde fica o `package.json`):

### 1. `.dockerignore`
Isso impede que arquivos desnecessários deixem o processo Docker lento. Crie um arquivo chamado `.dockerignore` e digite:
```text
node_modules
.expo
dist
web-build
.git
.env
```

### 2. `nginx.conf`
Configuração do servidor de internet rápido (Nginx). Garante que a navegação do seu PWA funcione lisinha sem dar erros `404`.
```nginx
server {
    listen 80;
    server_name localhost;
    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

### 3. `Dockerfile`
O arquivo mestre com as "instruções de receita" do Docker.
```dockerfile
# Estágio 1: Build da Aplicação
FROM node:18-alpine AS builder

WORKDIR /app

# Copia arquivos de dependência
COPY package.json package-lock.json ./
RUN npm ci

# Copia todo o projeto
COPY . .

# Faz a build para web
RUN npx expo export -p web

# Estágio 2: Hospedagem com Nginx
FROM nginx:alpine

# Remove configurações padrões do Nginx
RUN rm -rf /usr/share/nginx/html/*

# Copia o site gerado no Estágio 1 para o servidor Nginx
COPY --from=builder /app/dist /usr/share/nginx/html

# Copia nossa configuração de roteamento
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expõe a porta 80 do servidor
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

---

## 🛠️ 3. Construindo a Imagem

Abra o Terminal na pasta do projeto e use o comando mágico de "build".
Atenção especial ao seu nome de usuário da Regional Itapevi (`regionalitapevi`):

```bash
# Isso criará a imagem com o nome regionalitapevi/sac-app na versão "latest" (mais recente).
# O ponto (.) no final é importante, avisa o docker que os arquivos estão na pasta atual.
docker build -t regionalitapevi/sac-app:latest .
```
*(O Docker vai demorar alguns minutos rodando pacotes Node pela primeira vez. Ele está baixando o Linux Alpine, instalando o ambiente, e cozinhando todo o seu app.*)

---

## 🚀 4. Testando antes de subir

Antes de enviar para a nuvem, simule como a outra congregração rodaria isso na máquina deles. Rode o contêiner gerado no seu PC de graça:

```bash
# Sobe o servidor Nginx interno (porta 80) e conecta ao http://localhost:8080 do seu windows
docker run -d -p 8080:80 regionalitapevi/sac-app:latest
```
Acesse `http://localhost:8080` no seu navegador. Viu o aplicativo e funcionou? Sucesso!

---

## ☁️ 5. Subindo para o Docker Hub (Regional Itapevi)

Chegou a hora de compartilhar com o mundo.

1. **Faça o Login na sua conta pelo Terminal**:
   ```bash
   docker login
   ```
   *(Ele vai te pedir o seu Usuário (ex: `regionalitapevi`) e sua Senha do Docker Hub).*

2. **Suba para a Nuvem de Contêineres (Push)**:
   ```bash
   docker push regionalitapevi/sac-app:latest
   ```

Pronto! Seu aplicativo está empacotado e morando nos servidores da nuvem de forma privada (ou pública, de acordo com o catálogo da sua regional).

---

## 🤝 6. Como outra Regional usa o seu Docker?

Para que uma regional (Exemplo: "Regional Carapicuíba") comece a usar a interface brilhante que desenvolvemos, eles não precisariam instalar o Expo, Node.js ou lidar com código. 

### O que eles precisam fazer:
Eles precisariam ter o Docker na máquina (ou Cloud deles) e criar a própria conta no Supabase.

No terminar o comando que eles dariam seria apenas:
```bash
docker run -d \
  -p 3000:80 \
  -e EXPO_PUBLIC_SUPABASE_URL="https://url-do-supabase-da-outra-regional.supabase.co" \
  -e EXPO_PUBLIC_SUPABASE_ANON_KEY="senha-mestra-da-outra-regional" \
  regionalitapevi/sac-app:latest
```

**(Obs: Para que eles injetem chaves customizadas de API pelo comando `-e` como acima, você eventualmente precisaria alterar uma biblioteca do ExpoWeb chamada `runtime-env`, ou pedir pro Nginx trocar essa variável no carregamento, o que tornaria todo o Front-End totalmente reativo à infraestrutura nova deles.)*
