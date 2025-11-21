// ===== OTIMIZAÇÕES MOBILE APRIMORADAS PARA CCB PRESENÇA =====
// Sistema otimizado para funcionar perfeitamente em todas as plataformas mobile

console.log('📱 Inicializando otimizações mobile aprimoradas...');

// ===== DETECÇÃO AVANÇADA DE DISPOSITIVO MOBILE =====
const deviceDetection = {
  // Detecção básica
  isMobile: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent),
  
  // Detecção específica por plataforma
  isIOS: /iPad|iPhone|iPod/.test(navigator.userAgent) || 
         (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1),
  
  isAndroid: /Android/.test(navigator.userAgent),
  
  // Detecção específica por fabricante
  isSamsung: /SamsungBrowser|SM-|GT-|SCH-|SGH-|SHV-|SPH-|SGH-|GT-|SM-|Galaxy/i.test(navigator.userAgent),
  
  isXiaomi: /Mi|Redmi|POCO|HM|MIUI/i.test(navigator.userAgent),
  
  isHuawei: /Huawei|Honor|HMA|HUAWEI/i.test(navigator.userAgent),
  
  isOnePlus: /OnePlus|ONEPLUS/i.test(navigator.userAgent),
  
  isLG: /LG|LGE/i.test(navigator.userAgent),
  
  isMotorola: /Motorola|Moto/i.test(navigator.userAgent),
  
  // Detecção de navegador
  isChrome: /Chrome/i.test(navigator.userAgent),
  isSafari: /Safari/i.test(navigator.userAgent) && !/Chrome/i.test(navigator.userAgent),
  isFirefox: /Firefox/i.test(navigator.userAgent),
  isEdge: /Edge/i.test(navigator.userAgent),
  
  // Detecção de versão do sistema
  isAndroidOld: /Android [1-6]/.test(navigator.userAgent),
  isAndroidNew: /Android [7-9]|Android 1[0-9]/.test(navigator.userAgent),
  isIOSOld: /OS [1-9]_|OS 1[0-4]_/.test(navigator.userAgent),
  isIOSNew: /OS 1[5-9]_|OS 2[0-9]_/.test(navigator.userAgent),
  
  // Detecção de modo standalone (PWA)
  isStandalone: window.matchMedia('(display-mode: standalone)').matches || 
                window.navigator.standalone === true
};

// Log da detecção
console.log('📱 Dispositivo detectado:', deviceDetection);

// ===== CONFIGURAÇÕES ESPECÍFICAS POR PLATAFORMA =====
const platformConfig = {
  android: {
    inputContrast: 'high',
    fontSize: '16px',
    fontWeight: '700',
    borderWidth: '2px',
    borderColor: '#9ca3af',
    focusBorderColor: '#1d4ed8',
    focusShadow: '0 0 0 4px rgba(29, 78, 216, 0.4)',
    backgroundColor: '#ffffff',
    textColor: '#000000',
    placeholderColor: '#6b7280'
  },
  
  ios: {
    inputContrast: 'medium',
    fontSize: '16px',
    fontWeight: '600',
    borderWidth: '2px',
    borderColor: '#d1d5db',
    focusBorderColor: '#3b82f6',
    focusShadow: '0 0 0 3px rgba(59, 130, 246, 0.25)',
    backgroundColor: '#ffffff',
    textColor: '#1f2937',
    placeholderColor: '#6b7280'
  },
  
  samsung: {
    inputContrast: 'high',
    fontSize: '16px',
    fontWeight: '700',
    borderWidth: '2px',
    borderColor: '#9ca3af',
    focusBorderColor: '#1d4ed8',
    focusShadow: '0 0 0 4px rgba(29, 78, 216, 0.4)',
    backgroundColor: '#ffffff',
    textColor: '#000000',
    placeholderColor: '#6b7280'
  },
  
  xiaomi: {
    inputContrast: 'high',
    fontSize: '16px',
    fontWeight: '600',
    borderWidth: '2px',
    borderColor: '#d1d5db',
    focusBorderColor: '#2563eb',
    focusShadow: '0 0 0 3px rgba(37, 99, 235, 0.3)',
    backgroundColor: '#ffffff',
    textColor: '#1a202c',
    placeholderColor: '#6b7280'
  },
  
  default: {
    inputContrast: 'medium',
    fontSize: '16px',
    fontWeight: '500',
    borderWidth: '2px',
    borderColor: '#e2e8f0',
    focusBorderColor: '#3b82f6',
    focusShadow: '0 0 0 3px rgba(59, 130, 246, 0.1)',
    backgroundColor: '#ffffff',
    textColor: '#1a202c',
    placeholderColor: '#64748b'
  }
};

// ===== FUNÇÃO PARA APLICAR CONFIGURAÇÕES ESPECÍFICAS =====
function applyPlatformSpecificStyles() {
  let config = platformConfig.default;
  
  // Determinar configuração baseada na detecção
  if (deviceDetection.isAndroid || deviceDetection.isSamsung) {
    config = platformConfig.android;
  } else if (deviceDetection.isIOS) {
    config = platformConfig.ios;
  } else if (deviceDetection.isXiaomi) {
    config = platformConfig.xiaomi;
  }
  
  console.log('📱 Aplicando configurações para:', {
    platform: deviceDetection.isAndroid ? 'Android' : 
              deviceDetection.isIOS ? 'iOS' : 
              deviceDetection.isSamsung ? 'Samsung' : 
              deviceDetection.isXiaomi ? 'Xiaomi' : 'Default',
    config: config
  });
  
  // Criar estilos específicos para a plataforma
  const platformStyle = document.createElement('style');
  platformStyle.id = 'platform-specific-styles';
  platformStyle.textContent = `
    /* Estilos específicos para ${deviceDetection.isAndroid ? 'Android' : 
      deviceDetection.isIOS ? 'iOS' : 
      deviceDetection.isSamsung ? 'Samsung' : 
      deviceDetection.isXiaomi ? 'Xiaomi' : 'Default'} */
    
    @media (max-width: 768px) {
      /* Campos de input otimizados para a plataforma */
      input[type="text"], input[type="search"], select, textarea {
        background-color: ${config.backgroundColor} !important;
        color: ${config.textColor} !important;
        border: ${config.borderWidth} solid ${config.borderColor} !important;
        font-weight: ${config.fontWeight} !important;
        font-size: ${config.fontSize} !important;
        min-height: 48px !important;
        padding: 12px 16px !important;
        border-radius: 8px !important;
        -webkit-appearance: none !important;
        -moz-appearance: none !important;
        appearance: none !important;
      }
      
      input[type="text"]:focus, input[type="search"]:focus, select:focus, textarea:focus {
        background-color: ${config.backgroundColor} !important;
        color: ${config.textColor} !important;
        border-color: ${config.focusBorderColor} !important;
        box-shadow: ${config.focusShadow} !important;
        outline: none !important;
      }
      
      input::placeholder, textarea::placeholder {
        color: ${config.placeholderColor} !important;
        font-weight: 500 !important;
        opacity: 1 !important;
      }
      
      /* Campos específicos */
      #nome, #comumInput, #cargoInput, #instrumentoInput, #anotacoes {
        background-color: ${config.backgroundColor} !important;
        color: ${config.textColor} !important;
        border: ${config.borderWidth} solid ${config.borderColor} !important;
        font-weight: ${config.fontWeight} !important;
      }
      
      #nome:focus, #comumInput:focus, #cargoInput:focus, #instrumentoInput:focus, #anotacoes:focus {
        background-color: ${config.backgroundColor} !important;
        color: ${config.textColor} !important;
        border-color: ${config.focusBorderColor} !important;
        box-shadow: ${config.focusShadow} !important;
      }
      
      /* Botões otimizados para touch */
      button, .btn {
        min-height: 44px !important;
        min-width: 44px !important;
        font-size: 16px !important;
        touch-action: manipulation !important;
        -webkit-tap-highlight-color: transparent !important;
      }
      
      /* Melhorar dropdowns */
      .suggestions-overlay {
        position: fixed !important;
        top: 0 !important;
        left: 0 !important;
        right: 0 !important;
        bottom: 0 !important;
        background: rgba(0,0,0,0.5) !important;
        z-index: 1000 !important;
      }
      
      .suggestions-list {
        position: fixed !important;
        top: 50% !important;
        left: 16px !important;
        right: 16px !important;
        transform: translateY(-50%) !important;
        max-height: 60vh !important;
        overflow-y: auto !important;
        background: ${config.backgroundColor} !important;
        border: ${config.borderWidth} solid ${config.borderColor} !important;
        border-radius: 8px !important;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3) !important;
      }
      
      .suggestions-list .suggestion-item {
        padding: 12px 16px !important;
        color: ${config.textColor} !important;
        font-weight: ${config.fontWeight} !important;
        border-bottom: 1px solid ${config.borderColor} !important;
      }
      
      .suggestions-list .suggestion-item:hover,
      .suggestions-list .suggestion-item:focus {
        background-color: #f3f4f6 !important;
        color: ${config.textColor} !important;
      }
    }
  `;
  
  // Remover estilos anteriores se existirem
  const existingStyle = document.getElementById('platform-specific-styles');
  if (existingStyle) {
    existingStyle.remove();
  }
  
  // Aplicar novos estilos
  document.head.appendChild(platformStyle);
  
  console.log('✅ Estilos específicos da plataforma aplicados');
}

// ===== FUNÇÃO PARA OTIMIZAR PERFORMANCE MOBILE =====
function optimizeMobilePerformance() {
  // Desabilitar animações em dispositivos com pouca memória
  if (navigator.deviceMemory && navigator.deviceMemory < 4) {
    console.log('📱 Dispositivo com pouca memória detectado, desabilitando animações');
    const performanceStyle = document.createElement('style');
    performanceStyle.textContent = `
      *, *::before, *::after {
        animation-duration: 0.01ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.01ms !important;
      }
    `;
    document.head.appendChild(performanceStyle);
  }
  
  // Otimizar para dispositivos com baixa resolução
  if (window.screen.width < 400 || window.screen.height < 600) {
    console.log('📱 Dispositivo com baixa resolução detectado, aplicando otimizações');
    const lowResStyle = document.createElement('style');
    lowResStyle.textContent = `
      @media (max-width: 400px) {
        .container {
          padding: 8px !important;
        }
        
        .card {
          margin-bottom: 8px !important;
        }
        
        .form-group {
          margin-bottom: 12px !important;
        }
        
        input, select, textarea {
          font-size: 14px !important;
          padding: 8px 12px !important;
          min-height: 40px !important;
        }
        
        button, .btn {
          font-size: 14px !important;
          padding: 8px 12px !important;
          min-height: 40px !important;
        }
      }
    `;
    document.head.appendChild(lowResStyle);
  }
}

// ===== FUNÇÃO PARA DETECTAR E CORRIGIR PROBLEMAS DE CONTRASTE =====
function detectAndFixContrastIssues() {
  // Verificar se há problemas de contraste nos campos
  const inputs = document.querySelectorAll('input, select, textarea');
  
  inputs.forEach(input => {
    // Verificar se o campo está visível
    const computedStyle = window.getComputedStyle(input);
    const backgroundColor = computedStyle.backgroundColor;
    const color = computedStyle.color;
    
    // Se as cores são muito similares, aplicar correção
    if (backgroundColor === color || 
        (backgroundColor === 'rgba(0, 0, 0, 0)' && color === 'rgba(0, 0, 0, 0)')) {
      
      console.log('📱 Problema de contraste detectado, aplicando correção:', input.id || input.name);
      
      // Aplicar estilos de alto contraste
      input.style.backgroundColor = '#ffffff';
      input.style.color = '#000000';
      input.style.border = '2px solid #d1d5db';
      input.style.fontWeight = '600';
    }
  });
}

// ===== FUNÇÃO PARA OTIMIZAR VIEWPORT MOBILE =====
function optimizeViewport() {
  // Verificar se o viewport está configurado corretamente
  const viewport = document.querySelector('meta[name="viewport"]');
  
  if (!viewport) {
    console.log('📱 Viewport não encontrado, criando...');
    const viewportMeta = document.createElement('meta');
    viewportMeta.name = 'viewport';
    viewportMeta.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no';
    document.head.appendChild(viewportMeta);
  } else {
    // Atualizar viewport para melhor experiência mobile
    viewport.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no';
  }
}

// ===== INICIALIZAÇÃO =====
function initMobileOptimizations() {
  console.log('📱 Inicializando otimizações mobile aprimoradas...');
  
  // Aplicar otimizações específicas da plataforma
  applyPlatformSpecificStyles();
  
  // Otimizar performance
  optimizeMobilePerformance();
  
  // Otimizar viewport
  optimizeViewport();
  
  // Detectar e corrigir problemas de contraste
  setTimeout(detectAndFixContrastIssues, 1000);
  
  // Re-aplicar correções de contraste quando campos são adicionados dinamicamente
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === 'childList') {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const inputs = node.querySelectorAll ? node.querySelectorAll('input, select, textarea') : [];
            inputs.forEach(input => {
              setTimeout(() => detectAndFixContrastIssues(), 100);
            });
          }
        });
      }
    });
  });
  
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
  
  console.log('✅ Otimizações mobile aprimoradas inicializadas');
}

// ===== EXPORTAR FUNÇÕES =====
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    deviceDetection,
    platformConfig,
    initMobileOptimizations,
    applyPlatformSpecificStyles,
    detectAndFixContrastIssues
  };
} else {
  // Disponibilizar globalmente
  window.MobileOptimizations = {
    deviceDetection,
    platformConfig,
    initMobileOptimizations,
    applyPlatformSpecificStyles,
    detectAndFixContrastIssues
  };
}

// Auto-inicializar se não estiver em modo módulo
if (typeof window !== 'undefined') {
  // Aguardar DOM estar pronto
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initMobileOptimizations);
  } else {
    initMobileOptimizations();
  }
}
