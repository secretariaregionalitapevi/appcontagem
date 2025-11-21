
# Contagem – V4 (auto-sync sem botão)

- Envio **imediato** se houver internet.
- **Fila offline** quando não houver.
- **Sincronização automática** quando a conexão volta (evento `online`) e também **a cada 15s**.
- Detector de conectividade por `ping.json` (não cacheado).
- Service Worker com `skipWaiting()` e `clients.claim()` para atualizar na hora.

## Planilha
Aba **Participantes** com colunas: `Timestamp | Cargo | Ministerio | Administracao`

## Apps Script (cole em Code.gs)
```js
function doPost(e) {
  var ss = SpreadsheetApp.openById("SUA_PLANILHA_ID");
  var sheet = ss.getSheetByName("Participantes");
  var data = {};
  if (e && e.parameter && e.parameter.payload) {
    data = JSON.parse(e.parameter.payload);
  } else if (e && e.postData && e.postData.contents) {
    data = JSON.parse(e.postData.contents);
  }
  sheet.appendRow([ new Date(), data.cargo || "", data.ministerio || "", data.administracao || "" ]);
  return ContentService.createTextOutput("OK").setMimeType(ContentService.MimeType.TEXT);
}
function doGet(){ return ContentService.createTextOutput("ALIVE"); }
```

**Implantar como Web App**: Executar como **Me**, Acesso **Qualquer pessoa**, usar a URL **/exec**, autorizar.

## Hostinger (.htaccess)
```
<Files "ping.json">
  Header set Cache-Control "no-store, max-age=0, must-revalidate"
</Files>
```

## Configurar
- No `app.js`, troque `REPLACE_WITH_APPS_SCRIPT_WEB_APP_URL` pela sua URL `/exec`.
- Publique todos os arquivos em HTTPS.
