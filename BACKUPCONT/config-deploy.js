// ========================================
// CONFIGURAÇÕES PARA DEPLOY NA HOSTINGER
// Sistema de Registro de Presença CCB
// ========================================

// ⚠️ IMPORTANTE: Configure estas variáveis antes do deploy

const DEPLOY_CONFIG = {
  // ========================================
  // CONFIGURAÇÕES DO SUPABASE
  // ========================================
  SUPABASE: {
    URL: "https://wfqehmdawhfjqbqpjapp.supabase.co",
    ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndmcWVobWRhd2hmanFicXBqYXBwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc0NDI0ODIsImV4cCI6MjA3MzAxODQ4Mn0.lFfEZKIVS7dqk48QFW4IvpRcJsgQnMjYE3iUqsrXsFg",
    
    // Tabelas do banco
    TABLES: {
      CATALOGO: "musicos_unificado",
      PRESENCAS: "presencas"
    }
  },

  // ========================================
  // CONFIGURAÇÕES DO GOOGLE SHEETS
  // ========================================
  GOOGLE_SHEETS: {
    // URL do Google Apps Script
    API_URL: "https://script.google.com/macros/s/AKfycbxPtvi86jPy7y41neTpIPvn3hpycd3cMjbgjgifzLD6qRwrJVPlF9EDulaQp42nma-i/exec",
    
    // Nome da planilha principal
    SHEET_NAME: "Dados"
  },

  // ========================================
  // CONFIGURAÇÕES DO DOMÍNIO
  // ========================================
  DOMAIN: {
    // Substitua pelo seu domínio da Hostinger
    BASE_URL: "https://seudominio.com",
    
    // URLs das páginas
    PAGES: {
      HOME: "/",
      LOGIN: "/login.html",
      EDIT: "/editar.html",
      SUPABASE_CONFIG: "/supabase.html"
    }
  },

  // ========================================
  // CONFIGURAÇÕES DE SEGURANÇA
  // ========================================
  SECURITY: {
    // URLs permitidas no Supabase
    ALLOWED_ORIGINS: [
      "https://seudominio.com",
      "https://www.seudominio.com",
      "http://localhost:3000", // Para desenvolvimento
      "http://127.0.0.1:5500"  // Para Live Server
    ],
    
    // Configurações de CORS
    CORS: {
      ENABLED: true,
      ALLOWED_METHODS: ["GET", "POST", "OPTIONS"],
      ALLOWED_HEADERS: ["Content-Type", "Authorization"]
    }
  },

  // ========================================
  // CONFIGURAÇÕES DE PERFORMANCE
  // ========================================
  PERFORMANCE: {
    // Cache em segundos
    CACHE: {
      STATIC_FILES: 2592000, // 30 dias
      HTML: 0,               // Sem cache
      API: 300               // 5 minutos
    },
    
    // Compressão
    COMPRESSION: {
      ENABLED: true,
      TYPES: ["text/html", "text/css", "application/javascript", "application/json"]
    }
  },

  // ========================================
  // CONFIGURAÇÕES DE DEBUG
  // ========================================
  DEBUG: {
    ENABLED: false, // Mude para true em desenvolvimento
    LOG_LEVEL: "info", // debug, info, warn, error
    CONSOLE_LOGS: true
  }
};

// ========================================
// FUNÇÃO PARA APLICAR CONFIGURAÇÕES
// ========================================
function applyDeployConfig() {
  console.log('🚀 Aplicando configurações de deploy...');
  
  // Aplicar configurações do Supabase
  if (typeof window !== 'undefined') {
    window.DEPLOY_CONFIG = DEPLOY_CONFIG;
  }
  
  // Log de configuração (apenas em desenvolvimento)
  if (DEPLOY_CONFIG.DEBUG.ENABLED) {
    console.log('📋 Configurações aplicadas:', DEPLOY_CONFIG);
  }
  
  return DEPLOY_CONFIG;
}

// ========================================
// VERIFICAÇÃO DE AMBIENTE
// ========================================
function checkDeployEnvironment() {
  const isProduction = window.location.hostname !== 'localhost' && 
                      window.location.hostname !== '127.0.0.1';
  
  const isHTTPS = window.location.protocol === 'https:';
  
  console.log('🔍 Verificação de ambiente:', {
    isProduction,
    isHTTPS,
    hostname: window.location.hostname,
    protocol: window.location.protocol
  });
  
  // Avisos para produção
  if (isProduction && !isHTTPS) {
    console.warn('⚠️ ATENÇÃO: Site em produção sem HTTPS!');
  }
  
  if (isProduction && DEPLOY_CONFIG.DEBUG.ENABLED) {
    console.warn('⚠️ ATENÇÃO: Debug habilitado em produção!');
  }
  
  return {
    isProduction,
    isHTTPS,
    isReady: isProduction ? isHTTPS : true
  };
}

// ========================================
// EXPORTAR CONFIGURAÇÕES
// ========================================
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { DEPLOY_CONFIG, applyDeployConfig, checkDeployEnvironment };
} else if (typeof window !== 'undefined') {
  window.DEPLOY_CONFIG = DEPLOY_CONFIG;
  window.applyDeployConfig = applyDeployConfig;
  window.checkDeployEnvironment = checkDeployEnvironment;
}
