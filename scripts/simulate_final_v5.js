
const fs = require('fs');
const path = require('path');

const EXCEL_PATH = path.join(__dirname, 'excel_data.json');
const CADASTRO_PATH = path.join(__dirname, 'cadastro_dump.json');

const SUPABASE_URL = 'https://wfqehmdawhfjqbqpjapp.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndmcWVobWRhd2hmanFicXBqYXBwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc0NDI0ODIsImV4cCI6MjA3MzAxODQ4Mn0.lFfEZKIVS7dqk48QFW4IvpRcJsgQnMjYE3iUqsrXsFg';
const GOOGLE_SHEETS_URL = 'https://script.google.com/macros/s/AKfycbxPtvi86jPy7y41neTpIPvn3hpycd3cMjbgjgifzLD6qRwrJVPlF9EDulaQp42nma-i/exec';

const CONFIG = {
  dryRun: false,
  sheetDelay: 1200, // 1.2s delay for Sheets serial
  supabaseBatch: 10
};

function norm(s) {
  return (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, "").trim().toUpperCase();
}

function getCode(s) {
  const m = (s || '').match(/BR-\d{2}-\d{4}/);
  return m ? m[0] : null;
}

async function sendToSupabase(row) {
  if (CONFIG.dryRun) return { ok: true };
  const response = await fetch(`${SUPABASE_URL}/rest/v1/presencas`, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal'
    },
    body: JSON.stringify(row)
  });
  return response;
}

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

async function processRecord(record, index, total) {
    const { nome, comum, row, person } = record;
    const uuid = generateUUID();
    const now = new Date();
    
    const instrumento = person ? person.instrumento : null;
    const nivel = person ? person.nivel : null;
    const cidade = person ? person.cidade : (row['CIDADE'] || '').trim().toUpperCase();

    const payloadSupabase = {
      uuid: uuid,
      nome_completo: nome,
      comum: comum,
      cargo: 'ENCARREGADO LOCAL',
      instrumento: instrumento ? instrumento.toUpperCase() : null,
      nivel: nivel ? nivel.toUpperCase() : null,
      cidade: cidade.toUpperCase(),
      local_ensaio: 'ITAPEVI',
      data_ensaio: now.toISOString(),
      registrado_por: 'CARGA_FINAL_V5',
      created_at: now.toISOString()
    };

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
      REGISTRADO_POR: 'CARGA_FINAL_V5',
      SYNC_STATUS: 'ATUALIZADO',
      SYNCED_AT: now.toISOString(),
      ANOTACOES: person ? 'Encontrado no Cadastro' : 'Entrada Manual',
      DUPLICATA: 'NÃO',
      NÍVEL: nivel || ''
    };

    try {
      console.log(`[${index + 1}/${total}] Processando: ${nome}...`);
      
      // Enviar para Supabase (paralelo)
      const resSupabase = await sendToSupabase(payloadSupabase);
      
      // Enviar para Sheets (serial - aguardar)
      const resSheets = await sendToSheets(payloadSheets);
      
      const success = resSupabase.ok && (resSheets.ok || resSheets.type === 'opaque');
      if (!success) {
          if (!resSupabase.ok) console.error(`❌ Erro Supabase em ${nome}: ${resSupabase.status}`);
          if (!resSheets.ok) console.error(`❌ Erro Sheets em ${nome}: ${resSheets.status}`);
      }

      return { success };
    } catch (error) {
      console.error(`❌ Erro em ${nome}:`, error.message);
      return { success: false };
    }
}

async function run() {
  console.log('🚀 Iniciando Simulação V5 (Máxima Precisão e Confiabilidade)...');
  
  const excel = JSON.parse(fs.readFileSync(EXCEL_PATH, 'utf8'));
  const cad = JSON.parse(fs.readFileSync(CADASTRO_PATH, 'utf8'));

  const uniquePeople = [];
  const seen = new Set();
  
  for (const r of excel) {
    const nomeRaw = (r['ENCARREGADOS'] || '').trim();
    const comumRaw = (r['COMUM'] || '').trim();
    if (!nomeRaw) continue;

    const n = norm(nomeRaw);
    const c = norm(comumRaw);
    const key = `${n}|${c}`;
    
    if (seen.has(key)) continue;
    seen.add(key);
    
    // LOGICA DE MATCHING ROBUSTA
    let person = cad.find(p => norm(p.nome) === n && norm(p.comum) === c);
    
    if (!person) {
      const code = getCode(comumRaw);
      if (code) person = cad.find(p => norm(p.nome) === n && getCode(p.comum) === code);
    }
    
    if (!person) {
      const matches = cad.filter(p => norm(p.nome) === n);
      if (matches.length === 1) person = matches[0];
    }
    
    uniquePeople.push({ nome: nomeRaw.toUpperCase(), comum: comumRaw.toUpperCase(), row: r, person });
  }

  console.log(`📊 Total Único: ${uniquePeople.length}`);
  console.log(`🔍 Matches de Cadastro: ${uniquePeople.filter(p => p.person).length}`);

  const stats = { total: uniquePeople.length, success: 0, errors: 0 };

  for (let i = 0; i < uniquePeople.length; i++) {
    const result = await processRecord(uniquePeople[i], i, uniquePeople.length);
    if (result.success) stats.success++;
    else stats.errors++;

    // Delay serial para o Sheets não engasgar
    await new Promise(r => setTimeout(r, CONFIG.sheetDelay));
  }

  console.log(`\n✅ Simulação V5 Concluída!`);
  console.log(`📊 Sucesso: ${stats.success} | Erros: ${stats.errors}`);
}

run().catch(console.error);
