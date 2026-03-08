/* =========================================================================
   app.js — Registro de Presenças
   ========================================================================= */

/* ===== CONFIG ===== */
const SUPABASE_URL      = "https://wfqehmdawhfjqbqpjapp.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndmcWVobWRhd2hmanFicXBqYXBwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc0NDI0ODIsImV4cCI6MjA3MzAxODQ4Mn0.lFfEZKIVS7dqk48QFW4IvpRcJsgQnMjYE3iUqsrXsFg";

const TABLE_CATALOGO    = "musicos_unificado";
const TABLE_PRESENCAS   = "presencas";
const COL_COMUM         = "comum";

/* ===== LISTAS FIXAS ===== */
const INSTRUMENTS_FIXED = [
  'ACORDEON','VIOLINO','VIOLA','VIOLONCELO','FLAUTA','OBOÉ',"OBOÉ D'AMORE",'CORNE INGLÊS','CLARINETE',
  'CLARINETE ALTO','CLARINETE BAIXO (CLARONE)','FAGOTE','SAXOFONE SOPRANO (RETO)','SAXOFONE ALTO','SAXOFONE TENOR',
  'SAXOFONE BARÍTONO','SAX OCTA CONTRABAIXO','TROMPA','TROMPETE','CORNET','FLUGELHORN','TROMBONE','TROMBONITO','EUFÔNIO','BARÍTONO (PISTO)','TUBA',
  'ÓRGÃO'
];

// Mapeamento de instrumentos para naipes (PADRONIZADO)
const INSTRUMENT_NAIPES = {
  'VIOLINO': 'CORDAS',
  'VIOLA': 'CORDAS',
  'VIOLONCELO': 'CORDAS',
  'FLAUTA': 'MADEIRAS',
  'OBOÉ': 'MADEIRAS',
  "OBOÉ D'AMORE": 'MADEIRAS',
  'CORNE INGLÊS': 'MADEIRAS',
  'CLARINETE': 'MADEIRAS',
  'CLARINETE ALTO': 'MADEIRAS',
  'CLARINETE BAIXO (CLARONE)': 'MADEIRAS',
  'FAGOTE': 'MADEIRAS',
  'SAXOFONE SOPRANO (RETO)': 'MADEIRAS',
  'SAXOFONE ALTO': 'MADEIRAS',
  'SAXOFONE TENOR': 'MADEIRAS',
  'SAXOFONE BARÍTONO': 'MADEIRAS',
  'SAX OCTA CONTRABAIXO': 'MADEIRAS',
  'TROMPA': 'METAIS',
  'TROMPETE': 'METAIS',
  'CORNET': 'METAIS',
  'FLUGELHORN': 'METAIS',
  'TROMBONE': 'METAIS',
  'TROMBONITO': 'METAIS',
  'EUFÔNIO': 'METAIS',
  'BARÍTONO (PISTO)': 'METAIS',
  'TUBA': 'METAIS',
  'ACORDEON': 'TECLADO',
  'ÓRGÃO': 'TECLADO'
};
// Cargos para o app principal (otimizados para nossa jurisdição)
const CARGOS_FIXED = [
  'Músico',
  'Organista',
  'Irmandade',
  'Ancião',
  'Diácono',
  'Cooperador do Ofício',
  'Cooperador de Jovens',
  'Porteiro (a)',
  'Bombeiro (a)',
  'Médico (a)',
  'Enfermeiro (a)'
];

// Cargos completos para o modal (todas as jurisdições)
const CARGOS_COMPLETOS_MODAL = [
  // Cargos Musicais (primeiro)
  'Músico',
  'Organista',
  'Instrutor',
  'Instrutora',
  'Encarregado Local',
  'Encarregado Regional',
  'Secretário da Música',
  'Secretária da Música',
  
  // Cargos Ministeriais
  'Irmandade',
  'Ancião',
  'Diácono',
  'Cooperador do Ofício',
  'Cooperador de Jovens',
  
  // Cargos de Serviço
  'Porteiro (a)',
  'Bombeiro (a)',
  'Médico (a)',
  'Enfermeiro (a)'
];

/* ===== SUPABASE ===== */
let sb = null;
let supabaseLoaded = false;

// Função para inicializar Supabase
async function initSupabase() {
  console.log('🔧 Iniciando Supabase...');
  console.log('🔧 window.supabase disponível:', typeof window.supabase !== 'undefined');
  console.log('🔧 window.supabase.createClient disponível:', typeof window.supabase?.createClient === 'function');
  
  try {
    // Aguardar um pouco para garantir que o script carregou completamente
    await new Promise(resolve => setTimeout(resolve, 100));
    
    if (typeof window.supabase !== 'undefined' && typeof window.supabase.createClient === 'function') {
      console.log('🔧 Criando cliente Supabase...');
      sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      
      // Testar se o cliente foi criado corretamente
      if (sb && typeof sb.from === 'function') {
        supabaseLoaded = true;
        console.log('✅ Supabase carregado e inicializado com sucesso');
        console.log('🔧 Cliente Supabase:', sb);
        return true;
      } else {
        console.error('❌ Cliente Supabase criado mas não funcional');
        supabaseLoaded = false;
        return false;
      }
    } else {
      console.warn('⚠️ Supabase não disponível ou incompleto - tentando carregar dinamicamente...');
      
      // Tentar carregar Supabase dinamicamente
      try {
        const script = document.createElement('script');
        script.src = 'https://unpkg.com/@supabase/supabase-js@2';
        script.async = true;
        script.crossOrigin = 'anonymous';
        document.head.appendChild(script);
        
        await new Promise((resolve, reject) => {
          script.onload = () => {
            console.log('✅ Supabase carregado dinamicamente');
            resolve();
          };
          script.onerror = (e) => {
            console.error('❌ Erro ao carregar script Supabase:', e);
            reject(e);
          };
          setTimeout(() => reject(new Error('Timeout ao carregar Supabase')), 15000);
        });
        
        // Aguardar mais um pouco após carregar
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Tentar novamente após carregar
        if (typeof window.supabase !== 'undefined' && typeof window.supabase.createClient === 'function') {
          sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
          if (sb && typeof sb.from === 'function') {
            supabaseLoaded = true;
            console.log('✅ Supabase inicializado após carregamento dinâmico');
            return true;
          }
        }
      } catch (e) {
        console.error('❌ Falha ao carregar Supabase dinamicamente:', e);
      }
      
      supabaseLoaded = false;
      return false;
    }
  } catch (error) {
    console.error('❌ Erro na inicialização do Supabase:', error);
    supabaseLoaded = false;
    return false;
  }
}

/* ===== HELPERS GERAIS ===== */
const norm  = s => String(s||'').trim();
const upper = s => norm(s).toUpperCase();
const noacc = s => s.normalize('NFD').replace(/\p{Diacritic}/gu,'');
const ucase = s => noacc(s).toUpperCase();

// Função para padronizar dados em maiúscula
function padronizarDadosMaiuscula(dados) {
  if (!dados || typeof dados !== 'object') return dados;
  
  const dadosPadronizados = { ...dados };
  
  // Campos que devem ser convertidos para maiúscula
  const camposMaiuscula = [
    'nome', 'nome_completo', 'comum', 'cidade', 'cargo', 'instrumento', 
    'naipe', 'naipe_instrumento', 'classe_organista', 'local_ensaio',
    'NOME COMPLETO', 'COMUM', 'CIDADE', 'CARGO', 'INSTRUMENTO', 
    'NAIPE_INSTRUMENTO', 'CLASSE_ORGANISTA', 'LOCAL_ENSAIO'
  ];
  
  camposMaiuscula.forEach(campo => {
    // Preserva null e undefined, só converte strings
    if (dadosPadronizados[campo] !== null && dadosPadronizados[campo] !== undefined && typeof dadosPadronizados[campo] === 'string') {
      dadosPadronizados[campo] = upper(dadosPadronizados[campo]);
    }
    // Debug específico para instrumento
    if (campo === 'instrumento' || campo === 'INSTRUMENTO') {
      console.log('🔍 DEBUG padronizarDadosMaiuscula - instrumento:', {
        campo,
        valorOriginal: dadosPadronizados[campo],
        tipo: typeof dadosPadronizados[campo],
        valorFinal: dadosPadronizados[campo]
      });
    }
  });
  
  console.log('🔄 Dados padronizados em maiúscula:', dadosPadronizados);
  return dadosPadronizados;
}

// Função para obter o naipe do instrumento (PADRONIZADA)
function getInstrumentNaipe(instrumento) {
  if (!instrumento) return null;
  const instrumentoUpper = upper(instrumento);
  const naipe = INSTRUMENT_NAIPES[instrumentoUpper];
  
  if (naipe) {
    console.log(`🎵 getInstrumentNaipe: ${instrumento} → ${naipe}`);
    return naipe;
  }
  
  // Busca parcial para instrumentos com variações
  for (const [instrumentoKey, naipeValue] of Object.entries(INSTRUMENT_NAIPES)) {
    if (instrumentoUpper.includes(instrumentoKey) || instrumentoKey.includes(instrumentoUpper)) {
      console.log(`🎵 getInstrumentNaipe (parcial): ${instrumento} → ${naipeValue}`);
      return naipeValue;
    }
  }
  
  console.log(`⚠️ getInstrumentNaipe: Naipe não encontrado para ${instrumento}`);
  return null;
}

// Função para normalizar cargos (remove variações de gênero)
function normalizeCargo(cargo) {
  if (!cargo) return '';
  return upper(cargo)
    .replace(/\(A\)/g, '') // Remove (A)
    .replace(/\(O\)/g, '') // Remove (O)
    .replace(/\s+/g, ' ')  // Remove espaços extras
    .trim();
}

// Função para expandir busca de cargos (inclui variações de gênero)
function expandCargoSearch(cargo) {
  if (!cargo) return [];
  
  const cargoNormalizado = normalizeCargo(cargo);
  const variacoes = [cargoNormalizado];
  
  // Se contém "SECRETÁRIO", adiciona variações
  if (cargoNormalizado.includes('SECRETÁRIO')) {
    variacoes.push(cargoNormalizado.replace('SECRETÁRIO', 'SECRETÁRIO (A)'));
    variacoes.push(cargoNormalizado.replace('SECRETÁRIO', 'SECRETÁRIO(A)'));
    // Também adiciona a busca original com acentos
    variacoes.push(cargo.replace('Secretário', 'Secretário (A)'));
    variacoes.push(cargo.replace('Secretário', 'Secretário(A)'));
  }
  
  // Se contém "MÚSICO", adiciona variações
  if (cargoNormalizado.includes('MÚSICO')) {
    variacoes.push(cargoNormalizado.replace('MÚSICO', 'MÚSICO (A)'));
    variacoes.push(cargoNormalizado.replace('MÚSICO', 'MÚSICO(A)'));
    // Também adiciona a busca original com acentos
    variacoes.push(cargo.replace('Músico', 'Músico (A)'));
    variacoes.push(cargo.replace('Músico', 'Músico(A)'));
  }
  
  // Se contém "ORGANISTA", adiciona variações
  if (cargoNormalizado.includes('ORGANISTA')) {
    variacoes.push(cargoNormalizado.replace('ORGANISTA', 'ORGANISTA (A)'));
    variacoes.push(cargoNormalizado.replace('ORGANISTA', 'ORGANISTA(A)'));
    // Também adiciona a busca original com acentos
    variacoes.push(cargo.replace('Organista', 'Organista (A)'));
    variacoes.push(cargo.replace('Organista', 'Organista(A)'));
  }
  
  return [...new Set(variacoes)]; // Remove duplicatas
}


/* ===== SISTEMA DE PESQUISA PARA COMUM ===== */
let comumData = [];
let searchCache = new Map(); // Cache para resultados de pesquisa

function updateComumData() {
  // Atualiza os dados de pesquisa com as comuns atuais
  const comumInput = document.getElementById('comumInput');
  if (comumInput && comumInput.dataset.comumList) {
    try {
      comumData = JSON.parse(comumInput.dataset.comumList);
      // Limpa o cache quando os dados são atualizados
      searchCache.clear();
      console.log('📋 Dados de comum atualizados:', comumData.length, 'itens');
    } catch (e) {
      comumData = [];
      searchCache.clear();
    }
  }
}

function highlightText(text, searchTerm) {
  if (!searchTerm) return text;
  
  const regex = new RegExp(`(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  return text.replace(regex, '<span class="highlight">$1</span>');
}

function searchComuns(searchTerm) {
  if (!searchTerm || searchTerm.length < 1) {
    return comumData.slice(0, 15); // Mostra as primeiras 15 se não há pesquisa
  }
  
  const term = ucase(searchTerm);
  
  // Verifica cache primeiro
  if (searchCache.has(term)) {
    return searchCache.get(term);
  }
  
  // Realiza a pesquisa
  const results = comumData
    .filter(comum => ucase(comum).includes(term))
    .slice(0, 15); // Limita a 15 resultados
  
  // Armazena no cache (limita cache a 50 entradas)
  if (searchCache.size >= 50) {
    const firstKey = searchCache.keys().next().value;
    searchCache.delete(firstKey);
  }
  searchCache.set(term, results);
  
  return results;
}

function showComumResults(results, searchTerm) {
  const dropdown = document.getElementById('comumResults');
  if (!dropdown) return;
  
  // Detecta se é mobile
  const isMobile = /Mobile|Android|iPhone|iPad/.test(navigator.userAgent);
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isAndroid = /Android/.test(navigator.userAgent);
  
  if (results.length === 0) {
    dropdown.innerHTML = '<div class="no-suggestions">Nenhuma comum encontrada</div>';
    dropdown.classList.add('show');
    
    // Adiciona overlay no mobile (só iOS)
    if (isMobile && isIOS) {
      showMobileOverlay();
    }
    return;
  }
  
  dropdown.innerHTML = results.map(comum => `
    <div class="suggestion-item" data-value="${comum}">
      <div style="display: flex; align-items: center; gap: 12px; padding: 4px 0;">
        <i class="fa-solid fa-map-marker-alt" style="color: var(--btn); font-size: 16px; min-width: 20px;"></i>
        <div style="flex: 1; font-weight: 500; font-size: 16px; line-height: 1.3;">${highlightText(comum, searchTerm)}</div>
      </div>
    </div>
  `).join('');
  
  dropdown.classList.add('show');
  
  // Ativa animação da seta
  const searchIcon = document.querySelector('.search-icon');
  if (searchIcon) {
    searchIcon.classList.add('active');
  }
  
  // Otimizações específicas para mobile
  if (isMobile) {
    // Só adiciona overlay no iOS, não no Android
    if (isIOS) {
      showMobileOverlay();
    }
    
    // Ajusta altura máxima baseada no dispositivo e teclado
    const viewportHeight = window.innerHeight;
    const keyboardHeight = getKeyboardHeight();
    const availableHeight = viewportHeight - keyboardHeight - 100; // 100px de margem
    
    if (isIOS) {
      dropdown.style.maxHeight = Math.min(availableHeight, viewportHeight * 0.5) + 'px';
    } else if (isAndroid) {
      dropdown.style.maxHeight = Math.min(availableHeight, viewportHeight * 0.45) + 'px';
      // Melhoria específica para Android - sem overlay
      dropdown.style.pointerEvents = 'auto';
      dropdown.style.touchAction = 'manipulation';
      dropdown.style.zIndex = '10000'; // Z-index mais alto para Android
    } else {
      dropdown.style.maxHeight = Math.min(availableHeight, viewportHeight * 0.4) + 'px';
    }
    
    // Posiciona o dropdown acima do teclado
    if (keyboardHeight > 0) {
      dropdown.style.bottom = (keyboardHeight + 20) + 'px';
    } else {
      dropdown.style.bottom = '20px';
    }
    
    // Adiciona eventos de toque otimizados
    const items = dropdown.querySelectorAll('.suggestion-item');
    items.forEach((item, index) => {
      // Remove eventos anteriores para evitar duplicação
      item.removeEventListener('touchstart', handleTouchStart);
      item.removeEventListener('touchend', handleTouchEnd);
      item.removeEventListener('click', handleItemClick);
      
      // Adiciona novos eventos
      item.addEventListener('touchstart', handleTouchStart, { passive: true });
      item.addEventListener('touchend', handleTouchEnd, { passive: true });
      item.addEventListener('click', handleItemClick);
      
      // Adiciona feedback visual imediato
      item.style.transition = 'background-color 0.1s ease';
    });
    
    // Scroll para o topo dos resultados
    dropdown.scrollTop = 0;
    
    // Foca no primeiro item se há resultados
    if (items.length > 0) {
      setTimeout(() => {
        items[0].scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }, 100);
    }
  }
}

// Funções auxiliares para eventos de toque
function handleTouchStart(e) {
  this.style.backgroundColor = 'rgba(59, 130, 246, 0.15)';
  this.style.transform = 'scale(0.98)';
}

function handleTouchEnd(e) {
  this.style.backgroundColor = '';
  this.style.transform = '';
}

function handleItemClick(e) {
  e.preventDefault();
  e.stopPropagation();
  const value = this.dataset.value;
  selectComumResult(value);
}

// Função para detectar altura do teclado
function getKeyboardHeight() {
  const isMobile = /Mobile|Android|iPhone|iPad/.test(navigator.userAgent);
  if (!isMobile) return 0;
  
  const initialHeight = window.initialViewportHeight || window.innerHeight;
  const currentHeight = window.innerHeight;
  const heightDifference = initialHeight - currentHeight;
  
  // Considera teclado ativo se a altura diminuiu mais de 150px
  return heightDifference > 150 ? heightDifference : 0;
}

// Funções para indicador de pesquisa
function showSearchIndicator() {
  const dropdown = document.getElementById('comumResults');
  if (dropdown) {
    dropdown.innerHTML = '<div class="search-loading"><i class="fa-solid fa-spinner fa-spin"></i> Pesquisando...</div>';
    dropdown.classList.add('show');
  }
}

function hideSearchIndicator() {
  // O indicador é removido quando showComumResults é chamado
}

function hideComumResults() {
  const dropdown = document.getElementById('comumResults');
  if (dropdown) {
    dropdown.classList.remove('show');
  }
  
  // Desativa animação da seta
  const searchIcon = document.querySelector('.search-icon');
  if (searchIcon) {
    searchIcon.classList.remove('active');
  }
  
  // Remove overlay no mobile (sempre remove para garantir)
  hideMobileOverlay();
}

// Funções para gerenciar overlay mobile
function showMobileOverlay() {
  // Detecta se é Android
  const isAndroid = /Android/.test(navigator.userAgent);
  
  // No Android, não cria overlay para evitar problemas
  if (isAndroid) {
    console.log('🤖 Android detectado - overlay desabilitado');
    return;
  }
  
  let overlay = document.getElementById('suggestionsOverlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'suggestionsOverlay';
    overlay.className = 'suggestions-overlay';
    document.body.appendChild(overlay);
    
    // Fecha dropdown ao clicar no overlay (mas não nos itens)
    overlay.addEventListener('click', (e) => {
      // Só fecha se clicou diretamente no overlay, não nos itens
      if (e.target === overlay) {
        hideComumResults();
      }
    });
    
    // Previne que o overlay interfira com os cliques nos itens
    overlay.addEventListener('touchstart', (e) => {
      e.preventDefault();
    }, { passive: false });
  }
  overlay.classList.add('show');
}

function hideMobileOverlay() {
  const overlay = document.getElementById('suggestionsOverlay');
  if (overlay) {
    overlay.classList.remove('show');
  }
  
  // No Android, remove completamente o overlay se existir
  const isAndroid = /Android/.test(navigator.userAgent);
  if (isAndroid && overlay) {
    overlay.remove();
    console.log('🤖 Overlay removido do Android');
  }
}

function selectComumResult(comum) {
  const comumInput = document.getElementById('comumInput');
  if (comumInput) {
    comumInput.value = comum;
    
    // Dispara evento de mudança para atualizar dependências
    const event = new Event('change', { bubbles: true });
    comumInput.dispatchEvent(event);
    
    // No mobile, remove o foco para fechar o teclado
    const isMobile = /Mobile|Android|iPhone|iPad/.test(navigator.userAgent);
    if (isMobile) {
      comumInput.blur();
      
      // Foca no próximo campo após um pequeno delay
      setTimeout(() => {
        const cargoField = document.getElementById('cargo');
        if (cargoField) {
          cargoField.focus();
          // Scroll suave para o campo de cargo
          cargoField.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 200);
    } else {
      // No desktop, foca no próximo campo imediatamente
      const cargoField = document.getElementById('cargo');
      if (cargoField) {
        setTimeout(() => cargoField.focus(), 100);
      }
    }
  }
  
  hideComumResults();
  
  // Log para debug
  console.log('✅ Comum selecionada:', comum);
}

function initComumSearch() {
  const comumInput = document.getElementById('comumInput');
  const comumResults = document.getElementById('comumResults');
  
  if (!comumInput || !comumResults) return;
  
  let searchTimeout;
  let isOpen = false;
  let highlightedIndex = -1;
  
  // Evento de digitação
  comumInput.addEventListener('input', (e) => {
    const searchTerm = e.target.value.trim();
    
    clearTimeout(searchTimeout);
    
    searchTimeout = setTimeout(() => {
      updateComumData();
      const results = searchComuns(searchTerm);
      showComumResults(results, searchTerm);
      isOpen = true;
    }, 100);
  });
  
  // Evento de foco - mostra todas as opções
  comumInput.addEventListener('focus', (e) => {
    if (!isOpen) {
      updateComumData();
      const results = searchComuns('');
      showComumResults(results, '');
      isOpen = true;
    }
  });
  
  // Evento de clique no campo
  comumInput.addEventListener('click', (e) => {
    if (!isOpen) {
      updateComumData();
      const results = searchComuns(comumInput.value.trim());
      showComumResults(results, comumInput.value.trim());
      isOpen = true;
    }
  });
  
  // Evento de clique na seta do dropdown
  const searchIcon = document.querySelector('.search-icon');
  if (searchIcon) {
    searchIcon.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      if (!isOpen) {
        updateComumData();
        const results = searchComuns(comumInput.value.trim());
        showComumResults(results, comumInput.value.trim());
        isOpen = true;
      } else {
        hideComumResults();
        isOpen = false;
      }
    });
  }
  
  // Evento de clique nos resultados
  comumResults.addEventListener('click', (e) => {
    const item = e.target.closest('.suggestion-item');
    if (item) {
      e.preventDefault();
      e.stopPropagation();
      const value = item.dataset.value;
        selectComumResult(value);
        isOpen = false;
    }
  });
  
  // Evento de clique fora para fechar
  document.addEventListener('click', (e) => {
    if (!comumInput.contains(e.target) && !comumResults.contains(e.target)) {
      hideComumResults();
      isOpen = false;
    }
  });
  
  // Navegação por teclado
  comumInput.addEventListener('keydown', (e) => {
    const items = comumResults.querySelectorAll('.suggestion-item');
    
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      highlightedIndex = Math.min(highlightedIndex + 1, items.length - 1);
      updateHighlight(items, highlightedIndex);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      highlightedIndex = Math.max(highlightedIndex - 1, -1);
      updateHighlight(items, highlightedIndex);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (highlightedIndex >= 0 && items[highlightedIndex]) {
        const item = items[highlightedIndex];
        const value = item.dataset.value;
        selectComumResult(value);
        highlightedIndex = -1;
        isOpen = false;
      } else if (items.length > 0) {
        // Se não há item destacado, seleciona o primeiro
        const firstItem = items[0];
        const value = firstItem.dataset.value;
        selectComumResult(value);
        highlightedIndex = -1;
        isOpen = false;
      }
    } else if (e.key === 'Escape') {
      hideComumResults();
        highlightedIndex = -1;
        isOpen = false;
    }
  });
  
  function updateHighlight(items, index) {
    items.forEach((item, i) => {
      item.classList.toggle('highlighted', i === index);
    });
  }
}

/* ===== SISTEMA DE NOTIFICAÇÕES COM FALLBACK ===== */
// 🎨 SISTEMA DE NOTIFICAÇÃO ELEGANTE E MODERNO
function showFastAlert(type, title, message, duration = 2000) {
  // Cria a notificação elegante
  const notification = createElegantNotification(type, title, message, duration);
  
  // Adiciona ao DOM
  document.body.appendChild(notification);
  
  // Posiciona a notificação baseada no número de notificações existentes
  positionNotification(notification);
  
  // Animação de entrada
  requestAnimationFrame(() => {
    notification.classList.add('notification-enter');
  });
  
  // Remove automaticamente
  setTimeout(() => {
    removeNotification(notification);
  }, duration);
}

function positionNotification(notification) {
  const existingNotifications = document.querySelectorAll('.elegant-notification');
  const index = existingNotifications.length;
  
  // Calcula a posição vertical baseada no índice
  const topOffset = 20 + (index * 80); // 80px de espaçamento entre notificações
  
  notification.style.top = `${topOffset}px`;
}

function createElegantNotification(type, title, message, duration) {
  const notification = document.createElement('div');
  notification.className = 'elegant-notification';
  
  const icons = {
    success: '✓',
    error: '✕',
    warning: '⚠',
    info: 'ℹ'
  };
  
  const colors = {
    success: {
      bg: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
      border: '#10b981',
      icon: '#ffffff'
    },
    error: {
      bg: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
      border: '#ef4444',
      icon: '#ffffff'
    },
    warning: {
      bg: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
      border: '#f59e0b',
      icon: '#ffffff'
    },
    info: {
      bg: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
      border: '#3b82f6',
      icon: '#ffffff'
    }
  };
  
  const config = colors[type] || colors.info;
  
  notification.innerHTML = `
    <div class="notification-content">
      <div class="notification-icon" style="background: ${config.bg}; color: ${config.icon}">
        ${icons[type] || icons.info}
      </div>
      <div class="notification-text">
        <div class="notification-title">${title}</div>
        <div class="notification-message">${message}</div>
      </div>
      <button class="notification-close" onclick="removeNotification(this.parentElement.parentElement)">
        ×
      </button>
    </div>
    <div class="notification-progress" style="background: ${config.border}; animation-duration: ${duration}ms"></div>
  `;
  
  // Adiciona evento de clique para fechar
  notification.addEventListener('click', (e) => {
    if (!e.target.classList.contains('notification-close')) {
      removeNotification(notification);
    }
  });
  
  return notification;
}

function removeNotification(notification) {
  if (!notification) return;
  
  notification.classList.add('notification-exit');
  
  setTimeout(() => {
    if (notification.parentNode) {
      notification.parentNode.removeChild(notification);
      // Reposiciona as notificações restantes
      repositionRemainingNotifications();
    }
  }, 300);
}

function repositionRemainingNotifications() {
  const notifications = document.querySelectorAll('.elegant-notification');
  notifications.forEach((notification, index) => {
    const topOffset = 20 + (index * 80);
    notification.style.top = `${topOffset}px`;
  });
}

function removeAllNotifications() {
  const notifications = document.querySelectorAll('.elegant-notification');
  notifications.forEach(removeNotification);
}

function showToast(type, title, message, duration = 4000) {
  // Fallback para alert se SweetAlert2 não estiver disponível
  if (typeof Swal !== 'undefined') {
    const iconMap = {
      success: 'success',
      error: 'error',
      warning: 'warning',
      info: 'info'
    };

    Swal.fire({
      toast: true,
      position: 'top-end',
      icon: iconMap[type] || 'info',
      title: title,
      text: message,
      showConfirmButton: false,
      timer: duration,
      timerProgressBar: true,
      background: 'var(--card)',
      color: 'var(--ink)',
      customClass: {
        popup: 'swal2-toast-custom'
      }
    });
  } else {
    // Fallback para alert nativo
    alert(`${title}: ${message}`);
  }
}

/* ===== ESTILOS CSS ELEGANTES PARA NOTIFICAÇÕES MODERNAS ===== */
const elegantNotificationStyles = `
<style>
.elegant-notification {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 10000;
  min-width: 320px;
  max-width: 400px;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  border-radius: 16px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(255, 255, 255, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.3);
  overflow: hidden;
  transform: translateX(100%);
  opacity: 0;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.elegant-notification.notification-enter {
  transform: translateX(0);
  opacity: 1;
}

.elegant-notification.notification-exit {
  transform: translateX(100%);
  opacity: 0;
}

.notification-content {
  display: flex;
  align-items: center;
  padding: 16px 20px;
  gap: 12px;
}

.notification-icon {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  font-weight: bold;
  flex-shrink: 0;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.notification-text {
  flex: 1;
  min-width: 0;
}

.notification-title {
  font-size: 16px;
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 2px;
  line-height: 1.3;
}

.notification-message {
  font-size: 14px;
  color: #6b7280;
  line-height: 1.4;
}

.notification-close {
  background: none;
  border: none;
  font-size: 20px;
  color: #9ca3af;
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  transition: all 0.2s ease;
  flex-shrink: 0;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.notification-close:hover {
  background: rgba(0, 0, 0, 0.05);
  color: #6b7280;
}

.elegant-notification:hover {
  transform: translateX(-4px);
  box-shadow: 0 25px 50px rgba(0, 0, 0, 0.2), 0 0 0 1px rgba(255, 255, 255, 0.3);
}

.elegant-notification:hover .notification-progress {
  animation-play-state: paused;
}

.notification-progress {
  height: 3px;
  width: 100%;
  transform: scaleX(1);
  transform-origin: left;
  animation: notificationProgress 2s linear forwards;
}

@keyframes notificationProgress {
  from {
    transform: scaleX(1);
  }
  to {
    transform: scaleX(0);
  }
}

/* Modo escuro */
@media (prefers-color-scheme: dark) {
  .elegant-notification {
    background: rgba(31, 41, 55, 0.95);
    border: 1px solid rgba(75, 85, 99, 0.3);
  }
  
  .notification-title {
    color: #f9fafb;
  }
  
  .notification-message {
    color: #d1d5db;
  }
  
  .notification-close {
    color: #9ca3af;
  }
  
  .notification-close:hover {
    background: rgba(255, 255, 255, 0.1);
    color: #d1d5db;
  }
}

/* Responsivo para mobile */
@media (max-width: 768px) {
  .elegant-notification {
    top: 10px;
    right: 10px;
    left: 10px;
    min-width: auto;
    max-width: none;
  }
  
  .notification-content {
    padding: 14px 16px;
  }
  
  .notification-icon {
    width: 36px;
    height: 36px;
    font-size: 16px;
  }
  
  .notification-title {
    font-size: 15px;
  }
  
  .notification-message {
    font-size: 13px;
  }
}

/* Animação de entrada mais suave */
@keyframes slideInRight {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

@keyframes slideOutRight {
  from {
    transform: translateX(0);
    opacity: 1;
  }
  to {
    transform: translateX(100%);
    opacity: 0;
  }
}
</style>
`;

// Injeta os estilos elegantes
if (!document.getElementById('elegant-notification-styles')) {
  const styleElement = document.createElement('div');
  styleElement.id = 'elegant-notification-styles';
  styleElement.innerHTML = elegantNotificationStyles;
  document.head.appendChild(styleElement);
}

/* ===== ESTILOS PARA MODAL - CORES UNIFORMES ===== */
const modalStyles = `
<style>
/* Estilos para o modal - cores uniformes */
#modalNovaComum .modal-content {
  background: var(--card) !important;
  border: 1px solid var(--border) !important;
  color: var(--ink) !important;
}

#modalNovaComum .modal-header {
  background: var(--card) !important;
  border-bottom: 1px solid var(--border) !important;
  color: var(--ink) !important;
}

#modalNovaComum .modal-body {
  background: var(--card) !important;
  color: var(--ink) !important;
}

#modalNovaComum .modal-footer {
  background: var(--card) !important;
  border-top: 1px solid var(--border) !important;
}

/* Campos do modal - cores uniformes */
#modalNovaComum input,
#modalNovaComum select,
#modalNovaComum textarea {
  background: var(--card) !important;
  border: 1px solid var(--border) !important;
  color: var(--ink) !important;
}

#modalNovaComum input:focus,
#modalNovaComum select:focus,
#modalNovaComum textarea:focus {
  background: var(--card) !important;
  border-color: var(--primary) !important;
  color: var(--ink) !important;
  box-shadow: 0 0 0 0.2rem rgba(var(--primary-rgb), 0.25) !important;
}

/* Labels do modal */
#modalNovaComum label {
  color: var(--ink) !important;
}

/* Botões do modal */
#modalNovaComum .btn {
  background: #007bff !important;
  border-color: #007bff !important;
  color: white !important;
}

#modalNovaComum .btn:hover {
  background: #0056b3 !important;
  border-color: #0056b3 !important;
}

#modalNovaComum .btn:focus {
  background: #007bff !important;
  border-color: #007bff !important;
  box-shadow: 0 0 0 0.2rem rgba(0, 123, 255, 0.25) !important;
}

#modalNovaComum .btn-secondary {
  background: var(--secondary) !important;
  border-color: var(--secondary) !important;
  color: var(--ink) !important;
}

#modalNovaComum .btn-secondary:hover {
  background: var(--secondary-hover) !important;
  border-color: var(--secondary-hover) !important;
}

/* Botão Enviar específico - azul igual ao principal */
#modalNovaComum #btnSalvarGS,
#modalNovaComum .btn-primary {
  background: #007bff !important;
  border-color: #007bff !important;
  color: white !important;
}

#modalNovaComum #btnSalvarGS:hover,
#modalNovaComum .btn-primary:hover {
  background: #0056b3 !important;
  border-color: #0056b3 !important;
  color: white !important;
}

#modalNovaComum #btnSalvarGS:focus,
#modalNovaComum .btn-primary:focus {
  background: #007bff !important;
  border-color: #007bff !important;
  box-shadow: 0 0 0 0.2rem rgba(0, 123, 255, 0.25) !important;
}

#modalNovaComum #btnSalvarGS:active,
#modalNovaComum .btn-primary:active {
  background: #004085 !important;
  border-color: #004085 !important;
}

/* Título do modal */
#modalNovaComum .modal-title {
  color: var(--ink) !important;
}

/* Botão de fechar */
#modalNovaComum .btn-close {
  filter: invert(1) !important;
}

/* Dropdown do modal */
#modalNovaComum .dropdown-menu {
  background: var(--card) !important;
  border: 1px solid var(--border) !important;
}

#modalNovaComum .dropdown-item {
  color: var(--ink) !important;
}

#modalNovaComum .dropdown-item:hover {
  background: var(--hover) !important;
  color: var(--ink) !important;
}

/* Form groups */
#modalNovaComum .form-group {
  margin-bottom: 1rem;
}

/* Texto de ajuda */
#modalNovaComum .form-text {
  color: var(--muted) !important;
}

/* Validação */
#modalNovaComum .is-invalid {
  border-color: var(--danger) !important;
}

#modalNovaComum .invalid-feedback {
  color: var(--danger) !important;
}

#modalNovaComum .is-valid {
  border-color: var(--success) !important;
}

#modalNovaComum .valid-feedback {
  color: var(--success) !important;
}
</style>
`;

// Injeta os estilos do modal
if (!document.getElementById('modal-styles')) {
  const modalStyleElement = document.createElement('div');
  modalStyleElement.id = 'modal-styles';
  modalStyleElement.innerHTML = modalStyles;
  document.head.appendChild(modalStyleElement);
}

/* ===== MODO ESCURO ===== */
function initTheme() {
  // Chrome iOS tem problemas com localStorage, usar fallback
  let savedTheme = 'light';
  try {
    savedTheme = localStorage.getItem('theme') || 'light';
  } catch (e) {
    console.warn('⚠️ Chrome iOS: localStorage não disponível para tema, usando light');
  }
  
  const themeToggle = document.getElementById('themeToggle');
  const themeIcon = document.getElementById('themeIcon');
  
  function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    
    // Chrome iOS: tentar salvar no localStorage com fallback
    try {
      localStorage.setItem('theme', theme);
    } catch (e) {
      console.warn('⚠️ Chrome iOS: Não foi possível salvar tema no localStorage');
    }
    
    if (themeIcon) {
      themeIcon.className = theme === 'dark' ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
    }
  }
  
  setTheme(savedTheme);
  
  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      const currentTheme = document.documentElement.getAttribute('data-theme');
      const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
      setTheme(newTheme);
      showToast('info', 'Tema alterado', `Modo ${newTheme === 'dark' ? 'escuro' : 'claro'} ativado`, 2000);
    });
  }
}

function findComumField() {
  return document.querySelector('#comumInput');
}
function findInstrumentField() {
  return document.querySelector('#instrumento');
}
function findCargoField() {
  return document.querySelector('#cargo');
}
function findNomeField() {
  return document.querySelector('#nome');
}
function getSubmitButton() {
  const all = Array.from(document.querySelectorAll('button'));
  const byText = all.find(b => /enviar/i.test((b.textContent || '').trim()));
  if (byText) return byText;
  return document.querySelector('#btnEnviar, button[type="submit"], button[type="button"]');
}


/* ===== CACHE OFFLINE ===== */
const CACHE_KEYS = {
  COMUNS: 'cache_comuns',
  INSTRUMENTOS: 'cache_instrumentos',
  CARGOS: 'cache_cargos',
  NOMES: 'cache_nomes',
  LAST_UPDATE: 'cache_last_update'
};

function getCacheKey(key, params = {}) {
  return `${key}_${JSON.stringify(params)}`;
}

function setCache(key, data, ttl = 24 * 60 * 60 * 1000) {
  const cacheData = {
    data,
    timestamp: Date.now(),
    ttl
  };
  localStorage.setItem(key, JSON.stringify(cacheData));
}

function getCache(key) {
  try {
    const cached = localStorage.getItem(key);
    if (!cached) return null;
    
    const { data, timestamp, ttl } = JSON.parse(cached);
    const now = Date.now();
    
    if (now - timestamp > ttl) {
      localStorage.removeItem(key);
      return null;
    }
    
    return data;
  } catch (e) {
    localStorage.removeItem(key);
    return null;
  }
}

function clearCache() {
  Object.values(CACHE_KEYS).forEach(key => {
    localStorage.removeItem(key);
  });
  Object.keys(localStorage).forEach(key => {
    if (key.startsWith('cache_')) {
      localStorage.removeItem(key);
    }
  });
}

/* ===== INDICADOR DE CONEXÃO ===== */
function setStatus(ok, msg){
  const statusIcon = document.getElementById('statusIcon');
  const statusText = document.getElementById('statusText');
  const connectionStatus = document.getElementById('connectionStatus');
  
  if (statusIcon && statusText && connectionStatus) {
    if (ok) {
      statusIcon.className = 'fa-solid fa-wifi status-icon online';
      statusText.textContent = 'Online';
      connectionStatus.className = 'connection-status online';
      connectionStatus.title = 'Conectado ao Supabase';
    } else {
      statusIcon.className = 'fa-solid fa-wifi-slash status-icon offline';
      statusText.textContent = 'Offline';
      connectionStatus.className = 'connection-status offline';
      connectionStatus.title = 'Sem conexão - Modo offline';
    }
  }
}

// 🚀 FUNÇÃO OTIMIZADA: Verificação ultra-rápida de conectividade
async function checkSupabaseConnection(){
  try {
    // Verificação instantânea
    if (!navigator.onLine) {
      setStatus(false, 'Offline');
      return false;
    }
    
    // Se Supabase já está carregado, testa com timeout
    if (supabaseLoaded && sb) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2000); // 2 segundos timeout
        
        const { error } = await sb.from(TABLE_PRESENCAS).select('uuid').limit(1);
        clearTimeout(timeoutId);
        
        if (!error) {
          setStatus(true, 'Online');
          return true;
        }
      } catch (e) {
        // Continua para inicialização
      }
    }
    
    // Inicializa Supabase se necessário
    if (!supabaseLoaded || !sb) {
      await initSupabase();
    }
    
    // Teste final
    if (supabaseLoaded && sb) {
      const { error } = await sb.from(TABLE_PRESENCAS).select('uuid').limit(1);
      if (!error) {
        setStatus(true, 'Online');
        return true;
      }
    }
    
    setStatus(false, 'Offline');
    return false;
  } catch (e) {
    setStatus(false, 'Offline');
    return false;
  }
}

// Função para testar conectividade real com timeout
async function testRealConnectivity() {
  try {
    // Testa com um endpoint simples e rápido
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 segundos timeout
    
    const response = await fetch('https://www.google.com/favicon.ico', {
      method: 'HEAD',
      mode: 'no-cors',
      signal: controller.signal,
      cache: 'no-cache'
    });
    
    clearTimeout(timeoutId);
    console.log('✅ Conectividade real confirmada');
    return true;
    
  } catch (error) {
    console.log('❌ Sem conectividade real:', error.message);
    return false;
  }
}

/* ===== CARREGAR COMUNS (do catálogo) ===== */
async function loadComunsFromCatalog(){
  console.log('📚 Carregando comuns do catálogo...');
  console.log('📚 supabaseLoaded:', supabaseLoaded);
  console.log('📚 sb disponível:', !!sb);
  console.log('📚 navigator.onLine:', navigator.onLine);
  
  const input = findComumField();
  if (!input) {
    console.error('❌ Campo de comum não encontrado');
    return;
  }

  // Verifica se está offline ou Supabase não disponível
  const isOffline = !navigator.onLine || !supabaseLoaded || !sb;
  
  if (isOffline) {
    console.log('📵 Modo offline detectado - carregando comuns do cache');
    
    // Tenta carregar do cache primeiro
      const cachedComuns = getCache(CACHE_KEYS.COMUNS);
    if (cachedComuns && cachedComuns.length > 0) {
        populateComunsInput(input, cachedComuns);
      showToast('info', 'Modo offline', `Comuns carregadas do cache (${cachedComuns.length})`, 2000);
        return;
      }
      
      // Dados padrão como último recurso
      const defaultComuns = [
        'Apache', 'Aguassaí', 'Caucaia do Alto', 'Cotia', 'Itapevi', 'Jandira', 
        'Vargem Grande Paulista', 'Fazendinha', 'Pirapora', 'Jardim Miranda',
      'Vila São Francisco', 'Granja Viana', 'Embu das Artes', 'Taboão da Serra',
      'Central', 'Alphaville', 'Alto da Colina', 'Alto do Bela Vista', 'Alto do Paulista'
      ];
      populateComunsInput(input, defaultComuns);
    showToast('info', 'Modo offline', 'Usando lista padrão de comuns', 2000);
      return;
  }

  try {
    // Sempre tenta carregar do Supabase primeiro
    console.log('📚 Tentando carregar comuns do Supabase...');
    console.log('📚 TABLE_CATALOGO:', TABLE_CATALOGO);
    console.log('📚 COL_COMUM:', COL_COMUM);
    
    const { data, error } = await sb
      .from(TABLE_CATALOGO)
      .select(COL_COMUM)
      .eq('ativo', true);

    if (error) { 
      console.error('loadComunsFromCatalog', error); 
      // Se der erro, tenta usar cache
      const cachedComuns = getCache(CACHE_KEYS.COMUNS);
      if (cachedComuns) {
        populateComunsInput(input, cachedComuns);
        showToast('warning', 'Erro de conexão', 'Usando dados em cache', 3000);
        return;
      }
      showToast('error', 'Erro ao carregar', 'Não foi possível carregar as comuns', 3000);
      return; 
    }

    console.log('📚 Dados recebidos do Supabase:', data);
    
    const valores = Array.from(new Set((data||[])
      .map(r => norm(r[COL_COMUM]))
      .filter(Boolean)))
      .map(s => s.toLowerCase().replace(/(^.|[\s\-'.][a-z])/g, m => m.toUpperCase()))
      .sort((a,b)=>a.localeCompare(b,'pt-BR'));

    console.log('📚 Comuns processadas:', valores);

    // Salva no cache para uso offline
    setCache(CACHE_KEYS.COMUNS, valores);
    populateComunsInput(input, valores);
    showToast('success', 'Dados atualizados', 'Comuns carregadas com sucesso', 2000);
  } catch (e) {
    console.error('❌ Erro geral ao carregar comuns:', e);
    // Em caso de erro, tenta usar cache
    const cachedComuns = getCache(CACHE_KEYS.COMUNS);
    if (cachedComuns) {
      console.log('📚 Usando comuns do cache devido ao erro geral');
      populateComunsInput(input, cachedComuns);
      showToast('warning', 'Erro de conexão', 'Usando dados em cache', 3000);
      return;
    }
    showToast('error', 'Erro de conexão', 'Verifique sua conexão com a internet', 3000);
  }
}

function populateComunsInput(input, valores) {
  // Armazena os dados no dataset para o sistema de pesquisa
  input.dataset.comumList = JSON.stringify(valores);
  
  // Atualiza dados de pesquisa
  updateComumData();
}

/* ===== CONTROLE DE VISIBILIDADE DO INSTRUMENTO ===== */
function toggleInstrumentFieldVisibility() {
  const cargoEl = findCargoField();
  const instrumentoEl = findInstrumentField();
  
  if (!cargoEl || !instrumentoEl) return;
  
  const cargo = cargoEl.value.trim();
  const cargoUP = ucase(cargo);
  
  // Cargos que não precisam de instrumento (não tocam) - usando versão sem acentos
  const cargosSemInstrumento = [
    'IRMANDADE',     // Irmandade
    'ANCIAO',        // Ancião
    'DIACONO',       // Diácono
    'COOPERADOR DO OFICIO',  // Cooperador do Ofício
    'COOPERADOR DE JOVENS',  // Cooperador de Jovens
    'PORTEIRO (A)',  // Porteiro (a)
    'BOMBEIRO (A)',  // Bombeiro (a)
    'MEDICO (A)',    // Médico (a)
    'ENFERMEIRO (A)' // Enfermeiro (a)
  ];
  
  const deveOcultarInstrumento = cargosSemInstrumento.includes(cargoUP);
  const isOrganista = cargoUP === 'ORGANISTA';
  const isExaminadora = cargoUP === 'EXAMINADORA';
  const isInstrutor = cargoUP === 'INSTRUTOR' || cargoUP === 'INSTRUTORA';
  const isSecretariaMusica = cargo.toLowerCase().includes('secretária') && cargo.toLowerCase().includes('música');
  const isOrganistaOuRelacionado = isOrganista || isExaminadora || isSecretariaMusica; // Removido isInstrutor
  
  // Encontra o container do campo instrumento
  const instrumentoContainer = instrumentoEl.closest('.mb-3');
  
  if (deveOcultarInstrumento) {
    // Oculta o campo instrumento para cargos que não tocam
    if (instrumentoContainer) {
      instrumentoContainer.style.display = 'none';
    }
    // Limpa o valor do instrumento
    instrumentoEl.value = '';
  } else if (isOrganistaOuRelacionado) {
    // Para Organista ou Examinadora: oculta o campo e preenche automaticamente com "ÓRGÃO"
    if (instrumentoContainer) {
      instrumentoContainer.style.display = 'none';
    }
    // Preenche automaticamente com "ÓRGÃO"
    instrumentoEl.value = 'ÓRGÃO';
    console.log(`🎹 ${cargo} detectado - Instrumento preenchido automaticamente: ÓRGÃO`);
    
    // Carrega os nomes das organistas da comum selecionada
    setTimeout(() => {
      console.log('🎹 Carregando nomes das organistas...');
      loadNomes();
    }, 100);
  } else {
    // Mostra o campo instrumento para outros cargos
    if (instrumentoContainer) {
      instrumentoContainer.style.display = 'block';
    }
  }
}

/* ===== INSTRUMENTOS E CARGOS (fixos) ===== */
function loadInstrumentosFixed() {
  const sel = findInstrumentField();
  if (!sel) return;
  
  // Limpa o cache de instrumentos para forçar atualização com ÓRGÃO
  console.log('🧹 Limpando cache de instrumentos para incluir ÓRGÃO...');
  localStorage.removeItem(CACHE_KEYS.INSTRUMENTOS);
  
  const items = INSTRUMENTS_FIXED.slice();
    setCache(CACHE_KEYS.INSTRUMENTOS, items);
  console.log('🎵 Instrumentos carregados:', items.length, 'incluindo ÓRGÃO:', items.includes('ÓRGÃO'));

  if (sel.tagName === 'SELECT') {
    sel.innerHTML =
      '<option value="">Selecione uma opção</option>' +
      items.map(v => `<option value="${v}">${v}</option>`).join('');
  } else {
    let dl = document.getElementById('dlInstrumentos');
    if (!dl) { dl = document.createElement('datalist'); dl.id = 'dlInstrumentos'; document.body.appendChild(dl); }
    dl.innerHTML = items.map(v => `<option value="${v}">`).join('');
    sel.setAttribute('list', 'dlInstrumentos');
  }
  
}

function loadCargosFixed() {
  const cargoEl = findCargoField();
  if (!cargoEl) return;
  
  // Limpa o cache de cargos para forçar atualização
  console.log('🧹 Limpando cache de cargos...');
  localStorage.removeItem(CACHE_KEYS.CARGOS);
  
  const items = CARGOS_FIXED.slice();
    setCache(CACHE_KEYS.CARGOS, items);
  console.log('👔 Cargos carregados:', items.length, 'cargos disponíveis:', items);
  
  if (cargoEl.tagName === 'SELECT') {
    cargoEl.innerHTML = '<option value="">Selecione o cargo…</option>' +
      items.map(v => `<option value="${v}">${v}</option>`).join('');
  }
}

// 🎯 FUNÇÃO ESPECÍFICA PARA MODAL: Carrega todos os cargos
function loadCargosCompletosModal() {
  const modalCargoEl = document.querySelector('#modalCargo, [name="modalCargo"], #cargoModal');
  if (!modalCargoEl) {
    console.log('⚠️ Campo de cargo do modal não encontrado');
    return;
  }
  
  console.log('🎯 Carregando cargos completos para modal...');
  
  // Mantém a ordem original dos cargos (cargos musicais primeiro)
  const cargosOrdenados = CARGOS_COMPLETOS_MODAL.slice();
  
  if (modalCargoEl.tagName === 'SELECT') {
    modalCargoEl.innerHTML = '<option value="">Selecione o cargo…</option>' +
      cargosOrdenados.map(v => `<option value="${v}">${v}</option>`).join('');
  }
  
  console.log('✅ Cargos completos carregados no modal:', cargosOrdenados.length, 'cargos');
}

/* ===== CACHE OFFLINE ===== */
function loadNomesFromCache(comumVal, instVal, cargoVal, cargoUP, precisaInst) {
  try {
    console.log('🔍 Buscando dados no cache offline...');
    
    // Busca dados em diferentes chaves de cache
    const cacheKeys = [
      'cache_nomes_all', // Cache geral de todos os nomes
      'cache_nomes_' + comumVal.toLowerCase().replace(/\s+/g, '_'),
      'cache_nomes_' + cargoVal.toLowerCase().replace(/\s+/g, '_'),
      'cache_nomes_' + instVal.toLowerCase().replace(/\s+/g, '_')
    ];
    
    let allCachedData = [];
    
    // Coleta dados de todas as chaves de cache
    cacheKeys.forEach(key => {
      const cached = localStorage.getItem(key);
      if (cached) {
        try {
          const data = JSON.parse(cached);
          if (Array.isArray(data)) {
            allCachedData = allCachedData.concat(data);
          }
        } catch (e) {
          console.warn('⚠️ Erro ao parsear cache:', key, e.message);
        }
      }
    });
    
    if (allCachedData.length === 0) {
      console.log('📭 Nenhum dado encontrado no cache');
      return [];
    }
    
    // Remove duplicatas
    const uniqueData = allCachedData.filter((item, index, self) => 
      index === self.findIndex(t => t.nome === item.nome && t.comum === item.comum)
    );
    
    console.log('📊 Dados únicos no cache:', uniqueData.length);
    
    // Filtra dados baseado nos critérios
    const filtered = uniqueData.filter(r => {
      const comumR = upper(r[COL_COMUM] || '');
      const cargoR = upper(r.cargo || '');
      const instR = upper(r.instrumento || '');
      const comumBusca = upper(comumVal);
      
      // Filtro por comum
      if (comumVal && !comumR.includes(comumBusca)) {
        return false;
      }
      
      // Filtro por cargo
      if (cargoVal) {
        if (cargoUP === 'ORGANISTA') {
          // Para organista, busca por instrumento ÓRGÃO
          return instR.includes('ÓRGÃO');
        } else if (cargoUP === 'INSTRUTOR') {
          // Para instrutor, busca por instrumento específico
          const instBusca = upper(instVal);
          return cargoR.includes('INSTRUTOR') && instR.includes(instBusca);
        } else if (precisaInst) {
          // Para músicos, precisa de instrumento
          const instBusca = upper(instVal);
          return cargoR.includes('MÚSICO') && instR.includes(instBusca);
        } else {
          // Outros cargos
          const cargoBusca = upper(cargoVal);
          return cargoR.includes(cargoBusca);
        }
      }
      
      return true;
    });
    
    console.log('✅ Dados filtrados do cache:', filtered.length);
    return filtered;
    
  } catch (error) {
    console.error('❌ Erro ao carregar cache offline:', error);
    return [];
  }
}

function saveNomesToCache(data, comumVal, instVal, cargoVal) {
  try {
    console.log('💾 Salvando dados no cache offline...');
    
    // Salva cache geral
    const existingAll = JSON.parse(localStorage.getItem('cache_nomes_all') || '[]');
    const combinedAll = [...existingAll, ...data];
    const uniqueAll = combinedAll.filter((item, index, self) => 
      index === self.findIndex(t => t.nome === item.nome && t.comum === item.comum)
    );
    localStorage.setItem('cache_nomes_all', JSON.stringify(uniqueAll));
    
    // Salva cache específico por comum
    if (comumVal) {
      const key = 'cache_nomes_' + comumVal.toLowerCase().replace(/\s+/g, '_');
      localStorage.setItem(key, JSON.stringify(data));
    }
    
    // Salva cache específico por cargo
    if (cargoVal) {
      const key = 'cache_nomes_' + cargoVal.toLowerCase().replace(/\s+/g, '_');
      localStorage.setItem(key, JSON.stringify(data));
    }
    
    // Salva cache específico por instrumento
    if (instVal) {
      const key = 'cache_nomes_' + instVal.toLowerCase().replace(/\s+/g, '_');
      localStorage.setItem(key, JSON.stringify(data));
    }
    
    console.log('✅ Cache offline atualizado com', data.length, 'nomes');
    
  } catch (error) {
    console.error('❌ Erro ao salvar cache offline:', error);
  }
}

/* ===== CONSULTA DE NOMES (Comum + Instrumento + Cargo) ===== */
async function loadNomes() {
  try {
    // Iniciando loadNomes (logs removidos para performance)
    
    const comumEl = findComumField();
    const instEl  = findInstrumentField();
    const cargoEl = findCargoField();
    const nomeEl  = findNomeField();
    
    if (!comumEl || !instEl || !cargoEl || !nomeEl) {
      console.error('❌ Elementos não encontrados:', { comumEl: !!comumEl, instEl: !!instEl, cargoEl: !!cargoEl, nomeEl: !!nomeEl });
      return;
    }

    const comumVal = norm(comumEl.value);
    const instVal  = upper(instEl.value);
    const cargoVal = norm(cargoEl.value);
    const cargoUP  = ucase(cargoVal);
    const precisaInst = ['MUSICO','MUSICO(A)','MÚSICO','MÚSICO(A)'].includes(cargoUP) || 
                        ['MÚSICO','MÚSICO(A)'].includes(upper(cargoVal)) ||
                        cargoUP === 'ORGANISTA' ||
                        cargoUP === 'EXAMINADORA' ||
                        cargoUP === 'INSTRUTOR' ||
                        (cargoVal.toLowerCase().includes('secretária') && cargoVal.toLowerCase().includes('música'));

    const cargoNormalizado = normalizeCargo(cargoVal);
    const variacoesCargo = expandCargoSearch(cargoVal);
    // Valores coletados (logs removidos para performance)

    // Validação rápida: exige comum + cargo + instrumento (quando necessário)
    const precisaInstrumento = (precisaInst || cargoUP === 'ORGANISTA') && !instVal;
    const condicaoFalhou = !comumVal || !cargoVal || precisaInstrumento;
    
    if (condicaoFalhou) {
      // Limpa o campo de nomes rapidamente se não tiver os campos obrigatórios
      if (nomeEl.tagName === 'SELECT') {
        nomeEl.innerHTML = '<option value="">Selecione um nome da lista (ou digite, se offline)</option>';
      } else {
        nomeEl.placeholder = 'Selecione um nome da lista (ou digite, se offline)';
        nomeEl.removeAttribute('list');
      }
      return;
    }
    
    // Campos obrigatórios preenchidos, prosseguindo com carregamento
    
    // Verifica se não há conexão de internet
    if (!navigator.onLine) {
      console.log('📵 Sem conexão de internet, tentando carregar do cache offline...');
      
      // Tenta carregar dados do cache offline primeiro
      try {
        const cachedData = loadNomesFromCache(comumVal, instVal, cargoVal, cargoUP, precisaInst);
        if (cachedData.length > 0) {
          console.log('✅ Dados carregados do cache offline:', cachedData.length);
          populateNomesInput(nomeEl, cachedData);
          showToast('info', 'Dados carregados offline', `Encontrados ${cachedData.length} nomes no cache`, 3000);
          return;
        }
      } catch (cacheError) {
        console.error('❌ Erro ao carregar cache offline:', cacheError);
      }
      
      // Se não conseguiu carregar do cache, permite digitação manual
      console.log('📝 Permitindo digitação manual offline...');
      populateNomesInput(nomeEl, []);
      showToast('info', 'Sem internet', 'Digite o nome completo para cadastrar offline', 2000);
      return;
    }

    // Tenta carregar do cache primeiro
    const cacheKey = getCacheKey(CACHE_KEYS.NOMES, { comumVal, instVal, cargoVal });
    const cachedNomes = getCache(cacheKey);
    console.log('🔍 Verificando cache:', { cacheKey, cachedNomes: cachedNomes?.length || 0, isArray: Array.isArray(cachedNomes) });
    if (cachedNomes && Array.isArray(cachedNomes) && cachedNomes.length > 0) {
      // Verifica se o cache contém dados incorretos para Secretário da Música
      if (cargoVal.toLowerCase().includes('secretário') && cargoVal.toLowerCase().includes('música')) {
        // Se há mais de 1 nome no cache para Secretário da Música, pode estar incorreto
        if (cachedNomes.length > 1) {
          console.log('🗑️ Cache suspeito para Secretário da Música (múltiplos nomes), limpando...');
          localStorage.removeItem(cacheKey);
        } else {
          console.log('✅ Usando dados do cache:', cachedNomes);
      populateNomesInput(nomeEl, cachedNomes);
      return;
        }
      } else {
        console.log('✅ Usando dados do cache:', cachedNomes);
        populateNomesInput(nomeEl, cachedNomes);
        return;
      }
    } else if (cachedNomes && Array.isArray(cachedNomes) && cachedNomes.length === 0) {
      console.log('🗑️ Cache vazio encontrado, limpando e fazendo nova consulta...');
      // Remove o cache vazio para forçar nova consulta
      localStorage.removeItem(cacheKey);
    }

    // Verifica se está offline ou Supabase não disponível
    const isOffline = !navigator.onLine || !supabaseLoaded || !sb;
    
    if (isOffline) {
      console.log('📵 Modo offline detectado - carregando dados do cache local');
      
      // Tenta carregar dados do cache local
      const cachedData = loadNomesFromCache(comumVal, instVal, cargoVal, cargoUP, precisaInst);
      
      if (cachedData && cachedData.length > 0) {
        console.log('✅ Dados encontrados no cache:', cachedData.length, 'nomes');
        populateNomesInput(nomeEl, cachedData);
        window.nomesData = cachedData;
        showToast('info', 'Modo offline', `Carregados ${cachedData.length} nomes do cache`, 2000);
        return;
      } else {
        console.log('📝 Nenhum dado no cache - permitindo digitação livre');
        // Permite digitação offline - limpa o campo e permite entrada livre
        if (nomeEl.tagName === 'SELECT') {
          nomeEl.innerHTML = '<option value="">Digite o nome completo (sem internet)</option>';
        } else {
          nomeEl.placeholder = 'Digite o nome completo (sem internet)';
          nomeEl.removeAttribute('list'); // Remove datalist para permitir digitação livre
        }
        window.nomesData = [];
        showToast('info', 'Modo offline', 'Digite o nome completo para cadastrar', 2000);
        return;
      }
    }

    console.log('✅ Supabase carregado, fazendo consulta...');
    
    // Limpa todo o cache de nomes para forçar consulta limpa
    console.log('🧹 Limpando cache de nomes para consulta limpa...');
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('cache_nomes_')) {
        localStorage.removeItem(key);
      }
    });

    console.log('🔍 Fazendo consulta ao Supabase...');
    const SELECT_COLS = `nome,instrumento,${COL_COMUM},cargo,ativo,nivel`;
    console.log('📋 Colunas selecionadas:', SELECT_COLS);
    console.log('🔍 Parâmetros da consulta:', { comumVal, instVal, cargoVal, cargoUP, precisaInst });
    
    // TESTE DIRETO - Verificar se o campo nivel existe e tem dados
    console.log('🧪 TESTE DIRETO - Verificando campo nivel...');
    try {
      const testNivel = await sb
        .from(TABLE_CATALOGO)
        .select('nome, cargo, nivel')
        .ilike('cargo', '%ORGANISTA%')
        .limit(1);
      
      console.log('🧪 TESTE DIRETO - Resultado:', {
        sucesso: !testNivel.error,
        erro: testNivel.error?.message || 'nenhum',
        dados: testNivel.data,
        primeiroRegistro: testNivel.data?.[0]
      });
    } catch (e) {
      console.log('🧪 TESTE DIRETO - Erro na consulta:', e.message);
    }

    let q = sb.from(TABLE_CATALOGO)
      .select(SELECT_COLS)
      .ilike(COL_COMUM, `%${comumVal}%`)
      .eq('ativo', true);

    // LÓGICA CORRIGIDA: Se tem cargo específico (não "Músico"), busca por cargo. Senão, busca por instrumento.
    console.log('👔 Buscando - Cargo:', cargoVal, 'Instrumento:', instVal);
    
    // Verifica se é um cargo específico - TODOS os cargos são específicos agora
    const isCargoEspecifico = cargoVal && cargoVal.trim() !== '';
    
    console.log('🔍 DEBUG Cargo Específico:', {
      cargoVal,
      isCargoEspecifico,
      isMúsico: cargoVal.toLowerCase().includes('músico'),
      isOrganista: cargoVal.toLowerCase().includes('organista')
    });
    
    // LÓGICA CORRIGIDA: Para Músico, busca por cargo + instrumento. Para outros cargos, busca apenas por cargo.
    const isSecretarioMusica = (cargoVal.toLowerCase().includes('secretário') || cargoVal.toLowerCase().includes('secretária')) && 
                             (cargoVal.toLowerCase().includes('música') || cargoVal.toLowerCase().includes('musica'));
    
    const isMusico = cargoVal.toLowerCase().includes('músico') && 
                    !cargoVal.toLowerCase().includes('secretário') && 
                    !cargoVal.toLowerCase().includes('secretária');
    
    console.log('🔍 DEBUG Lógica de Busca:', {
      cargoVal,
      instVal,
      isSecretarioMusica,
      isMusico,
      isOrganista: cargoVal.toLowerCase().includes('organista')
    });
    
    if (isSecretarioMusica) {
      // Secretário da Música: busca apenas por cargo
      console.log('🎵 Busca específica para Secretário da Música - Query:', '%SECRETÁRIO (A) DA MÚSICA%');
      q = q.ilike('cargo', '%SECRETÁRIO (A) DA MÚSICA%');
    } else if (isMusico && instVal && instVal.trim() !== '') {
      // Músico + Instrumento: busca por instrumento para mostrar todos que tocam esse instrumento (seguindo lógica das organistas)
      console.log('🎵 Busca para Músico + Instrumento (seguindo lógica das organistas):', cargoVal, '+', instVal);
      q = q.ilike('instrumento', `%${instVal}%`);
    } else if (isMusico) {
      // Músico sem instrumento: busca apenas por cargo
      console.log('🎵 Busca para Músico sem instrumento:', cargoVal);
      q = q.ilike('cargo', '%MÚSICO%').not('cargo', 'ilike', '%SECRETÁRIO%');
    } else if (cargoVal.toLowerCase().includes('organista')) {
      // Organista: busca por instrumento ÓRGÃO para mostrar todas as organistas (incluindo instrutoras e examinadoras)
      console.log('🎹 Busca para Organista - buscando por instrumento ÓRGÃO:', cargoVal);
      q = q.ilike('instrumento', '%ÓRGÃO%');
    } else if (cargoVal.toLowerCase().includes('instrutor')) {
      // Instrutor: busca por instrumento específico para mostrar apenas instrutores desse instrumento
      console.log('🎓 Busca para Instrutor - buscando por instrumento:', instVal);
      q = q.ilike('cargo', '%INSTRUTOR%')
           .ilike('instrumento', `%${instVal}%`);
    } else {
      // Outros cargos: busca apenas por cargo
      console.log('👔 Busca normal por cargo:', cargoVal);
      q = q.ilike('cargo', `%${cargoVal}%`);
    }

    q = q.order('nome', { ascending: true });

    console.log('🔍 Executando consulta principal...');
    console.log('🔍 Query final:', q);
    let { data, error } = await q;
    
    console.log('🔍 Resultado da consulta principal:', {
      sucesso: !error,
      erro: error?.message || 'nenhum',
      totalRegistros: data?.length || 0,
      primeiroRegistro: data?.[0],
      todosOsCampos: data?.[0] ? Object.keys(data[0]) : []
    });
    console.log('📊 Resultado da consulta:', {
      data: data?.length || 0, 
      error: error?.message || 'nenhum',
      dados: data?.slice(0, 3) // Mostra os primeiros 3 registros para debug
    });
    
    // Log específico para debug do Secretário da Música
    if (data && data.length > 0) {
      console.log('🔍 DEBUG - Todos os registros retornados:');
      data.forEach((r, index) => {
        console.log(`${index + 1}. Nome: ${r.nome}, Cargo: ${r.cargo}, Instrumento: ${r.instrumento}, Comum: ${r[COL_COMUM]}`);
      });
      
      // Log específico para verificar se o filtro por instrumento está funcionando
      if (isMusico && instVal && instVal.trim() !== '') {
        console.log('🎵 VERIFICAÇÃO - Filtro por instrumento aplicado:', instVal);
        const instrumentosUnicos = [...new Set(data.map(r => r.instrumento))];
        console.log('🎵 VERIFICAÇÃO - Instrumentos únicos encontrados:', instrumentosUnicos);
      }
      
      // Log específico para instrutores
      if (cargoVal.toLowerCase().includes('instrutor') && instVal && instVal.trim() !== '') {
        console.log('🎓 VERIFICAÇÃO - Filtro por instrutor + instrumento aplicado:', cargoVal, '+', instVal);
        const instrutoresEncontrados = data.filter(r => r.cargo && r.cargo.toUpperCase().includes('INSTRUTOR'));
        const instrumentosInstrutores = [...new Set(instrutoresEncontrados.map(r => r.instrumento))];
        console.log('🎓 VERIFICAÇÃO - Instrutores encontrados:', instrutoresEncontrados.length);
        console.log('🎓 VERIFICAÇÃO - Instrumentos dos instrutores:', instrumentosInstrutores);
        console.log('🎓 VERIFICAÇÃO - Nomes dos instrutores:', instrutoresEncontrados.map(r => `${r.nome} (${r.instrumento})`));
        
        const violinistas = data.filter(r => r.instrumento && r.instrumento.toUpperCase().includes('VIOLINO'));
        console.log('🎵 VERIFICAÇÃO - Violinistas encontrados:', violinistas.length);
      }
    }
    
    
    if (error) {
      console.error('❌ Erro na consulta nomes:', error, {comumVal, instVal, cargoVal});
    }

    if (error || !data || data.length === 0) {
      console.log('🔄 Consulta principal retornou vazio, tentando busca ampla...');
      
      // Primeiro, vamos testar uma consulta simples para ver se há dados
      console.log('🧪 Testando consulta simples...');
      const testQuery = await sb
        .from(TABLE_CATALOGO)
        .select('nome, cargo, comum')
        .ilike('comum', `%${comumVal}%`)
        .limit(5);
      
      console.log('🧪 Resultado do teste:', { 
        testData: testQuery.data?.length || 0, 
        testError: testQuery.error?.message || 'nenhum',
        testDados: testQuery.data?.slice(0, 2)
      });

      // Teste específico da consulta para Secretário (A) da Música
      const isSecretarioMusica = (cargoVal.toLowerCase().includes('secretário') || cargoVal.toLowerCase().includes('secretária')) && 
                               (cargoVal.toLowerCase().includes('música') || cargoVal.toLowerCase().includes('musica'));
      
      if (isSecretarioMusica) {
        console.log('🧪 Testando consulta para SECRETÁRIO (A) DA MÚSICA...');
        const testORQuery = await sb
          .from(TABLE_CATALOGO)
          .select('nome, cargo, comum')
          .ilike('comum', `%${comumVal}%`)
          .ilike('cargo', '%SECRETÁRIO (A) DA MÚSICA%')
          .limit(5);
        
        console.log('🧪 Resultado do teste SECRETÁRIO (A):', { 
          testORData: testORQuery.data?.length || 0, 
          testORError: testORQuery.error?.message || 'nenhum',
          testORDados: testORQuery.data
        });
      }
      
      // Teste específico para verificar se o campo nivel existe na tabela
      if (cargoUP === 'ORGANISTA') {
        console.log('🧪 Testando se campo nivel existe na tabela...');
        const testNivelQuery = await sb
          .from(TABLE_CATALOGO)
          .select('nome, cargo, nivel')
          .ilike('cargo', '%ORGANISTA%')
          .limit(3);
        
        console.log('🧪 Resultado do teste NIVEL:', { 
          testNivelData: testNivelQuery.data?.length || 0, 
          testNivelError: testNivelQuery.error?.message || 'nenhum',
          testNivelDados: testNivelQuery.data
        });
      }

      // Diagnóstico completo - vamos ver TODOS os dados para a comum atual
      console.log('🔍 DIAGNÓSTICO COMPLETO - Todos os dados para', comumVal);
      const diagnosticQuery = await sb
        .from(TABLE_CATALOGO)
        .select('nome, cargo, comum, ativo')
        .ilike('comum', `%${comumVal}%`);
      
      console.log('🔍 Dados encontrados para', comumVal, ':', {
        total: diagnosticQuery.data?.length || 0,
        error: diagnosticQuery.error?.message || 'nenhum',
        dados: diagnosticQuery.data
      });

      // Vamos também verificar se existe algum "SECRETÁRIO (A)" em qualquer lugar
      console.log('🔍 DIAGNÓSTICO - Buscando qualquer SECRETÁRIO (A):');
      const secretarioQuery = await sb
        .from(TABLE_CATALOGO)
        .select('nome, cargo, comum')
        .ilike('cargo', '%SECRETÁRIO (A)%')
        .limit(10);
      
      console.log('🔍 Secretários (A) encontrados:', {
        total: secretarioQuery.data?.length || 0,
        error: secretarioQuery.error?.message || 'nenhum',
        dados: secretarioQuery.data
      });

      // Vamos verificar se existe a comum atual em qualquer lugar
      console.log('🔍 DIAGNÓSTICO - Buscando qualquer', comumVal);
      const comumQuery = await sb
        .from(TABLE_CATALOGO)
        .select('nome, cargo, comum')
        .ilike('comum', `%${comumVal}%`)
        .limit(10);
      
      console.log('🔍 Registros encontrados para', comumVal, ':', {
        total: comumQuery.data?.length || 0,
        error: comumQuery.error?.message || 'nenhum',
        dados: comumQuery.data
      });

      // Consulta específica para a comum atual + SECRETÁRIO (A)
      console.log('🔍 DIAGNÓSTICO - Buscando SECRETÁRIO (A) em', comumVal);
      const secretarioComumQuery = await sb
        .from(TABLE_CATALOGO)
        .select('nome, cargo, comum')
        .ilike('comum', `%${comumVal}%`)
        .ilike('cargo', '%SECRETÁRIO (A)%');
      
      console.log('🔍 Secretários (A) em', comumVal, ':', {
        total: secretarioComumQuery.data?.length || 0,
        error: secretarioComumQuery.error?.message || 'nenhum',
        dados: secretarioComumQuery.data
      });
      
      // Se não encontrou nada, tenta uma busca mais ampla
      const wide = await sb
        .from(TABLE_CATALOGO)
        .select(SELECT_COLS)
        .ilike(COL_COMUM, `%${comumVal}%`)
        .eq('ativo', true);

      console.log('📊 Resultado da busca ampla:', { 
        total: wide.data?.length || 0, 
        error: wide.error?.message || 'nenhum',
        dados: wide.data?.slice(0, 3) // Mostra os primeiros 3 registros
      });

      if (!wide.error && wide.data) {
        console.log('🔄 Fazendo busca ampla com filtro local...');
        console.log('📊 Dados brutos da busca ampla:', wide.data.length);
        
        data = wide.data.filter(r => {
          const cargoR = upper(r.cargo || '');
          const instR = upper(r.instrumento || '');
          const comumR = upper(r[COL_COMUM] || '');
          const comumBusca = upper(comumVal);
          
          console.log('🔍 Analisando registro:', { 
            nome: r.nome, 
            cargo: r.cargo, 
            cargoR, 
            instrumento: r.instrumento,
            instR,
            comum: r[COL_COMUM], 
            comumR, 
            comumBusca 
          });
          
          // Verifica se a comum corresponde
          const comumMatch = comumR.includes(comumBusca) || comumBusca.includes(comumR);
          console.log('🔍 Comum match:', comumMatch);
          
          if (!comumMatch) {
            console.log('❌ Comum não corresponde, descartando');
            return false;
          }
          
          // LÓGICA CORRIGIDA: Para Músico, filtra por cargo + instrumento. Para outros cargos, filtra apenas por cargo.
          const isSecretarioMusica = (cargoVal.toLowerCase().includes('secretário') || cargoVal.toLowerCase().includes('secretária')) && 
                                   (cargoVal.toLowerCase().includes('música') || cargoVal.toLowerCase().includes('musica'));
          
          const isMusico = cargoVal.toLowerCase().includes('músico') && 
                          !cargoVal.toLowerCase().includes('secretário') && 
                          !cargoVal.toLowerCase().includes('secretária');
          
          if (isSecretarioMusica) {
            // Secretário da Música: filtra apenas por cargo
            console.log('🎵 É Secretário da Música, verificando cargo...');
            const cargoMatch = cargoR.includes('SECRETÁRIO (A) DA MÚSICA');
            console.log('🔍 Filtro Secretário da Música:', { 
              cargoR, 
              cargoMatch, 
              comum: r[COL_COMUM], 
              nome: r.nome,
              buscaPor: 'SECRETÁRIO (A) DA MÚSICA'
            });
            return cargoMatch;
          } else if (isMusico && instVal && instVal.trim() !== '') {
            // Músico + Instrumento: filtra por instrumento (seguindo lógica das organistas)
            console.log('🎵 É Músico + Instrumento, verificando instrumento...');
            const instBusca = upper(instVal);
            const instMatch = instR.includes(instBusca);
            console.log('🔍 Filtro Músico + Instrumento (seguindo lógica das organistas):', { 
              cargoR, 
              instR,
              instBusca,
              instMatch,
              comum: r[COL_COMUM], 
              nome: r.nome,
              buscaPor: 'INSTRUMENTO + ' + instVal
            });
            return instMatch;
          } else if (isMusico) {
            // Músico sem instrumento: filtra apenas por cargo
            console.log('🎵 É Músico sem instrumento, verificando cargo...');
            const cargoMatch = cargoR.includes('MÚSICO') && !cargoR.includes('SECRETÁRIO');
            console.log('🔍 Filtro Músico:', { 
              cargoR, 
              cargoMatch, 
              comum: r[COL_COMUM], 
              nome: r.nome,
              buscaPor: 'MÚSICO (sem SECRETÁRIO)'
            });
            return cargoMatch;
          } else if (cargoVal.toLowerCase().includes('organista')) {
            // Organista: filtra por instrumento ÓRGÃO para incluir todas as organistas (incluindo instrutoras e examinadoras)
            console.log('🎹 É Organista, verificando instrumento...');
            const instrumentoR = upper(r.instrumento || '');
            const instrumentoMatch = instrumentoR.includes('ÓRGÃO');
            console.log('🔍 Filtro Organista por instrumento:', { 
              instrumentoR, 
              instrumentoMatch, 
              comum: r[COL_COMUM], 
              nome: r.nome,
              cargo: r.cargo,
              buscaPor: 'ÓRGÃO'
            });
            return instrumentoMatch;
          } else {
            // Outros cargos: filtra apenas por cargo
            const cargoBusca = upper(cargoVal);
            const cargoMatch = cargoR.includes(cargoBusca);
            console.log('🔍 Filtro por cargo:', { cargoR, cargoBusca, cargoMatch, nome: r.nome });
            return cargoMatch;
          }
        });
        console.log('📊 Dados filtrados localmente:', data?.length || 0);
      } else {
        data = [];
      }
    }

    console.log('🔄 Processando dados recebidos...');
    console.log('📊 Dados brutos recebidos:', data?.map(r => ({ nome: r.nome, cargo: r.cargo, comum: r[COL_COMUM], nivel: r.nivel })));
    console.log('📊 Total de registros recebidos:', data?.length || 0);
    console.log('📊 Primeiro registro completo:', data?.[0]);
    
    // Debug específico para organistas
    const organistas = data?.filter(r => r.cargo && r.cargo.toUpperCase().includes('ORGANISTA'));
    if (organistas && organistas.length > 0) {
      console.log('🎹 Organistas encontrados:', organistas.map(o => ({ nome: o.nome, nivel: o.nivel, cargo: o.cargo })));
      console.log('🎹 Total de organistas:', organistas.length);
      console.log('🎹 Organistas com nivel:', organistas.filter(o => o.nivel).length);
    } else {
      console.log('🎹 Nenhum organista encontrado nos dados');
    }

    const nomes = (data || [])
      .map(r => norm(r.nome))
      .filter(Boolean)
      .map(s => s.toLowerCase().replace(/(^.|[\s\-'.][a-z])/g, m => m.toUpperCase()))
      .sort((a,b)=>a.localeCompare(b,'pt-BR'));
    const unique = [...new Set(nomes)];

    console.log('📋 Nomes processados:', unique);
    
    // Armazena os dados completos para captura automática da classe
    const dadosCompletos = (data || []).filter(r => r.ativo !== false);
    console.log('💾 Armazenando dados completos no cache:', cacheKey + '_dados');
    console.log('💾 Dados completos para armazenar:', dadosCompletos.length);
    console.log('💾 Exemplo de dados completos:', dadosCompletos.slice(0, 2));
    
    // FORÇA o armazenamento dos dados completos no cache
    if (dadosCompletos.length > 0) {
      setCache(cacheKey + '_dados', dadosCompletos, 2 * 60 * 60 * 1000);
      console.log('✅ Dados completos armazenados no cache com sucesso');
    } else {
      console.log('⚠️ Nenhum dado completo para armazenar no cache');
    }

    setCache(cacheKey, unique, 2 * 60 * 60 * 1000);
    
    // Se não há resultados, mostra mensagem informativa apenas para cargos musicais
    if (unique.length === 0) {
      // Cargos que não precisam de instrumento (não tocam) - usando versão sem acentos
      const cargosSemInstrumento = [
        'IRMANDADE',     // Irmandade
        'ANCIAO',        // Ancião
        'DIACONO',       // Diácono
        'COOPERADOR DO OFICIO',  // Cooperador do Ofício
        'COOPERADOR DE JOVENS',  // Cooperador de Jovens
        'PORTEIRO (A)',  // Porteiro (a)
        'BOMBEIRO (A)',  // Bombeiro (a)
        'MEDICO (A)',    // Médico (a)
        'ENFERMEIRO (A)' // Enfermeiro (a)
      ];
      
      const isCargoNaoMusical = cargosSemInstrumento.includes(cargoUP);
      
      // Alerta removido - usuário pode sempre digitar manualmente
    }
    
    populateNomesInput(nomeEl, unique);
    console.log('✅ Nomes carregados com sucesso:', unique.length, 'para', { comumVal, instVal, cargoVal, variacoesCargo });
    
    // Salva dados no cache para uso offline
    if (unique.length > 0) {
      saveNomesToCache(unique, comumVal, instVal, cargoVal);
      
      // Mostra toast informativo para instrutores
      if (cargoVal.toLowerCase().includes('instrutor')) {
        const instrutoresEncontrados = unique.filter(r => r.cargo && r.cargo.toUpperCase().includes('INSTRUTOR'));
        if (instrutoresEncontrados.length > 0) {
          showToast('info', 'Instrutores encontrados', 
            `Encontrados ${instrutoresEncontrados.length} instrutor(es) de ${instVal}`, 3000);
        }
      }
    }
  } catch (e) {
    console.error('❌ Erro geral em loadNomes:', e);
    console.log('🔄 Tentando carregar dados offline...');
    
    // Tenta carregar dados do cache quando há erro
    try {
      // Recoleta os valores dos campos para usar no cache
      const comumEl = findComumField();
      const instEl = findInstrumentField();
      const cargoEl = findCargoField();
      const nomeEl = findNomeField();
      
      if (comumEl && instEl && cargoEl && nomeEl) {
        const comumVal = norm(comumEl.value);
        const instVal = upper(instEl.value);
        const cargoVal = norm(cargoEl.value);
        const cargoUP = ucase(cargoVal);
        const precisaInst = ['MUSICO','MUSICO(A)','MÚSICO','MÚSICO(A)'].includes(cargoUP) || 
                            ['MÚSICO','MÚSICO(A)'].includes(upper(cargoVal)) ||
                            cargoUP === 'ORGANISTA' ||
                            cargoUP === 'EXAMINADORA' ||
                            cargoUP === 'INSTRUTOR' ||
                            (cargoVal.toLowerCase().includes('secretária') && cargoVal.toLowerCase().includes('música'));
        
      const cachedData = loadNomesFromCache(comumVal, instVal, cargoVal, cargoUP, precisaInst);
      if (cachedData.length > 0) {
        console.log('✅ Dados carregados do cache offline:', cachedData.length);
        populateNomesInput(nomeEl, cachedData);
        showToast('info', 'Dados carregados offline', `Encontrados ${cachedData.length} nomes no cache`, 3000);
        return;
        }
      }
    } catch (cacheError) {
      console.error('❌ Erro ao carregar cache:', cacheError);
    }
    
    // Se não conseguiu carregar do cache, permite digitação manual
    console.log('📝 Permitindo digitação manual...');
    const nomeEl = findNomeField();
    if (nomeEl) {
    populateNomesInput(nomeEl, []);
    }
    showToast('warning', 'Modo offline', 'Digite o nome manualmente', 3000);
  }
}

// Função auxiliar para reconverter INPUT para SELECT quando há resultados
function reconverterParaSelect(inputEl, unique) {
  console.log('🔄 Reconvertendo INPUT para SELECT');
  
  // Verifica se o elemento e seu parent existem
  if (!inputEl || !inputEl.parentNode) {
    console.error('❌ Elemento ou parentNode não encontrado para reconversão');
    return null;
  }
  
  // Cria novo elemento SELECT
  const selectEl = document.createElement('select');
  selectEl.id = 'nome';
  selectEl.className = 'form-select';
  selectEl.required = true;
  selectEl.innerHTML =
    '<option value="">Selecione um nome da lista (ou digite, se offline)</option>' +
    unique.map(v => `<option value="${v}">${v}</option>`).join('');
  
  // Substitui o INPUT pelo SELECT
  try {
  inputEl.parentNode.replaceChild(selectEl, inputEl);
  } catch (error) {
    console.error('❌ Erro ao substituir elemento:', error);
    return null;
  }
  
  // Adiciona eventos ao novo elemento
  selectEl.addEventListener('change', capturarClasseAutomaticamente);
  selectEl.addEventListener('input', capturarClasseAutomaticamente);
  
  return selectEl;
}

// Função para preencher instrumento automaticamente quando selecionar nome
async function preencherInstrumentoAutomaticamente(nomeSelecionado, comumVal, cargoVal, instEl) {
  console.log('🎵 Preenchendo instrumento automaticamente para:', nomeSelecionado);
  
  // Busca dados completos no cache
  const cacheKey = `cache_nomes_${comumVal}_${''}_${cargoVal}`;
  const dadosCompletos = getCache(cacheKey + '_dados');
  
  if (dadosCompletos && Array.isArray(dadosCompletos) && dadosCompletos.length > 0) {
    // Busca o registro do nome selecionado
    const registro = dadosCompletos.find(r => {
      const nomeNormalizado = norm(r.nome).toLowerCase().replace(/(^.|[\s\-'.][a-z])/g, m => m.toUpperCase());
      return nomeNormalizado === nomeSelecionado;
    });
    
    if (registro && registro.instrumento) {
      console.log('🎵 Instrumento encontrado no cache:', { nome: registro.nome, instrumento: registro.instrumento });
      instEl.value = registro.instrumento;
      return;
    }
  }
  
  // Se não encontrou no cache, faz consulta direta
  try {
    console.log('🔍 Fazendo consulta direta para encontrar instrumento...');
    const consultaDireta = await sb
      .from(TABLE_CATALOGO)
      .select('nome, instrumento')
      .ilike('comum', `%${comumVal}%`)
      .ilike('cargo', `%${cargoVal}%`)
      .eq('ativo', true);
    
    if (consultaDireta.data && consultaDireta.data.length > 0) {
      const registro = consultaDireta.data.find(r => {
        const nomeNormalizado = norm(r.nome).toLowerCase().replace(/(^.|[\s\-'.][a-z])/g, m => m.toUpperCase());
        return nomeNormalizado === nomeSelecionado;
      });
      
      if (registro && registro.instrumento) {
        console.log('🎵 Instrumento encontrado via consulta direta:', { nome: registro.nome, instrumento: registro.instrumento });
        instEl.value = registro.instrumento;
      }
    }
  } catch (error) {
    console.error('❌ Erro ao buscar instrumento:', error);
  }
}

async function validarInstrumentoCorreto(nomeSelecionado, comumVal, cargoVal, instEl) {
  console.log('🔍 Validando instrumento correto para:', { nomeSelecionado, comumVal, cargoVal });
  
  const instrumentoAtual = instEl.value.trim();
  console.log('🔍 Instrumento atual no campo:', instrumentoAtual);
  console.log('🔍 Campo instrumento visível:', instEl.offsetParent !== null);
  console.log('🔍 Campo instrumento display:', instEl.closest('.mb-3')?.style.display);
  
  if (!instrumentoAtual) {
    console.log('⚠️ Campo instrumento vazio, pulando validação');
    return;
  }
  
  try {
    // Busca o instrumento correto para esta pessoa específica
    const { data, error } = await sb
      .from(TABLE_CATALOGO)
      .select('nome, instrumento, cargo')
      .ilike('comum', `%${comumVal}%`)
      .ilike('cargo', `%${cargoVal}%`)
      .eq('ativo', true);
    
    if (error) {
      console.error('❌ Erro ao validar instrumento:', error);
      return;
    }
    
    if (data && data.length > 0) {
      console.log('🔍 Dados encontrados na busca:', data.length, 'registros');
      console.log('🔍 Primeiros registros:', data.slice(0, 3));
      
      const registro = data.find(r => {
        const nomeNormalizado = norm(r.nome).toLowerCase().replace(/(^.|[\s\-'.][a-z])/g, m => m.toUpperCase());
        const match = nomeNormalizado === nomeSelecionado;
        console.log('🔍 Comparando:', { nomeOriginal: r.nome, nomeNormalizado, nomeSelecionado, match });
        return match;
      });
      
      console.log('🔍 Registro encontrado:', registro);
      
      if (registro && registro.instrumento) {
        const instrumentoCorreto = registro.instrumento.trim();
        const instrumentoAtualUpper = upper(instrumentoAtual);
        const instrumentoCorretoUpper = upper(instrumentoCorreto);
        
        console.log('🔍 Comparando instrumentos:', {
          atual: instrumentoAtual,
          correto: instrumentoCorreto,
          nome: registro.nome
        });
        
        // Se o instrumento atual não corresponde ao correto
        if (instrumentoAtualUpper !== instrumentoCorretoUpper) {
          console.log('⚠️ Instrumento incorreto detectado! Corrigindo automaticamente...');
          
          // Verifica se o campo está visível antes de corrigir
          const instrumentoContainer = instEl.closest('.mb-3');
          const campoVisivel = instrumentoContainer && instrumentoContainer.style.display !== 'none';
          
          console.log('🔍 Campo instrumento visível para correção:', campoVisivel);
          console.log('🔍 Display do container:', instrumentoContainer?.style.display);
          
          if (!campoVisivel) {
            console.log('⚠️ Campo instrumento não está visível, forçando visibilidade...');
            if (instrumentoContainer) {
              instrumentoContainer.style.display = 'block';
            }
          }
          
          // CORREÇÃO AUTOMÁTICA - Atualiza o campo imediatamente
          instEl.value = instrumentoCorreto;
          console.log('✅ Instrumento corrigido automaticamente para:', instrumentoCorreto);
          
          // Força evento de mudança para garantir que o frontend seja atualizado
          instEl.dispatchEvent(new Event('change', { bubbles: true }));
          instEl.dispatchEvent(new Event('input', { bubbles: true }));
          
          // Calcula o naipe automaticamente
          const naipeCorreto = getNaipeByInstrumento(instrumentoCorreto);
          console.log('🎵 Naipe calculado automaticamente:', naipeCorreto);
          
          // Mostra toast de confirmação
          const mensagem = naipeCorreto ? 
            `Instrumento corrigido para ${instrumentoCorreto} (${naipeCorreto})` : 
            `Instrumento corrigido para ${instrumentoCorreto}`;
          
          showToast('success', 'Instrumento Corrigido', mensagem, 3000);
          
          // Debug: Verifica se o valor foi realmente atualizado
          setTimeout(() => {
            console.log('🔍 DEBUG - Valor do campo após correção:', instEl.value);
            console.log('🔍 DEBUG - Campo visível:', instEl.offsetParent !== null);
          }, 100);
        }
      }
    }
  } catch (error) {
    console.error('❌ Erro na validação de instrumento:', error);
  }
}

// Função global para corrigir instrumento
window.corrigirInstrumento = function(instrumentoCorreto) {
  const instEl = findInstrumentField();
  if (instEl) {
    instEl.value = instrumentoCorreto;
    console.log('✅ Instrumento corrigido para:', instrumentoCorreto);
    
    // Calcula o naipe automaticamente
    const naipeCorreto = getNaipeByInstrumento(instrumentoCorreto);
    console.log('🎵 Naipe calculado automaticamente:', naipeCorreto);
    
    // Remove o toast
    const toast = document.querySelector('.toast-notification.warning');
    if (toast) toast.remove();
    
    // Mostra confirmação com naipe
    const mensagem = naipeCorreto ? 
      `Alterado para ${instrumentoCorreto} (${naipeCorreto})` : 
      `Alterado para ${instrumentoCorreto}`;
    showToast('success', 'Instrumento Corrigido', mensagem, 2000);
  }
};

// Função para mostrar alerta de duplicata
async function mostrarAlertaDuplicata(nome, comum, dataFormatada, duplicata) {
  console.log('🚨 Mostrando alerta de duplicata:', { nome, comum, dataFormatada, duplicata });
  
  const mensagem = `
    <div style="text-align: left;">
      <strong>${nome}</strong> de <strong>${comum}</strong><br>
      já foi cadastrado hoje!<br><br>
      <small>Data: ${dataFormatada}</small><br>
      <small>Horário: ${new Date(duplicata.created_at).toLocaleTimeString('pt-BR')}</small>
    </div>
  `;
  
  const result = await Swal.fire({
    title: 'Cadastro Duplicado!',
    html: mensagem,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Cadastrar Mesmo Assim',
    cancelButtonText: 'Cancelar',
    confirmButtonColor: '#f59e0b',
    cancelButtonColor: '#6b7280',
    reverseButtons: true
  });
  
  if (!result.isConfirmed) {
    // Usuário cancelou - recarrega a página silenciosamente
    console.log('❌ Usuário cancelou registro por duplicata - recarregando página...');
    setTimeout(() => {
      window.location.reload();
    }, 100);
    return true; // Retorna true para indicar que deve cancelar
  }
  
  // Usuário confirmou - retorna false para permitir o registro
  console.log('✅ Usuário confirmou registro mesmo com duplicata');
  return false; // Retorna false para permitir o registro
}

// Função para verificar duplicatas por nome + comum + data (VERSÃO ESTÁVEL)
async function verificarDuplicata(nome, comum) {
  if (!nome || !comum) {
    console.log('⚠️ Verificação de duplicata pulada - dados incompletos:', { nome, comum });
    return false;
  }
  
  try {
    // Verifica se Supabase está disponível
    if (!supabaseLoaded || !sb) {
      return false;
    }
    
    // Formata a data atual
    const dataAtual = new Date();
    const dataFormatada = dataAtual.toLocaleDateString('pt-BR');
    const dataISO = dataAtual.toISOString().split('T')[0];
    
    // Consulta simples e direta
    const { data, error } = await sb
        .from('presencas')
      .select('nome_completo, comum, created_at')
        .ilike('nome_completo', `%${nome.trim()}%`)
        .ilike('comum', `%${comum.trim()}%`)
        .gte('created_at', `${dataISO}T00:00:00.000Z`)
        .lt('created_at', `${dataISO}T23:59:59.999Z`)
      .limit(5);
    
    if (error) {
      return false;
    }
    
    if (data && data.length > 0) {
      const usuarioCancelou = await mostrarAlertaDuplicata(nome, comum, dataFormatada, data[0]);
      return usuarioCancelou;
    } else {
      return false;
    }
    
  } catch (error) {
      console.error('❌ Erro na verificação de duplicatas:', error);
    return false;
  }
}

// Função para mapear instrumento para naipe
function getNaipeByInstrumento(instrumento) {
  if (!instrumento) return '';
  
  const instrumentoUpper = upper(instrumento);
  
  // Mapeamento de instrumentos para naipes (3 categorias principais)
  const mapeamentoNaipes = {
    // CORDAS
    'VIOLINO': 'CORDAS',
    'VIOLA': 'CORDAS', 
    'VIOLONCELO': 'CORDAS',
    'CONTRABAIXO': 'CORDAS',
    'VIOLÃO': 'CORDAS',
    'GUITARRA': 'CORDAS',
    'BAIXO': 'CORDAS',
    
    // MADEIRAS
    'FLAUTA': 'MADEIRAS',
    'FLAUTA DOCE': 'MADEIRAS',
    'OBOÉ': 'MADEIRAS',
    'CLARINETA': 'MADEIRAS',
    'CLARINETE': 'MADEIRAS',
    'FAGOTE': 'MADEIRAS',
    'SAXOFONE': 'MADEIRAS',
    'SAXOFONE ALTO': 'MADEIRAS',
    'SAXOFONE TENOR': 'MADEIRAS',
    'SAXOFONE SOPRANO': 'MADEIRAS',
    'SAXOFONE BARÍTONO': 'MADEIRAS',
    
    // METAIS
    'TROMPA': 'METAIS',
    'TROMPETE': 'METAIS',
    'TROMBONE': 'METAIS',
    'TUBA': 'METAIS',
    'FLUGELHORN': 'METAIS',
    'EUFÔNIO': 'METAIS',
    'BOMBARDINO': 'METAIS',
    
    // TECLADO
    'ÓRGÃO': 'TECLADO',
    'PIANO': 'TECLADO',
    'TECLADO': 'TECLADO',
    'ACORDEON': 'TECLADO',
    'ACORDEÃO': 'TECLADO',
    
    // Outros instrumentos (sem naipe específico)
    'BATERIA': '',
    'CAIXA': '',
    'PRATO': '',
    'BOMBO': '',
    'TRIÂNGULO': '',
    'XILOFONE': '',
    'VIBRAFONE': '',
    'MARIMBA': '',
    'TIMPANI': '',
    'TÍMPANOS': '',
    'VOZ': '',
    'CORAL': '',
    'SOLO': ''
  };
  
  // Busca exata primeiro
  if (mapeamentoNaipes[instrumentoUpper]) {
    return mapeamentoNaipes[instrumentoUpper];
  }
  
  // Busca parcial para instrumentos com variações
  for (const [instrumentoKey, naipe] of Object.entries(mapeamentoNaipes)) {
    if (instrumentoUpper.includes(instrumentoKey) || instrumentoKey.includes(instrumentoUpper)) {
      return naipe;
    }
  }
  
  // Se não encontrou, retorna vazio
  console.log('⚠️ Naipe não encontrado para instrumento:', instrumento);
  return '';
}

function populateNomesInput(nomeEl, unique) {
  // Verifica se o elemento existe
  if (!nomeEl) {
    console.error('❌ Elemento nomeEl não encontrado em populateNomesInput');
    return;
  }
  
  if (nomeEl.tagName === 'SELECT') {
    if (unique.length === 0) {
      // Se não há resultados, converte SELECT para INPUT para permitir digitação
      console.log('🔄 Convertendo SELECT para INPUT para permitir digitação manual');
      
      // Verifica se o elemento tem parentNode
      if (!nomeEl.parentNode) {
        console.error('❌ parentNode não encontrado para conversão SELECT->INPUT');
        return;
      }
      
      // Cria novo elemento INPUT
      const inputEl = document.createElement('input');
      inputEl.type = 'text';
      inputEl.id = 'nome';
      inputEl.className = 'form-control';
      inputEl.placeholder = 'Digite o nome manualmente';
      inputEl.style.backgroundColor = 'var(--card)'; // Fundo adequado para o tema
      inputEl.style.color = 'var(--ink)'; // Texto legível
      inputEl.style.borderColor = 'var(--border)'; // Borda adequada
      inputEl.required = true;
      
      // Substitui o SELECT pelo INPUT
      try {
      nomeEl.parentNode.replaceChild(inputEl, nomeEl);
      } catch (error) {
        console.error('❌ Erro ao substituir SELECT por INPUT:', error);
        return;
      }
      
      // Adiciona eventos ao novo elemento
      inputEl.addEventListener('change', capturarClasseAutomaticamente);
      inputEl.addEventListener('input', capturarClasseAutomaticamente);
      
      // Foca no campo para facilitar digitação
      setTimeout(() => inputEl.focus(), 100);
      
    } else {
      // Se há resultados, mantém como SELECT
    nomeEl.innerHTML =
      '<option value="">Selecione um nome da lista (ou digite, se offline)</option>' +
      unique.map(v => `<option value="${v}">${v}</option>`).join('');
      nomeEl.style.backgroundColor = ''; // Remove cor de fundo
      
      // Adiciona eventos
      nomeEl.addEventListener('change', capturarClasseAutomaticamente);
      nomeEl.addEventListener('input', capturarClasseAutomaticamente);
    }
  } else {
    // Se já é INPUT, verifica se precisa reconverter para SELECT
    if (unique.length > 0) {
      // Se há resultados, reconverte INPUT para SELECT
      reconverterParaSelect(nomeEl, unique);
    } else {
      // Se não há resultados, mantém como INPUT e permite digitação livre
    let dl = document.getElementById('dlNomes');
      if (!dl) { 
        dl = document.createElement('datalist'); 
        dl.id = 'dlNomes'; 
        document.body.appendChild(dl); 
      }
      
      dl.innerHTML = '';
      nomeEl.removeAttribute('list');
      nomeEl.placeholder = 'Digite o nome manualmente';
      nomeEl.style.backgroundColor = '#fff3cd'; // Amarelo claro para indicar modo manual
      
      // Adiciona eventos
      nomeEl.addEventListener('change', capturarClasseAutomaticamente);
      nomeEl.addEventListener('input', capturarClasseAutomaticamente);
    }
  }
}

async function capturarClasseAutomaticamente() {
  const nomeEl = this;
  const nomeSelecionado = nomeEl.value.trim();
  
  console.log('🎹 capturarClasseAutomaticamente chamada para:', nomeSelecionado);
  console.log('🎹 Elemento que disparou:', nomeEl);
  console.log('🎹 Tipo do elemento:', nomeEl.tagName);
  console.log('🔍 DEBUG - Início da função capturarClasseAutomaticamente');
  
  if (!nomeSelecionado) {
    console.log('🎹 Nome vazio, saindo da função');
    return;
  }
  
  // Busca os dados completos no cache
  const comumEl = findComumField();
  const cargoEl = findCargoField();
  const instEl = findInstrumentField();
  
  if (!comumEl || !cargoEl || !instEl) return;
  
  const comumVal = getFieldValue(comumEl);
  const cargoVal = getFieldValue(cargoEl);
  const instVal = getFieldValue(instEl);
  
  if (!comumVal || !cargoVal) return;
  
  // NOVA FUNCIONALIDADE: Preencher instrumento automaticamente quando selecionar nome
  await preencherInstrumentoAutomaticamente(nomeSelecionado, comumVal, cargoVal, instEl);
  
  // NOVA FUNCIONALIDADE: Validar instrumento correto para o cargo
  await validarInstrumentoCorreto(nomeSelecionado, comumVal, cargoVal, instEl);
  
        // NOVA FUNCIONALIDADE: Detectar automaticamente se organista é instrutora (APENAS para Organista)
        if (ucase(cargoVal) === 'ORGANISTA') {
          console.log('🔍 DEBUG - Executando detecção de organista para cargo:', cargoVal);
          await detectarCargoOrganistaAutomaticamente(nomeSelecionado, comumVal, cargoVal, cargoEl);
          console.log('🔍 DEBUG - Após detecção de organista, data-cargo-real:', cargoEl.getAttribute('data-cargo-real'));
        }
  
  // NOVA FUNCIONALIDADE: Detectar automaticamente se músico é instrutor (APENAS para Músico)
  console.log('🔍 DEBUG - Verificando se deve executar detecção de instrutor:', {
    cargoVal,
    cargoValUpper: ucase(cargoVal),
    isMusico: ucase(cargoVal) === 'MÚSICO',
    isMusicoA: ucase(cargoVal) === 'MÚSICO(A)',
    nomeSelecionado,
    comumVal,
    instVal
  });
  
  if (ucase(cargoVal) === 'MÚSICO' || ucase(cargoVal) === 'MÚSICO(A)') {
    console.log('🔍 DEBUG - Executando detecção de cargo musical para cargo:', cargoVal);
    await detectarCargoMusicalAutomaticamente(nomeSelecionado, comumVal, cargoVal, cargoEl, instVal);
    console.log('🔍 DEBUG - Após detecção de cargo musical, data-cargo-real:', cargoEl.getAttribute('data-cargo-real'));
  } else {
    console.log('🔍 DEBUG - Cargo não é Músico, pulando detecção de cargo musical:', cargoVal);
  }
  
  // Verifica se é organista ou cargo relacionado (Examinadora, Instrutor, Secretária da Música)
  const cargoUP = ucase(cargoVal);
  const isOrganistaOuRelacionado = cargoUP === 'ORGANISTA' || 
                                  cargoUP === 'EXAMINADORA' || 
                                  cargoUP === 'INSTRUTOR' ||
                                  (cargoVal.toLowerCase().includes('secretária') && cargoVal.toLowerCase().includes('música'));
  
  if (!isOrganistaOuRelacionado) return;
  
  // Busca dados completos no cache
  const cacheKey = `cache_nomes_${comumVal}_${instVal}_${cargoVal}`;
  const dadosCompletos = getCache(cacheKey + '_dados');
  
  console.log('🔍 Buscando dados completos no cache:', cacheKey + '_dados');
  console.log('🔍 Dados completos encontrados:', dadosCompletos?.length || 0);
  
  if (!dadosCompletos || !Array.isArray(dadosCompletos) || dadosCompletos.length === 0) {
    console.log('❌ Dados completos não encontrados no cache, fazendo consulta direta...');
    
    // FAZ CONSULTA DIRETA se o cache estiver vazio
    try {
      const consultaDireta = await sb
        .from(TABLE_CATALOGO)
        .select('nome, cargo, nivel')
        .ilike('comum', `%${comumVal}%`)
        .or('cargo.ilike.%ORGANISTA%,cargo.ilike.%EXAMINADORA%,cargo.ilike.%INSTRUTORA%,cargo.ilike.%SECRETÁRIO (A) DA MÚSICA%,cargo.ilike.%SECRETÁRIO (A) DO GEM%')
        .eq('ativo', true);
      
      console.log('🔍 Consulta direta realizada:', consultaDireta.data?.length || 0, 'registros');
      
      if (consultaDireta.data && consultaDireta.data.length > 0) {
        const registro = consultaDireta.data.find(r => {
          const nomeNormalizado = norm(r.nome).toLowerCase().replace(/(^.|[\s\-'.][a-z])/g, m => m.toUpperCase());
          return nomeNormalizado === nomeSelecionado;
        });
        
        if (registro && registro.nivel) {
          console.log('🎹 Classe capturada via consulta direta:', { nome: registro.nome, nivel: registro.nivel });
          nomeEl.setAttribute('data-classe', registro.nivel);
          return;
        }
      }
    } catch (e) {
      console.log('❌ Erro na consulta direta:', e.message);
    }
    
    console.log('❌ Nenhuma classe encontrada via consulta direta');
    return;
  }
  
  // Busca o registro correspondente ao nome selecionado
  console.log('🔍 Buscando registro para nome:', nomeSelecionado);
  console.log('🔍 Dados disponíveis:', dadosCompletos.map(r => ({ nome: r.nome, nivel: r.nivel })));
  
  const registro = dadosCompletos.find(r => {
    const nomeNormalizado = norm(r.nome).toLowerCase().replace(/(^.|[\s\-'.][a-z])/g, m => m.toUpperCase());
    const match = nomeNormalizado === nomeSelecionado;
    console.log('🔍 Comparando:', { nomeOriginal: r.nome, nomeNormalizado, nomeSelecionado, match });
    return match;
  });
  
  console.log('🔍 Registro encontrado:', registro);
  
  if (registro && registro.nivel) {
    console.log('🎹 Classe capturada automaticamente:', { nome: registro.nome, nivel: registro.nivel });
    
    // Armazena a classe para uso posterior
    nomeEl.setAttribute('data-classe', registro.nivel);
  } else {
    console.log('🎹 Nenhuma classe encontrada para:', nomeSelecionado);
    if (registro) {
      console.log('🎹 Registro encontrado mas sem nivel:', registro);
    }
  }
}

/* ===== DETECÇÃO AUTOMÁTICA DE CARGO DE ORGANISTA ===== */
async function detectarCargoOrganistaAutomaticamente(nomeSelecionado, comumVal, cargoVal, cargoEl) {
  try {
    // Só executa se o cargo atual for "Organista"
    const cargoUP = ucase(cargoVal);
    // Log removido
    
    if (cargoUP !== 'ORGANISTA') {
      console.log('🎹 Não é organista, pulando detecção automática de cargo');
      return;
    }
    
    console.log('🎹 Detectando cargo automático para organista:', { nomeSelecionado, comumVal });
    console.log('🎹 DEBUG - Verificando se Supabase está disponível:', { supabaseLoaded, sb: !!sb });
    
    // Verifica se o Supabase está disponível
    if (!supabaseLoaded || !sb) {
      console.log('⚠️ Supabase não disponível para detecção automática de cargo');
      return;
    }
    
    // DEBUG: Log detalhado da consulta
    console.log('🔍 DEBUG - Parâmetros da consulta:', {
      table: TABLE_CATALOGO,
      comumVal,
      nomeSelecionado,
      comumFilter: `%${comumVal}%`,
      nomeFilter: `%${nomeSelecionado}%`
    });
    
    // Busca TODOS os cargos da pessoa para detectar o cargo correto
    console.log('🔍 DEBUG - Fazendo consulta ao Supabase:', {
      table: TABLE_CATALOGO,
      comumFilter: `%${comumVal}%`,
      nomeFilter: `%${nomeSelecionado}%`
    });
    
    const { data, error } = await sb
      .from(TABLE_CATALOGO)
      .select('nome, cargo, nivel, instrumento, comum')
      .ilike('comum', `%${comumVal}%`)
      .ilike('nome', `%${nomeSelecionado}%`)
      .or('cargo.ilike.%ORGANISTA%,cargo.ilike.%EXAMINADORA%,cargo.ilike.%INSTRUTORA%,cargo.ilike.%SECRETÁRIO (A) DA MÚSICA%,cargo.ilike.%SECRETÁRIO (A) DO GEM%')
      .eq('ativo', true)
      .order('cargo', { ascending: true });
    
    console.log('🔍 DEBUG - Resultado da consulta:', { data, error });
    
    if (error) {
      console.error('❌ Erro ao buscar cargo da organista:', error);
      return;
    }
    
    if (data && data.length > 0) {
      console.log('🎹 Todos os registros encontrados para a pessoa:', data);
      console.log('🔍 DEBUG - Análise detalhada dos registros:');
      
      data.forEach((r, index) => {
        console.log(`  ${index + 1}. Nome: "${r.nome}", Cargo: "${r.cargo}", Instrumento: "${r.instrumento}", Comum: "${r.comum}"`);
      });
      
      // Busca especificamente o cargo relacionado ao órgão
      const registroOrgao = data.find(r => 
        r.instrumento && r.instrumento.toUpperCase().includes('ÓRGÃO')
      );
      
      console.log('🔍 DEBUG - Registro com órgão encontrado:', registroOrgao);
      
      // Se não encontrar cargo específico do órgão, usa o primeiro registro
      const registro = registroOrgao || data[0];
      
      const cargoEncontrado = registro.cargo;
      
      console.log('🎹 Registro selecionado:', {
        nome: registro.nome,
        cargo: registro.cargo,
        instrumento: registro.instrumento,
        nivel: registro.nivel,
        comum: registro.comum,
        foiSelecionadoPorOrgao: !!registroOrgao,
        totalRegistros: data.length
      });
      
      console.log('🎹 Cargo encontrado para organista:', { 
        nome: registro.nome, 
        cargo: cargoEncontrado,
        nivel: registro.nivel,
        instrumento: registro.instrumento
      });
      
      // Armazena o cargo real encontrado para uso posterior (sem alterar a interface)
      if (!cargoEncontrado.toLowerCase().includes('organista')) {
        console.log('🎹 Cargo musical detectado - cargo real será usado no envio:', cargoEncontrado);
        // Armazena o cargo real no elemento para uso posterior
        cargoEl.setAttribute('data-cargo-real', cargoEncontrado);
        
        // Se for examinadora, mostra mensagem informativa
        if (cargoEncontrado.toLowerCase().includes('examinadora')) {
          console.log('🎹 Examinadora detectada automaticamente - será incluída na planilha como:', cargoEncontrado);
        }
      } else {
        console.log('🎹 Organista comum - mantendo cargo "Organista"');
        cargoEl.removeAttribute('data-cargo-real');
      }
      
      // Armazena a classe se disponível
      if (registro.nivel) {
        const nomeEl = findNomeField();
        if (nomeEl) {
          nomeEl.setAttribute('data-classe', registro.nivel);
          console.log('🎹 Classe armazenada automaticamente:', registro.nivel);
        }
      }
      
    } else {
      console.log('🎹 Nenhum registro encontrado para a organista');
      
      // DEBUG: Teste adicional - busca mais ampla
      console.log('🔍 DEBUG - Testando busca mais ampla...');
      try {
        const { data: dataAmpla, error: errorAmpla } = await sb
          .from(TABLE_CATALOGO)
          .select('nome, cargo, nivel, instrumento, comum')
          .ilike('nome', `%${nomeSelecionado}%`)
          .eq('ativo', true)
          .limit(10);
        
        if (!errorAmpla && dataAmpla && dataAmpla.length > 0) {
          console.log('🔍 DEBUG - Busca ampla encontrou registros:', dataAmpla);
        } else {
          console.log('🔍 DEBUG - Busca ampla não encontrou registros');
        }
      } catch (e) {
        console.log('🔍 DEBUG - Erro na busca ampla:', e.message);
      }
    }
    
  } catch (error) {
    console.error('❌ Erro na detecção automática de cargo:', error);
  }
}

/* ===== DETECÇÃO AUTOMÁTICA DE CARGO DE INSTRUTOR ===== */
async function detectarCargoMusicalAutomaticamente(nomeSelecionado, comumVal, cargoVal, cargoEl, instVal) {
  try {
    console.log('🎓 Detectando se músico é instrutor, encarregado ou secretário:', { nomeSelecionado, comumVal, cargoVal, instVal });
    
    // Verifica se o Supabase está disponível
    if (!supabaseLoaded || !sb) {
      console.log('⚠️ Supabase não disponível para detecção de cargo musical');
      return;
    }
    
    // Busca se a pessoa é instrutor, encarregado ou secretário no banco usando comum + nome + instrumento
    console.log('🔍 DEBUG - Fazendo consulta para cargo musical:', {
      nome: `%${nomeSelecionado}%`,
      comum: `%${comumVal}%`,
      instrumento: `%${instVal}%`
    });
    
    // Primeiro, vamos fazer uma busca mais ampla para debug
    const { data: debugData, error: debugError } = await sb
      .from(TABLE_CATALOGO)
      .select('cargo, instrumento, nome, nivel, comum')
      .ilike('nome', `%${nomeSelecionado}%`)
      .ilike(COL_COMUM, `%${comumVal}%`)
      .eq('ativo', true);
    
    console.log('🔍 DEBUG - Busca ampla para debug:', { debugData, debugError });
    
    // Agora fazemos a busca específica por cargos musicais
    const { data, error } = await sb
      .from(TABLE_CATALOGO)
      .select('cargo, instrumento, nome, nivel')
      .ilike('nome', `%${nomeSelecionado}%`)
      .ilike(COL_COMUM, `%${comumVal}%`)
      .ilike('instrumento', `%${instVal}%`)
      .or('cargo.ilike.%INSTRUTOR%,cargo.ilike.%ENCARREGADO LOCAL%,cargo.ilike.%ENCARREGADO REGIONAL%,cargo.ilike.%SECRETÁRIO (A) DA MÚSICA%,cargo.ilike.%SECRETÁRIO (A) DO GEM%')
      .eq('ativo', true)
      .limit(1);
    
    console.log('🔍 DEBUG - Resultado da consulta de cargo musical:', { data, error });
    
    if (error) {
      console.error('❌ Erro ao buscar cargo musical:', error);
      return;
    }
    
    if (data && data.length > 0) {
      const registroCargo = data[0];
      console.log('🎓 CARGO MUSICAL DETECTADO:', registroCargo);
      
      // Armazena o cargo real para uso posterior
      cargoEl.setAttribute('data-cargo-real', registroCargo.cargo);
      console.log('🎓 Cargo real armazenado:', registroCargo.cargo);
      
      // Armazena o nível do cargo para uso posterior
      if (registroCargo.nivel) {
        cargoEl.setAttribute('data-nivel-instrutor', registroCargo.nivel);
        console.log('🎓 Nível do cargo armazenado:', registroCargo.nivel);
      }
    } else {
      console.log('🎓 Músico comum - não é cargo musical especial');
      console.log('🔍 DEBUG - Nenhum registro de cargo musical encontrado para:', { nomeSelecionado, comumVal, instVal });
      cargoEl.removeAttribute('data-cargo-real');
      cargoEl.removeAttribute('data-nivel-instrutor');
    }
    
  } catch (error) {
    console.error('❌ Erro na detecção de cargo musical:', error);
  }
}

/* ===== MODAL NOVA COMUM/MÚSICO ===== */
async function carregarCargosModal() {
  try {
    console.log('🔄 Iniciando carregamento de cargos completos para modal...');
    const cargoSelect = document.getElementById('gsCargo');
    if (!cargoSelect) {
      console.error('❌ Elemento gsCargo não encontrado!');
      return;
    }
    
    console.log('✅ Elemento gsCargo encontrado');
    
    // 🎯 MODAL: Carrega TODOS os cargos (para outras jurisdições) - MANTÉM ORDEM ORIGINAL
    const cargos = CARGOS_COMPLETOS_MODAL.slice(); // Remove .sort() para manter ordem original
    console.log('📋 Cargos completos disponíveis no modal:', cargos.length, 'cargos');
    
    cargoSelect.innerHTML = '<option value="">Selecione o cargo...</option>' +
      cargos.map(cargo => `<option value="${cargo}">${cargo}</option>`).join('');
    
    console.log('✅ Cargos completos carregados no modal:', cargos.length);
    
    // Verifica se os options foram realmente adicionados
    const options = cargoSelect.querySelectorAll('option');
    console.log('🔍 Options encontrados:', options.length);
    
  } catch (error) {
    console.error('❌ Erro ao carregar cargos no modal:', error);
    const cargoSelect = document.getElementById('gsCargo');
    if (cargoSelect) {
      cargoSelect.innerHTML = '<option value="">Erro ao carregar cargos</option>';
    }
  }
}

async function carregarInstrumentosModal() {
  try {
    console.log('🔄 Iniciando carregamento de instrumentos...');
    const instrumentoSelect = document.getElementById('gsInstrumento');
    if (!instrumentoSelect) {
      console.error('❌ Elemento gsInstrumento não encontrado!');
      return;
    }
    
    console.log('✅ Elemento gsInstrumento encontrado');
    
    // Carrega os instrumentos fixos do sistema
    const instrumentos = INSTRUMENTS_FIXED.slice();
    console.log('🎵 Instrumentos disponíveis:', instrumentos);
    
    instrumentoSelect.innerHTML = '<option value="">Selecione o instrumento...</option>' +
      instrumentos.map(instrumento => `<option value="${instrumento}">${instrumento}</option>`).join('');
    
    console.log('✅ Instrumentos carregados no modal:', instrumentos.length);
    
    // Verifica se os options foram realmente adicionados
    const options = instrumentoSelect.querySelectorAll('option');
    console.log('🔍 Options encontrados:', options.length);
    
  } catch (error) {
    console.error('❌ Erro ao carregar instrumentos no modal:', error);
    const instrumentoSelect = document.getElementById('gsInstrumento');
    if (instrumentoSelect) {
      instrumentoSelect.innerHTML = '<option value="">Erro ao carregar instrumentos</option>';
    }
  }
}

function inicializarModal() {
  console.log('🎹 Inicializando modal...');
  
  // Carrega cargos e instrumentos quando o modal é aberto
  const modal = document.getElementById('modalNovaComum');
  if (!modal) {
    console.error('❌ Modal modalNovaComum não encontrado!');
    return;
  }
  
  console.log('✅ Modal encontrado, configurando eventos...');
  
  // 🔧 CORREÇÃO DE ACESSIBILIDADE: Configuração inicial do modal
  modal.setAttribute('aria-modal', 'false');
  modal.removeAttribute('aria-hidden');
  
  modal.addEventListener('show.bs.modal', function () {
    console.log('🎹 Modal aberto - carregando dados...');
    console.log('📱 User Agent:', navigator.userAgent);
    console.log('📱 É mobile?', /Mobile|Android|iPhone|iPad/.test(navigator.userAgent));
    
    // 🔧 CORREÇÃO DE ACESSIBILIDADE: Configura atributos corretos quando modal abre
    modal.removeAttribute('aria-hidden');
    modal.setAttribute('aria-modal', 'true');
    
    // Carrega dados com delay para garantir que o modal está totalmente renderizado
    setTimeout(() => {
      console.log('🔄 Carregando cargos...');
      carregarCargosModal();
    }, 100);
    
    setTimeout(() => {
      console.log('🔄 Carregando instrumentos...');
      carregarInstrumentosModal();
    }, 200);
    
    // Melhorias específicas para iOS
    const isIOS = /iPad|iPhone|iPod|iOS/.test(navigator.userAgent) || 
                  /iPhone|iPad|iPod/.test(navigator.platform) ||
                  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    
    if (isIOS) {
      console.log('🍎 iOS: Aplicando melhorias no modal');
      
      // Corrige problema de scroll no modal
      const modalContent = modal.querySelector('.modal-content');
      if (modalContent) {
        modalContent.style.webkitOverflowScrolling = 'touch';
      }
      
      // Melhora área de toque para inputs
      const inputs = modal.querySelectorAll('input, select');
      inputs.forEach(input => {
        input.style.minHeight = '48px';
        input.style.fontSize = '16px';
      });
    }
  });
  
  // 🔧 CORREÇÃO DE ACESSIBILIDADE: Evento quando modal está sendo escondido
  modal.addEventListener('hide.bs.modal', function () {
    // Remove foco de qualquer elemento dentro do modal antes de fechar
    const focusedElement = modal.querySelector(':focus');
    if (focusedElement) {
      focusedElement.blur();
    }
  });
    
    // Limpa campos quando modal é fechado
    modal.addEventListener('hidden.bs.modal', function () {
      console.log('🎹 Modal fechado - limpando campos...');
      
      // 🔧 CORREÇÃO DE ACESSIBILIDADE: Remove aria-hidden e restaura acessibilidade
      modal.removeAttribute('aria-hidden');
      modal.setAttribute('aria-modal', 'false');
      
      // Remove foco de qualquer elemento dentro do modal
      const focusedElement = modal.querySelector(':focus');
      if (focusedElement) {
        focusedElement.blur();
      }
      
      // Limpa todos os campos
      const campos = ['gsComum', 'gsCidade', 'gsCargo', 'gsInstrumento', 'gsClasse', 'gsNome'];
      campos.forEach(id => {
        const campo = document.getElementById(id);
        if (campo) campo.value = '';
      });
      
      // Reseta exibição dos campos
      const instrumentoContainer = document.getElementById('instrumentoContainer');
      const classeContainer = document.getElementById('classeContainer');
      if (instrumentoContainer) instrumentoContainer.style.display = 'block';
      if (classeContainer) classeContainer.style.display = 'none';
    });
  
  // Evento para controlar campos baseado no cargo selecionado
  const cargoSelect = document.getElementById('gsCargo');
  if (cargoSelect) {
    cargoSelect.addEventListener('change', function() {
      controlarCamposModal(this.value);
    });
  }
  
  // Evento para salvar dados do modal
  const btnSalvarGS = document.getElementById('btnSalvarGS');
  if (btnSalvarGS) {
    btnSalvarGS.addEventListener('click', async function() {
      await enviarDadosModal();
    });
  }
}

function controlarCamposModal(cargoSelecionado) {
  const instrumentoContainer = document.getElementById('instrumentoContainer');
  const classeContainer = document.getElementById('classeContainer');
  const instrumentoSelect = document.getElementById('gsInstrumento');
  const classeSelect = document.getElementById('gsClasse');
  
  if (!instrumentoContainer || !classeContainer || !instrumentoSelect || !classeSelect) {
    console.warn('⚠️ Elementos do modal não encontrados');
    return;
  }
  
  const cargoUP = ucase(cargoSelecionado);
  const isOrganista = cargoUP === 'ORGANISTA';
  const isExaminadora = cargoUP === 'EXAMINADORA';
  const isSecretariaMusica = cargoSelecionado.toLowerCase().includes('secretária') && cargoSelecionado.toLowerCase().includes('música');
  const isOrganistaOuRelacionado = isOrganista || isExaminadora || isSecretariaMusica;
  
  console.log('🎹 Controlando campos do modal:', { cargoSelecionado, cargoUP, isOrganista, isExaminadora, isSecretariaMusica });
  
  if (isOrganistaOuRelacionado) {
    // Para Organista ou Examinadora: oculta instrumento e mostra classe
    instrumentoContainer.style.display = 'none';
    classeContainer.style.display = 'block';
    
    // Preenche automaticamente com ÓRGÃO
    instrumentoSelect.value = 'ÓRGÃO';
    
    console.log(`🎹 ${cargoSelecionado} selecionado - campo de classe ativado`);
  } else {
    // Para outros cargos: mostra instrumento e oculta classe
    instrumentoContainer.style.display = 'block';
    classeContainer.style.display = 'none';
    
    // Limpa o campo de classe
    classeSelect.value = '';
    
    console.log('🎹 Outro cargo selecionado - campo de instrumento ativado');
  }
}

async function enviarDadosModal() {
  try {
    const comum = document.getElementById('gsComum').value.trim();
    const cidade = document.getElementById('gsCidade').value.trim();
    const cargo = document.getElementById('gsCargo').value.trim();
    const instrumento = document.getElementById('gsInstrumento').value.trim();
    const classe = document.getElementById('gsClasse').value.trim();
    const nome = document.getElementById('gsNome').value.trim();
    
    // Validação básica
    if (!comum || !cidade || !cargo || !nome) {
      showToast('error', 'Campos Obrigatórios', 'Preencha todos os campos obrigatórios', 3000);
      return;
    }
    
    // Validação específica para organistas e cargos relacionados
    const cargoUP = ucase(cargo);
    const isOrganista = cargoUP === 'ORGANISTA';
    const isOrganistaOuRelacionado = cargoUP === 'ORGANISTA' || 
                                    cargoUP === 'EXAMINADORA' || 
                                    cargoUP === 'INSTRUTOR' ||
                                    cargoUP === 'INSTRUTORA' ||
                                    (cargo.toLowerCase().includes('secretária') && cargo.toLowerCase().includes('música'));
    
    if (isOrganistaOuRelacionado && !classe) {
      showToast('error', 'Classe Obrigatória', 'Selecione a classe da organista', 3000);
      return;
    }
    
    // Validação específica para músicos (não organistas)
    if (!isOrganista && cargo.toLowerCase().includes('músico') && !instrumento) {
      showToast('error', 'Instrumento Obrigatório', 'Selecione um instrumento para músicos', 3000);
      return;
    }
    
    // Verifica conectividade antes de tentar enviar
    const isOnline = await checkSupabaseConnection();
    console.log('🔍 Status de conexão no modal:', isOnline ? 'Online' : 'Offline');
    
    // Desabilita o botão
    const btnSalvarGS = document.getElementById('btnSalvarGS');
    btnSalvarGS.disabled = true;
    btnSalvarGS.innerHTML = '<i class="fa-solid fa-spinner fa-spin me-1"></i>Enviando...';
    
    if (!isOnline) {
      // Modo offline - salva na fila local
      console.log('📵 Modo offline no modal - salvando na fila local');
      
      const dadosModal = {
        "UUID": uuidv4(),
        "NOME COMPLETO": nome,
        "COMUM": comum,
        "CIDADE": cidade,
        "CARGO": cargo,
        "INSTRUMENTO": isOrganista ? "ÓRGÃO" : (instrumento || ""),
        "NAIPE_INSTRUMENTO": isOrganista ? "TECLADO" : (instrumento ? getNaipeByInstrumento(instrumento) : ""),
        "CLASSE_ORGANISTA": isOrganista ? classe : "",
        "LOCAL_ENSAIO": localStorage.getItem('session_local') || "",
        "DATA_ENSAIO": new Date().toLocaleDateString('pt-BR'),
        "REGISTRADO_POR": localStorage.getItem('current_user_name') || "Sistema",
        "USER_ID": localStorage.getItem('current_user_id') || "",
        "ANOTACOES": "Cadastro via modal offline"
      };
      
      // Padroniza todos os dados em maiúscula
      const dadosModalPadronizados = padronizarDadosMaiuscula(dadosModal);
      
      // Salva na fila local
      pushQueue(dadosModalPadronizados);
      
      // Fecha modal e limpa campos
      const modal = bootstrap.Modal.getInstance(document.getElementById('modalNovaComum'));
      if (modal) modal.hide();
      
      showToast('warning', 'Salvo offline', 'Dados salvos na fila para envio posterior', 4000);
      return;
    }
    
    // Prepara dados para envio no mesmo formato do sistema principal
    const dadosModal = {
      "UUID": uuidv4(),
      "NOME COMPLETO": nome,
      "COMUM": comum,
      "CIDADE": cidade,
      "CARGO": cargo,
      "INSTRUMENTO": isOrganistaOuRelacionado ? "ÓRGÃO" : (instrumento || ""),
      "NAIPE_INSTRUMENTO": isOrganistaOuRelacionado ? "TECLADO" : (instrumento ? getNaipeByInstrumento(instrumento) : ""),
      "CLASSE_ORGANISTA": isOrganistaOuRelacionado ? classe : "",
      "LOCAL_ENSAIO": localStorage.getItem('session_local') || "",
      "DATA_ENSAIO": new Date().toLocaleDateString('pt-BR'),
      "REGISTRADO_POR": localStorage.getItem('current_user_name') || "Sistema",
      "USER_ID": localStorage.getItem('current_user_id') || "",
      "ANOTACOES": "Cadastro fora da Regional"
    };
    
    // Validação adicional dos dados
    console.log('🔍 Validação dos dados do modal:');
    console.log('🔍 Nome:', nome, 'Válido:', !!nome);
    console.log('🔍 Comum:', comum, 'Válido:', !!comum);
    console.log('🔍 Cidade:', cidade, 'Válido:', !!cidade);
    console.log('🔍 Cargo:', cargo, 'Válido:', !!cargo);
    console.log('🔍 isOrganista:', isOrganista);
    console.log('🔍 Instrumento:', instrumento);
    console.log('🔍 Classe:', classe);
    
    // Verifica se todos os campos obrigatórios estão preenchidos
    if (!nome || !comum || !cidade || !cargo) {
      throw new Error('Campos obrigatórios não preenchidos');
    }
    
    // Padroniza todos os dados em maiúscula
    const dadosModalPadronizados = padronizarDadosMaiuscula(dadosModal);
    
    console.log('📤 Enviando dados do modal:', dadosModalPadronizados);
    console.log('📤 Dados brutos coletados:', {
      comum, cidade, cargo, instrumento, classe, nome, isOrganista
    });
    
    // Envia para Google Sheets usando a mesma função do sistema principal
    const requestBody = { 
      op: 'append', 
      sheet: 'Dados', 
      data: dadosModalPadronizados 
    };
    
    console.log('📤 Request body completo:', requestBody);
    
    const response = await fetch("https://script.google.com/macros/s/AKfycbxPtvi86jPy7y41neTpIPvn3hpycd3cMjbgjgifzLD6qRwrJVPlF9EDulaQp42nma-i/exec", {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8'
      },
      body: JSON.stringify(requestBody)
    });
    
    if (response.ok) {
      console.log('✅ Google Sheets: Dados enviados com sucesso');
      
      // Agora envia para o Supabase também
      if (supabaseLoaded && sb) {
        try {
          // Prepara payload no formato esperado pelo Supabase
      const payloadSupabase = {
        uuid: dadosModalPadronizados["UUID"],
        nome: dadosModalPadronizados["NOME COMPLETO"],
        comum: dadosModalPadronizados["COMUM"],
        cidade: dadosModalPadronizados["CIDADE"] || null, // Campo cidade adicionado
        cargo: dadosModalPadronizados["CARGO"],
        instrumento: dadosModalPadronizados["INSTRUMENTO"] || null,
        naipe: dadosModalPadronizados["NAIPE_INSTRUMENTO"] || null,
        nivel: dadosModalPadronizados["CLASSE_ORGANISTA"] || null,
        local_ensaio: dadosModalPadronizados["LOCAL_ENSAIO"] || null,
        data_ensaio: new Date().toISOString().split('T')[0], // Formato YYYY-MM-DD
        data_ensaio_iso: new Date().toISOString(),
        registrado_por: dadosModalPadronizados["REGISTRADO_POR"] || "Sistema",
        user_id: dadosModalPadronizados["USER_ID"] || "",
        created_at: new Date().toISOString(),
        anotacoes: dadosModalPadronizados["ANOTACOES"] || ""
      };
          
          console.log('📤 Enviando para Supabase:', payloadSupabase);
          await insertSupabase(payloadSupabase);
          console.log('✅ Supabase: Dados enviados com sucesso');
          
          // Mostra mensagem de sucesso
          showFastAlert('success', 'Enviado!', 'Registro salvo com sucesso');
        } catch (supabaseError) {
          console.warn('⚠️ Erro no Supabase:', supabaseError.message);
          // Mostra mensagem de sucesso mesmo com erro no Supabase
          showFastAlert('success', 'Enviado!', 'Registro salvo com sucesso');
        }
      } else {
        console.warn('⚠️ Supabase não disponível');
        // Mostra mensagem de sucesso mesmo sem Supabase
        showFastAlert('success', 'Enviado!', 'Registro salvo com sucesso');
      }
      
      // Limpa o formulário
      document.getElementById('gsComum').value = '';
      document.getElementById('gsCidade').value = '';
      document.getElementById('gsCargo').value = '';
      document.getElementById('gsInstrumento').value = '';
      document.getElementById('gsClasse').value = '';
      document.getElementById('gsNome').value = '';
      
      // Reseta a exibição dos campos
      document.getElementById('instrumentoContainer').style.display = 'block';
      document.getElementById('classeContainer').style.display = 'none';
      
      // Fecha o modal
      const modal = bootstrap.Modal.getInstance(document.getElementById('modalNovaComum'));
      if (modal) {
        modal.hide();
      }
    } else {
      // Se Google Sheets falhou, salva na fila local
      console.log('⚠️ Google Sheets falhou, salvando na fila local');
      pushQueue(dadosModalPadronizados);
      showFastAlert('warning', 'Salvo offline', 'Dados salvos na fila para envio posterior');
      
      // Fecha o modal
      const modal = bootstrap.Modal.getInstance(document.getElementById('modalNovaComum'));
      if (modal) {
        modal.hide();
      }
    }
    
  } catch (error) {
    console.error('❌ Erro ao enviar dados do modal:', error);
    showToast('error', 'Erro no Envio', 'Erro ao enviar dados para o Google Sheets', 3000);
  } finally {
    // Reabilita o botão
    const btnSalvarGS = document.getElementById('btnSalvarGS');
    btnSalvarGS.disabled = false;
    btnSalvarGS.innerHTML = '<i class="fa-solid fa-paper-plane me-1"></i>Enviar';
  }
}

/* ===== FUNÇÕES AUXILIARES ===== */

/* ===== ENVIO (Sheets → Supabase) ===== */
// 🚀 FUNÇÃO OTIMIZADA: Envio ultra-rápido para Google Sheets
async function enviarParaSheets(payload){
  const url = "https://script.google.com/macros/s/AKfycbxPtvi86jPy7y41neTpIPvn3hpycd3cMjbgjgifzLD6qRwrJVPlF9EDulaQp42nma-i/exec";
  
  // 🚀 OTIMIZAÇÃO: Construção direta do objeto sem logs
  const sheetRow = {
    "UUID": payload.uuid,
    "NOME COMPLETO": payload.nome,
    "COMUM": payload.comum,
    "CIDADE": payload.local || "",
    "CARGO": payload.cargo,
    "INSTRUMENTO": payload.instrumento || "",
    "NAIPE_INSTRUMENTO": payload.naipe || "",
    "CLASSE_ORGANISTA": payload.nivel || "",
    "LOCAL_ENSAIO": payload.local_ensaio || "",
    "DATA_ENSAIO": payload.data_ensaio || "",
    "REGISTRADO_POR": payload.registrado_por || "anon",
    "USER_ID": payload.user_id || "",
    "ANOTACOES": payload.anotacoes || ""
  };
  
  try {
    // 🚀 OTIMIZAÇÃO: Envio com timeout reduzido e sem retry
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 segundos timeout
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8'
      },
      body: JSON.stringify({ op: 'append', sheet: 'Dados', data: sheetRow }),
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    // Se a resposta é opaca (no-cors), considera sucesso
    if (response.type === 'opaque') {
      return { ok: true, method: 'no-cors' };
    }
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    // 🚀 OTIMIZAÇÃO: Não aguarda parsing JSON se não for necessário
    return { ok: true, method: 'success' };
    
  } catch (error) {
    // Se for erro de conectividade, salva na fila local
    if (error.name === 'AbortError' || error.message.includes('Failed to fetch')) {
      salvarNaFilaLocal(payload);
      throw new Error('Erro de conectividade - dados salvos na fila local');
    }
    
    throw error;
  }
}

// Função para atualizar indicador visual da fila Supabase (DESABILITADA)
function updateSupabaseQueueIndicator(count) {
  // Indicador visual removido por solicitação do usuário
  // O processamento em background continua funcionando normalmente
}

// Função para adicionar payload à fila Supabase (processamento em background)
function adicionarAFilaSupabase(payload) {
  try {
    const filaSupabase = JSON.parse(localStorage.getItem('fila_supabase') || '[]');
    filaSupabase.push({
      ...payload,
      timestamp: Date.now(),
      tentativas: 0
    });
    localStorage.setItem('fila_supabase', JSON.stringify(filaSupabase));
    
    // Atualiza indicador visual
    updateSupabaseQueueIndicator(filaSupabase.length);
    
    // Inicia processamento em background se não estiver rodando
    if (!window.supabaseProcessorRunning) {
      processarFilaSupabase();
    }
  } catch (error) {
    console.warn('⚠️ Erro ao adicionar à fila Supabase:', error);
  }
}

// Processador em background para Supabase
async function processarFilaSupabase() {
  if (window.supabaseProcessorRunning) return;
  
  window.supabaseProcessorRunning = true;
  
  try {
    const filaSupabase = JSON.parse(localStorage.getItem('fila_supabase') || '[]');
    
    if (filaSupabase.length === 0) {
      window.supabaseProcessorRunning = false;
      return;
    }
    
    console.log(`🔄 Processando fila Supabase: ${filaSupabase.length} item(s)`);
    
    const itensProcessados = [];
    const itensComErro = [];
    
    for (let i = 0; i < filaSupabase.length; i++) {
      const item = filaSupabase[i];
      
      try {
        await insertSupabase(item);
        itensProcessados.push(item);
        console.log(`✅ Supabase (Background): Item ${i + 1} processado`);
        
        // Pequena pausa para não sobrecarregar
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        console.warn(`⚠️ Supabase (Background): Erro no item ${i + 1}:`, error.message);
        
        // Incrementa tentativas
        item.tentativas = (item.tentativas || 0) + 1;
        
        // Se já tentou 3 vezes, remove da fila
        if (item.tentativas >= 3) {
          console.log(`🗑️ Supabase (Background): Item ${i + 1} removido após 3 tentativas`);
          itensProcessados.push(item);
        } else {
          itensComErro.push(item);
        }
      }
    }
    
    // Atualiza fila removendo itens processados
    localStorage.setItem('fila_supabase', JSON.stringify(itensComErro));
    
    console.log(`✅ Fila Supabase processada: ${itensProcessados.length} sucessos, ${itensComErro.length} pendentes`);
    
    // Atualiza indicador visual da fila
    updateSupabaseQueueIndicator(itensComErro.length);
    
    // Se ainda há itens pendentes, agenda próxima execução
    if (itensComErro.length > 0) {
      setTimeout(() => {
        window.supabaseProcessorRunning = false;
        processarFilaSupabase();
      }, 5000); // Tenta novamente em 5 segundos
    } else {
      window.supabaseProcessorRunning = false;
    }
    
  } catch (error) {
    console.error('❌ Erro no processador Supabase:', error);
    window.supabaseProcessorRunning = false;
  }
}

// Função para salvar dados na fila local quando há erro de conectividade
function salvarNaFilaLocal(payload) {
  try {
    // Busca fila existente
    let fila = JSON.parse(localStorage.getItem('fila_envio') || '[]');
    
    // Adiciona novo item à fila
    fila.push({
      ...payload,
      timestamp: new Date().toISOString(),
      tentativas: 0
    });
    
    // Salva fila atualizada
    localStorage.setItem('fila_envio', JSON.stringify(fila));
    
    console.log('💾 Dados salvos na fila local:', { 
      totalItens: fila.length, 
      ultimoItem: payload.nome 
    });
    
    // Atualiza contador na interface
    atualizarContadorFila();
    
  } catch (error) {
    console.error('❌ Erro ao salvar na fila local:', error);
  }
}

// Função para atualizar contador da fila na interface
function atualizarContadorFila() {
  try {
    const fila = JSON.parse(localStorage.getItem('fila_envio') || '[]');
    const contador = document.querySelector('.fila-contador');
    
    if (contador) {
      if (fila.length > 0) {
        contador.textContent = `${fila.length} na fila`;
        contador.style.display = 'block';
      } else {
        contador.style.display = 'none';
      }
    }
  } catch (error) {
    console.error('❌ Erro ao atualizar contador da fila:', error);
  }
}

// Função para testar conectividade com Google Sheets
async function testarConectividadeGoogleSheets() {
  try {
    console.log('🔍 Testando conectividade com Google Sheets...');
    
    const url = "https://script.google.com/macros/s/AKfycbxPtvi86jPy7y41neTpIPvn3hpycd3cMjbgjgifzLD6qRwrJVPlF9EDulaQp42nma-i/exec";
    
    // Teste simples com no-cors
    const response = await fetch(url, {
      method: 'POST',
      mode: 'no-cors',
      body: JSON.stringify({ op: 'test' })
    });
    
    console.log('✅ Conectividade com Google Sheets: OK');
    return true;
    
  } catch (error) {
    console.log('❌ Conectividade com Google Sheets: FALHOU', error.message);
    return false;
  }
}

// Função para processar fila local quando conexão voltar
async function processarFilaLocal() {
  try {
    const fila = JSON.parse(localStorage.getItem('fila_envio') || '[]');
    
    if (fila.length === 0) {
      console.log('📭 Fila vazia, nada para processar');
      return;
    }
    
    // Testa conectividade antes de processar
    const conectividadeOK = await checkSupabaseConnection();
    
    if (!conectividadeOK) {
      console.log('⚠️ Conectividade não estável, mantendo itens na fila');
      return;
    }
    
    console.log(`🔄 Processando fila local: ${fila.length} item(s)`);
    
    const itensProcessados = [];
    const itensComErro = [];
    
    for (let i = 0; i < fila.length; i++) {
      const item = fila[i];
      
      try {
        console.log(`📤 Processando item ${i + 1}/${fila.length}: ${item.nome}`);
        
        // Tenta enviar para Google Sheets
        await enviarParaSheets(item);
        console.log(`✅ Item ${i + 1}: Google Sheets OK`);
        
        // Tenta enviar para Supabase
        if (supabaseLoaded && sb) {
          try {
            await insertSupabase(item);
            console.log(`✅ Item ${i + 1}: Supabase OK`);
          } catch (e) {
            console.warn(`⚠️ Item ${i + 1}: Erro no Supabase:`, e.message);
          }
        }
        
        itensProcessados.push(item);
        
      } catch (error) {
        console.error(`❌ Item ${i + 1}: Erro:`, error.message);
        
        // Incrementa tentativas
        item.tentativas = (item.tentativas || 0) + 1;
        
        // Se já tentou 3 vezes, remove da fila
        if (item.tentativas >= 3) {
          console.log(`🗑️ Item ${i + 1}: Removido após 3 tentativas`);
          itensProcessados.push(item);
        } else {
          itensComErro.push(item);
        }
      }
    }
    
    // Atualiza fila removendo itens processados
    localStorage.setItem('fila_envio', JSON.stringify(itensComErro));
    
    console.log(`✅ Fila processada: ${itensProcessados.length} enviados, ${itensComErro.length} com erro`);
    
    // Atualiza contador
    atualizarContadorFila();
    
    if (itensProcessados.length > 0) {
      showToast('success', 'Fila processada', `${itensProcessados.length} registro(s) enviado(s) com sucesso!`, 3000);
    }
    
  } catch (error) {
    console.error('❌ Erro ao processar fila local:', error);
  }
}

async function insertSupabase(payload){
  if (!supabaseLoaded || !sb) {
    throw new Error('Supabase não disponível');
  }
  
  // Padroniza os dados antes de inserir no Supabase
  const payloadPadronizado = padronizarDadosMaiuscula(payload);
  
  // Usando os nomes corretos das colunas baseado no schema mostrado no console
  const row = {
    uuid: payloadPadronizado.uuid,
    nome_completo: payloadPadronizado.nome,
    comum: payloadPadronizado.comum,
    cidade: payloadPadronizado.cidade || null, // Campo cidade adicionado
    cargo: payloadPadronizado.cargo,
    instrumento: payloadPadronizado.instrumento || null,
    naipe_instrumento: payloadPadronizado.naipe || null,
    classe_organista: payloadPadronizado.nivel || null, // Classe da organista (vem do campo nivel do payload)
    local_ensaio: payloadPadronizado.local_ensaio || null,
    data_ensaio: payloadPadronizado.data_ensaio_iso || null, // Formato ISO para Supabase
    registrado_por: payloadPadronizado.registrado_por || null,
    // user_id removido - coluna não existe na tabela presencas
    created_at: payloadPadronizado.created_at
  };
  
  console.log('📤 Enviando para Supabase:', row);
  const { error } = await sb.from(TABLE_PRESENCAS).insert(row);
  if(error) {
    console.error('❌ Erro Supabase:', error);
    throw error;
  }
  console.log('✅ Dados salvos no Supabase com sucesso');
}

/* ===== SUBMIT / FILA OFFLINE ===== */
function uuidv4() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = crypto.getRandomValues(new Uint8Array(1))[0] & 15;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

const QUEUE_KEY = 'fila_presencas_v2';
function pushQueue(item) {
  const arr = JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
  arr.push(item);
  localStorage.setItem(QUEUE_KEY, JSON.stringify(arr));
  updateQueueCount(true); // Mostra notificação quando adiciona à fila
}

function updateQueueCount(showNotification = false) {
  const queueCount = document.getElementById('queueCount');
  const queueNumber = document.getElementById('queueNumber');
  const statusText = document.getElementById('statusText');
  const statusIcon = document.getElementById('statusIcon');
  
  if (queueCount && queueNumber) {
    const arr = JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
    const count = arr.length;
    
    if (count > 0) {
      queueNumber.textContent = count;
      queueCount.style.display = 'inline-flex';
      
      // Atualiza o status para mostrar sincronização pendente (mais limpo em mobile)
      if (statusText && statusIcon) {
        // Em mobile, mostra apenas o número na fila, sem texto extra
        const isMobile = window.innerWidth <= 768;
        if (isMobile) {
          statusText.textContent = `${count}`;
          statusIcon.className = 'fa-solid fa-clock status-icon offline';
        } else {
        statusText.textContent = `${count} na fila`;
        statusIcon.className = 'fa-solid fa-clock status-icon offline';
        }
      }
      
      // Mostra notificação quando a fila aumenta (apenas se não for mobile para evitar spam)
      if (showNotification && count > 0 && window.innerWidth > 768) {
        showToast('warning', 'Registros em Fila', 
          `${count} registro${count > 1 ? 's' : ''} aguardando sincronização automática`, 3000);
      }
      
      console.log(`📋 Fila atualizada: ${count} registro(s) pendente(s)`);
    } else {
      queueCount.style.display = 'none';
      
      // Restaura o status normal
      if (statusText && statusIcon) {
        const isOnline = navigator.onLine;
        statusText.textContent = isOnline ? 'Online' : 'Offline';
        statusIcon.className = isOnline ? 'fa-solid fa-wifi status-icon online' : 'fa-solid fa-wifi-slash status-icon offline';
      }
      
      console.log('📋 Fila vazia - status normal');
    }
  }
}

// 🚀 FUNÇÃO OTIMIZADA: Processamento rápido da fila
async function flushQueue() {
  const arr = JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
  if (!arr.length) return;
  
  const rest = [];
  
  // 🚀 OTIMIZAÇÃO: Processamento em paralelo (máximo 3 simultâneos)
  const chunks = [];
  for (let i = 0; i < arr.length; i += 3) {
    chunks.push(arr.slice(i, i + 3));
  }
  
  for (const chunk of chunks) {
    const promises = chunk.map(async (payload) => {
      try {
        await enviarParaSheets(payload);
        return { success: true, payload };
      } catch (e) {
        return { success: false, payload };
      }
    });
    
    const results = await Promise.allSettled(promises);
    
    results.forEach(result => {
      if (result.status === 'fulfilled' && !result.value.success) {
        rest.push(result.value.payload);
      }
    });
  }
  
  // Salvar apenas os itens que falharam
  localStorage.setItem(QUEUE_KEY, JSON.stringify(rest));
  updateQueueCount();
  
  if (rest.length === 0) {
    console.log('✅ Todos os itens da fila foram enviados com sucesso');
  } else {
    console.log(`⚠️ ${rest.length} item(s) permanecem na fila`);
  }
}

function getFieldValue(el) {
  if (!el) return '';
  return (el.value || '').trim();
}

// NOVA FUNCIONALIDADE: Verifica e corrige cargo automaticamente
async function verificarECorrigirCargo(nomeCompleto, comum, instrumento, cargoAtual) {
  try {
    // Só verifica se o cargo atual é "Músico" e há instrumento
    const cargoUP = ucase(cargoAtual);
    if (!cargoUP.includes('MÚSICO') || !instrumento) {
      console.log('🔍 Não precisa verificar cargo:', { cargoAtual, instrumento });
      return cargoAtual; // Não precisa verificar
    }
    
    console.log('🔍 VERIFICAÇÃO DE CARGO - Iniciando:', { nomeCompleto, comum, instrumento, cargoAtual });
    
    // Verifica se há conexão com Supabase
    if (!supabaseLoaded || !sb) {
      console.log('⚠️ Supabase não disponível para verificação de cargo');
      return cargoAtual;
    }
    
    // BUSCA SIMPLES: Nome + Comum (sem filtro de cargo ou instrumento)
    console.log('🔍 Fazendo busca simples por nome e comum...');
    const { data, error } = await sb
      .from(TABLE_CATALOGO)
      .select('cargo, instrumento, nome, comum')
      .ilike('nome', `%${nomeCompleto}%`)
      .ilike(COL_COMUM, `%${comum}%`)
      .limit(10);
    
    if (error) {
      console.warn('⚠️ Erro ao verificar cargo no banco:', error.message);
      return cargoAtual;
    }
    
    console.log('🔍 RESULTADOS DA BUSCA:', {
      totalResultados: data?.length || 0,
      resultados: data,
      nomeBuscado: nomeCompleto,
      comumBuscada: comum
    });
    
    if (data && data.length > 0) {
      // 🛡️ CORREÇÃO: Procura por cargos especiais com diferenciação de gênero
      const cargoEspecial = data.find(r => {
        const cargoUpper = r.cargo ? r.cargo.toUpperCase() : '';
        
        // Cargos que devem ser detectados (incluindo diferenciação de gênero)
        const isInstrutor = cargoUpper.includes('INSTRUTOR') && !cargoUpper.includes('INSTRUTORA');
        const isInstrutora = cargoUpper.includes('INSTRUTORA');
        const isOrganista = cargoUpper.includes('ORGANISTA');
        const isExaminadora = cargoUpper.includes('EXAMINADORA');
        const isSecretariaMusica = cargoUpper.includes('SECRETÁRIA') && cargoUpper.includes('MÚSICA');
        
        // 🚨 CORREÇÃO CRÍTICA: SECRETÁRIO DA MÚSICA (masculino) NÃO deve ser detectado como cargo especial
        // pois não deve receber classe de organista
        
        return isInstrutor || isInstrutora || isOrganista || isExaminadora || isSecretariaMusica;
      });
      
      if (cargoEspecial) {
        console.log('🎓 CARGO ESPECIAL ENCONTRADO:', cargoEspecial);
        console.log('🎓 CORRIGINDO CARGO DE', cargoAtual, 'PARA', cargoEspecial.cargo);
        return cargoEspecial.cargo;
      } else {
        console.log('🔍 Nenhum cargo especial encontrado nos resultados');
        console.log('🔍 Cargos encontrados:', data.map(r => r.cargo));
      }
    }
    
    console.log('✅ Cargo "Músico" está correto - não é cargo especial');
    return cargoAtual;
    
  } catch (error) {
    console.warn('⚠️ Erro na verificação de cargo:', error.message);
    return cargoAtual;
  }
}

async function collectFormData() {
  const comumEl = findComumField();
  const instEl  = findInstrumentField();
  const cargoEl = findCargoField();
  const nomeEl  = findNomeField();
  const anotEl  = document.querySelector('#anotacoes, [name="anotacoes"], textarea');
  const nivelEl = document.querySelector('#nivel, [name="nivel"], input[placeholder*="classe"], input[placeholder*="nivel"]');

  const comum = getFieldValue(comumEl);
  let cargo = getFieldValue(cargoEl);
  const instrumento = getFieldValue(instEl);
  const nomeCompleto = getFieldValue(nomeEl);
  const anotacoes = getFieldValue(anotEl);
  let nivel = getFieldValue(nivelEl);
  
  // Captura o cargo real armazenado nos atributos data se disponível
  console.log('🔍 DEBUG - Verificando atributo data-cargo-real:', {
    cargoEl: !!cargoEl,
    hasAttribute: cargoEl ? cargoEl.hasAttribute('data-cargo-real') : false,
    cargoOriginal: cargo
  });
  
  if (cargoEl && cargoEl.hasAttribute('data-cargo-real')) {
    const cargoReal = cargoEl.getAttribute('data-cargo-real');
    console.log('🎹 Cargo real capturado do atributo data-cargo-real:', cargoReal);
    cargo = cargoReal;
  } else {
    console.log('🔍 DEBUG - Nenhum cargo real encontrado, mantendo cargo original:', cargo);
  }
  
  // Captura o nível armazenado nos atributos data se o campo estiver vazio
  if (!nivel && cargoEl && cargoEl.hasAttribute('data-nivel-instrutor')) {
    nivel = cargoEl.getAttribute('data-nivel-instrutor');
    console.log('🎓 Nível capturado do atributo data-nivel-instrutor:', nivel);
    // Preenche o campo de nível se estiver vazio
    if (nivelEl && !nivelEl.value.trim()) {
      nivelEl.value = nivel;
    }
  }
  
  // CONSULTA SIMPLES: Se for Organista, verifica se é Instrutora, Examinadora ou Secretária no banco
  if (cargo && cargo.toUpperCase() === 'ORGANISTA' && nomeCompleto && comum) {
    try {
      console.log('🔍 CONSULTA SIMPLES - Verificando se Organista é Instrutora, Examinadora ou Secretária:', { nomeCompleto, comum });
      
      const { data } = await sb
        .from(TABLE_CATALOGO)
        .select('cargo, nivel')
        .ilike('nome', `%${nomeCompleto}%`)
        .ilike(COL_COMUM, `%${comum}%`)
        .or('cargo.ilike.%INSTRUTOR%,cargo.ilike.%EXAMINADORA%,cargo.ilike.%SECRETÁRIO (A) DA MÚSICA%,cargo.ilike.%SECRETÁRIO (A) DO GEM%')
        .limit(1);
      
      if (data && data.length > 0) {
        cargo = data[0].cargo;
        console.log('✅ CARGO CORRIGIDO - De Organista para:', cargo);
        
        // Captura o nível se disponível
        if (data[0].nivel) {
          console.log('✅ NÍVEL CAPTURADO para cargo musical:', data[0].nivel);
          // Armazena o nível no campo de nível se estiver vazio
          if (nivelEl && !nivelEl.value.trim()) {
            nivelEl.value = data[0].nivel;
          }
        }
      } else {
        console.log('✅ CARGO MANTIDO - É Organista mesmo');
      }
    } catch (e) {
      console.log('⚠️ Erro na consulta simples:', e.message);
    }
  }
  
  // CONSULTA SIMPLES: Se for Músico, verifica se é Instrutor, Encarregado ou Secretário no banco
  if (cargo && (cargo.toUpperCase() === 'MÚSICO' || cargo.toUpperCase() === 'MÚSICO(A)') && nomeCompleto && comum) {
    try {
      console.log('🔍 CONSULTA SIMPLES - Verificando se Músico é Instrutor, Encarregado ou Secretário:', { nomeCompleto, comum });
      
      // Primeiro faz uma busca ampla para debug
      const { data: debugData } = await sb
        .from(TABLE_CATALOGO)
        .select('cargo, nivel, nome, comum')
        .ilike('nome', `%${nomeCompleto}%`)
        .ilike(COL_COMUM, `%${comum}%`)
        .limit(5);
      
      console.log('🔍 DEBUG - Busca ampla para músico:', debugData);
      
      // Tenta diferentes variações do cargo Secretário da Música
      let data = null;
      
      // Primeiro tenta com a sintaxe exata
      const { data: data1 } = await sb
        .from(TABLE_CATALOGO)
        .select('cargo, nivel')
        .ilike('nome', `%${nomeCompleto}%`)
        .ilike(COL_COMUM, `%${comum}%`)
        .or('cargo.ilike.%INSTRUTOR%,cargo.ilike.%ENCARREGADO LOCAL%,cargo.ilike.%ENCARREGADO REGIONAL%,cargo.ilike.%SECRETÁRIO (A) DA MÚSICA%,cargo.ilike.%SECRETÁRIO (A) DO GEM%')
        .limit(1);
      
      if (data1 && data1.length > 0) {
        data = data1;
      } else {
        // Se não encontrou, tenta busca mais ampla
        const { data: data2 } = await sb
          .from(TABLE_CATALOGO)
          .select('cargo, nivel')
          .ilike('nome', `%${nomeCompleto}%`)
          .ilike(COL_COMUM, `%${comum}%`)
          .ilike('cargo', '%SECRETÁRIO%')
          .limit(1);
        
        if (data2 && data2.length > 0) {
          data = data2;
        } else {
          // Última tentativa: busca por qualquer cargo que não seja MÚSICO
          const { data: data3 } = await sb
            .from(TABLE_CATALOGO)
            .select('cargo, nivel')
            .ilike('nome', `%${nomeCompleto}%`)
            .ilike(COL_COMUM, `%${comum}%`)
            .not('cargo', 'ilike', '%MÚSICO%')
            .limit(1);
          
          data = data3;
        }
      }
      
      console.log('🔍 DEBUG - Resultado da consulta de cargo musical:', data);
      
      if (data && data.length > 0) {
        cargo = data[0].cargo;
        console.log('✅ CARGO CORRIGIDO - De Músico para:', cargo);
        
        // Captura o nível se disponível
        if (data[0].nivel) {
          console.log('✅ NÍVEL CAPTURADO para cargo musical:', data[0].nivel);
          // Armazena o nível no campo de nível se estiver vazio
          if (nivelEl && !nivelEl.value.trim()) {
            nivelEl.value = data[0].nivel;
          }
        }
      } else {
        console.log('✅ CARGO MANTIDO - É Músico mesmo');
      }
    } catch (e) {
      console.log('⚠️ Erro na consulta simples para músico:', e.message);
    }
  }
  
  // CONSULTA SIMPLES: Se for Instrutor, verifica se é Encarregado ou Secretário no banco
  if (cargo && (cargo.toUpperCase().includes('INSTRUTOR') || cargo.toUpperCase().includes('INSTRUTORA')) && nomeCompleto && comum) {
    try {
      console.log('🔍 CONSULTA SIMPLES - Verificando se Instrutor é Encarregado ou Secretário:', { nomeCompleto, comum });
      
      const { data } = await sb
        .from(TABLE_CATALOGO)
        .select('cargo, nivel')
        .ilike('nome', `%${nomeCompleto}%`)
        .ilike(COL_COMUM, `%${comum}%`)
        .or('cargo.ilike.%ENCARREGADO LOCAL%,cargo.ilike.%ENCARREGADO REGIONAL%,cargo.ilike.%SECRETÁRIO (A) DA MÚSICA%,cargo.ilike.%SECRETÁRIO (A) DO GEM%')
        .limit(1);
      
      if (data && data.length > 0) {
        cargo = data[0].cargo;
        console.log('✅ CARGO CORRIGIDO - De Instrutor para:', cargo);
        
        // Captura o nível se disponível
        if (data[0].nivel) {
          console.log('✅ NÍVEL CAPTURADO para cargo musical:', data[0].nivel);
          // Armazena o nível no campo de nível se estiver vazio
          if (nivelEl && !nivelEl.value.trim()) {
            nivelEl.value = data[0].nivel;
          }
        }
      } else {
        console.log('✅ CARGO MANTIDO - É Instrutor mesmo');
      }
    } catch (e) {
      console.log('⚠️ Erro na consulta simples para instrutor:', e.message);
    }
  }
  
  // CONSULTA SIMPLES: Se for Secretário da Música, verifica se é Encarregado no banco
  if (cargo && (cargo.toLowerCase().includes('secretário') || cargo.toLowerCase().includes('secretária')) && 
      (cargo.toLowerCase().includes('música') || cargo.toLowerCase().includes('musica')) && nomeCompleto && comum) {
    try {
      console.log('🔍 CONSULTA SIMPLES - Verificando se Secretário da Música é Encarregado:', { nomeCompleto, comum });
      
      const { data } = await sb
        .from(TABLE_CATALOGO)
        .select('cargo, nivel')
        .ilike('nome', `%${nomeCompleto}%`)
        .ilike(COL_COMUM, `%${comum}%`)
        .or('cargo.ilike.%ENCARREGADO LOCAL%,cargo.ilike.%ENCARREGADO REGIONAL%')
        .limit(1);
      
      if (data && data.length > 0) {
        cargo = data[0].cargo;
        console.log('✅ CARGO CORRIGIDO - De Secretário da Música para:', cargo);
        
        // Captura o nível se disponível
        if (data[0].nivel) {
          console.log('✅ NÍVEL CAPTURADO para cargo musical:', data[0].nivel);
          // Armazena o nível no campo de nível se estiver vazio
          if (nivelEl && !nivelEl.value.trim()) {
            nivelEl.value = data[0].nivel;
          }
        }
      } else {
        console.log('✅ CARGO MANTIDO - É Secretário da Música mesmo');
      }
    } catch (e) {
      console.log('⚠️ Erro na consulta simples para secretário da música:', e.message);
    }
  }
  
  // NOVA FUNCIONALIDADE: Correção automática de cargo (APENAS para Músico)
  const cargoUP = ucase(cargo);
  if (nomeCompleto && comum && instrumento && cargo && 
      (cargoUP === 'MÚSICO' || cargoUP === 'MÚSICO(A)')) {
    try {
      console.log('🔍 Correção de cargo - APENAS para Músico:', { nomeCompleto, comum, instrumento, cargo });
      
      // Busca se o músico é instrutor, encarregado ou secretário usando comum + nome + instrumento
      console.log('🔍 DEBUG - Fazendo consulta de correção de cargo:', {
        nome: `%${nomeCompleto}%`,
        comum: `%${comum}%`,
        instrumento: `%${instrumento}%`
      });
      
      // Primeiro, vamos fazer uma busca mais ampla para debug
      const { data: debugData, error: debugError } = await sb
        .from(TABLE_CATALOGO)
        .select('cargo, instrumento, nome, nivel, comum')
        .ilike('nome', `%${nomeCompleto}%`)
        .ilike(COL_COMUM, `%${comum}%`)
        .eq('ativo', true);
      
      console.log('🔍 DEBUG - Busca ampla para correção:', { debugData, debugError });
      
      // Agora fazemos a busca específica por cargos musicais
      const { data } = await sb
        .from(TABLE_CATALOGO)
        .select('cargo, instrumento, nome, nivel')
        .ilike('nome', `%${nomeCompleto}%`)
        .ilike(COL_COMUM, `%${comum}%`)
        .ilike('instrumento', `%${instrumento}%`)
        .or('cargo.ilike.%INSTRUTOR%,cargo.ilike.%ENCARREGADO LOCAL%,cargo.ilike.%ENCARREGADO REGIONAL%,cargo.ilike.%SECRETÁRIO (A) DA MÚSICA%,cargo.ilike.%SECRETÁRIO (A) DO GEM%')
        .eq('ativo', true)
        .limit(1);
      
      console.log('🔍 DEBUG - Resultado da consulta de correção:', { data });
      
      if (data && data.length > 0) {
        cargo = data[0].cargo;
        console.log('🎓 Cargo corrigido de Músico para:', cargo);
        
        // Captura o nível se disponível
        if (data[0].nivel) {
          console.log('🎓 NÍVEL CAPTURADO para cargo musical:', data[0].nivel);
          // Armazena o nível no campo de nível se estiver vazio
          if (nivelEl && !nivelEl.value.trim()) {
            nivelEl.value = data[0].nivel;
          }
        }
      } else {
        console.log('🔍 Músico comum - mantendo cargo "Músico"');
        console.log('🔍 DEBUG - Nenhum cargo musical encontrado para correção:', { nomeCompleto, comum, instrumento });
      }
    } catch (e) {
      console.log('🔍 Erro na correção de cargo:', e.message);
    }
  } else {
    console.log('🔍 Cargo não é Músico - mantendo cargo original:', cargo);
  }
  
  // NOVA FUNCIONALIDADE: Detecção automática de cargo musical para qualquer cargo se não foi detectado antes
  if (nomeCompleto && comum && instrumento && cargo && 
      !cargoEl.hasAttribute('data-cargo-real')) {
    try {
      console.log('🔍 Detecção automática de cargo musical - qualquer cargo:', { nomeCompleto, comum, instrumento, cargo });
      
      // Busca se a pessoa é instrutor, examinadora, encarregado ou secretária no banco
      const { data } = await sb
        .from(TABLE_CATALOGO)
        .select('cargo, instrumento, nome, nivel')
        .ilike('nome', `%${nomeCompleto}%`)
        .ilike(COL_COMUM, `%${comum}%`)
        .ilike('instrumento', `%${instrumento}%`)
        .or('cargo.ilike.%INSTRUTOR%,cargo.ilike.%EXAMINADORA%,cargo.ilike.%ENCARREGADO LOCAL%,cargo.ilike.%ENCARREGADO REGIONAL%,cargo.ilike.%SECRETÁRIO (A) DA MÚSICA%,cargo.ilike.%SECRETÁRIO (A) DO GEM%')
        .eq('ativo', true)
        .limit(1);
      
      console.log('🔍 DEBUG - Resultado da detecção automática:', { data });
      
      if (data && data.length > 0) {
        cargo = data[0].cargo;
        console.log('🎓 CARGO MUSICAL DETECTADO automaticamente - cargo corrigido para:', cargo);
        
        // Captura o nível se disponível
        if (data[0].nivel) {
          console.log('🎓 NÍVEL CAPTURADO para cargo musical:', data[0].nivel);
          // Armazena o nível no campo de nível se estiver vazio
          if (nivelEl && !nivelEl.value.trim()) {
            nivelEl.value = data[0].nivel;
          }
        }
      } else {
        console.log('🔍 Nenhum cargo musical encontrado na detecção automática');
      }
    } catch (e) {
      console.log('🔍 Erro na detecção automática de cargo musical:', e.message);
    }
  }
  
  // Verificação de duplicata obrigatória
  if (nomeCompleto && comum) {
    try {
      const duplicataEncontrada = await verificarDuplicata(nomeCompleto, comum);
      if (duplicataEncontrada) {
        return null; // Retorna null para indicar que o processo foi cancelado
      }
    } catch (error) {
      // Continua mesmo com erro na verificação
      // Continua o processo se houver erro técnico
    }
  }
  
  // Extrai nome e classe separadamente se for organista
  let nome = nomeCompleto;
  let classe = null;
  
  // Primeiro tenta capturar a classe do atributo data-classe (captura automática)
  if (nomeEl && nomeEl.hasAttribute('data-classe')) {
    classe = nomeEl.getAttribute('data-classe');
    console.log('🎹 Classe capturada do atributo data-classe:', classe);
  } else {
    console.log('🎹 Nenhuma classe encontrada no atributo data-classe para:', nomeCompleto);
    
  // Fallback: tenta extrair do nome se contiver (classe:)
    if (nomeCompleto && nomeCompleto.includes('(classe:')) {
    const match = nomeCompleto.match(/^(.+?)\s*\(classe:\s*(.+?)\)$/);
    if (match) {
      nome = match[1].trim();
      classe = match[2].trim();
      console.log('🎹 Classe extraída do nome:', classe);
      }
    }
  }

  if (!comum) throw new Error('Informe a Comum Congregação.');
  if (!cargo) throw new Error('Selecione o Cargo/Ministério.');
  
  // Se for organista ou cargo relacionado e não tiver classe, tenta buscar novamente
  const cargoUPFinal = ucase(cargo);
  const isOrganistaOuRelacionado = cargoUPFinal === 'ORGANISTA' || 
                                  cargoUPFinal === 'EXAMINADORA' || 
                                  cargoUPFinal === 'INSTRUTOR' ||
                                  cargoUPFinal === 'INSTRUTORA' ||
                                  (cargo.toLowerCase().includes('secretária') && cargo.toLowerCase().includes('música'));
  
  if (isOrganistaOuRelacionado && !classe) {
    console.log('🎹 Organista ou cargo relacionado sem classe, tentando buscar novamente...');
    
    // Busca a classe no cache ou faz consulta direta
    try {
      const cacheKey = `cache_nomes_${comum}_${instrumento || 'ORGAO'}_${cargo}`;
      const dadosCompletos = getCache(cacheKey + '_dados');
      
      if (dadosCompletos && dadosCompletos.length > 0) {
        const registro = dadosCompletos.find(r => 
          norm(r.nome).toLowerCase() === norm(nomeCompleto).toLowerCase()
        );
        
        if (registro && registro.nivel) {
          classe = registro.nivel;
          console.log('🎹 Classe encontrada no cache:', classe);
        }
      }
      
      // Se ainda não encontrou, faz consulta direta
      if (!classe && supabaseLoaded && sb) {
        const consultaDireta = await sb
          .from(TABLE_CATALOGO)
          .select('nome, nivel')
          .ilike('comum', `%${comum}%`)
          .ilike('nome', `%${nomeCompleto}%`)
          .or('cargo.ilike.%ORGANISTA%,cargo.ilike.%EXAMINADORA%,cargo.ilike.%INSTRUTORA%,cargo.ilike.%SECRETÁRIO (A) DA MÚSICA%,cargo.ilike.%SECRETÁRIO (A) DO GEM%')
          .eq('ativo', true)
          .limit(1);
        
        if (consultaDireta.data && consultaDireta.data.length > 0) {
          classe = consultaDireta.data[0].nivel;
          console.log('🎹 Classe encontrada via consulta direta:', classe);
        }
      }
    } catch (error) {
      console.warn('⚠️ Erro ao buscar classe:', error.message);
    }
  }
  const precisaInst = ['MUSICO','MUSICO(A)','MÚSICO','MÚSICO(A)'].includes(cargoUPFinal) ||
                      cargoUPFinal === 'ORGANISTA' ||
                      cargoUPFinal === 'EXAMINADORA' ||
                      cargoUPFinal === 'INSTRUTOR' ||
                      cargoUPFinal === 'INSTRUTORA' ||
                      (cargo.toLowerCase().includes('secretária') && cargo.toLowerCase().includes('música'));
  
  // Verifica se o campo instrumento está visível
  const instrumentoEl = findInstrumentField();
  const instrumentoContainer = instrumentoEl?.closest('.mb-3');
  const instrumentoVisivel = instrumentoContainer?.style.display !== 'none';
  
  if (precisaInst && !instrumento && instrumentoVisivel) {
    console.log('⚠️ Instrumento obrigatório não preenchido para cargo:', cargo);
    throw new Error('Selecione o Instrumento.');
  }
  if (!nome) throw new Error('Selecione/Informe o Nome.');

  let email = null;
  let nomeUsuario = null;
  let userId = null;
  
  try {
    if (supabaseLoaded && sb) {
      const { data } = await sb.auth.getUser();
      email = data?.user?.email || null;
      userId = data?.user?.id || null;
      
      // Armazena informações do usuário atual na sessão para múltiplos logins
      if (userId) {
        localStorage.setItem('current_user_id', userId);
        localStorage.setItem('current_user_email', email);
      }
      
      // Formata o nome do usuário a partir do email (sem consultar tabela profiles)
      if (email) {
        nomeUsuario = formatarNomeUsuario(email);
            localStorage.setItem('current_user_name', nomeUsuario);
        console.log('✅ Nome do usuário formatado:', nomeUsuario);
          console.log('👤 Usuário logado:', { email, userId, nomeUsuario });
      }
    } else {
      // Fallback para dados da sessão
      email = localStorage.getItem('current_user_email') || localStorage.getItem('session_user');
      userId = localStorage.getItem('current_user_id');
      nomeUsuario = localStorage.getItem('current_user_name') || email;
    }
  } catch (e) {
    // Fallback para dados da sessão em caso de erro
    email = localStorage.getItem('current_user_email') || localStorage.getItem('session_user');
    userId = localStorage.getItem('current_user_id');
    nomeUsuario = localStorage.getItem('current_user_name') || email;
  }

  // Obtém o naipe automaticamente baseado no instrumento (se houver instrumento)
  const naipe = instrumento ? getNaipeByInstrumento(instrumento) : null;
  
  // Valores finais coletados
  
  // Formata a data em formato brasileiro para Google Sheets
  const dataAtual = new Date();
  const dataFormatada = dataAtual.toLocaleDateString('pt-BR');
  
  // Formata a data em formato ISO para Supabase (YYYY-MM-DD)
  const dataFormatadaISO = dataAtual.toISOString().split('T')[0];
  
  // Obtém o local de ensaio da sessão
  const localEnsaio = localStorage.getItem('session_local');
  
  // Dados coletados com sucesso

  // Debug específico para Encarregado Local
  if (cargoUPFinal === 'ENCARREGADO LOCAL') {
    console.log('🔍 DEBUG Encarregado Local - ANTES da validação:', {
      cargo,
      cargoUPFinal,
      instrumento,
      precisaInst,
      isOrganistaOuRelacionado,
      instrumentoVisivel,
      instElValue: instEl?.value,
      instElVisible: instEl?.offsetParent !== null
    });
  }

  const payload = {
    uuid: uuidv4(),
    created_at: new Date().toISOString(),
    nome,
    comum,
    local: null,
    cargo,
    instrumento: instrumento || null,
    naipe: naipe,
    classe: isOrganistaOuRelacionado ? classe : null,
    nivel: isOrganistaOuRelacionado ? (classe || nivel) : null, // Classe para todos os cargos relacionados a organistas
    local_ensaio: localEnsaio,
    data_ensaio: dataFormatada, // Formato brasileiro para Google Sheets
    data_ensaio_iso: dataFormatadaISO, // Formato ISO para Supabase
    email,
    registrado_por: nomeUsuario,
    user_id: userId, // ID único do usuário para múltiplos logins
    anotacoes
  };
  
  // Padroniza todos os dados em maiúscula
  const payloadPadronizado = padronizarDadosMaiuscula(payload);
  
  // Debug específico para Encarregado Local - payload final
  if (cargoUPFinal === 'ENCARREGADO LOCAL') {
    console.log('🔍 DEBUG Encarregado Local - Payload Final:', {
      payloadOriginal: payload,
      payloadPadronizado: payloadPadronizado,
      instrumentoOriginal: payload.instrumento,
      instrumentoPadronizado: payloadPadronizado.instrumento,
      instElValueFinal: instEl?.value,
      instrumentoColetado: instrumento
    });
  }
  
  // Debug do payload final
  console.log('🔍 DEBUG - Payload final antes do envio:', {
    nomeCompleto,
    cargo,
    cargoUP,
    instrumento,
    payload: payload,
    payloadPadronizado: payloadPadronizado
  });
  
  // Payload final preparado
  
  return payloadPadronizado;
}

// Controle de concorrência por usuário para múltiplos registros simultâneos
const processingUsers = new Set();
const processingQueue = [];

async function handleSubmit(e){
  if (e && e.preventDefault) e.preventDefault();
  const btn = e?.target?.closest('button') || getSubmitButton();
  
  // ⏱️ CRONÔMETRO: Inicia medição de tempo
  const startTime = performance.now();
  console.log('⏱️ CRONÔMETRO: Iniciando envio...', new Date().toLocaleTimeString());
  
  // Controle de concorrência por usuário - permite múltiplos usuários simultâneos
  const currentUser = localStorage.getItem('current_user_name') || localStorage.getItem('session_user') || 'unknown';
  const userId = localStorage.getItem('current_user_id') || localStorage.getItem('session_user');
  
  // Se este usuário específico já está processando, aguarda
  if (processingUsers.has(userId)) {
    console.log('⏳ Usuário já está processando...', { user: currentUser, userId });
    showToast('info', 'Processando...', 'Aguarde seu registro anterior ser concluído.', 2000);
    return;
  }
  
  // Coleta dados do formulário
  const formData = await collectFormData();
  if (formData === null) {
    console.log('🔄 Processo cancelado - página será recarregada');
    return;
  }
  
  // Limpa dados antigos de proteção contra duplicata (se existirem)
  localStorage.removeItem('recent_submissions');
  
  // Adiciona este usuário à lista de processamento
  processingUsers.add(userId);
  processingQueue.push({ timestamp: Date.now(), user: currentUser, userId });
  
  // Envio otimizado - sem logs desnecessários

  try {
    if (btn) { btn.disabled = true; btn.dataset.loading = '1'; }
    
    const payload = formData;
    
    // 🚀 OTIMIZAÇÃO: Verificação rápida de conectividade
    if (!navigator.onLine) {
      pushQueue(payload);
      showFastAlert('warning', 'Salvo offline', 'Dados salvos para envio posterior');
      clearForm();
      return;
    }

    // 🚀 OTIMIZAÇÃO: Envio paralelo para Google Sheets e Supabase
    const [sheetsResult] = await Promise.allSettled([
      enviarParaSheets(payload),
      // Supabase em background (não bloqueia)
      supabaseLoaded && sb ? adicionarAFilaSupabase(payload) : Promise.resolve()
    ]);
    
    // Verifica se Google Sheets foi bem-sucedido
    if (sheetsResult.status === 'fulfilled') {
      showFastAlert('success', 'Enviado!', 'Registro salvo com sucesso');
    } else {
      // Fallback: salva na fila local
      pushQueue(payload);
      showFastAlert('error', 'Erro de envio', 'Dados salvos na fila local');
    }
    
    // 🚀 OTIMIZAÇÃO: Limpeza e foco imediato
    clearForm();
    const primeiroCampo = document.getElementById('comumInput');
    if (primeiroCampo) primeiroCampo.focus();
  } catch (err) {
    console.error('❌ Erro no envio:', err);
    // Erro capturado
    
    try {
      const payload = await collectFormData();
      
      // Verifica se é erro de conectividade
      if (err.message.includes('OFFLINE_DETECTED') || 
          err.message.includes('Erro de conectividade') ||
          err.message.includes('Failed to fetch') ||
          err.message.includes('network') ||
          err.name === 'TypeError') {
        pushQueue(payload);
        showToast('warning', 'Salvo offline', 'Sem conexão. Dados salvos na fila para envio posterior.', 4000);
      } else {
        showToast('error', 'Erro', err.message || 'Falha ao enviar.', 4000);
      }
    } catch (e2) {
      showToast('error', 'Erro', err.message || 'Falha ao enviar.', 4000);
    }
  } finally {
    // Libera processamento para este usuário específico
    processingUsers.delete(userId);
    
    // Remove este usuário da fila
    const userIndex = processingQueue.findIndex(item => item.userId === userId);
    if (userIndex !== -1) {
      processingQueue.splice(userIndex, 1);
    }
    
    if (btn) { btn.disabled = false; btn.dataset.loading = ''; }
    
    // ⏱️ CRONÔMETRO: Tempo total do processo
    const endTime = performance.now();
    const totalTime = endTime - startTime;
    console.log('⏱️ CRONÔMETRO: TEMPO TOTAL =', totalTime.toFixed(2), 'ms');
    console.log('⏱️ CRONÔMETRO: Processo concluído às', new Date().toLocaleTimeString());
  }
}

/* ===== LIMPAR FORMULÁRIO (OTIMIZADO) ===== */
// 🚀 FUNÇÃO OTIMIZADA: Limpeza ultra-rápida do formulário
function clearForm() {
  // Limpeza em lote para máxima performance
  const elementsToClear = [
    document.getElementById('formPresenca'),
    findNomeField(),
    document.querySelector('#anotacoes, [name="anotacoes"], textarea'),
    ...document.querySelectorAll('select')
  ];
  
  elementsToClear.forEach(el => {
    if (!el) return;
    
    if (el.tagName === 'FORM') {
      el.reset();
    } else if (el.tagName === 'SELECT') {
      if (el.options.length > 0) el.selectedIndex = 0;
    } else {
      el.value = '';
    }
  });
  
  // Limpa atributos de detecção automática
  const cargoEl = document.querySelector('[data-cargo-real]');
  if (cargoEl) {
    cargoEl.removeAttribute('data-cargo-real');
    cargoEl.removeAttribute('data-nivel-instrutor');
  }
}

/* ===== LOGOUT ===== */
async function handleLogout() {
  try {
    showToast('info', 'Saindo...', 'Encerrando sessão...', 2000);
    
    // Chrome iOS: limpar localStorage com fallback
    try {
      localStorage.removeItem('session_user');
      localStorage.removeItem('session_role');
      localStorage.removeItem('session_local');
      localStorage.removeItem('session_time');
    } catch (e) {
      console.warn('⚠️ Chrome iOS: Erro ao limpar localStorage:', e);
    }
    
    if (supabaseLoaded && sb) {
      try {
        await sb.auth.signOut();
      } catch (e) {
        console.warn('⚠️ Chrome iOS: Erro no signOut do Supabase:', e);
      }
    }
    
    // Chrome iOS: redirecionamento mais direto
    setTimeout(() => {
      try {
        window.location.href = './login.html';
      } catch (e) {
        console.warn('⚠️ Chrome iOS: Erro no redirecionamento, tentando novamente...');
        window.location.replace('./login.html');
      }
    }, 1000);
  } catch (error) {
    console.error('Erro no logout:', error);
    showToast('error', 'Erro no logout', 'Redirecionando mesmo assim...', 2000);
    setTimeout(() => {
      try {
        window.location.href = './login.html';
      } catch (e) {
        window.location.replace('./login.html');
      }
    }, 1000);
  }
}

/* ===== VERIFICAÇÃO DE SESSÃO ===== */
function checkSession() {
  const sessionUser = localStorage.getItem('session_user');
  const sessionTime = localStorage.getItem('session_time');
  
  if (!sessionUser || !sessionTime) {
    window.location.href = './login.html';
    return false;
  }
  
  const now = Date.now();
  const sessionAge = now - parseInt(sessionTime);
  const maxAge = 24 * 60 * 60 * 1000;
  
  if (sessionAge > maxAge) {
    localStorage.removeItem('session_user');
    localStorage.removeItem('session_role');
    localStorage.removeItem('session_local');
    localStorage.removeItem('session_time');
    window.location.href = './login.html';
    return false;
  }
  
  return true;
}

/* ===== VERIFICAÇÃO DE STATUS MASTER ===== */
async function verificarStatusMaster() {
  try {
    const sessionUser = localStorage.getItem('session_user');
    
    console.log('🔍 Verificando status master:');
    console.log('🔍 session_user:', sessionUser);
    console.log('🔍 Supabase disponível:', !!sb);
    
    if (!sessionUser) {
      console.log('❌ Nenhum usuário logado');
      return false;
    }
    
    // Verifica se Supabase está disponível
    if (!supabaseLoaded || !sb) {
      console.log('⚠️ Supabase não disponível - usando fallback');
      // Fallback: verifica se o email contém palavras-chave
      const isMaster = sessionUser.includes('master') || 
                       sessionUser.includes('admin') ||
                       sessionUser.includes('MASTER') ||
                       sessionUser.includes('ADMIN');
      console.log('👑 Status master (fallback):', isMaster);
      return isMaster;
    }
    
    console.log('🔍 Consultando tabela profiles no Supabase...');
    
    // Consulta a tabela profiles para verificar o role (apenas coluna role existe)
    const { data, error } = await sb
      .from('profiles')
      .select('role')
      .eq('email', sessionUser)
      .single();
    
    console.log('🔍 Resultado da consulta profiles:', { data, error });
    
    if (error) {
      console.error('❌ Erro ao consultar profiles:', error);
      // Fallback em caso de erro
      const isMaster = sessionUser.includes('master') || 
                       sessionUser.includes('admin') ||
                       sessionUser.includes('MASTER') ||
                       sessionUser.includes('ADMIN');
      console.log('👑 Status master (fallback por erro):', isMaster);
      return isMaster;
    }
    
    if (data) {
      const isMaster = data.role === 'master' || 
                       data.role === 'MASTER' ||
                       data.role === 'admin' ||
                       data.role === 'ADMIN';
      
      console.log('👑 Status master (Supabase):', isMaster);
      console.log('👑 Dados do usuário:', data);
      console.log('👑 Role encontrado:', data.role);
      return isMaster;
    }
    
    console.log('❌ Usuário não encontrado na tabela profiles');
    return false;
    
  } catch (error) {
    console.error('❌ Erro ao verificar status master:', error);
    return false;
  }
}

async function mostrarBotaoEdicao() {
  try {
    console.log('🔍 Iniciando mostrarBotaoEdicao...');
    
    const editBtn = document.getElementById('editBtn');
    console.log('🔍 Botão de edição encontrado:', !!editBtn);
    console.log('🔍 Elemento editBtn:', editBtn);
    
    if (!editBtn) {
      console.error('❌ Botão de edição não encontrado');
      return;
    }
    
    console.log('🔍 Botão encontrado, verificando status master...');
    const isMaster = await verificarStatusMaster();
    
    console.log('🔍 Resultado da verificação:', isMaster);
    console.log('🔍 Display atual do botão:', editBtn.style.display);
    
    if (isMaster) {
      editBtn.style.display = 'inline-flex';
      console.log('✅ Botão de edição exibido para usuário master');
      console.log('🔍 Display após mudança:', editBtn.style.display);
    } else {
      editBtn.style.display = 'none';
      console.log('❌ Botão de edição oculto - usuário não é master');
    }
  } catch (error) {
    console.error('❌ Erro ao mostrar botão de edição:', error);
  }
}

/* ===== TRATAMENTO SIMPLIFICADO DE USUÁRIO ===== */
function formatarNomeUsuario(email) {
  if (!email) return 'Usuário';
  
  // Remove caracteres especiais e formata o nome no formato "Nome Sobrenome"
  let nome = email.split('@')[0]
    .replace(/[._-]/g, ' ')           // Substitui pontos, underscores e hífens por espaços
    .replace(/\d+/g, '')              // Remove números
    .trim()
    .toLowerCase();                   // Converte para minúsculas primeiro
  
  // Se tem mais de 8 caracteres, tenta dividir automaticamente
  if (nome.length > 8) {
    // Casos especiais conhecidos
    if (nome.includes('secretaria') && nome.includes('regional') && nome.includes('itapevi')) {
      nome = 'secretaria regional itapevi';
    } else if (nome.includes('secretaria') && nome.includes('municipal')) {
      nome = 'secretaria municipal';
    } else if (nome.includes('coordenacao') && nome.includes('regional')) {
      nome = 'coordenacao regional';
    } else if (nome.includes('administracao') && nome.includes('municipal')) {
      nome = 'administracao municipal';
    } else if (nome.includes('secre') && nome.includes('tariaregionalitapevi')) {
      nome = 'secretaria regional itapevi';
    } else if (nome.includes('secre') && nome.includes('taria') && nome.includes('regional') && nome.includes('itapevi')) {
      nome = 'secretaria regional itapevi';
    } else {
      // Lista de palavras comuns em nomes para ajudar na divisão
      const palavrasComuns = [
        'secretaria', 'regional', 'municipal', 'estadual', 'federal',
        'administracao', 'administração', 'coordenacao', 'coordenação',
        'direcao', 'direção', 'gerencia', 'gerência', 'supervisao', 'supervisão',
        'assistencia', 'assistência', 'atendimento', 'suporte', 'tecnico', 'técnico',
        'analista', 'consultor', 'especialista', 'coordenador', 'gerente', 'diretor',
        'supervisor', 'assistente', 'auxiliar', 'operador', 'responsavel', 'responsável',
        'itapevi', 'sao', 'paulo', 'santos', 'campinas', 'guarulhos', 'santo', 'andre'
      ];
    
    // Primeiro, tenta encontrar palavras conhecidas no nome completo
    let melhorDivisao = null;
    let maiorScore = 0;
    
    // Testa diferentes pontos de divisão
    for (let i = 4; i < nome.length - 4; i++) {
      const parte1 = nome.substring(0, i);
      const parte2 = nome.substring(i);
      
      // Verifica se alguma das partes corresponde a uma palavra comum
      let score = 0;
      palavrasComuns.forEach(palavra => {
        if (parte1.includes(palavra) || parte2.includes(palavra)) {
          score += palavra.length;
        }
        // Bonus se a palavra está no início ou fim
        if (parte1.startsWith(palavra) || parte2.startsWith(palavra)) {
          score += 2;
        }
        // Bonus extra se a palavra está completa
        if (parte1 === palavra || parte2 === palavra) {
          score += 5;
        }
      });
      
      if (score > maiorScore) {
        maiorScore = score;
        melhorDivisao = { parte1, parte2 };
      }
    }
    
    // Se encontrou uma boa divisão, aplica
    if (melhorDivisao && maiorScore > 0) {
      nome = melhorDivisao.parte1 + ' ' + melhorDivisao.parte2;
      
      // Tenta dividir ainda mais se necessário
      const partes = nome.split(' ');
      if (partes.length === 2 && partes[1].length > 8) {
        const segundaParte = partes[1];
        let melhorDivisao2 = null;
        let maiorScore2 = 0;
        
        for (let i = 4; i < segundaParte.length - 4; i++) {
          const subParte1 = segundaParte.substring(0, i);
          const subParte2 = segundaParte.substring(i);
          
          let score2 = 0;
          palavrasComuns.forEach(palavra => {
            if (subParte1.includes(palavra) || subParte2.includes(palavra)) {
              score2 += palavra.length;
            }
            if (subParte1.startsWith(palavra) || subParte2.startsWith(palavra)) {
              score2 += 2;
            }
            if (subParte1 === palavra || subParte2 === palavra) {
              score2 += 5;
            }
          });
          
          if (score2 > maiorScore2) {
            maiorScore2 = score2;
            melhorDivisao2 = { subParte1, subParte2 };
          }
        }
        
        if (melhorDivisao2 && maiorScore2 > 0) {
          nome = partes[0] + ' ' + melhorDivisao2.subParte1 + ' ' + melhorDivisao2.subParte2;
        }
      }
    } else {
      // Fallback: divisão baseada em padrões linguísticos
      for (let i = 4; i < nome.length - 4; i++) {
        const char = nome[i];
        const nextChar = nome[i + 1];
        
        // Procura por transições que indicam início de nova palavra
        if ('aeiou'.includes(char) && !'aeiou'.includes(nextChar)) {
          // Verifica se não é muito no início nem muito no final
          if (i > 4 && i < nome.length - 4) {
            nome = nome.substring(0, i + 1) + ' ' + nome.substring(i + 1);
            break;
          }
        }
      }
    }
    }
  }
  
  // Divide em palavras e capitaliza
  const palavras = nome.split(' ')
    .filter(palavra => palavra.length > 0) // Remove palavras vazias
    .map(palavra => 
      palavra.charAt(0).toUpperCase() + palavra.slice(1)  // Capitaliza primeira letra de cada palavra
    );
  
  return palavras.join(' ') || 'Usuário';
}

/* ===== INFORMAÇÕES DO USUÁRIO ===== */
async function updateUserInfo() {
  const sessionUser = localStorage.getItem('session_user');
  const sessionLocal = localStorage.getItem('session_local');
  
  if (sessionUser) {
    // Formata o nome do usuário a partir do email
    const nomeUsuario = formatarNomeUsuario(sessionUser);
    
    // Atualiza o header com dados dinâmicos
    const headerLocation = document.getElementById('header-location');
    const headerUser = document.getElementById('header-user');
    
    if (headerLocation) {
      headerLocation.textContent = sessionLocal || 'Local do Ensaio';
    }
    
    if (headerUser) {
      headerUser.textContent = nomeUsuario;
    }
    
    console.log('✅ Header atualizado:', { local: sessionLocal, usuario: nomeUsuario });
    
    // Mantém compatibilidade com subtitle antigo (se existir)
    const subtitle = document.getElementById('subtitle');
    if (subtitle) {
      const locationInfo = subtitle.querySelector('.location-info');
      const userName = subtitle.querySelector('.user-name');
      
      if (locationInfo) {
        locationInfo.textContent = sessionLocal || 'Local do Ensaio';
      }
      
      if (userName) {
        userName.textContent = nomeUsuario;
      }
      
      console.log('✅ Subtitle atualizado:', { local: sessionLocal, usuario: nomeUsuario });
    }
    
    // Verifica status master após atualizar informações do usuário
    await mostrarBotaoEdicao();
  } else {
    console.log('❌ Nenhum usuário logado encontrado');
    
    // Define valores padrão se não houver sessão
    const headerLocation = document.getElementById('header-location');
    const headerUser = document.getElementById('header-user');
    
    if (headerLocation) {
      headerLocation.textContent = 'Local do Ensaio';
    }
    
    if (headerUser) {
      headerUser.textContent = 'Usuário';
    }
  }
}


/* ===== BOOT ===== */
window.addEventListener('load', async () => {
  console.log('🚀 Iniciando aplicação...');
  console.log('📱 User Agent:', navigator.userAgent);
  console.log('📱 Touch Support:', 'ontouchstart' in window);
  
  // Limpa cache de instrumentos antigo para garantir que ÓRGÃO apareça
  console.log('🧹 Limpando cache de instrumentos antigo para forçar atualização...');
  Object.keys(localStorage).forEach(key => {
    if (key.includes('instrument') || key.includes('INSTRUMENT')) {
      console.log('🗑️ Removendo cache:', key);
      localStorage.removeItem(key);
    }
  });
  console.log('📱 Online:', navigator.onLine);
  
  try {
    // Inicializa tema
    initTheme();
    console.log('✅ Tema inicializado');
    
    // Verifica sessão antes de carregar a aplicação
    if (!checkSession()) {
      console.log('❌ Sessão inválida');
      return;
    }
    console.log('✅ Sessão válida');
    
    // Inicializa Supabase
    await initSupabase();
    console.log('✅ Supabase inicializado');
    
    // Atualiza informações do usuário
    await updateUserInfo();
    console.log('✅ Informações do usuário atualizadas');
    
  // Inicializa contagem da fila
  updateQueueCount();
  console.log('✅ Contagem da fila inicializada');
  
  // Verifica status master e mostra botão de edição
  await mostrarBotaoEdicao();
  console.log('✅ Verificação de status master concluída');
  
  // Função temporária para definir status master (para teste)
  window.setMasterStatus = async function() {
    localStorage.setItem('user_status', 'master');
    console.log('👑 Status master definido manualmente');
    await mostrarBotaoEdicao();
  };
  
  // Função temporária para verificar localStorage
  window.checkLocalStorage = function() {
    console.log('🔍 LocalStorage atual:');
    Object.keys(localStorage).forEach(key => {
      console.log(`🔍 ${key}:`, localStorage.getItem(key));
    });
  };
  
  // Função temporária para testar consulta Supabase
  window.testSupabaseQuery = async function() {
    try {
      const sessionUser = localStorage.getItem('session_user');
      console.log('🔍 Testando consulta Supabase para:', sessionUser);
      
      if (!supabaseLoaded || !sb) {
        console.log('❌ Supabase não disponível');
        return;
      }
      
      const { data, error } = await sb
        .from('profiles')
        .select('role')
        .eq('email', sessionUser)
        .single();
      
      console.log('🔍 Resultado do teste:', { data, error });
      
      if (data) {
        console.log('✅ Usuário encontrado! Role:', data.role);
        console.log('👑 É master?', data.role === 'master');
      } else {
        console.log('❌ Usuário não encontrado ou erro:', error);
      }
    } catch (error) {
      console.error('❌ Erro no teste:', error);
    }
  };
  
  // Limpa cache de comuns para forçar recarregamento
  localStorage.removeItem(CACHE_KEYS.COMUNS);
  console.log('🗑️ Cache de comuns limpo');
  
  // Inicializa processamento da fila Supabase se houver itens pendentes
  const filaSupabase = JSON.parse(localStorage.getItem('fila_supabase') || '[]');
  if (filaSupabase.length > 0) {
    console.log(`🔄 Iniciando processamento de ${filaSupabase.length} item(s) na fila Supabase`);
    updateSupabaseQueueIndicator(filaSupabase.length);
    processarFilaSupabase();
  }
  
  // Listeners para eventos de conexão - Sistema Automático
  window.addEventListener('online', async () => {
    console.log('🌐 Evento online detectado - verificando conectividade real');
    
    // Aguardar um pouco para garantir que a conexão está estável
    setTimeout(async () => {
      try {
        const isReallyOnline = await checkSupabaseConnection();
        if (isReallyOnline) {
          console.log('✅ Conectividade real confirmada - processando fila');
          showToast('success', 'Conexão restaurada', 'Enviando registros pendentes...', 3000);
        await processarFilaLocal();
        console.log('✅ Fila processada automaticamente');
        } else {
          console.log('⚠️ Evento online falso - mantendo modo offline');
        }
      } catch (e) {
        console.error('❌ Erro ao verificar conectividade:', e);
      }
    }, 3000); // Aumentado para 3 segundos
  });
  
  // Sistema de processamento periódico da fila
  setInterval(async () => {
    try {
      const fila = JSON.parse(localStorage.getItem('fila_envio') || '[]');
      
      // Só processa se há itens na fila
      if (fila.length > 0) {
        console.log('🔄 Processamento periódico da fila...');
        
        // Verifica conectividade real antes de processar
        const isOnline = await checkSupabaseConnection();
        if (isOnline) {
        await processarFilaLocal();
        } else {
          console.log('📵 Sem conectividade real - mantendo fila');
        }
      }
    } catch (error) {
      console.error('❌ Erro no processamento periódico:', error);
    }
  }, 30000); // A cada 30 segundos
  
  window.addEventListener('offline', () => {
    console.log('📵 Conexão perdida - modo offline ativado');
    showToast('warning', 'Modo offline', 'Registros serão salvos na fila', 3000);
    setStatus(false, 'Offline…');
  });
  
  await checkSupabaseConnection();
  console.log('✅ Conexão verificada');
  
  // Sistema de verificação periódica para iOS (Chrome iOS tem problemas com eventos de conexão)
  const isIOS = /iPad|iPhone|iPod|iOS/.test(navigator.userAgent) || 
                /iPhone|iPad|iPod/.test(navigator.platform) ||
                (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  
  // Melhorias específicas para iOS
  if (isIOS) {
    console.log('🍎 iOS detectado - aplicando melhorias específicas');
    
    // Corrige problema de viewport no iOS
    const setViewportHeight = () => {
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty('--vh', `${vh}px`);
    };
    
    setViewportHeight();
    window.addEventListener('resize', setViewportHeight);
    window.addEventListener('orientationchange', () => {
      setTimeout(setViewportHeight, 100);
    });
    
    // Melhora eventos de toque
    document.addEventListener('touchstart', function() {}, { passive: true });
    document.addEventListener('touchmove', function() {}, { passive: true });
    
    // Corrige problema de scroll em modais
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
      modal.addEventListener('show.bs.modal', function() {
        document.body.style.position = 'fixed';
        document.body.style.width = '100%';
      });
      
      modal.addEventListener('hidden.bs.modal', function() {
        document.body.style.position = '';
        document.body.style.width = '';
      });
    });
  }
  
  if (isIOS) {
    console.log('🍎 iOS detectado - ativando verificação periódica de conexão');
    
    // Verificar conexão a cada 30 segundos
    setInterval(async () => {
      try {
        const wasOffline = !navigator.onLine;
        const connectionOk = await checkSupabaseConnection();
        
        // Se estava offline e agora está online, processar fila
        if (wasOffline && connectionOk) {
          console.log('🔄 iOS: Conexão detectada, processando fila automaticamente');
          await flushQueue();
        }
      } catch (e) {
        console.log('⚠️ iOS: Erro na verificação periódica:', e.message);
      }
    }, 30000); // 30 segundos
  }
  
  await loadComunsFromCatalog();
  console.log('✅ Comuns carregadas');
  
  loadInstrumentosFixed();
  console.log('✅ Instrumentos carregados');
  
  loadCargosFixed(); // Carrega cargos otimizados para app principal
  console.log('✅ Cargos carregados');
  
  // Inicializa sistema de pesquisa para comum
  initComumSearch();
  console.log('✅ Sistema de pesquisa para comum inicializado');

  const comumEl = findComumField();
  const instEl  = findInstrumentField();
  const cargoEl = findCargoField();

  if (comumEl) comumEl.addEventListener('change', loadNomes);
  if (instEl)  instEl.addEventListener('change',  loadNomes);
  if (cargoEl) {
    cargoEl.addEventListener('change', loadNomes);
    cargoEl.addEventListener('change', toggleInstrumentFieldVisibility);
  }
  

  loadNomes();
  
  // Define visibilidade inicial do campo instrumento
  toggleInstrumentFieldVisibility();

  const form = document.querySelector('form#formPresenca, form') || null;
  const btn  = getSubmitButton();
  if (form)  form.addEventListener('submit', handleSubmit);
  if (!form && btn) btn.addEventListener('click', handleSubmit);

  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', handleLogout);
  }

  const btnAbrirModal = document.getElementById('btnAbrirModal');
  if (btnAbrirModal) {
    btnAbrirModal.addEventListener('click', (e) => {
      e.preventDefault();
      if (typeof bootstrap !== 'undefined') {
        const modal = new bootstrap.Modal(document.getElementById('modalNovaComum'));
        modal.show();
      } else {
        showToast('warning', 'Modal não disponível', 'Bootstrap não carregado', 3000);
      }
    });
  }

  // Event listener para botão de edição (apenas para usuários master)
  const editBtn = document.getElementById('editBtn');
  if (editBtn) {
    editBtn.addEventListener('click', function() {
      console.log('📝 Redirecionando para página de edição...');
      window.location.href = './editar.html';
    });
  }

  // flushQueue(); // Desabilitado para melhorar performance
  
  // Atalhos de teclado
  document.addEventListener('keydown', (e) => {
    // Envio rápido (Ctrl+Enter ou Cmd+Enter)
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      const submitBtn = getSubmitButton();
      if (submitBtn && !submitBtn.disabled) {
        console.log('⚡ Envio rápido via teclado');
        submitBtn.click();
      }
    }
    
    // Foco no campo de comum (Ctrl+F ou Cmd+F)
    if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
      e.preventDefault();
      const comumInput = document.getElementById('comumInput');
      if (comumInput) {
        comumInput.focus();
        comumInput.select();
        console.log('🔍 Foco no campo de comum via teclado');
      }
    }
  });
  
  // Inicializa o modal
  inicializarModal();
  
  // Fallback: carrega dados do modal após 2 segundos se não foram carregados
  setTimeout(() => {
    const cargoSelect = document.getElementById('gsCargo');
    const instrumentoSelect = document.getElementById('gsInstrumento');
    
    if (cargoSelect && cargoSelect.innerHTML.includes('Carregando cargos')) {
      console.log('🔄 Fallback: Carregando cargos...');
      carregarCargosModal();
    }
    
    if (instrumentoSelect && instrumentoSelect.innerHTML.includes('Carregando instrumentos')) {
      console.log('🔄 Fallback: Carregando instrumentos...');
      carregarInstrumentosModal();
    }
  }, 2000);
  
  // Adiciona evento de clique no link do modal para forçar carregamento
  const modalLink = document.querySelector('[data-bs-target="#modalNovaComum"]');
  if (modalLink) {
    modalLink.addEventListener('click', function() {
      console.log('🔗 Link do modal clicado - forçando carregamento...');
      setTimeout(() => {
        carregarCargosModal();
        carregarInstrumentosModal();
      }, 100);
    });
  }
  
  console.log('🎉 Aplicação carregada com sucesso!');
  
  } catch (error) {
    console.error('❌ Erro ao carregar aplicação:', error);
    showToast('error', 'Erro de inicialização', 'Verifique o console para detalhes', 5000);
  }
});

// Função para limpar overlays no Android
function clearAndroidOverlays() {
  const isAndroid = /Android/.test(navigator.userAgent);
  if (isAndroid) {
    const overlays = document.querySelectorAll('.suggestions-overlay, #suggestionsOverlay');
    overlays.forEach(overlay => {
      overlay.remove();
      console.log('🤖 Overlay removido do Android');
    });
  }
}

// Limpa overlays no Android quando a página carrega
clearAndroidOverlays();

