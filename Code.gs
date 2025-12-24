const SPREADSHEET_ID = 'COLE_AQUI_O_ID_DA_PLANILHA';
const SHEET_NAME = 'Pessoas';

function doGet(e) {
  return ContentService.createTextOutput('OK').setMimeType(ContentService.MimeType.TEXT);
}

function doPost(e) {
  try {
    let data = {};

    // 1) application/x-www-form-urlencoded ou multipart/form-data
    if (e.parameter && Object.keys(e.parameter).length) {
      data = e.parameter;
    }

    // 2) application/json (opcional)
    if (e.postData && e.postData.type === 'application/json') {
      const body = JSON.parse(e.postData.contents || '{}');
      data = { ...data, ...body };
    }

    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sh = ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);

    // Cria o cabeçalho se a planilha está vazia
    if (sh.getLastRow() === 0) {
      sh.appendRow(['timestamp', 'uuid', 'nome', 'email', 'telefone', 'comum', 'instrumento', 'observacoes']);
    }

    sh.appendRow([
      new Date(),
      data.uuid || '',
      data.nome || '',
      data.email || '',
      data.telefone || '',
      data.comum || '',
      data.instrumento || '',
      data.observacoes || ''
    ]);

    const out = ContentService.createTextOutput(JSON.stringify({ ok: true }))
      .setMimeType(ContentService.MimeType.JSON);
    return out;
  } catch (err) {
    const out = ContentService.createTextOutput(JSON.stringify({ ok: false, error: String(err) }))
      .setMimeType(ContentService.MimeType.JSON);
    return out;
  }
}
