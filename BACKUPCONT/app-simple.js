// app-simple.js
// Versão simplificada e funcional do sistema

console.log('🚀 Carregando sistema simplificado...');

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
// VALIDAÇÃO DE FORMULÁRIO
// ========================================

function validateForm() {
  console.log('🔍 Validando formulário...');
  
  const errors = [];
  
  // Buscar campos por diferentes seletores
  const comum = document.getElementById('comum') || 
                document.querySelector('[name="comum"]') ||
                document.querySelector('input[placeholder*="comum" i]') ||
                document.querySelector('input[placeholder*="congregação" i]');
                
  const cargo = document.getElementById('cargo') || 
                document.querySelector('[name="cargo"]') ||
                document.querySelector('input[placeholder*="cargo" i]') ||
                document.querySelector('input[placeholder*="ministério" i]');
                
  const nome = document.getElementById('nome') || 
               document.querySelector('[name="nome"]') ||
               document.querySelector('input[placeholder*="nome" i]') ||
               document.querySelector('input[placeholder*="sobrenome" i]');
  
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
    // Buscar campos por diferentes seletores
    const comum = document.getElementById('comum') || 
                  document.querySelector('[name="comum"]') ||
                  document.querySelector('input[placeholder*="comum" i]') ||
                  document.querySelector('input[placeholder*="congregação" i]');
                  
    const cargo = document.getElementById('cargo') || 
                  document.querySelector('[name="cargo"]') ||
                  document.querySelector('input[placeholder*="cargo" i]') ||
                  document.querySelector('input[placeholder*="ministério" i]');
                  
    const instrumento = document.getElementById('instrumento') || 
                        document.querySelector('[name="instrumento"]') ||
                        document.querySelector('input[placeholder*="instrumento" i]');
                        
    const nome = document.getElementById('nome') || 
                 document.querySelector('[name="nome"]') ||
                 document.querySelector('input[placeholder*="nome" i]') ||
                 document.querySelector('input[placeholder*="sobrenome" i]');
                 
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
    
    // Limpar campos específicos
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
// ENVIO DE DADOS (SIMULADO)
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
  
  // Prevenir comportamento padrão
  if (e && e.preventDefault) {
    e.preventDefault();
  }
  
  // Verificar se já está processando
  if (isProcessing) {
    showToast('warning', 'Aguarde', 'Já existe um envio em andamento');
    return;
  }
  
  // Validar formulário
  if (!validateForm()) {
    return;
  }
  
  // Coletar dados
  const formData = collectFormData();
  if (!formData) {
    showAlert('error', 'Erro', 'Não foi possível coletar os dados do formulário');
    return;
  }
  
  // Marcar como processando
  isProcessing = true;
  
  try {
    // Encontrar e desabilitar botão
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
    
    // Mostrar feedback
    showToast('info', 'Enviando...', 'Processando seus dados...');
    
    // Enviar dados
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
    // Reabilitar botão
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
    
    // Marcar como não processando
    isProcessing = false;
  }
}

// ========================================
// INICIALIZAÇÃO
// ========================================

function initializeApp() {
  console.log('🚀 Inicializando aplicação...');
  
  try {
    // Aguardar um pouco para garantir que o DOM esteja pronto
    setTimeout(() => {
      // Encontrar formulário
      const form = document.querySelector('form');
      if (form) {
        form.addEventListener('submit', handleSubmit);
        console.log('✅ Event listener do formulário adicionado');
      }
      
      // Encontrar botão de envio
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
      
      console.log('✅ Aplicação inicializada com sucesso');
      
    }, 1000);
    
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

console.log('✅ Sistema simplificado carregado!');
