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

# [NOVO] Copia documentação e templates para serem acessíveis via navegador
COPY DOCKER_REGIONAL_GUIDE.md /usr/share/nginx/html/
COPY Code_Regional_Template.gs /usr/share/nginx/html/
COPY README.md /usr/share/nginx/html/

# Copia nossa configuração de roteamento
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copia o script de entrada
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Expõe a porta 80 do servidor
EXPOSE 80

# Usa o script como ponto de entrada
ENTRYPOINT ["/entrypoint.sh"]
