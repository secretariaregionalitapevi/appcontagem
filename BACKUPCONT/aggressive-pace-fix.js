// ===== CORREÇÃO AGRESSIVA DA BARRA VERMELHA =====
console.log('🚨 CORREÇÃO AGRESSIVA - Removendo barra vermelha...');

// 1. Função para remover TODOS os elementos Pace
function removeAllPaceElements() {
  // Seletores mais abrangentes
  const selectors = [
    '.pace',
    '.pace-progress', 
    '.pace-activity',
    '.pace-inactive',
    '[class*="pace"]',
    '[id*="pace"]',
    'div[style*="position: fixed"][style*="top: 0"]',
    'div[style*="z-index: 2040"]',
    'div[style*="height: 2px"]'
  ];
  
  selectors.forEach(selector => {
    const elements = document.querySelectorAll(selector);
    elements.forEach(element => {
      if (element && element.parentNode) {
        element.parentNode.removeChild(element);
        console.log('🗑️ Elemento removido:', selector, element.className || element.id);
      }
    });
  });
}

// 2. Função para adicionar CSS agressivo
function addAggressiveCSS() {
  const style = document.createElement('style');
  style.id = 'aggressive-pace-removal';
  style.textContent = `
    /* REMOÇÃO AGRESSIVA DE TODOS OS ELEMENTOS PACE */
    .pace,
    .pace-progress,
    .pace-activity,
    .pace-inactive,
    [class*="pace"],
    [id*="pace"] {
      display: none !important;
      visibility: hidden !important;
      opacity: 0 !important;
      pointer-events: none !important;
      height: 0 !important;
      width: 0 !important;
      position: absolute !important;
      left: -9999px !important;
      top: -9999px !important;
    }
    
    /* Remover qualquer barra no topo da página */
    body > div[style*="position: fixed"][style*="top: 0"] {
      display: none !important;
    }
    
    /* Remover elementos com z-index alto no topo */
    div[style*="z-index: 2040"],
    div[style*="z-index: 2000"] {
      display: none !important;
    }
    
    /* Remover barras de progresso */
    div[style*="height: 2px"],
    div[style*="height: 3px"] {
      display: none !important;
    }
  `;
  document.head.appendChild(style);
  console.log('✅ CSS agressivo adicionado');
}

// 3. Função para desabilitar Pace.js completamente
function disablePaceCompletely() {
  // Desabilitar Pace.js
  if (typeof Pace !== 'undefined') {
    Pace.stop();
    Pace.restart = function() {};
    Pace.go = function() {};
    console.log('✅ Pace.js completamente desabilitado');
  }
  
  // Remover variável global Pace
  if (window.Pace) {
    delete window.Pace;
    console.log('✅ Variável global Pace removida');
  }
}

// 4. Função principal de correção
function applyAggressiveFix() {
  console.log('🔧 Aplicando correção agressiva...');
  
  disablePaceCompletely();
  removeAllPaceElements();
  addAggressiveCSS();
  
  console.log('✅ Correção agressiva aplicada!');
}

// 5. Executar imediatamente
applyAggressiveFix();

// 6. Executar após carregamento da página
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', applyAggressiveFix);
} else {
  applyAggressiveFix();
}

// 7. Executar periodicamente para garantir
setInterval(applyAggressiveFix, 250);

// 8. Executar quando a página estiver completamente carregada
window.addEventListener('load', applyAggressiveFix);

console.log('✅ Sistema de correção agressiva ativado!');
