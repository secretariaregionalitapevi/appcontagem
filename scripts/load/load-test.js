/**
 * 🚀 Script de Teste de Carga
 * Simula 100+ usuários simultâneos enviando 5000 registros em 2 horas
 * 
 * Uso: node scripts/load/load-test.js
 */

const BASE_URL = process.env.API_URL || 'http://localhost:3000';
const GOOGLE_SHEETS_URL = 'https://script.google.com/macros/s/AKfycbxPtvi86jPy7y41neTpIPvn3hpycd3cMjbgjgifzLD6qRwrJVPlF9EDulaQp42nma-i/exec';

// Configuração do teste
const CONFIG = {
  totalUsers: 100,
  totalRegistros: 5000,
  durationHours: 2,
  durationMs: 2 * 60 * 60 * 1000, // 2 horas em ms
  peakLoadPercent: 0.2, // 20% do tempo em pico
  normalLoadPercent: 0.7, // 70% do tempo normal
  lowLoadPercent: 0.1, // 10% do tempo baixa carga
};

// Estatísticas
const stats = {
  total: 0,
  success: 0,
  errors: 0,
  timeouts: 0,
  duplicates: 0,
  latencies: [],
  startTime: Date.now(),
  errorsByType: {},
};

// Dados de teste
const comuns = ['ITAPEVI', 'COTIA', 'JANDIRA', 'PIRAPORA', 'VARGEM GRANDE', 'FAZENDINHA', 'CAUCAIA DO ALTO'];
const cargos = ['Músico', 'Organista', 'Instrutor', 'Encarregado Local', 'Secretário da Música'];
const instrumentos = ['Trompete', 'Trombone', 'Clarineta', 'Saxofone', 'Flauta', 'Violino', 'Violoncelo'];
const nomes = ['João Silva', 'Maria Santos', 'Pedro Oliveira', 'Ana Costa', 'Carlos Souza'];

// Função para gerar registro aleatório
function generateRandomRegistro(userId) {
  const comum = comuns[Math.floor(Math.random() * comuns.length)];
  const cargo = cargos[Math.floor(Math.random() * cargos.length)];
  const instrumento = cargo === 'Músico' ? instrumentos[Math.floor(Math.random() * instrumentos.length)] : null;
  const nome = nomes[Math.floor(Math.random() * nomes.length)] + ' ' + Math.floor(Math.random() * 1000);
  
  return {
    UUID: generateUUID(),
    'NOME COMPLETO': nome.toUpperCase(),
    COMUM: comum,
    CIDADE: comum,
    CARGO: cargo.toUpperCase(),
    INSTRUMENTO: instrumento ? instrumento.toUpperCase() : '',
    NAIPE_INSTRUMENTO: instrumento ? 'METAL' : '',
    CLASSE_ORGANISTA: '',
    LOCAL_ENSAIO: 'ITAPEVI',
    DATA_ENSAIO: new Date().toLocaleDateString('pt-BR'),
    HORÁRIO: new Date().toLocaleTimeString('pt-BR'),
    REGISTRADO_POR: `USER_${userId}`,
    USER_ID: userId,
    ANOTACOES: 'Teste de carga',
    SYNC_STATUS: 'ATUALIZADO',
  };
}

function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Função para enviar registro
async function sendRegistro(registro, userId) {
  const startTime = Date.now();
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000); // 8s timeout
    
    const response = await fetch(GOOGLE_SHEETS_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify({
        op: 'append',
        sheet: 'Dados',
        data: registro,
      }),
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    
    const latency = Date.now() - startTime;
    stats.latencies.push(latency);
    
    if (response.ok || response.type === 'opaque') {
      stats.success++;
      return { success: true, latency };
    } else {
      stats.errors++;
      const errorType = `HTTP_${response.status}`;
      stats.errorsByType[errorType] = (stats.errorsByType[errorType] || 0) + 1;
      return { success: false, error: `HTTP ${response.status}`, latency };
    }
  } catch (error) {
    const latency = Date.now() - startTime;
    stats.latencies.push(latency);
    
    if (error.name === 'AbortError') {
      stats.timeouts++;
      stats.errors++;
      stats.errorsByType['TIMEOUT'] = (stats.errorsByType['TIMEOUT'] || 0) + 1;
      return { success: false, error: 'Timeout', latency };
    } else {
      stats.errors++;
      const errorType = error.name || 'UNKNOWN';
      stats.errorsByType[errorType] = (stats.errorsByType[errorType] || 0) + 1;
      return { success: false, error: error.message, latency };
    }
  }
}

// Função para simular usuário
async function simulateUser(userId, loadMultiplier = 1) {
  const registrosPerMinute = 0.7 * loadMultiplier; // Base: 0.7 reg/min
  const intervalMs = (60 * 1000) / registrosPerMinute; // Intervalo entre registros
  
  const endTime = Date.now() + CONFIG.durationMs;
  
  while (Date.now() < endTime) {
    const registro = generateRandomRegistro(userId);
    stats.total++;
    
    await sendRegistro(registro, userId);
    
    // Aguardar intervalo (com pequena variação aleatória)
    const waitTime = intervalMs * (0.8 + Math.random() * 0.4); // ±20% variação
    await new Promise(resolve => setTimeout(resolve, waitTime));
  }
}

// Função para calcular estatísticas
function calculateStats() {
  const duration = (Date.now() - stats.startTime) / 1000; // segundos
  const avgLatency = stats.latencies.length > 0
    ? stats.latencies.reduce((a, b) => a + b, 0) / stats.latencies.length
    : 0;
  const minLatency = stats.latencies.length > 0 ? Math.min(...stats.latencies) : 0;
  const maxLatency = stats.latencies.length > 0 ? Math.max(...stats.latencies) : 0;
  const p95Latency = stats.latencies.length > 0
    ? stats.latencies.sort((a, b) => a - b)[Math.floor(stats.latencies.length * 0.95)]
    : 0;
  const p99Latency = stats.latencies.length > 0
    ? stats.latencies.sort((a, b) => a - b)[Math.floor(stats.latencies.length * 0.99)]
    : 0;
  const throughput = stats.total / duration; // registros/segundo
  const successRate = stats.total > 0 ? (stats.success / stats.total) * 100 : 0;
  
  return {
    duration,
    total: stats.total,
    success: stats.success,
    errors: stats.errors,
    timeouts: stats.timeouts,
    duplicates: stats.duplicates,
    successRate: successRate.toFixed(2) + '%',
    throughput: throughput.toFixed(2) + ' reg/s',
    avgLatency: avgLatency.toFixed(0) + 'ms',
    minLatency: minLatency + 'ms',
    maxLatency: maxLatency + 'ms',
    p95Latency: p95Latency + 'ms',
    p99Latency: p99Latency + 'ms',
    errorsByType: stats.errorsByType,
  };
}

// Função principal
async function runLoadTest() {
  console.log('🚀 Iniciando teste de carga...');
  console.log(`📊 Configuração:`);
  console.log(`   - Usuários simultâneos: ${CONFIG.totalUsers}`);
  console.log(`   - Duração: ${CONFIG.durationHours} horas`);
  console.log(`   - Registros esperados: ${CONFIG.totalRegistros}`);
  console.log(`   - Taxa esperada: ~${(CONFIG.totalRegistros / (CONFIG.durationHours * 60)).toFixed(1)} reg/min\n`);
  
  // Dividir em fases: normal, pico, baixa
  const phaseDuration = CONFIG.durationMs / 3;
  
  // Fase 1: Carga normal (70% dos usuários)
  console.log('📈 Fase 1: Carga normal (70% dos usuários)');
  const normalUsers = Math.floor(CONFIG.totalUsers * CONFIG.normalLoadPercent);
  const normalPromises = Array.from({ length: normalUsers }, (_, i) => 
    simulateUser(i, 1.0)
  );
  
  // Fase 2: Pico (20% dos usuários com carga 2x)
  console.log('🔥 Fase 2: Pico de carga (20% dos usuários, carga 2x)');
  const peakUsers = Math.floor(CONFIG.totalUsers * CONFIG.peakLoadPercent);
  const peakPromises = Array.from({ length: peakUsers }, (_, i) => 
    simulateUser(normalUsers + i, 2.0)
  );
  
  // Fase 3: Baixa carga (10% dos usuários com carga 0.5x)
  console.log('📉 Fase 3: Baixa carga (10% dos usuários, carga 0.5x)');
  const lowUsers = CONFIG.totalUsers - normalUsers - peakUsers;
  const lowPromises = Array.from({ length: lowUsers }, (_, i) => 
    simulateUser(normalUsers + peakUsers + i, 0.5)
  );
  
  // Executar todas as fases em paralelo
  const allPromises = [...normalPromises, ...peakPromises, ...lowPromises];
  
  // Monitoramento a cada 30 segundos
  const monitorInterval = setInterval(() => {
    const currentStats = calculateStats();
    console.log(`\n⏱️  Progresso (${((Date.now() - stats.startTime) / CONFIG.durationMs * 100).toFixed(1)}%):`);
    console.log(`   Total: ${currentStats.total} | Sucesso: ${currentStats.success} | Erros: ${currentStats.errors}`);
    console.log(`   Throughput: ${currentStats.throughput} | Latência média: ${currentStats.avgLatency}`);
  }, 30000);
  
  // Aguardar conclusão
  await Promise.all(allPromises);
  clearInterval(monitorInterval);
  
  // Estatísticas finais
  console.log('\n✅ Teste concluído!\n');
  const finalStats = calculateStats();
  console.log('📊 Estatísticas Finais:');
  console.log(`   Duração: ${(finalStats.duration / 60).toFixed(1)} minutos`);
  console.log(`   Total de registros: ${finalStats.total}`);
  console.log(`   Sucessos: ${finalStats.success}`);
  console.log(`   Erros: ${finalStats.errors}`);
  console.log(`   Timeouts: ${finalStats.timeouts}`);
  console.log(`   Taxa de sucesso: ${finalStats.successRate}`);
  console.log(`   Throughput: ${finalStats.throughput}`);
  console.log(`\n⏱️  Latências:`);
  console.log(`   Média: ${finalStats.avgLatency}`);
  console.log(`   Mínima: ${finalStats.minLatency}`);
  console.log(`   Máxima: ${finalStats.maxLatency}`);
  console.log(`   P95: ${finalStats.p95Latency}`);
  console.log(`   P99: ${finalStats.p99Latency}`);
  
  if (Object.keys(finalStats.errorsByType).length > 0) {
    console.log(`\n❌ Erros por tipo:`);
    Object.entries(finalStats.errorsByType).forEach(([type, count]) => {
      console.log(`   ${type}: ${count}`);
    });
  }
  
  // Verificar se atingiu os objetivos
  console.log(`\n🎯 Objetivos:`);
  console.log(`   Registros esperados: ${CONFIG.totalRegistros}`);
  console.log(`   Registros enviados: ${finalStats.total}`);
  console.log(`   Taxa de sucesso mínima (98%): ${(finalStats.total * 0.98).toFixed(0)}`);
  console.log(`   Taxa de sucesso alcançada: ${finalStats.success}`);
  
  if (finalStats.success >= CONFIG.totalRegistros * 0.98) {
    console.log(`   ✅ OBJETIVO ATINGIDO!`);
  } else {
    console.log(`   ⚠️  Objetivo não atingido. Necessário otimização.`);
  }
}

// Executar teste
if (require.main === module) {
  runLoadTest().catch(console.error);
}

module.exports = { runLoadTest, generateRandomRegistro, sendRegistro };

