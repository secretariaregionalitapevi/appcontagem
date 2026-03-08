/** Code.gs — Web App para receber JSON (text/plain) e escrever na planilha
 *  Operações suportadas: append | update | ping
 *  Planilha/aba: "Dados"
 *  Retorno: JSON via ContentService (status HTTP 200 sempre; usar ok:true/false)
 */

const DEFAULT_SHEET_ID = '1LGoW7lbYS4crpEdTfGR2evuH9kArZgqrvVbmi6buBoQ';
const SHEET_NAME = 'Dados';
const REQUIRED_HEADERS = [
  'UUID','NOME COMPLETO','COMUM','CIDADE','CARGO','INSTRUMENTO',
  'NAIPE_INSTRUMENTO','CLASSE_ORGANISTA','LOCAL_ENSAIO','DATA_ENSAIO',
  'REGISTRADO_POR','ANOTACOES'
];

// 🏛️ CIDADES DA REGIONAL ITAPEVI - Filtro para mapear TODAS as comuns dessas cidades
const CIDADES_REGIONAL = [
  'COTIA',
  'CAUCAIA DO ALTO', 
  'VARGEM GRANDE',
  'ITAPEVI',
  'JANDIRA',
  'FAZENDINHA',
  'PIRAPORA'
];

// 🏛️ FUNÇÃO: Verifica se uma comum pertence a uma das cidades da regional
function ehComumDaRegional(comum, cidade) {
  if (!comum || !cidade) return false;
  
  const cidadeUpper = cidade.toUpperCase().trim();
  const comumUpper = comum.toUpperCase().trim();
  
  // Verifica se a cidade está na lista da regional
  const cidadeEhDaRegional = CIDADES_REGIONAL.includes(cidadeUpper);
  
  // Se a cidade for da regional, inclui TODAS as comuns dessa cidade
  if (cidadeEhDaRegional) {
    return true;
  }
  
  // Verifica se o nome da comum contém o nome de uma cidade da regional
  // (para casos onde a comum tem o nome da cidade)
  for (const cidadeRegional of CIDADES_REGIONAL) {
    if (comumUpper.includes(cidadeRegional) || cidadeRegional.includes(comumUpper)) {
      return true;
    }
  }
  
  return false;
}

// 🏛️ FUNÇÃO: Verifica se é encarregado regional ou examinadora da regional
function ehEncarregadoRegionalOuExaminadora(x) {
  if (!x.cargo) return false;
  
  const cargoUpper = x.cargo.toUpperCase();
  
  // Verifica se é encarregado regional ou examinadora
  const ehEncarregadoRegional = cargoUpper === 'ENCARREGADO REGIONAL';
  const ehExaminadora = cargoUpper === 'EXAMINADORA';
  
  // Se for encarregado regional ou examinadora, verifica se é da regional
  if (ehEncarregadoRegional || ehExaminadora) {
    return ehComumDaRegional(x.comum, x.cidade);
  }
  
  return false;
}

/* ---------- Utils ---------- */

// JSON via ContentService (sem CORS custom: Apps Script não expõe API de status code aqui)
function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj || {}))
    .setMimeType(ContentService.MimeType.JSON);
}

// Funções utilitárias para processamento de dados
const norm = s => (s||'').toString().trim();
const key  = s => norm(s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const cap  = s => { s = norm(s); return s ? s[0].toUpperCase() + s.slice(1) : ''; };
const isYes = v => { const k = key(v); return k === 'sim' || k === 'yes' || k === 'y'; };

// Aliases para cargos
const aliasCargo = {
  'organista':'Organista',
  'instrutoras':'Instrutoras','instrutora':'Instrutoras',
  'instrutores':'Instrutores','instrutor':'Instrutores',
  'secretarios da musica':'Secretários da Música',
  'secretario da musica':'Secretários da Música',
  'secretárias da musica':'Secretárias da Música',
  'secretaria da musica':'Secretárias da Música',
  'examinadora':'Examinadora',
  'anciao':'Ancião','diacono':'Diácono',
  'cooperador do oficio':'Cooperador do Ofício','cooperador de jovens':'Cooperador de Jovens',
  'encarregado regional':'Encarregado Regional','encarregado local':'Encarregado Local',
  'porteiros (as)':'Porteiros (as)','porteiro (a)':'Porteiros (as)','porteiro':'Porteiros (as)',
  'bombeiros (as)':'Bombeiros (as)','bombeiro (a)':'Bombeiros (as)','bombeiro':'Bombeiros (as)',
  'medicos (as) / ambulatorio':'Médicos (as) / Ambulatório','medico (a)':'Médicos (as) / Ambulatório','medico':'Médicos (as) / Ambulatório',
  'enfermeiros (as)':'Enfermeiros (as)','enfermeiro (a)':'Enfermeiros (as)','enfermeiro':'Enfermeiros (as)',
  'irmandade':'Irmandade','irma':'Irmandade','irmao':'Irmandade'
};

// Abre/cria aba
// 🚀 VERSÃO OTIMIZADA: Cache de sheets para evitar múltiplas chamadas
let SHEETS_CACHE = {};

function openOrCreateSheet(name) {
  // 🚀 OTIMIZAÇÃO: Usa cache se disponível
  if (SHEETS_CACHE[name]) {
    return SHEETS_CACHE[name];
  }
  
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(name) || ss.insertSheet(name);
  
  // 🚀 OTIMIZAÇÃO: Armazena no cache
  SHEETS_CACHE[name] = sheet;
  return sheet;
}

// 🚀 FUNÇÃO AUXILIAR: Limpa cache quando necessário
function clearCache() {
  SHEETS_CACHE = {};
  SHEET_CACHE = null;
  HEADERS_CACHE = null;
  LAST_HEADER_CHECK = 0;
}

// 🚀 VERSÃO OTIMIZADA: Garante os cabeçalhos na linha 1 (completa se faltar)
function ensureHeaders(sh) {
  // 🚀 OTIMIZAÇÃO: Verifica apenas se necessário
  const lastCol = sh.getLastColumn();
  if (lastCol === 0) {
    // Sheet vazia - adiciona todos os headers de uma vez
    sh.getRange(1, 1, 1, REQUIRED_HEADERS.length).setValues([REQUIRED_HEADERS]);
    return;
  }

  // 🚀 OTIMIZAÇÃO: Lê apenas a primeira linha
  const current = sh.getRange(1, 1, 1, lastCol).getValues()[0].map(h => (h || '').toString().trim());
  
  // 🚀 OTIMIZAÇÃO: Verifica se todos os headers necessários existem
  const missing = REQUIRED_HEADERS.filter(h => !current.includes(h));
  if (missing.length) {
    // Adiciona apenas os headers faltantes
    const start = current.filter(Boolean).length + 1;
    sh.getRange(1, start, 1, missing.length).setValues([missing]);
  }
}

// Mapa header → índice de coluna (1-based)
function headerMap(sh) {
  const lastCol = sh.getLastColumn();
  const headers = sh.getRange(1, 1, 1, lastCol).getValues()[0].map(h => (h || '').toString().trim());
  const map = {};
  headers.forEach((h, i) => { if (h) map[h] = i + 1; });
  return map;
}

// Função para determinar se a pessoa é músico
function ehMusico(x) {
  return x.cargo !== 'Organista' && (!!x.instrumento || isYes(x.vai_tocar));
}

// Função melhorada para determinar se a pessoa esteve presente
function estevePresente(x) {
  // Considera presente se:
  // 1. Vai tocar (vai_tocar = 'sim')
  // 2. Tem instrumento definido (indica participação musical)
  // 3. Tem cargo musical, ministerial ou de apoio
  const vaiSim = isYes(x.vai_tocar);
  const temInstrumento = !!x.instrumento;
  
  // Lista expandida de cargos musicais
  const cargosMusicais = [
    'Organista', 'Examinadora', 'Instrutoras', 'Instrutores', 
    'Secretários da Música', 'Secretárias da Música',
    'Secretário da Música', 'Secretária da Música'
  ];
  
  // Lista expandida de cargos ministeriais
  const cargosMinisteriais = [
    'Ancião', 'Diácono', 'Cooperador do Ofício', 'Cooperador de Jovens', 
    'Encarregado Regional', 'Encarregado Local', 'Cooperador do ofício',
    'Cooperador de jovens', 'Encarregado regional', 'Encarregado local'
  ];
  
  // Lista expandida de cargos de apoio
  const cargosApoio = [
    'Porteiros (as)', 'Bombeiros (as)', 'Médicos (as) / Ambulatório', 
    'Enfermeiros (as)', 'Irmandade', 'Porteiro (a)', 'Bombeiro (a)',
    'Médico (a)', 'Enfermeiro (a)', 'Porteiro', 'Bombeiro', 'Médico', 'Enfermeiro'
  ];
  
  const temCargoMusical = cargosMusicais.includes(x.cargo);
  const temCargoMinisterial = cargosMinisteriais.includes(x.cargo);
  const temCargoApoio = cargosApoio.includes(x.cargo);
  
  // Considera presente se tem qualquer um dos critérios
  return vaiSim || temInstrumento || temCargoMusical || temCargoMinisterial || temCargoApoio;
}

// Função para classificar o tipo de cargo
function classificarCargo(cargo) {
  const cargoUpper = cargo.toUpperCase();
  
  // Cargos de organista/examinadora
  if (['ORGANISTA', 'EXAMINADORA', 'INSTRUTORAS'].includes(cargoUpper)) {
    return 'organista';
  }
  
  // Cargos de músico (tem instrumento ou vai tocar)
  if (['INSTRUTOR', 'INSTRUTORES'].includes(cargoUpper) || 
      cargoUpper.includes('SECRETÁRIO') && cargoUpper.includes('MÚSICA')) {
    return 'musico';
  }
  
  // Cargos ministeriais
  if (['ANCIÃO', 'DIÁCONO', 'COOPERADOR DO OFÍCIO', 'COOPERADOR DE JOVENS', 
       'ENCARREGADO REGIONAL', 'ENCARREGADO LOCAL'].includes(cargoUpper) ||
      cargoUpper.includes('COOPERADOR') || cargoUpper.includes('ENCARREGADO')) {
    return 'ministerio';
  }
  
  // Cargos de apoio
  if (['PORTEIRO', 'BOMBEIRO', 'MÉDICO', 'ENFERMEIRO', 'IRMANDADE'].includes(cargoUpper) ||
      cargoUpper.includes('PORTEIRO') || cargoUpper.includes('BOMBEIRO') ||
      cargoUpper.includes('MÉDICO') || cargoUpper.includes('ENFERMEIRO')) {
    return 'apoio';
  }
  
  // Se não se encaixa em nenhuma categoria, considera como "outros"
  return 'outros';
}

// Função para formatar texto corretamente (primeira letra maiúscula, resto minúsculo)
function formatarTexto(texto) {
  if (!texto || typeof texto !== 'string') return texto;
  
  // Converte para minúsculas primeiro
  const textoMinusculo = texto.toLowerCase();
  
  // Capitaliza apenas a primeira letra de cada palavra
  return textoMinusculo.replace(/\b\w/g, l => l.toUpperCase());
}

// Função principal para processar contagem detalhada por localidade
function processarPresentesPorLocalidade() {
  try {
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

    // Remove a aba "Contagem por Localidade" se existir, pois agora teremos abas individuais
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const oldContagemSheet = ss.getSheetByName('Contagem por Localidade');
    if (oldContagemSheet) {
      ss.deleteSheet(oldContagemSheet);
    }

    // Agrupa por local_ensaio com contagem detalhada
    const localMap = {};
    linhas.forEach(x => {
      if (!estevePresente(x)) return; // Só conta os presentes
      
      // 🏛️ FILTRO REGIONAL: Só processa comuns das cidades da regional
      if (!ehComumDaRegional(x.comum, x.cidade)) return;
      
      const local = x.local_ensaio;
      if (!localMap[local]) {
        localMap[local] = {
          // Instrumentos específicos
          instrumentos: {},
          // Cargos específicos
          cargos: {},
          // Totais por categoria
          totalMusicos: 0,
          totalOrganistas: 0,
          totalMinisterio: 0,
          totalApoio: 0,
          totalOutros: 0,
          // 🏛️ CONTADORES ESPECÍFICOS DA REGIONAL
          totalEncarregadosRegionais: 0,
          totalExaminadoras: 0,
          total: 0,
          // Detalhes para referência
          detalhes: []
        };
      }
      
      // Conta instrumentos específicos (exclui ÓRGÃO - só conta organistas por cargo)
      if (x.instrumento && x.instrumento.toUpperCase() !== 'ÓRGÃO') {
        const inst = x.instrumento;
        localMap[local].instrumentos[inst] = (localMap[local].instrumentos[inst] || 0) + 1;
      }
      
      // Conta cargos específicos
      if (x.cargo) {
        const cargo = x.cargo;
        localMap[local].cargos[cargo] = (localMap[local].cargos[cargo] || 0) + 1;
      }
      
      // Classifica por tipo de cargo para totais usando a nova função
      const tipoCargo = classificarCargo(x.cargo);
      
      if (tipoCargo === 'organista') {
        localMap[local].totalOrganistas++;
      } else if (tipoCargo === 'musico' || ehMusico(x)) {
        localMap[local].totalMusicos++;
      } else if (tipoCargo === 'ministerio') {
        localMap[local].totalMinisterio++;
      } else if (tipoCargo === 'apoio') {
        localMap[local].totalApoio++;
      } else if (tipoCargo === 'outros') {
        // Adiciona categoria "outros" se não existir
        if (!localMap[local].totalOutros) {
          localMap[local].totalOutros = 0;
        }
        localMap[local].totalOutros++;
      }
      
      localMap[local].total++;
      localMap[local].detalhes.push({
        nome: x.nome,
        comum: x.comum,
        cidade: x.cidade,
        cargo: x.cargo,
        instrumento: x.instrumento,
        nivel: x.nivel
      });
    });

    // Ordena as localidades alfabeticamente
    const locais = Object.keys(localMap).sort((a,b) => a.localeCompare(b,'pt-BR'));
    
    // Lista completa de instrumentos (como no print) - apenas primeira letra maiúscula
    const listaCompletaInstrumentos = [
      'Organista', 'Acordeon', 'Violino', 'Viola', 'Violoncelo', 'Flauta transversal',
      'Oboé', "Oboé d'amore", 'Corne inglês', 'Clarinete', 'Clarinete alto', 
      'Clarinete baixo (clarone)', 'Fagote', 'Saxofone soprano (reto)', 'Saxofone alto',
      'Saxofone tenor', 'Saxofone barítono', 'Trompete', 'Cornet', 'Flugelhorn', 'Trompa',
      'Trombone', 'Trombonito', 'Barítono (pisto)', 'Eufônio', 'Tuba'
    ];

    // Lista completa de cargos - apenas primeira letra maiúscula
    const listaCompletaCargos = [
      'Ancião', 'Diácono', 'Cooperador do ofício', 'Cooperador de jovens',
      'Encarregado regional', 'Encarregado local', 'Examinadora',
      'Secretária da música', 'Secretário da música', 'Instrutor', 'Instrutora',
      'Porteiro (a)', 'Bombeiro (a)', 'Médico (a)', 'Enfermeiro (a)', 'Irmandade'
    ];

    // Cria uma aba consolidada com separação por ensaio e totais gerais
    const shContagem = openOrCreateSheet('Geral');
    shContagem.clearContents();
    
    let row = 1;
    
    // Cabeçalho principal
    shContagem.getRange(row,1,1,1).setValue('CONTAGEM DETALHADA POR LOCALIDADE DO ENSAIO').setFontWeight('bold').setFontSize(14);
    shContagem.getRange(row,1,1,1).setBackground('#4285f4').setFontColor('white');
    row += 2;

    // Processa cada localidade
    locais.forEach(local => {
      const dados = localMap[local];
      const nomeCidade = formatarTexto(local);
      
      // Título da localidade
      shContagem.getRange(row,1,1,1).setValue(`📍 ${nomeCidade}`).setFontWeight('bold').setFontSize(12);
      shContagem.getRange(row,1,1,1).setBackground('#e8f0fe');
      row += 2;
      
      // INSTRUMENTOS
      const instrumentos = Object.keys(dados.instrumentos).sort();
      if (instrumentos.length > 0) {
        shContagem.getRange(row,1,1,1).setValue('🎵 INSTRUMENTOS').setFontWeight('bold');
        shContagem.getRange(row,2,1,1).setValue('QUANTIDADE').setFontWeight('bold');
        shContagem.getRange(row,2,1,1).setHorizontalAlignment('center');
        row++;
        
        instrumentos.forEach(inst => {
          shContagem.getRange(row,1,1,2).setValues([[formatarTexto(inst), dados.instrumentos[inst]]]);
          shContagem.getRange(row,2,1,1).setHorizontalAlignment('center');
          row++;
        });
        
        // Linha separadora após instrumentos
        shContagem.getRange(row,1,1,2).setValues([['', '']]);
        shContagem.getRange(row,1,1,2).setBorder(true, true, true, true, true, true, '#cccccc', SpreadsheetApp.BorderStyle.SOLID);
        row++;
      }
      
      // CARGOS
      const cargos = Object.keys(dados.cargos).sort();
      if (cargos.length > 0) {
        shContagem.getRange(row,1,1,1).setValue('👥 CARGOS').setFontWeight('bold');
        shContagem.getRange(row,2,1,1).setValue('QUANTIDADE').setFontWeight('bold');
        shContagem.getRange(row,2,1,1).setHorizontalAlignment('center');
        row++;
        
        cargos.forEach(cargo => {
          shContagem.getRange(row,1,1,2).setValues([[formatarTexto(cargo), dados.cargos[cargo]]]);
          shContagem.getRange(row,2,1,1).setHorizontalAlignment('center');
          row++;
        });
        
        // Linha separadora após cargos
        shContagem.getRange(row,1,1,2).setValues([['', '']]);
        shContagem.getRange(row,1,1,2).setBorder(true, true, true, true, true, true, '#cccccc', SpreadsheetApp.BorderStyle.SOLID);
        row++;
      }
      
      // RESUMO DA LOCALIDADE
      shContagem.getRange(row,1,1,1).setValue('📊 RESUMO').setFontWeight('bold');
      shContagem.getRange(row,2,1,1).setValue('QUANTIDADE').setFontWeight('bold');
      shContagem.getRange(row,2,1,1).setHorizontalAlignment('center');
      row++;
      
      shContagem.getRange(row,1,1,2).setValues([['Músicos', dados.totalMusicos]]);
      shContagem.getRange(row,2,1,1).setHorizontalAlignment('center');
      row++;
      shContagem.getRange(row,1,1,2).setValues([['Organistas', dados.totalOrganistas]]);
      shContagem.getRange(row,2,1,1).setHorizontalAlignment('center');
      row++;
      shContagem.getRange(row,1,1,2).setValues([['Ministério', dados.totalMinisterio]]);
      shContagem.getRange(row,2,1,1).setHorizontalAlignment('center');
      row++;
      shContagem.getRange(row,1,1,2).setValues([['Apoio', dados.totalApoio]]);
      shContagem.getRange(row,2,1,1).setHorizontalAlignment('center');
      row++;
      // Adiciona categoria "outros" se existir
      if (dados.totalOutros && dados.totalOutros > 0) {
        shContagem.getRange(row,1,1,2).setValues([['Outros', dados.totalOutros]]);
        shContagem.getRange(row,2,1,1).setHorizontalAlignment('center');
        row++;
      }
      shContagem.getRange(row,1,1,2).setValues([['TOTAL', dados.total]]).setFontWeight('bold');
      shContagem.getRange(row,1,1,2).setBackground('#ffeb3b');
      shContagem.getRange(row,2,1,1).setHorizontalAlignment('center');
      
      // Linha separadora final da localidade
      row++;
      shContagem.getRange(row,1,1,2).setValues([['', '']]);
      shContagem.getRange(row,1,1,2).setBorder(true, true, true, true, true, true, '#cccccc', SpreadsheetApp.BorderStyle.SOLID);
      row += 2; // Espaço entre localidades
    });

    // TOTAIS GERAIS
    shContagem.getRange(row,1,1,1).setValue('🎯 TOTAIS GERAIS').setFontWeight('bold').setFontSize(12);
    shContagem.getRange(row,1,1,1).setBackground('#ff9800').setFontColor('white');
    row += 2;
    
    // Agrega todos os instrumentos
    const todosInstrumentos = {};
    const todosCargos = {};
    let totalGeralMusicos = 0, totalGeralOrganistas = 0, totalGeralMinisterio = 0, totalGeralApoio = 0, totalGeralOutros = 0, totalGeral = 0;
    
    locais.forEach(local => {
      const dados = localMap[local];
      
      // Agrega instrumentos (exclui ÓRGÃO - só conta organistas por cargo)
      Object.keys(dados.instrumentos).forEach(inst => {
        if (inst.toUpperCase() !== 'ÓRGÃO') {
          todosInstrumentos[inst] = (todosInstrumentos[inst] || 0) + dados.instrumentos[inst];
        }
      });
      
      // Agrega cargos
      Object.keys(dados.cargos).forEach(cargo => {
        todosCargos[cargo] = (todosCargos[cargo] || 0) + dados.cargos[cargo];
      });
      
      // Agrega totais
      totalGeralMusicos += dados.totalMusicos;
      totalGeralOrganistas += dados.totalOrganistas;
      totalGeralMinisterio += dados.totalMinisterio;
      totalGeralApoio += dados.totalApoio;
      totalGeralOutros += (dados.totalOutros || 0);
      totalGeral += dados.total;
    });
    
    // INSTRUMENTOS GERAIS
    const instrumentosGerais = Object.keys(todosInstrumentos).sort();
    if (instrumentosGerais.length > 0) {
      shContagem.getRange(row,1,1,1).setValue('🎵 INSTRUMENTOS (TOTAL)').setFontWeight('bold');
      shContagem.getRange(row,2,1,1).setValue('QUANTIDADE').setFontWeight('bold');
      shContagem.getRange(row,2,1,1).setHorizontalAlignment('center');
      row++;
      
      instrumentosGerais.forEach(inst => {
        shContagem.getRange(row,1,1,2).setValues([[formatarTexto(inst), todosInstrumentos[inst]]]);
        shContagem.getRange(row,2,1,1).setHorizontalAlignment('center');
        row++;
      });
      
      // Linha separadora após instrumentos gerais
      shContagem.getRange(row,1,1,2).setValues([['', '']]);
      shContagem.getRange(row,1,1,2).setBorder(true, true, true, true, true, true, '#cccccc', SpreadsheetApp.BorderStyle.SOLID);
      row++;
    }
    
    // CARGOS GERAIS
    const cargosGerais = Object.keys(todosCargos).sort();
    if (cargosGerais.length > 0) {
      shContagem.getRange(row,1,1,1).setValue('👥 CARGOS (TOTAL)').setFontWeight('bold');
      shContagem.getRange(row,2,1,1).setValue('QUANTIDADE').setFontWeight('bold');
      shContagem.getRange(row,2,1,1).setHorizontalAlignment('center');
      row++;
      
      cargosGerais.forEach(cargo => {
        shContagem.getRange(row,1,1,2).setValues([[formatarTexto(cargo), todosCargos[cargo]]]);
        shContagem.getRange(row,2,1,1).setHorizontalAlignment('center');
        row++;
      });
      
      // Linha separadora após cargos gerais
      shContagem.getRange(row,1,1,2).setValues([['', '']]);
      shContagem.getRange(row,1,1,2).setBorder(true, true, true, true, true, true, '#cccccc', SpreadsheetApp.BorderStyle.SOLID);
      row++;
    }
    
    // RESUMO GERAL
    shContagem.getRange(row,1,1,1).setValue('📊 RESUMO GERAL').setFontWeight('bold');
    shContagem.getRange(row,2,1,1).setValue('QUANTIDADE').setFontWeight('bold');
    shContagem.getRange(row,2,1,1).setHorizontalAlignment('center');
    row++;
    
    shContagem.getRange(row,1,1,2).setValues([['Músicos', totalGeralMusicos]]);
    shContagem.getRange(row,2,1,1).setHorizontalAlignment('center');
    row++;
    shContagem.getRange(row,1,1,2).setValues([['Organistas', totalGeralOrganistas]]);
    shContagem.getRange(row,2,1,1).setHorizontalAlignment('center');
    row++;
    shContagem.getRange(row,1,1,2).setValues([['Ministério', totalGeralMinisterio]]);
    shContagem.getRange(row,2,1,1).setHorizontalAlignment('center');
    row++;
    shContagem.getRange(row,1,1,2).setValues([['Apoio', totalGeralApoio]]);
    shContagem.getRange(row,2,1,1).setHorizontalAlignment('center');
    row++;
    // Adiciona categoria "outros" se existir
    if (totalGeralOutros > 0) {
      shContagem.getRange(row,1,1,2).setValues([['Outros', totalGeralOutros]]);
      shContagem.getRange(row,2,1,1).setHorizontalAlignment('center');
      row++;
    }
    shContagem.getRange(row,1,1,2).setValues([['TOTAL GERAL', totalGeral]]).setFontWeight('bold');
    shContagem.getRange(row,1,1,2).setBackground('#ffeb3b');
    shContagem.getRange(row,2,1,1).setHorizontalAlignment('center');

    // Formatação final
    try { 
      shContagem.autoResizeColumns(1, 1); // Auto-resize apenas coluna A
      shContagem.setColumnWidth(2, 120); // Largura fixa de 120 para coluna B
    } catch(e){}
    try { 
      shContagem.getDataRange().setFontFamily('Arial').setFontSize(11); 
      // Centraliza toda a coluna B
      const lastRow = shContagem.getLastRow();
      if (lastRow > 0) {
        shContagem.getRange(1, 2, lastRow, 1).setHorizontalAlignment('center');
      }
    } catch(e){}
    try { shContagem.setFrozenRows(1); } catch(e){}


    return {
      ok: true,
      locais: locais.length,
      totalPresentes: locais.reduce((acc, local) => acc + localMap[local].total, 0),
      detalhes: {
        locais: locais
      }
    };

  } catch (error) {
    console.error('Erro ao processar contagem por localidade:', error);
    throw error;
  }
}

/* ---------- Webhook ---------- */

// 🚀 VERSÃO ULTRA-OTIMIZADA: Cache global para evitar operações repetitivas
let SHEET_CACHE = null;
let HEADERS_CACHE = null;
let LAST_HEADER_CHECK = 0;

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

    // 🚀 OTIMIZAÇÃO: Cache da sheet para evitar múltiplas chamadas
    if (!SHEET_CACHE) {
      SHEET_CACHE = openOrCreateSheet(SHEET_NAME);
    }
    const sh = SHEET_CACHE;

    // 🚀 OTIMIZAÇÃO: Verifica headers apenas uma vez por minuto
    const now = Date.now();
    if (!HEADERS_CACHE || (now - LAST_HEADER_CHECK) > 60000) {
      ensureHeaders(sh);
      HEADERS_CACHE = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(h => (h || '').toString().trim());
      LAST_HEADER_CHECK = now;
    }

    if (op === 'append') {
      const data = body?.data || {};

      // 🚀 OTIMIZAÇÃO: Defaults mínimos e diretos
      if (!data['UUID']) data['UUID'] = Utilities.getUuid();
      if (!data['SYNC_STATUS']) data['SYNC_STATUS'] = 'PENDING';

      // 🚀 OTIMIZAÇÃO: Usa cache de headers
      const row = HEADERS_CACHE.map(h => (data[h] != null ? data[h] : ''));

      // 🚀 OTIMIZAÇÃO: appendRow direto sem verificações extras
      sh.appendRow(row);
      return jsonResponse({ ok: true, op: 'append', inserted: 1, uuid: data['UUID'] });
    }

    if (op === 'update') {
      const match = body?.match || {};
      const patch = body?.data || {};
      if (!Object.keys(match).length) return jsonResponse({ ok: false, error: 'match vazio' });
      if (!Object.keys(patch).length) return jsonResponse({ ok: false, error: 'data vazio' });

      const lastRow = sh.getLastRow();
      if (lastRow < 2) return jsonResponse({ ok: true, op: 'update', updated: 0, rows: [] });

      // 🚀 OTIMIZAÇÃO: Usa cache de headers
      const headers = HEADERS_CACHE;
      const values = sh.getRange(2, 1, lastRow - 1, headers.length).getValues();

      const matchKeys = Object.keys(match);
      const patchedRows = [];

      // 🚀 OTIMIZAÇÃO: Loop otimizado com break early
      for (let r = 0; r < values.length; r++) {
        const row = values[r];
        let matchFound = true;
        
        for (const k of matchKeys) {
          const idx = headers.indexOf(k);
          if (idx === -1 || (row[idx] ?? '').toString() !== (match[k] ?? '').toString()) {
            matchFound = false;
            break;
          }
        }
        
        if (!matchFound) continue;

        // 🚀 OTIMIZAÇÃO: Aplica patch em batch
        const updates = [];
        Object.keys(patch).forEach(k => {
          const idx = headers.indexOf(k);
          if (idx !== -1) {
            updates.push({ row: r + 2, col: idx + 1, value: patch[k] });
          }
        });
        
        // Aplica todas as atualizações de uma vez
        updates.forEach(update => {
          sh.getRange(update.row, update.col).setValue(update.value);
        });
        
        patchedRows.push(r + 2);
      }

      return jsonResponse({ ok: true, op: 'update', updated: patchedRows.length, rows: patchedRows });
    }

    return jsonResponse({ ok: false, error: 'op inválida' });
  } catch (err) {
    return jsonResponse({ ok: false, error: err?.message || String(err) });
  }
}

/* ---------- Funções de Conveniência ---------- */

// Função unificada para atualização completa do sistema
function atualizarSistemaCompleto() {
  try {
    console.log('🔄 Iniciando atualização completa do sistema...');
    
    // Executa todas as atualizações em sequência
    const resultados = {
      contagemLocalidade: null,
      contagemComum: null,
      timestamp: new Date().toISOString()
    };
    
    // 1. Atualiza contagem detalhada por localidade
    console.log('📊 Processando contagem detalhada por localidade...');
    resultados.contagemLocalidade = processarPresentesPorLocalidade();
    console.log('✅ Contagem por localidade concluída:', resultados.contagemLocalidade);
    
    // 2. Atualiza contagem por comum
    console.log('🏛️ Processando contagem por comum...');
    resultados.contagemComum = processarContagemPorComum();
    console.log('✅ Contagem por comum concluída:', resultados.contagemComum);
    
    // 3. Calcula totais gerais
    const totalGeral = (resultados.contagemLocalidade?.totalPresentes || 0) + 
                      (resultados.contagemComum?.totalPresentes || 0);
    
    console.log('🎯 Atualização completa finalizada!');
    console.log('📈 Resumo dos resultados:', {
      totalPresentes: totalGeral,
      locaisProcessados: resultados.contagemLocalidade?.locais || 0,
      comunsProcessados: resultados.contagemComum?.comuns || 0,
      timestamp: resultados.timestamp
    });
    
    return {
      ok: true,
      message: 'Sistema atualizado com sucesso',
      resultados: resultados,
      totalGeral: totalGeral
    };
    
  } catch (error) {
    console.error('❌ Erro na atualização completa do sistema:', error);
    return {
      ok: false,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

// Função para executar diretamente o processamento (útil para testes)
function executarAtualizacaoResumo() {
  try {
    const resultado = processarPresentesPorLocalidade();
    console.log('✅ Resumo atualizado com sucesso:', resultado);
    return resultado;
  } catch (error) {
    console.error('❌ Erro ao atualizar resumo:', error);
    throw error;
  }
}

// Função para criar menu personalizado (opcional)
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('🔄 Atualizar Dados')
    .addItem('🚀 Atualização Completa do Sistema', 'atualizarSistemaCompleto')
    .addSeparator()
    .addItem('📊 Relatório Geral', 'executarAtualizacaoResumo')
    .addItem('🏛️ Relatório por Comum', 'processarContagemPorComum')
    .addItem('🔄 Atualizar Agora (Compatibilidade)', 'atualizarAgora')
    .addToUi();
}

// Função de compatibilidade com o nome original
function atualizarAgora() {
  try {
    console.log('🔄 Executando atualização completa (modo compatibilidade)...');
    const resultado = atualizarSistemaCompleto();
    console.log('✅ Atualização concluída:', resultado);
    return resultado;
  } catch (error) {
    console.error('❌ Erro na atualização:', error);
    throw error;
  }
}

// Função para criar contagem por comum
function processarContagemPorComum() {
  try {
    console.log('🏛️ Iniciando processamento de contagem por comum...');
    
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

    // Cria a aba de contagem por comum
    const shComum = openOrCreateSheet('Comum');
    shComum.clearContents();

    // Agrupa por local de ensaio primeiro, depois por comum
    const localMap = {};
    const comumMap = {};
    
    linhas.forEach(x => {
      if (!estevePresente(x)) return; // Só conta os presentes
      
      const local = x.local_ensaio;
      const comum = x.comum;
      
      // Inicializa o local se não existir
      if (!localMap[local]) {
        localMap[local] = {};
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
      } else if (tipoCargo === 'outros') {
        localMap[local][comum].outros++;
        comumMap[comum].outros++;
      }
      
      // Verifica se é encarregado local
      if (x.cargo.toLowerCase().includes('encarregado local')) {
        localMap[local][comum].encarregadoLocal = true;
        localMap[local][comum].encarregadoNome = x.nome;
        comumMap[comum].encarregadoLocal = true;
        comumMap[comum].encarregadoNome = x.nome;
        comumMap[comum].encarregadoLocalEnsaio = local;
      }
      
      localMap[local][comum].total++;
      comumMap[comum].total++;
      
      // Adiciona o local à lista de locais da comum se não existir
      if (!comumMap[comum].locais.includes(local)) {
        comumMap[comum].locais.push(local);
      }
      
      localMap[local][comum].detalhes.push({
        nome: x.nome,
        cargo: x.cargo,
        instrumento: x.instrumento,
        nivel: x.nivel
      });
    });

    // Ordena os locais e comuns
    const locais = Object.keys(localMap).sort((a,b) => a.localeCompare(b,'pt-BR'));
    const comuns = Object.keys(comumMap).sort((a,b) => a.localeCompare(b,'pt-BR'));
    
    console.log(`🏛️ Locais encontrados: ${locais.length} - ${locais.join(', ')}`);
    console.log(`🏛️ Comuns encontrados: ${comuns.length} - ${comuns.join(', ')}`);
    
    let row = 1;
    
    // Cabeçalho principal
    shComum.getRange(row,1,1,1).setValue('CONTAGEM POR COMUM E LOCAL DE ENSAIO').setFontWeight('bold').setFontSize(14);
    shComum.getRange(row,1,1,1).setBackground('#4285f4').setFontColor('white');
    row += 2;

    // Processa cada local de ensaio
    locais.forEach(local => {
      const nomeLocal = formatarTexto(local);
      
      // Título do local
      shComum.getRange(row,1,1,1).setValue(`📍 ${nomeLocal}`).setFontWeight('bold').setFontSize(12);
      shComum.getRange(row,1,1,1).setBackground('#e8f0fe');
      row += 2;
      
      // Cabeçalho da tabela para este local
      shComum.getRange(row,1,1,10).setValues([['Comum','Cidade','Músicos','Organistas','Ministério','Apoio','Outros','Total','Encarregado Local','Nome']]).setFontWeight('bold');
      shComum.getRange(row,1,1,10).setBackground('#f0f8ff');
      row++;
      
      // Ordena as comuns deste local
      const comunsLocal = Object.keys(localMap[local]).sort((a,b) => a.localeCompare(b,'pt-BR'));
      
      // Dados por comum neste local
      comunsLocal.forEach(comum => {
        const dados = localMap[local][comum];
        
        shComum.getRange(row,1,1,10).setValues([[
          comum,
          dados.cidade,
          dados.musicos,
          dados.organistas,
          dados.ministerio,
          dados.apoio,
          dados.outros || 0,
          dados.total,
          dados.encarregadoLocal ? 'SIM' : 'NÃO',
          dados.encarregadoNome || ''
        ]]);
        
        // Destaca se tem encarregado local
        if (dados.encarregadoLocal) {
          shComum.getRange(row,1,1,10).setBackground('#e8f5e8');
        }
        
        row++;
      });
      
      // Linha separadora após cada local
      shComum.getRange(row,1,1,10).setValues([['', '', '', '', '', '', '', '', '', '']]);
      shComum.getRange(row,1,1,10).setBorder(true, true, true, true, true, true, '#cccccc', SpreadsheetApp.BorderStyle.SOLID);
      row += 2;
    });

    // Resumo geral por comum
    shComum.getRange(row,1,1,1).setValue('📊 RESUMO GERAL POR COMUM').setFontWeight('bold').setFontSize(12);
    shComum.getRange(row,1,1,1).setBackground('#ff9800').setFontColor('white');
    row += 2;
    
    // Cabeçalho do resumo geral
    shComum.getRange(row,1,1,10).setValues([['Comum','Cidade','Locais','Músicos','Organistas','Ministério','Apoio','Outros','Total','Encarregado']]).setFontWeight('bold');
    shComum.getRange(row,1,1,10).setBackground('#e8f0fe');
    row++;
    
    // Dados do resumo geral
    comuns.forEach(comum => {
      const dados = comumMap[comum];
      
      shComum.getRange(row,1,1,10).setValues([[
        comum,
        dados.cidade,
        dados.locais.join(', '),
        dados.musicos,
        dados.organistas,
        dados.ministerio,
        dados.apoio,
        dados.outros || 0,
        dados.total,
        dados.encarregadoLocal ? `SIM (${dados.encarregadoNome} - ${dados.encarregadoLocalEnsaio})` : 'NÃO'
      ]]);
      
      // Destaca se tem encarregado local
      if (dados.encarregadoLocal) {
        shComum.getRange(row,1,1,10).setBackground('#e8f5e8');
      }
      
      row++;
    });

    // Totais gerais
    const totalGeral = comuns.reduce((acc, comum) => {
      const dados = comumMap[comum];
      acc.musicos += dados.musicos;
      acc.organistas += dados.organistas;
      acc.ministerio += dados.ministerio;
      acc.apoio += dados.apoio;
      acc.outros += (dados.outros || 0);
      acc.total += dados.total;
      return acc;
    }, {musicos: 0, organistas: 0, ministerio: 0, apoio: 0, outros: 0, total: 0});

    shComum.getRange(row,1,1,10).setValues([[
      'TOTAL GERAL',
      '',
      '',
      totalGeral.musicos,
      totalGeral.organistas,
      totalGeral.ministerio,
      totalGeral.apoio,
      totalGeral.outros,
      totalGeral.total,
      ''
    ]]).setFontWeight('bold').setBackground('#ffeb3b');

    // Formatação final
    try { shComum.autoResizeColumns(1, shComum.getLastColumn()); } catch(e){}
    try { shComum.getDataRange().setFontFamily('Arial').setFontSize(11); } catch(e){}
    try { shComum.setFrozenRows(1); } catch(e){}

    console.log('✅ Contagem por comum processada com sucesso!');
    console.log(`📈 Resultado: ${locais.length} locais, ${comuns.length} comuns, ${totalGeral.total} presentes`);
    
    return {
      ok: true,
      locais: locais.length,
      comuns: comuns.length,
      totalPresentes: totalGeral.total,
      detalhes: totalGeral
    };

  } catch (error) {
    console.error('❌ Erro ao processar contagem por comum:', error);
    throw error;
  }
}
