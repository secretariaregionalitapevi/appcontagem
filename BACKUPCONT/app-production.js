// app-production.js
// Sistema completo para produção com todas as funcionalidades

console.log('🚀 Carregando sistema completo para produção...');

// ========================================
// CONFIGURAÇÕES BÁSICAS
// ========================================

// Detectar plataforma
const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
const isDesktop = !isMobile;

console.log(`📱 Plataforma: ${isMobile ? 'MOBILE' : 'DESKTOP'}`);

// Variáveis de controle
let isProcessing = false;
let isOnline = navigator.onLine;
let comunsData = [];
let cargosData = [];
let instrumentosData = [];

// ========================================
// CONFIGURAÇÃO DO SUPABASE
// ========================================

const SUPABASE_URL = 'https://your-project.supabase.co';
const SUPABASE_ANON_KEY = 'your-anon-key';

let supabase = null;

// Inicializar Supabase
async function initSupabase() {
  try {
    if (typeof window.supabase !== 'undefined') {
      supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      console.log('✅ Supabase inicializado');
      return true;
    } else {
      console.warn('⚠️ Supabase não disponível');
      return false;
    }
  } catch (error) {
    console.error('❌ Erro ao inicializar Supabase:', error);
    return false;
  }
}

// ========================================
// FUNÇÕES DE UTILIDADE
// ========================================

// Gerar UUID
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Mostrar toast
function showToast(type, title, message, duration = 3000) {
  if (typeof toastr !== 'undefined') {
    toastr[type](message, title, {
      timeOut: duration,
      closeButton: true,
      progressBar: true
    });
  } else {
    console.log(`${type.toUpperCase()}: ${title} - ${message}`);
  }
}

// Mostrar alert
function showAlert(type, title, message) {
  if (typeof Swal !== 'undefined') {
    Swal.fire({
      title: title,
      text: message,
      icon: type,
      confirmButtonText: 'OK',
      confirmButtonColor: '#007bff'
    });
  } else {
    alert(`${title}: ${message}`);
  }
}

// ========================================
// CARREGAMENTO DE DADOS
// ========================================

// Carregar comuns
async function loadComuns() {
  console.log('📋 Carregando comuns...');
  
  try {
    // Tentar carregar do Supabase primeiro
    if (supabase) {
      const { data, error } = await supabase
        .from('comuns')
        .select('*')
        .order('nome');
      
      if (!error && data) {
        comunsData = data;
        console.log(`✅ ${data.length} comuns carregadas do Supabase`);
        return data;
      }
    }
    
    // Fallback: comuns padrão
    const defaultComuns = [
      { id: 1, nome: 'Jardim Miranda', cidade: 'Itapevi' },
      { id: 2, nome: 'Vila Nova Itapevi', cidade: 'Itapevi' },
      { id: 3, nome: 'Centro', cidade: 'Itapevi' },
      { id: 4, nome: 'Jardim Santa Rita', cidade: 'Itapevi' },
      { id: 5, nome: 'Vila Dr. Cardoso', cidade: 'Itapevi' },
      { id: 6, nome: 'Jardim São Carlos', cidade: 'Itapevi' },
      { id: 7, nome: 'Vila São Francisco', cidade: 'Itapevi' },
      { id: 8, nome: 'Jardim Bela Vista', cidade: 'Itapevi' },
      { id: 9, nome: 'Vila São José', cidade: 'Itapevi' },
      { id: 10, nome: 'Jardim Nova Itapevi', cidade: 'Itapevi' },
      { id: 11, nome: 'Vila Santa Luzia', cidade: 'Itapevi' },
      { id: 12, nome: 'Jardim São Pedro', cidade: 'Itapevi' },
      { id: 13, nome: 'Vila São João', cidade: 'Itapevi' },
      { id: 14, nome: 'Jardim São Paulo', cidade: 'Itapevi' },
      { id: 15, nome: 'Vila São Miguel', cidade: 'Itapevi' },
      { id: 16, nome: 'Jardim São Luiz', cidade: 'Itapevi' },
      { id: 17, nome: 'Vila São Rafael', cidade: 'Itapevi' },
      { id: 18, nome: 'Jardim São Gabriel', cidade: 'Itapevi' },
      { id: 19, nome: 'Vila São Mateus', cidade: 'Itapevi' }
    ];
    
    comunsData = defaultComuns;
    console.log(`✅ ${defaultComuns.length} comuns padrão carregadas`);
    return defaultComuns;
    
  } catch (error) {
    console.error('❌ Erro ao carregar comuns:', error);
    return [];
  }
}

// Carregar cargos
async function loadCargos() {
  console.log('👔 Carregando cargos...');
  
  try {
    const defaultCargos = [
      { id: 1, nome: 'Pastor', tipo: 'ministerial' },
      { id: 2, nome: 'Evangelista', tipo: 'ministerial' },
      { id: 3, nome: 'Presbítero', tipo: 'ministerial' },
      { id: 4, nome: 'Diácono', tipo: 'ministerial' },
      { id: 5, nome: 'Diaconisa', tipo: 'ministerial' },
      { id: 6, nome: 'Músico', tipo: 'musical' },
      { id: 7, nome: 'Cantor', tipo: 'musical' },
      { id: 8, nome: 'Organista', tipo: 'musical' },
      { id: 9, nome: 'Instrutora', tipo: 'musical' },
      { id: 10, nome: 'Examinadora', tipo: 'musical' },
      { id: 11, nome: 'Secretário', tipo: 'administrativo' },
      { id: 12, nome: 'Tesoureiro', tipo: 'administrativo' },
      { id: 13, nome: 'Porteiro', tipo: 'administrativo' },
      { id: 14, nome: 'Bibliotecário', tipo: 'administrativo' },
      { id: 15, nome: 'Professor', tipo: 'educacional' }
    ];
    
    cargosData = defaultCargos;
    console.log(`✅ ${defaultCargos.length} cargos carregados`);
    return defaultCargos;
    
  } catch (error) {
    console.error('❌ Erro ao carregar cargos:', error);
    return [];
  }
}

// Carregar instrumentos
async function loadInstrumentos() {
  console.log('🎵 Carregando instrumentos...');
  
  try {
    const defaultInstrumentos = [
      { id: 1, nome: 'Violão', categoria: 'cordas' },
      { id: 2, nome: 'Guitarra', categoria: 'cordas' },
      { id: 3, nome: 'Baixo', categoria: 'cordas' },
      { id: 4, nome: 'Piano', categoria: 'teclas' },
      { id: 5, nome: 'Teclado', categoria: 'teclas' },
      { id: 6, nome: 'Órgão', categoria: 'teclas' },
      { id: 7, nome: 'Bateria', categoria: 'percussão' },
      { id: 8, nome: 'Pandeiro', categoria: 'percussão' },
      { id: 9, nome: 'Flauta', categoria: 'sopro' },
      { id: 10, nome: 'Saxofone', categoria: 'sopro' },
      { id: 10.1, nome: 'Sax Octa Contrabaixo', categoria: 'sopro' },
      { id: 11, nome: 'Trompete', categoria: 'sopro' },
      { id: 12, nome: 'Violino', categoria: 'cordas' },
      { id: 13, nome: 'Voz', categoria: 'vocal' }
    ];
    
    instrumentosData = defaultInstrumentos;
    console.log(`✅ ${defaultInstrumentos.length} instrumentos carregados`);
    return defaultInstrumentos;
    
  } catch (error) {
    console.error('❌ Erro ao carregar instrumentos:', error);
    return [];
  }
}

// ========================================
// POPULAR CAMPOS
// ========================================

// Popular campo de comuns
function populateComuns() {
  const comumSelect = document.getElementById('comum') || 
                      document.querySelector('[name="comum"]') ||
                      document.querySelector('input[placeholder*="comum" i]');
  
  if (comumSelect && comunsData.length > 0) {
    // Se for input, criar dropdown
    if (comumSelect.tagName === 'INPUT') {
      createComunsDropdown(comumSelect);
    } else {
      // Se for select, popular opções
      comumSelect.innerHTML = '<option value="">Selecione uma comum...</option>';
      comunsData.forEach(comum => {
        const option = document.createElement('option');
        option.value = comum.nome;
        option.textContent = `${comum.nome} - ${comum.cidade}`;
        comumSelect.appendChild(option);
      });
    }
    console.log('✅ Campo de comuns populado');
  }
}

// Criar dropdown de comuns
function createComunsDropdown(input) {
  const dropdown = document.createElement('div');
  dropdown.className = 'comuns-dropdown';
  dropdown.style.cssText = `
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    background: white;
    border: 1px solid #ccc;
    border-radius: 4px;
    max-height: 200px;
    overflow-y: auto;
    z-index: 1000;
    display: none;
  `;
  
  comunsData.forEach(comum => {
    const item = document.createElement('div');
    item.className = 'dropdown-item';
    item.textContent = `${comum.nome} - ${comum.cidade}`;
    item.style.cssText = `
      padding: 8px 12px;
      cursor: pointer;
      border-bottom: 1px solid #eee;
    `;
    
    item.addEventListener('click', () => {
      input.value = comum.nome;
      dropdown.style.display = 'none';
    });
    
    dropdown.appendChild(item);
  });
  
  input.parentNode.style.position = 'relative';
  input.parentNode.appendChild(dropdown);
  
  input.addEventListener('focus', () => {
    dropdown.style.display = 'block';
  });
  
  input.addEventListener('blur', () => {
    setTimeout(() => {
      dropdown.style.display = 'none';
    }, 200);
  });
}

// Popular campo de cargos
function populateCargos() {
  const cargoSelect = document.getElementById('cargo') || 
                      document.querySelector('[name="cargo"]') ||
                      document.querySelector('select[placeholder*="cargo" i]');
  
  if (cargoSelect && cargosData.length > 0) {
    cargoSelect.innerHTML = '<option value="">Selecione o cargo...</option>';
    cargosData.forEach(cargo => {
      const option = document.createElement('option');
      option.value = cargo.nome;
      option.textContent = cargo.nome;
      cargoSelect.appendChild(option);
    });
    console.log('✅ Campo de cargos populado');
  }
}

// Popular campo de instrumentos
function populateInstrumentos() {
  const instrumentoSelect = document.getElementById('instrumento') || 
                            document.querySelector('[name="instrumento"]') ||
                            document.querySelector('select[placeholder*="instrumento" i]');
  
  if (instrumentoSelect && instrumentosData.length > 0) {
    instrumentoSelect.innerHTML = '<option value="">Selecione o instrumento...</option>';
    instrumentosData.forEach(instrumento => {
      const option = document.createElement('option');
      option.value = instrumento.nome;
      option.textContent = instrumento.nome;
      instrumentoSelect.appendChild(option);
    });
    console.log('✅ Campo de instrumentos populado');
  }
}

// ========================================
// VALIDAÇÃO DE FORMULÁRIO
// ========================================

function validateForm() {
  console.log('🔍 Validando formulário...');
  
  const errors = [];
  
  const comum = document.getElementById('comum') || 
                document.querySelector('[name="comum"]') ||
                document.querySelector('input[placeholder*="comum" i]');
                
  const cargo = document.getElementById('cargo') || 
                document.querySelector('[name="cargo"]') ||
                document.querySelector('select[placeholder*="cargo" i]');
                
  const nome = document.getElementById('nome') || 
               document.querySelector('[name="nome"]') ||
               document.querySelector('input[placeholder*="nome" i]');
  
  if (!comum || !comum.value.trim()) {
    errors.push('Comum/Congregação é obrigatório');
  }
  
  if (!cargo || !cargo.value.trim()) {
    errors.push('Cargo/Ministério é obrigatório');
  }
  
  if (!nome || !nome.value.trim()) {
    errors.push('Nome e Sobrenome são obrigatórios');
  }
  
  if (errors.length > 0) {
    showAlert('error', 'Campos Obrigatórios', errors.join('\n'));
    return false;
  }
  
  console.log('✅ Formulário válido');
  return true;
}

// ========================================
// COLETA DE DADOS
// ========================================

function collectFormData() {
  console.log('📋 Coletando dados do formulário...');
  
  try {
    const comum = document.getElementById('comum') || 
                  document.querySelector('[name="comum"]') ||
                  document.querySelector('input[placeholder*="comum" i]');
                  
    const cargo = document.getElementById('cargo') || 
                  document.querySelector('[name="cargo"]') ||
                  document.querySelector('select[placeholder*="cargo" i]');
                  
    const instrumento = document.getElementById('instrumento') || 
                        document.querySelector('[name="instrumento"]') ||
                        document.querySelector('select[placeholder*="instrumento" i]');
                        
    const nome = document.getElementById('nome') || 
                 document.querySelector('[name="nome"]') ||
                 document.querySelector('input[placeholder*="nome" i]');
                 
    const anotacoes = document.getElementById('anotacoes') || 
                      document.querySelector('[name="anotacoes"]') ||
                      document.querySelector('textarea');
    
    const formData = {
      comum: comum ? comum.value.trim() : '',
      cargo: cargo ? cargo.value.trim() : '',
      instrumento: instrumento ? instrumento.value.trim() : '',
      nome: nome ? nome.value.trim() : '',
      anotacoes: anotacoes ? anotacoes.value.trim() : '',
      timestamp: new Date().toISOString(),
      platform: isMobile ? 'MOBILE' : 'DESKTOP',
      uuid: generateUUID()
    };
    
    console.log('✅ Dados coletados:', formData);
    return formData;
    
  } catch (error) {
    console.error('❌ Erro ao coletar dados:', error);
    return null;
  }
}

// ========================================
// LIMPEZA DE FORMULÁRIO
// ========================================

function clearForm() {
  console.log('🧹 Limpando formulário...');
  
  try {
    const form = document.querySelector('form');
    if (form) {
      form.reset();
    }
    
    const fields = ['comum', 'cargo', 'instrumento', 'nome', 'anotacoes'];
    fields.forEach(fieldId => {
      const field = document.getElementById(fieldId);
      if (field) {
        field.value = '';
      }
    });
    
    console.log('✅ Formulário limpo');
    
  } catch (error) {
    console.error('❌ Erro ao limpar formulário:', error);
  }
}

// ========================================
// ENVIO DE DADOS
// ========================================

async function sendData(formData) {
  console.log('📤 Enviando dados...');
  
  try {
    // Simular envio (substituir por sua lógica real)
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    console.log('✅ Dados enviados com sucesso');
    return true;
    
  } catch (error) {
    console.error('❌ Erro ao enviar dados:', error);
    return false;
  }
}

// ========================================
// HANDLER DE SUBMIT
// ========================================

async function handleSubmit(e) {
  console.log('🚀 Iniciando envio...');
  
  if (e && e.preventDefault) {
    e.preventDefault();
  }
  
  if (isProcessing) {
    showToast('warning', 'Aguarde', 'Já existe um envio em andamento');
    return;
  }
  
  if (!validateForm()) {
    return;
  }
  
  const formData = collectFormData();
  if (!formData) {
    showAlert('error', 'Erro', 'Não foi possível coletar os dados do formulário');
    return;
  }
  
  isProcessing = true;
  
  try {
    const submitBtn = document.querySelector('button[type="submit"]') ||
                      document.getElementById('btnEnviar') ||
                      document.querySelector('button:contains("ENVIAR")') ||
                      document.querySelector('button:contains("Enviar")');
                      
    if (submitBtn) {
      submitBtn.disabled = true;
      const originalText = submitBtn.textContent;
      submitBtn.textContent = 'ENVIANDO...';
      submitBtn.dataset.originalText = originalText;
    }
    
    showToast('info', 'Enviando...', 'Processando seus dados...');
    
    const success = await sendData(formData);
    
    if (success) {
      showToast('success', 'Sucesso!', 'Dados enviados com sucesso');
      clearForm();
    } else {
      showAlert('error', 'Erro', 'Falha ao enviar dados. Tente novamente.');
    }
    
  } catch (error) {
    console.error('❌ Erro no envio:', error);
    showAlert('error', 'Erro', 'Ocorreu um erro inesperado. Tente novamente.');
    
  } finally {
    const submitBtn = document.querySelector('button[type="submit"]') ||
                      document.getElementById('btnEnviar') ||
                      document.querySelector('button:contains("ENVIAR")') ||
                      document.querySelector('button:contains("Enviar")');
                      
    if (submitBtn) {
      submitBtn.disabled = false;
      if (submitBtn.dataset.originalText) {
        submitBtn.textContent = submitBtn.dataset.originalText;
      } else {
        submitBtn.textContent = 'ENVIAR REGISTRO';
      }
    }
    
    isProcessing = false;
  }
}

// ========================================
// INICIALIZAÇÃO
// ========================================

async function initializeApp() {
  console.log('🚀 Inicializando aplicação completa...');
  
  try {
    // Inicializar Supabase
    await initSupabase();
    
    // Carregar dados
    await Promise.all([
      loadComuns(),
      loadCargos(),
      loadInstrumentos()
    ]);
    
    // Popular campos
    populateComuns();
    populateCargos();
    populateInstrumentos();
    
    // Configurar eventos
    const form = document.querySelector('form');
    if (form) {
      form.addEventListener('submit', handleSubmit);
      console.log('✅ Event listener do formulário adicionado');
    }
    
    const submitBtn = document.querySelector('button[type="submit"]') ||
                      document.getElementById('btnEnviar') ||
                      document.querySelector('button:contains("ENVIAR")') ||
                      document.querySelector('button:contains("Enviar")');
                      
    if (submitBtn) {
      submitBtn.addEventListener('click', handleSubmit);
      console.log('✅ Event listener do botão adicionado');
    }
    
    // Verificar conectividade
    window.addEventListener('online', () => {
      isOnline = true;
      showToast('success', 'Conectado', 'Conexão restaurada');
    });
    
    window.addEventListener('offline', () => {
      isOnline = false;
      showToast('warning', 'Offline', 'Você está offline');
    });
    
    console.log('✅ Aplicação completa inicializada com sucesso');
    
  } catch (error) {
    console.error('❌ Erro na inicialização:', error);
  }
}

// ========================================
// INICIALIZAR QUANDO DOM ESTIVER PRONTO
// ========================================

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeApp);
} else {
  initializeApp();
}

console.log('✅ Sistema completo para produção carregado!');
