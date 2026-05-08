
const fs = require('fs');
const path = require('path');

const EXCEL_PATH = path.join(__dirname, 'excel_data.json');
const CADASTRO_PATH = path.join(__dirname, 'cadastro_dump.json');

const SUPABASE_URL = 'https://wfqehmdawhfjqbqpjapp.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndmcWVobWRhd2hmanFicXBqYXBwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc0NDI0ODIsImV4cCI6MjA3MzAxODQ4Mn0.lFfEZKIVS7dqk48QFW4IvpRcJsgQnMjYE3iUqsrXsFg';
const GOOGLE_SHEETS_URL = 'https://script.google.com/macros/s/AKfycbxPtvi86jPy7y41neTpIPvn3hpycd3cMjbgjgifzLD6qRwrJVPlF9EDulaQp42nma-i/exec';

const CONFIG = {
  dryRun: false,
  batchSize: 10,
  delayBetweenBatches: 300
};

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

async function processPerson(personData) {
    const { nome, comum, row, person } = personData;
    const uuid = generateUUID();
    const now = new Date();
    
    // Se a pessoa existe no cadastro, usar dados dela
    const instrumento = person ? person.instrumento : null;
    const nivel = person ? person.nivel : null;
    const cidade = person ? person.cidade : (row['CIDADE'] || '').trim().toUpperCase();

    const payloadSupabase = {
      uuid: uuid,
      nome_completo: nome,
      comum: comum,
      cargo: 'ENCARREGADO LOCAL',
      instrumento: instrumento ? instrumento.toUpperCase() : null,
      naipe_instrumento: null, // O sistema calculará depois ou deixará null
      classe_organista: null,
      nivel: nivel ? nivel.toUpperCase() : null,
      cidade: cidade.toUpperCase(),
      local_ensaio: 'ITAPEVI',
      data_ensaio: now.toISOString(),
      registrado_por: 'CARGA_TESTE_V3',
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
      REGISTRADO_POR: 'CARGA_TESTE_V3',
      SYNC_STATUS: 'ATUALIZADO',
      SYNCED_AT: now.toISOString(),
      ANOTACOES: person ? 'Encontrado no Cadastro' : 'Entrada Manual (Não encontrado)',
      DUPLICATA: 'NÃO',
      NÍVEL: nivel || ''
    };

    try {
      const [resSheets, resSupabase] = await Promise.all([
        sendToSheets(payloadSheets),
        sendToSupabase(payloadSupabase)
      ]);
      const sOk = resSheets.ok || resSheets.type === 'opaque';
      const sbOk = resSupabase.ok;

      if (!sOk) {
        const errText = await resSheets.text().catch(() => 'No text');
        console.error(`❌ Erro Sheets para ${nome}: ${resSheets.status} - ${errText}`);
      }
      if (!sbOk) {
        const errText = await resSupabase.text().catch(() => 'No text');
        console.error(`❌ Erro Supabase para ${nome}: ${resSupabase.status} - ${errText}`);
      }

      return { 
        success: sOk && sbOk, 
        nome,
        foundInCadastro: !!person 
      };
    } catch (error) {
      console.error(`❌ Erro em ${nome}:`, error.message);
      return { success: false, nome, error: error.message };
    }
}

async function run() {
  console.log('🚀 Iniciando Simulação V3 (Deduplicada e Confrontada com Cadastro)...');
  
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
  console.log(`🔍 Encontrados no Cadastro: ${uniquePeople.filter(p => p.person).length}`);
  console.log(`📝 Novos (Manuais): ${uniquePeople.filter(p => !p.person).length}`);

  const stats = { total: uniquePeople.length, success: 0, errors: 0, start: Date.now() };

  for (let i = 0; i < uniquePeople.length; i += CONFIG.batchSize) {
    const batch = uniquePeople.slice(i, i + CONFIG.batchSize);
    console.log(`📦 Processando lote ${Math.floor(i/CONFIG.batchSize) + 1}...`);
    
    const results = await Promise.all(batch.map(p => processPerson(p)));
    
    results.forEach(r => {
      if (r.success) stats.success++;
      else stats.errors++;
    });

    if (i + CONFIG.batchSize < uniquePeople.length) {
      await new Promise(r => setTimeout(r, CONFIG.delayBetweenBatches));
    }
  }

  console.log(`\n✅ Simulação V3 Concluída!`);
  console.log(`📊 Total: ${stats.total} | Sucesso: ${stats.success} | Erros: ${stats.errors}`);
}

run().catch(console.error);
