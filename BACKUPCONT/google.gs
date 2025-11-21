/**
 * Sistema de Alimentação de Planilhas - CCB Regional Itapevi
 * Versão otimizada e limpa
 */

const DEFAULT_SHEET_ID = '1LGoW7lbYS4crpEdTfGR2evuH9kArZgqrvVbmi6buBoQ';
const SHEET_NAME = 'Dados';

// ID da planilha de Cotia (planilha externa)
const COTIA_SHEET_ID = '14gHBhE4rf8O5H8aQrqcuCnnO72j4bJzR7kWh-d2Y9o8';

// ID da planilha de Itapevi (planilha externa)
const ITAPEVI_SHEET_ID = '1iawqpjLV_LMPkj-Eq2tpE2dmq92-avyhXC4xphkvdKY';

// ID da planilha de Caucaia (planilha externa)
const CAUCAIA_SHEET_ID = '1maunnaSjcZ8o6OVpyHzTrljd6ykGMmCds4nEPJpXLaA';

// ID da planilha de Jandira (planilha externa)
const JANDIRA_SHEET_ID = '1w-AH31prNxc38KHlS5TdaR982qsgs5cT0U2xQbAIZ4I';

// ID da planilha de Fazendinha (planilha externa)
const FAZENDINHA_SHEET_ID = '1RHDamwT53PaD3QhAcEQuM0ZEtPIff_lLHH3TKURMOW8';

// ID da planilha de Pirapora (planilha externa)
const PIRAPORA_SHEET_ID = '1OHdjW0oUBIFJjubWg4DmxPJnegQzQNk7qb1v7M6Ymk0';

// ID da planilha de VargemGrande (planilha externa)
const VARGEMGRANDE_SHEET_ID = '1BtCETMduDOV-FV6lzvEwgs5gimhYtwZbjy7tlzR8nYI';

const REQUIRED_HEADERS = [
  'UUID','NOME COMPLETO','COMUM','CIDADE','CARGO','INSTRUMENTO',
  'NAIPE_INSTRUMENTO','CLASSE_ORGANISTA','LOCAL_ENSAIO','DATA_ENSAIO',
  'REGISTRADO_POR','ANOTACOES'
];

// Cache para otimização
let SHEETS_CACHE = {};
let SHEET_CACHE = null;
let HEADERS_CACHE = null;
let LAST_HEADER_CHECK = 0;

// Mapeamento de cargos
const aliasCargo = {
  'ancião': 'Ancião',
  'diácono': 'Diácono',
  'cooperador do ofício': 'Cooperador do Ofício',
  'cooperador do oficio': 'Cooperador do Ofício',
  'cooperador de jovens': 'Cooperador de Jovens',
  'encarregado regional': 'Encarregado Regional',
  'encarregado local': 'Encarregado Local',
  'examinadora': 'Examinadora',
  'secretária da música': 'Secretária da Música',
  'secretaria da musica': 'Secretária da Música',
  'secretário da música': 'Secretário da Música',
  'secretario da musica': 'Secretário da Música',
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
  'irmao': 'Irmandade'
};

// Funções utilitárias
function norm(s) { return s ? String(s).trim() : ''; }
function key(s) { return norm(s).toLowerCase(); }
function cap(s) { return norm(s).replace(/\b\w/g, l => l.toUpperCase()); }
function isYes(s) { return /^(sim|s|yes|y|1|true)$/i.test(norm(s)); }

// Função para determinar se é encarregado local
function ehEncarregadoLocal(cargo) {
  if (!cargo) return false;
  const cargoLower = cargo.toLowerCase();
  return cargoLower.includes('encarregado local') || cargoLower.includes('encarregado de local');
}

// Função para determinar se é encarregado regional ou examinadora da regional
function ehEncarregadoRegional(cargo) {
  if (!cargo) return false;
  const cargoLower = cargo.toLowerCase();
  return cargoLower.includes('encarregado regional') || 
         cargoLower.includes('examinadora') ||
         cargoLower.includes('examinador');
}

// Função para resposta JSON
function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj || {}))
    .setMimeType(ContentService.MimeType.JSON);
}

// Função para abrir ou criar sheet
function openOrCreateSheet(name) {
  if (SHEETS_CACHE[name]) return SHEETS_CACHE[name];
  
  const ss = SpreadsheetApp.openById(DEFAULT_SHEET_ID);
  let sheet = ss.getSheetByName(name);
  
  if (!sheet) {
    sheet = ss.insertSheet(name);
    console.log(`✅ Nova aba criada: ${name}`);
  }
  
  SHEETS_CACHE[name] = sheet;
  return sheet;
}

// Função para acessar planilha externa de Cotia
function openCotiaSheet() {
  try {
    console.log('🏛️ Acessando planilha externa de Cotia...');
    const ss = SpreadsheetApp.openById(COTIA_SHEET_ID);
    console.log('✅ Planilha de Cotia acessada com sucesso');
    return ss;
  } catch (error) {
    console.error('❌ Erro ao acessar planilha de Cotia:', error);
    throw new Error(`Não foi possível acessar a planilha de Cotia: ${error.message}`);
  }
}

// Função para abrir a planilha externa de Itapevi
function openItapeviSheet() {
  try {
    console.log('🏛️ Acessando planilha externa de Itapevi...');
    const ss = SpreadsheetApp.openById(ITAPEVI_SHEET_ID);
    console.log('✅ Planilha de Itapevi acessada com sucesso');
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
    console.log('✅ Planilha de Caucaia acessada com sucesso');
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
    console.log('✅ Planilha de Jandira acessada com sucesso');
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
    console.log('✅ Planilha de Fazendinha acessada com sucesso');
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
    console.log('✅ Planilha de Pirapora acessada com sucesso');
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
    console.log('✅ Planilha de VargemGrande acessada com sucesso');
    return ss;
  } catch (error) {
    console.error('❌ Erro ao acessar planilha de VargemGrande:', error);
    throw new Error(`Não foi possível acessar a planilha de VargemGrande: ${error.message}`);
  }
}

// Função para limpar cache
function clearCache() {
  SHEETS_CACHE = {};
  SHEET_CACHE = null;
  HEADERS_CACHE = null;
  LAST_HEADER_CHECK = 0;
}

// Função para determinar se a pessoa é músico
function ehMusico(x) {
  return x.cargo !== 'Organista' && (!!x.instrumento || isYes(x.vai_tocar));
}

// Função para determinar se a pessoa esteve presente
function estevePresente(x) {
  const vaiSim = isYes(x.vai_tocar);
  const temInstrumento = !!x.instrumento;
  const temCargoMusical = x.cargo && (
    x.cargo.toLowerCase().includes('organista') ||
    x.cargo.toLowerCase().includes('músico') ||
    x.cargo.toLowerCase().includes('musico')
  );
  const temCargoMinisterial = x.cargo && (
    x.cargo.toLowerCase().includes('ancião') ||
    x.cargo.toLowerCase().includes('diácono') ||
    x.cargo.toLowerCase().includes('cooperador') ||
    x.cargo.toLowerCase().includes('encarregado') ||
    x.cargo.toLowerCase().includes('examinadora') ||
    x.cargo.toLowerCase().includes('secretária') ||
    x.cargo.toLowerCase().includes('secretario') ||
    x.cargo.toLowerCase().includes('secret') ||
    x.cargo.toLowerCase().includes('instrutor')
  );
  const temCargoApoio = x.cargo && (
    x.cargo.toLowerCase().includes('porteiro') ||
    x.cargo.toLowerCase().includes('bombeiro') ||
    x.cargo.toLowerCase().includes('médico') ||
    x.cargo.toLowerCase().includes('enfermeiro') ||
    x.cargo.toLowerCase().includes('irmandade')
  );

  return vaiSim || temInstrumento || temCargoMusical || temCargoMinisterial || temCargoApoio;
}

// Função para classificar o tipo de cargo
function classificarCargo(cargo) {
  if (!cargo) return 'outros';
  
  const cargoLower = cargo.toLowerCase();
  
  if (cargoLower.includes('organista') || cargoLower.includes('examinadora') || cargoLower.includes('instrutora')) {
    return 'organista';
  }
  
  if (cargoLower.includes('ancião') || cargoLower.includes('diácono') || 
      cargoLower.includes('cooperador') || cargoLower.includes('encarregado') ||
      cargoLower.includes('secretária') || cargoLower.includes('secretário')) {
    return 'ministerio';
  }
  
  if (cargoLower.includes('porteiro') || cargoLower.includes('bombeiro') ||
      cargoLower.includes('médico') || cargoLower.includes('enfermeiro') ||
      cargoLower.includes('irmandade')) {
    return 'apoio';
  }
  
  if (cargoLower.includes('músico') || cargoLower.includes('musico')) {
    return 'musico';
  }
  
  return 'outros';
}

// Função para formatar texto corretamente
function formatarTexto(texto) {
  if (!texto) return '';
  const textoMinusculo = texto.toLowerCase();
  return textoMinusculo.replace(/\b\w/g, l => l.toUpperCase());
}

// Função principal para processar contagem detalhada por localidade
function processarPresentesPorLocalidade() {
  try {
    console.log('🔄 Iniciando processamento de contagem por localidade...');
    
    const shDados = openOrCreateSheet(SHEET_NAME);
    const lastRow = shDados.getLastRow();
    const lastCol = shDados.getLastColumn();
    
    console.log(`📊 Dados encontrados: ${lastRow} linhas, ${lastCol} colunas`);
    
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

    // Normaliza e processa os dados
    const linhas = [];
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const nome = norm(row[headerMap['NOME COMPLETO']] || '');
      if (!nome) continue;

      const comum = norm(row[headerMap['COMUM']] || '') || '(Sem comum)';
      const cidade = norm(row[headerMap['CIDADE']] || '') || '(Sem cidade)';
      const localEnsaio = norm(row[headerMap['LOCAL_ENSAIO']] || '') || '(Sem local definido)';
      
      const cargoRaw = norm(row[headerMap['CARGO']] || '');
      const cargoK = key(cargoRaw);
      const cargo = aliasCargo[cargoK] || (cargoK ? cap(cargoRaw) : '');
      
      const instrumento = norm(row[headerMap['INSTRUMENTO']] || '');
      const vaiTocar = norm(row[headerMap['VAI_TOCAR']] || '');
      const nivel = norm(row[headerMap['CLASSE_ORGANISTA']] || '');

      linhas.push({
        nome, comum, cidade, cargo, instrumento, vai_tocar: vaiTocar, nivel, local_ensaio: localEnsaio, _ord: i
      });
    }

    // Agrupa por local e comum
    const localMap = {};
    const comumMap = {};
    const locais = [];
    const comuns = [];
    const totalGeral = { total: 0, presentes: 0, ausentes: 0 };

    linhas.forEach(x => {
      const local = x.local_ensaio;
      const comum = x.comum;
      
      // Inicializa o local se não existir
      if (!localMap[local]) {
        localMap[local] = {};
        locais.push(local);
      }
      
      // Inicializa a comum no local se não existir
      if (!localMap[local][comum]) {
        localMap[local][comum] = {
          cidade: x.cidade,
          musicos: 0,
          organistas: 0,
          ministerio: 0,
          apoio: 0,
          outros: 0,
          total: 0,
          encarregadoLocal: false,
          encarregadoNome: '',
          encarregadoLocalEnsaio: '',
          detalhes: []
        };
      }
      
      // Inicializa a comum global se não existir
      if (!comumMap[comum]) {
        comumMap[comum] = {
          cidade: x.cidade,
          locais: [],
          musicos: 0,
          organistas: 0,
          ministerio: 0,
          apoio: 0,
          outros: 0,
          total: 0,
          encarregadoLocal: false,
          encarregadoNome: '',
          encarregadoLocalEnsaio: ''
        };
      }
      
      // Classifica por tipo de cargo
      const tipoCargo = classificarCargo(x.cargo);
      
      if (tipoCargo === 'organista') {
        localMap[local][comum].organistas++;
        comumMap[comum].organistas++;
      } else if (tipoCargo === 'musico' || ehMusico(x)) {
        localMap[local][comum].musicos++;
        comumMap[comum].musicos++;
      } else if (tipoCargo === 'ministerio') {
        localMap[local][comum].ministerio++;
        comumMap[comum].ministerio++;
      } else if (tipoCargo === 'apoio') {
        localMap[local][comum].apoio++;
        comumMap[comum].apoio++;
      } else {
        localMap[local][comum].outros++;
        comumMap[comum].outros++;
      }
      
      // Conta total
      localMap[local][comum].total++;
      comumMap[comum].total++;
      totalGeral.total++;
      
      // Verifica se é encarregado local
      if (ehEncarregadoLocal(x.cargo)) {
        localMap[local][comum].encarregadoLocal = true;
        localMap[local][comum].encarregadoNome = x.nome;
        localMap[local][comum].encarregadoLocalEnsaio = x.local_ensaio;
        
        comumMap[comum].encarregadoLocal = true;
        comumMap[comum].encarregadoNome = x.nome;
        comumMap[comum].encarregadoLocalEnsaio = x.local_ensaio;
      }
      
      // Adiciona aos detalhes se presente
      if (estevePresente(x)) {
        localMap[local][comum].detalhes.push(x);
        totalGeral.presentes++;
      } else {
        totalGeral.ausentes++;
      }
      
      // Adiciona local à lista de locais da comum
      if (!comumMap[comum].locais.includes(local)) {
        comumMap[comum].locais.push(local);
      }
    });

    // Cria a aba de resumo
    const shResumo = openOrCreateSheet('Resumo');
    shResumo.clearContents();
    
    let row = 1;
    
    // Cabeçalho principal
    shResumo.getRange(row,1,1,1).setValue('RESUMO GERAL').setFontWeight('bold').setFontSize(14);
    shResumo.getRange(row,1,1,1).setBackground('#4285f4').setFontColor('white');
    row += 2;

    // Cabeçalho da tabela
    shResumo.getRange(row,1,1,8).setValues([['Local', 'Comum', 'Total', 'Músicos', 'Organistas', 'Ministério', 'Apoio', 'Outros']]).setFontWeight('bold');
    shResumo.getRange(row,1,1,8).setBackground('#e8f0fe');
    row++;

    // Ordena locais por nome
    const locaisOrdenados = locais.sort((a, b) => a.localeCompare(b, 'pt-BR'));

    // Processa cada local
    locaisOrdenados.forEach(local => {
      const localDados = localMap[local];
      const comunsDoLocal = Object.keys(localDados).sort((a, b) => a.localeCompare(b, 'pt-BR'));
      
      comunsDoLocal.forEach(comum => {
        const dados = localDados[comum];
        shResumo.getRange(row,1,1,8).setValues([[
          local, 
          comum, 
          dados.total, 
          dados.musicos, 
          dados.organistas, 
          dados.ministerio, 
          dados.apoio, 
          dados.outros
        ]]);
          row++;
      });
    });

    // Linha de total
    shResumo.getRange(row,1,1,8).setValues([[
      'TOTAL GERAL', 
      '', 
      totalGeral.total, 
      Object.values(comumMap).reduce((sum, c) => sum + c.musicos, 0),
      Object.values(comumMap).reduce((sum, c) => sum + c.organistas, 0),
      Object.values(comumMap).reduce((sum, c) => sum + c.ministerio, 0),
      Object.values(comumMap).reduce((sum, c) => sum + c.apoio, 0),
      Object.values(comumMap).reduce((sum, c) => sum + c.outros, 0)
    ]]).setFontWeight('bold');
    shResumo.getRange(row,1,1,8).setBackground('#f0f0f0');
    row += 2;

    // Seção de detalhes por local
    shResumo.getRange(row,1,1,1).setValue('DETALHES POR LOCAL').setFontWeight('bold').setFontSize(12);
    shResumo.getRange(row,1,1,1).setBackground('#e8f0fe');
    row += 2;

    locaisOrdenados.forEach(local => {
      const localDados = localMap[local];
      const comunsDoLocal = Object.keys(localDados).sort((a, b) => a.localeCompare(b, 'pt-BR'));
      
      shResumo.getRange(row,1,1,1).setValue(`${local} (${comunsDoLocal.length} comuns)`).setFontWeight('bold');
      shResumo.getRange(row,1,1,1).setBackground('#f0f0f0');
        row++;

      comunsDoLocal.forEach(comum => {
        const dados = localDados[comum];
        if (dados.detalhes.length > 0) {
          shResumo.getRange(row,1,1,1).setValue(`  ${comum} (${dados.detalhes.length} presentes)`).setFontWeight('bold');
          shResumo.getRange(row,1,1,1).setBackground('#f8f8f8');
      row++;
      
          dados.detalhes.forEach(membro => {
            const cargoInfo = membro.cargo ? ` - ${membro.cargo}` : '';
            const instrumentoInfo = membro.instrumento ? ` (${membro.instrumento})` : '';
            shResumo.getRange(row,1,1,1).setValue(`    • ${membro.nome}${cargoInfo}${instrumentoInfo}`);
      row++;
          });
        row++;
      }
      });
      row++;
    });

    // Formatação
    shResumo.autoResizeColumns(1, 8);
    shResumo.getRange(1, 1, row-1, 8).setBorder(true, true, true, true, true, true);
    try { shResumo.getDataRange().setFontFamily('Arial').setFontSize(11); } catch(e){}
    try { shResumo.setFrozenRows(1); } catch(e){}

    console.log('✅ Resumo processado com sucesso!');
    console.log(`📈 Resultado: ${locais.length} locais, ${comuns.length} comuns, ${totalGeral.total} presentes`);
    
    return {
      ok: true,
      locais: locais.length,
      comuns: comuns.length,
      totalPresentes: totalGeral.total,
      detalhes: totalGeral
    };

  } catch (error) {
    console.error('❌ Erro ao processar resumo:', error);
    throw error;
  }
}

// Webhook principal
function doPost(e) {
  try {
    const raw = e?.postData?.contents || '{}';
    const body = JSON.parse(raw);

    const op = String(body?.op || '').toLowerCase();
    if (op === 'ping') return jsonResponse({ ok: true, pong: true });
    
    if (op === 'atualizar_resumo') {
      const resultado = processarPresentesPorLocalidade();
      return jsonResponse({ 
        ok: true, 
        op: 'atualizar_resumo', 
        resultado: resultado 
      });
    }
    
    if (op === 'atualizar_sistema_completo') {
      const resultado = atualizarSistemaCompleto();
      return jsonResponse({ 
        ok: resultado.ok, 
        op: 'atualizar_sistema_completo', 
        resultado: resultado 
      });
    }
    
    if (op === 'listar_locais_ensaio') {
      const resultado = listarLocaisEnsaio();
      return jsonResponse({ 
        ok: resultado.ok, 
        op: 'listar_locais_ensaio', 
        resultado: resultado 
      });
    }
    
    if (op === 'exportar_completo_cotia') {
      const localEnsaio = body?.local_ensaio;
      if (!localEnsaio) {
        return jsonResponse({ ok: false, error: 'local_ensaio é obrigatório' });
      }
      
      const resultadoEnsaio = exportarParaPlanilhaCotiaCompleta(localEnsaio);
      const resultadoOrganistas = alimentarAbaOrganistasCotia(localEnsaio);
      
      return jsonResponse({ 
        ok: true, 
        op: 'exportar_completo_cotia', 
        resultado: {
          ensaio: resultadoEnsaio,
          organistas: resultadoOrganistas
        }
      });
    }

    if (op === 'exportar_completo_itapevi') {
      const localEnsaio = body?.local_ensaio;
      if (!localEnsaio) {
        return jsonResponse({ ok: false, error: 'local_ensaio é obrigatório' });
      }
      
      const resultadoEnsaio = exportarParaPlanilhaItapeviCompleta(localEnsaio);
      const resultadoOrganistas = alimentarAbaOrganistasItapevi(localEnsaio);
      
      return jsonResponse({ 
        ok: true, 
        op: 'exportar_completo_itapevi', 
        resultado: {
          ensaio: resultadoEnsaio,
          organistas: resultadoOrganistas
        }
      });
    }

    if (op === 'exportar_completo_caucaia') {
      const localEnsaio = body?.local_ensaio;
      if (!localEnsaio) {
        return jsonResponse({ ok: false, error: 'local_ensaio é obrigatório' });
      }
      
      const resultadoEnsaio = exportarParaPlanilhaCaucaiaCompleta(localEnsaio);
      const resultadoOrganistas = alimentarAbaOrganistasCaucaia(localEnsaio);
      
      return jsonResponse({ 
        ok: true, 
        op: 'exportar_completo_caucaia', 
        resultado: {
          ensaio: resultadoEnsaio,
          organistas: resultadoOrganistas
        }
      });
    }

    if (op === 'exportar_completo_jandira') {
      const localEnsaio = body?.local_ensaio;
      if (!localEnsaio) {
        return jsonResponse({ ok: false, error: 'local_ensaio é obrigatório' });
      }
      
      const resultadoEnsaio = exportarParaPlanilhaJandiraCompleta(localEnsaio);
      const resultadoOrganistas = alimentarAbaOrganistasJandira(localEnsaio);
      
      return jsonResponse({ 
        ok: true, 
        op: 'exportar_completo_jandira', 
        resultado: {
          ensaio: resultadoEnsaio,
          organistas: resultadoOrganistas
        }
      });
    }

    if (op === 'exportar_completo_fazendinha') {
      const localEnsaio = body?.local_ensaio;
      if (!localEnsaio) {
        return jsonResponse({ ok: false, error: 'local_ensaio é obrigatório' });
      }
      
      const resultadoEnsaio = exportarParaPlanilhaFazendinhaCompleta(localEnsaio);
      const resultadoOrganistas = alimentarAbaOrganistasFazendinha(localEnsaio);
      
      return jsonResponse({ 
        ok: true, 
        op: 'exportar_completo_fazendinha', 
        resultado: {
          ensaio: resultadoEnsaio,
          organistas: resultadoOrganistas
        }
      });
    }

    if (op === 'exportar_completo_pirapora') {
      const localEnsaio = body?.local_ensaio;
      if (!localEnsaio) {
        return jsonResponse({ ok: false, error: 'local_ensaio é obrigatório' });
      }
      
      const resultadoEnsaio = exportarParaPlanilhaPiraporaCompleta(localEnsaio);
      const resultadoOrganistas = alimentarAbaOrganistasPirapora(localEnsaio);
      
      return jsonResponse({ 
        ok: true, 
        op: 'exportar_completo_pirapora', 
        resultado: {
          ensaio: resultadoEnsaio,
          organistas: resultadoOrganistas
        }
      });
    }

    if (op === 'exportar_completo_vargemgrande') {
      const localEnsaio = body?.local_ensaio;
      if (!localEnsaio) {
        return jsonResponse({ ok: false, error: 'local_ensaio é obrigatório' });
      }
      
      const resultadoEnsaio = exportarParaPlanilhaVargemGrandeCompleta(localEnsaio);
      const resultadoOrganistas = alimentarAbaOrganistasVargemGrande(localEnsaio);
      
      return jsonResponse({ 
        ok: true, 
        op: 'exportar_completo_vargemgrande', 
        resultado: {
          ensaio: resultadoEnsaio,
          organistas: resultadoOrganistas
        }
      });
    }

    return jsonResponse({ ok: false, error: 'Operação não reconhecida' });

  } catch (error) {
    console.error('❌ Erro no webhook:', error);
    return jsonResponse({ ok: false, error: error.message });
  }
}

// Função para atualizar sistema completo
function atualizarSistemaCompleto() {
  try {
    console.log('🚀 Iniciando atualização completa do sistema...');
    
    const resultado = processarPresentesPorLocalidade();
    
    console.log('✅ Sistema atualizado com sucesso!');
    return {
      ok: true,
      timestamp: new Date().toISOString(),
      resultado: resultado
    };

  } catch (error) {
    console.error('❌ Erro na atualização completa:', error);
    return {
      ok: false,
      error: error.message
    };
  }
}

// Função para testar mapeamento de cargos
function testarMapeamentoCargos() {
  try {
    console.log('🔍 Testando mapeamento de cargos...');
    
    const cargosTeste = [
      'Examinadora',
      'examinadora', 
      'EXAMINADORA',
      'Examinadoras',
      'examinadoras',
      'Examinador',
      'examinador',
      'Examinadores',
      'examinadores',
      'Examinadora de Organistas',
      'examinadora de organistas',
      'EXAMINADORA DE ORGANISTAS',
      'Examinadoras de Organistas',
      'examinadoras de organistas',
      'Secretária da Música',
      'secretaria da musica',
      'Secretárias da Música',
      'secretarias da musica',
      'Secretário da Música',
      'secretario da musica',
      'Secretários da Música',
      'secretarios da musica',
      'Instrutor',
      'instrutor',
      'Instrutora',
      'instrutora',
      'Instrutores',
      'instrutores',
      'Instrutoras',
      'instrutoras'
    ];
    
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
      'instrutoras': 'Instrutora'
    };
    
    const listaCompletaCargosMinisteriais = [
      'Ancião', 'Diácono', 'Cooperador do Ofício', 'Cooperador de Jovens',
      'Encarregado Regional', 'Encarregado Local', 'Examinadora',
      'Secretária da Música', 'Secretário da Música', 'Instrutor', 'Instrutora'
    ];
    
    let resultados = [];
    
    cargosTeste.forEach(cargoOriginal => {
      const cargoFormatado = formatarTexto(cargoOriginal);
      const cargoMapeado = mapeamentoCargos[cargoFormatado.toLowerCase()];
      const isMinisterial = listaCompletaCargosMinisteriais.includes(cargoMapeado);
      
      resultados.push({
        original: cargoOriginal,
        formatado: cargoFormatado,
        mapeado: cargoMapeado,
        isMinisterial: isMinisterial
      });
      
      console.log(`🧪 "${cargoOriginal}" -> "${cargoFormatado}" -> "${cargoMapeado}" (Ministerial: ${isMinisterial})`);
    });
    
    const ui = SpreadsheetApp.getUi();
    const mensagem = `Resultado do teste de mapeamento:\n\n` +
      resultados.map(r => 
        `"${r.original}" -> "${r.formatado}" -> "${r.mapeado}" (Ministerial: ${r.isMinisterial})`
      ).join('\n');
    
    ui.alert('🔍 Teste de Mapeamento de Cargos', mensagem, ui.ButtonSet.OK);

  } catch (error) {
    console.error('❌ Erro no teste de mapeamento:', error);
    const ui = SpreadsheetApp.getUi();
    ui.alert('❌ Erro no Teste', `Erro: ${error.message}`, ui.ButtonSet.OK);
  }
}

// Função para testar atualização da aba Resumo
function testarAtualizacaoResumo() {
  try {
    console.log('🔍 Testando atualização da aba Resumo...');
    
    const ui = SpreadsheetApp.getUi();
    const resultadoLocais = listarLocaisEnsaio();
    if (!resultadoLocais || !resultadoLocais.ok || !resultadoLocais.locais || resultadoLocais.locais.length === 0) {
      ui.alert('❌ Nenhum local de ensaio encontrado nos dados.');
      return;
    }
    
    const locais = resultadoLocais.locais;
    const opcoes = locais.map((local, index) => `${index + 1}. ${local}`).join('\n');
    const prompt = `Escolha o local de ensaio para testar:\n\n${opcoes}\n\nDigite o número da opção:`;
    const resposta = ui.prompt('🔍 Testar Atualização da Aba Resumo', prompt, ui.ButtonSet.OK_CANCEL);
    
    if (resposta.getSelectedButton() !== ui.Button.OK) {
      ui.alert('❌ Operação cancelada pelo usuário.');
      return;
    }
    
    const escolha = parseInt(resposta.getResponseText().trim());
    if (isNaN(escolha) || escolha < 1 || escolha > locais.length) {
      ui.alert('❌ Opção inválida. Por favor, digite um número válido.');
      return;
    }
    
    const localEscolhido = locais[escolha - 1];
    
    // Simula a contagem sem atualizar a planilha
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
      if (h) headerMap[h.toString().trim()] = i; 
    });

    const linhasLocal = [];
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const nome = norm(row[headerMap['NOME COMPLETO']] || '');
      if (!nome) continue;

      const localEnsaioRow = norm(row[headerMap['LOCAL_ENSAIO']] || '') || '(Sem local definido)';
      if (localEnsaioRow.toLowerCase() !== localEscolhido.toLowerCase()) continue;
      
      const cargoRaw = norm(row[headerMap['CARGO']] || '');
      const cargoK = key(cargoRaw);
      const cargo = aliasCargo[cargoK] || (cargoK ? cap(cargoRaw) : '');
      
      linhasLocal.push({
        nome, cargo, local_ensaio: localEnsaioRow, _ord: i
      });
    }

    const listaCompletaCargosMinisteriais = [
      'Ancião', 'Diácono', 'Cooperador do Ofício', 'Cooperador de Jovens',
      'Encarregado Regional', 'Encarregado Local', 'Examinadora',
      'Secretária da Música', 'Secretário da Música', 'Instrutor', 'Instrutora'
    ];

    const contadores = {};
    listaCompletaCargosMinisteriais.forEach(cargo => {
      contadores[cargo] = 0;
    });

    linhasLocal.forEach(x => {
      if (!estevePresente(x)) return;
      
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
          'secretária da música': 'Secretária da Música',
          'secretaria da musica': 'Secretária da Música',
          'secretário da música': 'Secretário da Música',
          'secretario da musica': 'Secretário da Música',
          'instrutor': 'Instrutor',
          'instrutora': 'Instrutora',
          'instrutores': 'Instrutor',
          'instrutoras': 'Instrutora'
        };
        
        const cargoMapeado = mapeamentoCargos[cargoFormatado.toLowerCase()];
        if (cargoMapeado && listaCompletaCargosMinisteriais.includes(cargoMapeado)) {
          contadores[cargoMapeado]++;
          console.log(`👔 Cargo ministerial contado: ${cargoOriginal} -> ${cargoMapeado} - ${x.nome}`);
        }
      }
    });

    const MIN_LABEL_SYNONYMS = {
      'Ancião': ['Ancião','Anciao'],
      'Diácono': ['Diácono','Diacono'],
      'Cooperador do Ofício': ['Cooperador do Ofício','Cooperador do Oficio'],
      'Cooperador de Jovens': ['Cooperador de Jovens'],
      'Encarregado Regional': ['Encarregado Regional'],
      'Encarregado Local': ['Encarregado Local'],
      'Examinadora': ['Examinadora'],
      'Secretária da Música': ['Secretária da Música','Secretarias da Música','Secretaria da Música'],
      'Secretário da Música': ['Secretário da Música','Secretarios da Música','Secretario da Música'],
      'Instrutores': ['Instrutores','Instrutor'],
      'Instrutoras': ['Instrutoras','Instrutora']
    };

    const CARGO_MIN_ORD = [
      'Ancião','Diácono','Cooperador do Ofício','Cooperador de Jovens',
      'Encarregado Regional','Encarregado Local','Examinadora',
      'Secretária da Música','Secretário da Música',
      'Instrutor','Instrutora'
    ];

    let resultados = [];
    CARGO_MIN_ORD.forEach(canonical => {
      const val = contadores[canonical] || 0;
      const rLabels = MIN_LABEL_SYNONYMS[canonical] || [canonical];
      
      resultados.push({
        cargo: canonical,
        valor: val,
        sinonimos: rLabels
      });
      
      console.log(`📊 ${canonical}: ${val} (sinônimos: ${rLabels.join(', ')})`);
    });

    const mensagem = `Resultado do teste para ${localEscolhido}:\n\n` +
      resultados.map(r => 
        `• ${r.cargo}: ${r.valor} (sinônimos: ${r.sinonimos.join(', ')})`
      ).join('\n') + 
      `\n\n📊 Total de membros: ${linhasLocal.length}`;
    
    ui.alert('🔍 Teste de Atualização da Aba Resumo', mensagem, ui.ButtonSet.OK);

  } catch (error) {
    console.error('❌ Erro no teste de atualização:', error);
    const ui = SpreadsheetApp.getUi();
    ui.alert('❌ Erro no Teste', `Erro: ${error.message}`, ui.ButtonSet.OK);
  }
}

// Função para testar busca de rótulos na aba Resumo
function testarBuscaRotulosResumo() {
  try {
    console.log('🔍 Testando busca de rótulos na aba Resumo...');
    
    const ui = SpreadsheetApp.getUi();
    const resultadoLocais = listarLocaisEnsaio();
    if (!resultadoLocais || !resultadoLocais.ok || !resultadoLocais.locais || resultadoLocais.locais.length === 0) {
      ui.alert('❌ Nenhum local de ensaio encontrado nos dados.');
      return;
    }
    
    const locais = resultadoLocais.locais;
    const opcoes = locais.map((local, index) => `${index + 1}. ${local}`).join('\n');
    const prompt = `Escolha o local de ensaio para testar:\n\n${opcoes}\n\nDigite o número da opção:`;
    const resposta = ui.prompt('🔍 Testar Busca de Rótulos na Aba Resumo', prompt, ui.ButtonSet.OK_CANCEL);
    
    if (resposta.getSelectedButton() !== ui.Button.OK) {
      ui.alert('❌ Operação cancelada pelo usuário.');
      return;
    }
    
    const escolha = parseInt(resposta.getResponseText().trim());
    if (isNaN(escolha) || escolha < 1 || escolha > locais.length) {
      ui.alert('❌ Opção inválida. Por favor, digite um número válido.');
      return;
    }
    
    const localEscolhido = locais[escolha - 1];
    
    // Determina qual planilha externa usar baseado no local
    let ssExterna;
    if (localEscolhido.toLowerCase().includes('cotia')) {
      ssExterna = openCotiaSheet();
    } else if (localEscolhido.toLowerCase().includes('itapevi')) {
      ssExterna = openItapeviSheet();
    } else if (localEscolhido.toLowerCase().includes('caucaia')) {
      ssExterna = openCaucaiaSheet();
    } else if (localEscolhido.toLowerCase().includes('jandira')) {
      ssExterna = openJandiraSheet();
    } else if (localEscolhido.toLowerCase().includes('fazendinha')) {
      ssExterna = openFazendinhaSheet();
    } else if (localEscolhido.toLowerCase().includes('pirapora')) {
      ssExterna = openPiraporaSheet();
    } else if (localEscolhido.toLowerCase().includes('vargemgrande')) {
      ssExterna = openVargemGrandeSheet();
    } else {
      ui.alert('❌ Local não reconhecido para teste.');
      return;
    }
    
    const shResumo = ssExterna.getSheetByName('Resumo');
    if (!shResumo) {
      ui.alert('❌ Aba "Resumo" não encontrada na planilha externa.');
      return;
    }
    
    // Lista de rótulos para testar
    const rotulosTeste = [
      'Examinadora',
      'Ancião',
      'Diácono',
      'Cooperador do Ofício',
      'Cooperador de Jovens',
      'Encarregado Regional',
      'Encarregado Local',
      'Secretária da Música',
      'Secretário da Música',
      'Instrutor',
      'Instrutora'
    ];
    
    let resultados = [];
    
    rotulosTeste.forEach(rotulo => {
      const tf = shResumo.createTextFinder(rotulo).matchEntireCell(true);
      const matches = tf.findAll();
      
      resultados.push({
        rotulo: rotulo,
        encontrados: matches.length,
        posicoes: matches.map(m => `Linha ${m.getRow()}, Coluna ${m.getColumn()}`)
      });
      
      console.log(`🔍 "${rotulo}": ${matches.length} matches encontrados`);
    });
    
    const mensagem = `Resultado da busca de rótulos na aba Resumo:\n\n` +
      resultados.map(r => 
        `• "${r.rotulo}": ${r.encontrados} encontrados ${r.posicoes.length > 0 ? `(${r.posicoes.join(', ')})` : ''}`
      ).join('\n');
    
    ui.alert('🔍 Teste de Busca de Rótulos na Aba Resumo', mensagem, ui.ButtonSet.OK);

  } catch (error) {
    console.error('❌ Erro no teste de busca de rótulos:', error);
    const ui = SpreadsheetApp.getUi();
    ui.alert('❌ Erro no Teste', `Erro: ${error.message}`, ui.ButtonSet.OK);
  }
}

// Função para testar contagem completa de cargos ministeriais
function testarContagemCompletaCargos() {
  try {
    console.log('🔍 Testando contagem completa de cargos ministeriais...');
    
    const ui = SpreadsheetApp.getUi();
    const resultadoLocais = listarLocaisEnsaio();
    if (!resultadoLocais || !resultadoLocais.ok || !resultadoLocais.locais || resultadoLocais.locais.length === 0) {
      ui.alert('❌ Nenhum local de ensaio encontrado nos dados.');
      return;
    }
    
    const locais = resultadoLocais.locais;
    const opcoes = locais.map((local, index) => `${index + 1}. ${local}`).join('\n');
    const prompt = `Escolha o local de ensaio para testar:\n\n${opcoes}\n\nDigite o número da opção:`;
    const resposta = ui.prompt('🔍 Testar Contagem Completa de Cargos', prompt, ui.ButtonSet.OK_CANCEL);
    
    if (resposta.getSelectedButton() !== ui.Button.OK) {
      ui.alert('❌ Operação cancelada pelo usuário.');
      return;
    }
    
    const escolha = parseInt(resposta.getResponseText().trim());
    if (isNaN(escolha) || escolha < 1 || escolha > locais.length) {
      ui.alert('❌ Opção inválida. Por favor, digite um número válido.');
      return;
    }
    
    const localEscolhido = locais[escolha - 1];
    
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
      if (h) headerMap[h.toString().trim()] = i; 
    });

    const linhasLocal = [];
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const nome = norm(row[headerMap['NOME COMPLETO']] || '');
      if (!nome) continue;

      const localEnsaioRow = norm(row[headerMap['LOCAL_ENSAIO']] || '') || '(Sem local definido)';
      if (localEnsaioRow.toLowerCase() !== localEscolhido.toLowerCase()) continue;
      
      const cargoRaw = norm(row[headerMap['CARGO']] || '');
      const cargoK = key(cargoRaw);
      const cargo = aliasCargo[cargoK] || (cargoK ? cap(cargoRaw) : '');
      
      linhasLocal.push({
        nome, cargo, cargoRaw, local_ensaio: localEnsaioRow, _ord: i
      });
    }

    const listaCompletaCargosMinisteriais = [
      'Ancião', 'Diácono', 'Cooperador do Ofício', 'Cooperador de Jovens',
      'Encarregado Regional', 'Encarregado Local', 'Examinadora',
      'Secretária da Música', 'Secretário da Música', 'Instrutor', 'Instrutora'
    ];

    const contadores = {};
    listaCompletaCargosMinisteriais.forEach(cargo => {
      contadores[cargo] = 0;
    });

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
      'instrutoras': 'Instrutora'
    };

    let detalhes = [];

    linhasLocal.forEach(x => {
      if (!estevePresente(x)) return;
      
      if (x.cargo) {
        const cargoOriginal = x.cargo;
        const cargoFormatado = formatarTexto(cargoOriginal);
        const cargoMapeado = mapeamentoCargos[cargoFormatado.toLowerCase()];
        
        if (cargoMapeado && listaCompletaCargosMinisteriais.includes(cargoMapeado)) {
          contadores[cargoMapeado]++;
          detalhes.push({
            nome: x.nome,
            cargoOriginal: x.cargoRaw,
            cargoProcessado: cargoOriginal,
            cargoFormatado: cargoFormatado,
            cargoMapeado: cargoMapeado
          });
          console.log(`👔 Cargo ministerial contado: ${x.cargoRaw} -> ${cargoOriginal} -> ${cargoFormatado} -> ${cargoMapeado} - ${x.nome}`);
        }
      }
    });

    const mensagem = `Resultado da contagem para ${localEscolhido}:\n\n` +
      `📊 Total de membros: ${linhasLocal.length}\n\n` +
      `👔 Cargos Ministeriais Encontrados:\n` +
      listaCompletaCargosMinisteriais.map(cargo => 
        `• ${cargo}: ${contadores[cargo]}`
      ).join('\n') +
      `\n\n📋 Detalhes dos Cargos Encontrados:\n` +
      detalhes.map(d => 
        `• ${d.nome}: "${d.cargoOriginal}" -> "${d.cargoProcessado}" -> "${d.cargoFormatado}" -> "${d.cargoMapeado}"`
      ).join('\n');
    
    ui.alert('🔍 Teste de Contagem Completa de Cargos', mensagem, ui.ButtonSet.OK);

  } catch (error) {
    console.error('❌ Erro no teste de contagem completa:', error);
    const ui = SpreadsheetApp.getUi();
    ui.alert('❌ Erro no Teste', `Erro: ${error.message}`, ui.ButtonSet.OK);
  }
}

// Função para testar especificamente "Examinadora de Organistas"
function testarExaminadoraDeOrganistas() {
  try {
    console.log('🔍 Testando especificamente "Examinadora de Organistas"...');
    
    const ui = SpreadsheetApp.getUi();
    const resultadoLocais = listarLocaisEnsaio();
    if (!resultadoLocais || !resultadoLocais.ok || !resultadoLocais.locais || resultadoLocais.locais.length === 0) {
      ui.alert('❌ Nenhum local de ensaio encontrado nos dados.');
      return;
    }
    
    const locais = resultadoLocais.locais;
    const opcoes = locais.map((local, index) => `${index + 1}. ${local}`).join('\n');
    const prompt = `Escolha o local de ensaio para testar:\n\n${opcoes}\n\nDigite o número da opção:`;
    const resposta = ui.prompt('🔍 Testar Examinadora de Organistas', prompt, ui.ButtonSet.OK_CANCEL);
    
    if (resposta.getSelectedButton() !== ui.Button.OK) {
      ui.alert('❌ Operação cancelada pelo usuário.');
      return;
    }
    
    const escolha = parseInt(resposta.getResponseText().trim());
    if (isNaN(escolha) || escolha < 1 || escolha > locais.length) {
      ui.alert('❌ Opção inválida. Por favor, digite um número válido.');
      return;
    }
    
    const localEscolhido = locais[escolha - 1];
    
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
      if (h) headerMap[h.toString().trim()] = i; 
    });

    let examinadorasEncontradas = [];
    let totalLinhas = 0;

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const nome = norm(row[headerMap['NOME COMPLETO']] || '');
      if (!nome) continue;
      
      totalLinhas++;
      
      const cargoRaw = norm(row[headerMap['CARGO']] || '');
      const cargoK = key(cargoRaw);
      const cargo = aliasCargo[cargoK] || (cargoK ? cap(cargoRaw) : '');
      const localEnsaio = norm(row[headerMap['LOCAL_ENSAIO']] || '') || '(Sem local definido)';
      
      // Testa especificamente para "examinadora de organistas"
      const cargoLower = cargo ? cargo.toLowerCase() : '';
      const cargoRawLower = cargoRaw ? cargoRaw.toLowerCase() : '';
      
      if (cargoLower.includes('examinadora') || cargoRawLower.includes('examinadora')) {
        const cargoFormatado = formatarTexto(cargoRaw);
        
        const mapeamentoCargos = {
          'examinadora': 'Examinadora',
          'examinadoras': 'Examinadora',
          'examinador': 'Examinadora',
          'examinadores': 'Examinadora',
          'examinadora de organistas': 'Examinadora',
          'examinadoras de organistas': 'Examinadora',
          'examinador de organistas': 'Examinadora',
          'examinadores de organistas': 'Examinadora'
        };
        
        const cargoMapeado = mapeamentoCargos[cargoFormatado.toLowerCase()];
        
        examinadorasEncontradas.push({
          linha: i + 2,
          nome,
          cargoRaw,
          cargo,
          cargoFormatado,
          cargoMapeado,
          localEnsaio,
          isLocalCorreto: localEnsaio.toLowerCase() === localEscolhido.toLowerCase()
        });
        
        console.log(`✅ Examinadora encontrada na linha ${i + 2}: ${nome} - "${cargoRaw}" -> "${cargo}" -> "${cargoFormatado}" -> "${cargoMapeado}" - ${localEnsaio}`);
      }
    }

    const examinadorasDoLocal = examinadorasEncontradas.filter(e => e.isLocalCorreto);

    const mensagem = `Resultado do teste para ${localEscolhido}:\n\n` +
      `📊 Total de linhas processadas: ${totalLinhas}\n` +
      `👩‍🏫 Total de Examinadoras encontradas: ${examinadorasEncontradas.length}\n` +
      `📍 Examinadoras do local ${localEscolhido}: ${examinadorasDoLocal.length}\n\n` +
      `📋 Lista completa de Examinadoras:\n` +
      examinadorasEncontradas.map(e => 
        `• ${e.nome}: "${e.cargoRaw}" -> "${e.cargo}" -> "${e.cargoFormatado}" -> "${e.cargoMapeado}" - ${e.localEnsaio} ${e.isLocalCorreto ? '✅' : '❌'}`
      ).join('\n');
    
    ui.alert('🔍 Teste de Examinadora de Organistas', mensagem, ui.ButtonSet.OK);

  } catch (error) {
    console.error('❌ Erro no teste de Examinadora de Organistas:', error);
    const ui = SpreadsheetApp.getUi();
    ui.alert('❌ Erro no Teste', `Erro: ${error.message}`, ui.ButtonSet.OK);
  }
}

// Função para testar especificamente "Secretário/Secretária da Música"
function testarSecretarioDaMusica() {
  try {
    console.log('🔍 Testando especificamente "Secretário/Secretária da Música"...');
    
    const ui = SpreadsheetApp.getUi();
    const resultadoLocais = listarLocaisEnsaio();
    if (!resultadoLocais || !resultadoLocais.ok || !resultadoLocais.locais || resultadoLocais.locais.length === 0) {
      ui.alert('❌ Nenhum local de ensaio encontrado nos dados.');
      return;
    }
    
    const locais = resultadoLocais.locais;
    const opcoes = locais.map((local, index) => `${index + 1}. ${local}`).join('\n');
    const prompt = `Escolha o local de ensaio para testar:\n\n${opcoes}\n\nDigite o número da opção:`;
    const resposta = ui.prompt('🔍 Testar Secretário/Secretária da Música', prompt, ui.ButtonSet.OK_CANCEL);
    
    if (resposta.getSelectedButton() !== ui.Button.OK) {
      ui.alert('❌ Operação cancelada pelo usuário.');
      return;
    }
    
    const escolha = parseInt(resposta.getResponseText().trim());
    if (isNaN(escolha) || escolha < 1 || escolha > locais.length) {
      ui.alert('❌ Opção inválida. Por favor, digite um número válido.');
      return;
    }
    
    const localEscolhido = locais[escolha - 1];
    
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
      if (h) headerMap[h.toString().trim()] = i; 
    });

    let secretariosEncontrados = [];
    let totalLinhas = 0;

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const nome = norm(row[headerMap['NOME COMPLETO']] || '');
      if (!nome) continue;
      
      totalLinhas++;
      
      const cargoRaw = norm(row[headerMap['CARGO']] || '');
      const cargoK = key(cargoRaw);
      const cargo = aliasCargo[cargoK] || (cargoK ? cap(cargoRaw) : '');
      const localEnsaio = norm(row[headerMap['LOCAL_ENSAIO']] || '') || '(Sem local definido)';
      
      // Testa especificamente para "secretário/secretária da música"
      const cargoLower = cargo ? cargo.toLowerCase() : '';
      const cargoRawLower = cargoRaw ? cargoRaw.toLowerCase() : '';
      
      if (cargoLower.includes('secretário') || cargoLower.includes('secretaria') || 
          cargoRawLower.includes('secretário') || cargoRawLower.includes('secretaria')) {
        const cargoFormatado = formatarTexto(cargoRaw);
        
        const mapeamentoCargos = {
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
          'secretario do gem': 'Secretário da Música'
        };
        
        const cargoMapeado = mapeamentoCargos[cargoFormatado.toLowerCase()];
        
        secretariosEncontrados.push({
          linha: i + 2,
          nome,
          cargoRaw,
          cargo,
          cargoFormatado,
          cargoMapeado,
          localEnsaio,
          isLocalCorreto: localEnsaio.toLowerCase() === localEscolhido.toLowerCase()
        });
        
        console.log(`✅ Secretário/Secretária encontrado na linha ${i + 2}: ${nome} - "${cargoRaw}" -> "${cargo}" -> "${cargoFormatado}" -> "${cargoMapeado}" - ${localEnsaio}`);
      }
    }

    const secretariosDoLocal = secretariosEncontrados.filter(s => s.isLocalCorreto);

    const mensagem = `Resultado do teste para ${localEscolhido}:\n\n` +
      `📊 Total de linhas processadas: ${totalLinhas}\n` +
      `📝 Total de Secretários/Secretárias encontrados: ${secretariosEncontrados.length}\n` +
      `📍 Secretários/Secretárias do local ${localEscolhido}: ${secretariosDoLocal.length}\n\n` +
      `📋 Lista completa de Secretários/Secretárias:\n` +
      secretariosEncontrados.map(s => 
        `• ${s.nome}: "${s.cargoRaw}" -> "${s.cargo}" -> "${s.cargoFormatado}" -> "${s.cargoMapeado}" - ${s.localEnsaio} ${s.isLocalCorreto ? '✅' : '❌'}`
      ).join('\n');
    
    ui.alert('🔍 Teste de Secretário/Secretária da Música', mensagem, ui.ButtonSet.OK);

  } catch (error) {
    console.error('❌ Erro no teste de Secretário/Secretária da Música:', error);
    const ui = SpreadsheetApp.getUi();
    ui.alert('❌ Erro no Teste', `Erro: ${error.message}`, ui.ButtonSet.OK);
  }
}

// Função para testar todas as variações de Secretário da Música
function testarTodasVariacoesSecretario() {
  try {
    console.log('🔍 Testando todas as variações de Secretário da Música...');
    
    const variacoesTeste = [
      'Secretário da Música',
      'secretário da música',
      'SECRETÁRIO DA MÚSICA',
      'Secretarios da Música',
      'secretarios da música',
      'Secretario da Musica',
      'secretario da musica',
      'SECRETARIO DA MUSICA',
      'Secretário do GEM',
      'secretário do gem',
      'SECRETÁRIO DO GEM',
      'Secretarios do GEM',
      'secretarios do gem',
      'Secretario do Gem',
      'secretario do gem',
      'SECRETARIO DO GEM',
      'Secretária da Música',
      'secretária da música',
      'SECRETÁRIA DA MÚSICA',
      'Secretarias da Música',
      'secretarias da música',
      'Secretaria da Musica',
      'secretaria da musica',
      'SECRETARIA DA MUSICA'
    ];
    
    const mapeamentoCargos = {
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
      'secretario do gem': 'Secretário da Música'
    };
    
    const listaCompletaCargosMinisteriais = [
      'Ancião', 'Diácono', 'Cooperador do Ofício', 'Cooperador de Jovens',
      'Encarregado Regional', 'Encarregado Local', 'Examinadora',
      'Secretária da Música', 'Secretário da Música', 'Instrutor', 'Instrutora'
    ];
    
    let resultados = [];
    
    variacoesTeste.forEach(variacao => {
      const cargoFormatado = formatarTexto(variacao);
      const cargoMapeado = mapeamentoCargos[cargoFormatado.toLowerCase()];
      const isMinisterial = listaCompletaCargosMinisteriais.includes(cargoMapeado);
      
      resultados.push({
        original: variacao,
        formatado: cargoFormatado,
        mapeado: cargoMapeado,
        isMinisterial: isMinisterial
      });
      
      console.log(`🧪 "${variacao}" -> "${cargoFormatado}" -> "${cargoMapeado}" (Ministerial: ${isMinisterial})`);
    });
    
    const ui = SpreadsheetApp.getUi();
    const mensagem = `Resultado do teste de todas as variações:\n\n` +
      resultados.map(r => 
        `"${r.original}" -> "${r.formatado}" -> "${r.mapeado}" (Ministerial: ${r.isMinisterial})`
      ).join('\n');
    
    ui.alert('🔍 Teste de Todas as Variações de Secretário da Música', mensagem, ui.ButtonSet.OK);

  } catch (error) {
    console.error('❌ Erro no teste de variações:', error);
    const ui = SpreadsheetApp.getUi();
    ui.alert('❌ Erro no Teste', `Erro: ${error.message}`, ui.ButtonSet.OK);
  }
}

// Função para testar se Secretários estão sendo registrados corretamente
function testarRegistroSecretarios() {
  try {
    console.log('🔍 Testando se Secretários estão sendo registrados corretamente...');
    
    const ui = SpreadsheetApp.getUi();
    const resultadoLocais = listarLocaisEnsaio();
    if (!resultadoLocais || !resultadoLocais.ok || !resultadoLocais.locais || resultadoLocais.locais.length === 0) {
      ui.alert('❌ Nenhum local de ensaio encontrado nos dados.');
      return;
    }
    
    const locais = resultadoLocais.locais;
    const opcoes = locais.map((local, index) => `${index + 1}. ${local}`).join('\n');
    const prompt = `Escolha o local de ensaio para testar:\n\n${opcoes}\n\nDigite o número da opção:`;
    const resposta = ui.prompt('🔍 Testar Registro de Secretários', prompt, ui.ButtonSet.OK_CANCEL);
    
    if (resposta.getSelectedButton() !== ui.Button.OK) {
      ui.alert('❌ Operação cancelada pelo usuário.');
      return;
    }
    
    const escolha = parseInt(resposta.getResponseText().trim());
    if (isNaN(escolha) || escolha < 1 || escolha > locais.length) {
      ui.alert('❌ Opção inválida. Por favor, digite um número válido.');
      return;
    }
    
    const localEscolhido = locais[escolha - 1];
    
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
      if (h) headerMap[h.toString().trim()] = i; 
    });

    const linhasLocal = [];
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const nome = norm(row[headerMap['NOME COMPLETO']] || '');
      if (!nome) continue;

      const localEnsaioRow = norm(row[headerMap['LOCAL_ENSAIO']] || '') || '(Sem local definido)';
      if (localEnsaioRow.toLowerCase() !== localEscolhido.toLowerCase()) continue;
      
      const cargoRaw = norm(row[headerMap['CARGO']] || '');
      const cargoK = key(cargoRaw);
      const cargo = aliasCargo[cargoK] || (cargoK ? cap(cargoRaw) : '');
      
      linhasLocal.push({
        nome, cargo, cargoRaw, local_ensaio: localEnsaioRow, _ord: i
      });
    }

    const listaCompletaCargosMinisteriais = [
      'Ancião', 'Diácono', 'Cooperador do Ofício', 'Cooperador de Jovens',
      'Encarregado Regional', 'Encarregado Local', 'Examinadora',
      'Secretária da Música', 'Secretário da Música', 'Instrutor', 'Instrutora'
    ];

    const contadores = {};
    listaCompletaCargosMinisteriais.forEach(cargo => {
      contadores[cargo] = 0;
    });

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
      'instrutoras': 'Instrutora'
    };

    let detalhes = [];

    linhasLocal.forEach(x => {
      if (!estevePresente(x)) return;
      
      if (x.cargo) {
        const cargoOriginal = x.cargo;
        const cargoFormatado = formatarTexto(cargoOriginal);
        const cargoMapeado = mapeamentoCargos[cargoFormatado.toLowerCase()];
        
        if (cargoMapeado && listaCompletaCargosMinisteriais.includes(cargoMapeado)) {
          contadores[cargoMapeado]++;
          detalhes.push({
            nome: x.nome,
            cargoOriginal: x.cargoRaw,
            cargoProcessado: cargoOriginal,
            cargoFormatado: cargoFormatado,
            cargoMapeado: cargoMapeado
          });
          console.log(`👔 Cargo ministerial contado: ${x.cargoRaw} -> ${cargoOriginal} -> ${cargoFormatado} -> ${cargoMapeado} - ${x.nome}`);
        }
      }
    });

    const mensagem = `Resultado do teste de registro para ${localEscolhido}:\n\n` +
      `📊 Total de membros: ${linhasLocal.length}\n\n` +
      `👔 Cargos Ministeriais Encontrados:\n` +
      listaCompletaCargosMinisteriais.map(cargo => 
        `• ${cargo}: ${contadores[cargo]}`
      ).join('\n') +
      `\n\n📋 Detalhes dos Cargos Encontrados:\n` +
      detalhes.map(d => 
        `• ${d.nome}: "${d.cargoOriginal}" -> "${d.cargoProcessado}" -> "${d.cargoFormatado}" -> "${d.cargoMapeado}"`
      ).join('\n');
    
    ui.alert('🔍 Teste de Registro de Secretários', mensagem, ui.ButtonSet.OK);

  } catch (error) {
    console.error('❌ Erro no teste de registro:', error);
    const ui = SpreadsheetApp.getUi();
    ui.alert('❌ Erro no Teste', `Erro: ${error.message}`, ui.ButtonSet.OK);
  }
}

// Função para diagnóstico completo de Secretários em Vargem Grande
function diagnosticarSecretariosVargemGrande() {
  try {
    console.log('🔍 Diagnóstico completo de Secretários em Vargem Grande...');
    
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
      if (h) headerMap[h.toString().trim()] = i; 
    });

    console.log('📋 Headers encontrados:', Object.keys(headerMap));

    let todosSecretarios = [];
    let secretariosVargemGrande = [];
    let totalLinhas = 0;

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const nome = norm(row[headerMap['NOME COMPLETO']] || '');
      if (!nome) continue;
      
      totalLinhas++;
      
      const cargoRaw = norm(row[headerMap['CARGO']] || '');
      const localEnsaio = norm(row[headerMap['LOCAL_ENSAIO']] || '') || '(Sem local definido)';
      
      // Busca por qualquer variação de secretário
      const cargoLower = cargoRaw ? cargoRaw.toLowerCase() : '';
      
      if (cargoLower.includes('secretário') || cargoLower.includes('secretaria') || 
          cargoLower.includes('secretario') || cargoLower.includes('secret')) {
        
        const cargoK = key(cargoRaw);
        const cargo = aliasCargo[cargoK] || (cargoK ? cap(cargoRaw) : '');
        const cargoFormatado = formatarTexto(cargoRaw);
        
        const mapeamentoCargos = {
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
          'secretario do gem': 'Secretário da Música'
        };
        
        const cargoMapeado = mapeamentoCargos[cargoFormatado.toLowerCase()];
        
        const secretarioInfo = {
          linha: i + 2,
          nome,
          cargoRaw,
          cargo,
          cargoFormatado,
          cargoMapeado,
          localEnsaio,
          isVargemGrande: localEnsaio.toLowerCase().includes('vargem') || localEnsaio.toLowerCase().includes('grande'),
          presente: estevePresente({ nome, cargo, cargoRaw, local_ensaio: localEnsaio, _ord: i })
        };
        
        todosSecretarios.push(secretarioInfo);
        
        if (secretarioInfo.isVargemGrande) {
          secretariosVargemGrande.push(secretarioInfo);
        }
        
        console.log(`🔍 Secretário encontrado na linha ${i + 2}: ${nome} - "${cargoRaw}" -> "${cargo}" -> "${cargoFormatado}" -> "${cargoMapeado}" - ${localEnsaio} - Presente: ${secretarioInfo.presente}`);
      }
    }

    // Agora vamos testar a contagem como no código real
    const linhasLocal = [];
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const nome = norm(row[headerMap['NOME COMPLETO']] || '');
      if (!nome) continue;

      const localEnsaioRow = norm(row[headerMap['LOCAL_ENSAIO']] || '') || '(Sem local definido)';
      if (!localEnsaioRow.toLowerCase().includes('vargem') && !localEnsaioRow.toLowerCase().includes('grande')) continue;
      
      const cargoRaw = norm(row[headerMap['CARGO']] || '');
      const cargoK = key(cargoRaw);
      const cargo = aliasCargo[cargoK] || (cargoK ? cap(cargoRaw) : '');
      
      linhasLocal.push({
        nome, cargo, cargoRaw, local_ensaio: localEnsaioRow, _ord: i
      });
    }

    const listaCompletaCargosMinisteriais = [
      'Ancião', 'Diácono', 'Cooperador do Ofício', 'Cooperador de Jovens',
      'Encarregado Regional', 'Encarregado Local', 'Examinadora',
      'Secretária da Música', 'Secretário da Música', 'Instrutor', 'Instrutora'
    ];

    const contadores = {};
    listaCompletaCargosMinisteriais.forEach(cargo => {
      contadores[cargo] = 0;
    });

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
      'instrutoras': 'Instrutora'
    };

    let detalhesContagem = [];

    linhasLocal.forEach(x => {
      if (!estevePresente(x)) {
        console.log(`❌ ${x.nome} não esteve presente`);
        return;
      }
      
      console.log(`✅ ${x.nome} esteve presente`);
      
      if (x.cargo) {
        const cargoOriginal = x.cargo;
        const cargoFormatado = formatarTexto(cargoOriginal);
        const cargoMapeado = mapeamentoCargos[cargoFormatado.toLowerCase()];
        
        console.log(`🔍 Processando cargo: "${x.cargoRaw}" -> "${cargoOriginal}" -> "${cargoFormatado}" -> "${cargoMapeado}"`);
        
        if (cargoMapeado && listaCompletaCargosMinisteriais.includes(cargoMapeado)) {
          contadores[cargoMapeado]++;
          detalhesContagem.push({
            nome: x.nome,
            cargoOriginal: x.cargoRaw,
            cargoProcessado: cargoOriginal,
            cargoFormatado: cargoFormatado,
            cargoMapeado: cargoMapeado
          });
          console.log(`✅ Cargo ministerial contado: ${cargoMapeado} - ${x.nome}`);
        } else {
          console.log(`❌ Cargo não mapeado ou não ministerial: "${cargoMapeado}"`);
        }
      } else {
        console.log(`❌ ${x.nome} não tem cargo`);
      }
    });

    const ui = SpreadsheetApp.getUi();
    const mensagem = `Diagnóstico completo para Vargem Grande:\n\n` +
      `📊 Total de linhas processadas: ${totalLinhas}\n` +
      `📝 Total de Secretários encontrados: ${todosSecretarios.length}\n` +
      `📍 Secretários de Vargem Grande: ${secretariosVargemGrande.length}\n` +
      `👥 Membros de Vargem Grande: ${linhasLocal.length}\n\n` +
      `📋 Secretários de Vargem Grande:\n` +
      secretariosVargemGrande.map(s => 
        `• ${s.nome}: "${s.cargoRaw}" -> "${s.cargo}" -> "${s.cargoFormatado}" -> "${s.cargoMapeado}" - Presente: ${s.presente}`
      ).join('\n') +
      `\n\n👔 Contadores Ministeriais:\n` +
      listaCompletaCargosMinisteriais.map(cargo => 
        `• ${cargo}: ${contadores[cargo]}`
      ).join('\n') +
      `\n\n📋 Detalhes da Contagem:\n` +
      detalhesContagem.map(d => 
        `• ${d.nome}: "${d.cargoOriginal}" -> "${d.cargoProcessado}" -> "${d.cargoFormatado}" -> "${d.cargoMapeado}"`
      ).join('\n');
    
    ui.alert('🔍 Diagnóstico Completo de Secretários - Vargem Grande', mensagem, ui.ButtonSet.OK);

  } catch (error) {
    console.error('❌ Erro no diagnóstico:', error);
    const ui = SpreadsheetApp.getUi();
    ui.alert('❌ Erro no Diagnóstico', `Erro: ${error.message}`, ui.ButtonSet.OK);
  }
}

// Função para testar busca de rótulos específicos na aba Resumo
function testarBuscaRotulosSecretario() {
  try {
    console.log('🔍 Testando busca de rótulos de Secretário na aba Resumo...');
    
    const ui = SpreadsheetApp.getUi();
    const resultadoLocais = listarLocaisEnsaio();
    if (!resultadoLocais || !resultadoLocais.ok || !resultadoLocais.locais || resultadoLocais.locais.length === 0) {
      ui.alert('❌ Nenhum local de ensaio encontrado nos dados.');
      return;
    }
    
    const locais = resultadoLocais.locais;
    const opcoes = locais.map((local, index) => `${index + 1}. ${local}`).join('\n');
    const prompt = `Escolha o local de ensaio para testar:\n\n${opcoes}\n\nDigite o número da opção:`;
    const resposta = ui.prompt('🔍 Testar Busca de Rótulos de Secretário', prompt, ui.ButtonSet.OK_CANCEL);
    
    if (resposta.getSelectedButton() !== ui.Button.OK) {
      ui.alert('❌ Operação cancelada pelo usuário.');
      return;
    }
    
    const escolha = parseInt(resposta.getResponseText().trim());
    if (isNaN(escolha) || escolha < 1 || escolha > locais.length) {
      ui.alert('❌ Opção inválida. Por favor, digite um número válido.');
      return;
    }
    
    const localEscolhido = locais[escolha - 1];
    
    // Determina qual planilha externa usar
    let ssExterna;
    if (localEscolhido.toLowerCase().includes('cotia')) {
      ssExterna = openCotiaSheet();
    } else if (localEscolhido.toLowerCase().includes('itapevi')) {
      ssExterna = openItapeviSheet();
    } else if (localEscolhido.toLowerCase().includes('caucaia')) {
      ssExterna = openCaucaiaSheet();
    } else if (localEscolhido.toLowerCase().includes('jandira')) {
      ssExterna = openJandiraSheet();
    } else if (localEscolhido.toLowerCase().includes('fazendinha')) {
      ssExterna = openFazendinhaSheet();
    } else if (localEscolhido.toLowerCase().includes('pirapora')) {
      ssExterna = openPiraporaSheet();
    } else if (localEscolhido.toLowerCase().includes('vargem') || localEscolhido.toLowerCase().includes('grande')) {
      ssExterna = openVargemGrandeSheet();
    } else {
      ui.alert('❌ Local não reconhecido para teste de planilha externa.');
      return;
    }
    
    const shResumo = ssExterna.getSheetByName('Resumo');
    if (!shResumo) {
      ui.alert('❌ Aba "Resumo" não encontrada na planilha externa.');
      return;
    }
    
    // Lista de rótulos para testar
    const rotulosParaTestar = [
      'Secretário da Música',
      'Secretários da Música',
      'Secretária da Música',
      'Secretárias da Música',
      'Secretario da Musica',
      'Secretarios da Musica',
      'Secretaria da Musica',
      'Secretarias da Musica'
    ];
    
    let resultados = [];
    
    rotulosParaTestar.forEach(rotulo => {
      const tf = shResumo.createTextFinder(rotulo).matchEntireCell(true);
      const matches = tf.findAll();
      
      resultados.push({
        rotulo: rotulo,
        encontrado: matches.length > 0,
        quantidade: matches.length,
        detalhes: matches.map(m => `Linha ${m.getRow()}, Coluna ${m.getColumn()}, Valor: "${m.getValue()}"`)
      });
      
      console.log(`🔍 Rótulo "${rotulo}": ${matches.length} matches encontrados`);
    });
    
    const mensagem = `Resultado da busca de rótulos na aba Resumo de ${localEscolhido}:\n\n` +
      resultados.map(r => 
        `• "${r.rotulo}": ${r.encontrado ? '✅ Encontrado' : '❌ Não encontrado'} (${r.quantidade} matches)\n` +
        (r.detalhes.length > 0 ? `  ${r.detalhes.join('\n  ')}\n` : '')
      ).join('\n');
    
    ui.alert('🔍 Teste de Busca de Rótulos de Secretário', mensagem, ui.ButtonSet.OK);

  } catch (error) {
    console.error('❌ Erro no teste de busca de rótulos:', error);
    const ui = SpreadsheetApp.getUi();
    ui.alert('❌ Erro no Teste', `Erro: ${error.message}`, ui.ButtonSet.OK);
  }
}

// Função para testar o processo completo de exportação
function testarProcessoCompletoExportacao() {
  try {
    console.log('🔍 Testando processo completo de exportação...');
    
    const ui = SpreadsheetApp.getUi();
    const resultadoLocais = listarLocaisEnsaio();
    if (!resultadoLocais || !resultadoLocais.ok || !resultadoLocais.locais || resultadoLocais.locais.length === 0) {
      ui.alert('❌ Nenhum local de ensaio encontrado nos dados.');
      return;
    }
    
    const locais = resultadoLocais.locais;
    const opcoes = locais.map((local, index) => `${index + 1}. ${local}`).join('\n');
    const prompt = `Escolha o local de ensaio para testar:\n\n${opcoes}\n\nDigite o número da opção:`;
    const resposta = ui.prompt('🔍 Testar Processo Completo de Exportação', prompt, ui.ButtonSet.OK_CANCEL);
    
    if (resposta.getSelectedButton() !== ui.Button.OK) {
      ui.alert('❌ Operação cancelada pelo usuário.');
      return;
    }
    
    const escolha = parseInt(resposta.getResponseText().trim());
    if (isNaN(escolha) || escolha < 1 || escolha > locais.length) {
      ui.alert('❌ Opção inválida. Por favor, digite um número válido.');
      return;
    }
    
    const localEscolhido = locais[escolha - 1];
    
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
      if (h) headerMap[h.toString().trim()] = i; 
    });

    // Filtra dados do local escolhido
    const linhasLocal = [];
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const nome = norm(row[headerMap['NOME COMPLETO']] || '');
      if (!nome) continue;

      const localEnsaioRow = norm(row[headerMap['LOCAL_ENSAIO']] || '') || '(Sem local definido)';
      if (localEnsaioRow.toLowerCase() !== localEscolhido.toLowerCase()) continue;
      
      const cargoRaw = norm(row[headerMap['CARGO']] || '');
      const cargoK = key(cargoRaw);
      const cargo = aliasCargo[cargoK] || (cargoK ? cap(cargoRaw) : '');
      
      linhasLocal.push({
        nome, cargo, cargoRaw, local_ensaio: localEnsaioRow, _ord: i
      });
    }

    // Simula o processo de contagem exatamente como no código real
    const listaCompletaCargosMinisteriais = [
      'Ancião', 'Diácono', 'Cooperador do Ofício', 'Cooperador de Jovens',
      'Encarregado Regional', 'Encarregado Local', 'Examinadora',
      'Secretária da Música', 'Secretário da Música', 'Instrutor', 'Instrutora'
    ];

    const contadores = {};
    listaCompletaCargosMinisteriais.forEach(cargo => {
      contadores[cargo] = 0;
    });

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
      'instrutoras': 'Instrutora'
    };

    let detalhesContagem = [];

    linhasLocal.forEach(x => {
      if (!estevePresente(x)) {
        console.log(`❌ ${x.nome} não esteve presente`);
        return;
      }
      
      console.log(`✅ ${x.nome} esteve presente`);
      
      if (x.cargo) {
        const cargoOriginal = x.cargo;
        const cargoFormatado = formatarTexto(cargoOriginal);
        const cargoMapeado = mapeamentoCargos[cargoFormatado.toLowerCase()];
        
        console.log(`🔍 Processando cargo: "${x.cargoRaw}" -> "${cargoOriginal}" -> "${cargoFormatado}" -> "${cargoMapeado}"`);
        
        if (cargoMapeado && listaCompletaCargosMinisteriais.includes(cargoMapeado)) {
          contadores[cargoMapeado]++;
          detalhesContagem.push({
            nome: x.nome,
            cargoOriginal: x.cargoRaw,
            cargoProcessado: cargoOriginal,
            cargoFormatado: cargoFormatado,
            cargoMapeado: cargoMapeado
          });
          console.log(`✅ Cargo ministerial contado: ${cargoMapeado} - ${x.nome}`);
        } else {
          console.log(`❌ Cargo não mapeado ou não ministerial: "${cargoMapeado}"`);
        }
      } else {
        console.log(`❌ ${x.nome} não tem cargo`);
      }
    });

    // Simula o processo de atualização da aba Resumo
    const CARGO_MIN_ORD = [
      'Ancião', 'Diácono', 'Cooperador do Ofício', 'Cooperador de Jovens',
      'Encarregado Regional', 'Encarregado Local', 'Examinadora',
      'Secretária da Música', 'Secretário da Música', 'Instrutor', 'Instrutora'
    ];

    const MIN_LABEL_SYNONYMS = {
      'Ancião': ['Ancião','Anciao'],
      'Diácono': ['Diácono','Diacono'],
      'Cooperador do Ofício': ['Cooperador do Ofício','Cooperador do Oficio'],
      'Cooperador de Jovens': ['Cooperador de Jovens'],
      'Encarregado Regional': ['Encarregado Regional'],
      'Encarregado Local': ['Encarregado Local'],
      'Examinadora': ['Examinadora'],
      'Secretária da Música': ['Secretária da Música','Secretarias da Música','Secretaria da Música'],
      'Secretário da Música': ['Secretário da Música','Secretarios da Música','Secretario da Música'],
      'Instrutor': ['Instrutores','Instrutor'],
      'Instrutora': ['Instrutoras','Instrutora']
    };

    let simulacaoAtualizacao = [];

    CARGO_MIN_ORD.forEach(canonical => {
      const val = contadores[canonical] || 0;
      const rLabels = MIN_LABEL_SYNONYMS[canonical] || [canonical];
      
      simulacaoAtualizacao.push({
        cargoCanonico: canonical,
        valor: val,
        rotulosParaAtualizar: rLabels
      });
      
      console.log(`📊 Simulando atualização: ${canonical} = ${val} -> rótulos: ${rLabels.join(', ')}`);
    });

    const mensagem = `Resultado do teste de processo completo para ${localEscolhido}:\n\n` +
      `📊 Total de membros: ${linhasLocal.length}\n\n` +
      `👔 Contadores Ministeriais:\n` +
      listaCompletaCargosMinisteriais.map(cargo => 
        `• ${cargo}: ${contadores[cargo]}`
      ).join('\n') +
      `\n\n📋 Detalhes da Contagem:\n` +
      detalhesContagem.map(d => 
        `• ${d.nome}: "${d.cargoOriginal}" -> "${d.cargoProcessado}" -> "${d.cargoFormatado}" -> "${d.cargoMapeado}"`
      ).join('\n') +
      `\n\n🔄 Simulação de Atualização da Aba Resumo:\n` +
      simulacaoAtualizacao.map(s => 
        `• ${s.cargoCanonico}: ${s.valor} -> [${s.rotulosParaAtualizar.join(', ')}]`
      ).join('\n');
    
    ui.alert('🔍 Teste de Processo Completo de Exportação', mensagem, ui.ButtonSet.OK);

  } catch (error) {
    console.error('❌ Erro no teste de processo completo:', error);
    const ui = SpreadsheetApp.getUi();
    ui.alert('❌ Erro no Teste', `Erro: ${error.message}`, ui.ButtonSet.OK);
  }
}

// Função para testar contagem de Examinadora
function testarContagemExaminadora() {
  try {
    console.log('🔍 Testando contagem de Examinadora...');
    
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

    console.log('📋 Headers encontrados:', headerRow);
    console.log('🗂️ Mapeamento de headers:', headerMap);

    let examinadorasEncontradas = [];
    let totalLinhas = 0;

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const nome = norm(row[headerMap['NOME COMPLETO']] || '');
      if (!nome) continue;
      
      totalLinhas++;
      
      const cargoRaw = norm(row[headerMap['CARGO']] || '');
      const cargoK = key(cargoRaw);
      const cargo = aliasCargo[cargoK] || (cargoK ? cap(cargoRaw) : '');
      const localEnsaio = norm(row[headerMap['LOCAL_ENSAIO']] || '') || '(Sem local definido)';
      
      console.log(`📝 Linha ${i + 2}: Nome: "${nome}", Cargo Raw: "${cargoRaw}", Cargo Processado: "${cargo}", Local: "${localEnsaio}"`);
      
      // Testa diferentes formas de detectar examinadora
      const cargoLower = cargo ? cargo.toLowerCase() : '';
      const cargoRawLower = cargoRaw ? cargoRaw.toLowerCase() : '';
      
      if (cargoLower.includes('examinadora') || cargoRawLower.includes('examinadora')) {
        examinadorasEncontradas.push({
          linha: i + 2,
          nome,
          cargoRaw,
          cargo,
          localEnsaio
        });
        console.log(`✅ Examinadora encontrada na linha ${i + 2}: ${nome} (${cargo}) - ${localEnsaio}`);
      }
    }

    console.log(`📊 Total de linhas processadas: ${totalLinhas}`);
    console.log(`👩‍🏫 Total de Examinadoras encontradas: ${examinadorasEncontradas.length}`);
    console.log(`📋 Lista de Examinadoras:`, examinadorasEncontradas);

    // Testa o mapeamento
    const cargoTeste = 'Examinadora';
    const cargoFormatado = formatarTexto(cargoTeste);
    console.log(`🧪 Teste de formatação: "${cargoTeste}" -> "${cargoFormatado}"`);
    
    const mapeamentoCargos = {
      'examinadora': 'Examinadora'
    };
    
    const cargoMapeado = mapeamentoCargos[cargoFormatado.toLowerCase()];
    console.log(`🗺️ Teste de mapeamento: "${cargoFormatado.toLowerCase()}" -> "${cargoMapeado}"`);

    const ui = SpreadsheetApp.getUi();
    ui.alert('🔍 Teste de Examinadora', 
      `Resultado do teste:\n\n` +
      `📊 Total de linhas: ${totalLinhas}\n` +
      `👩‍🏫 Examinadoras encontradas: ${examinadorasEncontradas.length}\n\n` +
      `Lista:\n${examinadorasEncontradas.map(e => `• ${e.nome} (${e.cargo}) - ${e.localEnsaio}`).join('\n')}`, 
      ui.ButtonSet.OK);

  } catch (error) {
    console.error('❌ Erro no teste de Examinadora:', error);
    const ui = SpreadsheetApp.getUi();
    ui.alert('❌ Erro no Teste', `Erro: ${error.message}`, ui.ButtonSet.OK);
  }
}

// Função para criar menu personalizado
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('🔄 Atualizar Dados')
    .addItem('🚀 Atualização Completa do Sistema', 'atualizarSistemaCompleto')
    .addSeparator()
    .addItem('📤 Exportar para Planilha de Cotia', 'executarExportarCotia')
    .addItem('📤 Exportar para Planilha de Itapevi', 'executarExportarItapevi')
    .addItem('📤 Exportar para Planilha de Caucaia', 'executarExportarCaucaia')
    .addItem('📤 Exportar para Planilha de Jandira', 'executarExportarJandira')
    .addItem('📤 Exportar para Planilha de Fazendinha', 'executarExportarFazendinha')
    .addItem('📤 Exportar para Planilha de Pirapora', 'executarExportarPirapora')
    .addItem('📤 Exportar para Planilha de VargemGrande', 'executarExportarVargemGrande')
    .addSeparator()
    .addItem('🔍 Testar Mapeamento de Cargos', 'testarMapeamentoCargos')
    .addItem('🔍 Testar Contagem de Examinadora', 'testarContagemExaminadora')
    .addItem('🔍 Testar Examinadora de Organistas', 'testarExaminadoraDeOrganistas')
    .addItem('🔍 Testar Secretário/Secretária da Música', 'testarSecretarioDaMusica')
    .addItem('🔍 Testar Todas as Variações de Secretário', 'testarTodasVariacoesSecretario')
    .addItem('🔍 Testar Registro de Secretários', 'testarRegistroSecretarios')
    .addItem('🔍 Diagnóstico Completo - Vargem Grande', 'diagnosticarSecretariosVargemGrande')
    .addItem('🔍 Testar Busca de Rótulos de Secretário', 'testarBuscaRotulosSecretario')
    .addItem('🔍 Testar Processo Completo de Exportação', 'testarProcessoCompletoExportacao')
    .addItem('🔍 Testar Contagem Completa de Cargos', 'testarContagemCompletaCargos')
    .addItem('🔍 Testar Atualização da Aba Resumo', 'testarAtualizacaoResumo')
    .addItem('🔍 Testar Busca de Rótulos na Aba Resumo', 'testarBuscaRotulosResumo')
    .addToUi();
}

// Função para listar locais de ensaio
function listarLocaisEnsaio() {
  try {
    console.log('🏛️ Listando locais de ensaio disponíveis...');
    
    const shDados = openOrCreateSheet(SHEET_NAME);
    const lastRow = shDados.getLastRow();
    const lastCol = shDados.getLastColumn();
    
    if (lastRow < 2) {
    return {
      ok: true,
        locais: [],
        total: 0
      };
    }

    const headerRow = shDados.getRange(1, 1, 1, lastCol).getDisplayValues()[0];
    const data = shDados.getRange(2, 1, lastRow - 1, lastCol).getDisplayValues();

    // Mapeia os índices das colunas
    const headerMap = {};
    headerRow.forEach((h, i) => { 
      if (h) headerMap[h.toString().trim()] = i; 
    });

    // Coleta todos os locais únicos
    const locaisSet = new Set();
    const locaisComContagem = {};

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const nome = norm(row[headerMap['NOME COMPLETO']] || '');
      if (!nome) continue;

      const comum = norm(row[headerMap['COMUM']] || '') || '(Sem comum)';
      const cidade = norm(row[headerMap['CIDADE']] || '') || '(Sem cidade)';
      const localEnsaio = norm(row[headerMap['LOCAL_ENSAIO']] || '') || '(Sem local definido)';
      
      const cargoRaw = norm(row[headerMap['CARGO']] || '');
      const cargoK = key(cargoRaw);
      const cargo = aliasCargo[cargoK] || (cargoK ? cap(cargoRaw) : '');
      
      const instrumento = norm(row[headerMap['INSTRUMENTO']] || '');
      const vaiTocar = norm(row[headerMap['VAI_TOCAR']] || '');
      const nivel = norm(row[headerMap['CLASSE_ORGANISTA']] || '');

      const linha = {
        nome, comum, cidade, cargo, instrumento, vai_tocar: vaiTocar, nivel, local_ensaio: localEnsaio, _ord: i
      };

      if (estevePresente(linha)) {
        locaisSet.add(localEnsaio);
        if (!locaisComContagem[localEnsaio]) {
          locaisComContagem[localEnsaio] = 0;
        }
        locaisComContagem[localEnsaio]++;
      }
    }

    const locais = Array.from(locaisSet).sort((a, b) => a.localeCompare(b, 'pt-BR'));
    
    console.log(`📊 Encontrados ${locais.length} locais de ensaio:`, locais);
    
    return {
      ok: true,
      locais: locais,
      contagem: locaisComContagem,
      total: locais.length
    };

  } catch (error) {
    console.error('❌ Erro ao listar locais de ensaio:', error);
    throw error;
  }
}


// Função para alimentar aba Organistas na planilha externa de Itapevi
function alimentarAbaOrganistasItapevi(localEnsaio = 'Itapevi') {
  try {
    console.log(`🏛️ Iniciando alimentação da aba Organistas na planilha externa de Itapevi para: ${localEnsaio}`);
    
    const shDados = openOrCreateSheet(SHEET_NAME);
    const lastRow = shDados.getLastRow();
    const lastCol = shDados.getLastColumn();
    
    if (lastRow < 2) {
      throw new Error('Não há dados abaixo do cabeçalho em "Dados".');
    }

    const headerRow = shDados.getRange(1, 1, 1, lastCol).getDisplayValues()[0];
    const data = shDados.getRange(2, 1, lastRow - 1, lastCol).getDisplayValues();

    // Busca flexível pelos headers
    const idxNome = headerRow.findIndex(h => h && h.toString().toLowerCase().includes('nome'));
    const idxCargo = headerRow.findIndex(h => h && h.toString().toLowerCase().includes('cargo'));
    const idxNivel = headerRow.findIndex(h => h && h.toString().toLowerCase().includes('nivel') || h.toString().toLowerCase().includes('classe'));
    const idxComum = headerRow.findIndex(h => h && h.toString().toLowerCase().includes('comum'));
    const idxCidade = headerRow.findIndex(h => h && (
      h.toString().toLowerCase().includes('cidade') || 
      h.toString().toLowerCase().includes('municipio') || 
      h.toString().toLowerCase().includes('município') ||
      h.toString().toLowerCase().includes('localidade')
    ));
    const idxLocalEnsaio = headerRow.findIndex(h => h && h.toString().toLowerCase().includes('local_ensaio'));

    if (idxNome < 0 || idxCargo < 0) {
      throw new Error('Colunas "nome" ou "cargo" não encontradas');
    }

    // Filtra dados para organistas, examinadoras, instrutoras e secretárias da música do local especificado
    const organistas = [];
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const nome = norm(row[idxNome] || '');
      if (!nome) continue;

      const cargo = norm(row[idxCargo] || '');
      const nivel = norm(row[idxNivel] || '');
      const comum = norm(row[idxComum] || '') || '(Sem comum)';
      const cidade = norm(row[idxCidade] || '') || localEnsaio;
      const localEnsaioRow = norm(row[idxLocalEnsaio] || '') || '(Sem local definido)';
      
      const cargoLower = cargo.toLowerCase();
      const isOrganista = cargoLower.includes('organista') || 
                         cargoLower.includes('examinadora') || 
                         cargoLower.includes('instrutora') ||
                         cargoLower.includes('secretária da música') ||
                         cargoLower.includes('secretario da musica');
      
      const isLocalCorreto = localEnsaioRow.toLowerCase() === localEnsaio.toLowerCase();
      
      if (isOrganista && isLocalCorreto) {
        organistas.push({
          nome,
          cargo,
          nivel,
          comum,
          cidade,
          localEnsaio: localEnsaioRow,
          _ord: i
        });
        console.log(`🎹 Organista encontrada: ${nome} (${cargo}) - ${localEnsaioRow}`);
      }
    }

    console.log(`📊 Encontradas ${organistas.length} organistas para o local: ${localEnsaio}`);

    // Acessa a planilha externa de Itapevi
    const ssItapevi = openItapeviSheet();
    
    // Cria ou limpa a aba Organistas
    let shOrganistas = ssItapevi.getSheetByName('Organistas');
    if (!shOrganistas) {
      shOrganistas = ssItapevi.insertSheet('Organistas');
      console.log(`✅ Nova aba Organistas criada na planilha externa de Itapevi`);
    } else {
      const ultimaLinha = shOrganistas.getLastRow();
      if (ultimaLinha > 4) {
        shOrganistas.getRange(5, 1, ultimaLinha - 4, shOrganistas.getLastColumn()).clearContent();
        console.log(`✅ Dados limpos na aba Organistas (preservando cabeçalho na linha 4)`);
      }
    }

    // Verifica se existe cabeçalho na linha 4
    const headerExists = shOrganistas.getRange(4, 1, 1, 7).getValues()[0].some(cell => cell && cell.toString().trim());
    
    if (!headerExists) {
      shOrganistas.getRange(4, 1, 1, 7).setValues([[
        'ID', 'Nome', 'Cargo', 'Nível', 'Comum', 'Cidade', 'Tocou no último ensaio?'
      ]]);
      shOrganistas.getRange(4, 1, 1, 7).setFontWeight('bold');
      shOrganistas.getRange(4, 1, 1, 7).setBackground('#e8f0fe');
      console.log(`✅ Cabeçalho criado na linha 4 com 7 colunas (incluindo ID)`);
    } else {
      console.log(`✅ Cabeçalho já existe na linha 4, preservando`);
    }

    // Popula dados a partir da linha 5
    if (organistas.length > 0) {
      const dadosParaInserir = organistas.map((org, index) => [
        index + 1, // ID sequencial
        org.nome,
        org.cargo,
        org.nivel,
        org.comum,
        org.cidade,
        '' // Tocou no último ensaio? (vazio)
      ]);

      shOrganistas.getRange(5, 1, dadosParaInserir.length, 7).setValues(dadosParaInserir);
      console.log(`✅ ${organistas.length} organistas inseridas a partir da linha 5 com IDs sequenciais`);
    }

    // Formatação
    shOrganistas.autoResizeColumns(1, 7);
    shOrganistas.getRange(4, 1, 1, 7).setBorder(true, true, true, true, true, true);
    
    console.log(`✅ Aba Organistas da planilha externa de Itapevi alimentada com sucesso para: ${localEnsaio}`);
    
    return {
      ok: true,
      localEnsaio: localEnsaio,
      abaAtualizada: 'Organistas',
      planilhaId: ITAPEVI_SHEET_ID,
      totalOrganistas: organistas.length,
      organistas: organistas.map(org => org.nome)
    };

  } catch (error) {
    console.error(`❌ Erro ao alimentar aba Organistas da planilha externa de Itapevi para ${localEnsaio}:`, error);
    throw error;
  }
}

// Função para alimentar aba Organistas da planilha de VargemGrande
function alimentarAbaOrganistasVargemGrande(localEnsaio = 'VargemGrande') {
  try {
    console.log(`🏛️ Iniciando alimentação da aba Organistas na planilha externa de VargemGrande para: ${localEnsaio}`);
    
    const shDados = openOrCreateSheet(SHEET_NAME);
    const lastRow = shDados.getLastRow();
    const lastCol = shDados.getLastColumn();
    
    if (lastRow < 2) {
      throw new Error('Não há dados abaixo do cabeçalho em "Dados".');
    }

    const headerRow = shDados.getRange(1, 1, 1, lastCol).getDisplayValues()[0];
    const data = shDados.getRange(2, 1, lastRow - 1, lastCol).getDisplayValues();

    // Busca flexível pelos headers
    const idxNome = headerRow.findIndex(h => h && h.toString().toLowerCase().includes('nome'));
    const idxCargo = headerRow.findIndex(h => h && h.toString().toLowerCase().includes('cargo'));
    const idxNivel = headerRow.findIndex(h => h && h.toString().toLowerCase().includes('nivel') || h.toString().toLowerCase().includes('classe'));
    const idxComum = headerRow.findIndex(h => h && h.toString().toLowerCase().includes('comum'));
    const idxCidade = headerRow.findIndex(h => h && (
      h.toString().toLowerCase().includes('cidade') || 
      h.toString().toLowerCase().includes('municipio') || 
      h.toString().toLowerCase().includes('município') ||
      h.toString().toLowerCase().includes('localidade')
    ));
    const idxLocalEnsaio = headerRow.findIndex(h => h && h.toString().toLowerCase().includes('local_ensaio'));

    if (idxNome < 0 || idxCargo < 0) {
      throw new Error('Colunas "nome" ou "cargo" não encontradas');
    }

    // Filtra dados para organistas, examinadoras, instrutoras e secretárias da música do local especificado
    const organistas = [];
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const nome = norm(row[idxNome] || '');
      if (!nome) continue;

      const cargo = norm(row[idxCargo] || '');
      const nivel = norm(row[idxNivel] || '');
      const comum = norm(row[idxComum] || '') || '(Sem comum)';
      const cidade = norm(row[idxCidade] || '') || localEnsaio;
      const localEnsaioRow = norm(row[idxLocalEnsaio] || '') || '(Sem local definido)';
      
      const cargoLower = cargo.toLowerCase();
      const isOrganista = cargoLower.includes('organista') || 
                         cargoLower.includes('examinadora') || 
                         cargoLower.includes('instrutora') ||
                         cargoLower.includes('secretária da música') ||
                         cargoLower.includes('secretario da musica');
      
      const isLocalCorreto = localEnsaioRow.toLowerCase() === localEnsaio.toLowerCase();
      
      if (isOrganista && isLocalCorreto) {
        organistas.push({
          nome,
          cargo,
          nivel,
          comum,
          cidade,
          localEnsaio: localEnsaioRow,
          _ord: i
        });
        console.log(`🎹 Organista encontrada: ${nome} (${cargo}) - ${localEnsaioRow}`);
      }
    }

    console.log(`📊 Encontradas ${organistas.length} organistas para o local: ${localEnsaio}`);

    // Acessa a planilha externa de VargemGrande
    const ssVargemGrande = openVargemGrandeSheet();
    
    // Cria ou limpa a aba Organistas
    let shOrganistas = ssVargemGrande.getSheetByName('Organistas');
    if (!shOrganistas) {
      shOrganistas = ssVargemGrande.insertSheet('Organistas');
      console.log(`✅ Nova aba Organistas criada na planilha externa de VargemGrande`);
    } else {
      const ultimaLinha = shOrganistas.getLastRow();
      if (ultimaLinha > 4) {
        shOrganistas.getRange(5, 1, ultimaLinha - 4, shOrganistas.getLastColumn()).clearContent();
        console.log(`✅ Dados limpos na aba Organistas (preservando cabeçalho na linha 4)`);
      }
    }

    // Verifica se existe cabeçalho na linha 4
    const headerExists = shOrganistas.getRange(4, 1, 1, 7).getValues()[0].some(cell => cell && cell.toString().trim());
    
    if (!headerExists) {
      shOrganistas.getRange(4, 1, 1, 7).setValues([[
        'ID', 'Nome', 'Cargo', 'Nível', 'Comum', 'Cidade', 'Tocou no último ensaio?'
      ]]);
      shOrganistas.getRange(4, 1, 1, 7).setFontWeight('bold');
      shOrganistas.getRange(4, 1, 1, 7).setBackground('#e8f0fe');
      console.log(`✅ Cabeçalho criado na linha 4 com 7 colunas (incluindo ID)`);
    } else {
      console.log(`✅ Cabeçalho já existe na linha 4, preservando`);
    }

    // Popula dados a partir da linha 5
    if (organistas.length > 0) {
      const dadosParaInserir = organistas.map((org, index) => [
        index + 1, // ID sequencial
        org.nome,
        org.cargo,
        org.nivel,
        org.comum,
        org.cidade,
        '' // Tocou no último ensaio? (vazio)
      ]);

      shOrganistas.getRange(5, 1, dadosParaInserir.length, 7).setValues(dadosParaInserir);
      console.log(`✅ ${organistas.length} organistas inseridas a partir da linha 5 com IDs sequenciais`);
    }

    // Formatação
    shOrganistas.autoResizeColumns(1, 7);
    shOrganistas.getRange(4, 1, 1, 7).setBorder(true, true, true, true, true, true);
    
    console.log(`✅ Aba Organistas da planilha externa de VargemGrande alimentada com sucesso para: ${localEnsaio}`);
    
    return {
      ok: true,
      localEnsaio: localEnsaio,
      abaAtualizada: 'Organistas',
      planilhaId: VARGEMGRANDE_SHEET_ID,
      totalOrganistas: organistas.length,
      organistas: organistas.map(org => org.nome)
    };

  } catch (error) {
    console.error(`❌ Erro ao alimentar aba Organistas da planilha externa de VargemGrande para ${localEnsaio}:`, error);
    throw error;
  }
}

// Função para alimentar aba Organistas da planilha de Pirapora
function alimentarAbaOrganistasPirapora(localEnsaio = 'Pirapora') {
  try {
    console.log(`🏛️ Iniciando alimentação da aba Organistas na planilha externa de Pirapora para: ${localEnsaio}`);
    
    const shDados = openOrCreateSheet(SHEET_NAME);
    const lastRow = shDados.getLastRow();
    const lastCol = shDados.getLastColumn();
    
    if (lastRow < 2) {
      throw new Error('Não há dados abaixo do cabeçalho em "Dados".');
    }

    const headerRow = shDados.getRange(1, 1, 1, lastCol).getDisplayValues()[0];
    const data = shDados.getRange(2, 1, lastRow - 1, lastCol).getDisplayValues();

    // Busca flexível pelos headers
    const idxNome = headerRow.findIndex(h => h && h.toString().toLowerCase().includes('nome'));
    const idxCargo = headerRow.findIndex(h => h && h.toString().toLowerCase().includes('cargo'));
    const idxNivel = headerRow.findIndex(h => h && h.toString().toLowerCase().includes('nivel') || h.toString().toLowerCase().includes('classe'));
    const idxComum = headerRow.findIndex(h => h && h.toString().toLowerCase().includes('comum'));
    const idxCidade = headerRow.findIndex(h => h && (
      h.toString().toLowerCase().includes('cidade') || 
      h.toString().toLowerCase().includes('municipio') || 
      h.toString().toLowerCase().includes('município') ||
      h.toString().toLowerCase().includes('localidade')
    ));
    const idxLocalEnsaio = headerRow.findIndex(h => h && h.toString().toLowerCase().includes('local_ensaio'));

    if (idxNome < 0 || idxCargo < 0) {
      throw new Error('Colunas "nome" ou "cargo" não encontradas');
    }

    // Filtra dados para organistas, examinadoras, instrutoras e secretárias da música do local especificado
    const organistas = [];
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const nome = norm(row[idxNome] || '');
      if (!nome) continue;

      const cargo = norm(row[idxCargo] || '');
      const nivel = norm(row[idxNivel] || '');
      const comum = norm(row[idxComum] || '') || '(Sem comum)';
      const cidade = norm(row[idxCidade] || '') || localEnsaio;
      const localEnsaioRow = norm(row[idxLocalEnsaio] || '') || '(Sem local definido)';
      
      const cargoLower = cargo.toLowerCase();
      const isOrganista = cargoLower.includes('organista') || 
                         cargoLower.includes('examinadora') || 
                         cargoLower.includes('instrutora') ||
                         cargoLower.includes('secretária da música') ||
                         cargoLower.includes('secretario da musica');
      
      const isLocalCorreto = localEnsaioRow.toLowerCase() === localEnsaio.toLowerCase();
      
      if (isOrganista && isLocalCorreto) {
        organistas.push({
          nome,
          cargo,
          nivel,
          comum,
          cidade,
          localEnsaio: localEnsaioRow,
          _ord: i
        });
        console.log(`🎹 Organista encontrada: ${nome} (${cargo}) - ${localEnsaioRow}`);
      }
    }

    console.log(`📊 Encontradas ${organistas.length} organistas para o local: ${localEnsaio}`);

    // Acessa a planilha externa de Pirapora
    const ssPirapora = openPiraporaSheet();
    
    // Cria ou limpa a aba Organistas
    let shOrganistas = ssPirapora.getSheetByName('Organistas');
    if (!shOrganistas) {
      shOrganistas = ssPirapora.insertSheet('Organistas');
      console.log(`✅ Nova aba Organistas criada na planilha externa de Pirapora`);
    } else {
      const ultimaLinha = shOrganistas.getLastRow();
      if (ultimaLinha > 4) {
        shOrganistas.getRange(5, 1, ultimaLinha - 4, shOrganistas.getLastColumn()).clearContent();
        console.log(`✅ Dados limpos na aba Organistas (preservando cabeçalho na linha 4)`);
      }
    }

    // Verifica se existe cabeçalho na linha 4
    const headerExists = shOrganistas.getRange(4, 1, 1, 7).getValues()[0].some(cell => cell && cell.toString().trim());
    
    if (!headerExists) {
      shOrganistas.getRange(4, 1, 1, 7).setValues([[
        'ID', 'Nome', 'Cargo', 'Nível', 'Comum', 'Cidade', 'Tocou no último ensaio?'
      ]]);
      shOrganistas.getRange(4, 1, 1, 7).setFontWeight('bold');
      shOrganistas.getRange(4, 1, 1, 7).setBackground('#e8f0fe');
      console.log(`✅ Cabeçalho criado na linha 4 com 7 colunas (incluindo ID)`);
    } else {
      console.log(`✅ Cabeçalho já existe na linha 4, preservando`);
    }

    // Popula dados a partir da linha 5
    if (organistas.length > 0) {
      const dadosParaInserir = organistas.map((org, index) => [
        index + 1, // ID sequencial
        org.nome,
        org.cargo,
        org.nivel,
        org.comum,
        org.cidade,
        '' // Tocou no último ensaio? (vazio)
      ]);

      shOrganistas.getRange(5, 1, dadosParaInserir.length, 7).setValues(dadosParaInserir);
      console.log(`✅ ${organistas.length} organistas inseridas a partir da linha 5 com IDs sequenciais`);
    }

    // Formatação
    shOrganistas.autoResizeColumns(1, 7);
    shOrganistas.getRange(4, 1, 1, 7).setBorder(true, true, true, true, true, true);
    
    console.log(`✅ Aba Organistas da planilha externa de Pirapora alimentada com sucesso para: ${localEnsaio}`);
    
    return {
      ok: true,
      localEnsaio: localEnsaio,
      abaAtualizada: 'Organistas',
      planilhaId: PIRAPORA_SHEET_ID,
      totalOrganistas: organistas.length,
      organistas: organistas.map(org => org.nome)
    };

  } catch (error) {
    console.error(`❌ Erro ao alimentar aba Organistas da planilha externa de Pirapora para ${localEnsaio}:`, error);
    throw error;
  }
}

// Função para alimentar aba Organistas da planilha de Fazendinha
function alimentarAbaOrganistasFazendinha(localEnsaio = 'Fazendinha') {
  try {
    console.log(`🏛️ Iniciando alimentação da aba Organistas na planilha externa de Fazendinha para: ${localEnsaio}`);
    
    const shDados = openOrCreateSheet(SHEET_NAME);
    const lastRow = shDados.getLastRow();
    const lastCol = shDados.getLastColumn();
    
    if (lastRow < 2) {
      throw new Error('Não há dados abaixo do cabeçalho em "Dados".');
    }

    const headerRow = shDados.getRange(1, 1, 1, lastCol).getDisplayValues()[0];
    const data = shDados.getRange(2, 1, lastRow - 1, lastCol).getDisplayValues();

    // Busca flexível pelos headers
    const idxNome = headerRow.findIndex(h => h && h.toString().toLowerCase().includes('nome'));
    const idxCargo = headerRow.findIndex(h => h && h.toString().toLowerCase().includes('cargo'));
    const idxNivel = headerRow.findIndex(h => h && h.toString().toLowerCase().includes('nivel') || h.toString().toLowerCase().includes('classe'));
    const idxComum = headerRow.findIndex(h => h && h.toString().toLowerCase().includes('comum'));
    const idxCidade = headerRow.findIndex(h => h && (
      h.toString().toLowerCase().includes('cidade') || 
      h.toString().toLowerCase().includes('municipio') || 
      h.toString().toLowerCase().includes('município') ||
      h.toString().toLowerCase().includes('localidade')
    ));
    const idxLocalEnsaio = headerRow.findIndex(h => h && h.toString().toLowerCase().includes('local_ensaio'));

    if (idxNome < 0 || idxCargo < 0) {
      throw new Error('Colunas "nome" ou "cargo" não encontradas');
    }

    // Filtra dados para organistas, examinadoras, instrutoras e secretárias da música do local especificado
    const organistas = [];
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const nome = norm(row[idxNome] || '');
      if (!nome) continue;

      const cargo = norm(row[idxCargo] || '');
      const nivel = norm(row[idxNivel] || '');
      const comum = norm(row[idxComum] || '') || '(Sem comum)';
      const cidade = norm(row[idxCidade] || '') || localEnsaio;
      const localEnsaioRow = norm(row[idxLocalEnsaio] || '') || '(Sem local definido)';
      
      const cargoLower = cargo.toLowerCase();
      const isOrganista = cargoLower.includes('organista') || 
                         cargoLower.includes('examinadora') || 
                         cargoLower.includes('instrutora') ||
                         cargoLower.includes('secretária da música') ||
                         cargoLower.includes('secretario da musica');
      
      const isLocalCorreto = localEnsaioRow.toLowerCase() === localEnsaio.toLowerCase();
      
      if (isOrganista && isLocalCorreto) {
        organistas.push({
          nome,
          cargo,
          nivel,
          comum,
          cidade,
          localEnsaio: localEnsaioRow,
          _ord: i
        });
        console.log(`🎹 Organista encontrada: ${nome} (${cargo}) - ${localEnsaioRow}`);
      }
    }

    console.log(`📊 Encontradas ${organistas.length} organistas para o local: ${localEnsaio}`);

    // Acessa a planilha externa de Fazendinha
    const ssFazendinha = openFazendinhaSheet();
    
    // Cria ou limpa a aba Organistas
    let shOrganistas = ssFazendinha.getSheetByName('Organistas');
    if (!shOrganistas) {
      shOrganistas = ssFazendinha.insertSheet('Organistas');
      console.log(`✅ Nova aba Organistas criada na planilha externa de Fazendinha`);
    } else {
      const ultimaLinha = shOrganistas.getLastRow();
      if (ultimaLinha > 4) {
        shOrganistas.getRange(5, 1, ultimaLinha - 4, shOrganistas.getLastColumn()).clearContent();
        console.log(`✅ Dados limpos na aba Organistas (preservando cabeçalho na linha 4)`);
      }
    }

    // Verifica se existe cabeçalho na linha 4
    const headerExists = shOrganistas.getRange(4, 1, 1, 7).getValues()[0].some(cell => cell && cell.toString().trim());
    
    if (!headerExists) {
      shOrganistas.getRange(4, 1, 1, 7).setValues([[
        'ID', 'Nome', 'Cargo', 'Nível', 'Comum', 'Cidade', 'Tocou no último ensaio?'
      ]]);
      shOrganistas.getRange(4, 1, 1, 7).setFontWeight('bold');
      shOrganistas.getRange(4, 1, 1, 7).setBackground('#e8f0fe');
      console.log(`✅ Cabeçalho criado na linha 4 com 7 colunas (incluindo ID)`);
    } else {
      console.log(`✅ Cabeçalho já existe na linha 4, preservando`);
    }

    // Popula dados a partir da linha 5
    if (organistas.length > 0) {
      const dadosParaInserir = organistas.map((org, index) => [
        index + 1, // ID sequencial
        org.nome,
        org.cargo,
        org.nivel,
        org.comum,
        org.cidade,
        '' // Tocou no último ensaio? (vazio)
      ]);

      shOrganistas.getRange(5, 1, dadosParaInserir.length, 7).setValues(dadosParaInserir);
      console.log(`✅ ${organistas.length} organistas inseridas a partir da linha 5 com IDs sequenciais`);
    }

    // Formatação
    shOrganistas.autoResizeColumns(1, 7);
    shOrganistas.getRange(4, 1, 1, 7).setBorder(true, true, true, true, true, true);
    
    console.log(`✅ Aba Organistas da planilha externa de Fazendinha alimentada com sucesso para: ${localEnsaio}`);
    
    return {
      ok: true,
      localEnsaio: localEnsaio,
      abaAtualizada: 'Organistas',
      planilhaId: FAZENDINHA_SHEET_ID,
      totalOrganistas: organistas.length,
      organistas: organistas.map(org => org.nome)
    };

  } catch (error) {
    console.error(`❌ Erro ao alimentar aba Organistas da planilha externa de Fazendinha para ${localEnsaio}:`, error);
    throw error;
  }
}

// Função para alimentar aba Organistas da planilha de Jandira
function alimentarAbaOrganistasJandira(localEnsaio = 'Jandira') {
  try {
    console.log(`🏛️ Iniciando alimentação da aba Organistas na planilha externa de Jandira para: ${localEnsaio}`);
    
    const shDados = openOrCreateSheet(SHEET_NAME);
    const lastRow = shDados.getLastRow();
    const lastCol = shDados.getLastColumn();
    
    if (lastRow < 2) {
      throw new Error('Não há dados abaixo do cabeçalho em "Dados".');
    }

    const headerRow = shDados.getRange(1, 1, 1, lastCol).getDisplayValues()[0];
    const data = shDados.getRange(2, 1, lastRow - 1, lastCol).getDisplayValues();

    // Busca flexível pelos headers
    const idxNome = headerRow.findIndex(h => h && h.toString().toLowerCase().includes('nome'));
    const idxCargo = headerRow.findIndex(h => h && h.toString().toLowerCase().includes('cargo'));
    const idxNivel = headerRow.findIndex(h => h && h.toString().toLowerCase().includes('nivel') || h.toString().toLowerCase().includes('classe'));
    const idxComum = headerRow.findIndex(h => h && h.toString().toLowerCase().includes('comum'));
    const idxCidade = headerRow.findIndex(h => h && (
      h.toString().toLowerCase().includes('cidade') || 
      h.toString().toLowerCase().includes('municipio') || 
      h.toString().toLowerCase().includes('município') ||
      h.toString().toLowerCase().includes('localidade')
    ));
    const idxLocalEnsaio = headerRow.findIndex(h => h && h.toString().toLowerCase().includes('local_ensaio'));

    if (idxNome < 0 || idxCargo < 0) {
      throw new Error('Colunas "nome" ou "cargo" não encontradas');
    }

    // Filtra dados para organistas, examinadoras, instrutoras e secretárias da música do local especificado
    const organistas = [];
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const nome = norm(row[idxNome] || '');
      if (!nome) continue;

      const cargo = norm(row[idxCargo] || '');
      const nivel = norm(row[idxNivel] || '');
      const comum = norm(row[idxComum] || '') || '(Sem comum)';
      const cidade = norm(row[idxCidade] || '') || localEnsaio;
      const localEnsaioRow = norm(row[idxLocalEnsaio] || '') || '(Sem local definido)';
      
      const cargoLower = cargo.toLowerCase();
      const isOrganista = cargoLower.includes('organista') || 
                         cargoLower.includes('examinadora') || 
                         cargoLower.includes('instrutora') ||
                         cargoLower.includes('secretária da música') ||
                         cargoLower.includes('secretario da musica');
      
      const isLocalCorreto = localEnsaioRow.toLowerCase() === localEnsaio.toLowerCase();
      
      if (isOrganista && isLocalCorreto) {
        organistas.push({
          nome,
          cargo,
          nivel,
          comum,
          cidade,
          localEnsaio: localEnsaioRow,
          _ord: i
        });
        console.log(`🎹 Organista encontrada: ${nome} (${cargo}) - ${localEnsaioRow}`);
      }
    }

    console.log(`📊 Encontradas ${organistas.length} organistas para o local: ${localEnsaio}`);

    // Acessa a planilha externa de Jandira
    const ssJandira = openJandiraSheet();
    
    // Cria ou limpa a aba Organistas
    let shOrganistas = ssJandira.getSheetByName('Organistas');
    if (!shOrganistas) {
      shOrganistas = ssJandira.insertSheet('Organistas');
      console.log(`✅ Nova aba Organistas criada na planilha externa de Jandira`);
    } else {
      const ultimaLinha = shOrganistas.getLastRow();
      if (ultimaLinha > 4) {
        shOrganistas.getRange(5, 1, ultimaLinha - 4, shOrganistas.getLastColumn()).clearContent();
        console.log(`✅ Dados limpos na aba Organistas (preservando cabeçalho na linha 4)`);
      }
    }

    // Verifica se existe cabeçalho na linha 4
    const headerExists = shOrganistas.getRange(4, 1, 1, 7).getValues()[0].some(cell => cell && cell.toString().trim());
    
    if (!headerExists) {
      shOrganistas.getRange(4, 1, 1, 7).setValues([[
        'ID', 'Nome', 'Cargo', 'Nível', 'Comum', 'Cidade', 'Tocou no último ensaio?'
      ]]);
      shOrganistas.getRange(4, 1, 1, 7).setFontWeight('bold');
      shOrganistas.getRange(4, 1, 1, 7).setBackground('#e8f0fe');
      console.log(`✅ Cabeçalho criado na linha 4 com 7 colunas (incluindo ID)`);
    } else {
      console.log(`✅ Cabeçalho já existe na linha 4, preservando`);
    }

    // Popula dados a partir da linha 5
    if (organistas.length > 0) {
      const dadosParaInserir = organistas.map((org, index) => [
        index + 1, // ID sequencial
        org.nome,
        org.cargo,
        org.nivel,
        org.comum,
        org.cidade,
        '' // Tocou no último ensaio? (vazio)
      ]);

      shOrganistas.getRange(5, 1, dadosParaInserir.length, 7).setValues(dadosParaInserir);
      console.log(`✅ ${organistas.length} organistas inseridas a partir da linha 5 com IDs sequenciais`);
    }

    // Formatação
    shOrganistas.autoResizeColumns(1, 7);
    shOrganistas.getRange(4, 1, 1, 7).setBorder(true, true, true, true, true, true);
    
    console.log(`✅ Aba Organistas da planilha externa de Jandira alimentada com sucesso para: ${localEnsaio}`);
    
    return {
      ok: true,
      localEnsaio: localEnsaio,
      abaAtualizada: 'Organistas',
      planilhaId: JANDIRA_SHEET_ID,
      totalOrganistas: organistas.length,
      organistas: organistas.map(org => org.nome)
    };

  } catch (error) {
    console.error(`❌ Erro ao alimentar aba Organistas da planilha externa de Jandira para ${localEnsaio}:`, error);
    throw error;
  }
}

// Função para alimentar aba Organistas da planilha de Caucaia
function alimentarAbaOrganistasCaucaia(localEnsaio = 'Caucaia') {
  try {
    console.log(`🏛️ Iniciando alimentação da aba Organistas na planilha externa de Caucaia para: ${localEnsaio}`);
    
    const shDados = openOrCreateSheet(SHEET_NAME);
    const lastRow = shDados.getLastRow();
    const lastCol = shDados.getLastColumn();
    
    if (lastRow < 2) {
      throw new Error('Não há dados abaixo do cabeçalho em "Dados".');
    }

    const headerRow = shDados.getRange(1, 1, 1, lastCol).getDisplayValues()[0];
    const data = shDados.getRange(2, 1, lastRow - 1, lastCol).getDisplayValues();

    // Busca flexível pelos headers
    const idxNome = headerRow.findIndex(h => h && h.toString().toLowerCase().includes('nome'));
    const idxCargo = headerRow.findIndex(h => h && h.toString().toLowerCase().includes('cargo'));
    const idxNivel = headerRow.findIndex(h => h && h.toString().toLowerCase().includes('nivel') || h.toString().toLowerCase().includes('classe'));
    const idxComum = headerRow.findIndex(h => h && h.toString().toLowerCase().includes('comum'));
    const idxCidade = headerRow.findIndex(h => h && (
      h.toString().toLowerCase().includes('cidade') || 
      h.toString().toLowerCase().includes('municipio') || 
      h.toString().toLowerCase().includes('município') ||
      h.toString().toLowerCase().includes('localidade')
    ));
    const idxLocalEnsaio = headerRow.findIndex(h => h && h.toString().toLowerCase().includes('local_ensaio'));

    if (idxNome < 0 || idxCargo < 0) {
      throw new Error('Colunas "nome" ou "cargo" não encontradas');
    }

    // Filtra dados para organistas, examinadoras, instrutoras e secretárias da música do local especificado
    const organistas = [];
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const nome = norm(row[idxNome] || '');
      if (!nome) continue;

      const cargo = norm(row[idxCargo] || '');
      const nivel = norm(row[idxNivel] || '');
      const comum = norm(row[idxComum] || '') || '(Sem comum)';
      const cidade = norm(row[idxCidade] || '') || localEnsaio;
      const localEnsaioRow = norm(row[idxLocalEnsaio] || '') || '(Sem local definido)';
      
      const cargoLower = cargo.toLowerCase();
      const isOrganista = cargoLower.includes('organista') || 
                         cargoLower.includes('examinadora') || 
                         cargoLower.includes('instrutora') ||
                         cargoLower.includes('secretária da música') ||
                         cargoLower.includes('secretario da musica');
      
      const isLocalCorreto = localEnsaioRow.toLowerCase() === localEnsaio.toLowerCase();
      
      if (isOrganista && isLocalCorreto) {
        organistas.push({
          nome,
          cargo,
          nivel,
          comum,
          cidade,
          localEnsaio: localEnsaioRow,
          _ord: i
        });
        console.log(`🎹 Organista encontrada: ${nome} (${cargo}) - ${localEnsaioRow}`);
      }
    }

    console.log(`📊 Encontradas ${organistas.length} organistas para o local: ${localEnsaio}`);

    // Acessa a planilha externa de Caucaia
    const ssCaucaia = openCaucaiaSheet();
    
    // Cria ou limpa a aba Organistas
    let shOrganistas = ssCaucaia.getSheetByName('Organistas');
    if (!shOrganistas) {
      shOrganistas = ssCaucaia.insertSheet('Organistas');
      console.log(`✅ Nova aba Organistas criada na planilha externa de Caucaia`);
    } else {
      const ultimaLinha = shOrganistas.getLastRow();
      if (ultimaLinha > 4) {
        shOrganistas.getRange(5, 1, ultimaLinha - 4, shOrganistas.getLastColumn()).clearContent();
        console.log(`✅ Dados limpos na aba Organistas (preservando cabeçalho na linha 4)`);
      }
    }

    // Verifica se existe cabeçalho na linha 4
    const headerExists = shOrganistas.getRange(4, 1, 1, 7).getValues()[0].some(cell => cell && cell.toString().trim());
    
    if (!headerExists) {
      shOrganistas.getRange(4, 1, 1, 7).setValues([[
        'ID', 'Nome', 'Cargo', 'Nível', 'Comum', 'Cidade', 'Tocou no último ensaio?'
      ]]);
      shOrganistas.getRange(4, 1, 1, 7).setFontWeight('bold');
      shOrganistas.getRange(4, 1, 1, 7).setBackground('#e8f0fe');
      console.log(`✅ Cabeçalho criado na linha 4 com 7 colunas (incluindo ID)`);
    } else {
      console.log(`✅ Cabeçalho já existe na linha 4, preservando`);
    }

    // Popula dados a partir da linha 5
    if (organistas.length > 0) {
      const dadosParaInserir = organistas.map((org, index) => [
        index + 1, // ID sequencial
        org.nome,
        org.cargo,
        org.nivel,
        org.comum,
        org.cidade,
        '' // Tocou no último ensaio? (vazio)
      ]);

      shOrganistas.getRange(5, 1, dadosParaInserir.length, 7).setValues(dadosParaInserir);
      console.log(`✅ ${organistas.length} organistas inseridas a partir da linha 5 com IDs sequenciais`);
    }

    // Formatação
    shOrganistas.autoResizeColumns(1, 7);
    shOrganistas.getRange(4, 1, 1, 7).setBorder(true, true, true, true, true, true);
    
    console.log(`✅ Aba Organistas da planilha externa de Caucaia alimentada com sucesso para: ${localEnsaio}`);
    
    return {
      ok: true,
      localEnsaio: localEnsaio,
      abaAtualizada: 'Organistas',
      planilhaId: CAUCAIA_SHEET_ID,
      totalOrganistas: organistas.length,
      organistas: organistas.map(org => org.nome)
    };

  } catch (error) {
    console.error(`❌ Erro ao alimentar aba Organistas da planilha externa de Caucaia para ${localEnsaio}:`, error);
    throw error;
  }
}

// Função para alimentar aba Organistas da planilha de Cotia
function alimentarAbaOrganistasCotia(localEnsaio = 'Cotia') {
  try {
    console.log('🎹 Iniciando alimentação da aba Organistas da planilha de Cotia...');
    
    const shDados = openOrCreateSheet(SHEET_NAME);
    const lastRow = shDados.getLastRow();
    const lastCol = shDados.getLastColumn();
    
    if (lastRow < 2) {
      throw new Error('Não há dados abaixo do cabeçalho em "Dados".');
    }

    const headerRow = shDados.getRange(1, 1, 1, lastCol).getDisplayValues()[0];
    const data = shDados.getRange(2, 1, lastRow - 1, lastCol).getDisplayValues();

    // Busca flexível pelos headers
    const idxNome = headerRow.findIndex(h => h && h.toString().toLowerCase().includes('nome'));
    const idxCargo = headerRow.findIndex(h => h && h.toString().toLowerCase().includes('cargo'));
    const idxNivel = headerRow.findIndex(h => h && h.toString().toLowerCase().includes('nivel') || h.toString().toLowerCase().includes('classe'));
    const idxComum = headerRow.findIndex(h => h && h.toString().toLowerCase().includes('comum'));
    const idxCidade = headerRow.findIndex(h => h && (
      h.toString().toLowerCase().includes('cidade') || 
      h.toString().toLowerCase().includes('municipio') || 
      h.toString().toLowerCase().includes('município') ||
      h.toString().toLowerCase().includes('localidade')
    ));
    const idxLocalEnsaio = headerRow.findIndex(h => h && h.toString().toLowerCase().includes('local_ensaio'));

    if (idxNome < 0 || idxCargo < 0) {
      throw new Error('Colunas "nome" ou "cargo" não encontradas');
    }

    // Filtra dados para organistas, examinadoras, instrutoras e secretárias da música do local especificado
    const organistas = [];
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const nome = norm(row[idxNome] || '');
      if (!nome) continue;

      const cargo = norm(row[idxCargo] || '');
      const nivel = norm(row[idxNivel] || '');
      const comum = norm(row[idxComum] || '') || '(Sem comum)';
      const cidade = norm(row[idxCidade] || '') || localEnsaio;
      const localEnsaioRow = norm(row[idxLocalEnsaio] || '') || '(Sem local definido)';
      
      const cargoLower = cargo.toLowerCase();
      const isOrganista = cargoLower.includes('organista') || 
                         cargoLower.includes('examinadora') || 
                         cargoLower.includes('instrutora') ||
                         cargoLower.includes('secretária da música') ||
                         cargoLower.includes('secretario da musica');
      
      const isLocalCorreto = localEnsaioRow.toLowerCase() === localEnsaio.toLowerCase();
      
      if (isOrganista && isLocalCorreto) {
        organistas.push({
          nome,
          cargo,
          nivel,
          comum,
          cidade,
          localEnsaio: localEnsaioRow,
          _ord: i
        });
        console.log(`🎹 Organista encontrada: ${nome} (${cargo}) - ${localEnsaioRow}`);
      }
    }

    console.log(`📊 Encontradas ${organistas.length} organistas para o local: ${localEnsaio}`);

    // Acessa a planilha externa de Cotia
    const ssCotia = openCotiaSheet();
    
    // Cria ou limpa a aba Organistas
    let shOrganistas = ssCotia.getSheetByName('Organistas');
    if (!shOrganistas) {
      shOrganistas = ssCotia.insertSheet('Organistas');
      console.log(`✅ Nova aba Organistas criada na planilha externa de Cotia`);
    } else {
      const ultimaLinha = shOrganistas.getLastRow();
      if (ultimaLinha > 4) {
        shOrganistas.getRange(5, 1, ultimaLinha - 4, shOrganistas.getLastColumn()).clearContent();
        console.log(`✅ Dados limpos na aba Organistas (preservando cabeçalho na linha 4)`);
      }
    }

    // Verifica se existe cabeçalho na linha 4
    const headerExists = shOrganistas.getRange(4, 1, 1, 7).getValues()[0].some(cell => cell && cell.toString().trim());
    
    if (!headerExists) {
      shOrganistas.getRange(4, 1, 1, 7).setValues([[
        'ID', 'Nome', 'Cargo', 'Nível', 'Comum', 'Cidade', 'Tocou no último ensaio?'
      ]]);
      shOrganistas.getRange(4, 1, 1, 7).setFontWeight('bold');
      shOrganistas.getRange(4, 1, 1, 7).setBackground('#e8f0fe');
      console.log(`✅ Cabeçalho criado na linha 4 com 7 colunas (incluindo ID)`);
    } else {
      console.log(`✅ Cabeçalho já existe na linha 4, preservando`);
    }

    // Popula dados a partir da linha 5
    if (organistas.length > 0) {
      const dadosParaInserir = organistas.map((org, index) => [
        index + 1, // ID sequencial
        org.nome,
        org.cargo,
        org.nivel,
        org.comum,
        org.cidade,
        '' // Tocou no último ensaio? (vazio)
      ]);

      shOrganistas.getRange(5, 1, dadosParaInserir.length, 7).setValues(dadosParaInserir);
      console.log(`✅ ${organistas.length} organistas inseridas a partir da linha 5 com IDs sequenciais`);
    }

    // Formatação
    shOrganistas.autoResizeColumns(1, 7);
    shOrganistas.getRange(4, 1, 1, 7).setBorder(true, true, true, true, true, true);
    
    console.log(`✅ Aba Organistas da planilha externa de Cotia alimentada com sucesso para: ${localEnsaio}`);
    
    return {
      ok: true,
      localEnsaio: localEnsaio,
      abaAtualizada: 'Organistas',
      planilhaId: COTIA_SHEET_ID,
      totalOrganistas: organistas.length,
      organistas: organistas.map(org => org.nome)
    };
    
  } catch (error) {
    console.error(`❌ Erro ao alimentar aba Organistas da planilha externa de Cotia para ${localEnsaio}:`, error);
    throw error;
  }
}

// Função principal para executar exportação para Itapevi
function executarExportarItapevi() {
  try {
    const ui = SpreadsheetApp.getUi();
    
    // Lista os locais disponíveis
    const resultadoLocais = listarLocaisEnsaio();
    if (!resultadoLocais || !resultadoLocais.ok || !resultadoLocais.locais || resultadoLocais.locais.length === 0) {
      ui.alert('❌ Nenhum local de ensaio encontrado nos dados.');
      return;
    }

    const locais = resultadoLocais.locais;

    // Cria opções para o prompt
    const opcoes = locais.map((local, index) => `${index + 1}. ${local}`).join('\n');
    const prompt = `Escolha o local de ensaio para exportar para a planilha de Itapevi:\n\n${opcoes}\n\nDigite o número da opção:`;
    
    const resposta = ui.prompt('📤 Exportar para Planilha de Itapevi', prompt, ui.ButtonSet.OK_CANCEL);
    
    if (resposta.getSelectedButton() !== ui.Button.OK) {
      ui.alert('❌ Operação cancelada pelo usuário.');
      return;
    }

    const escolha = parseInt(resposta.getResponseText().trim());
    if (isNaN(escolha) || escolha < 1 || escolha > locais.length) {
      ui.alert('❌ Opção inválida. Por favor, digite um número válido.');
      return;
    }

    const localEscolhido = locais[escolha - 1];
    
    // Confirma a operação
    const confirmacao = ui.alert(
      '📤 Confirmar Exportação para Itapevi',
      `Deseja exportar os dados do ensaio "${localEscolhido}" para a planilha externa de Itapevi?\n\nIsso irá:\n• Atualizar a aba "Resumo" com contadores de instrumentos e cargos\n• Atualizar a aba "Organistas" com lista de organistas\n\nConfirma a operação?`,
      ui.ButtonSet.YES_NO
    );

    if (confirmacao !== ui.Button.YES) {
      ui.alert('❌ Operação cancelada pelo usuário.');
      return;
    }

    ui.alert('⏳ Iniciando exportação para Itapevi...\n\nPor favor, aguarde enquanto os dados são processados.');

    // Executa a exportação completa
    const resultadoResumo = exportarParaPlanilhaItapeviCompleta(localEscolhido);
    const resultadoOrganistas = alimentarAbaOrganistasItapevi(localEscolhido);

    // Mostra resultado
    const mensagem = `✅ Exportação para Itapevi concluída com sucesso!\n\n` +
      `📊 Aba Resumo atualizada:\n` +
      `• Total de membros: ${resultadoResumo.totalMembros}\n` +
      `• Instrumentos contados: ${Object.keys(resultadoResumo.instrumentos).filter(k => resultadoResumo.instrumentos[k] > 0).length}\n` +
      `• Cargos ministeriais: ${Object.keys(resultadoResumo.cargosMinisteriais).filter(k => resultadoResumo.cargosMinisteriais[k] > 0).length}\n` +
      `• Cargos de apoio: ${Object.keys(resultadoResumo.cargosApoio).filter(k => resultadoResumo.cargosApoio[k] > 0).length}\n\n` +
      `🎹 Aba Organistas atualizada:\n` +
      `• Total de organistas: ${resultadoOrganistas.totalOrganistas}\n\n` +
      `📋 Planilha ID: ${resultadoResumo.planilhaId}`;

    ui.alert('🎉 Exportação Concluída!', mensagem, ui.ButtonSet.OK);

  } catch (error) {
    console.error('❌ Erro na exportação para Itapevi:', error);
    const ui = SpreadsheetApp.getUi();
    ui.alert('❌ Erro na Exportação', `Erro ao exportar para planilha de Itapevi: ${error.message}`, ui.ButtonSet.OK);
  }
}

function executarExportarVargemGrande() {
  try {
    const ui = SpreadsheetApp.getUi();
    const resultadoLocais = listarLocaisEnsaio();
    if (!resultadoLocais || !resultadoLocais.ok || !resultadoLocais.locais || resultadoLocais.locais.length === 0) {
      ui.alert('❌ Nenhum local de ensaio encontrado nos dados.');
      return;
    }
    const locais = resultadoLocais.locais;
    const opcoes = locais.map((local, index) => `${index + 1}. ${local}`).join('\n');
    const prompt = `Escolha o local de ensaio para exportar para a planilha de VargemGrande:\n\n${opcoes}\n\nDigite o número da opção:`;
    const resposta = ui.prompt('📤 Exportar para Planilha de VargemGrande', prompt, ui.ButtonSet.OK_CANCEL);
    if (resposta.getSelectedButton() !== ui.Button.OK) {
      ui.alert('❌ Operação cancelada pelo usuário.');
      return;
    }
    const escolha = parseInt(resposta.getResponseText().trim());
    if (isNaN(escolha) || escolha < 1 || escolha > locais.length) {
      ui.alert('❌ Opção inválida. Por favor, digite um número válido.');
      return;
    }
    const localEscolhido = locais[escolha - 1];
    const confirmacao = ui.alert(
      '📤 Confirmar Exportação para VargemGrande',
      `Deseja exportar os dados do ensaio "${localEscolhido}" para a planilha externa de VargemGrande?\n\nIsso irá:\n• Atualizar a aba "Resumo" com contadores de instrumentos e cargos\n• Atualizar a aba "Organistas" com lista de organistas\n\nConfirma a operação?`,
      ui.ButtonSet.YES_NO
    );
    if (confirmacao !== ui.Button.YES) {
      ui.alert('❌ Operação cancelada pelo usuário.');
      return;
    }
    ui.alert('⏳ Iniciando exportação para VargemGrande...\n\nPor favor, aguarde enquanto os dados são processados.');
    const resultadoResumo = exportarParaPlanilhaVargemGrandeCompleta(localEscolhido);
    const resultadoOrganistas = alimentarAbaOrganistasVargemGrande(localEscolhido);
    const mensagem = `✅ Exportação para VargemGrande concluída com sucesso!\n\n` +
      `📊 Aba Resumo atualizada:\n` +
      `• Total de membros: ${resultadoResumo.totalMembros}\n` +
      `• Instrumentos contados: ${Object.keys(resultadoResumo.instrumentos).filter(k => resultadoResumo.instrumentos[k] > 0).length}\n` +
      `• Cargos ministeriais: ${Object.keys(resultadoResumo.cargosMinisteriais).filter(k => resultadoResumo.cargosMinisteriais[k] > 0).length}\n` +
      `• Cargos de apoio: ${Object.keys(resultadoResumo.cargosApoio).filter(k => resultadoResumo.cargosApoio[k] > 0).length}\n\n` +
      `🎹 Aba Organistas atualizada:\n` +
      `• Total de organistas: ${resultadoOrganistas.totalOrganistas}\n\n` +
      `📋 Planilha ID: ${resultadoResumo.planilhaId}`;
    ui.alert('🎉 Exportação Concluída!', mensagem, ui.ButtonSet.OK);
  } catch (error) {
    console.error('❌ Erro na exportação para VargemGrande:', error);
    const ui = SpreadsheetApp.getUi();
    ui.alert('❌ Erro na Exportação', `Erro ao exportar para planilha de VargemGrande: ${error.message}`, ui.ButtonSet.OK);
  }
}

function executarExportarPirapora() {
  try {
    const ui = SpreadsheetApp.getUi();
    const resultadoLocais = listarLocaisEnsaio();
    if (!resultadoLocais || !resultadoLocais.ok || !resultadoLocais.locais || resultadoLocais.locais.length === 0) {
      ui.alert('❌ Nenhum local de ensaio encontrado nos dados.');
      return;
    }
    const locais = resultadoLocais.locais;
    const opcoes = locais.map((local, index) => `${index + 1}. ${local}`).join('\n');
    const prompt = `Escolha o local de ensaio para exportar para a planilha de Pirapora:\n\n${opcoes}\n\nDigite o número da opção:`;
    const resposta = ui.prompt('📤 Exportar para Planilha de Pirapora', prompt, ui.ButtonSet.OK_CANCEL);
    if (resposta.getSelectedButton() !== ui.Button.OK) {
      ui.alert('❌ Operação cancelada pelo usuário.');
      return;
    }
    const escolha = parseInt(resposta.getResponseText().trim());
    if (isNaN(escolha) || escolha < 1 || escolha > locais.length) {
      ui.alert('❌ Opção inválida. Por favor, digite um número válido.');
      return;
    }
    const localEscolhido = locais[escolha - 1];
    const confirmacao = ui.alert(
      '📤 Confirmar Exportação para Pirapora',
      `Deseja exportar os dados do ensaio "${localEscolhido}" para a planilha externa de Pirapora?\n\nIsso irá:\n• Atualizar a aba "Resumo" com contadores de instrumentos e cargos\n• Atualizar a aba "Organistas" com lista de organistas\n\nConfirma a operação?`,
      ui.ButtonSet.YES_NO
    );
    if (confirmacao !== ui.Button.YES) {
      ui.alert('❌ Operação cancelada pelo usuário.');
      return;
    }
    ui.alert('⏳ Iniciando exportação para Pirapora...\n\nPor favor, aguarde enquanto os dados são processados.');
    const resultadoResumo = exportarParaPlanilhaPiraporaCompleta(localEscolhido);
    const resultadoOrganistas = alimentarAbaOrganistasPirapora(localEscolhido);
    const mensagem = `✅ Exportação para Pirapora concluída com sucesso!\n\n` +
      `📊 Aba Resumo atualizada:\n` +
      `• Total de membros: ${resultadoResumo.totalMembros}\n` +
      `• Instrumentos contados: ${Object.keys(resultadoResumo.instrumentos).filter(k => resultadoResumo.instrumentos[k] > 0).length}\n` +
      `• Cargos ministeriais: ${Object.keys(resultadoResumo.cargosMinisteriais).filter(k => resultadoResumo.cargosMinisteriais[k] > 0).length}\n` +
      `• Cargos de apoio: ${Object.keys(resultadoResumo.cargosApoio).filter(k => resultadoResumo.cargosApoio[k] > 0).length}\n\n` +
      `🎹 Aba Organistas atualizada:\n` +
      `• Total de organistas: ${resultadoOrganistas.totalOrganistas}\n\n` +
      `📋 Planilha ID: ${resultadoResumo.planilhaId}`;
    ui.alert('🎉 Exportação Concluída!', mensagem, ui.ButtonSet.OK);
  } catch (error) {
    console.error('❌ Erro na exportação para Pirapora:', error);
    const ui = SpreadsheetApp.getUi();
    ui.alert('❌ Erro na Exportação', `Erro ao exportar para planilha de Pirapora: ${error.message}`, ui.ButtonSet.OK);
  }
}

function executarExportarFazendinha() {
  try {
    const ui = SpreadsheetApp.getUi();
    const resultadoLocais = listarLocaisEnsaio();
    if (!resultadoLocais || !resultadoLocais.ok || !resultadoLocais.locais || resultadoLocais.locais.length === 0) {
      ui.alert('❌ Nenhum local de ensaio encontrado nos dados.');
      return;
    }
    const locais = resultadoLocais.locais;
    const opcoes = locais.map((local, index) => `${index + 1}. ${local}`).join('\n');
    const prompt = `Escolha o local de ensaio para exportar para a planilha de Fazendinha:\n\n${opcoes}\n\nDigite o número da opção:`;
    const resposta = ui.prompt('📤 Exportar para Planilha de Fazendinha', prompt, ui.ButtonSet.OK_CANCEL);
    if (resposta.getSelectedButton() !== ui.Button.OK) {
      ui.alert('❌ Operação cancelada pelo usuário.');
      return;
    }
    const escolha = parseInt(resposta.getResponseText().trim());
    if (isNaN(escolha) || escolha < 1 || escolha > locais.length) {
      ui.alert('❌ Opção inválida. Por favor, digite um número válido.');
      return;
    }
    const localEscolhido = locais[escolha - 1];
    const confirmacao = ui.alert(
      '📤 Confirmar Exportação para Fazendinha',
      `Deseja exportar os dados do ensaio "${localEscolhido}" para a planilha externa de Fazendinha?\n\nIsso irá:\n• Atualizar a aba "Resumo" com contadores de instrumentos e cargos\n• Atualizar a aba "Organistas" com lista de organistas\n\nConfirma a operação?`,
      ui.ButtonSet.YES_NO
    );
    if (confirmacao !== ui.Button.YES) {
      ui.alert('❌ Operação cancelada pelo usuário.');
      return;
    }
    ui.alert('⏳ Iniciando exportação para Fazendinha...\n\nPor favor, aguarde enquanto os dados são processados.');
    const resultadoResumo = exportarParaPlanilhaFazendinhaCompleta(localEscolhido);
    const resultadoOrganistas = alimentarAbaOrganistasFazendinha(localEscolhido);
    const mensagem = `✅ Exportação para Fazendinha concluída com sucesso!\n\n` +
      `📊 Aba Resumo atualizada:\n` +
      `• Total de membros: ${resultadoResumo.totalMembros}\n` +
      `• Instrumentos contados: ${Object.keys(resultadoResumo.instrumentos).filter(k => resultadoResumo.instrumentos[k] > 0).length}\n` +
      `• Cargos ministeriais: ${Object.keys(resultadoResumo.cargosMinisteriais).filter(k => resultadoResumo.cargosMinisteriais[k] > 0).length}\n` +
      `• Cargos de apoio: ${Object.keys(resultadoResumo.cargosApoio).filter(k => resultadoResumo.cargosApoio[k] > 0).length}\n\n` +
      `🎹 Aba Organistas atualizada:\n` +
      `• Total de organistas: ${resultadoOrganistas.totalOrganistas}\n\n` +
      `📋 Planilha ID: ${resultadoResumo.planilhaId}`;
    ui.alert('🎉 Exportação Concluída!', mensagem, ui.ButtonSet.OK);
  } catch (error) {
    console.error('❌ Erro na exportação para Fazendinha:', error);
    const ui = SpreadsheetApp.getUi();
    ui.alert('❌ Erro na Exportação', `Erro ao exportar para planilha de Fazendinha: ${error.message}`, ui.ButtonSet.OK);
  }
}

function executarExportarJandira() {
  try {
    const ui = SpreadsheetApp.getUi();
    const resultadoLocais = listarLocaisEnsaio();
    if (!resultadoLocais || !resultadoLocais.ok || !resultadoLocais.locais || resultadoLocais.locais.length === 0) {
      ui.alert('❌ Nenhum local de ensaio encontrado nos dados.');
      return;
    }
    const locais = resultadoLocais.locais;
    const opcoes = locais.map((local, index) => `${index + 1}. ${local}`).join('\n');
    const prompt = `Escolha o local de ensaio para exportar para a planilha de Jandira:\n\n${opcoes}\n\nDigite o número da opção:`;
    const resposta = ui.prompt('📤 Exportar para Planilha de Jandira', prompt, ui.ButtonSet.OK_CANCEL);
    if (resposta.getSelectedButton() !== ui.Button.OK) {
      ui.alert('❌ Operação cancelada pelo usuário.');
      return;
    }
    const escolha = parseInt(resposta.getResponseText().trim());
    if (isNaN(escolha) || escolha < 1 || escolha > locais.length) {
      ui.alert('❌ Opção inválida. Por favor, digite um número válido.');
      return;
    }
    const localEscolhido = locais[escolha - 1];
    const confirmacao = ui.alert(
      '📤 Confirmar Exportação para Jandira',
      `Deseja exportar os dados do ensaio "${localEscolhido}" para a planilha externa de Jandira?\n\nIsso irá:\n• Atualizar a aba "Resumo" com contadores de instrumentos e cargos\n• Atualizar a aba "Organistas" com lista de organistas\n\nConfirma a operação?`,
      ui.ButtonSet.YES_NO
    );
    if (confirmacao !== ui.Button.YES) {
      ui.alert('❌ Operação cancelada pelo usuário.');
      return;
    }
    ui.alert('⏳ Iniciando exportação para Jandira...\n\nPor favor, aguarde enquanto os dados são processados.');
    const resultadoResumo = exportarParaPlanilhaJandiraCompleta(localEscolhido);
    const resultadoOrganistas = alimentarAbaOrganistasJandira(localEscolhido);
    const mensagem = `✅ Exportação para Jandira concluída com sucesso!\n\n` +
      `📊 Aba Resumo atualizada:\n` +
      `• Total de membros: ${resultadoResumo.totalMembros}\n` +
      `• Instrumentos contados: ${Object.keys(resultadoResumo.instrumentos).filter(k => resultadoResumo.instrumentos[k] > 0).length}\n` +
      `• Cargos ministeriais: ${Object.keys(resultadoResumo.cargosMinisteriais).filter(k => resultadoResumo.cargosMinisteriais[k] > 0).length}\n` +
      `• Cargos de apoio: ${Object.keys(resultadoResumo.cargosApoio).filter(k => resultadoResumo.cargosApoio[k] > 0).length}\n\n` +
      `🎹 Aba Organistas atualizada:\n` +
      `• Total de organistas: ${resultadoOrganistas.totalOrganistas}\n\n` +
      `📋 Planilha ID: ${resultadoResumo.planilhaId}`;
    ui.alert('🎉 Exportação Concluída!', mensagem, ui.ButtonSet.OK);
  } catch (error) {
    console.error('❌ Erro na exportação para Jandira:', error);
    const ui = SpreadsheetApp.getUi();
    ui.alert('❌ Erro na Exportação', `Erro ao exportar para planilha de Jandira: ${error.message}`, ui.ButtonSet.OK);
  }
}

function executarExportarCaucaia() {
  try {
  const ui = SpreadsheetApp.getUi();
    const resultadoLocais = listarLocaisEnsaio();
    if (!resultadoLocais || !resultadoLocais.ok || !resultadoLocais.locais || resultadoLocais.locais.length === 0) {
      ui.alert('❌ Nenhum local de ensaio encontrado nos dados.');
      return;
    }
    const locais = resultadoLocais.locais;
    const opcoes = locais.map((local, index) => `${index + 1}. ${local}`).join('\n');
    const prompt = `Escolha o local de ensaio para exportar para a planilha de Caucaia:\n\n${opcoes}\n\nDigite o número da opção:`;
    const resposta = ui.prompt('📤 Exportar para Planilha de Caucaia', prompt, ui.ButtonSet.OK_CANCEL);
    if (resposta.getSelectedButton() !== ui.Button.OK) {
      ui.alert('❌ Operação cancelada pelo usuário.');
      return;
    }
    const escolha = parseInt(resposta.getResponseText().trim());
    if (isNaN(escolha) || escolha < 1 || escolha > locais.length) {
      ui.alert('❌ Opção inválida. Por favor, digite um número válido.');
      return;
    }
    const localEscolhido = locais[escolha - 1];
    const confirmacao = ui.alert(
      '📤 Confirmar Exportação para Caucaia',
      `Deseja exportar os dados do ensaio "${localEscolhido}" para a planilha externa de Caucaia?\n\nIsso irá:\n• Atualizar a aba "Resumo" com contadores de instrumentos e cargos\n• Atualizar a aba "Organistas" com lista de organistas\n\nConfirma a operação?`,
      ui.ButtonSet.YES_NO
    );
    if (confirmacao !== ui.Button.YES) {
      ui.alert('❌ Operação cancelada pelo usuário.');
      return;
    }
    ui.alert('⏳ Iniciando exportação para Caucaia...\n\nPor favor, aguarde enquanto os dados são processados.');
    const resultadoResumo = exportarParaPlanilhaCaucaiaCompleta(localEscolhido);
    const resultadoOrganistas = alimentarAbaOrganistasCaucaia(localEscolhido);
    const mensagem = `✅ Exportação para Caucaia concluída com sucesso!\n\n` +
      `📊 Aba Resumo atualizada:\n` +
      `• Total de membros: ${resultadoResumo.totalMembros}\n` +
      `• Instrumentos contados: ${Object.keys(resultadoResumo.instrumentos).filter(k => resultadoResumo.instrumentos[k] > 0).length}\n` +
      `• Cargos ministeriais: ${Object.keys(resultadoResumo.cargosMinisteriais).filter(k => resultadoResumo.cargosMinisteriais[k] > 0).length}\n` +
      `• Cargos de apoio: ${Object.keys(resultadoResumo.cargosApoio).filter(k => resultadoResumo.cargosApoio[k] > 0).length}\n\n` +
      `🎹 Aba Organistas atualizada:\n` +
      `• Total de organistas: ${resultadoOrganistas.totalOrganistas}\n\n` +
      `📋 Planilha ID: ${resultadoResumo.planilhaId}`;
    ui.alert('🎉 Exportação Concluída!', mensagem, ui.ButtonSet.OK);
  } catch (error) {
    console.error('❌ Erro na exportação para Caucaia:', error);
    const ui = SpreadsheetApp.getUi();
    ui.alert('❌ Erro na Exportação', `Erro ao exportar para planilha de Caucaia: ${error.message}`, ui.ButtonSet.OK);
  }
}

function executarExportarCotia() {
  try {
    const ui = SpreadsheetApp.getUi();
    
    // Primeiro lista os locais disponíveis
    const resultadoLocais = listarLocaisEnsaio();
    
    if (!resultadoLocais || !resultadoLocais.ok || !resultadoLocais.locais || resultadoLocais.total === 0) {
      ui.alert('Aviso', 'Nenhum local de ensaio encontrado nos dados.', ui.ButtonSet.OK);
      return;
    }
    
    const locais = resultadoLocais;
    
    // Cria uma lista de opções para o usuário escolher
    const opcoes = locais.locais.map((local, index) => `${index + 1}. ${local} (${locais.contagem[local]} membros)`).join('\n');
    const prompt = `Escolha o local de ensaio para exportação completa para a planilha de Cotia:\n\n${opcoes}\n\nDigite o número da opção:`;
    
    const resposta = ui.prompt('Selecionar Local de Ensaio', prompt, ui.ButtonSet.OK_CANCEL);
    
    if (resposta.getSelectedButton() === ui.Button.OK) {
      const escolha = parseInt(resposta.getResponseText().trim());
      
      if (isNaN(escolha) || escolha < 1 || escolha > locais.locais.length) {
        ui.alert('Erro', 'Opção inválida. Por favor, digite um número válido.', ui.ButtonSet.OK);
        return;
      }
      
      const localEscolhido = locais.locais[escolha - 1];
      
      // Confirma a operação
      const confirmacao = ui.alert(
        'Confirmar Exportação',
        `Deseja exportar os dados do ensaio "${localEscolhido}" para a planilha externa de Cotia?\n\nIsso irá:\n• Atualizar a aba "Resumo" com contadores de instrumentos e cargos\n• Atualizar a aba "Organistas" com lista de organistas\n\nConfirma a operação?`,
        ui.ButtonSet.YES_NO
      );

      if (confirmacao === ui.Button.YES) {
        ui.alert('Iniciando exportação...\n\nPor favor, aguarde enquanto os dados são processados.');

        // Executa a exportação completa
        const resultadoResumo = exportarParaPlanilhaCotiaCompleta(localEscolhido);
        const resultadoOrganistas = alimentarAbaOrganistasCotia(localEscolhido);

        // Mostra resultado
        const mensagem = `Exportação para Cotia concluída com sucesso!\n\n` +
          `Aba Resumo atualizada:\n` +
          `• Total de membros: ${resultadoResumo.totalMembros}\n` +
          `• Instrumentos contados: ${Object.keys(resultadoResumo.instrumentos).filter(k => resultadoResumo.instrumentos[k] > 0).length}\n` +
          `• Cargos ministeriais: ${Object.keys(resultadoResumo.cargosMinisteriais).filter(k => resultadoResumo.cargosMinisteriais[k] > 0).length}\n` +
          `• Cargos de apoio: ${Object.keys(resultadoResumo.cargosApoio).filter(k => resultadoResumo.cargosApoio[k] > 0).length}\n\n` +
          `Aba Organistas atualizada:\n` +
          `• Total de organistas: ${resultadoOrganistas.totalOrganistas}\n\n` +
          `Planilha ID: ${resultadoResumo.planilhaId}`;

        ui.alert('Exportação Concluída!', mensagem, ui.ButtonSet.OK);
      } else {
        ui.alert('Operação cancelada pelo usuário.');
      }
    } else {
      ui.alert('Operação cancelada pelo usuário.');
    }

  } catch (error) {
    console.error('❌ Erro na exportação para Cotia:', error);
    const ui = SpreadsheetApp.getUi();
    ui.alert('❌ Erro na Exportação', `Erro ao exportar para planilha de Cotia: ${error.message}`, ui.ButtonSet.OK);
  }
}

// Função para exportar dados completos para planilha externa de Itapevi (com instrumentos e cargos)
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
      
      // Só processa se for do local especificado
      if (localEnsaioRow.toLowerCase() !== localEnsaio.toLowerCase()) continue;
      
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
      } else if (x.instrumento) {
        // Mapeia o instrumento para a lista padrão
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
          'irmao': 'Irmandade'
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
      'Porteiros (as)': ['Porteiros (as)', 'Porteiro (a)'],
      'Bombeiros (as)': ['Bombeiros (as)', 'Bombeiro (a)'],
      'Médicos (as) / Ambulatório': ['Médicos (as) / Ambulatório', 'Medicos (as) / Ambulatorio', 'Médico (a)', 'Medico (a)'],
      'Enfermeiros (as)': ['Enfermeiros (as)', 'Enfermeiro (a)'],
      'Irmandade': ['Irmandade']
    };
    const APOIO_IRM_ORD = Object.keys(APOIO_LABEL_SYNONYMS);

    const MIN_LABEL_SYNONYMS = {
      'Ancião': ['Ancião','Anciao'],
      'Diácono': ['Diácono','Diacono'],
      'Cooperador do Ofício': ['Cooperador do Ofício','Cooperador do Oficio'],
      'Cooperador de Jovens': ['Cooperador de Jovens'],
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
      
      // Só processa se for do local especificado
      if (localEnsaioRow.toLowerCase() !== localEnsaio.toLowerCase()) continue;
      
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
      } else if (x.instrumento) {
        // Mapeia o instrumento para a lista padrão
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
      'Porteiros (as)': ['Porteiros (as)', 'Porteiro (a)'],
      'Bombeiros (as)': ['Bombeiros (as)', 'Bombeiro (a)'],
      'Médicos (as) / Ambulatório': ['Médicos (as) / Ambulatório', 'Medicos (as) / Ambulatorio', 'Médico (a)', 'Medico (a)'],
      'Enfermeiros (as)': ['Enfermeiros (as)', 'Enfermeiro (a)'],
      'Irmandade': ['Irmandade']
    };
    const APOIO_IRM_ORD = Object.keys(APOIO_LABEL_SYNONYMS);

    const MIN_LABEL_SYNONYMS = {
      'Ancião': ['Ancião','Anciao'],
      'Diácono': ['Diácono','Diacono'],
      'Cooperador do Ofício': ['Cooperador do Ofício','Cooperador do Oficio'],
      'Cooperador de Jovens': ['Cooperador de Jovens'],
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
      
      // Só processa se for do local especificado
      if (localEnsaioRow.toLowerCase() !== localEnsaio.toLowerCase()) continue;
      
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
      } else if (x.instrumento) {
        // Mapeia o instrumento para a lista padrão
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
          'irmao': 'Irmandade'
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
      'Porteiros (as)': ['Porteiros (as)', 'Porteiro (a)'],
      'Bombeiros (as)': ['Bombeiros (as)', 'Bombeiro (a)'],
      'Médicos (as) / Ambulatório': ['Médicos (as) / Ambulatório', 'Medicos (as) / Ambulatorio', 'Médico (a)', 'Medico (a)'],
      'Enfermeiros (as)': ['Enfermeiros (as)', 'Enfermeiro (a)'],
      'Irmandade': ['Irmandade']
    };
    const APOIO_IRM_ORD = Object.keys(APOIO_LABEL_SYNONYMS);

    const MIN_LABEL_SYNONYMS = {
      'Ancião': ['Ancião','Anciao'],
      'Diácono': ['Diácono','Diacono'],
      'Cooperador do Ofício': ['Cooperador do Ofício','Cooperador do Oficio'],
      'Cooperador de Jovens': ['Cooperador de Jovens'],
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
      
      // Só processa se for do local especificado
      if (localEnsaioRow.toLowerCase() !== localEnsaio.toLowerCase()) continue;
      
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
      } else if (x.instrumento) {
        // Mapeia o instrumento para a lista padrão
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
          'irmao': 'Irmandade'
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
      'Porteiros (as)': ['Porteiros (as)', 'Porteiro (a)'],
      'Bombeiros (as)': ['Bombeiros (as)', 'Bombeiro (a)'],
      'Médicos (as) / Ambulatório': ['Médicos (as) / Ambulatório', 'Medicos (as) / Ambulatorio', 'Médico (a)', 'Medico (a)'],
      'Enfermeiros (as)': ['Enfermeiros (as)', 'Enfermeiro (a)'],
      'Irmandade': ['Irmandade']
    };
    const APOIO_IRM_ORD = Object.keys(APOIO_LABEL_SYNONYMS);

    const MIN_LABEL_SYNONYMS = {
      'Ancião': ['Ancião','Anciao'],
      'Diácono': ['Diácono','Diacono'],
      'Cooperador do Ofício': ['Cooperador do Ofício','Cooperador do Oficio'],
      'Cooperador de Jovens': ['Cooperador de Jovens'],
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
      
      // Só processa se for do local especificado
      if (localEnsaioRow.toLowerCase() !== localEnsaio.toLowerCase()) continue;
      
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
      } else if (x.instrumento) {
        // Mapeia o instrumento para a lista padrão
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
          'irmao': 'Irmandade'
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
      'Porteiros (as)': ['Porteiros (as)', 'Porteiro (a)'],
      'Bombeiros (as)': ['Bombeiros (as)', 'Bombeiro (a)'],
      'Médicos (as) / Ambulatório': ['Médicos (as) / Ambulatório', 'Medicos (as) / Ambulatorio', 'Médico (a)', 'Medico (a)'],
      'Enfermeiros (as)': ['Enfermeiros (as)', 'Enfermeiro (a)'],
      'Irmandade': ['Irmandade']
    };
    const APOIO_IRM_ORD = Object.keys(APOIO_LABEL_SYNONYMS);

    const MIN_LABEL_SYNONYMS = {
      'Ancião': ['Ancião','Anciao'],
      'Diácono': ['Diácono','Diacono'],
      'Cooperador do Ofício': ['Cooperador do Ofício','Cooperador do Oficio'],
      'Cooperador de Jovens': ['Cooperador de Jovens'],
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
      
      // Só processa se for do local especificado
      if (localEnsaioRow.toLowerCase() !== localEnsaio.toLowerCase()) continue;
      
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
      } else if (x.instrumento) {
        // Mapeia o instrumento para a lista padrão
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
          'irmao': 'Irmandade'
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
      'Porteiros (as)': ['Porteiros (as)', 'Porteiro (a)'],
      'Bombeiros (as)': ['Bombeiros (as)', 'Bombeiro (a)'],
      'Médicos (as) / Ambulatório': ['Médicos (as) / Ambulatório', 'Medicos (as) / Ambulatorio', 'Médico (a)', 'Medico (a)'],
      'Enfermeiros (as)': ['Enfermeiros (as)', 'Enfermeiro (a)'],
      'Irmandade': ['Irmandade']
    };
    const APOIO_IRM_ORD = Object.keys(APOIO_LABEL_SYNONYMS);

    const MIN_LABEL_SYNONYMS = {
      'Ancião': ['Ancião','Anciao'],
      'Diácono': ['Diácono','Diacono'],
      'Cooperador do Ofício': ['Cooperador do Ofício','Cooperador do Oficio'],
      'Cooperador de Jovens': ['Cooperador de Jovens'],
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
      
      // Só processa se for do local especificado
      if (localEnsaioRow.toLowerCase() !== localEnsaio.toLowerCase()) continue;
      
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
      } else if (x.instrumento) {
        // Mapeia o instrumento para a lista padrão
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
          'irmao': 'Irmandade'
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
      'Porteiros (as)': ['Porteiros (as)', 'Porteiro (a)'],
      'Bombeiros (as)': ['Bombeiros (as)', 'Bombeiro (a)'],
      'Médicos (as) / Ambulatório': ['Médicos (as) / Ambulatório', 'Medicos (as) / Ambulatorio', 'Médico (a)', 'Medico (a)'],
      'Enfermeiros (as)': ['Enfermeiros (as)', 'Enfermeiro (a)'],
      'Irmandade': ['Irmandade']
    };
    const APOIO_IRM_ORD = Object.keys(APOIO_LABEL_SYNONYMS);

    const MIN_LABEL_SYNONYMS = {
      'Ancião': ['Ancião','Anciao'],
      'Diácono': ['Diácono','Diacono'],
      'Cooperador do Ofício': ['Cooperador do Ofício','Cooperador do Oficio'],
      'Cooperador de Jovens': ['Cooperador de Jovens'],
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
function mapearInstrumento(instrumento) {
  if (!instrumento) return null;
  
  const instrumentoNormalizado = formatarTexto(instrumento);
  
  const mapeamentoInstrumentos = {
    'Órgão': 'Organista',
    'Organista': 'Organista',
    'Violino': 'Violino',
    'Viola': 'Viola',
    'Violoncelo': 'Violoncelo',
    'Clarinete': 'Clarinete',
    'Flauta': 'Flauta transversal',
    'Flauta Transversal': 'Flauta transversal',
    'Saxofone Soprano (Reto)': 'Saxofone soprano (reto)',
    'Saxofone Soprano Reto': 'Saxofone soprano (reto)',
    'Trompete': 'Trompete',
    'Trombone': 'Trombone',
    'Tuba': 'Tuba',
    'Fagote': 'Fagote',
    'Oboé': 'Oboé',
    'Corne Inglês': 'Corne inglês',
    'Cornet': 'Cornet',
    'Flugelhorn': 'Flugelhorn',
    'Trompa': 'Trompa',
    'Acordeon': 'Acordeon',
    'Acordeão': 'Acordeon',
    'Eufônio': 'Eufônio',
    'Barítono (Pisto)': 'Barítono (pisto)',
    'Trombonito': 'Trombonito'
  };
  
  return mapeamentoInstrumentos[instrumentoNormalizado] || instrumentoNormalizado;
}

// Função para atualizar apenas coluna B preservando fórmulas em linhas específicas
function atualizarColunaBPreservandoFormulas(sheet, rotulo, valor, linhasComFormulas = [28, 41, 48, 50]) {
  console.log(`🔍 Buscando rótulo: "${rotulo}" com valor: ${valor}`);
  
  const tf = sheet.createTextFinder(rotulo).matchEntireCell(true);
  const matches = tf.findAll();
  
  console.log(`📋 Encontrados ${matches.length} matches para "${rotulo}"`);
  
  if (matches.length === 0) {
    console.log(`⚠️ Nenhum match encontrado para "${rotulo}"`);
    return;
  }
  
  matches.forEach((m, index) => {
    const row = m.getRow();
    const col = m.getColumn();
    const cellValue = m.getValue();
    
    console.log(`📍 Match ${index + 1}: Linha ${row}, Coluna ${col}, Valor: "${cellValue}"`);
    
    // Verifica se a linha contém fórmulas que devem ser preservadas
    if (linhasComFormulas.includes(row)) {
      console.log(`📊 Preservando fórmula na linha ${row} para: ${rotulo}`);
      return; // Não atualiza esta linha
    }
    
    // Atualiza apenas a coluna B (offset 0, 1)
    const targetCell = m.offset(0, 1);
    const oldValue = targetCell.getValue();
    targetCell.setValue(valor);
    console.log(`📊 Atualizado: ${rotulo} = ${valor} (linha ${row}, coluna ${col + 1}, valor anterior: ${oldValue})`);
  });
}

