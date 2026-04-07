#!/bin/sh

# Template do arquivo config.js
CONFIG_FILE="/usr/share/nginx/html/config.js"

echo "Configurando variáveis da Regional..."

# Valores padrão caso as variáveis não existam
NAME=${REGIONAL_NAME:-"Regional Itapevi"}
# Exemplos de locais padrão (Itapevi) caso não seja fornecido um JSON
DEFAULT_LOCAIS='[{"id":"1","nome":"Cotia"},{"id":"2","nome":"Caucaia do Alto"},{"id":"3","nome":"Fazendinha"},{"id":"4","nome":"Itapevi"},{"id":"5","nome":"Jandira"},{"id":"6","nome":"Pirapora"},{"id":"7","nome":"Vargem Grande"}]'
LOCAIS=${LOCAIS_ENSAIO_JSON:-$DEFAULT_LOCAIS}

# Gera o arquivo config.js com os valores das variáveis de ambiente
cat <<EOF > $CONFIG_FILE
window.APP_CONFIG = {
  REGIONAL_NAME: "$NAME",
  SHEET_NAME: "${SHEET_NAME:-"Dados"}",
  LOCAIS_ENSAIO: $LOCAIS,
  SUPABASE_URL: "${SUPABASE_URL:-"https://wfqehmdawhfjqbqpjapp.supabase.co"}",
  SUPABASE_ANON_KEY: "${SUPABASE_ANON_KEY:-"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndmcWVobWRhd2hmanFicXBqYXBwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc0NDI0ODIsImV4cCI6MjA3MzAxODQ4Mn0.lFfEZKIVS7dqk48QFW4IvpRcJsgQnMjYE3iUqsrXsFg"}",
  SHEETS_ENDPOINT_URL: "${SHEETS_ENDPOINT_URL:-"https://script.google.com/macros/s/AKfycbxPtvi86jPy7y41neTpIPvn3hpycd3cMjbgjgifzLD6qRwrJVPlF9EDulaQp42nma-i/exec"}"
};
EOF

echo "Arquivo config.js gerado com sucesso!"
echo "Regional: $NAME"

# Inicia o Nginx (comando original da imagem nginx:alpine)
nginx -g "daemon off;"
