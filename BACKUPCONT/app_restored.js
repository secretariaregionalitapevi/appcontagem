/* =========================================================================
   app.js — Registro de Presenças (VERSÃO RESTAURADA)
   ========================================================================= */

/* ===== CONFIG ===== */
const SUPABASE_URL      = "https://wfqehmdawhfjqbqpjapp.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndmcWVobWRhd2hmanFicXBqYXBwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc0NDI0ODIsImV4cCI6MjA3MzAxODQ4Mn0.lFfEZKIVS7dqk48QFW4IvpRcJsgQnMjYE3iUqsrXsFg";

const TABLE_CATALOGO    = "musicos_unificado";
const TABLE_PRESENCAS   = "presencas";
const COL_COMUM         = "comum";

/* ===== VARIÁVEIS GLOBAIS ===== */
let isOnline = navigator.onLine;
let sb = null;
let supabaseLoaded = false;

/* ===== LISTAS FIXAS ===== */
const INSTRUMENTS_FIXED = [
  'ACORDEON','VIOLINO','VIOLA','VIOLONCELO','FLAUTA','OBOÉ',"OBOÉ D'AMORE",'CORNE INGLÊS','CLARINETE',
  'CLARINETE ALTO','CLARINETE BAIXO (CLARONE)','FAGOTE','SAXOFONE SOPRANO (RETO)','SAXOFONE ALTO','SAXOFONE TENOR',
  'SAXOFONE BARÍTONO','SAX OCTA CONTRABAIXO','TROMPA','TROMPETE','CORNET','FLUGELHORN','TROMBONE','TROMBONITO','EUFÔNIO','BARÍTONO (PISTO)','TUBA',
  'ÓRGÃO'
];

// Mapeamento de instrumentos para naipes
const INSTRUMENT_NAIPES = {
  'VIOLINO': 'CORDAS', 'VIOLA': 'CORDAS', 'VIOLONCELO': 'CORDAS',
  'FLAUTA': 'MADEIRAS', 'OBOÉ': 'MADEIRAS', "OBOÉ D'AMORE": 'MADEIRAS', 'CORNE INGLÊS': 'MADEIRAS',
  'CLARINETE': 'MADEIRAS', 'CLARINETE ALTO': 'MADEIRAS', 'CLARINETE BAIXO (CLARONE)': 'MADEIRAS', 'FAGOTE': 'MADEIRAS',
  'SAXOFONE SOPRANO (RETO)': 'MADEIRAS', 'SAXOFONE ALTO': 'MADEIRAS', 'SAXOFONE TENOR': 'MADEIRAS', 'SAXOFONE BARÍTONO': 'MADEIRAS', 'SAX OCTA CONTRABAIXO': 'MADEIRAS',
  'TROMPA': 'METAIS', 'TROMPETE': 'METAIS', 'CORNET': 'METAIS', 'FLUGELHORN': 'METAIS',
  'TROMBONE': 'METAIS', 'TROMBONITO': 'METAIS', 'EUFÔNIO': 'METAIS', 'BARÍTONO (PISTO)': 'METAIS', 'TUBA': 'METAIS',
  'ACORDEON': 'TECLADO', 'ÓRGÃO': 'TECLADO'
};

// Cargos para o app principal
const CARGOS_FIXED = [
  'Músico', 'Organista', 'Irmandade', 'Ancião', 'Diácono',
  'Cooperador do Ofício', 'Cooperador de Jovens', 'Porteiro (a)', 'Bombeiro (a)', 'Médico (a)', 'Enfermeiro (a)'
];

// Cargos completos para o modal
const CARGOS_COMPLETOS_MODAL = [
  'Músico', 'Organista', 'Instrutor', 'Instrutora', 'Encarregado Local', 'Encarregado Regional',
  'Secretário da Música', 'Secretária da Música', 'Irmandade', 'Ancião', 'Diácono',
  'Cooperador do Ofício', 'Cooperador de Jovens', 'Porteiro (a)', 'Bombeiro (a)', 'Médico (a)', 'Enfermeiro (a)'
];

/* ===== DETECÇÃO DE DISPOSITIVOS ===== */
const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || 
              (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const isAndroid = /Android/.test(navigator.userAgent);
const isMobile = isIOS || isAndroid || /Mobile|Tablet/.test(navigator.userAgent);

/* ===== FUNÇÕES DE NOTIFICAÇÃO ===== */
function showToast(msg, type = 'success') {
  console.log(`📢 ${type.toUpperCase()}: ${msg}`);
  
  if (typeof Swal !== 'undefined') {
    Swal.fire({
      title: type === 'success' ? 'Sucesso!' : type === 'error' ? 'Erro!' : 'Aviso!',
      text: msg,
      icon: type,
      timer: 3000,
      showConfirmButton: false,
      toast: true,
      position: 'top-end'
    });
  } else {
    alert(`${type.toUpperCase()}: ${msg}`);
  }
}

/* ===== FUNÇÕES DE CONECTIVIDADE ===== */
function updateOnlineStatus() {
  const dot = document.querySelector('.status-dot');
  const statusText = document.querySelector('.status-text');
  
  if (dot && statusText) {
    if (isOnline) {
      dot.classList.add("online");
      statusText.textContent = "Online";
    } else {
      dot.classList.remove("online");
      statusText.textContent = "Offline";
    }
  }
}

function checkConnectivity() {
  const wasOnline = isOnline;
  isOnline = navigator.onLine;
  
  if (wasOnline !== isOnline) {
    console.log(`🔄 Status mudou: ${wasOnline ? 'Online' : 'Offline'} → ${isOnline ? 'Online' : 'Offline'}`);
    updateOnlineStatus();
  }
  
  return isOnline;
}

/* ===== FUNÇÕES DE DEBUG ===== */
function forceOffline() {
  console.log("🧪 Forçando modo offline...");
  isOnline = false;
  updateOnlineStatus();
  showToast('Modo OFFLINE forçado', 'warning');
}

function forceOnline() {
  console.log("🧪 Forçando modo online...");
  isOnline = true;
  updateOnlineStatus();
  showToast('Modo ONLINE forçado', 'success');
}

function testConnectivity() {
  console.log("🧪 Testando conectividade...");
  const result = checkConnectivity();
  console.log("🧪 Resultado:", result ? "ONLINE" : "OFFLINE");
  showToast(result ? 'Sistema ONLINE' : 'Sistema OFFLINE', result ? 'success' : 'error');
  return result;
}

function showStatus() {
  console.log("📊 Status Detalhado:");
  console.log("- Online:", isOnline);
  console.log("- User Agent:", navigator.userAgent);
  console.log("- Protocolo:", window.location.protocol);
  console.log("- Navegador Online:", navigator.onLine);
  console.log("- Mobile:", isMobile);
  console.log("- iOS:", isIOS);
  console.log("- Android:", isAndroid);
  
  showToast(`Status: ${isOnline ? 'ONLINE' : 'OFFLINE'} | Mobile: ${isMobile}`, isOnline ? 'success' : 'warning');
}

/* ===== FUNÇÕES DE BUSCA E CARREGAMENTO ===== */
async function searchComuns(query) {
  if (!supabaseLoaded || !sb) {
    console.log("⚠️ Supabase não disponível para busca de comuns");
    return [];
  }
  
  try {
    const { data, error } = await sb
      .from(TABLE_CATALOGO)
      .select('comum')
      .ilike('comum', `%${query}%`)
      .order('comum')
      .limit(10);
    
    if (error) throw error;
    
    // Remover duplicatas
    const uniqueComuns = [...new Set(data.map(item => item.comum))];
    return uniqueComuns;
  } catch (error) {
    console.error("❌ Erro ao buscar comuns:", error);
    return [];
  }
}

async function searchMusicians(comum, cargo, instrumento) {
  if (!supabaseLoaded || !sb) {
    console.log("⚠️ Supabase não disponível para busca de músicos");
    return [];
  }
  
  try {
    let query = sb.from(TABLE_CATALOGO).select('*');
    
    if (comum) {
      query = query.eq('comum', comum);
    }
    
    if (cargo === 'Organista') {
      query = query.or('cargo.ilike.%ORGANISTA%,cargo.ilike.%EXAMINADORA%,cargo.ilike.%INSTRUTORA%');
    } else if (cargo === 'Músico') {
      if (instrumento) {
        query = query.ilike('instrumento', `%${instrumento}%`);
      }
      query = query.or('cargo.ilike.%MÚSICO%,cargo.ilike.%INSTRUTOR%,cargo.ilike.%ENCARREGADO%,cargo.ilike.%SECRETÁRIO%');
    }
    
    const { data, error } = await query.order('nome');
    
    if (error) throw error;
    
    return data || [];
  } catch (error) {
    console.error("❌ Erro ao buscar músicos:", error);
    return [];
  }
}

function carregarCargos() {
  const cargoSelect = document.getElementById('cargo');
  if (!cargoSelect) return;
  
  cargoSelect.innerHTML = '<option value="">Selecione o cargo...</option>';
  
  CARGOS_FIXED.forEach(cargo => {
    const option = document.createElement('option');
    option.value = cargo;
    option.textContent = cargo;
    cargoSelect.appendChild(option);
  });
  
  console.log("✅ Cargos carregados");
}

function carregarInstrumentos() {
  const instrumentoSelect = document.getElementById('instrumento');
  if (!instrumentoSelect) return;
  
  instrumentoSelect.innerHTML = '<option value="">Selecione o instrumento...</option>';
  
  INSTRUMENTS_FIXED.forEach(instrumento => {
    const option = document.createElement('option');
    option.value = instrumento;
    option.textContent = instrumento;
    instrumentoSelect.appendChild(option);
  });
  
  console.log("✅ Instrumentos carregados");
}

function carregarCargosModal() {
  const cargoSelect = document.getElementById('gsCargo');
  if (!cargoSelect) return;
  
  cargoSelect.innerHTML = '<option value="">Selecione o cargo...</option>';
  
  CARGOS_COMPLETOS_MODAL.forEach(cargo => {
    const option = document.createElement('option');
    option.value = cargo;
    option.textContent = cargo;
    cargoSelect.appendChild(option);
  });
  
  console.log("✅ Cargos do modal carregados");
}

function carregarInstrumentosModal() {
  const instrumentoSelect = document.getElementById('gsInstrumento');
  if (!instrumentoSelect) return;
  
  instrumentoSelect.innerHTML = '<option value="">Selecione o instrumento...</option>';
  
  INSTRUMENTS_FIXED.forEach(instrumento => {
    const option = document.createElement('option');
    option.value = instrumento;
    option.textContent = instrumento;
    instrumentoSelect.appendChild(option);
  });
  
  console.log("✅ Instrumentos do modal carregados");
}

/* ===== FUNÇÕES DE INTERFACE ===== */
function showComumResults(results) {
  const resultsDiv = document.getElementById('comumResults');
  if (!resultsDiv) return;
  
  resultsDiv.innerHTML = '';
  
  if (results.length === 0) {
    resultsDiv.innerHTML = '<div class="suggestion-item">Nenhuma comum encontrada</div>';
    resultsDiv.style.display = 'block';
    return;
  }
  
  results.forEach(comum => {
    const item = document.createElement('div');
    item.className = 'suggestion-item';
    item.textContent = comum;
    item.onclick = () => selectComum(comum);
    resultsDiv.appendChild(item);
  });
  
  resultsDiv.style.display = 'block';
}

function selectComum(comum) {
  const input = document.getElementById('comumInput');
  const results = document.getElementById('comumResults');
  
  if (input) input.value = comum;
  if (results) results.style.display = 'none';
  
  // Carregar músicos da comum selecionada
  loadMusiciansForComum(comum);
}

function showMusicianResults(results) {
  const nomeSelect = document.getElementById('nome');
  if (!nomeSelect) return;
  
  nomeSelect.innerHTML = '<option value="">Selecione o nome...</option>';
  
  results.forEach(musician => {
    const option = document.createElement('option');
    option.value = musician.nome;
    option.textContent = musician.nome;
    nomeSelect.appendChild(option);
  });
  
  console.log(`✅ ${results.length} músicos carregados`);
}

async function loadMusiciansForComum(comum) {
  if (!comum) return;
  
  const cargo = document.getElementById('cargo')?.value;
  const instrumento = document.getElementById('instrumento')?.value;
  
  const musicians = await searchMusicians(comum, cargo, instrumento);
  showMusicianResults(musicians);
}

/* ===== FUNÇÕES AUXILIARES ===== */
function cargoSelecionado() {
  return document.querySelector('input[name="cargo"]:checked')?.value || 
         document.getElementById('cargo')?.value || "";
}

function toggleExtras() {
  const cargo = cargoSelecionado();
  console.log("🔄 Cargo selecionado:", cargo);

  const ministerioBox = document.getElementById('ministerioBox');
  const administracaoBox = document.getElementById('administracaoBox');
  
  if (!ministerioBox || !administracaoBox) {
    console.log("ℹ️ Elementos dropdown não encontrados - continuando");
    return;
  }
  
  ministerioBox.classList.remove('show');
  administracaoBox.classList.remove('show');
  
  if (cargo === 'Ministério') {
    ministerioBox.classList.add('show');
  } else if (cargo === 'Administração') {
    administracaoBox.classList.add('show');
  }
}

/* ===== SUPABASE ===== */
async function initSupabase() {
  console.log('🔧 Iniciando Supabase...');
  
  if (typeof window.supabase === 'undefined') {
    console.log('⚠️ Supabase não disponível - continuando sem ele');
    return false;
  }
  
  try {
    sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    console.log('✅ Cliente Supabase criado');
    
    // Testar conexão
    const { data, error } = await sb.from('profiles').select('count').limit(1);
    if (error) {
      console.log('⚠️ Erro ao testar Supabase:', error.message);
      return false;
    }
    
    console.log('✅ Supabase funcionando');
    supabaseLoaded = true;
    return true;
  } catch (error) {
    console.log('⚠️ Erro ao inicializar Supabase:', error.message);
    return false;
  }
}

/* ===== FUNÇÕES PRINCIPAIS ===== */
async function handleSubmit(e) {
  e.preventDefault();
  console.log("💾 Processando formulário...");
  
  const comum = document.getElementById('comumInput')?.value || '';
  const cargo = document.getElementById('cargo')?.value || '';
  const instrumento = document.getElementById('instrumento')?.value || '';
  const nome = document.getElementById('nome')?.value || '';
  
  if (!comum || !cargo || !nome) {
    showToast('Preencha todos os campos obrigatórios', 'error');
    return;
  }
  
  const payload = {
    comum: comum,
    cargo: cargo,
    instrumento: instrumento,
    nome: nome,
    timestamp: new Date().toISOString()
  };
  
  console.log("📋 Dados coletados:", payload);
  
  if (isOnline && supabaseLoaded) {
    try {
      const { data, error } = await sb.from(TABLE_PRESENCAS).insert([payload]);
      if (error) throw error;
      
      console.log("✅ Salvo no Supabase:", data);
      showToast('Registro salvo com sucesso!', 'success');
      
      // Limpar formulário
      document.getElementById('comumInput').value = '';
      document.getElementById('cargo').value = '';
      document.getElementById('instrumento').value = '';
      document.getElementById('nome').value = '';
      
    } catch (error) {
      console.error("❌ Erro ao salvar no Supabase:", error);
      showToast('Erro ao salvar: ' + error.message, 'error');
    }
  } else {
    // Modo offline - salvar localmente
    const offlineData = JSON.parse(localStorage.getItem('offline_presencas') || '[]');
    offlineData.push(payload);
    localStorage.setItem('offline_presencas', JSON.stringify(offlineData));
    
    console.log("💾 Salvo localmente (offline)");
    showToast('Registro salvo offline - será sincronizado quando online', 'warning');
    
    // Limpar formulário
    document.getElementById('comumInput').value = '';
    document.getElementById('cargo').value = '';
    document.getElementById('instrumento').value = '';
    document.getElementById('nome').value = '';
  }
}

async function saveRecord() {
  console.log("💾 Salvando registro...");
  
  const comum = document.getElementById('gsComum')?.value || '';
  const cargo = document.getElementById('gsCargo')?.value || '';
  const instrumento = document.getElementById('gsInstrumento')?.value || '';
  const nome = document.getElementById('gsNome')?.value || '';
  
  if (!comum || !cargo || !nome) {
    showToast('Preencha todos os campos obrigatórios', 'error');
    return;
  }
  
  const payload = {
    comum: comum,
    cargo: cargo,
    instrumento: instrumento,
    nome: nome,
    timestamp: new Date().toISOString()
  };
  
  console.log("📋 Dados coletados:", payload);
  
  if (isOnline && supabaseLoaded) {
    try {
      const { data, error } = await sb.from(TABLE_PRESENCAS).insert([payload]);
      if (error) throw error;
      
      console.log("✅ Salvo no Supabase:", data);
      showToast('Registro salvo com sucesso!', 'success');
      
      // Limpar formulário
      document.getElementById('gsComum').value = '';
      document.getElementById('gsCargo').value = '';
      document.getElementById('gsInstrumento').value = '';
      document.getElementById('gsNome').value = '';
      
    } catch (error) {
      console.error("❌ Erro ao salvar no Supabase:", error);
      showToast('Erro ao salvar: ' + error.message, 'error');
    }
  } else {
    const offlineData = JSON.parse(localStorage.getItem('offline_presencas') || '[]');
    offlineData.push(payload);
    localStorage.setItem('offline_presencas', JSON.stringify(offlineData));
    
    console.log("💾 Salvo localmente (offline)");
    showToast('Registro salvo offline - será sincronizado quando online', 'warning');
    
    document.getElementById('gsComum').value = '';
    document.getElementById('gsCargo').value = '';
    document.getElementById('gsInstrumento').value = '';
    document.getElementById('gsNome').value = '';
  }
}

/* ===== INICIALIZAÇÃO ===== */
async function initApp() {
  console.log("🚀 Iniciando aplicação...");
  
  try {
    // Inicializar Supabase
    await initSupabase();
    
    // Configurar conectividade
    checkConnectivity();
    updateOnlineStatus();
    
    // Event listeners para conectividade
    window.addEventListener('online', () => {
      console.log("🌐 Navegador online");
      checkConnectivity();
    });
    
    window.addEventListener('offline', () => {
      console.log("📴 Navegador offline");
      checkConnectivity();
    });
    
    // Carregar dados iniciais
    carregarCargos();
    carregarInstrumentos();
    carregarCargosModal();
    carregarInstrumentosModal();
    
    // Configurar event listeners do formulário
    const form = document.getElementById('formPresenca');
    if (form) {
      form.addEventListener('submit', handleSubmit);
    }
    
    // Configurar busca de comuns
    const comumInput = document.getElementById('comumInput');
    if (comumInput) {
      comumInput.addEventListener('input', async (e) => {
        const query = e.target.value;
        if (query.length >= 2) {
          const results = await searchComuns(query);
          showComumResults(results);
        } else {
          const results = document.getElementById('comumResults');
          if (results) results.style.display = 'none';
        }
      });
    }
    
    // Configurar mudanças de cargo e instrumento
    const cargoSelect = document.getElementById('cargo');
    if (cargoSelect) {
      cargoSelect.addEventListener('change', () => {
        const comum = document.getElementById('comumInput')?.value;
        if (comum) {
          loadMusiciansForComum(comum);
        }
      });
    }
    
    const instrumentoSelect = document.getElementById('instrumento');
    if (instrumentoSelect) {
      instrumentoSelect.addEventListener('change', () => {
        const comum = document.getElementById('comumInput')?.value;
        if (comum) {
          loadMusiciansForComum(comum);
        }
      });
    }
    
    // Configurar botão do modal
    const submitBtn = document.getElementById('btnSalvarGS');
    if (submitBtn) {
      submitBtn.addEventListener('click', saveRecord);
    }
    
    // Expor funções globais para debug
    window.forceOffline = forceOffline;
    window.forceOnline = forceOnline;
    window.testConnectivity = testConnectivity;
    window.showStatus = showStatus;
    window.saveRecord = saveRecord;
    
    console.log("✅ Aplicação inicializada com sucesso");
    showToast('Sistema carregado!', 'success');
    
  } catch (error) {
    console.error("❌ Erro ao inicializar aplicação:", error);
    showToast('Erro ao carregar: ' + error.message, 'error');
  }
}

/* ===== INICIALIZAÇÃO AUTOMÁTICA ===== */
document.addEventListener('DOMContentLoaded', function() {
  console.log("📱 Dispositivo móvel:", isMobile);
  console.log("🍎 iOS:", isIOS);
  console.log("🤖 Android:", isAndroid);
  console.log("🌐 Online:", navigator.onLine);
  
  // Inicializar aplicação
  initApp();
});

// Logs de inicialização
console.log("🚀 Sistema iniciando...");
console.log("Protocolo:", window.location.protocol);
console.log("User Agent:", navigator.userAgent);

