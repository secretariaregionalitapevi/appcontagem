
const fs = require('fs');
const path = require('path');

const EXCEL_PATH = path.join(__dirname, 'excel_data.json');
const CADASTRO_PATH = path.join(__dirname, 'cadastro_dump.json');
const GOOGLE_SHEETS_URL = 'https://script.google.com/macros/s/AKfycbxPtvi86jPy7y41neTpIPvn3hpycd3cMjbgjgifzLD6qRwrJVPlF9EDulaQp42nma-i/exec';

const CONFIG = {
  dryRun: false,
  delayBetweenRequests: 1000 // 1 second delay between each request for reliability
};

async function sendToSheets(data) {
  if (CONFIG.dryRun) return { ok: true };
  const response = await fetch(GOOGLE_SHEETS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({
      op: 'append',
      sheet: 'Dados',
      data: data
    })
  });
  return response;
}

function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

async function processForSheet(personData, index, total) {
    const { nome, comum, row, person } = personData;
    const uuid = generateUUID();
    const now = new Date();
    
    const instrumento = person ? person.instrumento : null;
    const nivel = person ? person.nivel : null;
    const cidade = person ? person.cidade : (row['CIDADE'] || '').trim().toUpperCase();

    const payloadSheets = {
      UUID: uuid,
      'NOME COMPLETO': nome,
      COMUM: comum,
      CIDADE: cidade.toUpperCase(),
      CARGO: 'ENCARREGADO LOCAL',
      INSTRUMENTO: instrumento || '',
      NAIPE_INSTRUMENTO: '',
      CLASSE_ORGANISTA: '',
      LOCAL_ENSAIO: 'ITAPEVI',
      DATA_ENSAIO: `${now.toLocaleDateString('pt-BR')} ${now.toLocaleTimeString('pt-BR').slice(0, 5)}`,
      REGISTRADO_POR: 'CARGA_FINAL_SERIAL',
      SYNC_STATUS: 'ATUALIZADO',
      SYNCED_AT: now.toISOString(),
      ANOTACOES: person ? 'Encontrado no Cadastro' : 'Entrada Manual (Não encontrado)',
      DUPLICATA: 'NÃO',
      NÍVEL: nivel || ''
    };

    try {
      console.log(`[${index + 1}/${total}] Enviando: ${nome}...`);
      const res = await sendToSheets(payloadSheets);
      if (!res.ok) console.error(`❌ Erro em ${nome}: ${res.status}`);
      return { success: res.ok || res.type === 'opaque', nome };
    } catch (error) {
      console.error(`❌ Erro em ${nome}:`, error.message);
      return { success: false, nome };
    }
}

async function run() {
  console.log('🚀 Iniciando Envio SERIAL para Google Sheets (Maior confiabilidade)...');
  
  const excel = JSON.parse(fs.readFileSync(EXCEL_PATH, 'utf8'));
  const cad = JSON.parse(fs.readFileSync(CADASTRO_PATH, 'utf8'));

  const uniquePeople = [];
  const seen = new Set();
  
  for (const r of excel) {
    const nome = (r['ENCARREGADOS'] || '').trim().toUpperCase();
    const comum = (r['COMUM'] || '').trim().toUpperCase();
    const key = `${nome}|${comum}`;
    
    if (!nome || seen.has(key)) continue;
    seen.add(key);
    
    const person = cad.find(p => 
      p.nome.toUpperCase().trim() === nome && 
      (p.comum || '').toUpperCase().trim() === comum
    );
    
    uniquePeople.push({ nome, comum, row: r, person });
  }

  console.log(`📊 Total Único: ${uniquePeople.length}`);

  const stats = { total: uniquePeople.length, success: 0, errors: 0 };

  for (let i = 0; i < uniquePeople.length; i++) {
    const result = await processForSheet(uniquePeople[i], i, uniquePeople.length);
    
    if (result.success) stats.success++;
    else stats.errors++;

    // Delay serial
    await new Promise(r => setTimeout(r, CONFIG.delayBetweenRequests));
  }

  console.log(`\n✅ Envio SERIAL Concluído!`);
  console.log(`📊 Sucesso: ${stats.success} | Erros: ${stats.errors}`);
}

run().catch(console.error);
