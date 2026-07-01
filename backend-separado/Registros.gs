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
 * ou uso deste código-fonte por outras Regionais ou terceiros sem 
 * autorização prévia e expressa da Secretaria de Itapevi e seu Ministério.
 * ============================================================================
 */

function openOrCreateSheet(name, spreadsheetId) {
  const ssId = spreadsheetId || DEFAULT_SHEET_ID;
  const cacheKey = ssId + '_' + name;
  if (SHEETS_CACHE[cacheKey]) return SHEETS_CACHE[cacheKey];
  
  const ss = SpreadsheetApp.openById(ssId);
  const sheets = ss.getSheets();
  let sheet = sheets.find(s => s.getName().toLowerCase() === name.toLowerCase());
  
  if (!sheet) {
    sheet = ss.insertSheet(name);
    console.log(`✅ Nova aba criada: ${name} na planilha ${ssId}`);
  } else if (sheet.getName() !== name) {
    console.log(`ℹ️ Aba encontrada com variação de caixa: "${sheet.getName()}" (solicitado: "${name}")`);
  }
  
  SHEETS_CACHE[cacheKey] = sheet;
  return sheet;
}

/**
 * Retorna o ID da planilha regional baseado no local do ensaio
 */

function openCotiaSheet() {
  try {
    console.log('🏛️ Acessando planilha externa de Cotia...');
    // Usa openById que funciona mesmo com planilha fechada
    const ss = SpreadsheetApp.openById(COTIA_SHEET_ID);
    // Força o carregamento da planilha
    ss.getSheets();
    console.log('✅ Planilha de Cotia acessada com sucesso (mesmo fechada)');
    return ss;
  } catch (error) {
    console.error('❌ Erro ao acessar planilha de Cotia:', error);
    throw new Error(`Não foi possível acessar a planilha de Cotia: ${error.message}`);
  }
}

// Função para abrir a planilha externa de Itapevi (funciona mesmo com planilha fechada)

function openItapeviSheet() {
  try {
    console.log('🏛️ Acessando planilha externa de Itapevi...');
    const ss = SpreadsheetApp.openById(ITAPEVI_SHEET_ID);
    ss.getSheets(); // Força o carregamento
    console.log('✅ Planilha de Itapevi acessada com sucesso (mesmo fechada)');
    return ss;
  } catch (error) {
    console.error('❌ Erro ao acessar planilha de Itapevi:', error);
    throw new Error(`Não foi possível acessar a planilha de Itapevi: ${error.message}`);
  }
}


function openCaucaiaSheet() {
  try {
    console.log('🏛️ Acessando planilha externa de Caucaia...');
    const ss = SpreadsheetApp.openById(CAUCAIA_SHEET_ID);
    ss.getSheets(); // Força o carregamento
    console.log('✅ Planilha de Caucaia acessada com sucesso (mesmo fechada)');
    return ss;
  } catch (error) {
    console.error('❌ Erro ao acessar planilha de Caucaia:', error);
    throw new Error(`Não foi possível acessar a planilha de Caucaia: ${error.message}`);
  }
}


function openJandiraSheet() {
  try {
    console.log('🏛️ Acessando planilha externa de Jandira...');
    const ss = SpreadsheetApp.openById(JANDIRA_SHEET_ID);
    ss.getSheets(); // Força o carregamento
    console.log('✅ Planilha de Jandira acessada com sucesso (mesmo fechada)');
    return ss;
  } catch (error) {
    console.error('❌ Erro ao acessar planilha de Jandira:', error);
    throw new Error(`Não foi possível acessar a planilha de Jandira: ${error.message}`);
  }
}


function openFazendinhaSheet() {
  try {
    console.log('🏛️ Acessando planilha externa de Fazendinha...');
    const ss = SpreadsheetApp.openById(FAZENDINHA_SHEET_ID);
    ss.getSheets(); // Força o carregamento
    console.log('✅ Planilha de Fazendinha acessada com sucesso (mesmo fechada)');
    return ss;
  } catch (error) {
    console.error('❌ Erro ao acessar planilha de Fazendinha:', error);
    throw new Error(`Não foi possível acessar a planilha de Fazendinha: ${error.message}`);
  }
}


function openPiraporaSheet() {
  try {
    console.log('🏛️ Acessando planilha externa de Pirapora...');
    const ss = SpreadsheetApp.openById(PIRAPORA_SHEET_ID);
    ss.getSheets(); // Força o carregamento
    console.log('✅ Planilha de Pirapora acessada com sucesso (mesmo fechada)');
    return ss;
  } catch (error) {
    console.error('❌ Erro ao acessar planilha de Pirapora:', error);
    throw new Error(`Não foi possível acessar a planilha de Pirapora: ${error.message}`);
  }
}


function openVargemGrandeSheet() {
  try {
    console.log('🏛️ Acessando planilha externa de VargemGrande...');
    const ss = SpreadsheetApp.openById(VARGEMGRANDE_SHEET_ID);
    ss.getSheets(); // Força o carregamento
    console.log('✅ Planilha de VargemGrande acessada com sucesso (mesmo fechada)');
    return ss;
  } catch (error) {
    console.error('❌ Erro ao acessar planilha de VargemGrande:', error);
    throw new Error(`Não foi possível acessar a planilha de VargemGrande: ${error.message}`);
  }
}

// Função para abrir a planilha externa do Cardoso (Planilha do Cardoso)
function openCardosoSheet() {
  try {
    console.log('🏛️ Acessando planilha externa do Cardoso...');
    const ss = SpreadsheetApp.openById(CARDOSO_SHEET_ID);
    ss.getSheets(); // Força o carregamento
    console.log('✅ Planilha do Cardoso acessada com sucesso (mesmo fechada)');
    return ss;
  } catch (error) {
    console.error('❌ Erro ao acessar planilha do Cardoso:', error);
    throw new Error(`Não foi possível acessar a planilha do Cardoso: ${error.message}`);
  }
}

// Função para limpar cache

function configurarTriggerAutoSync() {
  // Remove triggers anteriores do mesmo nome para evitar duplicação
  ScriptApp.getProjectTriggers()
    .filter(t => t.getHandlerFunction() === 'sincronizarMestreParaRegionais')
    .forEach(t => ScriptApp.deleteTrigger(t));
  
  // Cria novo trigger a cada 5 minutos
  ScriptApp.newTrigger('sincronizarMestreParaRegionais')
    .timeBased()
    .everyMinutes(5)
    .create();
  
  console.log('✅ Trigger configurado! Sincronização automática ativada (a cada 5 minutos).');
  
  // Executa imediatamente uma primeira vez
  sincronizarMestreParaRegionais();
}

/**
 * Remove o trigger de sincronização automática (se precisar desativar).
 */

function removerTriggerAutoSync() {
  const removidos = ScriptApp.getProjectTriggers()
    .filter(t => t.getHandlerFunction() === 'sincronizarMestreParaRegionais');
  removidos.forEach(t => ScriptApp.deleteTrigger(t));
  console.log(`🗑️ ${removidos.length} trigger(s) removido(s).`);
}



function menuLigarAutoSync() {
  const ui = SpreadsheetApp.getUi();
  try {
    configurarTriggerAutoSync();
    ui.alert('🟢 Auto-Sync Ligado!', 'Sincronização automática ativada.\nOs registros serão espelhados nas planilhas regionais a cada 5 minutos.', ui.ButtonSet.OK);
  } catch(e) {
    ui.alert('❌ Erro', e.message, ui.ButtonSet.OK);
  }
}


function menuDesligarAutoSync() {
  const ui = SpreadsheetApp.getUi();
  try {
    removerTriggerAutoSync();
    ui.alert('🔴 Auto-Sync Desligado!', 'Sincronização automática desativada.\nNenhuma cota será consumida até você ligar novamente.', ui.ButtonSet.OK);
  } catch(e) {
    ui.alert('❌ Erro', e.message, ui.ButtonSet.OK);
  }
}

// Função para diagnosticar problemas com irmandade

function exportarParaPlanilhaOtimizada(sheetId, planilhaNome, localEnsaio) {
  try {
    console.log(`🚀 Exportação otimizada para ${planilhaNome} com dados de: ${localEnsaio}`);
    
    const shDados = openOrCreateSheet(SHEET_NAME);
    const data = shDados.getDataRange().getValues();
    
    if (data.length < 2) {
      throw new Error('Nenhum dado encontrado na planilha principal');
    }
    
    const headers = data[0];
    const headerMap = {};
    headers.forEach((header, index) => {
      if (header) {
        const hClean = header.toString().trim().toUpperCase();
        headerMap[hClean] = index;
      }
    });
    
    // Filtra dados do local especificado (otimizado)
    const linhasLocal = [];
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const nome = norm(row[headerMap['NOME COMPLETO']] || '');
      if (!nome) continue;
      
      const localEnsaioRow = norm(row[headerMap['LOCAL_ENSAIO']] || '') || '(Sem local definido)';
      
      // Só processa se for do local especificado (comparação flexível)
      if (!compararLocaisEnsaio(localEnsaioRow, localEnsaio)) continue;
      
      const cargoRaw = norm(row[headerMap['CARGO']] || '');
      const cargoK = key(cargoRaw);
      const cargo = aliasCargo[cargoK] || (cargoK ? cap(cargoRaw) : '');
      
      const instrumento = norm(row[headerMap['INSTRUMENTO']] || '');
      const vaiTocar = norm(row[headerMap['VAI_TOCAR']] || '');
      const nivel = norm(row[headerMap['CLASSE_ORGANISTA']] || '');
      
      linhasLocal.push({
        nome, cargo, instrumento, vai_tocar: vaiTocar, nivel, local_ensaio: localEnsaioRow, _ord: i
      });
    }
    
    console.log(`📊 Encontrados ${linhasLocal.length} membros para o local: ${localEnsaio}`);
    
    // Conta instrumentos e cargos (otimizado)
    const contadores = {
      instrumentos: {},
      musicos: {},
      cargosMinisteriais: {},
      cargosApoio: {},
      organistas: 0
    };
    
    // Processa todos os dados de uma vez (otimização)
    linhasLocal.forEach(x => {
      if (estevePresente(x)) {
        // Conta instrumentos (excluindo secretários da música)
        const cargoLower = x.cargo ? x.cargo.toLowerCase() : '';
        if (x.instrumento && !cargoLower.includes('secretário da música') && !cargoLower.includes('secretaria da musica') && !cargoLower.includes('secretarios da musica') && !cargoLower.includes('secretarias da musica')) {
          const instrumentoMapeado = mapearInstrumento(x.instrumento);
          contadores.instrumentos[instrumentoMapeado] = (contadores.instrumentos[instrumentoMapeado] || 0) + 1;
          contadores.musicos[instrumentoMapeado] = (contadores.musicos[instrumentoMapeado] || 0) + 1;
        }
        
        // Conta cargos ministeriais e de apoio
        if (x.cargo) {
          const cargoOriginal = x.cargo;
        const cargoMapeado = mapearCargoParaContagem(cargoOriginal);
          if (cargoMapeado) {
            // Lista de cargos ministeriais
            const listaCompletaCargosMinisteriais = [
              'Ancião', 'Diácono', 'Cooperador do Ofício', 'Cooperador de Jovens',
              'Encarregado Regional', 'Encarregado Local', 'Examinadora',
              'Secretária da Música', 'Secretário da Música', 'Instrutor', 'Instrutora'
            ];
            
            // Lista de cargos de apoio
            const listaCompletaCargosApoio = [
              'Porteiro (a)', 'Bombeiro (a)', 'Médico (a)', 'Enfermeiro (a)', 'Irmandade'
            ];
            
            if (listaCompletaCargosMinisteriais.includes(cargoMapeado)) {
              contadores.cargosMinisteriais[cargoMapeado] = (contadores.cargosMinisteriais[cargoMapeado] || 0) + 1;
              console.log(`👔 Cargo ministerial contado: ${cargoOriginal} -> ${cargoMapeado} - ${x.nome}`);
            } else if (listaCompletaCargosApoio.includes(cargoMapeado)) {
              contadores.cargosApoio[cargoMapeado] = (contadores.cargosApoio[cargoMapeado] || 0) + 1;
              console.log(`🤝 Cargo de apoio contado: ${cargoOriginal} -> ${cargoMapeado} - ${x.nome}`);
            }
          }
        }
        
        // Conta organistas
        // 🚨 CORREÇÃO: Incluir Secretária da Música (feminino) como organista
        // Mas NÃO incluir Secretário da Música (masculino)
        if (x.cargo) {
          const cargoLower = x.cargo.toLowerCase();
          const isSecretariaMusica = (cargoLower.includes('secretária') || cargoLower.includes('secretaria')) &&
                                    (cargoLower.includes('música') || cargoLower.includes('musica')) &&
                                    !cargoLower.includes('secretário') && !cargoLower.includes('secretario');
          
          if (cargoLower.includes('organista') || 
              cargoLower.includes('examinadora') ||
              cargoLower.includes('instrutora') ||
              cargoLower.includes('instrutoras') ||
              isSecretariaMusica) {
            contadores.organistas++;
          }
        }
      }
    });
    
    // Abre planilha externa
    const ssExterna = SpreadsheetApp.openById(sheetId);
    const shResumo = ssExterna.getSheetByName('Resumo');
    
    if (!shResumo) {
      throw new Error(`Aba 'Resumo' não encontrada na planilha ${planilhaNome}`);
    }
    
    // LIMPA todos os contadores antes de atualizar (correção do problema)
    limparContadoresResumo(shResumo, [28, 41, 48, 50]);
    
    // SINÔNIMOS para garantir que encontre os rótulos corretos na planilha (mesmo com plurais ou acentos)
    const SYNONYMS = {
      'Organista': ['Organista', 'Organistas'],
      'Examinadora': ['Examinadora', 'Examinadoras'],
      'Secretária da Música': ['Secretária da Música', 'Secretárias da Música', 'Secretaria da Música', 'Secretarias da Música'],
      'Secretário da Música': ['Secretário da Música', 'Secretários da Música', 'Secretario da Música', 'Secretarios da Música'],
      'Instrutor': ['Instrutor', 'Instrutores'],
      'Instrutora': ['Instrutora', 'Instrutoras'],
      'Porteiro (a)': ['Porteiro (a)', 'Porteiros (as)', 'Porteiro', 'Porteira'],
      'Bombeiro (a)': ['Bombeiro (a)', 'Bombeiros (as)', 'Bombeiro', 'Bombeira'],
      'Médico (a)': ['Médico (a)', 'Médicos (as)', 'Medico (a)', 'Médicos (as) / Ambulatório'],
      'Enfermeiro (a)': ['Enfermeiro (a)', 'Enfermeiros (as)', 'Enfermeiro', 'Enfermeira'],
      'Irmandade': ['Irmandade', 'Irmãos', 'Irmãs']
    };

    // Atualiza dados em lotes (otimização)
    const atualizacoes = [];
    
    // Instrumentos
    Object.entries(contadores.instrumentos).forEach(([instrumento, quantidade]) => {
      atualizacoes.push({ rotulo: instrumento, valor: quantidade });
    });
    
    // Cargos ministeriais
    Object.entries(contadores.cargosMinisteriais).forEach(([cargo, quantidade]) => {
      atualizacoes.push({ rotulo: cargo, valor: quantidade });
    });
    
    // Cargos de apoio
    Object.entries(contadores.cargosApoio).forEach(([cargo, quantidade]) => {
      atualizacoes.push({ rotulo: cargo, valor: quantidade });
    });
    
    // Organistas
    if (contadores.organistas > 0) {
      atualizacoes.push({ rotulo: 'Organista', valor: contadores.organistas });
      atualizacoes.push({ rotulo: 'Organistas', valor: contadores.organistas });
    }

    // Ministério Total (Soma de todos os cargos ministeriais presentes)
    const totalMinisterio = Object.values(contadores.cargosMinisteriais).reduce((a, b) => a + b, 0);
    if (totalMinisterio > 0) {
      atualizacoes.push({ rotulo: 'Ministério', valor: totalMinisterio });
    }
    
    // Executa todas as atualizações de uma vez (otimização)
    atualizacoes.forEach(atualizacao => {
      try {
        const labelsToTry = SYNONYMS[atualizacao.rotulo] || [atualizacao.rotulo];
        labelsToTry.forEach(rotuloLabel => {
          atualizarColunaBPreservandoFormulas(shResumo, rotuloLabel, atualizacao.valor, [28, 41, 48, 50]);
        });
      } catch (e) {
        console.log(`⚠️ Não foi possível atualizar ${atualizacao.rotulo}: ${e.message}`);
      }
    });
    
    // 🚨 NOVO: Atualiza Organistas e Ministério também na exportação otimizada
    const shRegMirror = ssExterna.getSheetByName('Registros');
    if (shRegMirror) {
      const headersReg = ['UUID','NOME COMPLETO','COMUM','CIDADE','CARGO','NÍVEL','INSTRUMENTO','NAIPE_INSTRUMENTO','CLASSE_ORGANISTA','LOCAL_ENSAIO','DATA_ENSAIO','REGISTRADO_POR','SYNC_STATUS','SYNCED_AT','ANOTACOES','DUPLICATA'];
      const dataMirror = [];
      const findMirrorIdx = (header) => {
        const h = String(header || '').toUpperCase();
        const variants = [
          h,
          h.replace(/_/g, ' '),
          h.replace(/\s+/g, '_')
        ];
        for (const variant of variants) {
          if (headerMap[variant] !== undefined) return headerMap[variant];
        }
        return undefined;
      };

      const idxLocalMirror = findMirrorIdx('LOCAL_ENSAIO');
      for (let i = 1; i < data.length; i++) {
        const row = data[i];
        const localEnsaioRow = idxLocalMirror !== undefined ? row[idxLocalMirror] : '';
        if (compararLocaisEnsaio(localEnsaioRow, localEnsaio)) {
          dataMirror.push(headersReg.map(h => {
            const finalIdx = findMirrorIdx(h);
            const val = finalIdx !== undefined ? row[finalIdx] : '';
            return h === 'REGISTRADO_POR' ? normalizarRegistradoPor(val) : val;
          }));
        }
      }

      const lr = shRegMirror.getLastRow();
      const lc = Math.max(shRegMirror.getLastColumn(), headersReg.length);
      if (lr > 1) shRegMirror.getRange(2, 1, lr - 1, lc).clearContent();
      shRegMirror.getRange(1, 1, 1, headersReg.length).setValues([headersReg]).setFontWeight('bold');
      if (dataMirror.length > 0) {
        shRegMirror.getRange(2, 1, dataMirror.length, headersReg.length).setValues(dataMirror);
      }
      SpreadsheetApp.flush();
      console.log(`âœ… [MIRROR/OTIMIZADA] ${dataMirror.length} registros espelhados em ${planilhaNome}.`);
    }

    try {
      console.log(`🎹 Atualizando listas auxiliares para ${planilhaNome}...`);
      const shReg = ssExterna.getSheetByName('Registros');
      alimentarAbaOrganistasDestino(localEnsaio, ssExterna, localEnsaio, shReg);
      alimentarAbaMinisterioDestino(localEnsaio, ssExterna, localEnsaio, shReg);
    } catch (e) {
      console.warn(`⚠️ Erro ao atualizar listas em ${planilhaNome}: ${e.message}`);
    }
    
    return {
      totalMembros: linhasLocal.length,
      instrumentos: Object.keys(contadores.instrumentos).length,
      cargosMinisteriais: Object.keys(contadores.cargosMinisteriais).length,
      organistas: contadores.organistas
    };
    
  } catch (error) {
    console.error(`❌ Erro na exportação otimizada para ${planilhaNome}:`, error);
    throw error;
  }
}

// Função principal genérica para exportar resumo de ensaio para qualquer planilha destino
function exportarParaPlanilhaDestinoCompleta(localEnsaio, ssDestino, nomePlanilha) {
  try {
    console.log(`🏛️ Iniciando exportação completa para planilha externa de ${nomePlanilha}: ${localEnsaio}`);
    
    const shDados = openOrCreateSheet(SHEET_NAME);
    const lastRow = shDados.getLastRow();
    const lastCol = shDados.getLastColumn();
    
    if (lastRow < 2) {
      throw new Error('Não há dados abaixo do cabeçalho em "Dados".');
    }

    const headerRow = shDados.getRange(1, 1, 1, lastCol).getDisplayValues()[0];
    const data = shDados.getRange(2, 1, lastRow - 1, lastCol).getDisplayValues();

    const headerMap = {};
    headerRow.forEach((h, i) => { 
      if (h) {
        const hClean = h.toString().trim().toUpperCase();
        headerMap[hClean] = i; 
      }
    });

    const linhasLocal = [];
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const nome = norm(row[headerMap['NOME COMPLETO']] || '');
      if (!nome) continue;

      const comum = norm(row[headerMap['COMUM']] || '') || '(Sem comum)';
      const cidade = norm(row[headerMap['CIDADE']] || '') || '(Sem cidade)';
      const localEnsaioRow = norm(row[headerMap['LOCAL_ENSAIO']] || '') || '(Sem local definido)';
      
      if (!compararLocaisEnsaio(localEnsaioRow, localEnsaio)) continue;
      
      const cargoRaw = norm(row[headerMap['CARGO']] || '');
      const cargoK = key(cargoRaw);
      const cargo = aliasCargo[cargoK] || (cargoK ? cap(cargoRaw) : '');
      
      const instrumento = norm(row[headerMap['INSTRUMENTO']] || '');
      const vaiTocar = norm(row[headerMap['VAI_TOCAR']] || '');
      const nivel = norm(row[headerMap['CLASSE_ORGANISTA']] || '');

      linhasLocal.push({
        nome, comum, cidade, cargo, instrumento, vai_tocar: vaiTocar, nivel, local_ensaio: localEnsaioRow, _ord: i
      });
    }

    console.log(`📊 Encontrados ${linhasLocal.length} membros para o local: ${localEnsaio}`);

    const listaCompletaInstrumentos = [
      'Organista', 'Acordeon', 'Violino', 'Viola', 'Violoncelo', 'Flauta transversal',
      'Oboé', "Oboé d'amore", 'Corne inglês', 'Clarinete', 'Clarinete alto', 
      'Clarinete baixo (clarone)', 'Fagote', 'Saxofone soprano (reto)', 'Saxofone alto',
      'Saxofone tenor', 'Saxofone barítono', 'Trompete', 'Cornet', 'Flugelhorn', 'Trompa',
      'Trombone', 'Trombonito', 'Barítono (pisto)', 'Eufônio', 'Tuba'
    ];

    const listaCompletaCargosMinisteriais = [
      'Ancião', 'Diácono', 'Cooperador do Ofício', 'Cooperador de Jovens',
      'Encarregado Regional', 'Encarregado Local', 'Examinadora',
      'Secretária da Música', 'Secretário da Música', 'Instrutor', 'Instrutora'
    ];

    const listaCompletaCargosApoio = [
      'Porteiro (a)', 'Bombeiro (a)', 'Médico (a)', 'Enfermeiro (a)', 'Irmandade'
    ];

    const contadores = { instrumentos: {}, musicos: {}, cargosMinisteriais: {}, cargosApoio: {}, total: 0 };

    listaCompletaInstrumentos.forEach(inst => {
      contadores.instrumentos[inst] = 0;
      contadores.musicos[inst] = 0;
    });

    listaCompletaCargosMinisteriais.forEach(cargo => { contadores.cargosMinisteriais[cargo] = 0; });
    listaCompletaCargosApoio.forEach(cargo => { contadores.cargosApoio[cargo] = 0; });

    linhasLocal.forEach(x => {
      if (!estevePresente(x)) return;
      contadores.total++;
      
      const cargoLower = x.cargo ? x.cargo.toLowerCase() : '';
      const isSecretariaMusica = (cargoLower.includes('secretária') || cargoLower.includes('secretaria')) &&
                                 (cargoLower.includes('música') || cargoLower.includes('musica')) &&
                                 !cargoLower.includes('secretário') && !cargoLower.includes('secretario');
      
      if (cargoLower.includes('organista') || cargoLower.includes('examinadora') || 
          cargoLower.includes('instrutora') || cargoLower.includes('instrutoras') || isSecretariaMusica) {
        contadores.instrumentos['Organista']++;
        contadores.musicos['Organista']++;
      } else if (x.instrumento && !cargoLower.includes('secretário da música') && !cargoLower.includes('secretaria da musica') && !cargoLower.includes('secretarios da musica') && !cargoLower.includes('secretarias da musica')) {
        const instrumentoMapeado = mapearInstrumento(x.instrumento);
        if (instrumentoMapeado && contadores.instrumentos.hasOwnProperty(instrumentoMapeado) && instrumentoMapeado !== 'Organista') {
          contadores.instrumentos[instrumentoMapeado]++;
          contadores.musicos[instrumentoMapeado]++;
        }
      }
      
      if (x.cargo) {
        const cargoOriginal = x.cargo;
        const cargoMapeado = mapearCargoParaContagem(cargoOriginal);
        if (cargoMapeado) {
          if (listaCompletaCargosMinisteriais.includes(cargoMapeado)) {
            contadores.cargosMinisteriais[cargoMapeado]++;
          } else if (listaCompletaCargosApoio.includes(cargoMapeado)) {
            contadores.cargosApoio[cargoMapeado]++;
          }
        }
      }
    });

    const shResumo = ssDestino.getSheetByName('Resumo');
    if (!shResumo) throw new Error(`Aba "Resumo" não encontrada na planilha de ${nomePlanilha}.`);
    
    limparContadoresResumo(shResumo, [28, 41, 48, 50]);
    console.log(`📊 Atualizando aba Resumo da planilha externa de ${nomePlanilha}...`);
    
    const INSTR_LABEL_SYNONYMS = { 'Organista': ['Organista','Organistas'] };
    const CARGO_MIN_ORD = [
      'Ancião','Diácono','Cooperador do Ofício','Cooperador de Jovens',
      'Encarregado Regional','Encarregado Local','Examinadora',
      'Secretária da Música','Secretário da Música','Instrutor','Instrutora'
    ];
    const APOIO_LABEL_SYNONYMS = {
      'Porteiro (a)': ['Porteiros (as)', 'Porteiro (a)'],
      'Bombeiro (a)': ['Bombeiros (as)', 'Bombeiro (a)'],
      'Médico (a)': ['Médicos (as) / Ambulatório', 'Medicos (as) / Ambulatorio', 'Médico (a)', 'Medico (a)'],
      'Enfermeiro (a)': ['Enfermeiros (as)', 'Enfermeiro (a)'],
      'Irmandade': ['Irmandade']
    };
    const APOIO_IRM_ORD = Object.keys(APOIO_LABEL_SYNONYMS);
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

    const arrayAtualizacoes = [];

    listaCompletaInstrumentos.forEach(canonical => {
      const valInstr = contadores.instrumentos[canonical] || 0;
      const valMusicos = contadores.musicos[canonical] || 0;
      const rLabels = INSTR_LABEL_SYNONYMS[canonical] || [canonical];
      
      rLabels.forEach(rot => {
        // Se houver "Organistas" e "Organista", ambos recebem o mesmo valor
        // Mas note que a planilha pode ter rótulos diferentes para instrumentos vs musicos
        // Na prática, os instrumentos e músicos usam os mesmos nomes de instrumentos no resumo
        // Se o valor de instrumentos e músicos for o mesmo (como é o caso atual), basta um.
        arrayAtualizacoes.push({ rotulo: rot, valor: valInstr });
      });
    });

    CARGO_MIN_ORD.forEach(canonical => {
      const val = contadores.cargosMinisteriais[canonical] || 0;
      const rLabels = MIN_LABEL_SYNONYMS[canonical] || [canonical];
      rLabels.forEach(rot => arrayAtualizacoes.push({ rotulo: rot, valor: val }));
    });

    APOIO_IRM_ORD.forEach(canonical => {
      const val = contadores.cargosApoio[canonical] || 0;
      APOIO_LABEL_SYNONYMS[canonical].forEach(rot => arrayAtualizacoes.push({ rotulo: rot, valor: val }));
    });
    
    
    // 🚨 NOVO: GARANTIA DE FIDELIDADE TOTAL (Mirroring Registros)
    // Antes de atualizar o Resumo, vamos garantir que a aba Registros da Regional seja IDÊNTICA à da Matriz para este local.
    console.log(`📥 [MIRROR] Espelhando aba 'Registros' para garantir fidelidade total...`);
    const shRegDestino = ssDestino.getSheetByName('Registros');
    if (shRegDestino) {
      // Prepara os dados para a aba Registros (formato padronizado)
      const headersReg = ['UUID','NOME COMPLETO','COMUM','CIDADE','CARGO','NÍVEL','INSTRUMENTO','NAIPE_INSTRUMENTO','CLASSE_ORGANISTA','LOCAL_ENSAIO','DATA_ENSAIO','REGISTRADO_POR','SYNC_STATUS','SYNCED_AT','ANOTACOES','DUPLICATA'];
      const dataMirror = [];
      
      // Busca dados brutos da mestre para este local para evitar perdas na normalização
      const findMirrorIdx = (header) => {
        const h = String(header || '').toUpperCase();
        const variants = [
          h,
          h.replace(/_/g, ' '),
          h.replace(/\s+/g, '_')
        ];
        for (const variant of variants) {
          if (headerMap[variant] !== undefined) return headerMap[variant];
        }
        return undefined;
      };

      for (let i = 0; i < data.length; i++) {
        const row = data[i];
        const idxLocalMirror = findMirrorIdx('LOCAL_ENSAIO');
        const localEnsaioRow = idxLocalMirror !== undefined ? row[idxLocalMirror] : '';
        if (compararLocaisEnsaio(localEnsaioRow, localEnsaio)) {
          dataMirror.push(headersReg.map(h => {
             const finalIdx = findMirrorIdx(h);
             const val = finalIdx !== undefined ? row[finalIdx] : '';
             return h === 'REGISTRADO_POR' ? normalizarRegistradoPor(val) : val;
          }));
        }
      }

      const lrMirror = shRegDestino.getLastRow();
      const lcMirror = Math.max(shRegDestino.getLastColumn(), headersReg.length);
      if (lrMirror > 1) shRegDestino.getRange(2, 1, lrMirror - 1, lcMirror).clearContent();
      shRegDestino.getRange(1, 1, 1, headersReg.length).setValues([headersReg]).setFontWeight('bold');

      if (dataMirror.length > 0) {
        // Limpa e sobrescreve
        const lr = shRegDestino.getLastRow();
        if (lr > 1) shRegDestino.getRange(2, 1, lr - 1, shRegDestino.getLastColumn()).clearContent();
        shRegDestino.getRange(1, 1, 1, headersReg.length).setValues([headersReg]).setFontWeight('bold');
        shRegDestino.getRange(2, 1, dataMirror.length, headersReg.length).setValues(dataMirror);
        // Força a gravação física antes de processar Organistas/Ministério
        SpreadsheetApp.flush(); 
        console.log(`✅ [MIRROR] ${dataMirror.length} registros espelhados com sucesso.`);
      }
    }

    // Prossiga com a atualização do Dashboard usando a lógica incremental mas com recontagem total
    atualizarTodosContadoresResumoBulk(shResumo, arrayAtualizacoes, [28, 41, 48, 50]);

    // 🚨 NOVO: Atualiza Organistas e Ministério também na exportação completa
    try {
      console.log(`🎹 Atualizando listas auxiliares para ${nomePlanilha}...`);
      // Força nova leitura para garantir que o mirror foi consolidado
      SpreadsheetApp.flush();
      Utilities.sleep(1000); 
      alimentarAbaOrganistasDestino(localEnsaio, ssDestino, localEnsaio, shRegDestino);
      alimentarAbaMinisterioDestino(localEnsaio, ssDestino, localEnsaio, shRegDestino);
      SpreadsheetApp.flush();
    } catch (e) {
      console.warn(`⚠️ Erro ao atualizar listas em ${nomePlanilha}: ${e.message}`);
    }


    console.log(`✅ Aba Resumo atualizada com sucesso em ${nomePlanilha}`);
    return {
      ok: true,
      localEnsaio: localEnsaio,
      abaAtualizada: 'Resumo',
      planilhaId: ssDestino.getId(),
      totalMembros: contadores.total,
      instrumentos: contadores.instrumentos,
      cargosMinisteriais: contadores.cargosMinisteriais,
      cargosApoio: contadores.cargosApoio
    };
  } catch (error) {
    console.error(`❌ Erro ao atualizar aba Resumo de ${nomePlanilha}:`, error);
    throw error;
  }
}

// Função para alimentar aba Organistas na planilha externa de Itapevi

function exportarParaPlanilhaItapeviCompleta(localEnsaio) {
  return exportarParaPlanilhaDestinoCompleta(localEnsaio, openItapeviSheet(), 'Itapevi');
}

// Função para exportar dados completos para planilha externa de Caucaia (com instrumentos e cargos)

function exportarParaPlanilhaCaucaiaCompleta(localEnsaio) {
  return exportarParaPlanilhaDestinoCompleta(localEnsaio, openCaucaiaSheet(), 'Caucaia');
}

// Função para exportar dados completos para planilha externa de VargemGrande (com instrumentos e cargos)

function exportarParaPlanilhaVargemGrandeCompleta(localEnsaio) {
  return exportarParaPlanilhaDestinoCompleta(localEnsaio, openVargemGrandeSheet(), 'VargemGrande');
}

// Função para exportar dados completos para planilha externa de Fazendinha (com instrumentos e cargos)

function exportarParaPlanilhaFazendinhaCompleta(localEnsaio) {
  return exportarParaPlanilhaDestinoCompleta(localEnsaio, openFazendinhaSheet(), 'Fazendinha');
}

// Função para exportar dados completos para planilha externa de Jandira (com instrumentos e cargos)

function exportarParaPlanilhaJandiraCompleta(localEnsaio) {
  return exportarParaPlanilhaDestinoCompleta(localEnsaio, openJandiraSheet(), 'Jandira');
}

// Função para exportar dados completos para planilha externa de Cotia (com instrumentos e cargos)

function exportarParaPlanilhaCotiaCompleta(localEnsaio) {
  return exportarParaPlanilhaDestinoCompleta(localEnsaio, openCotiaSheet(), 'Cotia');
}

// Função para mapear instrumentos da planilha para a lista padrão

// Função para exportar dados completos para planilha externa de Pirapora (com instrumentos e cargos)

function exportarParaPlanilhaPiraporaCompleta(localEnsaio) {
  return exportarParaPlanilhaDestinoCompleta(localEnsaio, openPiraporaSheet(), 'Pirapora');
}

function mapearInstrumento(instrumento) {
  if (!instrumento) return null;
  const instNorm = instrumento.trim().toLowerCase();
  
  // Lógica de mapeamento para instrumentos padrão
  if (instNorm === 'organista' || instNorm === 'órgão') return 'Organista';
  if (instNorm === 'violino') return 'Violino';
  if (instNorm === 'viola') return 'Viola';
  if (instNorm === 'violoncelo' || instNorm === 'cello') return 'Violoncelo';
  if (instNorm === 'flauta transversal' || instNorm === 'flauta') return 'Flauta transversal';
  if (instNorm === 'oboe' || instNorm === 'oboé') return 'Oboé';
  if (instNorm.includes('clarinete')) {
    if (instNorm.includes('alto')) return 'Clarinete alto';
    if (instNorm.includes('baixo') || instNorm.includes('clarone')) return 'Clarinete baixo (clarone)';
    return 'Clarinete';
  }
  if (instNorm.includes('saxofone')) {
    if (instNorm.includes('soprano')) return 'Saxofone soprano (reto)';
    if (instNorm.includes('alto')) return 'Saxofone alto';
    if (instNorm.includes('tenor')) return 'Saxofone tenor';
    if (instNorm.includes('barítono') || instNorm.includes('baritono')) return 'Saxofone barítono';
    return 'Saxofone alto';
  }
  if (instNorm === 'trompete' || instNorm === 'pistão') return 'Trompete';
  if (instNorm === 'trombone') return 'Trombone';
  if (instNorm === 'tuba' || instNorm === 'bombardão') return 'Tuba';
  if (instNorm === 'eufônio' || instNorm === 'bombardino') return 'Eufônio';
  
  return instrumento; // Retorna o original se não houver mapeamento específico
}
