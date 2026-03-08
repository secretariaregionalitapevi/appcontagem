# Cadastro de Pessoas ↔ Google Sheets (com login + Local do Ensaio)

## O que tem nesta versão
- **Locais do Ensaio** ajustados: Cotia, Caucaia do Alto, Vargem Grande Paulista, Itapevi, Jandira, Fazendinha, Pirapora.
- `Code.gs` com **mapeamento flexível de cabeçalhos** via `HEADER_MAP` (ajuste o texto para bater com sua planilha).
- `login.html` salva `session_local` (local do ensaio) e o app anexa isso a cada cadastro (online/offline).
- `sw.js` inclui `login.html` no cache.

## Como integrar com sua planilha
1. Copie o **ID** da sua planilha e ajuste `SPREADSHEET_ID` no `Code.gs`.
2. Se o nome da aba for diferente, ajuste `SHEET_NAME`.
3. Ajuste os **títulos do `HEADER_MAP`** para bater com a **linha 1** da sua planilha (ex.: `Local do Ensaio`).
4. Faça o **Deploy** do Apps Script como Web App e troque a `WEBAPP_URL_AQUI` no `index.html`.

## Referências oficiais
- Apps Script Web Apps / ContentService: https://developers.google.com/apps-script/concepts/web , https://developers.google.com/apps-script/reference/content/content-service
- IndexedDB (offline), Service Workers / PWA: https://developer.mozilla.org/docs/Web/API/IndexedDB_API/Using_IndexedDB , https://developer.mozilla.org/docs/Web/Progressive_web_apps
- localStorage: https://developer.mozilla.org/docs/Web/API/Window/localStorage
