# Cadastro de Pessoas ↔ Google Sheets (com modo offline)

## Como usar
1. **Crie a planilha** no Google Sheets (aba: `Pessoas`). Copie o **ID** (na URL da planilha).
2. **Apps Script**: na planilha, vá em **Extensões → Apps Script**, crie um projeto e cole o conteúdo de `Code.gs`.
   - Edite `SPREADSHEET_ID` com o ID da sua planilha.
   - Publique: **Deploy → New deployment → Type: Web app → Execute as: Me → Who has access: Anyone**. Copie a **URL**.
3. **Front-end**: edite `index.html` e troque `WEBAPP_URL_AQUI` pela URL do Web App.
4. **Hospede** os arquivos (`index.html`, `app.js`, `sw.js`, `manifest.json`) em um host **HTTPS** (Netlify, Vercel, GitHub Pages etc.).
5. Abra a página, teste **online** (envio direto) e **offline** (fila + sincronização ao voltar a internet).

## Campos gravados no Sheets
`timestamp`, `uuid`, `nome`, `email`, `telefone`, `comum`, `instrumento`, `observacoes`

## Dicas
- Você pode deduplicar pelo `uuid` no Sheets ou tratar no Apps Script.
- Para listas grandes (ex.: 65 comuns, 25 instrumentos), troque o `<input id="comum">` por um `<select>` e alimente opções via JavaScript.
- O service worker usa cache de assets estáticos para abrir a página offline. A fila offline e a sincronização ficam no `app.js` (IndexedDB + fetch).

## Referências (oficiais)
- Google Apps Script – Web Apps (publicar, doGet/doPost): https://developers.google.com/apps-script/concepts/web
- ContentService (retorno JSON): https://developers.google.com/apps-script/reference/content/content-service
- MDN – IndexedDB (dados offline): https://developer.mozilla.org/docs/Web/API/IndexedDB_API/Using_IndexedDB
- MDN – Service Workers / PWAs (offline): https://developer.mozilla.org/docs/Web/Progressive_web_apps
- MDN – CORS (simple requests): https://developer.mozilla.org/docs/Web/HTTP/CORS#simple_requests
