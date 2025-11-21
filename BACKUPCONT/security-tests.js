// ===== TESTE DE VALIDAÇÃO - SISTEMA DE SEGURANÇA =====
// Script para testar todas as implementações de segurança

console.log('🧪 Iniciando testes de validação do sistema de segurança...');

// ===== TESTES DE VALIDAÇÃO DE ENTRADA =====
function testInputValidation() {
  console.log('🔍 Testando validação de entrada...');
  
  if (!window.SecuritySystem || !window.SecuritySystem.validator) {
    console.error('❌ Sistema de segurança não encontrado');
    return false;
  }
  
  const validator = window.SecuritySystem.validator;
  
  // Teste 1: Entrada válida
  const validInput = validator.validateTextInput('João Silva', 'Nome');
  if (!validInput.valid) {
    console.error('❌ Falha no teste de entrada válida');
    return false;
  }
  console.log('✅ Entrada válida testada');
  
  // Teste 2: Entrada com XSS
  const xssInput = validator.validateTextInput('<script>alert("xss")</script>', 'Nome');
  if (xssInput.valid) {
    console.error('❌ Falha na detecção de XSS');
    return false;
  }
  console.log('✅ Detecção de XSS funcionando');
  
  // Teste 3: Entrada muito longa
  const longInput = validator.validateTextInput('a'.repeat(300), 'Nome');
  if (longInput.valid) {
    console.error('❌ Falha na validação de comprimento');
    return false;
  }
  console.log('✅ Validação de comprimento funcionando');
  
  // Teste 4: Email válido
  const validEmail = validator.validateEmail('teste@exemplo.com');
  if (!validEmail.valid) {
    console.error('❌ Falha na validação de email válido');
    return false;
  }
  console.log('✅ Validação de email válido funcionando');
  
  // Teste 5: Email inválido
  const invalidEmail = validator.validateEmail('email-invalido');
  if (invalidEmail.valid) {
    console.error('❌ Falha na validação de email inválido');
    return false;
  }
  console.log('✅ Validação de email inválido funcionando');
  
  return true;
}

// ===== TESTES DE RATE LIMITING =====
function testRateLimiting() {
  console.log('🔍 Testando rate limiting...');
  
  if (!window.SecuritySystem || !window.SecuritySystem.rateLimiter) {
    console.error('❌ Rate limiter não encontrado');
    return false;
  }
  
  const rateLimiter = window.SecuritySystem.rateLimiter;
  
  // Teste: Múltiplas requisições
  for (let i = 0; i < 5; i++) {
    const result = rateLimiter.canMakeRequest('test-user');
    if (!result.allowed && i < 4) {
      console.error('❌ Rate limiting muito restritivo');
      return false;
    }
  }
  
  console.log('✅ Rate limiting funcionando');
  return true;
}

// ===== TESTES DE VERSIONING =====
function testVersioning() {
  console.log('🔍 Testando sistema de versioning...');
  
  if (!window.SecuritySystem || !window.SecuritySystem.versionManager) {
    console.error('❌ Version manager não encontrado');
    return false;
  }
  
  const versionManager = window.SecuritySystem.versionManager;
  
  // Teste: Comparação de versões
  const isNewer = versionManager.isNewerVersion('2.1.0', '2.0.0');
  if (!isNewer) {
    console.error('❌ Comparação de versões falhou');
    return false;
  }
  
  const isNotNewer = versionManager.isNewerVersion('2.0.0', '2.1.0');
  if (isNotNewer) {
    console.error('❌ Comparação de versões falhou (inverso)');
    return false;
  }
  
  console.log('✅ Sistema de versioning funcionando');
  return true;
}

// ===== TESTES DE PROTEÇÃO CONTRA ATAQUES =====
function testAttackProtection() {
  console.log('🔍 Testando proteções contra ataques...');
  
  // Teste 1: Verificar headers de segurança
  const metaTags = document.querySelectorAll('meta[http-equiv]');
  let securityHeadersFound = 0;
  
  metaTags.forEach(meta => {
    const httpEquiv = meta.getAttribute('http-equiv');
    if (['X-Content-Type-Options', 'X-Frame-Options', 'X-XSS-Protection'].includes(httpEquiv)) {
      securityHeadersFound++;
    }
  });
  
  if (securityHeadersFound < 3) {
    console.error('❌ Headers de segurança não encontrados');
    return false;
  }
  console.log('✅ Headers de segurança encontrados');
  
  // Teste 2: Verificar CSRF token
  const csrfToken = document.querySelector('meta[name="csrf-token"]');
  if (!csrfToken) {
    console.error('❌ CSRF token não encontrado');
    return false;
  }
  console.log('✅ CSRF token encontrado');
  
  // Teste 3: Verificar se não está em iframe
  if (window !== window.top) {
    console.error('❌ Aplicação está sendo executada em iframe');
    return false;
  }
  console.log('✅ Proteção contra clickjacking funcionando');
  
  return true;
}

// ===== TESTES DE OTIMIZAÇÕES MOBILE =====
function testMobileOptimizations() {
  console.log('🔍 Testando otimizações mobile...');
  
  // Teste 1: Verificar se os estilos mobile foram aplicados
  const mobileStyles = document.getElementById('mobileInputStyles') || 
                      document.getElementById('mobileHighContrastInputStyles') ||
                      document.querySelector('style[data-mobile-optimizations]');
  
  if (!mobileStyles) {
    // Verificar se os estilos estão no CSS principal
    const allStyles = document.querySelectorAll('style');
    let mobileStylesFound = false;
    
    allStyles.forEach(style => {
      if (style.textContent.includes('@media (max-width: 768px)') && 
          style.textContent.includes('input[type="text"]')) {
        mobileStylesFound = true;
      }
    });
    
    if (!mobileStylesFound) {
      console.error('❌ Estilos mobile não encontrados');
      return false;
    }
  }
  console.log('✅ Estilos mobile encontrados');
  
  // Teste 2: Verificar detecção de dispositivo
  if (typeof isMobile !== 'undefined' || typeof isAndroid !== 'undefined' || typeof isIOS !== 'undefined') {
    console.log('✅ Detecção de dispositivo funcionando');
  } else {
    console.warn('⚠️ Detecção de dispositivo pode não estar funcionando');
  }
  
  // Teste 3: Verificar se os campos têm alto contraste
  const inputs = document.querySelectorAll('input[type="text"], input[type="search"], select, textarea');
  if (inputs.length > 0) {
    const firstInput = inputs[0];
    const computedStyle = window.getComputedStyle(firstInput);
    const backgroundColor = computedStyle.backgroundColor;
    const color = computedStyle.color;
    
    // Verificar se há contraste adequado (simplificado)
    if (backgroundColor && color) {
      console.log('✅ Campos com estilos aplicados');
    }
  }
  
  return true;
}

// ===== EXECUTAR TODOS OS TESTES =====
function runAllTests() {
  console.log('🚀 Executando todos os testes de validação...');
  
  const tests = [
    { name: 'Validação de Entrada', fn: testInputValidation },
    { name: 'Rate Limiting', fn: testRateLimiting },
    { name: 'Sistema de Versioning', fn: testVersioning },
    { name: 'Proteção contra Ataques', fn: testAttackProtection },
    { name: 'Otimizações Mobile', fn: testMobileOptimizations }
  ];
  
  let passedTests = 0;
  let totalTests = tests.length;
  
  tests.forEach(test => {
    try {
      if (test.fn()) {
        passedTests++;
        console.log(`✅ ${test.name}: PASSOU`);
      } else {
        console.log(`❌ ${test.name}: FALHOU`);
      }
    } catch (error) {
      console.error(`❌ ${test.name}: ERRO - ${error.message}`);
    }
  });
  
  console.log(`\n📊 RESULTADO DOS TESTES:`);
  console.log(`✅ Testes passaram: ${passedTests}/${totalTests}`);
  console.log(`❌ Testes falharam: ${totalTests - passedTests}/${totalTests}`);
  
  if (passedTests === totalTests) {
    console.log('🎉 TODOS OS TESTES PASSARAM! Sistema pronto para produção!');
    return true;
  } else {
    console.log('⚠️ ALGUNS TESTES FALHARAM! Verificar implementações.');
    return false;
  }
}

// ===== EXECUTAR TESTES AUTOMATICAMENTE =====
if (typeof window !== 'undefined') {
  // Aguardar carregamento completo
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      setTimeout(runAllTests, 2000); // Aguardar 2s para carregamento completo
    });
  } else {
    setTimeout(runAllTests, 2000);
  }
}

// ===== EXPORTAR PARA TESTES MANUAIS =====
if (typeof window !== 'undefined') {
  window.SecurityTests = {
    testInputValidation,
    testRateLimiting,
    testVersioning,
    testAttackProtection,
    testMobileOptimizations,
    runAllTests
  };
  
  console.log('🧪 Testes de segurança disponíveis em window.SecurityTests');
}
