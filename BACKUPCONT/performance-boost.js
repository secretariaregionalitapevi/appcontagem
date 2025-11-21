// ===== OTIMIZAÇÃO DE PERFORMANCE COMPLETA =====
console.log('🚀 Iniciando otimização de performance...');

// 1. Desabilitar Pace.js
function disablePace() {
  if (typeof Pace !== 'undefined') {
    Pace.stop();
    console.log('✅ Pace.js desabilitado');
  }
  
  // Remover elementos Pace
  const paceElements = document.querySelectorAll('.pace, .pace-progress, .pace-activity');
  paceElements.forEach(element => {
    if (element && element.parentNode) {
      element.parentNode.removeChild(element);
    }
  });
}

// 2. Otimizar carregamento de recursos
function optimizeResourceLoading() {
  // Preload recursos críticos
  const criticalResources = [
    'static/js/jquery-3.1.1.min.js',
    'static/js/bootstrap.min.js',
    'static/js/toastr.js',
    'static/js/plugins/sweetalert/sweetalert.min.js'
  ];
  
  criticalResources.forEach(resource => {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.href = resource;
    link.as = 'script';
    document.head.appendChild(link);
  });
  
  console.log('✅ Recursos críticos pré-carregados');
}

// 3. Otimizar animações
function optimizeAnimations() {
  // Reduzir animações desnecessárias
  const style = document.createElement('style');
  style.textContent = `
    * {
      animation-duration: 0.01ms !important;
      transition-duration: 0.01ms !important;
    }
    
    .loading-spinner,
    .hourglass,
    .modern-spinner {
      animation-duration: 1s !important;
    }
  `;
  document.head.appendChild(style);
  
  console.log('✅ Animações otimizadas');
}

// 4. Executar otimizações
function runPerformanceOptimizations() {
  console.log('🔧 Executando otimizações de performance...');
  
  disablePace();
  optimizeResourceLoading();
  optimizeAnimations();
  
  console.log('✅ Otimizações de performance aplicadas!');
}

// 5. Executar imediatamente
runPerformanceOptimizations();

// 6. Executar após carregamento da página
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', runPerformanceOptimizations);
} else {
  runPerformanceOptimizations();
}

console.log('✅ Sistema de otimização de performance ativado!');
