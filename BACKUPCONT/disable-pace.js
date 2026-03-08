// ===== DESABILITAR PACE.JS - CORREÇÃO DE PERFORMANCE =====
console.log('🚀 Desabilitando Pace.js para melhorar performance...');

// 1. Desabilitar Pace.js imediatamente
if (typeof Pace !== 'undefined') {
  Pace.stop();
  console.log('✅ Pace.js desabilitado');
}

// 2. Remover elementos Pace do DOM
function removePaceElements() {
  const paceElements = document.querySelectorAll('.pace, .pace-progress, .pace-activity');
  paceElements.forEach(element => {
    if (element && element.parentNode) {
      element.parentNode.removeChild(element);
      console.log('🗑️ Elemento Pace removido:', element.className);
    }
  });
}

// 3. Adicionar CSS para esconder Pace
function hidePaceCSS() {
  const style = document.createElement('style');
  style.id = 'disable-pace-styles';
  style.textContent = `
    .pace,
    .pace-progress,
    .pace-activity,
    .pace-inactive {
      display: none !important;
      visibility: hidden !important;
      opacity: 0 !important;
    }
    
    /* Remover barra de progresso do topo */
    .pace .pace-progress {
      display: none !important;
    }
    
    /* Garantir que não há elementos Pace visíveis */
    [class*="pace"] {
      display: none !important;
    }
  `;
  document.head.appendChild(style);
  console.log('✅ CSS para esconder Pace adicionado');
}

// 4. Executar correções
function disablePace() {
  console.log('🔧 Executando desabilitação do Pace.js...');
  
  // Desabilitar Pace
  if (typeof Pace !== 'undefined') {
    Pace.stop();
  }
  
  // Remover elementos
  removePaceElements();
  
  // Adicionar CSS
  hidePaceCSS();
  
  console.log('✅ Pace.js completamente desabilitado!');
}

// 5. Executar imediatamente
disablePace();

// 6. Executar também após carregamento da página
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', disablePace);
} else {
  disablePace();
}

// 7. Executar periodicamente para garantir que não reapareça
setInterval(disablePace, 1000);

console.log('✅ Sistema de desabilitação do Pace.js ativado!');
