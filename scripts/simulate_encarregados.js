
const fs = require('fs');
const path = require('path');
const dataPath = path.join(__dirname, 'excel_data.json');

const SUPABASE_URL = 'https://wfqehmdawhfjqbqpjapp.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndmcWVobWRhd2hmanFicXBqYXBwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc0NDI0ODIsImV4cCI6MjA3MzAxODQ4Mn0.lFfEZKIVS7dqk48QFW4IvpRcJsgQnMjYE3iUqsrXsFg';
const GOOGLE_SHEETS_URL = 'https://script.google.com/macros/s/AKfycbxPtvi86jPy7y41neTpIPvn3hpycd3cMjbgjgifzLD6qRwrJVPlF9EDulaQp42nma-i/exec';

const CONFIG = {
  dryRun: false,
  limit: 0,
  batchSize: 10, // 10 parallel records
  delayBetweenBatches: 500
};
const START_INDEX = 26; 

function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
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

async function processRow(row, index, total) {
    const uuid = generateUUID();
    const now = new Date();
    const dataEnsaio = now.toLocaleDateString('pt-BR');
    const horario = now.toLocaleTimeString('pt-BR');
    
    const nome = (row['ENCARREGADOS'] || '').trim().toUpperCase();
    const comum = (row['COMUM'] || '').trim().toUpperCase();
    const cidade = (row['CIDADE'] || '').trim().toUpperCase();
    
    if (!nome) return { success: false, skip: true };

    const payloadSheets = {
      UUID: uuid,
      'NOME COMPLETO': nome,
      COMUM: comum,
      CIDADE: cidade,
      CARGO: 'ENCARREGADO LOCAL',
      INSTRUMENTO: '',
      NAIPE_INSTRUMENTO: '',
      CLASSE_ORGANISTA: '',
      LOCAL_ENSAIO: 'ITAPEVI',
      DATA_ENSAIO: `${dataEnsaio} ${horario.slice(0, 5)}`,
      REGISTRADO_POR: 'SIMULACAO_TESTE_CARGA',
      SYNC_STATUS: 'ATUALIZADO',
      SYNCED_AT: now.toISOString(),
      ANOTACOES: 'Teste de Carga - Encarregados Local',
      DUPLICATA: 'NÃO',
      NÍVEL: ''
    };

    const payloadSupabase = {
      uuid: uuid,
      nome_completo: nome,
      comum: comum,
      cargo: 'ENCARREGADO LOCAL',
      instrumento: null,
      naipe_instrumento: null,
      classe_organista: null,
      nivel: null,
      cidade: cidade,
      local_ensaio: 'ITAPEVI',
      data_ensaio: now.toISOString(),
      registrado_por: 'SIMULACAO_TESTE',
      created_at: now.toISOString()
    };

    try {
      const [resSheets, resSupabase] = await Promise.all([
        sendToSheets(payloadSheets),
        sendToSupabase(payloadSupabase)
      ]);

      const sOk = resSheets.ok || resSheets.type === 'opaque';
      const sbOk = resSupabase.ok;

      if (!sOk) console.error(`❌ Erro Sheets para ${nome}: ${resSheets.status}`);
      if (!sbOk) console.error(`❌ Erro Supabase para ${nome}: ${resSupabase.status}`);

      return { success: sOk && sbOk, sheets: sOk, supabase: sbOk, nome };
    } catch (error) {
      console.error(`❌ Erro catastrófico para ${nome}:`, error.message);
      return { success: false, error: error.message, nome };
    }
}

async function run() {
  console.log('🚀 Iniciando simulação PARALELA de Encarregados...');
  
  if (!fs.existsSync(dataPath)) {
    console.error(`❌ Arquivo de dados não encontrado: ${dataPath}`);
    return;
  }

  let fullData = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
  let data = fullData.slice(START_INDEX);

  console.log(`📊 Total de registros a processar: ${data.length} (Iniciando de ${START_INDEX})`);

  const stats = {
    total: data.length,
    success: 0,
    errors: 0,
    supabaseSuccess: 0,
    sheetsSuccess: 0,
    start: Date.now()
  };

  for (let i = 0; i < data.length; i += CONFIG.batchSize) {
    const currentBatch = data.slice(i, i + CONFIG.batchSize);
    console.log(`📦 Processando lote ${Math.floor(i/CONFIG.batchSize) + 1} (${currentBatch.length} registros)...`);
    
    const results = await Promise.all(currentBatch.map((row, idx) => processRow(row, i + idx + START_INDEX, fullData.length)));

    results.forEach(res => {
        if (res.skip) return;
        if (res.success) stats.success++;
        else stats.errors++;
        if (res.sheets) stats.sheetsSuccess++;
        if (res.supabase) stats.supabaseSuccess++;
    });

    if (i + CONFIG.batchSize < data.length) {
        await new Promise(resolve => setTimeout(resolve, CONFIG.delayBetweenBatches));
    }
  }

  const duration = (Date.now() - stats.start) / 1000;
  console.log('\n✅ Simulação concluída!');
  console.log(`⏱️ Duração: ${duration.toFixed(1)}s`);
  console.log(`📊 Processados: ${stats.total}`);
  console.log(`✅ Sucesso Total: ${stats.success}`);
  console.log(`❌ Erros: ${stats.errors}`);
}

run().catch(console.error);
