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
      headerMap[header] = index;
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
          const cargoFormatado = formatarTexto(cargoOriginal);
          
          const mapeamentoCargos = {
            'ancião': 'Ancião',
            'diácono': 'Diácono',
            'cooperador do ofício': 'Cooperador do Ofício',
            'cooperador do oficio': 'Cooperador do Ofício',
            'cooperador do ofício ministerial': 'Cooperador do Ofício',
            'cooperador do oficio ministerial': 'Cooperador do Ofício',
            'cooperador de jovens': 'Cooperador de Jovens',
            'cooperador de jovens e menores': 'Cooperador de Jovens',
            'encarregado regional': 'Encarregado Regional',
            'encarregado local': 'Encarregado Local',
            'examinadora': 'Examinadora',
            'examinadoras': 'Examinadora',
            'examinador': 'Examinadora',
            'examinadores': 'Examinadora',
            'examinadora de organistas': 'Examinadora',
            'examinadoras de organistas': 'Examinadora',
            'examinador de organistas': 'Examinadora',
            'examinadores de organistas': 'Examinadora',
            'secretária da música': 'Secretária da Música',
            'secretarias da música': 'Secretária da Música',
            'secretaria da musica': 'Secretária da Música',
            'secretarias da musica': 'Secretária da Música',
            'secretário da música': 'Secretário da Música',
            'secretarios da música': 'Secretário da Música',
            'secretario da musica': 'Secretário da Música',
            'secretarios da musica': 'Secretário da Música',
            'instrutor': 'Instrutor',
            'instrutora': 'Instrutora',
            'instrutores': 'Instrutor',
            'instrutoras': 'Instrutora',
            'porteiro (a)': 'Porteiro (a)',
            'porteiro': 'Porteiro (a)',
            'porteira': 'Porteiro (a)',
            'bombeiro (a)': 'Bombeiro (a)',
            'bombeiro': 'Bombeiro (a)',
            'bombeira': 'Bombeiro (a)',
            'médico (a)': 'Médico (a)',
            'medico': 'Médico (a)',
            'medica': 'Médico (a)',
            'enfermeiro (a)': 'Enfermeiro (a)',
            'enfermeiro': 'Enfermeiro (a)',
            'enfermeira': 'Enfermeiro (a)',
            'irmandade': 'Irmandade',
            'irma': 'Irmandade',
            'irmao': 'Irmandade',
            'irmão': 'Irmandade',
            'irmã': 'Irmandade',
            'irmãos': 'Irmandade',
            'irmãs': 'Irmandade'
          };
          
          const cargoMapeado = mapeamentoCargos[cargoFormatado.toLowerCase()];
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
    }
    
    // Executa todas as atualizações de uma vez (otimização)
    atualizacoes.forEach(atualizacao => {
      try {
        atualizarColunaBPreservandoFormulas(shResumo, atualizacao.rotulo, atualizacao.valor, [28, 41, 48, 50]);
      } catch (e) {
        console.log(`⚠️ Não foi possível atualizar ${atualizacao.rotulo}: ${e.message}`);
      }
    });
    
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

// Função para alimentar aba Organistas na planilha externa de Itapevi

function exportarParaPlanilhaItapeviCompleta(localEnsaio) {
  try {
    console.log(`🏛️ Iniciando exportação completa para planilha externa de Itapevi: ${localEnsaio}`);
    
    const shDados = openOrCreateSheet(SHEET_NAME);
    const lastRow = shDados.getLastRow();
    const lastCol = shDados.getLastColumn();
    
    if (lastRow < 2) {
      throw new Error('Não há dados abaixo do cabeçalho em "Dados".');
    }

    const headerRow = shDados.getRange(1, 1, 1, lastCol).getDisplayValues()[0];
    const data = shDados.getRange(2, 1, lastRow - 1, lastCol).getDisplayValues();

    // Mapeia os índices das colunas
    const headerMap = {};
    headerRow.forEach((h, i) => { 
      if (h) headerMap[h.toString().trim()] = i; 
    });

    // Filtra dados apenas do local especificado
    const linhasLocal = [];
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const nome = norm(row[headerMap['NOME COMPLETO']] || '');
      if (!nome) continue;

      const comum = norm(row[headerMap['COMUM']] || '') || '(Sem comum)';
      const cidade = norm(row[headerMap['CIDADE']] || '') || '(Sem cidade)';
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
        nome, comum, cidade, cargo, instrumento, vai_tocar: vaiTocar, nivel, local_ensaio: localEnsaioRow, _ord: i
      });
    }

    console.log(`📊 Encontrados ${linhasLocal.length} membros para o local: ${localEnsaio}`);

    // Lista completa de instrumentos
    const listaCompletaInstrumentos = [
      'Organista', 'Acordeon', 'Violino', 'Viola', 'Violoncelo', 'Flauta transversal',
      'Oboé', "Oboé d'amore", 'Corne inglês', 'Clarinete', 'Clarinete alto', 
      'Clarinete baixo (clarone)', 'Fagote', 'Saxofone soprano (reto)', 'Saxofone alto',
      'Saxofone tenor', 'Saxofone barítono', 'Trompete', 'Cornet', 'Flugelhorn', 'Trompa',
      'Trombone', 'Trombonito', 'Barítono (pisto)', 'Eufônio', 'Tuba'
    ];

    // Lista completa de cargos ministeriais e de apoio
    const listaCompletaCargosMinisteriais = [
      'Ancião', 'Diácono', 'Cooperador do Ofício', 'Cooperador de Jovens',
      'Encarregado Regional', 'Encarregado Local', 'Examinadora',
      'Secretária da Música', 'Secretário da Música', 'Instrutor', 'Instrutora'
    ];

    const listaCompletaCargosApoio = [
      'Porteiro (a)', 'Bombeiro (a)', 'Médico (a)', 'Enfermeiro (a)', 'Irmandade'
    ];

    // Conta instrumentos e cargos
    const contadores = {
      instrumentos: {},
      musicos: {},
      cargosMinisteriais: {},
      cargosApoio: {},
      total: 0
    };

    // Inicializa todos os instrumentos com 0
    listaCompletaInstrumentos.forEach(inst => {
      contadores.instrumentos[inst] = 0;
      contadores.musicos[inst] = 0;
    });

    // Inicializa todos os cargos ministeriais com 0
    listaCompletaCargosMinisteriais.forEach(cargo => {
      contadores.cargosMinisteriais[cargo] = 0;
    });

    // Inicializa todos os cargos de apoio com 0
    listaCompletaCargosApoio.forEach(cargo => {
      contadores.cargosApoio[cargo] = 0;
    });

    // Processa cada linha do local
    linhasLocal.forEach(x => {
      if (!estevePresente(x)) return;
      
      contadores.total++;
      
      // LÓGICA CORRETA: Organistas são contados por CARGO
      const cargoLower = x.cargo ? x.cargo.toLowerCase() : '';
      if (cargoLower.includes('organista') || cargoLower.includes('examinadora') || 
          cargoLower.includes('instrutora') || cargoLower.includes('instrutoras')) {
        contadores.instrumentos['Organista']++;
        contadores.musicos['Organista']++;
        console.log(`🎹 Organista contado por cargo: ${x.nome} (cargo: ${x.cargo})`);
      } else if (x.instrumento && !cargoLower.includes('secretário da música') && !cargoLower.includes('secretaria da musica') && !cargoLower.includes('secretarios da musica') && !cargoLower.includes('secretarias da musica')) {
        // Mapeia o instrumento para a lista padrão (excluindo secretários da música)
        const instrumentoMapeado = mapearInstrumento(x.instrumento);
        
        if (instrumentoMapeado && contadores.instrumentos.hasOwnProperty(instrumentoMapeado) && instrumentoMapeado !== 'Organista') {
          contadores.instrumentos[instrumentoMapeado]++;
          contadores.musicos[instrumentoMapeado]++;
          console.log(`🎵 Instrumento contado: ${x.instrumento} -> ${instrumentoMapeado} - ${x.nome}`);
        } else if (instrumentoMapeado) {
          console.log(`⚠️ Instrumento não mapeado: ${x.instrumento} (mapeado: ${instrumentoMapeado})`);
        }
      }
      
      // Conta cargos ministeriais específicos
      if (x.cargo) {
        const cargoOriginal = x.cargo;
        const cargoFormatado = formatarTexto(cargoOriginal);
        
        const mapeamentoCargos = {
          'ancião': 'Ancião',
          'diácono': 'Diácono',
          'cooperador do ofício': 'Cooperador do Ofício',
          'cooperador do oficio': 'Cooperador do Ofício',
          'cooperador de jovens': 'Cooperador de Jovens',
          'encarregado regional': 'Encarregado Regional',
          'encarregado local': 'Encarregado Local',
          'examinadora': 'Examinadora',
          'examinadoras': 'Examinadora',
          'examinador': 'Examinadora',
          'examinadores': 'Examinadora',
          'examinadora de organistas': 'Examinadora',
          'examinadoras de organistas': 'Examinadora',
          'examinador de organistas': 'Examinadora',
          'examinadores de organistas': 'Examinadora',
          'secretária da música': 'Secretária da Música',
          'secretarias da música': 'Secretária da Música',
          'secretaria da musica': 'Secretária da Música',
          'secretarias da musica': 'Secretária da Música',
          'secretário da música': 'Secretário da Música',
          'secretarios da música': 'Secretário da Música',
          'secretario da musica': 'Secretário da Música',
          'secretarios da musica': 'Secretário da Música',
          'instrutor': 'Instrutor',
          'instrutora': 'Instrutora',
          'instrutores': 'Instrutor',
          'instrutoras': 'Instrutora',
          'porteiro (a)': 'Porteiro (a)',
          'porteiro': 'Porteiro (a)',
          'porteira': 'Porteiro (a)',
          'bombeiro (a)': 'Bombeiro (a)',
          'bombeiro': 'Bombeiro (a)',
          'bombeira': 'Bombeiro (a)',
          'médico (a)': 'Médico (a)',
          'medico': 'Médico (a)',
          'medica': 'Médico (a)',
          'enfermeiro (a)': 'Enfermeiro (a)',
          'enfermeiro': 'Enfermeiro (a)',
          'enfermeira': 'Enfermeiro (a)',
          'irmandade': 'Irmandade',
          'irma': 'Irmandade',
          'irmao': 'Irmandade',
          'irmão': 'Irmandade',
          'irmã': 'Irmandade',
          'irmãos': 'Irmandade',
          'irmãs': 'Irmandade'
        };
        
        const cargoMapeado = mapeamentoCargos[cargoFormatado.toLowerCase()];
        
        if (contadores.cargosMinisteriais.hasOwnProperty(cargoMapeado)) {
          contadores.cargosMinisteriais[cargoMapeado]++;
        }
        
        if (contadores.cargosApoio.hasOwnProperty(cargoMapeado)) {
          contadores.cargosApoio[cargoMapeado]++;
        }
      }
    });

    // Acessa a planilha externa de Itapevi
    const ssItapevi = openItapeviSheet();
    
    // Acessa a aba Resumo da planilha externa de Itapevi
    const shResumo = ssItapevi.getSheetByName('Resumo');
    if (!shResumo) {
      throw new Error('Aba "Resumo" não encontrada na planilha externa de Itapevi.');
    }
    
    // LIMPA todos os contadores antes de atualizar (correção do problema)
    limparContadoresResumo(shResumo, [28, 41, 48, 50]);
    
    console.log(`📊 Atualizando aba Resumo da planilha externa de Itapevi com dados do ensaio de ${localEnsaio}...`);
    
    // Atualiza apenas os valores usando a função escreveAoLado
    console.log('📊 Atualizando valores na aba Resumo...');
    
    // Sinônimos de rótulo para INSTRUMENTOS
    const INSTR_LABEL_SYNONYMS = {
      'Organista': ['Organista','Organistas']
    };

    const CARGO_MIN_ORD = [
      'Ancião','Diácono','Cooperador do Ofício','Cooperador de Jovens',
      'Encarregado Regional','Encarregado Local','Examinadora',
      'Secretária da Música','Secretário da Música',
      'Instrutor','Instrutora'
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
      'Examinadora': ['Examinadora'],
      'Secretária da Música': ['Secretária da Música','Secretarias da Música','Secretaria da Música'],
      'Secretário da Música': ['Secretário da Música','Secretarios da Música','Secretario da Música'],
      'Instrutores': ['Instrutores','Instrutor'],
      'Instrutoras': ['Instrutoras','Instrutora']
    };

    // Atualiza instrumentos com sinônimos
    listaCompletaInstrumentos.forEach(canonical => {
      const val = contadores.instrumentos[canonical] || 0;
      const rLabels = INSTR_LABEL_SYNONYMS[canonical] || [canonical];
      rLabels.forEach(rot => atualizarColunaBPreservandoFormulas(shResumo, rot, val));
    });

    // Atualiza músicos por instrumento
    listaCompletaInstrumentos.forEach(canonical => {
      const val = contadores.musicos[canonical] || 0;
      const rLabels = INSTR_LABEL_SYNONYMS[canonical] || [canonical];
      rLabels.forEach(rot => atualizarColunaBPreservandoFormulas(shResumo, rot, val));
    });

    // Atualiza cargos ministeriais com sinônimos
    CARGO_MIN_ORD.forEach(canonical => {
      const val = contadores.cargosMinisteriais[canonical] || 0;
      const rLabels = MIN_LABEL_SYNONYMS[canonical] || [canonical];
      rLabels.forEach(rot => atualizarColunaBPreservandoFormulas(shResumo, rot, val));
    });

    // Atualiza cargos de apoio com sinônimos
    APOIO_IRM_ORD.forEach(canonical => {
      const val = contadores.cargosApoio[canonical] || 0;
      APOIO_LABEL_SYNONYMS[canonical].forEach(rot => atualizarColunaBPreservandoFormulas(shResumo, rot, val));
    });

    console.log(`✅ Aba Resumo da planilha externa de Itapevi atualizada com sucesso com dados do ensaio de ${localEnsaio}`);
    console.log(`📈 Total de membros: ${contadores.total}`);
    
    return {
      ok: true,
      localEnsaio: localEnsaio,
      abaAtualizada: 'Resumo',
      planilhaId: ITAPEVI_SHEET_ID,
      totalMembros: contadores.total,
      instrumentos: contadores.instrumentos,
      cargosMinisteriais: contadores.cargosMinisteriais,
      cargosApoio: contadores.cargosApoio
    };

  } catch (error) {
    console.error(`❌ Erro ao atualizar aba Resumo da planilha externa de Itapevi com dados do ensaio de ${localEnsaio}:`, error);
    throw error;
  }
}

// Função para exportar dados completos para planilha externa de Caucaia (com instrumentos e cargos)

function exportarParaPlanilhaCaucaiaCompleta(localEnsaio) {
  try {
    console.log(`🏛️ Iniciando exportação completa para planilha externa de Caucaia: ${localEnsaio}`);
    
    const shDados = openOrCreateSheet(SHEET_NAME);
    const lastRow = shDados.getLastRow();
    const lastCol = shDados.getLastColumn();
    
    if (lastRow < 2) {
      throw new Error('Não há dados abaixo do cabeçalho em "Dados".');
    }

    const headerRow = shDados.getRange(1, 1, 1, lastCol).getDisplayValues()[0];
    const data = shDados.getRange(2, 1, lastRow - 1, lastCol).getDisplayValues();

    // Mapeia os índices das colunas
    const headerMap = {};
    headerRow.forEach((h, i) => { 
      if (h) headerMap[h.toString().trim()] = i; 
    });

    // Filtra dados apenas do local especificado
    const linhasLocal = [];
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const nome = norm(row[headerMap['NOME COMPLETO']] || '');
      if (!nome) continue;

      const comum = norm(row[headerMap['COMUM']] || '') || '(Sem comum)';
      const cidade = norm(row[headerMap['CIDADE']] || '') || '(Sem cidade)';
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
        nome, comum, cidade, cargo, instrumento, vai_tocar: vaiTocar, nivel, local_ensaio: localEnsaioRow, _ord: i
      });
    }

    console.log(`📊 Encontrados ${linhasLocal.length} membros para o local: ${localEnsaio}`);

    // Lista completa de instrumentos
    const listaCompletaInstrumentos = [
      'Organista', 'Acordeon', 'Violino', 'Viola', 'Violoncelo', 'Flauta transversal',
      'Oboé', "Oboé d'amore", 'Corne inglês', 'Clarinete', 'Clarinete alto', 
      'Clarinete baixo (clarone)', 'Fagote', 'Saxofone soprano (reto)', 'Saxofone alto',
      'Saxofone tenor', 'Saxofone barítono', 'Trompete', 'Cornet', 'Flugelhorn', 'Trompa',
      'Trombone', 'Trombonito', 'Barítono (pisto)', 'Eufônio', 'Tuba'
    ];

    // Lista completa de cargos ministeriais e de apoio
    const listaCompletaCargosMinisteriais = [
      'Ancião', 'Diácono', 'Cooperador do Ofício', 'Cooperador de Jovens',
      'Encarregado Regional', 'Encarregado Local', 'Examinadora',
      'Secretária da Música', 'Secretário da Música', 'Instrutor', 'Instrutora'
    ];

    const listaCompletaCargosApoio = [
      'Porteiro (a)', 'Bombeiro (a)', 'Médico (a)', 'Enfermeiro (a)', 'Irmandade'
    ];

    // Conta instrumentos e cargos
    const contadores = {
      instrumentos: {},
      musicos: {},
      cargosMinisteriais: {},
      cargosApoio: {},
      total: 0
    };

    // Inicializa todos os instrumentos com 0
    listaCompletaInstrumentos.forEach(inst => {
      contadores.instrumentos[inst] = 0;
      contadores.musicos[inst] = 0;
    });

    // Inicializa todos os cargos ministeriais com 0
    listaCompletaCargosMinisteriais.forEach(cargo => {
      contadores.cargosMinisteriais[cargo] = 0;
    });

    // Inicializa todos os cargos de apoio com 0
    listaCompletaCargosApoio.forEach(cargo => {
      contadores.cargosApoio[cargo] = 0;
    });

    // Processa cada linha do local
    linhasLocal.forEach(x => {
      if (!estevePresente(x)) return;
      
      contadores.total++;
      
      // LÓGICA CORRETA: Organistas são contados por CARGO
      const cargoLower = x.cargo ? x.cargo.toLowerCase() : '';
      if (cargoLower.includes('organista') || cargoLower.includes('examinadora') || 
          cargoLower.includes('instrutora') || cargoLower.includes('instrutoras')) {
        contadores.instrumentos['Organista']++;
        contadores.musicos['Organista']++;
        console.log(`🎹 Organista contado por cargo: ${x.nome} (cargo: ${x.cargo})`);
      } else if (x.instrumento && !cargoLower.includes('secretário da música') && !cargoLower.includes('secretaria da musica') && !cargoLower.includes('secretarios da musica') && !cargoLower.includes('secretarias da musica')) {
        // Mapeia o instrumento para a lista padrão (excluindo secretários da música)
        const instrumentoMapeado = mapearInstrumento(x.instrumento);
        
        if (instrumentoMapeado && contadores.instrumentos.hasOwnProperty(instrumentoMapeado) && instrumentoMapeado !== 'Organista') {
          contadores.instrumentos[instrumentoMapeado]++;
          contadores.musicos[instrumentoMapeado]++;
          console.log(`🎵 Instrumento contado: ${x.instrumento} -> ${instrumentoMapeado} - ${x.nome}`);
        } else if (instrumentoMapeado) {
          console.log(`⚠️ Instrumento não mapeado: ${x.instrumento} (mapeado: ${instrumentoMapeado})`);
        }
      }
      
      // Conta cargos ministeriais específicos
      if (x.cargo) {
        const cargoOriginal = x.cargo;
        const cargoFormatado = formatarTexto(cargoOriginal);
        
        const mapeamentoCargos = {
          'ancião': 'Ancião',
          'diácono': 'Diácono',
          'cooperador do ofício': 'Cooperador do Ofício',
          'cooperador do oficio': 'Cooperador do Ofício',
          'cooperador de jovens': 'Cooperador de Jovens',
          'encarregado regional': 'Encarregado Regional',
          'encarregado local': 'Encarregado Local',
          'examinadora': 'Examinadora',
          'examinadoras': 'Examinadora',
          'examinador': 'Examinadora',
          'examinadores': 'Examinadora',
          'examinadora de organistas': 'Examinadora',
          'examinadoras de organistas': 'Examinadora',
          'examinador de organistas': 'Examinadora',
          'examinadores de organistas': 'Examinadora',
          'secretária da música': 'Secretária da Música',
          'secretarias da música': 'Secretária da Música',
          'secretaria da musica': 'Secretária da Música',
          'secretarias da musica': 'Secretária da Música',
          'secretário da música': 'Secretário da Música',
          'secretarios da música': 'Secretário da Música',
          'secretario da musica': 'Secretário da Música',
          'secretarios da musica': 'Secretário da Música',
          'secretário do gem': 'Secretário da Música',
          'secretarios do gem': 'Secretário da Música',
          'secretario do gem': 'Secretário da Música',
          'instrutor': 'Instrutor',
          'instrutora': 'Instrutora',
          'instrutores': 'Instrutor',
          'instrutoras': 'Instrutora',
          'porteiro (a)': 'Porteiro (a)',
          'bombeiro (a)': 'Bombeiro (a)',
          'médico (a)': 'Médico (a)',
          'medico (a)': 'Médico (a)',
          'enfermeiro (a)': 'Enfermeiro (a)',
          'irmandade': 'Irmandade'
        };
        
        const cargoMapeado = mapeamentoCargos[cargoFormatado];
        if (cargoMapeado) {
          if (listaCompletaCargosMinisteriais.includes(cargoMapeado)) {
            contadores.cargosMinisteriais[cargoMapeado]++;
            console.log(`👔 Cargo ministerial contado: ${cargoOriginal} -> ${cargoMapeado} - ${x.nome}`);
          } else if (listaCompletaCargosApoio.includes(cargoMapeado)) {
            contadores.cargosApoio[cargoMapeado]++;
            console.log(`🤝 Cargo de apoio contado: ${cargoOriginal} -> ${cargoMapeado} - ${x.nome}`);
          }
        }
      }
    });

    console.log(`📊 Contadores finais para ${localEnsaio}:`, contadores);

    // Acessa a planilha externa de Caucaia
    const ssCaucaia = openCaucaiaSheet();
    const shResumo = ssCaucaia.getSheetByName('Resumo');
    
    if (!shResumo) {
      throw new Error('Aba "Resumo" não encontrada na planilha externa de Caucaia');
    }
    
    // LIMPA todos os contadores antes de atualizar (correção do problema)
    limparContadoresResumo(shResumo, [28, 41, 48, 50]);
    
    console.log(`📊 Atualizando aba Resumo da planilha externa de Caucaia com dados do ensaio de ${localEnsaio}...`);
    
    // Atualiza apenas os valores usando a função escreveAoLado
    console.log('📊 Atualizando valores na aba Resumo...');
    
    // Sinônimos de rótulo para INSTRUMENTOS
    const INSTR_LABEL_SYNONYMS = {
      'Organista': ['Organista','Organistas']
    };

    const CARGO_MIN_ORD = [
      'Ancião','Diácono','Cooperador do Ofício','Cooperador de Jovens',
      'Encarregado Regional','Encarregado Local','Examinadora',
      'Secretária da Música','Secretário da Música',
      'Instrutor','Instrutora'
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
      'Examinadora': ['Examinadora'],
      'Secretária da Música': ['Secretária da Música','Secretarias da Música','Secretaria da Música'],
      'Secretário da Música': ['Secretário da Música','Secretarios da Música','Secretario da Música'],
      'Instrutores': ['Instrutores','Instrutor'],
      'Instrutoras': ['Instrutoras','Instrutora']
    };

    // Atualiza instrumentos com sinônimos
    listaCompletaInstrumentos.forEach(canonical => {
      const val = contadores.instrumentos[canonical] || 0;
      const rLabels = INSTR_LABEL_SYNONYMS[canonical] || [canonical];
      rLabels.forEach(rot => atualizarColunaBPreservandoFormulas(shResumo, rot, val));
    });

    // Atualiza músicos por instrumento
    listaCompletaInstrumentos.forEach(canonical => {
      const val = contadores.musicos[canonical] || 0;
      const rLabels = INSTR_LABEL_SYNONYMS[canonical] || [canonical];
      rLabels.forEach(rot => atualizarColunaBPreservandoFormulas(shResumo, rot, val));
    });

    // Atualiza cargos ministeriais com sinônimos
    CARGO_MIN_ORD.forEach(canonical => {
      const val = contadores.cargosMinisteriais[canonical] || 0;
      const rLabels = MIN_LABEL_SYNONYMS[canonical] || [canonical];
      rLabels.forEach(rot => atualizarColunaBPreservandoFormulas(shResumo, rot, val));
    });

    // Atualiza cargos de apoio com sinônimos
    APOIO_IRM_ORD.forEach(canonical => {
      const val = contadores.cargosApoio[canonical] || 0;
      APOIO_LABEL_SYNONYMS[canonical].forEach(rot => atualizarColunaBPreservandoFormulas(shResumo, rot, val));
    });

    console.log(`✅ Aba Resumo da planilha externa de Caucaia atualizada com sucesso com dados do ensaio de ${localEnsaio}`);
    console.log(`📈 Total de membros: ${contadores.total}`);
    
    return {
      ok: true,
      localEnsaio: localEnsaio,
      abaAtualizada: 'Resumo',
      planilhaId: CAUCAIA_SHEET_ID,
      totalMembros: contadores.total,
      instrumentos: contadores.instrumentos,
      cargosMinisteriais: contadores.cargosMinisteriais,
      cargosApoio: contadores.cargosApoio
    };

  } catch (error) {
    console.error(`❌ Erro ao atualizar aba Resumo da planilha externa de Caucaia com dados do ensaio de ${localEnsaio}:`, error);
    throw error;
  }
}

// Função para exportar dados completos para planilha externa de VargemGrande (com instrumentos e cargos)

function exportarParaPlanilhaVargemGrandeCompleta(localEnsaio) {
  try {
    console.log(`🏛️ Iniciando exportação completa para planilha externa de VargemGrande: ${localEnsaio}`);
    
    const shDados = openOrCreateSheet(SHEET_NAME);
    const lastRow = shDados.getLastRow();
    const lastCol = shDados.getLastColumn();
    
    if (lastRow < 2) {
      throw new Error('Não há dados abaixo do cabeçalho em "Dados".');
    }

    const headerRow = shDados.getRange(1, 1, 1, lastCol).getDisplayValues()[0];
    const data = shDados.getRange(2, 1, lastRow - 1, lastCol).getDisplayValues();

    // Mapeia os índices das colunas
    const headerMap = {};
    headerRow.forEach((h, i) => { 
      if (h) headerMap[h.toString().trim()] = i; 
    });

    // Filtra dados apenas do local especificado
    const linhasLocal = [];
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const nome = norm(row[headerMap['NOME COMPLETO']] || '');
      if (!nome) continue;

      const comum = norm(row[headerMap['COMUM']] || '') || '(Sem comum)';
      const cidade = norm(row[headerMap['CIDADE']] || '') || '(Sem cidade)';
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
        nome, comum, cidade, cargo, instrumento, vai_tocar: vaiTocar, nivel, local_ensaio: localEnsaioRow, _ord: i
      });
    }

    console.log(`📊 Encontrados ${linhasLocal.length} membros para o local: ${localEnsaio}`);

    // Lista completa de instrumentos
    const listaCompletaInstrumentos = [
      'Organista', 'Acordeon', 'Violino', 'Viola', 'Violoncelo', 'Flauta transversal',
      'Oboé', "Oboé d'amore", 'Corne inglês', 'Clarinete', 'Clarinete alto', 
      'Clarinete baixo (clarone)', 'Fagote', 'Saxofone soprano (reto)', 'Saxofone alto',
      'Saxofone tenor', 'Saxofone barítono', 'Trompete', 'Cornet', 'Flugelhorn', 'Trompa',
      'Trombone', 'Trombonito', 'Barítono (pisto)', 'Eufônio', 'Tuba'
    ];

    // Lista completa de cargos ministeriais e de apoio
    const listaCompletaCargosMinisteriais = [
      'Ancião', 'Diácono', 'Cooperador do Ofício', 'Cooperador de Jovens',
      'Encarregado Regional', 'Encarregado Local', 'Examinadora',
      'Secretária da Música', 'Secretário da Música', 'Instrutor', 'Instrutora'
    ];

    const listaCompletaCargosApoio = [
      'Porteiro (a)', 'Bombeiro (a)', 'Médico (a)', 'Enfermeiro (a)', 'Irmandade'
    ];

    // Conta instrumentos e cargos
    const contadores = {
      instrumentos: {},
      musicos: {},
      cargosMinisteriais: {},
      cargosApoio: {},
      total: 0
    };

    // Inicializa todos os instrumentos com 0
    listaCompletaInstrumentos.forEach(inst => {
      contadores.instrumentos[inst] = 0;
      contadores.musicos[inst] = 0;
    });

    // Inicializa todos os cargos ministeriais com 0
    listaCompletaCargosMinisteriais.forEach(cargo => {
      contadores.cargosMinisteriais[cargo] = 0;
    });

    // Inicializa todos os cargos de apoio com 0
    listaCompletaCargosApoio.forEach(cargo => {
      contadores.cargosApoio[cargo] = 0;
    });

    // Processa cada linha do local
    linhasLocal.forEach(x => {
      if (!estevePresente(x)) return;
      
      contadores.total++;
      
      // LÓGICA CORRETA: Organistas são contados por CARGO
      const cargoLower = x.cargo ? x.cargo.toLowerCase() : '';
      if (cargoLower.includes('organista') || cargoLower.includes('examinadora') || 
          cargoLower.includes('instrutora') || cargoLower.includes('instrutoras')) {
        contadores.instrumentos['Organista']++;
        contadores.musicos['Organista']++;
        console.log(`🎹 Organista contado por cargo: ${x.nome} (cargo: ${x.cargo})`);
      } else if (x.instrumento && !cargoLower.includes('secretário da música') && !cargoLower.includes('secretaria da musica') && !cargoLower.includes('secretarios da musica') && !cargoLower.includes('secretarias da musica')) {
        // Mapeia o instrumento para a lista padrão (excluindo secretários da música)
        const instrumentoMapeado = mapearInstrumento(x.instrumento);
        
        if (instrumentoMapeado && contadores.instrumentos.hasOwnProperty(instrumentoMapeado) && instrumentoMapeado !== 'Organista') {
          contadores.instrumentos[instrumentoMapeado]++;
          contadores.musicos[instrumentoMapeado]++;
          console.log(`🎵 Instrumento contado: ${x.instrumento} -> ${instrumentoMapeado} - ${x.nome}`);
        } else if (instrumentoMapeado) {
          console.log(`⚠️ Instrumento não mapeado: ${x.instrumento} (mapeado: ${instrumentoMapeado})`);
        }
      }
      
      // Conta cargos ministeriais específicos
      if (x.cargo) {
        const cargoOriginal = x.cargo;
        const cargoFormatado = formatarTexto(cargoOriginal);
        
        const mapeamentoCargos = {
          'ancião': 'Ancião',
          'diácono': 'Diácono',
          'cooperador do ofício': 'Cooperador do Ofício',
          'cooperador do oficio': 'Cooperador do Ofício',
          'cooperador de jovens': 'Cooperador de Jovens',
          'encarregado regional': 'Encarregado Regional',
          'encarregado local': 'Encarregado Local',
          'examinadora': 'Examinadora',
          'examinadoras': 'Examinadora',
          'examinador': 'Examinadora',
          'examinadores': 'Examinadora',
          'examinadora de organistas': 'Examinadora',
          'examinadoras de organistas': 'Examinadora',
          'examinador de organistas': 'Examinadora',
          'examinadores de organistas': 'Examinadora',
          'secretária da música': 'Secretária da Música',
          'secretarias da música': 'Secretária da Música',
          'secretaria da musica': 'Secretária da Música',
          'secretarias da musica': 'Secretária da Música',
          'secretário da música': 'Secretário da Música',
          'secretarios da música': 'Secretário da Música',
          'secretario da musica': 'Secretário da Música',
          'secretarios da musica': 'Secretário da Música',
          'secretário do gem': 'Secretário da Música',
          'secretarios do gem': 'Secretário da Música',
          'secretario do gem': 'Secretário da Música',
          'instrutor': 'Instrutor',
          'instrutora': 'Instrutora',
          'instrutores': 'Instrutor',
          'instrutoras': 'Instrutora',
          'porteiro (a)': 'Porteiro (a)',
          'porteiro': 'Porteiro (a)',
          'porteira': 'Porteiro (a)',
          'bombeiro (a)': 'Bombeiro (a)',
          'bombeiro': 'Bombeiro (a)',
          'bombeira': 'Bombeiro (a)',
          'médico (a)': 'Médico (a)',
          'medico': 'Médico (a)',
          'medica': 'Médico (a)',
          'enfermeiro (a)': 'Enfermeiro (a)',
          'enfermeiro': 'Enfermeiro (a)',
          'enfermeira': 'Enfermeiro (a)',
          'irmandade': 'Irmandade',
          'irma': 'Irmandade',
          'irmao': 'Irmandade',
          'irmão': 'Irmandade',
          'irmã': 'Irmandade',
          'irmãos': 'Irmandade',
          'irmãs': 'Irmandade'
        };
        
        const cargoMapeado = mapeamentoCargos[cargoFormatado.toLowerCase()];
        if (cargoMapeado) {
          if (listaCompletaCargosMinisteriais.includes(cargoMapeado)) {
            contadores.cargosMinisteriais[cargoMapeado]++;
            console.log(`👔 Cargo ministerial contado: ${cargoOriginal} -> ${cargoMapeado} - ${x.nome}`);
          } else if (listaCompletaCargosApoio.includes(cargoMapeado)) {
            contadores.cargosApoio[cargoMapeado]++;
            console.log(`🤝 Cargo de apoio contado: ${cargoOriginal} -> ${cargoMapeado} - ${x.nome}`);
          }
        }
      }
    });

    console.log(`📊 Contadores finais para ${localEnsaio}:`, contadores);

    // Acessa a planilha externa de VargemGrande
    const ssVargemGrande = openVargemGrandeSheet();
    
    // Acessa a aba Resumo da planilha externa de VargemGrande
    const shResumo = ssVargemGrande.getSheetByName('Resumo');
    if (!shResumo) {
      throw new Error('Aba "Resumo" não encontrada na planilha externa de VargemGrande.');
    }
    
    // LIMPA todos os contadores antes de atualizar (correção do problema)
    limparContadoresResumo(shResumo, [28, 41, 48, 50]);
    
    console.log(`📊 Atualizando aba Resumo da planilha externa de VargemGrande com dados do ensaio de ${localEnsaio}...`);
    
    // Atualiza apenas os valores usando a função escreveAoLado
    console.log('📊 Atualizando valores na aba Resumo...');
    
    // Sinônimos de rótulo para INSTRUMENTOS
    const INSTR_LABEL_SYNONYMS = {
      'Organista': ['Organista','Organistas']
    };

    const CARGO_MIN_ORD = [
      'Ancião','Diácono','Cooperador do Ofício','Cooperador de Jovens',
      'Encarregado Regional','Encarregado Local','Examinadora',
      'Secretária da Música','Secretário da Música',
      'Instrutor','Instrutora'
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
      'Examinadora': ['Examinadora'],
      'Secretária da Música': ['Secretária da Música','Secretarias da Música','Secretaria da Música'],
      'Secretário da Música': ['Secretário da Música','Secretarios da Música','Secretario da Música'],
      'Instrutores': ['Instrutores','Instrutor'],
      'Instrutoras': ['Instrutoras','Instrutora']
    };

    // Atualiza instrumentos com sinônimos
    listaCompletaInstrumentos.forEach(canonical => {
      const val = contadores.instrumentos[canonical] || 0;
      const rLabels = INSTR_LABEL_SYNONYMS[canonical] || [canonical];
      rLabels.forEach(rot => atualizarColunaBPreservandoFormulas(shResumo, rot, val));
    });

    // Atualiza músicos por instrumento
    listaCompletaInstrumentos.forEach(canonical => {
      const val = contadores.musicos[canonical] || 0;
      const rLabels = INSTR_LABEL_SYNONYMS[canonical] || [canonical];
      rLabels.forEach(rot => atualizarColunaBPreservandoFormulas(shResumo, rot, val));
    });

    // Atualiza cargos ministeriais com sinônimos
    CARGO_MIN_ORD.forEach(canonical => {
      const val = contadores.cargosMinisteriais[canonical] || 0;
      const rLabels = MIN_LABEL_SYNONYMS[canonical] || [canonical];
      rLabels.forEach(rot => atualizarColunaBPreservandoFormulas(shResumo, rot, val));
    });

    // Atualiza cargos de apoio com sinônimos
    APOIO_IRM_ORD.forEach(canonical => {
      const val = contadores.cargosApoio[canonical] || 0;
      APOIO_LABEL_SYNONYMS[canonical].forEach(rot => atualizarColunaBPreservandoFormulas(shResumo, rot, val));
    });

    console.log(`✅ Aba Resumo da planilha externa de VargemGrande atualizada com sucesso com dados do ensaio de ${localEnsaio}`);
    console.log(`📈 Total de membros: ${contadores.total}`);
    
    return {
      ok: true,
      localEnsaio: localEnsaio,
      abaAtualizada: 'Resumo',
      planilhaId: VARGEMGRANDE_SHEET_ID,
      totalMembros: contadores.total,
      instrumentos: contadores.instrumentos,
      cargosMinisteriais: contadores.cargosMinisteriais,
      cargosApoio: contadores.cargosApoio
    };

  } catch (error) {
    console.error(`❌ Erro ao atualizar aba Resumo da planilha externa de VargemGrande com dados do ensaio de ${localEnsaio}:`, error);
    throw error;
  }
}

// Função para exportar dados completos para planilha externa de Pirapora (com instrumentos e cargos)

function exportarParaPlanilhaPiraporaCompleta(localEnsaio) {
  try {
    console.log(`🏛️ Iniciando exportação completa para planilha externa de Pirapora: ${localEnsaio}`);
    
    const shDados = openOrCreateSheet(SHEET_NAME);
    const lastRow = shDados.getLastRow();
    const lastCol = shDados.getLastColumn();
    
    if (lastRow < 2) {
      throw new Error('Não há dados abaixo do cabeçalho em "Dados".');
    }

    const headerRow = shDados.getRange(1, 1, 1, lastCol).getDisplayValues()[0];
    const data = shDados.getRange(2, 1, lastRow - 1, lastCol).getDisplayValues();

    // Mapeia os índices das colunas
    const headerMap = {};
    headerRow.forEach((h, i) => { 
      if (h) headerMap[h.toString().trim()] = i; 
    });

    // Filtra dados apenas do local especificado
    const linhasLocal = [];
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const nome = norm(row[headerMap['NOME COMPLETO']] || '');
      if (!nome) continue;

      const comum = norm(row[headerMap['COMUM']] || '') || '(Sem comum)';
      const cidade = norm(row[headerMap['CIDADE']] || '') || '(Sem cidade)';
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
        nome, comum, cidade, cargo, instrumento, vai_tocar: vaiTocar, nivel, local_ensaio: localEnsaioRow, _ord: i
      });
    }

    console.log(`📊 Encontrados ${linhasLocal.length} membros para o local: ${localEnsaio}`);

    // Lista completa de instrumentos
    const listaCompletaInstrumentos = [
      'Organista', 'Acordeon', 'Violino', 'Viola', 'Violoncelo', 'Flauta transversal',
      'Oboé', "Oboé d'amore", 'Corne inglês', 'Clarinete', 'Clarinete alto', 
      'Clarinete baixo (clarone)', 'Fagote', 'Saxofone soprano (reto)', 'Saxofone alto',
      'Saxofone tenor', 'Saxofone barítono', 'Trompete', 'Cornet', 'Flugelhorn', 'Trompa',
      'Trombone', 'Trombonito', 'Barítono (pisto)', 'Eufônio', 'Tuba'
    ];

    // Lista completa de cargos ministeriais e de apoio
    const listaCompletaCargosMinisteriais = [
      'Ancião', 'Diácono', 'Cooperador do Ofício', 'Cooperador de Jovens',
      'Encarregado Regional', 'Encarregado Local', 'Examinadora',
      'Secretária da Música', 'Secretário da Música', 'Instrutor', 'Instrutora'
    ];

    const listaCompletaCargosApoio = [
      'Porteiro (a)', 'Bombeiro (a)', 'Médico (a)', 'Enfermeiro (a)', 'Irmandade'
    ];

    // Conta instrumentos e cargos
    const contadores = {
      instrumentos: {},
      musicos: {},
      cargosMinisteriais: {},
      cargosApoio: {},
      total: 0
    };

    // Inicializa todos os instrumentos com 0
    listaCompletaInstrumentos.forEach(inst => {
      contadores.instrumentos[inst] = 0;
      contadores.musicos[inst] = 0;
    });

    // Inicializa todos os cargos ministeriais com 0
    listaCompletaCargosMinisteriais.forEach(cargo => {
      contadores.cargosMinisteriais[cargo] = 0;
    });

    // Inicializa todos os cargos de apoio com 0
    listaCompletaCargosApoio.forEach(cargo => {
      contadores.cargosApoio[cargo] = 0;
    });

    // Processa cada linha do local
    linhasLocal.forEach(x => {
      if (!estevePresente(x)) return;
      
      contadores.total++;
      
      // LÓGICA CORRETA: Organistas são contados por CARGO
      const cargoLower = x.cargo ? x.cargo.toLowerCase() : '';
      if (cargoLower.includes('organista') || cargoLower.includes('examinadora') || 
          cargoLower.includes('instrutora') || cargoLower.includes('instrutoras')) {
        contadores.instrumentos['Organista']++;
        contadores.musicos['Organista']++;
        console.log(`🎹 Organista contado por cargo: ${x.nome} (cargo: ${x.cargo})`);
      } else if (x.instrumento && !cargoLower.includes('secretário da música') && !cargoLower.includes('secretaria da musica') && !cargoLower.includes('secretarios da musica') && !cargoLower.includes('secretarias da musica')) {
        // Mapeia o instrumento para a lista padrão (excluindo secretários da música)
        const instrumentoMapeado = mapearInstrumento(x.instrumento);
        
        if (instrumentoMapeado && contadores.instrumentos.hasOwnProperty(instrumentoMapeado) && instrumentoMapeado !== 'Organista') {
          contadores.instrumentos[instrumentoMapeado]++;
          contadores.musicos[instrumentoMapeado]++;
          console.log(`🎵 Instrumento contado: ${x.instrumento} -> ${instrumentoMapeado} - ${x.nome}`);
        } else if (instrumentoMapeado) {
          console.log(`⚠️ Instrumento não mapeado: ${x.instrumento} (mapeado: ${instrumentoMapeado})`);
        }
      }
      
      // Conta cargos ministeriais específicos
      if (x.cargo) {
        const cargoOriginal = x.cargo;
        const cargoFormatado = formatarTexto(cargoOriginal);
        
        const mapeamentoCargos = {
          'ancião': 'Ancião',
          'diácono': 'Diácono',
          'cooperador do ofício': 'Cooperador do Ofício',
          'cooperador do oficio': 'Cooperador do Ofício',
          'cooperador de jovens': 'Cooperador de Jovens',
          'encarregado regional': 'Encarregado Regional',
          'encarregado local': 'Encarregado Local',
          'examinadora': 'Examinadora',
          'examinadoras': 'Examinadora',
          'examinador': 'Examinadora',
          'examinadores': 'Examinadora',
          'examinadora de organistas': 'Examinadora',
          'examinadoras de organistas': 'Examinadora',
          'examinador de organistas': 'Examinadora',
          'examinadores de organistas': 'Examinadora',
          'secretária da música': 'Secretária da Música',
          'secretarias da música': 'Secretária da Música',
          'secretaria da musica': 'Secretária da Música',
          'secretarias da musica': 'Secretária da Música',
          'secretário da música': 'Secretário da Música',
          'secretarios da música': 'Secretário da Música',
          'secretario da musica': 'Secretário da Música',
          'secretarios da musica': 'Secretário da Música',
          'secretário do gem': 'Secretário da Música',
          'secretarios do gem': 'Secretário da Música',
          'secretario do gem': 'Secretário da Música',
          'instrutor': 'Instrutor',
          'instrutora': 'Instrutora',
          'instrutores': 'Instrutor',
          'instrutoras': 'Instrutora',
          'porteiro (a)': 'Porteiro (a)',
          'porteiro': 'Porteiro (a)',
          'porteira': 'Porteiro (a)',
          'bombeiro (a)': 'Bombeiro (a)',
          'bombeiro': 'Bombeiro (a)',
          'bombeira': 'Bombeiro (a)',
          'médico (a)': 'Médico (a)',
          'medico': 'Médico (a)',
          'medica': 'Médico (a)',
          'enfermeiro (a)': 'Enfermeiro (a)',
          'enfermeiro': 'Enfermeiro (a)',
          'enfermeira': 'Enfermeiro (a)',
          'irmandade': 'Irmandade',
          'irma': 'Irmandade',
          'irmao': 'Irmandade',
          'irmão': 'Irmandade',
          'irmã': 'Irmandade',
          'irmãos': 'Irmandade',
          'irmãs': 'Irmandade'
        };
        
        const cargoMapeado = mapeamentoCargos[cargoFormatado.toLowerCase()];
        
        if (contadores.cargosMinisteriais.hasOwnProperty(cargoMapeado)) {
          contadores.cargosMinisteriais[cargoMapeado]++;
        }
        
        if (contadores.cargosApoio.hasOwnProperty(cargoMapeado)) {
          contadores.cargosApoio[cargoMapeado]++;
        }
      }
    });

    // Acessa a planilha externa de Pirapora
    const ssPirapora = openPiraporaSheet();
    
    // Acessa a aba Resumo da planilha externa de Pirapora
    const shResumo = ssPirapora.getSheetByName('Resumo');
    if (!shResumo) {
      throw new Error('Aba "Resumo" não encontrada na planilha externa de Pirapora.');
    }
    
    // LIMPA todos os contadores antes de atualizar (correção do problema)
    limparContadoresResumo(shResumo, [28, 41, 48, 50]);
    
    console.log(`📊 Atualizando aba Resumo da planilha externa de Pirapora com dados do ensaio de ${localEnsaio}...`);
    
    // Atualiza apenas os valores usando a função escreveAoLado
    console.log('📊 Atualizando valores na aba Resumo...');
    
    // Sinônimos de rótulo para INSTRUMENTOS
    const INSTR_LABEL_SYNONYMS = {
      'Organista': ['Organista','Organistas']
    };

    const CARGO_MIN_ORD = [
      'Ancião','Diácono','Cooperador do Ofício','Cooperador de Jovens',
      'Encarregado Regional','Encarregado Local','Examinadora',
      'Secretária da Música','Secretário da Música',
      'Instrutor','Instrutora'
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
      'Examinadora': ['Examinadora'],
      'Secretária da Música': ['Secretária da Música','Secretarias da Música','Secretaria da Música'],
      'Secretário da Música': ['Secretário da Música','Secretarios da Música','Secretario da Música'],
      'Instrutores': ['Instrutores','Instrutor'],
      'Instrutoras': ['Instrutoras','Instrutora']
    };

    // Atualiza instrumentos com sinônimos
    listaCompletaInstrumentos.forEach(canonical => {
      const val = contadores.instrumentos[canonical] || 0;
      const rLabels = INSTR_LABEL_SYNONYMS[canonical] || [canonical];
      rLabels.forEach(rot => atualizarColunaBPreservandoFormulas(shResumo, rot, val));
    });

    // Atualiza músicos por instrumento
    listaCompletaInstrumentos.forEach(canonical => {
      const val = contadores.musicos[canonical] || 0;
      const rLabels = INSTR_LABEL_SYNONYMS[canonical] || [canonical];
      rLabels.forEach(rot => atualizarColunaBPreservandoFormulas(shResumo, rot, val));
    });

    // Atualiza cargos ministeriais com sinônimos
    CARGO_MIN_ORD.forEach(canonical => {
      const val = contadores.cargosMinisteriais[canonical] || 0;
      const rLabels = MIN_LABEL_SYNONYMS[canonical] || [canonical];
      rLabels.forEach(rot => atualizarColunaBPreservandoFormulas(shResumo, rot, val));
    });

    // Atualiza cargos de apoio com sinônimos
    APOIO_IRM_ORD.forEach(canonical => {
      const val = contadores.cargosApoio[canonical] || 0;
      APOIO_LABEL_SYNONYMS[canonical].forEach(rot => atualizarColunaBPreservandoFormulas(shResumo, rot, val));
    });

    console.log(`✅ Aba Resumo da planilha externa de Pirapora atualizada com sucesso com dados do ensaio de ${localEnsaio}`);
    console.log(`📈 Total de membros: ${contadores.total}`);
    
    return {
      ok: true,
      localEnsaio: localEnsaio,
      abaAtualizada: 'Resumo',
      planilhaId: PIRAPORA_SHEET_ID,
      totalMembros: contadores.total,
      instrumentos: contadores.instrumentos,
      cargosMinisteriais: contadores.cargosMinisteriais,
      cargosApoio: contadores.cargosApoio
    };

  } catch (error) {
    console.error(`❌ Erro ao atualizar aba Resumo da planilha externa de Pirapora com dados do ensaio de ${localEnsaio}:`, error);
    throw error;
  }
}

// Função para exportar dados completos para planilha externa de Fazendinha (com instrumentos e cargos)

function exportarParaPlanilhaFazendinhaCompleta(localEnsaio) {
  try {
    console.log(`🏛️ Iniciando exportação completa para planilha externa de Fazendinha: ${localEnsaio}`);
    
    const shDados = openOrCreateSheet(SHEET_NAME);
    const lastRow = shDados.getLastRow();
    const lastCol = shDados.getLastColumn();
    
    if (lastRow < 2) {
      throw new Error('Não há dados abaixo do cabeçalho em "Dados".');
    }

    const headerRow = shDados.getRange(1, 1, 1, lastCol).getDisplayValues()[0];
    const data = shDados.getRange(2, 1, lastRow - 1, lastCol).getDisplayValues();

    // Mapeia os índices das colunas
    const headerMap = {};
    headerRow.forEach((h, i) => { 
      if (h) headerMap[h.toString().trim()] = i; 
    });

    // Filtra dados apenas do local especificado
    const linhasLocal = [];
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const nome = norm(row[headerMap['NOME COMPLETO']] || '');
      if (!nome) continue;

      const comum = norm(row[headerMap['COMUM']] || '') || '(Sem comum)';
      const cidade = norm(row[headerMap['CIDADE']] || '') || '(Sem cidade)';
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
        nome, comum, cidade, cargo, instrumento, vai_tocar: vaiTocar, nivel, local_ensaio: localEnsaioRow, _ord: i
      });
    }

    console.log(`📊 Encontrados ${linhasLocal.length} membros para o local: ${localEnsaio}`);

    // Lista completa de instrumentos
    const listaCompletaInstrumentos = [
      'Organista', 'Acordeon', 'Violino', 'Viola', 'Violoncelo', 'Flauta transversal',
      'Oboé', "Oboé d'amore", 'Corne inglês', 'Clarinete', 'Clarinete alto', 
      'Clarinete baixo (clarone)', 'Fagote', 'Saxofone soprano (reto)', 'Saxofone alto',
      'Saxofone tenor', 'Saxofone barítono', 'Trompete', 'Cornet', 'Flugelhorn', 'Trompa',
      'Trombone', 'Trombonito', 'Barítono (pisto)', 'Eufônio', 'Tuba'
    ];

    // Lista completa de cargos ministeriais e de apoio
    const listaCompletaCargosMinisteriais = [
      'Ancião', 'Diácono', 'Cooperador do Ofício', 'Cooperador de Jovens',
      'Encarregado Regional', 'Encarregado Local', 'Examinadora',
      'Secretária da Música', 'Secretário da Música', 'Instrutor', 'Instrutora'
    ];

    const listaCompletaCargosApoio = [
      'Porteiro (a)', 'Bombeiro (a)', 'Médico (a)', 'Enfermeiro (a)', 'Irmandade'
    ];

    // Conta instrumentos e cargos
    const contadores = {
      instrumentos: {},
      musicos: {},
      cargosMinisteriais: {},
      cargosApoio: {},
      total: 0
    };

    // Inicializa todos os instrumentos com 0
    listaCompletaInstrumentos.forEach(inst => {
      contadores.instrumentos[inst] = 0;
      contadores.musicos[inst] = 0;
    });

    // Inicializa todos os cargos ministeriais com 0
    listaCompletaCargosMinisteriais.forEach(cargo => {
      contadores.cargosMinisteriais[cargo] = 0;
    });

    // Inicializa todos os cargos de apoio com 0
    listaCompletaCargosApoio.forEach(cargo => {
      contadores.cargosApoio[cargo] = 0;
    });

    // Processa cada linha do local
    linhasLocal.forEach(x => {
      if (!estevePresente(x)) return;
      
      contadores.total++;
      
      // LÓGICA CORRETA: Organistas são contados por CARGO
      const cargoLower = x.cargo ? x.cargo.toLowerCase() : '';
      if (cargoLower.includes('organista') || cargoLower.includes('examinadora') || 
          cargoLower.includes('instrutora') || cargoLower.includes('instrutoras')) {
        contadores.instrumentos['Organista']++;
        contadores.musicos['Organista']++;
        console.log(`🎹 Organista contado por cargo: ${x.nome} (cargo: ${x.cargo})`);
      } else if (x.instrumento && !cargoLower.includes('secretário da música') && !cargoLower.includes('secretaria da musica') && !cargoLower.includes('secretarios da musica') && !cargoLower.includes('secretarias da musica')) {
        // Mapeia o instrumento para a lista padrão (excluindo secretários da música)
        const instrumentoMapeado = mapearInstrumento(x.instrumento);
        
        if (instrumentoMapeado && contadores.instrumentos.hasOwnProperty(instrumentoMapeado) && instrumentoMapeado !== 'Organista') {
          contadores.instrumentos[instrumentoMapeado]++;
          contadores.musicos[instrumentoMapeado]++;
          console.log(`🎵 Instrumento contado: ${x.instrumento} -> ${instrumentoMapeado} - ${x.nome}`);
        } else if (instrumentoMapeado) {
          console.log(`⚠️ Instrumento não mapeado: ${x.instrumento} (mapeado: ${instrumentoMapeado})`);
        }
      }
      
      // Conta cargos ministeriais específicos
      if (x.cargo) {
        const cargoOriginal = x.cargo;
        const cargoFormatado = formatarTexto(cargoOriginal);
        
        const mapeamentoCargos = {
          'ancião': 'Ancião',
          'diácono': 'Diácono',
          'cooperador do ofício': 'Cooperador do Ofício',
          'cooperador do oficio': 'Cooperador do Ofício',
          'cooperador de jovens': 'Cooperador de Jovens',
          'encarregado regional': 'Encarregado Regional',
          'encarregado local': 'Encarregado Local',
          'examinadora': 'Examinadora',
          'examinadoras': 'Examinadora',
          'examinador': 'Examinadora',
          'examinadores': 'Examinadora',
          'examinadora de organistas': 'Examinadora',
          'examinadoras de organistas': 'Examinadora',
          'examinador de organistas': 'Examinadora',
          'examinadores de organistas': 'Examinadora',
          'secretária da música': 'Secretária da Música',
          'secretarias da música': 'Secretária da Música',
          'secretaria da musica': 'Secretária da Música',
          'secretarias da musica': 'Secretária da Música',
          'secretário da música': 'Secretário da Música',
          'secretarios da música': 'Secretário da Música',
          'secretario da musica': 'Secretário da Música',
          'secretarios da musica': 'Secretário da Música',
          'secretário do gem': 'Secretário da Música',
          'secretarios do gem': 'Secretário da Música',
          'secretario do gem': 'Secretário da Música',
          'instrutor': 'Instrutor',
          'instrutora': 'Instrutora',
          'instrutores': 'Instrutor',
          'instrutoras': 'Instrutora',
          'porteiro (a)': 'Porteiro (a)',
          'porteiro': 'Porteiro (a)',
          'porteira': 'Porteiro (a)',
          'bombeiro (a)': 'Bombeiro (a)',
          'bombeiro': 'Bombeiro (a)',
          'bombeira': 'Bombeiro (a)',
          'médico (a)': 'Médico (a)',
          'medico': 'Médico (a)',
          'medica': 'Médico (a)',
          'enfermeiro (a)': 'Enfermeiro (a)',
          'enfermeiro': 'Enfermeiro (a)',
          'enfermeira': 'Enfermeiro (a)',
          'irmandade': 'Irmandade',
          'irma': 'Irmandade',
          'irmao': 'Irmandade',
          'irmão': 'Irmandade',
          'irmã': 'Irmandade',
          'irmãos': 'Irmandade',
          'irmãs': 'Irmandade'
        };
        
        const cargoMapeado = mapeamentoCargos[cargoFormatado.toLowerCase()];
        
        if (contadores.cargosMinisteriais.hasOwnProperty(cargoMapeado)) {
          contadores.cargosMinisteriais[cargoMapeado]++;
        }
        
        if (contadores.cargosApoio.hasOwnProperty(cargoMapeado)) {
          contadores.cargosApoio[cargoMapeado]++;
        }
      }
    });

    // Acessa a planilha externa de Fazendinha
    const ssFazendinha = openFazendinhaSheet();
    
    // Acessa a aba Resumo da planilha externa de Fazendinha
    const shResumo = ssFazendinha.getSheetByName('Resumo');
    if (!shResumo) {
      throw new Error('Aba "Resumo" não encontrada na planilha externa de Fazendinha.');
    }
    
    // LIMPA todos os contadores antes de atualizar (correção do problema)
    limparContadoresResumo(shResumo, [28, 41, 48, 50]);
    
    console.log(`📊 Atualizando aba Resumo da planilha externa de Fazendinha com dados do ensaio de ${localEnsaio}...`);
    
    // Atualiza apenas os valores usando a função escreveAoLado
    console.log('📊 Atualizando valores na aba Resumo...');
    
    // Sinônimos de rótulo para INSTRUMENTOS
    const INSTR_LABEL_SYNONYMS = {
      'Organista': ['Organista','Organistas']
    };

    const CARGO_MIN_ORD = [
      'Ancião','Diácono','Cooperador do Ofício','Cooperador de Jovens',
      'Encarregado Regional','Encarregado Local','Examinadora',
      'Secretária da Música','Secretário da Música',
      'Instrutor','Instrutora'
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
      'Examinadora': ['Examinadora'],
      'Secretária da Música': ['Secretária da Música','Secretarias da Música','Secretaria da Música'],
      'Secretário da Música': ['Secretário da Música','Secretarios da Música','Secretario da Música'],
      'Instrutores': ['Instrutores','Instrutor'],
      'Instrutoras': ['Instrutoras','Instrutora']
    };

    // Atualiza instrumentos com sinônimos
    listaCompletaInstrumentos.forEach(canonical => {
      const val = contadores.instrumentos[canonical] || 0;
      const rLabels = INSTR_LABEL_SYNONYMS[canonical] || [canonical];
      rLabels.forEach(rot => atualizarColunaBPreservandoFormulas(shResumo, rot, val));
    });

    // Atualiza músicos por instrumento
    listaCompletaInstrumentos.forEach(canonical => {
      const val = contadores.musicos[canonical] || 0;
      const rLabels = INSTR_LABEL_SYNONYMS[canonical] || [canonical];
      rLabels.forEach(rot => atualizarColunaBPreservandoFormulas(shResumo, rot, val));
    });

    // Atualiza cargos ministeriais com sinônimos
    CARGO_MIN_ORD.forEach(canonical => {
      const val = contadores.cargosMinisteriais[canonical] || 0;
      const rLabels = MIN_LABEL_SYNONYMS[canonical] || [canonical];
      rLabels.forEach(rot => atualizarColunaBPreservandoFormulas(shResumo, rot, val));
    });

    // Atualiza cargos de apoio com sinônimos
    APOIO_IRM_ORD.forEach(canonical => {
      const val = contadores.cargosApoio[canonical] || 0;
      APOIO_LABEL_SYNONYMS[canonical].forEach(rot => atualizarColunaBPreservandoFormulas(shResumo, rot, val));
    });

    console.log(`✅ Aba Resumo da planilha externa de Fazendinha atualizada com sucesso com dados do ensaio de ${localEnsaio}`);
    console.log(`📈 Total de membros: ${contadores.total}`);
    
    return {
      ok: true,
      localEnsaio: localEnsaio,
      abaAtualizada: 'Resumo',
      planilhaId: FAZENDINHA_SHEET_ID,
      totalMembros: contadores.total,
      instrumentos: contadores.instrumentos,
      cargosMinisteriais: contadores.cargosMinisteriais,
      cargosApoio: contadores.cargosApoio
    };

  } catch (error) {
    console.error(`❌ Erro ao atualizar aba Resumo da planilha externa de Fazendinha com dados do ensaio de ${localEnsaio}:`, error);
    throw error;
  }
}

// Função para exportar dados completos para planilha externa de Jandira (com instrumentos e cargos)

function exportarParaPlanilhaJandiraCompleta(localEnsaio) {
  try {
    console.log(`🏛️ Iniciando exportação completa para planilha externa de Jandira: ${localEnsaio}`);
    
    const shDados = openOrCreateSheet(SHEET_NAME);
    const lastRow = shDados.getLastRow();
    const lastCol = shDados.getLastColumn();
    
    if (lastRow < 2) {
      throw new Error('Não há dados abaixo do cabeçalho em "Dados".');
    }

    const headerRow = shDados.getRange(1, 1, 1, lastCol).getDisplayValues()[0];
    const data = shDados.getRange(2, 1, lastRow - 1, lastCol).getDisplayValues();

    // Mapeia os índices das colunas
    const headerMap = {};
    headerRow.forEach((h, i) => { 
      if (h) headerMap[h.toString().trim()] = i; 
    });

    // Filtra dados apenas do local especificado
    const linhasLocal = [];
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const nome = norm(row[headerMap['NOME COMPLETO']] || '');
      if (!nome) continue;

      const comum = norm(row[headerMap['COMUM']] || '') || '(Sem comum)';
      const cidade = norm(row[headerMap['CIDADE']] || '') || '(Sem cidade)';
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
        nome, comum, cidade, cargo, instrumento, vai_tocar: vaiTocar, nivel, local_ensaio: localEnsaioRow, _ord: i
      });
    }

    console.log(`📊 Encontrados ${linhasLocal.length} membros para o local: ${localEnsaio}`);

    // Lista completa de instrumentos
    const listaCompletaInstrumentos = [
      'Organista', 'Acordeon', 'Violino', 'Viola', 'Violoncelo', 'Flauta transversal',
      'Oboé', "Oboé d'amore", 'Corne inglês', 'Clarinete', 'Clarinete alto', 
      'Clarinete baixo (clarone)', 'Fagote', 'Saxofone soprano (reto)', 'Saxofone alto',
      'Saxofone tenor', 'Saxofone barítono', 'Trompete', 'Cornet', 'Flugelhorn', 'Trompa',
      'Trombone', 'Trombonito', 'Barítono (pisto)', 'Eufônio', 'Tuba'
    ];

    // Lista completa de cargos ministeriais e de apoio
    const listaCompletaCargosMinisteriais = [
      'Ancião', 'Diácono', 'Cooperador do Ofício', 'Cooperador de Jovens',
      'Encarregado Regional', 'Encarregado Local', 'Examinadora',
      'Secretária da Música', 'Secretário da Música', 'Instrutor', 'Instrutora'
    ];

    const listaCompletaCargosApoio = [
      'Porteiro (a)', 'Bombeiro (a)', 'Médico (a)', 'Enfermeiro (a)', 'Irmandade'
    ];

    // Conta instrumentos e cargos
    const contadores = {
      instrumentos: {},
      musicos: {},
      cargosMinisteriais: {},
      cargosApoio: {},
      total: 0
    };

    // Inicializa todos os instrumentos com 0
    listaCompletaInstrumentos.forEach(inst => {
      contadores.instrumentos[inst] = 0;
      contadores.musicos[inst] = 0;
    });

    // Inicializa todos os cargos ministeriais com 0
    listaCompletaCargosMinisteriais.forEach(cargo => {
      contadores.cargosMinisteriais[cargo] = 0;
    });

    // Inicializa todos os cargos de apoio com 0
    listaCompletaCargosApoio.forEach(cargo => {
      contadores.cargosApoio[cargo] = 0;
    });

    // Processa cada linha do local
    linhasLocal.forEach(x => {
      if (!estevePresente(x)) return;
      
      contadores.total++;
      
      // LÓGICA CORRETA: Organistas são contados por CARGO
      const cargoLower = x.cargo ? x.cargo.toLowerCase() : '';
      if (cargoLower.includes('organista') || cargoLower.includes('examinadora') || 
          cargoLower.includes('instrutora') || cargoLower.includes('instrutoras')) {
        contadores.instrumentos['Organista']++;
        contadores.musicos['Organista']++;
        console.log(`🎹 Organista contado por cargo: ${x.nome} (cargo: ${x.cargo})`);
      } else if (x.instrumento && !cargoLower.includes('secretário da música') && !cargoLower.includes('secretaria da musica') && !cargoLower.includes('secretarios da musica') && !cargoLower.includes('secretarias da musica')) {
        // Mapeia o instrumento para a lista padrão (excluindo secretários da música)
        const instrumentoMapeado = mapearInstrumento(x.instrumento);
        
        if (instrumentoMapeado && contadores.instrumentos.hasOwnProperty(instrumentoMapeado) && instrumentoMapeado !== 'Organista') {
          contadores.instrumentos[instrumentoMapeado]++;
          contadores.musicos[instrumentoMapeado]++;
          console.log(`🎵 Instrumento contado: ${x.instrumento} -> ${instrumentoMapeado} - ${x.nome}`);
        } else if (instrumentoMapeado) {
          console.log(`⚠️ Instrumento não mapeado: ${x.instrumento} (mapeado: ${instrumentoMapeado})`);
        }
      }
      
      // Conta cargos ministeriais específicos
      if (x.cargo) {
        const cargoOriginal = x.cargo;
        const cargoFormatado = formatarTexto(cargoOriginal);
        
        const mapeamentoCargos = {
          'ancião': 'Ancião',
          'diácono': 'Diácono',
          'cooperador do ofício': 'Cooperador do Ofício',
          'cooperador do oficio': 'Cooperador do Ofício',
          'cooperador de jovens': 'Cooperador de Jovens',
          'encarregado regional': 'Encarregado Regional',
          'encarregado local': 'Encarregado Local',
          'examinadora': 'Examinadora',
          'examinadoras': 'Examinadora',
          'examinador': 'Examinadora',
          'examinadores': 'Examinadora',
          'examinadora de organistas': 'Examinadora',
          'examinadoras de organistas': 'Examinadora',
          'examinador de organistas': 'Examinadora',
          'examinadores de organistas': 'Examinadora',
          'secretária da música': 'Secretária da Música',
          'secretarias da música': 'Secretária da Música',
          'secretaria da musica': 'Secretária da Música',
          'secretarias da musica': 'Secretária da Música',
          'secretário da música': 'Secretário da Música',
          'secretarios da música': 'Secretário da Música',
          'secretario da musica': 'Secretário da Música',
          'secretarios da musica': 'Secretário da Música',
          'secretário do gem': 'Secretário da Música',
          'secretarios do gem': 'Secretário da Música',
          'secretario do gem': 'Secretário da Música',
          'instrutor': 'Instrutor',
          'instrutora': 'Instrutora',
          'instrutores': 'Instrutor',
          'instrutoras': 'Instrutora',
          'porteiro (a)': 'Porteiro (a)',
          'porteiro': 'Porteiro (a)',
          'porteira': 'Porteiro (a)',
          'bombeiro (a)': 'Bombeiro (a)',
          'bombeiro': 'Bombeiro (a)',
          'bombeira': 'Bombeiro (a)',
          'médico (a)': 'Médico (a)',
          'medico': 'Médico (a)',
          'medica': 'Médico (a)',
          'enfermeiro (a)': 'Enfermeiro (a)',
          'enfermeiro': 'Enfermeiro (a)',
          'enfermeira': 'Enfermeiro (a)',
          'irmandade': 'Irmandade',
          'irma': 'Irmandade',
          'irmao': 'Irmandade',
          'irmão': 'Irmandade',
          'irmã': 'Irmandade',
          'irmãos': 'Irmandade',
          'irmãs': 'Irmandade'
        };
        
        const cargoMapeado = mapeamentoCargos[cargoFormatado.toLowerCase()];
        
        if (contadores.cargosMinisteriais.hasOwnProperty(cargoMapeado)) {
          contadores.cargosMinisteriais[cargoMapeado]++;
        }
        
        if (contadores.cargosApoio.hasOwnProperty(cargoMapeado)) {
          contadores.cargosApoio[cargoMapeado]++;
        }
      }
    });

    // Acessa a planilha externa de Jandira
    const ssJandira = openJandiraSheet();
    
    // Acessa a aba Resumo da planilha externa de Jandira
    const shResumo = ssJandira.getSheetByName('Resumo');
    if (!shResumo) {
      throw new Error('Aba "Resumo" não encontrada na planilha externa de Jandira.');
    }
    
    // LIMPA todos os contadores antes de atualizar (correção do problema)
    limparContadoresResumo(shResumo, [28, 41, 48, 50]);
    
    console.log(`📊 Atualizando aba Resumo da planilha externa de Jandira com dados do ensaio de ${localEnsaio}...`);
    
    // Atualiza apenas os valores usando a função escreveAoLado
    console.log('📊 Atualizando valores na aba Resumo...');
    
    // Sinônimos de rótulo para INSTRUMENTOS
    const INSTR_LABEL_SYNONYMS = {
      'Organista': ['Organista','Organistas']
    };

    const CARGO_MIN_ORD = [
      'Ancião','Diácono','Cooperador do Ofício','Cooperador de Jovens',
      'Encarregado Regional','Encarregado Local','Examinadora',
      'Secretária da Música','Secretário da Música',
      'Instrutor','Instrutora'
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
      'Examinadora': ['Examinadora'],
      'Secretária da Música': ['Secretária da Música','Secretarias da Música','Secretaria da Música'],
      'Secretário da Música': ['Secretário da Música','Secretarios da Música','Secretario da Música'],
      'Instrutores': ['Instrutores','Instrutor'],
      'Instrutoras': ['Instrutoras','Instrutora']
    };

    // Atualiza instrumentos com sinônimos
    listaCompletaInstrumentos.forEach(canonical => {
      const val = contadores.instrumentos[canonical] || 0;
      const rLabels = INSTR_LABEL_SYNONYMS[canonical] || [canonical];
      rLabels.forEach(rot => atualizarColunaBPreservandoFormulas(shResumo, rot, val));
    });

    // Atualiza músicos por instrumento
    listaCompletaInstrumentos.forEach(canonical => {
      const val = contadores.musicos[canonical] || 0;
      const rLabels = INSTR_LABEL_SYNONYMS[canonical] || [canonical];
      rLabels.forEach(rot => atualizarColunaBPreservandoFormulas(shResumo, rot, val));
    });

    // Atualiza cargos ministeriais com sinônimos
    CARGO_MIN_ORD.forEach(canonical => {
      const val = contadores.cargosMinisteriais[canonical] || 0;
      const rLabels = MIN_LABEL_SYNONYMS[canonical] || [canonical];
      rLabels.forEach(rot => atualizarColunaBPreservandoFormulas(shResumo, rot, val));
    });

    // Atualiza cargos de apoio com sinônimos
    APOIO_IRM_ORD.forEach(canonical => {
      const val = contadores.cargosApoio[canonical] || 0;
      APOIO_LABEL_SYNONYMS[canonical].forEach(rot => atualizarColunaBPreservandoFormulas(shResumo, rot, val));
    });

    console.log(`✅ Aba Resumo da planilha externa de Jandira atualizada com sucesso com dados do ensaio de ${localEnsaio}`);
    console.log(`📈 Total de membros: ${contadores.total}`);
    
    return {
      ok: true,
      localEnsaio: localEnsaio,
      abaAtualizada: 'Resumo',
      planilhaId: JANDIRA_SHEET_ID,
      totalMembros: contadores.total,
      instrumentos: contadores.instrumentos,
      cargosMinisteriais: contadores.cargosMinisteriais,
      cargosApoio: contadores.cargosApoio
    };

  } catch (error) {
    console.error(`❌ Erro ao atualizar aba Resumo da planilha externa de Jandira com dados do ensaio de ${localEnsaio}:`, error);
    throw error;
  }
}

// Função para exportar dados completos para planilha externa de Cotia (com instrumentos e cargos)

function exportarParaPlanilhaCotiaCompleta(localEnsaio) {
  try {
    console.log(`🏛️ Iniciando exportação completa para planilha externa de Cotia: ${localEnsaio}`);
    
    const shDados = openOrCreateSheet(SHEET_NAME);
    const lastRow = shDados.getLastRow();
    const lastCol = shDados.getLastColumn();
    
    if (lastRow < 2) {
      throw new Error('Não há dados abaixo do cabeçalho em "Dados".');
    }

    const headerRow = shDados.getRange(1, 1, 1, lastCol).getDisplayValues()[0];
    const data = shDados.getRange(2, 1, lastRow - 1, lastCol).getDisplayValues();

    // Mapeia os índices das colunas
    const headerMap = {};
    headerRow.forEach((h, i) => { 
      if (h) headerMap[h.toString().trim()] = i; 
    });

    // Filtra dados apenas do local especificado
    const linhasLocal = [];
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const nome = norm(row[headerMap['NOME COMPLETO']] || '');
      if (!nome) continue;

      const comum = norm(row[headerMap['COMUM']] || '') || '(Sem comum)';
      const cidade = norm(row[headerMap['CIDADE']] || '') || '(Sem cidade)';
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
        nome, comum, cidade, cargo, instrumento, vai_tocar: vaiTocar, nivel, local_ensaio: localEnsaioRow, _ord: i
      });
    }

    console.log(`📊 Encontrados ${linhasLocal.length} membros para o local: ${localEnsaio}`);

    // Lista completa de instrumentos
    const listaCompletaInstrumentos = [
      'Organista', 'Acordeon', 'Violino', 'Viola', 'Violoncelo', 'Flauta transversal',
      'Oboé', "Oboé d'amore", 'Corne inglês', 'Clarinete', 'Clarinete alto', 
      'Clarinete baixo (clarone)', 'Fagote', 'Saxofone soprano (reto)', 'Saxofone alto',
      'Saxofone tenor', 'Saxofone barítono', 'Trompete', 'Cornet', 'Flugelhorn', 'Trompa',
      'Trombone', 'Trombonito', 'Barítono (pisto)', 'Eufônio', 'Tuba'
    ];

    // Lista completa de cargos ministeriais e de apoio
    const listaCompletaCargosMinisteriais = [
      'Ancião', 'Diácono', 'Cooperador do Ofício', 'Cooperador de Jovens',
      'Encarregado Regional', 'Encarregado Local', 'Examinadora',
      'Secretária da Música', 'Secretário da Música', 'Instrutor', 'Instrutora'
    ];

    const listaCompletaCargosApoio = [
      'Porteiro (a)', 'Bombeiro (a)', 'Médico (a)', 'Enfermeiro (a)', 'Irmandade'
    ];

    // Conta instrumentos e cargos
    const contadores = {
      instrumentos: {},
      musicos: {},
      cargosMinisteriais: {},
      cargosApoio: {},
      total: 0
    };

    // Inicializa todos os instrumentos com 0
    listaCompletaInstrumentos.forEach(inst => {
      contadores.instrumentos[inst] = 0;
      contadores.musicos[inst] = 0;
    });

    // Inicializa todos os cargos ministeriais com 0
    listaCompletaCargosMinisteriais.forEach(cargo => {
      contadores.cargosMinisteriais[cargo] = 0;
    });

    // Inicializa todos os cargos de apoio com 0
    listaCompletaCargosApoio.forEach(cargo => {
      contadores.cargosApoio[cargo] = 0;
    });

    // Processa cada linha do local
    linhasLocal.forEach(x => {
      if (!estevePresente(x)) return;
      
      contadores.total++;
      
      // LÓGICA CORRETA: Organistas são contados por CARGO
      const cargoLower = x.cargo ? x.cargo.toLowerCase() : '';
      if (cargoLower.includes('organista') || cargoLower.includes('examinadora') || 
          cargoLower.includes('instrutora') || cargoLower.includes('instrutoras')) {
        contadores.instrumentos['Organista']++;
        contadores.musicos['Organista']++;
        console.log(`🎹 Organista contado por cargo: ${x.nome} (cargo: ${x.cargo})`);
      } else if (x.instrumento && !cargoLower.includes('secretário da música') && !cargoLower.includes('secretaria da musica') && !cargoLower.includes('secretarios da musica') && !cargoLower.includes('secretarias da musica')) {
        // Mapeia o instrumento para a lista padrão (excluindo secretários da música)
        const instrumentoMapeado = mapearInstrumento(x.instrumento);
        
        if (instrumentoMapeado && contadores.instrumentos.hasOwnProperty(instrumentoMapeado) && instrumentoMapeado !== 'Organista') {
          contadores.instrumentos[instrumentoMapeado]++;
          contadores.musicos[instrumentoMapeado]++;
          console.log(`🎵 Instrumento contado: ${x.instrumento} -> ${instrumentoMapeado} - ${x.nome}`);
        } else if (instrumentoMapeado) {
          console.log(`⚠️ Instrumento não mapeado: ${x.instrumento} (mapeado: ${instrumentoMapeado})`);
        }
      }
      
      // Conta cargos ministeriais específicos
      if (x.cargo) {
        const cargoOriginal = x.cargo;
        const cargoFormatado = formatarTexto(cargoOriginal);
        
        const mapeamentoCargos = {
          'ancião': 'Ancião',
          'diácono': 'Diácono',
          'cooperador do ofício': 'Cooperador do Ofício',
          'cooperador do oficio': 'Cooperador do Ofício',
          'cooperador de jovens': 'Cooperador de Jovens',
          'encarregado regional': 'Encarregado Regional',
          'encarregado local': 'Encarregado Local',
          'examinadora': 'Examinadora',
          'examinadoras': 'Examinadora',
          'examinador': 'Examinadora',
          'examinadores': 'Examinadora',
          'examinadora de organistas': 'Examinadora',
          'examinadoras de organistas': 'Examinadora',
          'examinador de organistas': 'Examinadora',
          'examinadores de organistas': 'Examinadora',
          'secretária da música': 'Secretária da Música',
          'secretarias da música': 'Secretária da Música',
          'secretaria da musica': 'Secretária da Música',
          'secretarias da musica': 'Secretária da Música',
          'secretário da música': 'Secretário da Música',
          'secretarios da música': 'Secretário da Música',
          'secretario da musica': 'Secretário da Música',
          'secretarios da musica': 'Secretário da Música',
          'secretário do gem': 'Secretário da Música',
          'secretarios do gem': 'Secretário da Música',
          'secretario do gem': 'Secretário da Música',
          'instrutor': 'Instrutor',
          'instrutora': 'Instrutora',
          'instrutores': 'Instrutor',
          'instrutoras': 'Instrutora',
          'porteiro (a)': 'Porteiro (a)',
          'porteiro': 'Porteiro (a)',
          'porteira': 'Porteiro (a)',
          'bombeiro (a)': 'Bombeiro (a)',
          'bombeiro': 'Bombeiro (a)',
          'bombeira': 'Bombeiro (a)',
          'médico (a)': 'Médico (a)',
          'medico': 'Médico (a)',
          'medica': 'Médico (a)',
          'enfermeiro (a)': 'Enfermeiro (a)',
          'enfermeiro': 'Enfermeiro (a)',
          'enfermeira': 'Enfermeiro (a)',
          'irmandade': 'Irmandade',
          'irma': 'Irmandade',
          'irmao': 'Irmandade',
          'irmão': 'Irmandade',
          'irmã': 'Irmandade',
          'irmãos': 'Irmandade',
          'irmãs': 'Irmandade'
        };
        
        const cargoMapeado = mapeamentoCargos[cargoFormatado.toLowerCase()];
        
        if (contadores.cargosMinisteriais.hasOwnProperty(cargoMapeado)) {
          contadores.cargosMinisteriais[cargoMapeado]++;
        }
        
        if (contadores.cargosApoio.hasOwnProperty(cargoMapeado)) {
          contadores.cargosApoio[cargoMapeado]++;
        }
      }
    });

    // Acessa a planilha externa de Cotia
    const ssCotia = openCotiaSheet();
    
    // Acessa a aba Resumo da planilha externa de Cotia
    const shResumo = ssCotia.getSheetByName('Resumo');
    if (!shResumo) {
      throw new Error('Aba "Resumo" não encontrada na planilha externa de Cotia.');
    }
    
    // LIMPA todos os contadores antes de atualizar (correção do problema)
    limparContadoresResumo(shResumo, [28, 41, 48, 50]);
    
    console.log(`📊 Atualizando aba Resumo da planilha externa de Cotia com dados do ensaio de ${localEnsaio}...`);
    
    // Atualiza apenas os valores usando a função escreveAoLado
    console.log('📊 Atualizando valores na aba Resumo...');
    
    // Sinônimos de rótulo para INSTRUMENTOS
    const INSTR_LABEL_SYNONYMS = {
      'Organista': ['Organista','Organistas']
    };

    const CARGO_MIN_ORD = [
      'Ancião','Diácono','Cooperador do Ofício','Cooperador de Jovens',
      'Encarregado Regional','Encarregado Local','Examinadora',
      'Secretária da Música','Secretário da Música',
      'Instrutor','Instrutora'
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
      'Examinadora': ['Examinadora'],
      'Secretária da Música': ['Secretária da Música','Secretarias da Música','Secretaria da Música'],
      'Secretário da Música': ['Secretário da Música','Secretarios da Música','Secretario da Música'],
      'Instrutores': ['Instrutores','Instrutor'],
      'Instrutoras': ['Instrutoras','Instrutora']
    };

    // Atualiza instrumentos com sinônimos
    listaCompletaInstrumentos.forEach(canonical => {
      const val = contadores.instrumentos[canonical] || 0;
      const rLabels = INSTR_LABEL_SYNONYMS[canonical] || [canonical];
      rLabels.forEach(rot => atualizarColunaBPreservandoFormulas(shResumo, rot, val));
    });

    // Atualiza músicos por instrumento
    listaCompletaInstrumentos.forEach(canonical => {
      const val = contadores.musicos[canonical] || 0;
      const rLabels = INSTR_LABEL_SYNONYMS[canonical] || [canonical];
      rLabels.forEach(rot => atualizarColunaBPreservandoFormulas(shResumo, rot, val));
    });

    // Atualiza cargos ministeriais com sinônimos
    CARGO_MIN_ORD.forEach(canonical => {
      const val = contadores.cargosMinisteriais[canonical] || 0;
      const rLabels = MIN_LABEL_SYNONYMS[canonical] || [canonical];
      rLabels.forEach(rot => atualizarColunaBPreservandoFormulas(shResumo, rot, val));
    });

    // Atualiza cargos de apoio com sinônimos
    APOIO_IRM_ORD.forEach(canonical => {
      const val = contadores.cargosApoio[canonical] || 0;
      APOIO_LABEL_SYNONYMS[canonical].forEach(rot => atualizarColunaBPreservandoFormulas(shResumo, rot, val));
    });

    console.log(`✅ Aba Resumo da planilha externa de Cotia atualizada com sucesso com dados do ensaio de ${localEnsaio}`);
    console.log(`📈 Total de membros: ${contadores.total}`);
    
    return {
      ok: true,
      localEnsaio: localEnsaio,
      abaAtualizada: 'Resumo',
      planilhaId: COTIA_SHEET_ID,
      totalMembros: contadores.total,
      instrumentos: contadores.instrumentos,
      cargosMinisteriais: contadores.cargosMinisteriais,
      cargosApoio: contadores.cargosApoio
    };

  } catch (error) {
    console.error(`❌ Erro ao atualizar aba Resumo da planilha externa de Cotia com dados do ensaio de ${localEnsaio}:`, error);
    throw error;
  }
}

// Função para mapear instrumentos da planilha para a lista padrão
