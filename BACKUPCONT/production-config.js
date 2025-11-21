// production-config.js
// Configuração específica para produção - Usando recursos locais

console.log('🚀 Carregando configuração de produção...');

// Verificar se estamos em ambiente de produção
const isProduction = window.location.hostname !== 'localhost' && 
                    window.location.hostname !== '127.0.0.1' && 
                    window.location.protocol !== 'file:';

if (!isProduction) {
  console.log('💻 Ambiente de desenvolvimento detectado - usando recursos locais...');
  window.productionResourcesLoaded = true;
  window.dispatchEvent(new CustomEvent('productionResourcesReady'));
} else {
  console.log('🌐 Ambiente de produção detectado - verificando recursos locais...');
  
  // Verificar se os recursos locais estão carregados
  function checkLocalResources() {
    const resources = {
      jQuery: typeof $ !== 'undefined',
      Bootstrap: typeof bootstrap !== 'undefined',
      SweetAlert2: typeof Swal !== 'undefined',
      Toastr: typeof toastr !== 'undefined',
      Supabase: typeof supabase !== 'undefined'
    };
    
    console.log('📋 Status dos recursos locais:', resources);
    
    // Aguardar um pouco mais se alguns recursos ainda não carregaram
    const allLoaded = Object.values(resources).every(loaded => loaded);
    
    if (allLoaded) {
      console.log('✅ Todos os recursos locais carregados com sucesso!');
      window.productionResourcesLoaded = true;
      window.dispatchEvent(new CustomEvent('productionResourcesReady'));
    } else {
      console.log('⏳ Aguardando carregamento de recursos locais...');
      setTimeout(checkLocalResources, 1000);
    }
  }
  
  // Verificar recursos após um pequeno delay
  setTimeout(checkLocalResources, 500);
}

// Exportar para uso global
window.ProductionConfig = {
  isProduction: isProduction,
  checkResources: function() {
    return {
      jQuery: typeof $ !== 'undefined',
      Bootstrap: typeof bootstrap !== 'undefined',
      SweetAlert2: typeof Swal !== 'undefined',
      Toastr: typeof toastr !== 'undefined',
      Supabase: typeof supabase !== 'undefined'
    };
  }
};

console.log('✅ Configuração de produção carregada!');