/* =========================================================================
   config.js — Configurações Centralizadas do Sistema
   ========================================================================= */

// === CONFIGURAÇÕES GLOBAIS ===
const CONFIG = {
  // Configurações de tema
  theme: {
    default: 'light', // SEMPRE iniciar em light mode
    persist: true, // Salvar preferência do usuário
    autoApply: true // Aplicar automaticamente
  },
  
  // Configurações de modal
  modal: {
    autoClose: true, // Fechar automaticamente na inicialização
    preventAutoOpen: true, // Prevenir abertura automática
    closeOnEscape: true // Fechar com ESC
  },
  
  // Configurações de inicialização
  initialization: {
    ensureModalsClosed: true,
    applyDefaultTheme: true,
    preventConflicts: true
  },
  
  // Configurações de desenvolvimento
  development: {
    debugMode: true,
    logLevel: 'info', // 'debug', 'info', 'warn', 'error'
    showConsoleMessages: true
  }
};

// === FUNÇÕES DE CONFIGURAÇÃO ===

// Função para aplicar configurações de tema
function applyThemeConfig() {
  console.log('🎨 Aplicando configurações de tema...');
  
  // SEMPRE iniciar em light mode
  const theme = CONFIG.theme.default;
  document.documentElement.setAttribute('data-theme', theme);
  
  // Atualizar ícone do botão de tema
  const themeBtn = document.getElementById('themeToggleBtn');
  if (themeBtn) {
    themeBtn.textContent = '🌙'; // Sempre mostrar ícone de lua (para alternar para dark)
  }
  
  // Aplicar tema visualmente
  if (theme === 'dark') {
    document.body.classList.add('dark-theme');
    document.body.classList.remove('light-theme');
    document.body.style.backgroundColor = '#1e1e1e';
  } else {
    document.body.classList.add('light-theme');
    document.body.classList.remove('dark-theme');
    document.body.style.backgroundColor = '#f8f9fa';
  }
  
  console.log(`✅ Tema ${theme} aplicado`);
}

// Função para garantir que modais estejam fechados
function ensureModalsClosed() {
  console.log('🔒 Garantindo que todos os modais estejam fechados...');
  
  // Lista de IDs de modais conhecidos
  const modalIds = ['modalNovaComum', 'modalEdicao', 'modalListaEdicao', 'backupModal'];
  
  modalIds.forEach(modalId => {
    const modal = document.getElementById(modalId);
    if (modal) {
      // Forçar fechamento do modal apenas se não for o modalNovaComum
      if (modalId !== 'modalNovaComum') {
        modal.style.display = 'none';
        modal.classList.remove('show');
        modal.setAttribute('aria-hidden', 'true');
        modal.setAttribute('aria-modal', 'false');
        
        // Remover backdrop se existir
        const backdrop = document.querySelector('.modal-backdrop');
        if (backdrop) {
          backdrop.remove();
        }
        
        // Remover classe modal-open do body
        document.body.classList.remove('modal-open');
        
        console.log(`✅ Modal ${modalId} fechado`);
      } else {
        // Para modalNovaComum, apenas garantir que está fechado na inicialização
        modal.style.display = 'none';
        modal.classList.remove('show');
        modal.setAttribute('aria-hidden', 'true');
        modal.setAttribute('aria-modal', 'false');
        console.log(`✅ Modal ${modalId} preparado para uso`);
      }
    }
  });
  
  // Verificação adicional após um delay
  setTimeout(() => {
    const openModals = document.querySelectorAll('.modal.show');
    if (openModals.length > 0) {
      console.log('⚠️ Ainda há modais abertos, verificando...');
      openModals.forEach(modal => {
        // Não fechar modais que estão sendo abertos intencionalmente
        if (!modal.classList.contains('modalNovaComum') || modal.style.display === 'none') {
          modal.style.display = 'none';
          modal.classList.remove('show');
        }
      });
    }
  }, 100);
}

// Função para inicialização centralizada
function initializeSystem() {
  console.log('🚀 Inicializando sistema com configurações centralizadas...');
  
  // Aplicar configurações de tema
  if (CONFIG.initialization.applyDefaultTheme) {
    applyThemeConfig();
  }
  
  // Garantir que modais estejam fechados
  if (CONFIG.initialization.ensureModalsClosed) {
    ensureModalsClosed();
  }
  
  console.log('✅ Sistema inicializado com sucesso');
}

// Expor configurações globalmente
window.CONFIG = CONFIG;
window.applyThemeConfig = applyThemeConfig;
window.ensureModalsClosed = ensureModalsClosed;
window.initializeSystem = initializeSystem;

// Auto-inicializar quando o DOM estiver pronto
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeSystem);
} else {
  initializeSystem();
}
