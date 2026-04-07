# Guia de Configuração para Outras Regionais (Docker)

Este documento explica como qualquer regional da CCB pode utilizar a imagem do aplicativo e configurá-la com seu próprio nome e locais de ensaio.

## 1. Pré-requisitos
- Docker instalado (VPS ou Local).
- Acesso à imagem no Docker Hub (ex: `seu-usuario/appcontagem:latest`).

## 2. Configuração via Variáveis de Ambiente

O aplicativo é configurado através de duas variáveis principais:

| Variável | Descrição | Exemplo |
| :--- | :--- | :--- |
| `REGIONAL_NAME` | Nome que aparecerá no topo, título e rodapé. | `"Regional Goiânia"` |
| `LOCAIS_ENSAIO_JSON` | Lista de locais para o dropdown de login em formato JSON. | `'[{"id":"1","nome":"Local A"}]'` |
| `SUPABASE_URL` | URL do projeto Supabase da Regional. | `"https://xyz.supabase.co"` |
| `SUPABASE_ANON_KEY` | Chave Anônima do Supabase da Regional. | `"eyJhbGciOiJ..." ` |
| `SHEETS_ENDPOINT_URL` | URL do Web App do Google Apps Script (Backend). | `"https://script.google.com/..."` |

### 🛠️ Formato do `LOCAIS_ENSAIO_JSON`
Essa variável deve ser uma string JSON contendo uma lista de objetos com `id` e `nome`. É essencial que o formato seja seguido à risca para o login funcionar:

```json
[
  {"id": "1", "nome": "Goiânia - Central"},
  {"id": "2", "nome": "Anápolis"},
  {"id": "3", "nome": "Aparecida de Goiânia"},
  {"id": "4", "nome": "Trindade"},
  {"id": "5", "nome": "Senador Canedo"}
]
```
*Dica: Ao usar no `docker run`, envolva o JSON em aspas simples (`'`) para evitar conflitos com as aspas duplas internas.*

## 3. Como Rodar (Exemplo)

Para instalar em uma nova VPS, basta executar o comando `docker run` passando as variáveis de ambiente:

```bash
docker run -d \
  --name app-contagem-goiania \
  -p 80:80 \
  -e REGIONAL_NAME="Regional Goiânia" \
  -e LOCAIS_ENSAIO_JSON='[{"id":"1","nome":"Anápolis"},{"id":"2","nome":"Goiânia - Central"},{"id":"3","nome":"Aparecida"}]' \
  seu-usuario/appcontagem:latest
```

## 4. Configuração do Backend (Apps Script)

Para que os registros sejam enviados para a sua Planilha Google, você deve configurar um "Backend" simplificado:

1.  Abra a sua planilha de destino.
2.  Vá em **Extensões > Apps Script**.
3.  Copie o conteúdo do arquivo `Code_Regional_Template.gs` (disponível na raiz deste projeto) e cole no editor do Google Apps Script.
4.  No menu lateral esquerdo, clique no ícone de engrenagem (**Configurações do Projeto**).
5.  Role até a seção **Propriedades do Script** e clique em "Adicionar propriedade do script".
6.  Adicione a seguinte propriedade:
    - **Propriedade**: `SPREADSHEET_ID`
    - **Valor**: O ID da sua planilha (você encontra na URL da planilha: `https://docs.google.com/spreadsheets/d/ID_AQUI/edit`).
7.  Clique no botão azul **Implantar > Nova implantação**.
8.  Selecione o tipo **App da Web**.
9.  Configure:
    - **Descrição**: Backend Webhook Contagem
    - **Executar como**: Eu
    - **Quem tem acesso**: Qualquer pessoa (ou "Anyone", essencial para o Docker conseguir enviar os dados).
10. Copie a **URL do App da Web** gerada e coloque na variável de ambiente `SHEETS_ENDPOINT_URL` do seu Docker.

> [!IMPORTANT]
> Você **não precisa** usar o arquivo `Code.gs` original. Ele contém regras específicas da Regional Itapevi. Use o `Code_Regional_Template.gs` para garantir que tudo funcione de forma simples e segura.

## 5. Atualizações

Sempre que a imagem base for atualizada no Docker Hub, as regionais podem baixar a nova versão mantendo suas configurações:

```bash
docker pull seu-usuario/appcontagem:latest
docker stop app-contagem-goiania
docker rm app-contagem-goiania
# Rodar novamente com o comando do item 3
```
