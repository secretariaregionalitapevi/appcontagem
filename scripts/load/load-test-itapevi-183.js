/**
 * 🚀 Itapevi Scale Load Test (183 Concurrent Encarregados)
 * Simulates 183 users (one per church) checking in simultaneously.
 */

const GOOGLE_SHEETS_URL = 'https://script.google.com/macros/s/AKfycbxPtvi86jPy7y41neTpIPvn3hpycd3cMjbgjgifzLD6qRwrJVPlF9EDulaQp42nma-i/exec';

const totalUsers = 183;
const stats = {
  total: 0,
  success: 0,
  errors: 0,
  latencies: [],
};

function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

async function sendRegistro(id) {
  const startTime = Date.now();
  const registro = {
    UUID: generateUUID(),
    'NOME COMPLETO': `TESTE CARGA ITAPEVI ${id}`,
    COMUM: `IGREJA TESTE ${id}`,
    CIDADE: 'ITAPEVI',
    CARGO: 'ENCARREGADO LOCAL',
    INSTRUMENTO: '',
    NAIPE_INSTRUMENTO: '',
    CLASSE_ORGANISTA: '',
    LOCAL_ENSAIO: 'ITAPEVI',
    DATA_ENSAIO: new Date().toLocaleDateString('pt-BR'),
    REGISTRADO_POR: `ENCARREGADO_TESTE_${id}`,
    ANOTACOES: 'Load Test 183',
    SYNC_STATUS: 'ATUALIZADO',
  };

  try {
    const response = await fetch(GOOGLE_SHEETS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        op: 'append',
        sheet: 'Dados',
        data: registro,
      }),
    });
    
    const latency = Date.now() - startTime;
    stats.latencies.push(latency);
    stats.total++;
    
    if (response.ok || response.type === 'opaque') {
      stats.success++;
      console.log(`✅ User ${id} success (${latency}ms)`);
    } else {
      stats.errors++;
      console.log(`❌ User ${id} error: ${response.status}`);
    }
  } catch (error) {
    stats.errors++;
    stats.total++;
    console.log(`❌ User ${id} fetch error: ${error.message}`);
  }
}

async function runTest() {
  console.log(`🚀 Starting load test for Itapevi: ${totalUsers} concurrent users...`);
  
  const promises = [];
  for (let i = 1; i <= totalUsers; i++) {
    promises.push(sendRegistro(i));
  }
  
  await Promise.all(promises);
  
  const avgLatency = stats.latencies.reduce((a, b) => a + b, 0) / stats.latencies.length;
  console.log('\n📊 Final Results:');
  console.log(`   Total requests: ${stats.total}`);
  console.log(`   Success: ${stats.success}`);
  console.log(`   Errors: ${stats.errors}`);
  console.log(`   Avg Latency: ${avgLatency.toFixed(0)}ms`);
}

runTest();
