// ===== CORREÇÃO AUTOMÁTICA DE ERROS DE SCRIPTS =====
console.log('🔧 Iniciando correção automática de erros de scripts...');

// 1. Verificar se scripts estão carregados
function checkScriptsLoaded() {
  const scripts = {
    jQuery: typeof $ !== 'undefined',
    Bootstrap: typeof bootstrap !== 'undefined',
    SweetAlert: typeof Swal !== 'undefined',
    Toastr: typeof toastr !== 'undefined'
  };
  
  console.log('📋 Status dos scripts:', scripts);
  return scripts;
}

// 2. Recarregar scripts que falharam
function reloadFailedScripts() {
  const failedScripts = [];
  
  if (typeof $ === 'undefined') {
    failedScripts.push('static/js/jquery-3.1.1.min.js');
  }
  
  if (typeof bootstrap === 'undefined') {
    failedScripts.push('static/js/bootstrap.min.js');
  }
  
  if (typeof Swal === 'undefined') {
    failedScripts.push('static/js/plugins/sweetalert/sweetalert.min.js');
  }
  
  if (typeof toastr === 'undefined') {
    failedScripts.push('static/js/toastr.js');
  }
  
  if (failedScripts.length > 0) {
    console.log('🔄 Recarregando scripts que falharam:', failedScripts);
    
    failedScripts.forEach(script => {
      const scriptElement = document.createElement('script');
      scriptElement.src = script + '?v=' + Date.now();
      scriptElement.onload = () => console.log('✅ Script recarregado:', script);
      scriptElement.onerror = () => console.error('❌ Falha ao recarregar:', script);
      document.head.appendChild(scriptElement);
    });
  }
}

// 3. Corrigir MIME types via JavaScript
function fixMimeTypes() {
  console.log('🔧 Tentando corrigir MIME types...');
  
  // Forçar recarregamento de scripts com parâmetros de cache
  const scripts = document.querySelectorAll('script[src]');
  scripts.forEach(script => {
    if (script.src.includes('.js')) {
      const newSrc = script.src + (script.src.includes('?') ? '&' : '?') + 'v=' + Date.now();
      script.src = newSrc;
    }
  });
}

// 4. Executar correções
function executeFixes() {
  console.log('🚀 Executando correções...');
  
  // Verificar scripts
  const status = checkScriptsLoaded();
  
  // Se algum script falhou, tentar corrigir
  if (Object.values(status).some(loaded => !loaded)) {
    console.log('⚠️ Alguns scripts falharam, tentando corrigir...');
    reloadFailedScripts();
    fixMimeTypes();
  } else {
    console.log('✅ Todos os scripts carregados com sucesso!');
  }
}

// 5. Executar após carregamento da página
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', executeFixes);
} else {
  executeFixes();
}

// 6. Executar também após um delay para capturar scripts carregados dinamicamente
setTimeout(executeFixes, 2000);

console.log('✅ Sistema de correção automática ativado!');
