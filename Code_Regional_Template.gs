/**
 * ============================================================================
 * PROPRIEDADE INTELECTUAL E DIREITOS AUTORAIS
 * ============================================================================
 * Este sistema foi desenvolvido e arquitetado exclusivamente pela:
 * SECRETARIA DA ADMINISTRAÇÃO MUSICAL - REGIONAL ITAPEVI
 * 
 * Sede da Administração Musical Itapevi:
 * Av. Ana Araújo de Castro, 815 - Jardim Itapevi, Itapevi - SP
 * CEP: 06653-140
 * 
 * É ESTRITAMENTE PROIBIDA a cópia, distribuição, engenharia reversa 
 * ou uso deste código-fonte por outras regionais ou terceiros sem 
 * autorização prévia e expressa da Secretaria de Itapevi.
 * ============================================================================
 */

/**
 * Sistema Contagem Ensaios Regionais - CCB Regional Itapevi
 * Versão 1.4.7 (Regional Sync Edition)
 */

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
    .addItem('🔄 Sincronização Completa', 'menuSincronizacaoCompleta')
    .addToUi();
}

function doPost(e) {
  try {
    var contents = e.postData.contents;
    var requestData = JSON.parse(contents);
    var operation = requestData.op;
    // Para o template regional, forçamos o nome da aba como 'Registros'
    // ignorando o 'Dados' que vem fixo no código do App atual
    var sheetName = 'Registros'; 
    var rowData = requestData.data;

    // Log para depuração (opcional)
    console.log('Operação: ' + operation + ' na aba: ' + sheetName);

    if (operation === 'append') {
      var sheet = openOrCreateSheet(sheetName);
      
      // --- VERIFICAÇÃO ANTI-DUPLICATA ---
      if (isDuplicate(sheet, rowData)) {
        console.warn('⚠️ Registro duplicado ignorado: ' + (rowData['NOME COMPLETO'] || 'Sem Nome'));
        return ContentService.createTextOutput(JSON.stringify({ 
          ok: true, 
          inserted: 0,
          message: 'Registro duplicado ignorado'
        })).setMimeType(ContentService.MimeType.JSON);
      }

      var result = appendRowToSheet(sheet, rowData);
      
      return ContentService.createTextOutput(JSON.stringify({ 
        ok: true, 
        inserted: 1,
        message: 'Registro inserido com sucesso'
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    return ContentService.createTextOutput(JSON.stringify({ 
      ok: false, 
      error: 'Operação "' + operation + '" não reconhecida.' 
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    console.error('Erro no doPost: ' + err.message);
    return ContentService.createTextOutput(JSON.stringify({ 
      ok: false, 
      error: err.message 
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Função para retornar status simples via GET (para teste no navegador)
 */
function doGet() {
  return ContentService.createTextOutput("Backend Regional Ativo! Use POST para enviar dados.")
    .setMimeType(ContentService.MimeType.TEXT);
}

/**
 * Abre a planilha configurada ou cria a aba se não existir
 */
function openOrCreateSheet(name) {
  var ss;
  try {
    // 1. Tentar pegar a planilha onde o script está rodando (mais seguro)
    ss = SpreadsheetApp.getActiveSpreadsheet();
    if (ss) {
      console.log('Usando planilha ativa: ' + ss.getName());
    } else {
      throw new Error('Nenhuma planilha ativa');
    }
  } catch (e) {
    // 2. Se falhar, tenta usar o ID das propriedades
    var ssId = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
    if (!ssId) {
      throw new Error('CONFIGURAÇÃO REQUERIDA: Defina a propriedade "SPREADSHEET_ID" nas configurações do script ou use uma planilha vinculada.');
    }
    ss = SpreadsheetApp.openById(ssId.trim());
    console.log('Usando planilha por ID: ' + ss.getName());
  }
  
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    console.log('Nova aba criada: ' + name);
  }
  
  return sheet;
}

/**
 * Insere os dados na planilha respeitando os cabeçalhos
 */
function appendRowToSheet(sheet, data) {
  var lastCol = sheet.getLastColumn();
  var headers;

  // Se a planilha estiver vazia, cria os cabeçalhos baseados nas chaves do objeto
  if (lastCol === 0) {
    headers = Object.keys(data);
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
  } else {
    // Lê os cabeçalhos existentes
    headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  }

  // Mapeia o objeto de dados para o array da linha seguindo a ordem dos cabeçalhos
  var newRow = headers.map(function(header) {
    var val = data[header];
    // Formata datas se necessário
    if (val instanceof Date) return Utilities.formatDate(val, Session.getScriptTimeZone(), "dd/MM/yyyy HH:mm:ss");
    return val !== undefined ? val : "";
  });

  sheet.appendRow(newRow);
  return true;
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
