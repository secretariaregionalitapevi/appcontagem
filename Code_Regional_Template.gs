/**
 * ============================================================================
 * CONFIGURACAO DINAMICA DAS PLANILHAS
 * ============================================================================
 */
function getTargetSpreadsheetId() {
  // 1. Tenta pegar das propriedades do script
  var id = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
  if (id) return id;

  // 2. Fallback: ID da planilha onde o script está rodando
  return SpreadsheetApp.getActiveSpreadsheet().getId();
}

// O ID principal agora é dinâmico
const DEFAULT_SHEET_ID = getTargetSpreadsheetId();

/**
 * Mapeamento opcional para espelhamento em outras planilhas.
 * Configure em "Propriedades do Script" com a chave "MIRROR_CONFIG"
 * Exemplo de valor: [{"nome":"Reserva", "id":"1abc..."}, {"nome":"Backup", "id":"1xyz..."}]
 */
function getMirrorTargets() {
  var config = PropertiesService.getScriptProperties().getProperty('MIRROR_CONFIG');
  if (config) {
    try {
      return JSON.parse(config);
    } catch (e) {
      console.error('Erro ao processar MIRROR_CONFIG: ' + e.message);
    }
  }
  return [];
}

/**
 * Cria o menu personalizado ao abrir a planilha
 */
function onOpen() {
  var ui = SpreadsheetApp.getUi();
  ui.createMenu('🔄 Atualizar Dados')
    .addItem('📊 Atualizar Dashboard', 'menuAtualizarDashboard')
    .addItem('🎹 Atualizar Organistas', 'menuAtualizarOrganistas')
    .addItem('👔 Atualizar Ministério', 'menuAtualizarMinisterio')
    .addSeparator()
    .addItem('📤 Alimentar Planilha Espelho', 'menuAlimentarEspelho')
    .addItem('📤 Alimentar Todas as Planilhas', 'menuAlimentarTodasAsPlanilhas')
    .addItem('🔄 Sincronização Completa', 'menuSincronizacaoCompleta')
    .addToUi();
}

function doGet() {
  return ContentService.createTextOutput("Backend Regional Ativo! Use POST para enviar dados.")
    .setMimeType(ContentService.MimeType.TEXT);
}

/**
 * Abre a planilha configurada ou cria a aba se não existir
 */
function appendRowToSheet(sheet, data) {
  var lastCol = sheet.getLastColumn();
  var headers;

  if (lastCol === 0) {
    headers = Object.keys(data);
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
  } else {
    headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  }

  var newRow = headers.map(function(header) {
    var val = data[header];
    if (val instanceof Date) {
      return Utilities.formatDate(val, Session.getScriptTimeZone(), 'dd/MM/yyyy HH:mm:ss');
    }
    return val !== undefined ? val : '';
  });

  var targetRow = getNextAvailableDataRow(sheet, newRow.length);
  sheet.getRange(targetRow, 1, 1, newRow.length).setValues([newRow]);
  return true;
}

function getNextAvailableDataRow(sheet, totalCols) {
  var numCols = Math.max(totalCols || 1, 1);
  var maxRows = sheet.getMaxRows();

  if (maxRows < 2) {
    sheet.insertRowsAfter(1, 1);
    return 2;
  }

  var values = sheet.getRange(2, 1, maxRows - 1, numCols).getDisplayValues();

  for (var i = 0; i < values.length; i++) {
    var row = values[i];
    var hasContent = row.some(function(cell) {
      return String(cell || '').trim() !== '';
    });

    if (!hasContent) {
      return i + 2;
    }
  }

  sheet.insertRowAfter(maxRows);
  return maxRows + 1;
}


/**
 * ============================================================================
 * COMANDOS DO MENU
 * ============================================================================
 */

function menuAtualizarDashboard() {
  try {
    var ui = SpreadsheetApp.getUi();
    ui.alert('⏳ Atualizando Dashboard... Por favor aguarde.');
    var result = atualizarDashboard();
    ui.alert('✅ Dashboard atualizado com sucesso!\n\nTotal de membros: ' + result.totalMembros);
  } catch (e) {
    SpreadsheetApp.getUi().alert('❌ Erro: ' + e.message);
  }
}

function menuAtualizarOrganistas() {
  try {
    var ui = SpreadsheetApp.getUi();
    ui.alert('⏳ Atualizando lista de Organistas... Por favor aguarde.');
    var result = atualizarAbaOrganistas();
    ui.alert('✅ Aba Organistas atualizada com sucesso!\n\nTotal de organistas: ' + result.totalOrganistas);
  } catch (e) {
    SpreadsheetApp.getUi().alert('❌ Erro: ' + e.message);
  }
}

function menuAtualizarMinisterio() {
  try {
    var ui = SpreadsheetApp.getUi();
    ui.alert('⏳ Atualizando aba Ministério... Por favor aguarde.');
    var result = atualizarAbaMinisterio();
    ui.alert('✅ Aba Ministério atualizada com sucesso!\n\nTotal ministerial: ' + result.totalMinisterio);
  } catch (e) {
    SpreadsheetApp.getUi().alert('❌ Erro: ' + e.message);
  }
}

function menuSincronizacaoCompleta() {
  try {
    var ui = SpreadsheetApp.getUi();
    ui.alert('🚀 Iniciando Sincronização Completa... Isso pode levar alguns segundos.');
    
    var r1 = atualizarDashboard();
    var r2 = atualizarAbaOrganistas();
    var r3 = atualizarAbaMinisterio();
    
    var msg = '✅ Sincronização concluída com sucesso!\n\n' +
              '📊 Dashboard: ' + r1.totalMembros + ' membros\n' +
              '🎹 Organistas: ' + r2.totalOrganistas + ' registradas\n' +
              '👔 Ministério: ' + r3.totalMinisterio + ' cargos';
              
    ui.alert(msg);
  } catch (e) {
    SpreadsheetApp.getUi().alert('❌ Erro Crítico: ' + e.message);
  }
}

function menuAlimentarEspelho() {
  try {
    var ui = SpreadsheetApp.getUi();
    var targets = getMirrorTargets();
    if (targets.length === 0) {
      ui.alert('⚠️ Nenhuma planilha espelho configurada. Defina MIRROR_CONFIG nas propriedades do script.');
      return;
    }
    
    ui.alert('⏳ Alimentando planilhas espelho... Por favor aguarde.');
    var result = alimentarTodasAsPlanilhas();
    ui.alert(
      '✅ Sincronização concluída!\n\n' +
      'Inseridos: ' + result.inserted + '\n' +
      'Ignorados: ' + result.skipped
    );
  } catch (e) {
    SpreadsheetApp.getUi().alert('❌ Erro ao alimentar espelhos: ' + e.message);
  }
}

function menuAlimentarTodasAsPlanilhas() {
  try {
    var ui = SpreadsheetApp.getUi();
    ui.alert('⏳ Alimentando todas as planilhas... Por favor aguarde.');
    var result = alimentarTodasAsPlanilhas();
    ui.alert(
      '✅ Todas as planilhas foram alimentadas!\n\n' +
      'Inseridos: ' + result.inserted + '\n' +
      'Ignorados: ' + result.skipped
    );
  } catch (e) {
    SpreadsheetApp.getUi().alert('❌ Erro ao alimentar todas as planilhas: ' + e.message);
  }
}

/**
 * ============================================================================
 * LÓGICA DE SINCRONIZAÇÃO (ADAPTADA DO PROJETO ORIGINAL)
 * ============================================================================
 */

function atualizarDashboard() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var shDados = ss.getSheetByName('Registros');
  if (!shDados) throw new Error('Aba "Registros" não encontrada.');

  var data = shDados.getDataRange().getValues();
  if (data.length < 2) throw new Error('Não há dados suficientes na aba "Registros".');

  var headers = data[0];
  var headerMap = criarHeaderMap(headers);
  var localEnsaio = determinarLocalEnsaio(data, headerMap);
  console.log('📍 Processando dados para o local: ' + localEnsaio);

  // Contadores seguindo o padrão canônico do backend-separado
  var contadores = { instrumentos: {}, cargosMinisteriais: {}, cargosApoio: {}, total: 0, organistas: 0 };
  
  LISTA_INSTRUMENTOS.forEach(inst => { contadores.instrumentos[inst] = 0; });
  LISTA_MINISTERIO.forEach(cargo => { contadores.cargosMinisteriais[cargo] = 0; });
  LISTA_APOIO.forEach(cargo => { contadores.cargosApoio[cargo] = 0; });

  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    var x = {
      nome: getVal(row, headerMap, 'NOME COMPLETO'),
      cargo: getVal(row, headerMap, 'CARGO'),
      instrumento: getVal(row, headerMap, 'INSTRUMENTO'),
      vai_tocar: getVal(row, headerMap, 'VAI TOCAR'),
      local_ensaio: getVal(row, headerMap, 'LOCAL ENSAIO')
    };

    if (!x.nome || !compararLocaisEnsaio(x.local_ensaio, localEnsaio)) continue;
    if (!estevePresente(x)) continue;

    contadores.total++;
    
    var cargoTipo = classificarCargo(x.cargo);
    var cargoMapeado = mapearCargoParaContagem(x.cargo);
    var instMapeado = mapearInstrumento(x.instrumento);

    // Lógica de contagem sincronizada com backend-separado
    if (cargoTipo === 'organista') {
      contadores.organistas++;
      contadores.instrumentos['Organista']++;
    } else if (x.instrumento) {
      if (instMapeado && contadores.instrumentos.hasOwnProperty(instMapeado) && instMapeado !== 'Organista') {
        contadores.instrumentos[instMapeado]++;
      }
    }

    if (cargoMapeado) {
      if (contadores.cargosMinisteriais.hasOwnProperty(cargoMapeado)) {
        contadores.cargosMinisteriais[cargoMapeado]++;
      } else if (contadores.cargosApoio.hasOwnProperty(cargoMapeado)) {
        contadores.cargosApoio[cargoMapeado]++;
      }
    }
  }

  // Preparar atualizações utilizando o sistema de sinônimos do projeto original
  var atualizacoes = [];
  
  const MIN_LABEL_SYNONYMS = {
    'Ancião': ['Ancião','Anciao'],
    'Diácono': ['Diácono','Diacono'],
    'Cooperador do Ofício': ['Cooperador do Ofício','Cooperador do Oficio','Cooperador do Ofício Ministerial'],
    'Cooperador de Jovens': ['Cooperador de Jovens','Cooperador de Jovens e Menores'],
    'Encarregado Regional': ['Encarregado Regional'],
    'Encarregado Local': ['Encarregado Local'],
    'Examinadora': ['Examinadora', 'Examinadoras'],
    'Secretária da Música': ['Secretárias da Música','Secretária da Música','Secretarias da Música','Secretaria da Música'],
    'Secretário da Música': ['Secretários da Música','Secretário da Música','Secretarios da Música','Secretario da Música'],
    'Instrutor': ['Instrutores','Instrutor'],
    'Instrutora': ['Instrutoras','Instrutora']
  };

  const APOIO_LABEL_SYNONYMS = {
    'Porteiro (a)': ['Porteiros (as)', 'Porteiro (a)'],
    'Bombeiro (a)': ['Bombeiros (as)', 'Bombeiro (a)'],
    'Médico (a)': ['Médicos (as) / Ambulatório', 'Medicos (as) / Ambulatorio', 'Médico (a)', 'Medico (a)'],
    'Enfermeiro (a)': ['Enfermeiros (as)', 'Enfermeiro (a)'],
    'Irmandade': ['Irmandade']
  };

  LISTA_INSTRUMENTOS.forEach(canonical => {
    var val = contadores.instrumentos[canonical] || 0;
    var synonyms = (canonical === 'Organista') ? ['Organista','Organistas'] : [canonical];
    synonyms.forEach(s => atualizacoes.push({ rotulo: s, valor: val }));
  });

  Object.keys(MIN_LABEL_SYNONYMS).forEach(canonical => {
    var val = contadores.cargosMinisteriais[canonical] || 0;
    MIN_LABEL_SYNONYMS[canonical].forEach(s => atualizacoes.push({ rotulo: s, valor: val }));
  });

  Object.keys(APOIO_LABEL_SYNONYMS).forEach(canonical => {
    var val = contadores.cargosApoio[canonical] || 0;
    APOIO_LABEL_SYNONYMS[canonical].forEach(s => atualizacoes.push({ rotulo: s, valor: val }));
  });

  // Atualizar as abas Resumo e Dashboard se existirem
  var abasParaAtualizar = ['Resumo', 'Dashboard'];
  var atualizadoAlgum = false;

  abasParaAtualizar.forEach(nomeAba => {
    var sh = ss.getSheetByName(nomeAba);
    if (sh) {
      limparContadoresResumo(sh);
      atualizarTodosContadoresResumoBulk(sh, atualizacoes);
      atualizadoAlgum = true;
    }
  });

  if (!atualizadoAlgum) throw new Error('Nem aba "Resumo" nem "Dashboard" foram encontradas.');

  return { ok: true, totalMembros: contadores.total };
}

function atualizarAbaOrganistas() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var shDados = ss.getSheetByName('Registros');
  var shOrg = ss.getSheetByName('Organistas');
  if (!shDados || !shOrg) throw new Error('Abas "Registros" ou "Organistas" não encontradas.');

  var data = shDados.getDataRange().getValues();
  var headers = data[0];
  var headerMap = {};
  var headerMap = criarHeaderMap(headers);
  var localEnsaio = determinarLocalEnsaio(data, headerMap);
  var organistas = [];
  var priorityMap = {
    'Examinadora': 0,
    'Instrutora': 1,
    'Secretária da Música': 2
  };

  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    var x = {
      nome: getVal(row, headerMap, 'NOME COMPLETO'),
      cargo: getVal(row, headerMap, 'CARGO'),
      instrumento: getVal(row, headerMap, 'INSTRUMENTO'),
      vai_tocar: getVal(row, headerMap, 'VAI TOCAR'),
      local_ensaio: getVal(row, headerMap, 'LOCAL ENSAIO')
    };

    if (!x.nome || !compararLocaisEnsaio(x.local_ensaio, localEnsaio)) continue;
    if (!estevePresente(x)) continue;

    var cargoTipo = classificarCargo(x.cargo);
    var cargoMapeado = mapearCargoParaContagem(x.cargo);

    if (cargoTipo === 'organista') {
      var p = priorityMap[cargoMapeado];
      if (p === undefined) p = 3; // Organistas comuns

      organistas.push([
        getVal(row, headerMap, 'UUID'),
        getVal(row, headerMap, 'NOME COMPLETO'),
        getVal(row, headerMap, 'CARGO'),
        getVal(row, headerMap, 'CLASSE_ORGANISTA') || getVal(row, headerMap, 'NÍVEL'),
        getVal(row, headerMap, 'COMUM'),
        getVal(row, headerMap, 'CIDADE'),
        p // Índice para ordenação personalizada
      ]);
    }
  }

  // Ordenar primeiro pela prioridade e depois pelo nome
  organistas.sort((a, b) => {
    if (a[6] !== b[6]) return a[6] - b[6];
    return a[1].localeCompare(b[1], 'pt-BR');
  });
  
  // Limpar índice temporário e UUID por sequência numérica
  organistas.forEach((sub, idx) => {
    sub[0] = idx + 1;
    sub.pop();
  });

  // Limpar dados antigos...
  var startRow = 5; // Ajuste conforme seu template (normalmente os dados começam na 4 ou 5)
  if (shOrg.getLastRow() >= startRow) {
    shOrg.getRange(startRow, 1, shOrg.getLastRow() - startRow + 1, 6).clearContent();
  }

  if (organistas.length > 0) {
    shOrg.getRange(startRow, 1, organistas.length, 6).setValues(organistas);
  }

  return { ok: true, totalOrganistas: organistas.length };
}

function atualizarAbaMinisterio() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var shDados = ss.getSheetByName('Registros');
  var shMin = ss.getSheetByName('Ministério') || ss.getSheetByName('Ministerio');
  if (!shDados || !shMin) throw new Error('Abas "Registros" ou "Ministério" não encontradas.');

  var data = shDados.getDataRange().getValues();
  var headers = data[0];
  var headerMap = criarHeaderMap(headers);
  var localEnsaio = determinarLocalEnsaio(data, headerMap);
  var ministerio = [];
  var allowedCargos = ['Ancião', 'Diácono', 'Cooperador do Ofício', 'Cooperador de Jovens', 'Encarregado Regional'];

  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    var x = {
      nome: getVal(row, headerMap, 'NOME COMPLETO'),
      cargo: getVal(row, headerMap, 'CARGO'),
      instrumento: getVal(row, headerMap, 'INSTRUMENTO'),
      vai_tocar: getVal(row, headerMap, 'VAI TOCAR'),
      local_ensaio: getVal(row, headerMap, 'LOCAL ENSAIO')
    };

    if (!x.nome || !compararLocaisEnsaio(x.local_ensaio, localEnsaio)) continue;
    if (!estevePresente(x)) continue;

    var cargoTipo = classificarCargo(x.cargo);
    var cargoMapeado = mapearCargoParaContagem(x.cargo);

    // Filtro estrito: apenas os cargos definidos para esta aba
    if (cargoTipo === 'ministerio' && cargoMapeado && allowedCargos.includes(cargoMapeado)) {
      ministerio.push([
        getVal(row, headerMap, 'UUID'),
        getVal(row, headerMap, 'NOME COMPLETO'),
        x.cargo,
        getVal(row, headerMap, 'COMUM'),
        getVal(row, headerMap, 'CIDADE'),
        allowedCargos.indexOf(cargoMapeado) // Índice para ordenação personalizada
      ]);
    }
  }

  // Ordenar primeiro pelo cargo (ordem da allowedCargos) e depois pelo nome
  ministerio.sort((a, b) => {
    if (a[5] !== b[5]) return a[5] - b[5];
    return a[1].localeCompare(b[1], 'pt-BR');
  });

  // Limpar o índice temporário e atualizar UUID para sequência numérica
  ministerio.forEach((sub, idx) => {
    sub[0] = idx + 1;
    sub.pop(); 
  });

  var startRow = 5;
  if (shMin.getLastRow() >= startRow) {
    shMin.getRange(startRow, 1, shMin.getLastRow() - startRow + 1, 5).clearContent();
  }

  if (ministerio.length > 0) {
    shMin.getRange(startRow, 1, ministerio.length, 5).setValues(ministerio);
  }

  return { ok: true, totalMinisterio: ministerio.length };
}

/**
 * ============================================================================
 * UTILITÁRIOS E AUXILIARES
 * ============================================================================
 */

function norm(s) { return s ? String(s).trim() : ''; }
function key(s) { return norm(s).toLowerCase(); }
function isYes(s) { return /^(sim|s|yes|y|1|true)$/i.test(norm(s)); }

function normalizarNome(nome) {
  if (!nome) return '';
  return String(nome).toUpperCase().trim().normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' '); // Colapsar múltiplos espaços
}

function determinarLocalEnsaio(data, headerMap) {
  // 1. Tenta das propriedades do script
  var propLocal = PropertiesService.getScriptProperties().getProperty('LOCAL_ENSAIO');
  if (propLocal) return propLocal;
  
  // 2. Tenta do nome da planilha
  var ssName = SpreadsheetApp.getActiveSpreadsheet().getName();
  if (ssName.includes('-')) return ssName.split('-').pop().trim();
  
  // 3. Fallback: Primeiro local encontrado nos dados
  var idxLocal = findHeaderIndex(headerMap, 'LOCAL_ENSAIO');
  if (data.length > 1 && idxLocal !== -1) {
    return norm(data[1][idxLocal]);
  }
  
  return 'Regional';
}

/**
 * Cria um mapa de cabeçalhos robusto (ignora espaços, underscores e caixa)
 */
function criarHeaderMap(headers) {
  var map = {};
  headers.forEach((h, i) => {
    if (h) {
      var normalized = h.toString().trim().toUpperCase().replace(/[\s_]/g, '');
      map[normalized] = i;
    }
  });
  return map;
}

/**
 * Busca o índice de um cabeçalho no mapa robusto
 */
function findHeaderIndex(headerMap, key) {
  var normalizedKey = key.toUpperCase().replace(/[\s_]/g, '');
  return headerMap.hasOwnProperty(normalizedKey) ? headerMap[normalizedKey] : -1;
}

/**
 * Atalho para pegar valor da linha usando chave robusta
 */
function getVal(row, headerMap, key) {
  var idx = findHeaderIndex(headerMap, key);
  return idx !== -1 ? norm(row[idx]) : '';
}

function estevePresente(x) {
  if (isYes(x.vai_tocar) || !!x.instrumento) return true;
  var tipo = classificarCargo(x.cargo);
  return tipo !== 'outros';
}

function compararLocaisEnsaio(l1, l2) {
  if (!l1 || !l2) return false;
  var s1 = normalizarNome(l1);
  var s2 = normalizarNome(l2);
  return s1 === s2 || s1.includes(s2) || s2.includes(s1);
}

function mapearInstrumento(inst) {
  if (!inst) return null;
  var s = normalizarNome(inst);
  
  // Mapeamento para nomes canônicos na LISTA_INSTRUMENTOS
  var map = {
    'ORGAO': 'Organista', 'ORGAO ELETRONICO': 'Organista', 'ÓRGÃO': 'Organista', 'ORGANISTA': 'Organista',
    'VIOLINO': 'Violino', 'VIOLA': 'Viola', 'VIOLONCELO': 'Violoncelo', 'CELLO': 'Violoncelo',
    'FLAUTA': 'Flauta transversal', 'FLAUTA TRANSVERSAL': 'Flauta transversal',
    'OBOE': 'Oboé', 'OBOE D AMORE': 'Oboé D\'Amore', 'OBOE DAMORE': 'Oboé D\'Amore', 'CORNE INGLES': 'Corne inglês',
    'CLARINETE': 'Clarinete', 'CLARINETE ALTO': 'Clarinete alto', 'CLARINETE BAIXO': 'Clarinete baixo (clarone)', 'CLARONE': 'Clarinete baixo (clarone)',
    'FAGOTE': 'Fagote',
    'SAXOFONE SOPRANO': 'Saxofone soprano (reto)', 'SAXOFONE ALTO': 'Saxofone alto', 'SAXOFONE TENOR': 'Saxofone tenor', 'SAXOFONE BARITONO': 'Saxofone barítono',
    'TROMPETE': 'Trompete', 'PISTAO': 'Trompete', 'CORNET': 'Cornet', 'FLUGELHORN': 'Flugelhorn', 'TROMPA': 'Trompa',
    'TROMBONE': 'Trombone', 'TROMBONITO': 'Trombonito', 'BARITONO': 'Barítono (pisto)', 'BARITONO PISTO': 'Barítono (pisto)', 'EUFONIO': 'Eufônio', 'BOMBARDINO': 'Eufônio', 'TUBA': 'Tuba', 'BOMBARDAO': 'Tuba'
  };
  
  // Primeiro tenta o mapa, depois tenta encontrar o nome exato (ignorando case) na LISTA_INSTRUMENTOS
  if (map[s]) return map[s];
  
  var find = LISTA_INSTRUMENTOS.find(item => normalizarNome(item) === s);
  return find || inst;
}

function classificarCargo(cargo) {
  if (!cargo) return 'outros';
  var c = normalizarNome(cargo);
  
  var isSecretariaMusica = (c.includes('SECRETARIA') && (c.includes('MUSIC') || !c.includes('MUNICIPIO')));
  
  if (c.includes('ORGANISTA') || c.includes('EXAMINADORA') || c.includes('INSTRUTORA') || isSecretariaMusica) {
    return 'organista';
  }
  
  if (c.includes('ANCIAO') || c.includes('DIACONO') || c.includes('COOPERADOR') || 
      c.includes('ENCARREGADO') || c.includes('SECRETARI')) {
    return 'ministerio';
  }
  
  if (c.includes('PORTEIRO') || c.includes('BOMBEIRO') || c.includes('MEDICO') || 
      c.includes('ENFERMEIRO') || c.includes('IRMA')) {
    return 'apoio';
  }
  
  if (c.includes('MUSICO')) return 'musico';
  
  return 'outros';
}

function mapearCargoParaContagem(cargo) {
  if (!cargo) return null;
  var c = normalizarNome(cargo);
  
  if (c.includes('ANCIAO')) return 'Ancião';
  if (c.includes('DIACONO')) return 'Diácono';
  if (c.includes('COOPERADOR') && c.includes('JOVENS')) return 'Cooperador de Jovens';
  if (c.includes('COOPERADOR')) return 'Cooperador do Ofício';
  if (c.includes('ENCARREGADO') && c.includes('REGIONAL')) return 'Encarregado Regional';
  if (c.includes('ENCARREGADO')) return 'Encarregado Local';
  if (c.includes('EXAMINADOR')) return 'Examinadora';
  
  if (c.includes('SECRETARIA') && c.includes('GEM')) return 'Instrutora';
  if (c.includes('SECRETARIO') && c.includes('GEM')) return 'Instrutor';
  if (c.includes('SECRETARIO') && c.includes('MUSIC')) return 'Secretário da Música';
  if (c.includes('SECRETARIA') && c.includes('MUSIC')) return 'Secretária da Música';
  
  if (c.includes('INSTRUTORA')) return 'Instrutora';
  if (c.includes('INSTRUTOR')) return 'Instrutor';
  
  if (c.includes('PORTEIR')) return 'Porteiro (a)';
  if (c.includes('BOMBEIR')) return 'Bombeiro (a)';
  if (c.includes('MEDIC')) return 'Médico (a)';
  if (c.includes('ENFERMEIR')) return 'Enfermeiro (a)';
  if (c.includes('IRMA')) return 'Irmandade';
  
  return null;
}

function limparContadoresResumo(sheet) {
  // Otimizado: agora fazemos nada aqui, vamos deixar o atualizarBulk lidar com a limpeza/sobrescrita
  // para evitar apagar coisas erradas em layouts customizados
}

function atualizarTodosContadoresResumoBulk(sheet, updates) {
  var data = sheet.getDataRange().getValues();
  var dict = {};
  updates.forEach(u => {
    var key = normalizarNome(u.rotulo);
    if (key) dict[key] = u.valor;
  });

  for (var i = 0; i < data.length; i++) {
    for (var j = 0; j < data[i].length; j++) {
      var labelRaw = data[i][j];
      if (!labelRaw || typeof labelRaw !== 'string') continue;
      
      var label = normalizarNome(labelRaw);
      
      if (dict.hasOwnProperty(label)) {
        // Encontrou a etiqueta! Atualiza a célula IMEDIATAMENTE à direita
        sheet.getRange(i + 1, j + 2).setValue(dict[label]);
      }
    }
  }
}

function isDuplicate(sheet, data) {
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return false;

  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var headerMap = criarHeaderMap(headers);

  // Normalizar dados da requisição (flexível com chaves em camelCase, snake_case ou espaços)
  var getValFromObj = function(obj, key) {
    var kNorm = key.toUpperCase().replace(/[\s_]/g, '');
    for (var k in obj) {
      if (k.toUpperCase().replace(/[\s_]/g, '') === kNorm) return obj[k];
    }
    return '';
  };

  var uuidReq = norm(getValFromObj(data, 'UUID'));
  var nomeReq = normalizarNome(getValFromObj(data, 'NOME COMPLETO'));
  var localReq = normalizarNome(getValFromObj(data, 'LOCAL ENSAIO'));
  var cargoReq = normalizarNome(getValFromObj(data, 'CARGO'));
  var instrumentoReq = normalizarNome(getValFromObj(data, 'INSTRUMENTO'));

  // Varredura reversa nas últimas 100 linhas para performance e precisão
  var numRows = Math.min(100, lastRow - 1);
  var startRow = lastRow - numRows + 1;
  var rows = sheet.getRange(startRow, 1, numRows, headers.length).getValues();

  for (var i = rows.length - 1; i >= 0; i--) {
    var row = rows[i];
    var rowUuid = getVal(row, headerMap, 'UUID');
    var rowNome = normalizarNome(getVal(row, headerMap, 'NOME COMPLETO'));
    var rowLocal = normalizarNome(getVal(row, headerMap, 'LOCAL ENSAIO'));
    var rowCargo = normalizarNome(getVal(row, headerMap, 'CARGO'));
    var rowInstrumento = normalizarNome(getVal(row, headerMap, 'INSTRUMENTO'));

    // Bateu UUID? Duplicado!
    if (uuidReq && rowUuid === uuidReq) return true;

    // Bateu Nome + Local + Cargo + Instrumento? Duplicado!
    if (nomeReq && nomeReq === rowNome && 
        localReq === rowLocal && 
        cargoReq === rowCargo && 
        instrumentoReq === rowInstrumento) {
      return true;
    }
  }

  return false;
}

/**
 * ============================================================================
 * CONSTANTES
 * ============================================================================
 */

const LISTA_INSTRUMENTOS = [
  'Organista', 'Acordeon', 'Violino', 'Viola', 'Violoncelo', 'Flauta transversal',
  'Oboé', "Oboé d'amore", 'Corne inglês', 'Clarinete', 'Clarinete alto', 
  'Clarinete baixo (clarone)', 'Fagote', 'Saxofone soprano (reto)', 'Saxofone alto',
  'Saxofone tenor', 'Saxofone barítono', 'Trompete', 'Cornet', 'Flugelhorn', 'Trompa',
  'Trombone', 'Trombonito', 'Barítono (pisto)', 'Eufônio', 'Tuba'
];

const LISTA_MINISTERIO = [
  'Ancião', 'Diácono', 'Cooperador do Ofício', 'Cooperador de Jovens',
  'Encarregado Regional', 'Encarregado Local', 'Examinadora',
  'Secretária da Música', 'Secretário da Música', 'Instrutor', 'Instrutora'
];

const LISTA_APOIO = [
  'Porteiro (a)', 'Bombeiro (a)', 'Médico (a)', 'Enfermeiro (a)', 'Irmandade'
];
/**
 * ============================================================================
 * COMPATIBILIDADE PARA MULTIPLOS DESTINOS
 * ============================================================================
 */

function doPost(e) {
  try {
    var contents = e.postData.contents;
    var requestData = JSON.parse(contents);
    var operation = requestData.op;
    var sheetName = 'Registros';
    var rowData = requestData.data;

    if (operation !== 'append') {
      if (operation === 'alimentar_matriz') {
        return ContentService.createTextOutput(JSON.stringify(alimentarMatriz()))
          .setMimeType(ContentService.MimeType.JSON);
      }

      if (operation === 'alimentar_espelho') {
        return ContentService.createTextOutput(JSON.stringify(alimentarTodasAsPlanilhas()))
          .setMimeType(ContentService.MimeType.JSON);
      }

      if (operation === 'alimentar_todas_planilhas') {
        return ContentService.createTextOutput(JSON.stringify(alimentarTodasAsPlanilhas()))
          .setMimeType(ContentService.MimeType.JSON);
      }

      return ContentService.createTextOutput(JSON.stringify({
        ok: false,
        error: 'Operacao "' + operation + '" nao reconhecida.'
      })).setMimeType(ContentService.MimeType.JSON);
    }

    var shPrincipal = openOrCreateSheet(sheetName, DEFAULT_SHEET_ID);
    var insertedMain = 0;
    var duplicatedMain = false;

    if (!isDuplicate(shPrincipal, rowData)) {
      appendRowToSheet(shPrincipal, rowData);
      insertedMain = 1;
    } else {
      duplicatedMain = true;
    }

    var destinos = resolveMirrorTargetsFromRow(rowData);
    var mirrorResult = processarEnvioParaDestinos(rowData, destinos, sheetName);

    return ContentService.createTextOutput(JSON.stringify({
      ok: true,
      insertedMain: insertedMain,
      duplicatedMain: duplicatedMain,
      mirrored: mirrorResult,
      message: 'Registro processado com sucesso'
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      ok: false,
      error: err.message
    })).setMimeType(ContentService.MimeType.JSON);
  }
}


function openOrCreateSheet(name, spreadsheetId) {
  var ss = getSpreadsheetTarget(spreadsheetId);
  var sheet = ss.getSheetByName(name);

  if (!sheet) {
    sheet = ss.insertSheet(name);
    console.log('Nova aba criada: ' + name + ' na planilha ' + ss.getId());
  }

  return sheet;
}

function getSpreadsheetTarget(spreadsheetId) {
  if (spreadsheetId) {
    var target = SpreadsheetApp.openById(String(spreadsheetId).trim());
    console.log('Usando planilha por ID informado na requisicao: ' + target.getName());
    return target;
  }

  try {
    var activeSpreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    if (activeSpreadsheet) {
      console.log('Usando planilha ativa: ' + activeSpreadsheet.getName());
      return activeSpreadsheet;
    }
  } catch (e) {
    console.log('Planilha ativa indisponivel, tentando propriedades do script.');
  }

  var configuredId = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
  if (!configuredId) {
    throw new Error('CONFIGURACAO REQUERIDA: informe spreadsheetId/spreadsheetIds na requisicao ou defina SPREADSHEET_ID nas propriedades do script.');
  }

  var ss = SpreadsheetApp.openById(configuredId.trim());
  console.log('Usando planilha por ID configurado: ' + ss.getName());
  return ss;
}

function normalizeSpreadsheetIds(value) {
  if (!value) return [];

  if (Array.isArray(value)) {
    return value
      .map(function(item) { return item != null ? String(item).trim() : ''; })
      .filter(function(item) { return item; });
  }

  return String(value)
    .split(/[ ,\n;\r]+/)
    .map(function(item) { return item.trim(); })
    .filter(function(item) { return item; });
}

function uniqueNonEmptyValues(values) {
  var found = {};
  var result = [];

  values.forEach(function(value) {
    if (!value || found[value]) return;
    found[value] = true;
    result.push(value);
  });

  return result;
}

function getAllRegionalSpreadsheetIds() {
  return REGIONAL_SHEETS
    .map(function(regional) { return regional.id; })
    .filter(function(id) { return id && id !== DEFAULT_SHEET_ID; });
}

function getRegionalById(spreadsheetId) {
  for (var i = 0; i < REGIONAL_SHEETS.length; i++) {
    if (REGIONAL_SHEETS[i].id === spreadsheetId) return REGIONAL_SHEETS[i];
  }
  return null;
}

function getRegionalByName(nomeCidade) {
  var alvo = normalizarNome(nomeCidade || '');
  for (var i = 0; i < REGIONAL_SHEETS.length; i++) {
    if (normalizarNome(REGIONAL_SHEETS[i].nome) === alvo) return REGIONAL_SHEETS[i];
  }
  return null;
}

function getRegionalId(local) {
  if (!local) return null;
  var l = String(local).toLowerCase().trim();

  if (l.indexOf('goiania') !== -1 || l.indexOf('goiania') !== -1 || l.indexOf('goiânia') !== -1) return GOIANIA_SHEET_ID;
  if (l.indexOf('saocarlos') !== -1 || l.indexOf('sao carlos') !== -1 || l.indexOf('são carlos') !== -1) return SAOCARLOS_SHEET_ID;

  return null;
}

function resolveMirrorTargetsFromRow(rowData) {
  var local = normalizarNome(rowData['LOCAL ENSAIO'] || rowData['LOCAL_ENSAIO'] || '');
  var cidade = normalizarNome(rowData['CIDADE'] || '');
  var comum = normalizarNome(rowData['COMUM'] || '');

  var regionalId = getRegionalId(local) || getRegionalId(cidade) || getRegionalId(comum);

  if (!regionalId) return [];

  if (regionalId === DEFAULT_SHEET_ID) return [];

  return [regionalId];
}


function registroPertenceAoDestino(registro, regional) {
  if (!regional || !regional.nome) return false;

  var destino = normalizarNome(regional.nome);
  if (destino === 'SAOCARLOS') destino = 'SAO CARLOS';

  var localEnsaio = normalizarNome(registro['LOCAL ENSAIO'] || registro['LOCAL_ENSAIO'] || '');
  var cidade = normalizarNome(registro['CIDADE'] || '');
  var comum = normalizarNome(registro['COMUM'] || '');

  return localEnsaio.indexOf(destino) !== -1 ||
    cidade.indexOf(destino) !== -1 ||
    comum.indexOf(destino) !== -1;
}

function resolveTargetSpreadsheetIds(requestData) {
  var ids = [];
  var shouldUseRegisteredRegionals = requestData && (
    requestData.enviarParaTodasAsRegionais === true ||
    requestData.sendToAllRegionals === true ||
    requestData.useRegisteredRegionals === true
  );

  if (requestData && requestData.spreadsheetIds) {
    ids = ids.concat(normalizeSpreadsheetIds(requestData.spreadsheetIds));
  }

  if (requestData && requestData.spreadsheetId) {
    ids = ids.concat(normalizeSpreadsheetIds(requestData.spreadsheetId));
  }

  if (requestData && requestData.regional) {
    var regionalId = getRegionalId(requestData.regional);
    if (regionalId) ids.push(regionalId);
  }

  if (requestData && requestData.regionais && Array.isArray(requestData.regionais)) {
    requestData.regionais.forEach(function(regional) {
      var regionalId = getRegionalId(regional);
      if (regionalId) ids.push(regionalId);
    });
  }

  if (ids.length === 0 && shouldUseRegisteredRegionals) {
    ids = ids.concat(getAllRegionalSpreadsheetIds());
  }

  if (ids.length === 0) {
    var configuredIds = PropertiesService.getScriptProperties().getProperty('TARGET_SPREADSHEET_IDS');
    if (configuredIds) {
      ids = ids.concat(normalizeSpreadsheetIds(configuredIds));
    }
  }

  if (ids.length === 0) {
    var configuredId = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
    if (configuredId) {
      ids = ids.concat(normalizeSpreadsheetIds(configuredId));
    }
  }

  if (ids.length === 0) {
    ids = ids.concat(getAllRegionalSpreadsheetIds());
  }

  if (ids.length === 0) {
    try {
      var activeSpreadsheet = SpreadsheetApp.getActiveSpreadsheet();
      if (activeSpreadsheet) ids.push(activeSpreadsheet.getId());
    } catch (e) {
      console.log('Nao foi possivel usar a planilha ativa como destino padrao.');
    }
  }

  ids = uniqueNonEmptyValues(ids);

  if (ids.length === 0) {
    throw new Error('Nenhuma planilha de destino foi encontrada. Informe spreadsheetId, spreadsheetIds, regional, regionais ou configure os IDs no inicio do codigo.');
  }

  return ids;
}

function processarEnvioParaDestinos(rowData, targetSpreadsheetIds, sheetName) {
  var insertedCount = 0;
  var duplicateCount = 0;
  var targetResults = [];
  var ids = uniqueNonEmptyValues(targetSpreadsheetIds || []);

  ids.forEach(function(spreadsheetId) {
    var sheet = openOrCreateSheet(sheetName || 'Registros', spreadsheetId);

    if (isDuplicate(sheet, rowData)) {
      duplicateCount++;
      targetResults.push({
        spreadsheetId: spreadsheetId,
        inserted: 0,
        duplicate: true
      });
      return;
    }

    appendRowToSheet(sheet, rowData);
    insertedCount++;

    targetResults.push({
      spreadsheetId: spreadsheetId,
      inserted: 1,
      duplicate: false
    });
  });

  return {
    inserted: insertedCount,
    duplicates: duplicateCount,
    targets: targetResults
  };
}


function alimentarMatriz() {
  var origem = SpreadsheetApp.getActiveSpreadsheet();
  var origemId = origem.getId();
  if (origemId === DEFAULT_SHEET_ID) {
    return { ok: true, inserted: 0, skipped: 0, message: 'A planilha atual ja e a matriz.' };
  }

  return sincronizarRegistrosDaPlanilhaAtual([DEFAULT_SHEET_ID]);
}

function alimentarSaoCarlos() {
  return sincronizarRegistrosDaPlanilhaAtual([SAOCARLOS_SHEET_ID]);
}

function alimentarCidade(nomeCidade) {
  var regional = getRegionalByName(nomeCidade);
  if (!regional || !regional.id) {
    throw new Error('Cidade nao configurada para alimentacao: ' + nomeCidade);
  }
  return sincronizarRegistrosDaPlanilhaAtual([regional.id]);
}

function alimentarTodasAsPlanilhas() {
  var origem = SpreadsheetApp.getActiveSpreadsheet();
  var origemId = origem.getId();
  var destinos = getAllRegionalSpreadsheetIds().filter(function(id) {
    return id !== origemId;
  });

  return sincronizarRegistrosDaPlanilhaAtual(destinos);
}

function sincronizarRegistrosDaPlanilhaAtual(destinoIds) {
  var origem = SpreadsheetApp.getActiveSpreadsheet();
  var shOrigem = origem.getSheetByName('Registros');
  if (!shOrigem) {
    throw new Error('Aba Registros nao encontrada na planilha atual.');
  }

  var lastRow = shOrigem.getLastRow();
  var lastCol = shOrigem.getLastColumn();
  if (lastRow < 2 || lastCol === 0) {
    return { ok: true, inserted: 0, skipped: 0, destinos: destinoIds, message: 'Nao ha registros para sincronizar.' };
  }

  var headers = shOrigem.getRange(1, 1, 1, lastCol).getValues()[0];
  var rows = shOrigem.getRange(2, 1, lastRow - 1, lastCol).getValues();
  var registros = rows.map(function(row) {
    var item = {};
    headers.forEach(function(header, idx) {
      item[header] = row[idx];
    });
    return item;
  });

  return sincronizarRegistrosParaDestinos(registros, destinoIds, 'Registros');
}

function sincronizarRegistrosParaDestinos(registros, destinoIds, sheetName) {
  var inserted = 0;
  var skipped = 0;
  var resultados = [];
  var ids = uniqueNonEmptyValues(destinoIds || []);

  ids.forEach(function(destinoId) {
    var regional = getRegionalById(destinoId);
    var shDestino = openOrCreateSheet(sheetName || 'Registros', destinoId);
    var inseridosDestino = 0;
    var ignoradosDestino = 0;
    var registrosDestino = registros.filter(function(registro) {
      return registroPertenceAoDestino(registro, regional);
    });

    registrosDestino.forEach(function(registro) {
      if (isDuplicate(shDestino, registro)) {
        skipped++;
        ignoradosDestino++;
        return;
      }

      appendRowToSheet(shDestino, registro);
      inserted++;
      inseridosDestino++;
    });

    resultados.push({
      spreadsheetId: destinoId,
      nome: regional ? regional.nome : '',
      encontrados: registrosDestino.length,
      inserted: inseridosDestino,
      skipped: ignoradosDestino
    });
  });

  return {
    ok: true,
    inserted: inserted,
    skipped: skipped,
    destinos: resultados
  };
}



