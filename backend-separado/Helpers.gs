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

// Função para determinar se é encarregado regional

function ehEncarregadoRegional(cargo) {
  if (!cargo) return false;
  const cargoLower = cargo.toLowerCase();
  return cargoLower.includes('encarregado regional');
}

// Função para determinar se é examinador/examinadora

function ehExaminador(cargo) {
  if (!cargo) return false;
  const cargoLower = cargo.toLowerCase();
  return cargoLower.includes('examinadora') || cargoLower.includes('examinador');
}

// Função para converter data para formato YYYY-MM-DD

function converterDataParaFormato(dataEnsaio) {
  try {
    if (!dataEnsaio) {
      return null;
    }
    
    const dataStr = String(dataEnsaio).trim();
    
    if (dataStr.includes('/')) {
      // Formato DD/MM/YYYY ou DD/MM/YY
      const partes = dataStr.split('/');
      if (partes.length === 3) {
        const dia = partes[0].padStart(2, '0');
        const mes = partes[1].padStart(2, '0');
        let ano = partes[2];
        // Se ano tem 2 dígitos, assumir 2000+
        if (ano.length === 2) {
          ano = '20' + ano;
        }
        return `${ano}-${mes}-${dia}`;
      }
    } else if (dataStr.includes('-')) {
      // Formato YYYY-MM-DD ou DD-MM-YYYY
      const partes = dataStr.split('-');
      if (partes.length === 3) {
        // Se primeiro elemento tem 4 dígitos, é YYYY-MM-DD
        if (partes[0].length === 4) {
          return dataStr;
        } else {
          // DD-MM-YYYY -> YYYY-MM-DD
          return `${partes[2]}-${partes[1]}-${partes[0]}`;
        }
      }
    }
    
    return null;
  } catch (error) {
    return null;
  }
}

// Função OTIMIZADA: buscar TODOS os registros do local de uma vez
// Retorna array de registros ordenados por data descendente
// Função para buscar registros da tabela organistas_ensaio (último evento)
// Esta tabela contém o histórico de organistas que tocaram em ensaios anteriores
// Retorna os registros ordenados por data desc (mais recente primeiro)

function normalizarNome(nome) {
  if (!nome) return '';
  return String(nome)
    .toUpperCase()
    .trim()
    .replace(/\s+/g, ' ') // Remove espaços múltiplos
    .normalize('NFD') // Remove acentos
    .replace(/[\u0300-\u036f]/g, '');
}

// Função para resposta JSON

function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj || {}))
    .setMimeType(ContentService.MimeType.JSON);
}

// Função para abrir ou criar sheet

/**
 * Retorna o ID da planilha da regional com base no nome do local.
 * O mapeamento deve estar configurado nas Propriedades do Script como um JSON.
 * Chave: REGIONAL_MAPPING
 * Valor Exemplo: {"itapevi":"ID_PLANILHA", "cotia":"ID_PLANILHA", ...}
 */
function getRegionalId(local) {
  if (!local) return null;
  const l = local.toLowerCase().trim();
  
  const mappingStr = PropertiesService.getScriptProperties().getProperty('REGIONAL_MAPPING');
  if (mappingStr) {
    try {
      const mapping = JSON.parse(mappingStr);
      // Busca a chave que está contida no nome do local fornecido
      for (const key in mapping) {
        if (l.includes(key.toLowerCase())) {
          return mapping[key];
        }
      }
    } catch (e) {
      console.error('Erro ao ler REGIONAL_MAPPING:', e.message);
    }
  }

  // Fallback para os valores originais de Itapevi se a propriedade não estiver definida
  if (l.includes('itapevi')) return ITAPEVI_SHEET_ID;
  if (l.includes('cotia')) return COTIA_SHEET_ID;
  if (l.includes('caucaia')) return CAUCAIA_SHEET_ID;
  if (l.includes('jandira')) return JANDIRA_SHEET_ID;
  if (l.includes('fazendinha')) return FAZENDINHA_SHEET_ID;
  if (l.includes('pirapora')) return PIRAPORA_SHEET_ID;
  if (l.includes('vargem grande') || l.includes('vargemgrande')) return VARGEMGRANDE_SHEET_ID;
  
  return null;
}

// Função para acessar planilha externa de Cotia (funciona mesmo com planilha fechada)

function clearCache() {
  SHEETS_CACHE = {};
  SHEET_CACHE = null;
  HEADERS_CACHE = null;
  LAST_HEADER_CHECK = 0;
}

// 🚨 CRÍTICO: Função para garantir que os headers existem na planilha

function ensureHeaders(sh) {
  const lastCol = sh.getLastColumn();
  if (lastCol === 0) {
    // Sheet vazia - adiciona todos os headers de uma vez
    sh.getRange(1, 1, 1, REQUIRED_HEADERS.length).setValues([REQUIRED_HEADERS]);
    sh.getRange(1, 1, 1, REQUIRED_HEADERS.length).setFontWeight('bold');
    return;
  }

  // Lê apenas a primeira linha e normaliza para Uppercase para comparação
  const current = sh.getRange(1, 1, 1, lastCol).getValues()[0].map(h => (h || '').toString().trim().toUpperCase());
  
  // Verifica se todos os headers necessários existem (insensível a caixa)
  const missing = REQUIRED_HEADERS.filter(h => !current.includes(h.toUpperCase()));
  if (missing.length) {
    // Adiciona apenas os headers faltantes
    const start = lastCol + 1;
    sh.getRange(1, start, 1, missing.length).setValues([missing]);
    sh.getRange(1, start, 1, missing.length).setFontWeight('bold');
  }
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
    x.cargo.toLowerCase().includes('cooperador do ofício') ||
    x.cargo.toLowerCase().includes('cooperador do ofício ministerial') ||
    x.cargo.toLowerCase().includes('cooperador de jovens') ||
    x.cargo.toLowerCase().includes('cooperador de jovens e menores') ||
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
  
  // 🚨 CORREÇÃO: Incluir Secretária da Música (feminino) como organista
  // Mas NÃO incluir Secretário da Música (masculino)
  const isSecretariaMusica = (cargoLower.includes('secretária') || cargoLower.includes('secretaria')) &&
                             (cargoLower.includes('música') || cargoLower.includes('musica')) &&
                             !cargoLower.includes('secretário') && !cargoLower.includes('secretario');
  
  if (cargoLower.includes('organista') || cargoLower.includes('examinadora') || 
      cargoLower.includes('instrutora') || isSecretariaMusica) {
    return 'organista';
  }
  
  if (cargoLower.includes('ancião') || cargoLower.includes('diácono') || 
      cargoLower.includes('cooperador do ofício') || cargoLower.includes('cooperador do ofício ministerial') ||
      cargoLower.includes('cooperador de jovens') || cargoLower.includes('cooperador de jovens e menores') ||
      cargoLower.includes('encarregado') || 
      cargoLower.includes('secretária') || cargoLower.includes('secretaria') ||
      cargoLower.includes('secretário') || cargoLower.includes('secretario')) {
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

// Função robusta para mapear cargo exato para contagem nas abas Resumo
function mapearCargoParaContagem(cargoOriginal) {
  if (!cargoOriginal) return null;
  
  // Normaliza: minúsculas, remove acentos e espaços extras
  const cLower = cargoOriginal.toLowerCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  
  // Cargos ministeriais
  if (cLower.includes('anciao')) return 'Ancião';
  if (cLower.includes('diacono')) return 'Diácono';
  
  if (cLower.includes('cooperador de jovens')) return 'Cooperador de Jovens';
  // Fallback se for só "Cooperador do Ofício" ou "Cooperador"
  if (cLower.includes('cooperador')) return 'Cooperador do Ofício'; 
  
  if (cLower.includes('encarregado regional')) return 'Encarregado Regional';
  if (cLower.includes('encarregado local') || cLower.includes('encarregado de local') || cLower.includes('encarregado')) return 'Encarregado Local';
  
  if (cLower.includes('examinador')) return 'Examinadora';
  if (cLower.includes('organista')) return 'Organista';
  
  // Para Secretários(as) do GEM -> viram Instrutores(as)
  if (cLower.includes('secretaria') && cLower.includes('gem')) return 'Instrutora';
  if (cLower.includes('secretario') && cLower.includes('gem')) return 'Instrutor';
  
  // Para Secretários(as) da Música -> continuam Secretários(as)
  if (cLower.includes('secretario') && (cLower.includes('music') || cLower.includes('musica'))) return 'Secretário da Música';
  if (cLower.includes('secretaria') && (cLower.includes('music') || cLower.includes('musica') || !cLower.includes('municipio'))) return 'Secretária da Música';
  
  if (cLower.includes('instrutora')) return 'Instrutora';
  if (cLower.includes('instrutor')) return 'Instrutor';
  
  // Cargos de apoio
  if (cLower.includes('porteir')) return 'Porteiro (a)';
  if (cLower.includes('bombeir')) return 'Bombeiro (a)';
  if (cLower.includes('medic')) return 'Médico (a)';
  if (cLower.includes('enfermeir')) return 'Enfermeiro (a)';
  if (cLower.includes('irma')) return 'Irmandade';
  if (cLower.includes('musico')) return 'Músico';
  
  return null;
}

// Função para formatar texto corretamente

function formatarTexto(texto) {
  if (!texto) return '';
  // Converte para minúsculo e remove espaços extras
  const textoMinusculo = String(texto).toLowerCase().trim();
  // Capitaliza a primeira letra de cada palavra (lidando corretamente com acentos)
  return textoMinusculo.replace(/(?:^|\s)\S/g, l => l.toUpperCase());
}

// Função para comparar locais de ensaio de forma flexível

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

function diagnosticarRegionais() {
  console.log('======= DIAGNÓSTICO REGIONAIS =======');
  
  const regionais = [
    { nome: 'Itapevi',      id: ITAPEVI_SHEET_ID,      testLocal: 'Itapevi'      },
    { nome: 'Cotia',        id: COTIA_SHEET_ID,         testLocal: 'Cotia'        },
    { nome: 'Caucaia',      id: CAUCAIA_SHEET_ID,       testLocal: 'Caucaia'      },
    { nome: 'Jandira',      id: JANDIRA_SHEET_ID,       testLocal: 'Jandira'      },
    { nome: 'Fazendinha',   id: FAZENDINHA_SHEET_ID,    testLocal: 'Fazendinha'   },
    { nome: 'Pirapora',     id: PIRAPORA_SHEET_ID,      testLocal: 'Pirapora'     },
    { nome: 'Vargem Grande',id: VARGEMGRANDE_SHEET_ID,  testLocal: 'Vargem Grande'},
  ];
  
  regionais.forEach(r => {
    try {
      const ss = SpreadsheetApp.openById(r.id);
      const sheetNames = ss.getSheets().map(s => s.getName());
      const temRegistros = sheetNames.some(n => n.toLowerCase() === 'registros');
      console.log(`✅ ${r.nome}: Acesso OK | Abas: [${sheetNames.join(', ')}] | Tem "Registros": ${temRegistros ? 'SIM' : '❌ NÃO'}`);
      
      // Verifica o roteamento
      const rId = getRegionalId(r.testLocal);
      console.log(`   🔀 Roteamento "${r.testLocal}" -> ${rId === r.id ? '✅ Correto' : '❌ INCORRETO (retornou: ' + rId + ')'}`);
    } catch(e) {
      console.error(`❌ ${r.nome} (ID: ${r.id}): ERRO DE ACESSO - ${e.message}`);
      console.error(`   ⚠️ Causa provável: Script não tem permissão para acessar esta planilha.`);
      console.error(`   ✅ Solução: Compartilhe a planilha "${r.nome}" com o email da conta do Apps Script.`);
    }
  });
  
  console.log('');
  console.log('======= TESTE DE ESCRITA =======');
  // Tenta escrever um registro de teste na primeira regional acessível
  for (const r of regionais) {
    try {
      const ss = SpreadsheetApp.openById(r.id);
      const shRegional = openOrCreateSheet('Registros', r.id);
      ensureHeaders(shRegional);
      
      const testData = {
        'UUID': 'TESTE-DIAGNOSTICO-' + new Date().getTime(),
        'NOME COMPLETO': 'TESTE DIAGNÓSTICO',
        'COMUM': 'COMUM TESTE',
        'CIDADE': r.nome.toUpperCase(),
        'CARGO': 'TESTE',
        'NÍVEL': 'TESTE',
        'INSTRUMENTO': '',
        'NAIPE_INSTRUMENTO': '',
        'CLASSE_ORGANISTA': '',
        'LOCAL_ENSAIO': r.nome.toUpperCase(),
        'DATA_ENSAIO': new Date().toLocaleString('pt-BR'),
        'REGISTRADO_POR': 'DIAGNÓSTICO AUTOMÁTICO',
        'SYNC_STATUS': 'TESTE',
        'SYNCED_AT': new Date().toISOString(),
        'ANOTACOES': 'APAGAR - Registro de diagnóstico automático',
        'DUPLICATA': 'NÃO',
      };
      
      const lastCol = shRegional.getLastColumn();
      const headers = shRegional.getRange(1, 1, 1, lastCol).getValues()[0].map(h => (h || '').toString().trim().toUpperCase());
      const row = headers.map(h => testData[h] != null ? testData[h] : '');
      
      shRegional.appendRow(row);
      console.log(`✅ ESCRITA OK em "${r.nome}" > aba "Registros" - Teste de diagnóstico gravado com sucesso!`);
      console.log(`   ⚠️ Apague a linha de teste na planilha de ${r.nome}.`);
      break; // Testa só uma para não poluir
    } catch(e) {
      console.error(`❌ FALHA na escrita em "${r.nome}": ${e.message}`);
    }
  }
  
  console.log('======= FIM DO DIAGNÓSTICO =======');
}

/**
 * Testa o fluxo completo simulando um POST com dados reais
 */

function testarAppendRegional() {
  const dadosTeste = {
    op: 'append',
    sheet: 'Dados',
    data: {
      'UUID': 'TESTE-' + Utilities.getUuid(),
      'NOME COMPLETO': 'PESSOA TESTE',
      'COMUM': 'COTIA - CENTRAL',
      'CIDADE': 'COTIA',
      'CARGO': 'MÚSICO',
      'NÍVEL': 'OFICIALIZADO',
      'INSTRUMENTO': 'VIOLINO',
      'NAIPE_INSTRUMENTO': 'CORDAS',
      'CLASSE_ORGANISTA': '',
      'LOCAL_ENSAIO': 'Cotia',   // <- MUDE AQUI para testar outras regionais
      'DATA_ENSAIO': new Date().toLocaleString('pt-BR'),
      'REGISTRADO_POR': 'TESTE AUTOMÁTICO',
      'SYNC_STATUS': 'ATUALIZADO',
      'SYNCED_AT': new Date().toISOString(),
      'ANOTACOES': 'APAGAR - Teste automático',
      'DUPLICATA': 'NÃO',
    }
  };
  
  console.log('📤 Simulando POST com dados:', JSON.stringify(dadosTeste.data, null, 2));
  
  // Simula o processamento do doPost
  const data = dadosTeste.data;
  const sh = openOrCreateSheet(dadosTeste.sheet);
  ensureHeaders(sh);
  
  const recordUpper = {};
  Object.keys(data).forEach(k => recordUpper[k.toUpperCase()] = data[k]);
  
  const localEnsaioValue = (recordUpper['LOCAL_ENSAIO'] || '').toString().trim();
  const cidadeValue = (recordUpper['CIDADE'] || '').toString().trim();
  
  console.log(`📍 LOCAL_ENSAIO = "${localEnsaioValue}"`);
  console.log(`📍 CIDADE = "${cidadeValue}"`);
  
  let regionalId = getRegionalId(localEnsaioValue);
  if (!regionalId) regionalId = getRegionalId(cidadeValue);
  
  if (regionalId) {
    console.log(`✅ Regional identificada: ${regionalId}`);
    try {
      const shRegional = openOrCreateSheet('Registros', regionalId);
      ensureHeaders(shRegional);
      const lastCol = shRegional.getLastColumn();
      const headers = shRegional.getRange(1, 1, 1, lastCol).getValues()[0].map(h => (h || '').toString().trim().toUpperCase());
      const row = headers.map(h => recordUpper[h] != null ? recordUpper[h] : '');
      shRegional.appendRow(row);
      console.log(`✅ SUCESSO: Linha gravada na aba "Registros" da regional!`);
    } catch(e) {
      console.error(`❌ FALHA: ${e.message}`);
    }
  } else {
    console.error(`❌ Nenhuma regional identificada para LOCAL="${localEnsaioValue}", CIDADE="${cidadeValue}"`);
  }
}

/**
 * =====================================================================
 *  AUTO-SYNC: Sincroniza automaticamente da planilha mestre para regionais
 *  Execute `configurarTriggerAutoSync()` UMA VEZ para ativar.
 *  Depois, roda automaticamente a cada 5 minutos.
 * =====================================================================
 */

function sincronizarMestreParaRegionais() {
  console.log('🔄 [AUTO-SYNC] Iniciando sincronização mestre → regionais...');
  
  try {
    const ss = SpreadsheetApp.openById(DEFAULT_SHEET_ID);
    const shMestre = ss.getSheetByName(SHEET_NAME) || ss.getSheets()[0];
    
    const lastRow = shMestre.getLastRow();
    const lastCol = shMestre.getLastColumn();
    if (lastRow < 2 || lastCol < 1) {
      console.log('ℹ️ [AUTO-SYNC] Planilha mestre vazia, nada a sincronizar.');
      return;
    }
    
    const allData = shMestre.getRange(1, 1, lastRow, lastCol).getValues();
    const masterHeaders = allData[0].map(h => (h || '').toString().trim().toUpperCase());
    
    const idxUuid = masterHeaders.indexOf('UUID');
    const idxLocal = masterHeaders.indexOf('LOCAL_ENSAIO');
    const idxCidade = masterHeaders.indexOf('CIDADE');
    const idxComum = masterHeaders.indexOf('COMUM');
    
    if (idxUuid === -1) {
      console.warn('⚠️ [AUTO-SYNC] Coluna UUID não encontrada na mestre. Abortando.');
      return;
    }
    
    // Agrupar registros por regional
    const porRegional = {};
    
    for (let i = 1; i < allData.length; i++) {
      const row = allData[i];
      const uuid = (row[idxUuid] || '').toString().trim();
      const localValue = idxLocal >= 0 ? (row[idxLocal] || '').toString().trim() : '';
      const cidadeValue = idxCidade >= 0 ? (row[idxCidade] || '').toString().trim() : '';
      const comumValue = idxComum >= 0 ? (row[idxComum] || '').toString().trim() : '';
      
      if (!uuid) continue;
      
      // Determinar regional com fallback robusto (igual ao Router.gs)
      let regionalId = getRegionalId(localValue) || getRegionalId(cidadeValue) || getRegionalId(comumValue);
      if (!regionalId) continue;
      
      if (!porRegional[regionalId]) porRegional[regionalId] = [];
      
      // Converter linha em objeto com headers da mestre
      const record = {};
      masterHeaders.forEach((h, idx) => {
        record[h] = row[idx] != null ? row[idx] : '';
      });
      
      porRegional[regionalId].push({ uuid, record });
    }
    
    const todasRegionais = [
      COTIA_SHEET_ID,
      ITAPEVI_SHEET_ID,
      CAUCAIA_SHEET_ID,
      JANDIRA_SHEET_ID,
      FAZENDINHA_SHEET_ID,
      PIRAPORA_SHEET_ID,
      VARGEMGRANDE_SHEET_ID
    ].filter(id => !!id);

    let totalNovos = 0;
    
    // Para cada regional, verificar UUIDs existentes e inserir apenas novos
    for (let idxRegional = 0; idxRegional < todasRegionais.length; idxRegional++) {
      const regionalId = todasRegionais[idxRegional];
      const registros = porRegional[regionalId] || [];
       try {
        const progressoRegional = 62 + Math.round((idxRegional / Math.max(todasRegionais.length, 1)) * 28);
        updateExportProgress(
          progressoRegional,
          `Espelhando regional ${idxRegional + 1}/${todasRegionais.length}...`,
          'Atualizando destinos'
        );

        // Sync padrão para a regional
        const inseridos = mirrorToSpreadsheet(regionalId, registros, 'Registros');
        totalNovos += inseridos;

        // 🚨 NOVO: Após sincronizar registros, atualiza Dashboard e Listas automaticamente
        {
           console.log(`📊 [AUTO-SYNC] Atualizando painel completo para regional ${regionalId}...`);
           const ssReg = SpreadsheetApp.openById(regionalId);
           const localName = ssReg.getName().split(' - ')[0];
           const shReg = ssReg.getSheetByName('Registros');
           
           // Atualiza Resumo
           const shResumo = ssReg.getSheetByName('Resumo');
           if (shResumo) atualizarResumoContadorIncremental(shResumo, null, ssReg);
           
           // Atualiza Listas (Organistas e Ministério)
           if (shReg) {
             alimentarAbaOrganistasDestino(localName, ssReg, localName, shReg);
             alimentarAbaMinisterioDestino(localName, ssReg, localName, shReg);
           }
         }

        // 🚨 NOVO: Se a regional for Itapevi, espelhar também na Planilha do Cardoso
        if (regionalId === ITAPEVI_SHEET_ID) {
          try {
            console.log('📋 [MIRROR] Espelhando dados de Itapevi na Planilha do Cardoso...');
            mirrorToSpreadsheet(CARDOSO_SHEET_ID, registros, 'registros');
          } catch (mirrorErr) {
            console.error(`❌ [MIRROR] Erro ao espelhar para Cardoso: ${mirrorErr.message}`);
          }
        }

      } catch (regErr) {
        console.error(`❌ [AUTO-SYNC] Erro na regional ${regionalId}: ${regErr.message}`);
      }
    }
    
    console.log(`✅ [AUTO-SYNC] Concluído. ${totalNovos} registro(s) espelhado(s).`);
    
  } catch (e) {
    console.error(`❌ [AUTO-SYNC] Erro geral: ${e.message}`);
  }
}

/**
 * Função interna para sincronizar um conjunto de registros para uma planilha específica
 * @param {string} spreadsheetId - ID da planilha de destino
 * @param {Array} registros - Lista de {uuid, record}
 * @param {string} sheetName - Nome da aba (default: 'Registros')
 * @returns {number} Quantidade de registros inseridos
 */
function syncToSpreadsheet(spreadsheetId, registros, sheetName = 'Registros') {
  if (!spreadsheetId || !registros || registros.length === 0) return 0;
  
  const ss = SpreadsheetApp.openById(spreadsheetId);
  const sh = openOrCreateSheet(sheetName, spreadsheetId);
  ensureHeaders(sh);
  
  const regLastRow = sh.getLastRow();
  const regLastCol = sh.getLastColumn();
  const regHeaders = sh.getRange(1, 1, 1, regLastCol).getValues()[0].map(h => (h || '').toString().trim().toUpperCase());
  const regIdxUuid = regHeaders.indexOf('UUID');
  
  const uuidsExistentes = new Set();
  if (regLastRow > 1 && regIdxUuid >= 0) {
    const uuidCol = sh.getRange(2, regIdxUuid + 1, regLastRow - 1, 1).getValues();
    uuidCol.forEach(r => {
      const u = (r[0] || '').toString().trim();
      if (u) uuidsExistentes.add(u);
    });
  }
  
    let inseridos = 0;
    const loteNovasLinhas = [];
    
    for (const item of registros) {
      const uuid = item.uuid || (item.record ? item.record.UUID : null);
      if (!uuid || uuidsExistentes.has(uuid)) continue;
      
      const record = item.record || {};
      const recordUp = {};
      Object.keys(record).forEach(k => { recordUp[k.toUpperCase()] = record[k]; });
      
      const novaLinha = regHeaders.map(h => {
        const val = recordUp[h];
        if (h === 'REGISTRADO_POR') return normalizarRegistradoPor(val);
        return val != null ? val : '';
      });
      
      loteNovasLinhas.push(novaLinha);
      uuidsExistentes.add(uuid);
      inseridos++;
    }
    
    if (loteNovasLinhas.length > 0) {
      const startRow = regLastRow + 1;
      sh.getRange(startRow, 1, loteNovasLinhas.length, regHeaders.length).setValues(loteNovasLinhas);
      
      // 🚨 CRÍTICO: Força a gravação física na Regional para que o Resumo possa "ver" o novo dado
      SpreadsheetApp.flush();
      
      // Aplicar bordas e formatação em lote
      try {
        sh.getRange(startRow, 1, loteNovasLinhas.length, regHeaders.length).setBorder(true, true, true, true, true, true);
        if (sheetName === 'Organistas' || sheetName === 'Organistas'.toLowerCase()) {
          sh.setColumnWidth(6, 180);
        }
      } catch (e) { }
    }
  
  if (inseridos > 0) {
    console.log(`✅ [SYNC] ${inseridos} novo(s) registro(s) → [${ss.getName()}] Aba: ${sheetName}`);
  }
  
  return inseridos;
}

/**
 * Espelha completamente um conjunto de registros em uma planilha.
 * Diferente de syncToSpreadsheet, esta funcao remove do destino qualquer linha
 * que nao exista mais na fonte recebida.
 */
function mirrorToSpreadsheet(spreadsheetId, registros, sheetName = 'Registros') {
  if (!spreadsheetId) return 0;
  
  const ss = SpreadsheetApp.openById(spreadsheetId);
  const sh = openOrCreateSheet(sheetName, spreadsheetId);
  ensureHeaders(sh);
  
  const lastCol = Math.max(sh.getLastColumn(), REQUIRED_HEADERS.length);
  const headers = sh.getRange(1, 1, 1, lastCol).getValues()[0]
    .map(h => (h || '').toString().trim().toUpperCase());
  const effectiveHeaders = headers.filter(h => h);
  const values = (registros || []).map(item => {
    const record = item.record || item || {};
    const recordUp = {};
    Object.keys(record).forEach(k => {
      recordUp[String(k || '').toUpperCase()] = record[k];
    });
    return effectiveHeaders.map(h => {
      const val = recordUp[h];
      if (h === 'REGISTRADO_POR') return normalizarRegistradoPor(val);
      return val != null ? val : '';
    });
  });

  const lastRow = sh.getLastRow();
  if (lastRow > 1) {
    sh.getRange(2, 1, lastRow - 1, lastCol).clearContent();
  }

  if (values.length > 0) {
    sh.getRange(2, 1, values.length, effectiveHeaders.length).setValues(values);
  }

  SpreadsheetApp.flush();
  console.log(`OK [MIRROR] ${values.length} registro(s) espelhado(s) em [${ss.getName()}] Aba: ${sheetName}`);
  return values.length;
}

/**
 * Execute esta função UMA VEZ para ativar a sincronização automática a cada 5 minutos.
 * Não precisa executar novamente após configurar.
 */

function atualizarSistemaCompleto() {
  updateExportProgress(5, 'Iniciando...', 'Preparando atualização');
  exibirModalAtualizacaoSistema();
}

function executarAtualizacaoCompletaSistema() {
  try {
    console.log('🚀 Iniciando atualização completa: Supabase -> Matriz -> Regionais...');
    updateExportProgress(8, 'Conectando ao Supabase...', 'Preparando leitura');
    try { SpreadsheetApp.getActiveSpreadsheet().toast('Puxando estado atual do Supabase...', 'Atualização', 5); } catch(e) {}
    
    updateExportProgress(30, 'Lendo estado atual do Supabase...', 'Sincronizando fonte');
    const resultadoMatriz = atualizarMatrizDesdeSupabase();
    updateExportProgress(62, 'Matriz atualizada. Espelhando regionais...', 'Atualizando destinos');
    try { SpreadsheetApp.getActiveSpreadsheet().toast('Matriz atualizada. Espelhando regionais...', 'Atualização', 5); } catch(e) {}
    sincronizarMestreParaRegionais();
    updateExportProgress(92, 'Conferindo atualização final...', 'Finalizando');
    
    console.log('✅ Sistema reconciliado com sucesso!');
    try { SpreadsheetApp.getActiveSpreadsheet().toast('Matriz e regionais reconciliadas com sucesso.', 'Concluído', 5); } catch(e) {}
    updateExportProgress(100, 'Atualização concluída.', 'Concluído');
    return {
      ok: true,
      timestamp: new Date().toISOString(),
      resultado: resultadoMatriz
    };

  } catch (error) {
    console.error('❌ Erro na atualização completa:', error);
    updateExportProgress(100, 'Falha na atualização.', 'Erro');
    return {
      ok: false,
      error: error.message
    };
  }
}

function exibirModalAtualizacaoSistema() {
  const titulo = 'Atualização do Sistema';
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <base target="_top">
      <style>
        body {
          margin: 0;
          padding: 0;
          font-family: Arial, 'Helvetica Neue', sans-serif;
          overflow: hidden;
          background: #fff;
          color: #202124;
        }
        .card {
          width: 100%;
          height: 100vh;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          text-align: center;
          box-sizing: border-box;
          padding: 28px;
        }
        .spinner {
          width: 44px;
          height: 44px;
          border: 4px solid #f1f3f4;
          border-top: 4px solid #005ea2;
          border-radius: 50%;
          animation: spin .75s linear infinite;
          margin: 0 auto 22px auto;
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        h2 {
          margin: 0 0 10px 0;
          font-size: 18px;
          color: #1f2933;
          font-weight: 600;
        }
        p {
          margin: 0;
          font-size: 13px;
          color: #5f6368;
        }
        .hint {
          font-size: 11px;
          margin-top: 6px;
          color: #9aa0a6;
        }
        #statusBox,
        #sucessoBox,
        #erroBox {
          width: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
        }
        #sucessoBox,
        #erroBox {
          display: none;
        }
        .success-icon,
        .error-icon {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 28px;
          font-weight: 600;
          margin-bottom: 18px;
        }
        .success-icon {
          background: #e6f4ea;
          color: #188038;
        }
        .error-icon {
          background: #fce8e6;
          color: #d93025;
        }
        .summary {
          margin-top: 14px;
          padding: 10px 12px;
          width: 86%;
          max-width: 280px;
          border-radius: 10px;
          background: #f8f9fa;
          border: 1px solid #edf0f2;
          font-size: 12px;
          color: #3c4043;
          box-sizing: border-box;
        }
        .progress-wrap {
          width: 76%;
          max-width: 260px;
          height: 6px;
          background: #edf0f2;
          border-radius: 999px;
          overflow: hidden;
          margin-top: 18px;
        }
        #progressBar {
          width: 5%;
          height: 100%;
          background: #005ea2;
          border-radius: 999px;
          transition: width .35s ease;
        }
        #stepText {
          min-height: 16px;
        }
        #percentText {
          margin-top: 8px;
          font-size: 12px;
          font-weight: 600;
          color: #005ea2;
        }
      </style>
    </head>
    <body>
      <div class="card">
        <div id="statusBox">
          <div class="spinner"></div>
          <h2>Atualizando Sistema...</h2>
          <p id="stepText">Fonte: <b>Supabase</b> → Matriz → Regionais</p>
          <div class="progress-wrap"><div id="progressBar"></div></div>
          <p id="percentText">5%</p>
          <p class="hint">Aguarde alguns segundos...</p>
        </div>

        <div id="sucessoBox">
          <div class="success-icon">✓</div>
          <h2>Concluído!</h2>
          <p>Matriz e planilhas regionais atualizadas.</p>
          <div id="resultado" class="summary"></div>
          <p class="hint">Esta janela fechará sozinha.</p>
        </div>

        <div id="erroBox">
          <div class="error-icon">!</div>
          <h2>Falha na atualização</h2>
          <p id="erroMensagem"></p>
          <p class="hint">A matriz não foi sobrescrita se a leitura falhou.</p>
        </div>
      </div>

      <script>
        window.onload = function() {
          const progressBar = document.getElementById('progressBar');
          const percentText = document.getElementById('percentText');
          const stepText = document.getElementById('stepText');
          let currentPercent = 5;
          let serverPercent = 5;

          function paintProgress(value, allowComplete) {
            const limit = allowComplete ? 100 : 98;
            const next = Math.max(currentPercent, Math.min(limit, Number(value) || 5));
            currentPercent = next;
            progressBar.style.width = next + '%';
            percentText.textContent = Math.round(next) + '%';
          }

          const motionTimer = setInterval(function() {
            let ceiling = 28;
            if (serverPercent >= 90) {
              ceiling = 97;
            } else if (serverPercent >= 62) {
              ceiling = 88;
            } else if (serverPercent >= 30) {
              ceiling = 58;
            }
            if (currentPercent < ceiling) {
              const step = Math.max(0.25, (ceiling - currentPercent) * 0.035);
              paintProgress(currentPercent + step, false);
            }
          }, 450);

          let pollTimer = setInterval(function() {
            google.script.run
              .withSuccessHandler(function(progress) {
                if (!progress) return;
                const percent = Math.max(8, Math.min(100, progress.percent || 8));
                serverPercent = percent;
                paintProgress(percent, percent >= 100);
                if (progress.status) {
                  stepText.textContent = progress.status;
                }
              })
              .getProgressUpdate();
          }, 650);

          google.script.run
            .withSuccessHandler(function(res) {
              clearInterval(pollTimer);
              clearInterval(motionTimer);
              if (res && res.ok) {
                paintProgress(100, true);
                document.getElementById('statusBox').style.display = 'none';
                document.getElementById('sucessoBox').style.display = 'flex';
                const total = res.resultado && res.resultado.totalRegistros != null
                  ? res.resultado.totalRegistros
                  : 0;
                document.getElementById('resultado').textContent = total + ' registro(s) sincronizado(s).';
                setTimeout(function() { google.script.host.close(); }, 1600);
              } else {
                document.getElementById('statusBox').style.display = 'none';
                document.getElementById('erroBox').style.display = 'flex';
                document.getElementById('erroMensagem').textContent = (res && res.error) ? res.error : 'Erro desconhecido.';
              }
            })
            .withFailureHandler(function(err) {
              clearInterval(pollTimer);
              clearInterval(motionTimer);
              document.getElementById('statusBox').style.display = 'none';
              document.getElementById('erroBox').style.display = 'flex';
              document.getElementById('erroMensagem').textContent = err && err.message ? err.message : String(err);
            })
            .executarAtualizacaoCompletaSistema();
        };
      </script>
    </body>
    </html>
  `;

  const htmlOutput = HtmlService.createHtmlOutput(htmlContent)
    .setWidth(400)
    .setHeight(400)
    .setTitle('Sistema SAM');

  SpreadsheetApp.getUi().showModalDialog(htmlOutput, titulo);
}



// Função para criar menu personalizado

function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('🔄 Atualizar Dados')
    .addItem('🔁 Atualizar Supabase', 'atualizarSistemaCompleto')
    .addSeparator()
    .addItem('📤 Exportar para Cotia', 'executarExportarCotia')
    .addItem('📤 Exportar para Itapevi', 'executarExportarItapevi')
    .addItem('📤 Exportar para Caucaia', 'executarExportarCaucaia')
    .addItem('📤 Exportar para Jandira', 'executarExportarJandira')
    .addItem('📤 Exportar para Fazendinha', 'executarExportarFazendinha')
    .addItem('📤 Exportar para Pirapora', 'executarExportarPirapora')
    .addItem('📤 Exportar para VargemGrande', 'executarExportarVargemGrande')
    .addSeparator()        
    .addItem('🚀 Exportação de Alta Performance', 'executarExportacaoAltaPerformance')
    .addSeparator()
    .addItem('📊 Resumo por Ensaio', 'criarResumoPorEnsaio')
    .addItem('👥 Encarregados', 'criarResumoEncarregados')
    .addItem('📈 Relatório Detalhado', 'menuRelatorioDetalhado')
    .addSeparator()
    .addItem('📋 Registros SAM Desatualizado', 'menuListaSamDesatualizado')
    .addSeparator()
    .addItem('🟢 Ligar Auto-Sync Regional (5 min)', 'menuLigarAutoSync')
    .addItem('⚡ Sincronizar Agora (Manual)', 'menuSincronizarAgora')
    .addItem('🔴 Desligar Auto-Sync Regional', 'menuDesligarAutoSync')
    .addToUi();
}


function menuSincronizarAgora() {
  const ui = SpreadsheetApp.getUi();
  try {
    sincronizarMestreParaRegionais();
    ui.alert('⚡ Sincronizado!', 'Os registros novos foram espelhados nas planilhas regionais.', ui.ButtonSet.OK);
  } catch(e) {
    ui.alert('❌ Erro', e.message, ui.ButtonSet.OK);
  }
}


function diagnosticarIrmandade() {
  try {
    console.log('🔍 Diagnosticando problemas com irmandade...');
    
    const ui = SpreadsheetApp.getUi();
    
    const shDados = openOrCreateSheet(SHEET_NAME);
    const lastRow = shDados.getLastRow();
    const lastCol = shDados.getLastColumn();
    
    if (lastRow < 2) {
      ui.alert('❌ Erro', 'Não há dados abaixo do cabeçalho em "Dados".', ui.ButtonSet.OK);
      return;
    }

    const headerRow = shDados.getRange(1, 1, 1, lastCol).getDisplayValues()[0];
    const data = shDados.getRange(2, 1, lastRow - 1, lastCol).getDisplayValues();

    // Busca flexível pelos headers
    const idxNome = headerRow.findIndex(h => h && h.toString().toLowerCase().includes('nome'));
    const idxCargo = headerRow.findIndex(h => h && h.toString().toLowerCase().includes('cargo'));
    const idxComum = headerRow.findIndex(h => h && h.toString().toLowerCase().includes('comum'));
    const idxLocalEnsaio = headerRow.findIndex(h => h && h.toString().toLowerCase().includes('local_ensaio'));

    if (idxNome < 0 || idxCargo < 0) {
      ui.alert('❌ Erro', 'Colunas necessárias não encontradas', ui.ButtonSet.OK);
      return;
    }

    // Busca por possíveis irmandade
    const possiveisIrmandade = [];
    const todosCargos = new Set();
    
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const nome = norm(row[idxNome] || '');
      if (!nome) continue;

      const cargo = norm(row[idxCargo] || '');
      const comum = norm(row[idxComum] || '') || '(Sem comum)';
      const localEnsaio = norm(row[idxLocalEnsaio] || '') || '(Sem local definido)';
      
      if (!cargo) continue;
      
      const cargoLower = cargo.toLowerCase();
      todosCargos.add(cargoLower);
      
      // Verifica se pode ser irmandade
      if (cargoLower.includes('irm') || cargoLower.includes('irmandade')) {
        possiveisIrmandade.push({
          nome: nome,
          cargo: cargo,
          cargoLower: cargoLower,
          comum: comum,
          localEnsaio: localEnsaio,
          linha: i + 2
        });
      }
    }

    // Prepara mensagem
    let mensagem = `🔍 Diagnóstico de Irmandade\n\n`;
    mensagem += `📊 Total de possíveis irmandade encontrados: ${possiveisIrmandade.length}\n\n`;
    
    if (possiveisIrmandade.length === 0) {
      mensagem += `❌ Nenhuma irmandade foi encontrada!\n\n`;
      mensagem += `💡 Cargos únicos encontrados na planilha:\n\n`;
      
      const cargosOrdenados = Array.from(todosCargos).sort();
      cargosOrdenados.forEach(cargo => {
        mensagem += `• "${cargo}"\n`;
      });
      
      mensagem += `\n💡 Verifique se há dados com cargos como "irmão", "irmã", "irmãos", "irmãs" ou "irmandade" na planilha.`;
    } else {
      mensagem += `📋 Possíveis irmandade encontrados:\n\n`;
      
      possiveisIrmandade.forEach(irmao => {
        mensagem += `👤 **${irmao.nome}**\n`;
        mensagem += `   • Cargo original: "${irmao.cargo}"\n`;
        mensagem += `   • Cargo lowercase: "${irmao.cargoLower}"\n`;
        mensagem += `   • Comum: ${irmao.comum}\n`;
        mensagem += `   • Local: ${irmao.localEnsaio}\n`;
        mensagem += `   • Linha: ${irmao.linha}\n\n`;
      });
      
      mensagem += `💡 Se estes dados não estão aparecendo na coluna Irmandade, verifique:\n`;
      mensagem += `• Se a função classificarCargo() está mapeando corretamente\n`;
      mensagem += `• Se a lógica de identificação está funcionando\n`;
      mensagem += `• Se os dados estão sendo filtrados corretamente`;
    }

    ui.alert('🔍 Diagnóstico de Irmandade', mensagem, ui.ButtonSet.OK);
    
    console.log('🔍 Diagnóstico de irmandade concluído');
    
  } catch (error) {
    console.error('❌ Erro no diagnóstico de irmandade:', error);
    const ui = SpreadsheetApp.getUi();
    ui.alert('❌ Erro no Diagnóstico', `Erro: ${error.message}`, ui.ButtonSet.OK);
  }
}

// Função para criar resumo por ensaio

function criarResumoEncarregados() {
  try {
    console.log('👥 Iniciando criação de resumo de encarregados...');
    
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

    // Filtra apenas encarregados
    const encarregados = [];
    const encarregadosPorLocal = {};
    
    linhas.forEach(x => {
      if (!estevePresente(x)) return; // Só conta os presentes
      
      // Verifica se é encarregado local
      if (ehEncarregadoLocal(x.cargo)) {
        encarregados.push({
          nome: x.nome,
          comum: x.comum,
          cidade: x.cidade,
          cargo: x.cargo,
          localEnsaio: x.local_ensaio,
          instrumento: x.instrumento
        });
        
        // Agrupa por local
        if (!encarregadosPorLocal[x.local_ensaio]) {
          encarregadosPorLocal[x.local_ensaio] = [];
        }
        encarregadosPorLocal[x.local_ensaio].push({
          nome: x.nome,
          comum: x.comum,
          cidade: x.cidade,
          cargo: x.cargo,
          instrumento: x.instrumento
        });
      }
    });

    // Cria a aba de resumo de encarregados
    const shEncarregados = openOrCreateSheet('Encarregados');
    shEncarregados.clearContents();
    
    let row = 1;
    
    // Cabeçalho principal
    shEncarregados.getRange(row,1,1,1).setValue('RESUMO DE ENCARREGADOS').setFontWeight('bold').setFontSize(14);
    shEncarregados.getRange(row,1,1,1).setBackground('#4285f4').setFontColor('white');
    row += 2;

    // Pula direto para os dados dos encarregados

    // Dados dos encarregados organizados em blocos por local de ensaio
    if (encarregados.length === 0) {
      shEncarregados.getRange(row,1,1,6).setValues([['Nenhum encarregado encontrado', '', '', '', '', '']]);
      shEncarregados.getRange(row,1,1,6).setBackground('#ffebee');
      row++;
    } else {
      // Agrupa encarregados por local de ensaio
      const encarregadosPorEnsaio = {};
      encarregados.forEach(encarregado => {
        const local = encarregado.localEnsaio;
        if (!encarregadosPorEnsaio[local]) {
          encarregadosPorEnsaio[local] = [];
        }
        encarregadosPorEnsaio[local].push(encarregado);
      });
      
      // Ordena os locais de ensaio
      const locaisOrdenados = Object.keys(encarregadosPorEnsaio).sort((a, b) => a.localeCompare(b, 'pt-BR'));
      
      // Para cada local de ensaio, cria um bloco separado
      locaisOrdenados.forEach((local, index) => {
        const encarregadosLocal = encarregadosPorEnsaio[local].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
        
        // Título do bloco (exceto no primeiro)
        if (index > 0) {
          row++; // Linha em branco antes do novo bloco
        }
        
        // Título do local de ensaio
        shEncarregados.getRange(row,1,1,1).setValue(`📍 ${local} (${encarregadosLocal.length} encarregado${encarregadosLocal.length > 1 ? 's' : ''})`).setFontWeight('bold').setFontSize(12);
        shEncarregados.getRange(row,1,1,1).setBackground('#e8f0fe');
        row += 2;
        
        // Cabeçalho da tabela para este bloco
        shEncarregados.getRange(row,1,1,6).setValues([['Nome', 'Cargo', 'Comum', 'Cidade', 'Local do Ensaio', 'Instrumento']]).setFontWeight('bold');
        shEncarregados.getRange(row,1,1,6).setBackground('#f0f8ff');
        row++;
        
        // Dados dos encarregados deste local
        encarregadosLocal.forEach(encarregado => {
          shEncarregados.getRange(row,1,1,6).setValues([[
            encarregado.nome,
            encarregado.cargo,
            encarregado.comum,
            encarregado.cidade,
            encarregado.localEnsaio,
            encarregado.instrumento || '-'
          ]]);
          
          // Destaca encarregados regionais
          if (encarregado.cargo.toLowerCase().includes('regional')) {
            shEncarregados.getRange(row,1,1,6).setBackground('#fff3cd');
          } else {
            shEncarregados.getRange(row,1,1,6).setBackground('#e8f5e8');
          }
          
          row++;
        });
        
        // Linha separadora após cada bloco
        shEncarregados.getRange(row,1,1,6).setValues([['', '', '', '', '', '']]);
        shEncarregados.getRange(row,1,1,6).setBorder(true, true, true, true, true, true, '#cccccc', SpreadsheetApp.BorderStyle.SOLID);
        row++;
      });
    }

    row += 2;

    // Seção por local
    shEncarregados.getRange(row,1,1,1).setValue('ENCARREGADOS POR LOCAL DE ENSAIO').setFontWeight('bold').setFontSize(12);
    shEncarregados.getRange(row,1,1,1).setBackground('#e8f0fe');
    row += 2;

    // Cabeçalho da tabela por local
    shEncarregados.getRange(row,1,1,5).setValues([['Local do Ensaio', 'Nome do Encarregado', 'Comum', 'Cargo', 'Instrumento']]).setFontWeight('bold');
    shEncarregados.getRange(row,1,1,5).setBackground('#f0f8ff');
    row++;

    // Dados por local
    const locaisOrdenados = Object.keys(encarregadosPorLocal).sort((a, b) => a.localeCompare(b, 'pt-BR'));
    
    locaisOrdenados.forEach(local => {
      const encarregadosLocal = encarregadosPorLocal[local];
      
      encarregadosLocal.forEach(encarregado => {
        shEncarregados.getRange(row,1,1,5).setValues([[
          local,
          encarregado.nome,
          encarregado.comum,
          encarregado.cargo,
          encarregado.instrumento || '-'
        ]]);
        
        // Destaca encarregados regionais
        if (encarregado.cargo.toLowerCase().includes('regional')) {
          shEncarregados.getRange(row,1,1,5).setBackground('#fff3cd');
        } else {
          shEncarregados.getRange(row,1,1,5).setBackground('#e8f5e8');
        }
        
        row++;
      });
    });

    // Formatação
    shEncarregados.getRange(1, 1, row-1, 6).setBorder(true, true, true, true, true, true);
    try { shEncarregados.getDataRange().setFontFamily('Arial').setFontSize(11); } catch(e){}
    try { shEncarregados.setFrozenRows(1); } catch(e){}
    
    // Define larguras fixas para as colunas
    shEncarregados.setColumnWidth(1, 350); // A - Nome
    shEncarregados.setColumnWidth(2, 250); // B - Cargo
    shEncarregados.setColumnWidth(3, 340); // C - Comum
    shEncarregados.setColumnWidth(4, 180); // D - Cidade
    shEncarregados.setColumnWidth(5, 180); // E - Local do Ensaio
    shEncarregados.setColumnWidth(6, 225); // F - Instrumento

    // Calcula estatísticas para o retorno
    const totalEncarregados = encarregados.length;
    const locaisComEncarregados = Object.keys(encarregadosPorLocal).length;
    const locaisSemEncarregados = Object.keys(encarregadosPorLocal).length === 0 ? 0 : 
      new Set(linhas.filter(x => estevePresente(x)).map(x => x.local_ensaio)).size - locaisComEncarregados;

    console.log('✅ Resumo de encarregados criado com sucesso!');
    console.log(`📈 Resultado: ${totalEncarregados} encarregados em ${locaisComEncarregados} locais`);
    
    return {
      ok: true,
      totalEncarregados: totalEncarregados,
      locaisComEncarregados: locaisComEncarregados,
      locaisSemEncarregados: locaisSemEncarregados,
      detalhes: encarregadosPorLocal
    };

  } catch (error) {
    console.error('❌ Erro ao criar resumo de encarregados:', error);
    throw error;
  }
}

// Função para diagnosticar secretários da música

function diagnosticarSecretarioMusica() {
  try {
    console.log('🔍 Diagnosticando secretários da música...');
    
    const ui = SpreadsheetApp.getUi();
    
    const shDados = openOrCreateSheet(SHEET_NAME);
    const lastRow = shDados.getLastRow();
    const lastCol = shDados.getLastColumn();
    
    if (lastRow < 2) {
      ui.alert('❌ Erro', 'Não há dados abaixo do cabeçalho em "Dados".', ui.ButtonSet.OK);
      return;
    }

    const headerRow = shDados.getRange(1, 1, 1, lastCol).getDisplayValues()[0];
    const data = shDados.getRange(2, 1, lastRow - 1, lastCol).getDisplayValues();

    // Busca flexível pelos headers
    const idxNome = headerRow.findIndex(h => h && h.toString().toLowerCase().includes('nome'));
    const idxCargo = headerRow.findIndex(h => h && h.toString().toLowerCase().includes('cargo'));
    const idxInstrumento = headerRow.findIndex(h => h && h.toString().toLowerCase().includes('instrumento'));
    const idxLocalEnsaio = headerRow.findIndex(h => h && h.toString().toLowerCase().includes('local_ensaio'));

    if (idxNome < 0 || idxCargo < 0) {
      ui.alert('❌ Erro', 'Colunas necessárias não encontradas', ui.ButtonSet.OK);
      return;
    }

    // Busca por secretários da música
    const secretariosMusica = [];
    
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const nome = norm(row[idxNome] || '');
      if (!nome) continue;

      const cargo = norm(row[idxCargo] || '');
      const instrumento = norm(row[idxInstrumento] || '');
      const localEnsaio = norm(row[idxLocalEnsaio] || '') || '(Sem local definido)';
      
      if (!cargo) continue;
      
      const cargoLower = cargo.toLowerCase();
      
      // Verifica se é secretário da música
      if (cargoLower.includes('secretário da música') || cargoLower.includes('secretaria da musica') || 
          cargoLower.includes('secretarios da musica') || cargoLower.includes('secretarias da musica')) {
        
        secretariosMusica.push({
          nome: nome,
          cargo: cargo,
          instrumento: instrumento,
          localEnsaio: localEnsaio,
          linha: i + 2,
          cargoLower: cargoLower
        });
      }
    }

    // Prepara mensagem
    let mensagem = `🔍 Diagnóstico de Secretários da Música\n\n`;
    mensagem += `📊 Total de secretários da música encontrados: ${secretariosMusica.length}\n\n`;
    
    if (secretariosMusica.length === 0) {
      mensagem += `❌ Nenhum secretário da música foi encontrado na planilha!\n\n`;
      mensagem += `💡 Verifique se há dados com cargos como "secretário da música" na planilha.`;
    } else {
      mensagem += `📋 Secretários da música encontrados:\n\n`;
      
      secretariosMusica.forEach(sec => {
        mensagem += `👤 **${sec.nome}**\n`;
        mensagem += `   • Cargo: "${sec.cargo}"\n`;
        mensagem += `   • Instrumento: "${sec.instrumento || '(Sem instrumento)'}"\n`;
        mensagem += `   • Local: ${sec.localEnsaio}\n`;
        mensagem += `   • Linha: ${sec.linha}\n`;
        
        // Testa a lógica de exclusão
        const cargoLower = sec.cargoLower;
        const temInstrumento = sec.instrumento && sec.instrumento.trim() !== '';
        const deveSerExcluido = cargoLower.includes('secretário da música') || 
                               cargoLower.includes('secretaria da musica') || 
                               cargoLower.includes('secretarios da musica') || 
                               cargoLower.includes('secretarias da musica');
        
        mensagem += `   • Tem instrumento: ${temInstrumento ? '✅ SIM' : '❌ NÃO'}\n`;
        mensagem += `   • Deve ser excluído: ${deveSerExcluido ? '✅ SIM' : '❌ NÃO'}\n`;
        
        if (temInstrumento && deveSerExcluido) {
          mensagem += `   • Status: ✅ CORRETO (não será contado como instrumento)\n`;
        } else if (temInstrumento && !deveSerExcluido) {
          mensagem += `   • Status: ❌ PROBLEMA (será contado como instrumento)\n`;
        } else {
          mensagem += `   • Status: ℹ️ SEM INSTRUMENTO\n`;
        }
        
        mensagem += `\n`;
      });
      
      mensagem += `💡 Se algum secretário da música está sendo contado como instrumento, verifique:\n`;
      mensagem += `• Se o cargo está escrito exatamente como esperado\n`;
      mensagem += `• Se a lógica de exclusão está funcionando corretamente\n`;
      mensagem += `• Se há variações no cargo que não estão sendo capturadas`;
    }

    ui.alert('🔍 Diagnóstico de Secretários da Música', mensagem, ui.ButtonSet.OK);
    
    console.log('🔍 Diagnóstico de secretários da música concluído');
    
  } catch (error) {
    console.error('❌ Erro no diagnóstico de secretários da música:', error);
    const ui = SpreadsheetApp.getUi();
    ui.alert('❌ Erro no Diagnóstico', `Erro: ${error.message}`, ui.ButtonSet.OK);
  }
}

// Função para listar locais de ensaio

function getProgressCacheKey_() {
  return 'ATUALIZACAO_SISTEMA_PROGRESS';
}

function salvarProgressSnapshot_(progress) {
  try {
    CacheService.getScriptCache().put(getProgressCacheKey_(), JSON.stringify(progress), 300);
  } catch (e) {
    console.warn('Não foi possível salvar progresso no cache:', e.message);
  }
}

function lerProgressSnapshot_() {
  try {
    const cached = CacheService.getScriptCache().get(getProgressCacheKey_());
    return cached ? JSON.parse(cached) : null;
  } catch (e) {
    console.warn('Não foi possível ler progresso do cache:', e.message);
    return null;
  }
}

function getProgressUpdate() {
  const cached = lerProgressSnapshot_();
  const result = cached || {
    percent: EXPORT_PROGRESS.percent,
    status: EXPORT_PROGRESS.status,
    timeInfo: EXPORT_PROGRESS.timeInfo,
    logEntries: EXPORT_PROGRESS.logEntries
  };
  
  // Limpa os logs após retornar para evitar duplicação
  EXPORT_PROGRESS.logEntries = [];
  
  return result;
}

// Função para atualizar progresso

function updateExportProgress(percent, status, timeInfo, logEntry = null, logType = 'info') {
  EXPORT_PROGRESS.percent = percent;
  EXPORT_PROGRESS.status = status;
  EXPORT_PROGRESS.timeInfo = timeInfo;
  
  if (logEntry) {
    EXPORT_PROGRESS.logEntries.push({
      message: logEntry,
      type: logType,
      timestamp: new Date().toLocaleTimeString()
    });
    
    // Mantém apenas os últimos 20 logs
    if (EXPORT_PROGRESS.logEntries.length > 20) {
      EXPORT_PROGRESS.logEntries.shift();
    }
  }
  
  salvarProgressSnapshot_(EXPORT_PROGRESS);
  return EXPORT_PROGRESS;
}

// Função para exportação de alta performance (otimizada para grandes volumes)

function executarExportacaoAltaPerformance() {
  try {
    console.log('🚀 Iniciando exportação de alta performance...');
    
    const ui = SpreadsheetApp.getUi();
    const startTime = new Date();
    
    // Mostra progresso inicial
    ui.alert('🚀 Exportação de Alta Performance', 'Iniciando exportação otimizada para todas as 7 planilhas...\n\nEsta versão foi otimizada para processar grandes volumes rapidamente.\n\nPor favor, aguarde...', ui.ButtonSet.OK);
    
    const resultadoLocais = listarLocaisEnsaio();
    if (!resultadoLocais || !resultadoLocais.ok || !resultadoLocais.locais || resultadoLocais.locais.length === 0) {
      ui.alert('❌ Nenhum local de ensaio encontrado nos dados.');
      return;
    }
    
    const locais = resultadoLocais.locais;
    console.log(`📋 Locais encontrados: ${locais.join(', ')}`);
    
    // Mapeamento inteligente de locais
    const mapeamentoLocais = {
      'Cotia': ['Cotia', 'COTIA'],
      'Itapevi': ['Itapevi', 'ITAPEVI'],
      'Caucaia': ['Caucaia', 'CAUCAIA', 'Caucaia do Alto', 'CAUCAIA DO ALTO'],
      'Jandira': ['Jandira', 'JANDIRA'],
      'Fazendinha': ['Fazendinha', 'FAZENDINHA'],
      'Pirapora': ['Pirapora', 'PIRAPORA'],
      'VargemGrande': ['VargemGrande', 'VARGEMGRANDE', 'Vargem Grande', 'VARGEM GRANDE']
    };
    
    const planilhas = [
      { nome: 'Cotia', id: COTIA_SHEET_ID },
      { nome: 'Itapevi', id: ITAPEVI_SHEET_ID },
      { nome: 'Caucaia', id: CAUCAIA_SHEET_ID },
      { nome: 'Jandira', id: JANDIRA_SHEET_ID },
      { nome: 'Fazendinha', id: FAZENDINHA_SHEET_ID },
      { nome: 'Pirapora', id: PIRAPORA_SHEET_ID },
      { nome: 'VargemGrande', id: VARGEMGRANDE_SHEET_ID }
    ];
    
    const resultados = [];
    
    // Processa todas as planilhas em paralelo (otimização)
    for (let i = 0; i < planilhas.length; i++) {
      const planilha = planilhas[i];
      const progress = Math.round(((i + 1) / planilhas.length) * 100);
      
      console.log(`📤 [${progress}%] Processando ${planilha.nome}... (${i + 1}/${planilhas.length})`);
      
      // Encontra o local correspondente na planilha
      let localEnsaio = null;
      const possiveisLocais = mapeamentoLocais[planilha.nome] || [planilha.nome];
      
      for (const possivelLocal of possiveisLocais) {
        const localEncontrado = locais.find(local => 
          local.toLowerCase() === possivelLocal.toLowerCase()
        );
        if (localEncontrado) {
          localEnsaio = localEncontrado;
          break;
        }
      }
      
      if (!localEnsaio) {
        console.log(`⚠️ Local não encontrado para ${planilha.nome}, tentando com nome da planilha`);
        localEnsaio = planilha.nome;
      }
      
      try {
        // Usa a versão otimizada de exportação para Resumo
        const resultadoResumo = exportarParaPlanilhaOtimizada(planilha.id, planilha.nome, localEnsaio);
        
        // Também atualiza a aba Organistas
        let resultadoOrganistas = null;
        try {
          switch (planilha.nome) {
            case 'Cotia':
              resultadoOrganistas = alimentarAbaOrganistasCotia(localEnsaio);
              alimentarAbaMinisterioCotia(localEnsaio);
              break;
            case 'Itapevi':
              resultadoOrganistas = alimentarAbaOrganistasItapevi(localEnsaio);
              alimentarAbaMinisterioItapevi(localEnsaio);
              break;
            case 'Caucaia':
              resultadoOrganistas = alimentarAbaOrganistasCaucaia(localEnsaio);
              alimentarAbaMinisterioCaucaia(localEnsaio);
              break;
            case 'Jandira':
              resultadoOrganistas = alimentarAbaOrganistasJandira(localEnsaio);
              alimentarAbaMinisterioJandira(localEnsaio);
              break;
            case 'Fazendinha':
              resultadoOrganistas = alimentarAbaOrganistasFazendinha(localEnsaio);
              alimentarAbaMinisterioFazendinha(localEnsaio);
              break;
            case 'Pirapora':
              resultadoOrganistas = alimentarAbaOrganistasPirapora(localEnsaio);
              alimentarAbaMinisterioPirapora(localEnsaio);
              break;
            case 'VargemGrande':
              resultadoOrganistas = alimentarAbaOrganistasVargemGrande(localEnsaio);
              alimentarAbaMinisterioVargemGrande(localEnsaio);
              break;
          }
        } catch (orgError) {
          console.error(`⚠️ Erro ao atualizar organistas para ${planilha.nome}:`, orgError);
        }
        
        resultados.push({
          planilha: planilha.nome,
          local: localEnsaio,
          sucesso: true,
          resultado: resultadoResumo,
          organistas: resultadoOrganistas
        });
        
        console.log(`✅ [${progress}%] ${planilha.nome} exportada com sucesso - ${resultadoResumo.totalMembros} membros`);
        
      } catch (error) {
        console.error(`❌ [${progress}%] Erro ao exportar para ${planilha.nome}:`, error);
        resultados.push({
          planilha: planilha.nome,
          local: localEnsaio,
          sucesso: false,
          erro: error.message
        });
      }
    }
    
    // Mostra o resultado final
    const sucessos = resultados.filter(r => r.sucesso).length;
    const falhas = resultados.filter(r => !r.sucesso).length;
    const totalTime = Math.round((new Date() - startTime) / 1000);
    
    let mensagem = `🚀 Exportação de Alta Performance Concluída!\n\n` +
      `⏱️ Tempo total: ${totalTime} segundos (${Math.round(totalTime / 60)} minutos)\n` +
      `✅ Sucessos: ${sucessos}/7\n` +
      `❌ Falhas: ${falhas}/7\n\n`;
    
    if (sucessos > 0) {
      mensagem += `✅ Planilhas Atualizadas:\n`;
      resultados.filter(r => r.sucesso).forEach(r => {
        mensagem += `• ${r.planilha} (${r.local}): ${r.resultado.totalMembros} membros\n`;
      });
      mensagem += `\n`;
    }
    
    if (falhas > 0) {
      mensagem += `❌ Planilhas com Erro:\n`;
      resultados.filter(r => !r.sucesso).forEach(r => {
        mensagem += `• ${r.planilha} (${r.local}): ${r.erro}\n`;
      });
    }
    
    // Avalia performance
    if (totalTime < 300) { // Menos de 5 minutos
      mensagem += `\n🎉 EXCELENTE! Exportação concluída em menos de 5 minutos!\n`;
      mensagem += `⚡ Performance otimizada para grandes volumes.`;
    } else {
      mensagem += `\n⚠️ Exportação demorou mais que o esperado.\n`;
      mensagem += `💡 Considere executar em horários de menor uso.`;
    }
    
    ui.alert('🚀 Exportação de Alta Performance Concluída', mensagem, ui.ButtonSet.OK);
    
    console.log('🚀 Exportação de alta performance concluída');
    
  } catch (error) {
    console.error('❌ Erro na exportação de alta performance:', error);
    const ui = SpreadsheetApp.getUi();
    ui.alert('❌ Erro na Exportação', `Erro: ${error.message}`, ui.ButtonSet.OK);
  }
}

// Função otimizada para exportar para uma planilha específica

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
      `Deseja exportar os dados do ensaio "${localEscolhido}" para a planilha externa de Itapevi?\n\nIsso irá:\n• Atualizar a aba "Resumo" com contadores de instrumentos e cargos\n• Atualizar a aba "Organistas" com lista de organistas\n• Atualizar a aba "Ministério" com lista de cargos ministeriais\n\nConfirma a operação?`,
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
    const resultadoMinisterio = alimentarAbaMinisterioItapevi(localEscolhido);

    // Mostra resultado
    const mensagem = `✅ Exportação para Itapevi concluída com sucesso!\n\n` +
      `📊 Aba Resumo atualizada:\n` +
      `• Total de membros: ${resultadoResumo.totalMembros}\n` +
      `• Instrumentos contados: ${Object.keys(resultadoResumo.instrumentos).filter(k => resultadoResumo.instrumentos[k] > 0).length}\n` +
      `• Cargos ministeriais: ${Object.keys(resultadoResumo.cargosMinisteriais).filter(k => resultadoResumo.cargosMinisteriais[k] > 0).length}\n` +
      `• Cargos de apoio: ${Object.keys(resultadoResumo.cargosApoio).filter(k => resultadoResumo.cargosApoio[k] > 0).length}\n\n` +
      `🎹 Aba Organistas atualizada:\n` +
      `• Total de organistas: ${resultadoOrganistas.totalOrganistas}\n\n` +
      `👔 Aba Ministério atualizada:\n` +
      `• Total de ministério: ${resultadoMinisterio.totalMinisterio}\n\n` +
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
      `Deseja exportar os dados do ensaio "${localEscolhido}" para a planilha externa de VargemGrande?\n\nIsso irá:\n• Atualizar a aba "Resumo" com contadores de instrumentos e cargos\n• Atualizar a aba "Organistas" com lista de organistas\n• Atualizar a aba "Ministério" com lista de cargos ministeriais\n\nConfirma a operação?`,
      ui.ButtonSet.YES_NO
    );
    if (confirmacao !== ui.Button.YES) {
      ui.alert('❌ Operação cancelada pelo usuário.');
      return;
    }
    ui.alert('⏳ Iniciando exportação para VargemGrande...\n\nPor favor, aguarde enquanto os dados são processados.');
    const resultadoResumo = exportarParaPlanilhaVargemGrandeCompleta(localEscolhido);
    const resultadoOrganistas = alimentarAbaOrganistasVargemGrande(localEscolhido);
    const resultadoMinisterio = alimentarAbaMinisterioVargemGrande(localEscolhido);
    const mensagem = `✅ Exportação para VargemGrande concluída com sucesso!\n\n` +
      `📊 Aba Resumo atualizada:\n` +
      `• Total de membros: ${resultadoResumo.totalMembros}\n` +
      `• Instrumentos contados: ${Object.keys(resultadoResumo.instrumentos).filter(k => resultadoResumo.instrumentos[k] > 0).length}\n` +
      `• Cargos ministeriais: ${Object.keys(resultadoResumo.cargosMinisteriais).filter(k => resultadoResumo.cargosMinisteriais[k] > 0).length}\n` +
      `• Cargos de apoio: ${Object.keys(resultadoResumo.cargosApoio).filter(k => resultadoResumo.cargosApoio[k] > 0).length}\n\n` +
      `🎹 Aba Organistas atualizada:\n` +
      `• Total de organistas: ${resultadoOrganistas.totalOrganistas}\n\n` +
      `👔 Aba Ministério atualizada:\n` +
      `• Total de ministério: ${resultadoMinisterio.totalMinisterio}\n\n` +
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
      `Deseja exportar os dados do ensaio "${localEscolhido}" para a planilha externa de Pirapora?\n\nIsso irá:\n• Atualizar a aba "Resumo" com contadores de instrumentos e cargos\n• Atualizar a aba "Organistas" com lista de organistas\n• Atualizar a aba "Ministério" com lista de cargos ministeriais\n\nConfirma a operação?`,
      ui.ButtonSet.YES_NO
    );
    if (confirmacao !== ui.Button.YES) {
      ui.alert('❌ Operação cancelada pelo usuário.');
      return;
    }
    ui.alert('⏳ Iniciando exportação para Pirapora...\n\nPor favor, aguarde enquanto os dados são processados.');
    const resultadoResumo = exportarParaPlanilhaPiraporaCompleta(localEscolhido);
    const resultadoOrganistas = alimentarAbaOrganistasPirapora(localEscolhido);
    const resultadoMinisterio = alimentarAbaMinisterioPirapora(localEscolhido);
    const mensagem = `✅ Exportação para Pirapora concluída com sucesso!\n\n` +
      `📊 Aba Resumo atualizada:\n` +
      `• Total de membros: ${resultadoResumo.totalMembros}\n` +
      `• Instrumentos contados: ${Object.keys(resultadoResumo.instrumentos).filter(k => resultadoResumo.instrumentos[k] > 0).length}\n` +
      `• Cargos ministeriais: ${Object.keys(resultadoResumo.cargosMinisteriais).filter(k => resultadoResumo.cargosMinisteriais[k] > 0).length}\n` +
      `• Cargos de apoio: ${Object.keys(resultadoResumo.cargosApoio).filter(k => resultadoResumo.cargosApoio[k] > 0).length}\n\n` +
      `🎹 Aba Organistas atualizada:\n` +
      `• Total de organistas: ${resultadoOrganistas.totalOrganistas}\n\n` +
      `👔 Aba Ministério atualizada:\n` +
      `• Total de ministério: ${resultadoMinisterio.totalMinisterio}\n\n` +
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
      `Deseja exportar os dados do ensaio "${localEscolhido}" para a planilha externa de Fazendinha?\n\nIsso irá:\n• Atualizar a aba "Resumo" com contadores de instrumentos e cargos\n• Atualizar a aba "Organistas" com lista de organistas\n• Atualizar a aba "Ministério" com lista de cargos ministeriais\n\nConfirma a operação?`,
      ui.ButtonSet.YES_NO
    );
    if (confirmacao !== ui.Button.YES) {
      ui.alert('❌ Operação cancelada pelo usuário.');
      return;
    }
    ui.alert('⏳ Iniciando exportação para Fazendinha...\n\nPor favor, aguarde enquanto os dados são processados.');
    const resultadoResumo = exportarParaPlanilhaFazendinhaCompleta(localEscolhido);
    const resultadoOrganistas = alimentarAbaOrganistasFazendinha(localEscolhido);
    const resultadoMinisterio = alimentarAbaMinisterioFazendinha(localEscolhido);
    const mensagem = `✅ Exportação para Fazendinha concluída com sucesso!\n\n` +
      `📊 Aba Resumo atualizada:\n` +
      `• Total de membros: ${resultadoResumo.totalMembros}\n` +
      `• Instrumentos contados: ${Object.keys(resultadoResumo.instrumentos).filter(k => resultadoResumo.instrumentos[k] > 0).length}\n` +
      `• Cargos ministeriais: ${Object.keys(resultadoResumo.cargosMinisteriais).filter(k => resultadoResumo.cargosMinisteriais[k] > 0).length}\n` +
      `• Cargos de apoio: ${Object.keys(resultadoResumo.cargosApoio).filter(k => resultadoResumo.cargosApoio[k] > 0).length}\n\n` +
      `🎹 Aba Organistas atualizada:\n` +
      `• Total de organistas: ${resultadoOrganistas.totalOrganistas}\n\n` +
      `👔 Aba Ministério atualizada:\n` +
      `• Total de ministério: ${resultadoMinisterio.totalMinisterio}\n\n` +
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
      `Deseja exportar os dados do ensaio "${localEscolhido}" para a planilha externa de Jandira?\n\nIsso irá:\n• Atualizar a aba "Resumo" com contadores de instrumentos e cargos\n• Atualizar a aba "Organistas" com lista de organistas\n• Atualizar a aba "Ministério" com lista de cargos ministeriais\n\nConfirma a operação?`,
      ui.ButtonSet.YES_NO
    );
    if (confirmacao !== ui.Button.YES) {
      ui.alert('❌ Operação cancelada pelo usuário.');
      return;
    }
    ui.alert('⏳ Iniciando exportação para Jandira...\n\nPor favor, aguarde enquanto os dados são processados.');
    const resultadoResumo = exportarParaPlanilhaJandiraCompleta(localEscolhido);
    const resultadoOrganistas = alimentarAbaOrganistasJandira(localEscolhido);
    const resultadoMinisterio = alimentarAbaMinisterioJandira(localEscolhido);
    const mensagem = `✅ Exportação para Jandira concluída com sucesso!\n\n` +
      `📊 Aba Resumo atualizada:\n` +
      `• Total de membros: ${resultadoResumo.totalMembros}\n` +
      `• Instrumentos contados: ${Object.keys(resultadoResumo.instrumentos).filter(k => resultadoResumo.instrumentos[k] > 0).length}\n` +
      `• Cargos ministeriais: ${Object.keys(resultadoResumo.cargosMinisteriais).filter(k => resultadoResumo.cargosMinisteriais[k] > 0).length}\n` +
      `• Cargos de apoio: ${Object.keys(resultadoResumo.cargosApoio).filter(k => resultadoResumo.cargosApoio[k] > 0).length}\n\n` +
      `🎹 Aba Organistas atualizada:\n` +
      `• Total de organistas: ${resultadoOrganistas.totalOrganistas}\n\n` +
      `👔 Aba Ministério atualizada:\n` +
      `• Total de ministério: ${resultadoMinisterio.totalMinisterio}\n\n` +
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
      `Deseja exportar os dados do ensaio "${localEscolhido}" para a planilha externa de Caucaia?\n\nIsso irá:\n• Atualizar a aba "Resumo" com contadores de instrumentos e cargos\n• Atualizar a aba "Organistas" com lista de organistas\n• Atualizar a aba "Ministério" com lista de cargos ministeriais\n\nConfirma a operação?`,
      ui.ButtonSet.YES_NO
    );
    if (confirmacao !== ui.Button.YES) {
      ui.alert('❌ Operação cancelada pelo usuário.');
      return;
    }
    ui.alert('⏳ Iniciando exportação para Caucaia...\n\nPor favor, aguarde enquanto os dados são processados.');
    const resultadoResumo = exportarParaPlanilhaCaucaiaCompleta(localEscolhido);
    const resultadoOrganistas = alimentarAbaOrganistasCaucaia(localEscolhido);
    const resultadoMinisterio = alimentarAbaMinisterioCaucaia(localEscolhido);
    const mensagem = `✅ Exportação para Caucaia concluída com sucesso!\n\n` +
      `📊 Aba Resumo atualizada:\n` +
      `• Total de membros: ${resultadoResumo.totalMembros}\n` +
      `• Instrumentos contados: ${Object.keys(resultadoResumo.instrumentos).filter(k => resultadoResumo.instrumentos[k] > 0).length}\n` +
      `• Cargos ministeriais: ${Object.keys(resultadoResumo.cargosMinisteriais).filter(k => resultadoResumo.cargosMinisteriais[k] > 0).length}\n` +
      `• Cargos de apoio: ${Object.keys(resultadoResumo.cargosApoio).filter(k => resultadoResumo.cargosApoio[k] > 0).length}\n\n` +
      `🎹 Aba Organistas atualizada:\n` +
      `• Total de organistas: ${resultadoOrganistas.totalOrganistas}\n\n` +
      `👔 Aba Ministério atualizada:\n` +
      `• Total de ministério: ${resultadoMinisterio.totalMinisterio}\n\n` +
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
        `Deseja exportar os dados do ensaio "${localEscolhido}" para a planilha externa de Cotia?\n\nIsso irá:\n• Atualizar a aba "Resumo" com contadores de instrumentos e cargos\n• Atualizar a aba "Organistas" com lista de organistas\n• Atualizar a aba "Ministério" com lista de cargos ministeriais\n\nConfirma a operação?`,
        ui.ButtonSet.YES_NO
      );

      if (confirmacao === ui.Button.YES) {
        ui.alert('Iniciando exportação...\n\nPor favor, aguarde enquanto os dados são processados.');

        // Executa a exportação completa
        const resultadoResumo = exportarParaPlanilhaCotiaCompleta(localEscolhido);
        const resultadoOrganistas = alimentarAbaOrganistasCotia(localEscolhido);
        const resultadoMinisterio = alimentarAbaMinisterioCotia(localEscolhido);

        // Mostra resultado
        const mensagem = `Exportação para Cotia concluída com sucesso!\n\n` +
          `Aba Resumo atualizada:\n` +
          `• Total de membros: ${resultadoResumo.totalMembros}\n` +
          `• Instrumentos contados: ${Object.keys(resultadoResumo.instrumentos).filter(k => resultadoResumo.instrumentos[k] > 0).length}\n` +
          `• Cargos ministeriais: ${Object.keys(resultadoResumo.cargosMinisteriais).filter(k => resultadoResumo.cargosMinisteriais[k] > 0).length}\n` +
          `• Cargos de apoio: ${Object.keys(resultadoResumo.cargosApoio).filter(k => resultadoResumo.cargosApoio[k] > 0).length}\n\n` +
          `Aba Organistas atualizada:\n` +
          `• Total de organistas: ${resultadoOrganistas.totalOrganistas}\n\n` +
          `Aba Ministério atualizada:\n` +
          `• Total de ministério: ${resultadoMinisterio.totalMinisterio}\n\n` +
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


/**
 * Função para limpar os contadores do resumo (colunas B, E e H) de forma eficiente.
 */
function limparContadoresResumo(sheet, linhasComFormulas = [28, 41, 48, 50]) {
  console.log('🧹 Limpando contadores do resumo (Memória Bulk)...');
  try {
    const lastRow = sheet.getLastRow();
    const maxCols = sheet.getLastColumn();
    if (lastRow < 2) return;
    
    // 🚨 SEGURANÇA MÁXIMA: Apenas Coluna B (index 1) deve ser limpa.
    // O usuário solicitou explicitamente NÃO mexer nas colunas D até H.
    const colunasValores = [1]; 
    const range = sheet.getRange(1, 1, lastRow, maxCols);
    const values = range.getValues();
    const formulas = range.getFormulas();
    let limpos = 0;

    for (let i = 1; i < values.length; i++) { // Pula cabeçalho
      const row = i + 1;
      // 🚨 PULA COMPLETAMENTE AS LINHAS DE FÓRMULAS
      if (linhasComFormulas.includes(row)) continue;

      colunasValores.forEach(colIdx => {
        // Se NÃO for fórmula e for um número, zera.
        if (!formulas[i][colIdx] && typeof values[i][colIdx] === 'number') {
          sheet.getRange(row, colIdx + 1).setValue(0);
          limpos++;
        }
      });
    }
    console.log(`✅ Limpeza concluída: ${limpos} células zeradas.`);
  } catch (e) {
    console.error('❌ Erro na limpeza do resumo:', e.message);
  }
}

/**
 * Atualiza os contadores do Dashboard em lote, escaneando colunas A, D e G.
 */
function atualizarTodosContadoresResumoBulk(sheet, arrayDeAtualizacoes, linhasComFormulas = [28, 41, 48, 50]) {
  console.log(`🔍 Atualizando Dashboard (Memória Bulk)...`);
  try {
    const lastRow = sheet.getLastRow();
    const maxCols = sheet.getLastColumn();
    if (lastRow < 2) return;
    
    // 🚨 SEGURANÇA MÁXIMA: Apenas Coluna B (index 1) deve ser atualizada.
    // O usuário solicitou explicitamente NÃO mexer nas colunas D até H.
    const blocos = [
      { label: 0, val: 1 }
    ].filter(b => b.val < maxCols);

    const dict = {};
    arrayDeAtualizacoes.forEach(item => {
      dict[normalizarNome(item.rotulo)] = item.valor;
    });

    const range = sheet.getRange(1, 1, lastRow, maxCols);
    const values = range.getValues();
    const formulas = range.getFormulas();
    let atualizados = 0;

    // Cria um dicionário normalizado (tudo minúsculo) para busca segura
    const dictNorm = {};
    Object.keys(dict).forEach(k => {
      dictNorm[normalizarNome(k)] = dict[k];
    });

    for (let i = 0; i < values.length; i++) {
      const row = i + 1;
      
      // 🚨 PRESERVAÇÃO DE FÓRMULAS: Se a célula tem fórmula, mantém ela no array
      for (let j = 0; j < values[i].length; j++) {
        if (formulas[i][j]) {
          values[i][j] = formulas[i][j];
        }
      }

      // Se for linha de total, não processamos rótulos
      if (linhasComFormulas.includes(row)) continue;

      blocos.forEach(b => {
        const labelText = String(values[i][b.label] || '').trim();
        if (labelText) {
          const normLabel = normalizarNome(labelText);
          if (dictNorm.hasOwnProperty(normLabel) && !formulas[i][b.val]) {
            values[i][b.val] = dictNorm[normLabel];
            atualizados++;
          }
        }
      });
    }
    
    // Escrita em bloco (Alta Performance)
    range.setValues(values);
    SpreadsheetApp.flush();
    console.log(`✅ Dashboard restaurado e atualizado: ${atualizados} campos.`);
  } catch (e) {
    console.error('❌ Erro na restauração do dashboard:', e.message);
  }
}

// ===== FUNÇÕES PARA LISTA DE IGREJAS COM SAM DESATUALIZADO =====

/**
 * Função principal para gerar lista de igrejas com SAM desatualizado
 * Segue o mesmo padrão das funções de organistas
 */

function gerarListaSamDesatualizado() {
  try {
    console.log('📋 Iniciando geração da lista de igrejas com SAM desatualizado...');
    
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
    const idxNivel = headerRow.findIndex(h => h && (
      h.toString().toLowerCase().includes('nivel') || 
      h.toString().toLowerCase().includes('nível') ||
      h.toString().toLowerCase().includes('classe')
    ));
    const idxComum = headerRow.findIndex(h => h && h.toString().toLowerCase().includes('comum'));
    const idxCidade = headerRow.findIndex(h => h && (
      h.toString().toLowerCase().includes('cidade') || 
      h.toString().toLowerCase().includes('municipio') || 
      h.toString().toLowerCase().includes('município') ||
      h.toString().toLowerCase().includes('localidade')
    ));
    const idxAnotacoes = headerRow.findIndex(h => h && (
      h.toString().toLowerCase().includes('anotacao') || 
      h.toString().toLowerCase().includes('anotacoes') ||
      h.toString().toLowerCase().includes('observacao') ||
      h.toString().toLowerCase().includes('observacoes')
    ));

    if (idxNome < 0 || idxCargo < 0) {
      throw new Error('Colunas "nome" ou "cargo" não encontradas');
    }

    // Filtra dados para registros com SAM desatualizado
    const samDesatualizado = [];
    
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const nome = norm(row[idxNome] || '');
      if (!nome) continue;

      const cargo = norm(row[idxCargo] || '');
      const comum = norm(row[idxComum] || '') || '(Sem comum)';
      const cidade = norm(row[idxCidade] || '') || '(Sem cidade)';
      const anotacoes = norm(row[idxAnotacoes] || '');
      
      // Captura o nível da organista se for organista
      let nivelOrganista = '';
      if (cargo.toLowerCase().includes('organista') && idxNivel >= 0) {
        nivelOrganista = norm(row[idxNivel] || '');
      }
      
      // Verifica se tem SAM desatualizado
      const temSamDesatualizado = anotacoes && anotacoes.toLowerCase().includes('sam desatualizado');
      
      if (temSamDesatualizado) {
        // Adiciona TODOS os registros com SAM desatualizado (incluindo organistas)
        samDesatualizado.push({
          nome,
          cargo,
          nivelOrganista,
          comum,
          cidade
        });
      }
    }

    console.log(`📊 Encontrados ${samDesatualizado.length} registros com SAM desatualizado`);

    // Acessa a planilha principal
    const ssPrincipal = SpreadsheetApp.openById(DEFAULT_SHEET_ID);
    let shSam = ssPrincipal.getSheetByName('SAM');
    
    // Cria a aba se não existir
    if (!shSam) {
      shSam = ssPrincipal.insertSheet('SAM');
      
      // Configura o cabeçalho da planilha
      const cabecalho = [
        ['CONGREGAÇÃO CRISTÃ NO BRASIL', '', '', '', '', ''],
        ['LISTA DE IGREJAS COM O SAM DESATUALIZADO', '', '', '', '', ''],
        ['Relação de Músicos e Organistas', '', '', '', '', ''],
        ['ID', 'Nome', 'Cargo', 'Nível da organista', 'Comum', 'Cidade']
      ];
      
      shSam.getRange(1, 1, 4, 6).setValues(cabecalho);
      
      // Formata o cabeçalho
      const rangeCabecalho = shSam.getRange(1, 1, 4, 6);
      rangeCabecalho.setFontWeight('bold');
      rangeCabecalho.setHorizontalAlignment('center');
      
      // Formata a linha de títulos das colunas (linha 4)
      const rangeTitulos = shSam.getRange(4, 1, 1, 6);
      rangeTitulos.setBackground('#404040');
      rangeTitulos.setFontColor('white');
      rangeTitulos.setFontWeight('bold');
      
      // Ajusta largura das colunas
      shSam.setColumnWidth(1, 50);  // ID
      shSam.setColumnWidth(2, 200); // Nome
      shSam.setColumnWidth(3, 150); // Cargo
      shSam.setColumnWidth(4, 120); // Nível da organista
      shSam.setColumnWidth(5, 150); // Comum
      shSam.setColumnWidth(6, 150); // Cidade
      
      console.log('✅ Aba "SAM" criada na planilha principal');
    }

    // Limpa dados existentes a partir da linha 5
    const ultimaLinha = shSam.getLastRow();
    if (ultimaLinha > 4) {
      shSam.getRange(5, 1, ultimaLinha - 4, 6).clearContent();
      console.log(`✅ Dados limpos na aba SAM (preparando para inserir ${samDesatualizado.length} registros)`);
    }

    // Popula dados a partir da linha 5
    if (samDesatualizado.length > 0) {
      const dadosParaInserir = samDesatualizado.map((item, index) => [
        index + 1, // ID sequencial
        item.nome,
        item.cargo,
        item.nivelOrganista, // Nível da organista (preenchido se for organista)
        item.comum,
        item.cidade
      ]);

      shSam.getRange(5, 1, dadosParaInserir.length, 6).setValues(dadosParaInserir);
      console.log(`✅ ${samDesatualizado.length} registros inseridos na aba SAM`);
    }

    return {
      sucesso: true,
      totalRegistros: samDesatualizado.length,
      registros: samDesatualizado
    };

  } catch (error) {
    console.error('❌ Erro ao gerar lista de SAM desatualizado:', error);
    throw error;
  }
}

/**
 * Função de menu para acessar a geração da lista de SAM desatualizado
 */

function menuListaSamDesatualizado() {
  try {
    const ui = SpreadsheetApp.getUi();
    
    // Confirma a operação
    const confirmacao = ui.alert(
      '📋 Gerar Lista de Registros com SAM Desatualizado',
      'Deseja gerar a lista de todos os registros com SAM desatualizado?\n\nIsso irá:\n• Analisar todos os dados da planilha\n• Identificar TODOS os registros marcados como "SAM Desatualizado" (incluindo organistas)\n• Atualizar a aba "SAM" na planilha principal\n\nConfirma a operação?',
      ui.ButtonSet.YES_NO
    );

    if (confirmacao !== ui.Button.YES) {
      ui.alert('❌ Operação cancelada pelo usuário.');
      return;
    }

    ui.alert('⏳ Gerando lista de registros com SAM desatualizado...\n\nPor favor, aguarde enquanto os dados são processados.');

    // Executa a geração da lista
    const resultado = gerarListaSamDesatualizado();
    
    const mensagem = `✅ Lista de registros com SAM desatualizado gerada com sucesso!\n\n` +
                    `📊 Total de registros encontrados: ${resultado.totalRegistros}\n\n` +
                    `📋 A lista foi atualizada na aba "SAM" da planilha principal.`;

    ui.alert('✅ Sucesso!', mensagem, ui.ButtonSet.OK);
    
    console.log('✅ Lista de SAM desatualizado gerada com sucesso:', resultado);

  } catch (error) {
    console.error('❌ Erro no menu de SAM desatualizado:', error);
    const ui = SpreadsheetApp.getUi();
    ui.alert('❌ Erro', `Erro ao gerar lista de SAM desatualizado:\n\n${error.message}`, ui.ButtonSet.OK);
  }
}

/**
 * Função para gerar lista de SAM desatualizado para um local específico
 * Útil para análises mais focadas
 */

function gerarListaSamDesatualizadoPorLocal(localEnsaio = 'Itapevi') {
  try {
    console.log(`📋 Iniciando geração da lista de SAM desatualizado para: ${localEnsaio}`);
    
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
    const idxComum = headerRow.findIndex(h => h && h.toString().toLowerCase().includes('comum'));
    const idxCidade = headerRow.findIndex(h => h && (
      h.toString().toLowerCase().includes('cidade') || 
      h.toString().toLowerCase().includes('municipio') || 
      h.toString().toLowerCase().includes('município') ||
      h.toString().toLowerCase().includes('localidade')
    ));
    const idxAnotacoes = headerRow.findIndex(h => h && (
      h.toString().toLowerCase().includes('anotacao') || 
      h.toString().toLowerCase().includes('anotacoes') ||
      h.toString().toLowerCase().includes('observacao') ||
      h.toString().toLowerCase().includes('observacoes')
    ));
    const idxLocalEnsaio = headerRow.findIndex(h => h && h.toString().toLowerCase().includes('local_ensaio'));

    if (idxNome < 0 || idxCargo < 0) {
      throw new Error('Colunas "nome" ou "cargo" não encontradas');
    }

    // Filtra dados para registros com SAM desatualizado do local específico
    const samDesatualizado = [];
    const igrejasUnicas = new Set();
    
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const nome = norm(row[idxNome] || '');
      if (!nome) continue;

      const cargo = norm(row[idxCargo] || '');
      const comum = norm(row[idxComum] || '') || '(Sem comum)';
      const cidade = norm(row[idxCidade] || '') || '(Sem cidade)';
      const anotacoes = norm(row[idxAnotacoes] || '');
      const localEnsaioRow = norm(row[idxLocalEnsaio] || '') || '';
      
      // Verifica se tem SAM desatualizado e se é do local correto
      const temSamDesatualizado = anotacoes && anotacoes.toLowerCase().includes('sam desatualizado');
      const isLocalCorreto = !localEnsaioRow || localEnsaioRow.toLowerCase().includes(localEnsaio.toLowerCase());
      
      if (temSamDesatualizado && isLocalCorreto) {
        const chaveIgreja = `${comum}-${cidade}`;
        
        // Adiciona à lista se ainda não foi adicionada esta igreja
        if (!igrejasUnicas.has(chaveIgreja)) {
          samDesatualizado.push({
            nome,
            cargo,
            comum,
            cidade
          });
          igrejasUnicas.add(chaveIgreja);
        }
      }
    }

    console.log(`📊 Encontradas ${samDesatualizado.length} igrejas com SAM desatualizado para ${localEnsaio}`);

    return {
      sucesso: true,
      local: localEnsaio,
      totalIgrejas: samDesatualizado.length,
      igrejas: samDesatualizado
    };

  } catch (error) {
    console.error('❌ Erro ao gerar lista de SAM desatualizado por local:', error);
    throw error;
  }
}

// Função de teste para verificar se tudo está funcionando

function testeSamDesatualizado() {
  try {
    console.log('🧪 Iniciando teste da função SAM desatualizado...');
    
    // Testa se consegue acessar a planilha principal
    const shDados = openOrCreateSheet(SHEET_NAME);
    console.log('✅ Planilha principal acessada:', shDados.getName());
    
    // Testa se consegue acessar a planilha principal
    const ssPrincipal = SpreadsheetApp.openById(DEFAULT_SHEET_ID);
    console.log('✅ Planilha principal acessada:', ssPrincipal.getName());
    
    // Testa se a aba SAM existe
    const shSam = ssPrincipal.getSheetByName('SAM');
    if (shSam) {
      console.log('✅ Aba SAM encontrada:', shSam.getName());
    } else {
      console.log('ℹ️ Aba SAM não encontrada (será criada automaticamente)');
    }
    
    // Testa se há dados na planilha principal
    const lastRow = shDados.getLastRow();
    console.log('📊 Última linha com dados:', lastRow);
    
    if (lastRow > 1) {
      const headerRow = shDados.getRange(1, 1, 1, shDados.getLastColumn()).getDisplayValues()[0];
      console.log('📋 Cabeçalhos encontrados:', headerRow);
    }
    
    console.log('✅ Teste concluído com sucesso!');
    
  } catch (error) {
    console.error('❌ Erro no teste:', error);
    throw error;
  }
}

/**
 * Função para gerar relatório detalhado dos presentes em cada ensaio
 * Gera relatório na aba "Relatório" com:
 * - Coluna A: Cidade
 * - Coluna B: Comum
 * - Coluna C: Local do ensaio onde o encarregado esteve (ou vazio se não esteve)
 * - Coluna D: Músicos
 * - Coluna E: Organistas
 * - Coluna F: Geral (total)
 * Uma linha por cidade/comum/ensaio
 */

function gerarRelatorioDetalhado() {
  try {
    console.log('🔄 Iniciando geração do relatório detalhado...');
    
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

    // Estrutura para armazenar dados por ensaio/comum
    // Formato: relatorioMap[localEnsaio][comum] = { cidade, musicos, organistas, total, encarregadoLocal }
    const relatorioMap = {};
    
    // Mapeia encarregados por comum
    const encarregadosPorComum = {};
    
    // Primeira passagem: identifica encarregados locais e onde estiveram
    linhas.forEach(x => {
      if (!estevePresente(x)) return;
      
      if (ehEncarregadoLocal(x.cargo)) {
        if (!encarregadosPorComum[x.comum]) {
          encarregadosPorComum[x.comum] = [];
        }
        encarregadosPorComum[x.comum].push({
          nome: x.nome,
          localEnsaio: x.local_ensaio,
          comum: x.comum
        });
      }
    });
    
    // Segunda passagem: agrupa dados por ensaio e comum
    linhas.forEach(x => {
      if (!estevePresente(x)) return;
      
      const local = x.local_ensaio;
      const comum = x.comum;
      
      // Inicializa estrutura se não existir
      if (!relatorioMap[local]) {
        relatorioMap[local] = {};
      }
      if (!relatorioMap[local][comum]) {
        relatorioMap[local][comum] = {
          cidade: x.cidade,
          musicos: 0,
          organistas: 0,
          total: 0,
          encarregadoLocal: '' // Local onde o encarregado esteve
        };
      }
      
      // Classifica por tipo de cargo - apenas músicos e organistas
      const cargoLower = x.cargo.toLowerCase();
      const tipoCargo = classificarCargo(x.cargo);
      
      if (tipoCargo === 'organista') {
        relatorioMap[local][comum].organistas++;
        relatorioMap[local][comum].total++;
      } else if (tipoCargo === 'musico' || ehMusico(x)) {
        relatorioMap[local][comum].musicos++;
        relatorioMap[local][comum].total++;
      }
      // Não conta outros cargos no total (apenas músicos e organistas)
    });
    
    // Terceira passagem: identifica onde o encarregado local esteve
    Object.keys(relatorioMap).forEach(local => {
      Object.keys(relatorioMap[local]).forEach(comum => {
        // Verifica se há encarregado local para esta comum
        if (encarregadosPorComum[comum] && encarregadosPorComum[comum].length > 0) {
          // Procura se algum encarregado desta comum esteve neste ensaio
          const encarregadoNesteEnsaio = encarregadosPorComum[comum].find(
            enc => enc.localEnsaio === local
          );
          
          if (encarregadoNesteEnsaio) {
            relatorioMap[local][comum].encarregadoLocal = local;
          }
        }
      });
    });
    
    // Prepara dados para a planilha
    const dadosRelatorio = [];
    
    // Ordena ensaios alfabeticamente
    const locaisOrdenados = Object.keys(relatorioMap).sort((a, b) => a.localeCompare(b, 'pt-BR'));
    
    locaisOrdenados.forEach(local => {
      // Ordena comuns alfabeticamente dentro de cada ensaio
      const comunsOrdenadas = Object.keys(relatorioMap[local]).sort((a, b) => a.localeCompare(b, 'pt-BR'));
      
      comunsOrdenadas.forEach(comum => {
        const dados = relatorioMap[local][comum];
        
        dadosRelatorio.push([
          dados.cidade,                    // Coluna A: Cidade
          comum,                           // Coluna B: Comum
          dados.encarregadoLocal || '',    // Coluna C: Local onde encarregado esteve (ou vazio)
          dados.musicos,                   // Coluna D: Músicos
          dados.organistas,                 // Coluna E: Organistas
          dados.total                      // Coluna F: Geral (total)
        ]);
      });
    });
    
    // Cria ou limpa a aba "Relatório"
    const shRelatorio = openOrCreateSheet('Relatório');
    shRelatorio.clearContents();
    
    // Cabeçalho
    const cabecalho = [['Cidade', 'Comum', 'Local Encarregado', 'Músicos', 'Organistas', 'Geral']];
    shRelatorio.getRange(1, 1, 1, 6).setValues(cabecalho);
    shRelatorio.getRange(1, 1, 1, 6).setFontWeight('bold');
    shRelatorio.getRange(1, 1, 1, 6).setBackground('#4285f4');
    shRelatorio.getRange(1, 1, 1, 6).setFontColor('white');
    
    // Dados
    if (dadosRelatorio.length > 0) {
      shRelatorio.getRange(2, 1, dadosRelatorio.length, 6).setValues(dadosRelatorio);
      
      // Formatação: alinha números à direita
      shRelatorio.getRange(2, 4, dadosRelatorio.length, 3).setHorizontalAlignment('right');
      
      // Adiciona bordas
      shRelatorio.getRange(1, 1, dadosRelatorio.length + 1, 6).setBorder(
        true, true, true, true, true, true, 
        '#cccccc', 
        SpreadsheetApp.BorderStyle.SOLID
      );
    }
    
    // Ajusta largura das colunas
    shRelatorio.setColumnWidth(1, 150); // Cidade
    shRelatorio.setColumnWidth(2, 200); // Comum
    shRelatorio.setColumnWidth(3, 180); // Local Encarregado
    shRelatorio.setColumnWidth(4, 100); // Músicos
    shRelatorio.setColumnWidth(5, 100); // Organistas
    shRelatorio.setColumnWidth(6, 100);  // Geral
    
    console.log(`✅ Relatório detalhado gerado com sucesso! ${dadosRelatorio.length} linhas criadas.`);
    
    return {
      sucesso: true,
      totalLinhas: dadosRelatorio.length,
      totalEnsaio: locaisOrdenados.length
    };
    
  } catch (error) {
    console.error('❌ Erro ao gerar relatório detalhado:', error);
    throw error;
  }
}

/**
 * Função de menu para acessar a geração do relatório detalhado
 */

function menuRelatorioDetalhado() {
  try {
    const ui = SpreadsheetApp.getUi();
    
    // Confirma a operação
    const confirmacao = ui.alert(
      '📊 Gerar Relatório Detalhado',
      'Deseja gerar o relatório detalhado dos presentes em cada ensaio?\n\nIsso irá:\n• Analisar todos os dados da planilha\n• Contar músicos e organistas por comum em cada ensaio\n• Identificar onde cada encarregado local esteve presente\n• Atualizar a aba "Relatório" na planilha principal\n\nConfirma a operação?',
      ui.ButtonSet.YES_NO
    );

    if (confirmacao !== ui.Button.YES) {
      ui.alert('❌ Operação cancelada pelo usuário.');
      return;
    }

    ui.alert('⏳ Gerando relatório detalhado...\n\nPor favor, aguarde enquanto os dados são processados.');

    // Executa a geração do relatório
    const resultado = gerarRelatorioDetalhado();
    
    const mensagem = `✅ Relatório detalhado gerado com sucesso!\n\n` +
                    `📊 Total de linhas criadas: ${resultado.totalLinhas}\n` +
                    `📍 Total de ensaios processados: ${resultado.totalEnsaio}\n\n` +
                    `📋 O relatório foi atualizado na aba "Relatório" da planilha principal.`;

    ui.alert('✅ Sucesso!', mensagem, ui.ButtonSet.OK);
    
    console.log('✅ Relatório detalhado gerado com sucesso:', resultado);

  } catch (error) {
    console.error('❌ Erro no menu de relatório detalhado:', error);
    const ui = SpreadsheetApp.getUi();
    ui.alert('❌ Erro', `Erro ao gerar relatório detalhado:\n\n${error.message}`, ui.ButtonSet.OK);
  }
}

/**
 * ATUALIZAÇÃO INCREMENTAL TOTAL (Real-time)
 * Esta função coordena a atualização de todas as abas da regional
 * sem precisar reconstruir tudo do zero.
 */
function atualizarTudoRegionalIncremental(regionalId, data) {
  console.log(`🚀 [INCREMENTAL] Iniciando atualização total para regional: ${regionalId}`);
  
  try {
    const ss = SpreadsheetApp.openById(regionalId);
    SpreadsheetApp.flush();
    
    // Busca robusta de abas (case-insensitive)
    const sheets = ss.getSheets();
    const getSheetRobust = (name) => {
      const target = name.toLowerCase().trim();
      return sheets.find(s => s.getName().toLowerCase().trim() === target);
    };

    const shRegistros = getSheetRobust('Registros');
    const shResumo = getSheetRobust('Resumo');
    
    // Tenta pegar o local do dado enviado, ou do nome da planilha de forma mais flexível
    let localEnsaio = data ? (data['LOCAL_ENSAIO'] || data['local_ensaio']) : null;
    if (!localEnsaio) {
      const nameParts = ss.getName().trim().split(' ');
      localEnsaio = nameParts[nameParts.length - 1]; // Pega a última palavra (ex: 'Itapevi')
    }
    
    // 1. Atualizar Dashboard (Resumo)
    if (shResumo && shRegistros) {
      console.log('📊 [INCREMENTAL] Atualizando Resumo...');
      atualizarResumoContadorIncremental(shResumo, data, ss);
    }
    
    // 2. Sincronizar Abas de Registros (Organistas e Ministério)
    if (shRegistros) {
      console.log('🎹 [INCREMENTAL] Reordenando Organistas e Ministério...');
      alimentarAbaOrganistasDestino(localEnsaio, ss, localEnsaio, shRegistros);
      alimentarAbaMinisterioDestino(localEnsaio, ss, localEnsaio, shRegistros);
    }
    
    SpreadsheetApp.flush();
    console.log('✅ [INCREMENTAL] Atualização concluída com sucesso!');
  } catch (e) {
    console.error('❌ [INCREMENTAL] Erro na atualização:', e.message);
  }
}


/**
 * RECONTAGEM LOCAL (Real-time & Auto-corretiva)
 * Lê a aba Registros da própria regional e atualiza o Dashboard instantaneamente.
 * Substitui a lógica de "+1" para garantir que o dashboard esteja sempre 100% certo.
 */
function atualizarResumoContadorIncremental(shResumo, data, ss) {
  console.log('🔄 [REAL-TIME] Iniciando recontagem local para o Dashboard...');
  
  // Busca a aba de registros de forma insensível a maiúsculas/minúsculas
  let shRegistros = ss.getSheetByName('Registros');
  if (!shRegistros) shRegistros = ss.getSheetByName('registros');
  if (!shRegistros) shRegistros = ss.getSheets().find(s => s.getName().toUpperCase() === 'REGISTROS');
  
  if (!shRegistros) {
    console.warn('⚠️ Aba de Registros não encontrada na regional.');
    return { membros: 0, organistas: 0, ministerio: 0 };
  }

  // 🚨 NUCLEAR FLUSH: Força o Google a "ver" os dados recém-chegados
  SpreadsheetApp.flush();
  
  let dataLocal = shRegistros.getDataRange().getValues();
  
  // TENTATIVA DE RECUPERAÇÃO: Se o Google retornar vazio mas sabemos que há dados
  if (dataLocal.length < 2 && shRegistros.getLastRow() > 1) {
    console.warn('⏳ Latência detectada. Tentando nova leitura...');
    Utilities.sleep(1000);
    SpreadsheetApp.flush();
    dataLocal = shRegistros.getDataRange().getValues();
  }

  if (dataLocal.length < 2) {
    console.warn('ℹ️ Aba de registros está realmente vazia.');
    limparContadoresResumo(shResumo);
    return { membros: 0, organistas: 0, ministerio: 0 };
  }

  const headers = dataLocal[0].map(h => (h || '').toString().trim().toUpperCase());
  
  // Busca flexível de cabeçalhos para evitar erros entre regionais
  const findIdx = (names) => {
    for (let name of names) {
      let idx = headers.indexOf(name.toUpperCase());
      if (idx >= 0) return idx;
    }
    return -1;
  };

  const idxCargo = findIdx(['CARGO', 'FUNÇÃO', 'OFÍCIO', 'CARGO/OFÍCIO']);
  const idxInstr = findIdx(['INSTRUMENTO', 'INSTRUMENTOS', 'INSTR.', 'FAMILIA']);

  if (idxCargo === -1) {
    console.warn(`⚠️ [RESUMO] Coluna de CARGO não encontrada.`);
    return { membros: dataLocal.length - 1 };
  }

  const contadores = {};

  // Processa os registros locais
  for (let i = 1; i < dataLocal.length; i++) {
    const row = dataLocal[i];
    const cargo = (row[idxCargo] || '').toString().trim();
    const instr = idxInstr >= 0 ? (row[idxInstr] || '').toString().trim() : '';
    
    const cargoMapeado = mapearCargoParaContagem(cargo);
    const instrMapeado = mapearInstrumento(instr);

    // 1. Conta o Cargo (Sempre)
    if (cargoMapeado) {
      contadores[cargoMapeado] = (contadores[cargoMapeado] || 0) + 1;
    }
    
    // 2. Regra Especial: Secretários da Música não contam instrumento (Exclusivo)
    const isSecretario = cargoMapeado === 'Secretário da Música' || cargoMapeado === 'Secretária da Música';

    // 3. Conta o Instrumento (Exceto se for secretário ou se já for organista contada acima)
    if (instrMapeado && instrMapeado !== 'Organista' && !isSecretario) {
      contadores[instrMapeado] = (contadores[instrMapeado] || 0) + 1;
    }
  }

  // Insere a fórmula de comparativo de pessoas reais na coluna C50
  try {
    shResumo.getRange('C50').setFormula('=COUNTA(Registros!C2:C)');
  } catch (e) {
    console.warn('⚠️ Não foi possível inserir a fórmula em C50');
  }

  const arrayUpdates = [];
  Object.keys(contadores).forEach(k => {
    const label = k.trim();
    if (label !== 'Total' && label !== 'TOTAL GERAL' && label !== 'Ministério' && label !== 'Organistas') {
      arrayUpdates.push({ rotulo: label, valor: contadores[label] });
    }
  });

  // Aplica ao Resumo (Respeitando as linhas com fórmulas: 28, 41, 48, 50)
  // 🚨 PROTEÇÃO EXTRA: B28, B41, B48, B50 SÃO FÓRMULAS E NÃO PODEM SER TOCADOS
  const linhasProtegidas = [28, 41, 48, 50];
  limparContadoresResumo(shResumo, linhasProtegidas);
  atualizarTodosContadoresResumoBulk(shResumo, arrayUpdates, linhasProtegidas);
  
  console.log(`✅ [REAL-TIME] Resumo atualizado na planilha.`);
  
  return { sucesso: true };
}




/**
 * Adiciona uma organista na lista e reordena mantendo a prioridade
 */
function adicionarOrganistaIncremental(ss, data) {
  let sh = ss.getSheetByName('Organistas');
  if (!sh) return;

  const lastRow = sh.getLastRow();
  if (lastRow < 4) return; // Header na linha 4

  // Mapear dados
  const nome = (data['NOME COMPLETO'] || '').toString().trim();
  const cargo = (data['CARGO'] || '').toString().trim();
  const nivel = (data['CLASSE_ORGANISTA'] || data['NÍVEL'] || '').toString().trim();
  const comum = (data['COMUM'] || '').toString().trim();
  const cidade = (data['CIDADE'] || '').toString().trim();
  
  // Novo ID (incremento simples)
  let nextId = 1;
  if (lastRow >= 5) {
    const ids = sh.getRange(5, 1, lastRow - 4, 1).getValues();
    nextId = ids.length + 1;
  }

  // Append na última linha
  sh.appendRow([nextId, nome, cargo, nivel, comum, cidade, 'SIM']);
  
  // Reordenar por prioridade (simulando a lógica do script original)
  reordenarListaIncremental(sh, 5, [
    { col: 3, type: 'prioridade_organista' }, // Cargo (Prioridade)
    { col: 2, type: 'string' }              // Nome
  ]);
  
  console.log(`🎹 Organista adicionada: ${nome}`);
}

/**
 * Adiciona ao Ministério e reordena
 */
function adicionarMinisterioIncremental(ss, data) {
  let sh = ss.getSheetByName('Ministério');
  if (!sh) return;

  const lastRow = sh.getLastRow();
  if (lastRow < 4) return;

  const nome = (data['NOME COMPLETO'] || '').toString().trim();
  const cargo = (data['CARGO'] || '').toString().trim();
  const comum = (data['COMUM'] || '').toString().trim();
  const cidade = (data['CIDADE'] || '').toString().trim();

  let nextId = 1;
  if (lastRow >= 5) {
    const ids = sh.getRange(5, 1, lastRow - 4, 1).getValues();
    nextId = ids.length + 1;
  }

  sh.appendRow([nextId, nome, cargo, comum, cidade]);
  
  reordenarListaIncremental(sh, 5, [
    { col: 3, type: 'prioridade_ministerio' }, 
    { col: 2, type: 'string' }
  ]);
  
  console.log(`👔 Ministério adicionado: ${nome}`);
}

/**
 * Função genérica de ordenação que entende as prioridades de cargo
 */
function reordenarListaIncremental(sh, startRow, configs) {
  const lastRow = sh.getLastRow();
  if (lastRow <= startRow) return;

  const range = sh.getRange(startRow, 1, lastRow - startRow + 1, sh.getLastColumn());
  const values = range.getValues();

  values.sort((a, b) => {
    for (let config of configs) {
      let valA = a[config.col - 1];
      let valB = b[config.col - 1];

      if (config.type === 'prioridade_organista') {
        const pA = obterPrioridadeCargoIncremental(valA);
        const pB = obterPrioridadeCargoIncremental(valB);
        if (pA !== pB) return pA - pB;
      } else if (config.type === 'prioridade_ministerio') {
        const pA = obterPrioridadeMinisterioIncremental(valA);
        const pB = obterPrioridadeMinisterioIncremental(valB);
        if (pA !== pB) return pA - pB;
      } else {
        if (valA < valB) return -1;
        if (valA > valB) return 1;
      }
    }
    return 0;
  });

  // Atualiza IDs após o sort
  values.forEach((row, idx) => {
    row[0] = idx + 1;
  });

  range.setValues(values);
}

function obterPrioridadeCargoIncremental(cargo) {
  const c = String(cargo || '').toLowerCase();
  if (c.includes('examinadora')) return 1;
  if (c.includes('secretaria') && c.includes('musica')) return 2;
  if (c.includes('instrutora')) return 3;
  if (c.includes('organista')) return 4;
  return 5;
}

function obterPrioridadeMinisterioIncremental(cargo) {
  const c = String(cargo || '').toUpperCase();
  if (c === 'ANCIÃO') return 1;
  if (c === 'DIÁCONO') return 2;
  if (c === 'ENCARREGADO REGIONAL') return 3;
  if (c === 'COOPERADOR DO OFÍCIO') return 4;
  if (c === 'COOPERADOR DE JOVENS') return 5;
  return 999;
}

/**
 * Busca todos os registros de um local diretamente no Supabase (Alta Performance)
 */
function buscarRegistrosSupabase(localEnsaio) {
  if (!localEnsaio) return [];
  
  const localBusca = String(localEnsaio).toUpperCase().trim();
  // 🚨 CORREÇÃO CRÍTICA: O nome da tabela no Supabase é 'presencas', não 'registros'
  const baseUrl = SUPABASE_URL + '/rest/v1/presencas?select=*&local_ensaio=ilike.%2A' + encodeURIComponent(localBusca) + '%2A&order=data_ensaio.desc';
  
  const options = {
    'method': 'get',
    'headers': {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': 'Bearer ' + SUPABASE_ANON_KEY,
      'Content-Type': 'application/json',
      'Prefer': 'count=exact'
    },
    'muteHttpExceptions': true
  };
  
  try {
    const todos = [];
    const pageSize = 1000;
    let offset = 0;

    while (true) {
      const response = UrlFetchApp.fetch(baseUrl + '&limit=' + pageSize + '&offset=' + offset, options);
      const code = response.getResponseCode();
      if (code !== 200 && code !== 206) {
        console.error('Erro ao buscar no Supabase. HTTP ' + code + ': ' + response.getContentText());
        break;
      }

      const pagina = JSON.parse(response.getContentText());
      todos.push.apply(todos, pagina);

      if (pagina.length < pageSize) break;
      offset += pageSize;
    }

    return todos;
  } catch (e) {
    console.error('Erro ao buscar no Supabase:', e.message);
  }
  return [];
}

function buscarTodosRegistrosSupabase() {
  const baseUrl = SUPABASE_URL + '/rest/v1/presencas?select=*&order=data_ensaio.asc';
  const options = {
    'method': 'get',
    'headers': {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': 'Bearer ' + SUPABASE_ANON_KEY,
      'Content-Type': 'application/json',
      'Prefer': 'count=exact'
    },
    'muteHttpExceptions': true
  };

  const todos = [];
  const pageSize = 1000;
  let offset = 0;

  while (true) {
    const response = UrlFetchApp.fetch(baseUrl + '&limit=' + pageSize + '&offset=' + offset, options);
    const code = response.getResponseCode();
    if (code !== 200 && code !== 206) {
      throw new Error('Erro ao buscar todos os registros no Supabase. HTTP ' + code + ': ' + response.getContentText());
    }

    const pagina = JSON.parse(response.getContentText());
    todos.push.apply(todos, pagina);

    if (pagina.length < pageSize) break;
    offset += pageSize;
  }

  return todos;
}

function atualizarMatrizDesdeSupabase() {
  console.log('📥 [MATRIZ] Lendo estado atual do Supabase...');

  const registros = buscarTodosRegistrosSupabase();
  const ss = SpreadsheetApp.openById(DEFAULT_SHEET_ID);
  let shMatriz = ss.getSheetByName(SHEET_NAME);
  if (!shMatriz) shMatriz = ss.insertSheet(SHEET_NAME);

  atualizarAbaRegistrosLocalBulk(shMatriz, registros);
  SpreadsheetApp.flush();

  console.log(`✅ [MATRIZ] ${registros.length} registro(s) reconciliado(s) a partir do Supabase.`);
  return {
    sucesso: true,
    fonte: 'Supabase',
    destino: SHEET_NAME,
    totalRegistros: registros.length
  };
}

function parseDataHoraRegistro(valor) {
  if (!valor) return null;
  if (Object.prototype.toString.call(valor) === '[object Date]' && !isNaN(valor.getTime())) return valor;

  const texto = String(valor).trim();
  if (!texto) return null;

  const br = texto.match(/^(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{2}):(\d{2})(?::(\d{2}))?)?$/);
  if (br) {
    return new Date(
      Number(br[3]),
      Number(br[2]) - 1,
      Number(br[1]),
      Number(br[4] || 0),
      Number(br[5] || 0),
      Number(br[6] || 0)
    );
  }

  const isoDateOnly = texto.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoDateOnly) {
    return new Date(Number(isoDateOnly[1]), Number(isoDateOnly[2]) - 1, Number(isoDateOnly[3]), 0, 0, 0);
  }

  const parsed = new Date(texto);
  return isNaN(parsed.getTime()) ? null : parsed;
}

function normalizarRegistradoPor(valor) {
  return valor ? String(valor).trim().toUpperCase() : '';
}

function ehDataSemHora(valor) {
  if (!valor) return true;
  if (Object.prototype.toString.call(valor) === '[object Date]') {
    return valor.getHours() === 0 && valor.getMinutes() === 0 && valor.getSeconds() === 0;
  }

  const texto = String(valor).trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(texto) || /^\d{2}\/\d{2}\/\d{4}$/.test(texto);
}

function combinarDataComHora(dataBase, horaBase) {
  if (!dataBase || !horaBase) return dataBase || horaBase || null;
  return new Date(
    dataBase.getFullYear(),
    dataBase.getMonth(),
    dataBase.getDate(),
    horaBase.getHours(),
    horaBase.getMinutes(),
    horaBase.getSeconds()
  );
}

function obterDataHoraRegistro(reg) {
  if (!reg) return null;

  const dataPrincipal = parseDataHoraRegistro(reg.data_ensaio);
  if (dataPrincipal && !ehDataSemHora(reg.data_ensaio)) return dataPrincipal;

  const createdAt = parseDataHoraRegistro(reg.created_at);
  if (dataPrincipal && createdAt) return combinarDataComHora(dataPrincipal, createdAt);
  if (createdAt) return createdAt;

  const syncedAt = parseDataHoraRegistro(reg.synced_at);
  if (dataPrincipal && syncedAt) return combinarDataComHora(dataPrincipal, syncedAt);
  if (syncedAt) return syncedAt;

  return dataPrincipal;
}

/**
 * Atualiza a aba Registros local de uma planilha regional de uma vez (Bulk)
 */
function atualizarAbaRegistrosLocalBulk(sheet, registros) {
  const headers = [
    'UUID','NOME COMPLETO','COMUM','CIDADE','CARGO','NÍVEL','INSTRUMENTO',
    'NAIPE_INSTRUMENTO','CLASSE_ORGANISTA','LOCAL_ENSAIO','DATA_ENSAIO',
    'REGISTRADO_POR','SYNC_STATUS','SYNCED_AT','ANOTACOES','DUPLICATA'
  ];
  
  // Garante cabeçalho
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight('bold');

  const registrosOrdenados = (registros || []).slice().sort((a, b) => {
    const dataA = obterDataHoraRegistro(a);
    const dataB = obterDataHoraRegistro(b);
    const tsA = dataA ? dataA.getTime() : 0;
    const tsB = dataB ? dataB.getTime() : 0;
    return tsA - tsB;
  });
  
  const values = registrosOrdenados.map(reg => [
    reg.uuid || '',
    reg.nome_completo || '',
    reg.comum || '',
    reg.cidade || '',
    reg.cargo || '',
    reg.nivel || '',
    reg.instrumento || '',
    reg.naipe_instrumento || '',
    reg.classe_organista || '',
    reg.local_ensaio || '',
    obterDataHoraRegistro(reg) || reg.data_ensaio || '',
    normalizarRegistradoPor(reg.registrado_por),
    'SYNCED',
    reg.synced_at || '',
    reg.anotacoes || '',
    reg.duplicata || ''
  ]);

  const lastRow = sheet.getLastRow();
  const lastCol = Math.max(sheet.getLastColumn(), headers.length);
  if (lastRow > 1) {
    sheet.getRange(2, 1, lastRow - 1, lastCol).clearContent();
  }

  if (values.length > 0) {
    sheet.getRange(2, 1, values.length, headers.length).setValues(values);
    sheet.getRange(2, headers.indexOf('DATA_ENSAIO') + 1, values.length, 1).setNumberFormat('dd/MM/yyyy HH:mm');
  }
}
/**
 * Verifica se já existe um registro idêntico no Supabase para evitar duplicatas.
 * Consulta a tabela 'presencas' por Nome, Comum, Cargo e Data.
 */
function verificarDuplicataNoSupabase(nome, comum, cargo, dataIso) {
  if (!nome || !comum || !dataIso) return false;

  const nomeBusca = String(nome).trim().toUpperCase();
  const comumBusca = String(comum).trim().toUpperCase();
  const cargoBusca = String(cargo).trim().toUpperCase();
  
  // Extrai apenas a data YYYY-MM-DD
  let dataAlvo = "";
  try {
    const d = new Date(dataIso);
    dataAlvo = Utilities.formatDate(d, "GMT-3", "yyyy-MM-dd");
  } catch(e) {
    dataAlvo = dataIso.split(' ')[0].split('T')[0];
  }

  // Query: Mesma pessoa, mesma comum, mesmo cargo, no mesmo dia
  const url = SUPABASE_URL + '/rest/v1/presencas?' + 
              'nome_completo=ilike.' + encodeURIComponent(nomeBusca) + 
              '&comum=ilike.' + encodeURIComponent(comumBusca) + 
              '&cargo=ilike.' + encodeURIComponent(cargoBusca) + 
              '&data_ensaio=gte.' + dataAlvo + 'T00:00:00' +
              '&data_ensaio=lt.' + dataAlvo + 'T23:59:59' +
              '&select=uuid';

  const options = {
    'method': 'get',
    'headers': {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': 'Bearer ' + SUPABASE_ANON_KEY
    },
    'muteHttpExceptions': true
  };

  try {
    const response = UrlFetchApp.fetch(url, options);
    if (response.getResponseCode() === 200) {
      const results = JSON.parse(response.getContentText());
      return results.length > 0;
    }
  } catch (e) {
    console.error('❌ Erro na verificação remota de duplicata:', e.message);
  }
  return false;
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
