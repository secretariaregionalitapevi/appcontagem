/***** Ensaio Regional – v7.5
 * AUTOR: Secretaria Regional Itapevi
 *****/

function onFormSubmit(e) {
  atualizarResumo();
}
// Mostra um menu customizado ao abrir a planilha
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('🔄 Atualizar')
    .addItem('📊 Atualizar agora', 'atualizarAgora')
    .addToUi();
}

/** Webhook: publicar como Web App e apontar no Zoho (POST) */
function doPost(e) {
  const lock = LockService.getDocumentLock();
  try {
    lock.waitLock(15000);
    Utilities.sleep(3000);
    atualizarAgora();
    return ContentService.createTextOutput('OK').setMimeType(ContentService.MimeType.TEXT);
  } catch (err) {
    return ContentService.createTextOutput('ERR').setMimeType(ContentService.MimeType.TEXT);
  } finally {
    try { lock.releaseLock(); } catch (_) {}
  }
}

/* ------------ Utilidades ------------ */
const norm = s => (s||'').toString().trim();
const key  = s => norm(s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const cap  = s => { s = norm(s); return s ? s[0].toUpperCase() + s.slice(1) : ''; };
const isYes = v => { const k = key(v); return k === 'sim' || k === 'yes' || k === 'y'; };

function findHeaderIndex(headerRow, synonyms) {
  const wanted = synonyms.map(key);
  for (let i = 0; i < headerRow.length; i++) {
    const h = key(headerRow[i]);
    if (wanted.includes(h)) return i;
  }
  return -1;
}
function findIgrejasColumns(headerRow) {
  const out = [];
  for (let i = 0; i < headerRow.length; i++) {
    const raw = norm(headerRow[i]);
    if (key(raw).startsWith('igrejas ')) {
      out.push({ idx: i, cidade: raw.replace(/^Igrejas\s*/i,'').trim() });
    }
  }
  return out;
}

// Busca uma aba pelo nome ignorando acentos/caixa (ex.: "Ensaio Família" ou "Ensaio Familia")
function getSheetByNameLoose(ss, name) {
  const target = key(name);
  return ss.getSheets().find(sh => key(sh.getName()) === target) || null;
}


/* ------------ Principal ------------ */
function atualizarAgora() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const shDados = ss.getSheetByName('Dados');
  if (!shDados) throw new Error('Aba "Dados" não encontrada.');

  const lastRow = shDados.getLastRow();
  const lastCol = shDados.getLastColumn();
  if (lastRow < 2) throw new Error('Não há dados abaixo do cabeçalho em "Dados".');

  const headerRow = shDados.getRange(1, 1, 1, lastCol).getDisplayValues()[0];
  const data = shDados.getRange(2, 1, lastRow - 1, lastCol).getDisplayValues();

  // Sinônimos de cabeçalho
  const H = {
    comum:  ['comum congregacao','comum congregação','comum','congregacao','congregação','igreja'],
    cargo:  ['ministerio/cargo','cargo ou ministerio','cargo ou ministério','ministério/cargo','cargo','ministerio','ministério'],
    vai:    ['vai tocar?','vai tocar','tocara?','tocará?','tocara','tocará'],
    inst:   ['instrumento'],
    nivel:  ['nivel da organista','nível da organista','nivel da organista','nivel','nível'],
    tocou:  ['tocou ultimo ensaio?','tocou no ultimo ensaio?','tocou no último ensaio?','tocou ultimo ensaio','tocou no ultimo ensaio'],
    nome:   ['somente o primeiro nome','primeiro nome','nome','somente o nome'],
    cidade: ['cidade'],
    local_ensaio: ['local_ensaio','local ensaio','local do ensaio','localidade ensaio','localidade do ensaio']
  };

  // Índices
  const COL = {
    comum:  findHeaderIndex(headerRow, H.comum),
    cargo:  findHeaderIndex(headerRow, H.cargo),
    vai:    findHeaderIndex(headerRow, H.vai),
    inst:   findHeaderIndex(headerRow, H.inst),
    nivel:  findHeaderIndex(headerRow, H.nivel),
    tocou:  findHeaderIndex(headerRow, H.tocou),
    nome:   findHeaderIndex(headerRow, H.nome),
    cidade: findHeaderIndex(headerRow, H.cidade),
    local_ensaio: findHeaderIndex(headerRow, H.local_ensaio)
  };
  const IGREJAS_INFO = findIgrejasColumns(headerRow);

  const obrig = ['nome','cidade'];
  const faltando = obrig.filter(k => COL[k] === -1);
  if (faltando.length) throw new Error('Cabeçalhos obrigatórios ausentes em "Dados": ' + faltando.join(', '));

  // Aliases (instrumentos)
  const aliasInst = {
    'organista':'Organista','acordeon':'Acordeon','violino':'Violino','viola':'Viola','violoncelo':'Violoncelo',
    'flauta transversal':'Flauta Transversal','oboe':'Oboé',"oboe d'amore":"Oboé D'Amore",'corne ingles':'Corne Inglês',
    'clarinete':'Clarinete','clarinete alto':'Clarinete Alto','clarinete baixo (clarone)':'Clarinete Baixo (Clarone)',
    'fagote':'Fagote','saxofone soprano (reto)':'Saxofone Soprano (Reto)','saxofone alto':'Saxofone Alto',
    'saxofone tenor':'Saxofone Tenor','saxofone baritono':'Saxofone Barítono','trompete':'Trompete',
    'cornet':'Cornet','flugelhorn':'Flugelhorn','trompa':'Trompa','trombone':'Trombone','trombonito':'Trombonito',
    'baritono (pisto)':'Barítono (Pisto)','eufonio':'Eufônio','tuba':'Tuba'
  };

  // Aliases (cargos)
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

  // Normaliza linhas
  const linhas = [];
  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    const nome = norm(COL.nome >= 0 ? row[COL.nome] : '');
    if (!nome) continue;

    let cidade = norm(COL.cidade >= 0 ? row[COL.cidade] : '');
    let comum  = norm(COL.comum  >= 0 ? row[COL.comum]  : '');
    let cidadeInferida = '';
    if (!comum && IGREJAS_INFO.length) {
      for (const info of IGREJAS_INFO) {
        const v = norm(row[info.idx]);
        if (v) { comum = v; cidadeInferida = info.cidade; break; }
      }
    }
    if (!comum) comum = '(Sem comum)';
    if ((!cidade || cidade.indexOf('/') !== -1) && cidadeInferida) cidade = cidadeInferida;

    const cargoRaw = norm(COL.cargo >= 0 ? row[COL.cargo] : '');
    const cargoK   = key(cargoRaw);
    const cargo    = aliasCargo[cargoK] || (cargoK ? cap(cargoRaw) : '');

    const instRaw  = norm(COL.inst  >= 0 ? row[COL.inst]  : '');
    const instK    = key(instRaw);
    const inst     = aliasInst[instK] || (instK ? cap(instRaw) : '');

    const nivel = norm(COL.nivel >= 0 ? row[COL.nivel] : '');
    const vai   = norm(COL.vai   >= 0 ? row[COL.vai]   : '');
    const tocou = norm(COL.tocou >= 0 ? row[COL.tocou] : '');
    const local_ensaio = norm(COL.local_ensaio >= 0 ? row[COL.local_ensaio] : '');

    linhas.push({nome, comum, cidade, cargo, inst, nivel, vai, tocou, local_ensaio, _ord: i});
  }

  /* ===== ENSAIO FAMILIA: total de MÚSICOS que NÃO vão tocar -> D37 ===== */
(function preencherEnsaioFamilia() {
  // funciona com ou sem acento ("Ensaio Familia"/"Ensaio Família")
  const shFamilia = (typeof getSheetByNameLoose === 'function')
    ? getSheetByNameLoose(ss, 'Ensaio Familia')
    : (ss.getSheetByName('Ensaio Familia') || ss.getSheetByName('Ensaio Família'));
  if (!shFamilia) return;

  const isNo = v => {
    const k = key(v);
    return k === 'nao' || k === 'não' || k === 'no' || k === 'n';
  };

  // Usa as linhas já normalizadas (cargo/vai/comum/nome) e deduplica por Nome+Comum
  const seen = new Set();
  let totalNaoVao = 0;
  linhas.forEach(x => {
    if (x.cargo === 'Músico' && isNo(x.vai)) {
      const sk = key(x.nome) + '|' + key(x.comum);
      if (!seen.has(sk)) {
        seen.add(sk);
        totalNaoVao++;
      }
    }
  });

  // Escreve em D37
  shFamilia.getRange(37, 4).setValue(totalNaoVao);
})();

  /* ===== Regras ===== */
  const ehMusico = (x) =>
    x.cargo !== 'Organista' &&
    (!!x.inst || isYes(x.vai));

  // Ordem fixa
  const INSTR_ORD = [
    'Organista','Acordeon','Violino','Viola','Violoncelo','Flauta Transversal','Oboé',"Oboé D'Amore",
    'Corne Inglês','Clarinete','Clarinete Alto','Clarinete Baixo (Clarone)','Fagote','Saxofone Soprano (Reto)',
    'Saxofone Alto','Saxofone Tenor','Saxofone Barítono','Trompete','Cornet','Flugelhorn','Trompa',
    'Trombone','Trombonito','Barítono (Pisto)','Eufônio','Tuba'
  ];

  // Sinônimos de rótulo para INSTRUMENTOS (usado no Resumo)
  const INSTR_LABEL_SYNONYMS = {
    'Organista': ['Organista','Organistas'] // cobre singular/plural
    // Se tiver outras variações, adicione aqui.
  };

  const CARGO_MIN_ORD = [
    'Ancião','Diácono','Cooperador do Ofício','Cooperador de Jovens',
    'Encarregado Regional','Encarregado Local','Examinadora',
    'Secretárias da Música','Secretários da Música',
    'Instrutores','Instrutoras'
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
    'Secretárias da Música': ['Secretárias da Música','Secretarias da Música','Secretária da Música','Secretaria da Música'],
    'Secretários da Música': ['Secretários da Música','Secretarios da Música','Secretário da Música','Secretario da Música'],
    'Instrutores': ['Instrutores','Instrutor'],
    'Instrutoras': ['Instrutoras','Instrutora']
  };

  /* ===== Contagens para RESUMO ===== */
  // Função auxiliar para verificar se é cargo relacionado a organistas
  // Inclui apenas: Organista, Examinadora, Instrutoras e Secretárias da Música (feminino)
  const ehCargoOrganista = (cargo) => {
    if (!cargo) return false;
    const cargoLower = cargo.toLowerCase();
    const isSecretariaMusica = (cargoLower.includes('secretária') || cargoLower.includes('secretaria')) &&
                               (cargoLower.includes('música') || cargoLower.includes('musica')) &&
                               !cargoLower.includes('secretário') && !cargoLower.includes('secretario');
    
    return cargo === 'Organista' || 
           cargo === 'Examinadora' || 
           cargo === 'Instrutoras' || 
           isSecretariaMusica;
  };
  
  const contInst = {}; INSTR_ORD.forEach(k => contInst[k] = 0);
  linhas.forEach(x => {
    if (ehCargoOrganista(x.cargo)) {
      contInst['Organista']++;
    } else if (x.inst && contInst.hasOwnProperty(x.inst) && x.inst !== 'Organista') {
      contInst[x.inst]++;
    }
  });

  const contCargoMin = {}; CARGO_MIN_ORD.forEach(k => contCargoMin[k] = 0);
  const contApoio    = {}; APOIO_IRM_ORD.forEach(k => contApoio[k]    = 0);

  linhas.forEach(x => {
    if (contCargoMin.hasOwnProperty(x.cargo)) contCargoMin[x.cargo]++;
    if (contApoio.hasOwnProperty(x.cargo))    contApoio[x.cargo]++;
  });

  // RESUMO
  const shResumo = ss.getSheetByName('Resumo');
  if (!shResumo) throw new Error('Aba "Resumo" não encontrada.');
  function escreveAoLado(sheet, rotulo, valor) {
    const tf = sheet.createTextFinder(rotulo).matchEntireCell(true);
    const matches = tf.findAll();
    matches.forEach(m => m.offset(0, 1).setValue(valor));
  }
  
  INSTR_ORD.forEach(canonical => {
  const val = contInst[canonical] || 0;
  const rLabels = INSTR_LABEL_SYNONYMS[canonical] || [canonical];
  rLabels.forEach(rot => escreveAoLado(shResumo, rot, val));
  });

  CARGO_MIN_ORD.forEach(canonical => {
    const val = contCargoMin[canonical] || 0;
    const rLabels = MIN_LABEL_SYNONYMS[canonical] || [canonical];
    rLabels.forEach(rot => escreveAoLado(shResumo, rot, val));
  });
  APOIO_IRM_ORD.forEach(canonical => {
    const val = contApoio[canonical] || 0;
    APOIO_LABEL_SYNONYMS[canonical].forEach(rot => escreveAoLado(shResumo, rot, val));
  });

  /* ===== ORGANISTAS (lista para impressão) ===== */
  // Dados em A5:G (ID, Nome, Cargo, Nível, Comum, Cidade, Tocou?)
  const shOrg = ss.getSheetByName('Organistas') || ss.insertSheet('Organistas');
  const prettySN = t => { const k = key(t); return k === 'sim' ? 'Sim' : (k === 'nao' || k === 'não' ? 'Não' : ''); };
  const organistas = linhas
    .filter(x => ehCargoOrganista(x.cargo))
    .sort((a,b) => a._ord - b._ord)
    .map((x,i) => {
      // Nível automático para Instrutoras, Examinadora e Secretárias da Música (feminino)
      const cargoLower = x.cargo ? x.cargo.toLowerCase() : '';
      const isSecretariaMusica = (cargoLower.includes('secretária') || cargoLower.includes('secretaria')) &&
                                 (cargoLower.includes('música') || cargoLower.includes('musica')) &&
                                 !cargoLower.includes('secretário') && !cargoLower.includes('secretario');
      const nivelAuto = (x.cargo === 'Instrutoras' || x.cargo === 'Examinadora' || isSecretariaMusica) 
                        ? 'OFICIALIZADA' : (x.nivel || '');
      return [i+1, x.nome, x.cargo, nivelAuto, x.comum, x.cidade, prettySN(x.tocou)];
    });
  const START_ROW = 5, START_COL = 1, NUM_COLS = 7;
  const rowsToClear = Math.max(shOrg.getMaxRows() - START_ROW + 1, 0);
  if (rowsToClear > 0) shOrg.getRange(START_ROW, START_COL, rowsToClear, NUM_COLS).clearContent();
  if (organistas.length) shOrg.getRange(START_ROW, START_COL, organistas.length, NUM_COLS).setValues(organistas);

  /* ===== MINISTÉRIO (lista para impressão) ===== */
  // Dados em A5:E (ID, Nome, Ministério, Comum, Cidade)
  // Ordem: Ancião, Diácono, Cooperador do Ofício, Cooperador de Jovens, Encarregado Regional
  const shMin = ss.getSheetByName('Ministério') || ss.insertSheet('Ministério');
  
  // Função para verificar se é cargo ministerial presente
  const ehCargoMinisterial = (cargo) => {
    if (!cargo) return false;
    const cargoUpper = cargo.toUpperCase();
    return cargoUpper === 'ANCIÃO' || 
           cargoUpper === 'DIÁCONO' || 
           cargoUpper === 'COOPERADOR DO OFÍCIO' ||
           cargoUpper === 'COOPERADOR DE JOVENS' ||
           cargoUpper === 'ENCARREGADO REGIONAL';
  };
  
  // Função para determinar ordem de prioridade do cargo ministerial
  const ordemCargoMinisterial = (cargo) => {
    if (!cargo) return 999;
    const cargoUpper = cargo.toUpperCase();
    if (cargoUpper === 'ANCIÃO') return 1;
    if (cargoUpper === 'DIÁCONO') return 2;
    if (cargoUpper === 'COOPERADOR DO OFÍCIO') return 3;
    if (cargoUpper === 'COOPERADOR DE JOVENS') return 4;
    if (cargoUpper === 'ENCARREGADO REGIONAL') return 5;
    return 999;
  };
  
  // Função para verificar se esteve presente (mesma lógica usada em outros lugares)
  // Para ministério, considerar presente se vai tocar, tocou, tem instrumento ou tem cargo ministerial
  const estevePresenteMin = (x) => {
    const vaiSim = isYes(x.vai);
    const tocouSim = isYes(x.tocou);
    const temInstrumento = !!x.inst;
    // Se tem cargo ministerial, considerar presente (mesmo sem instrumento)
    return vaiSim || tocouSim || temInstrumento || ehCargoMinisterial(x.cargo);
  };
  
  const ministerio = linhas
    .filter(x => {
      // Filtrar apenas cargos ministeriais que estiveram presentes
      return ehCargoMinisterial(x.cargo) && estevePresenteMin(x);
    })
    .sort((a, b) => {
      // Ordenar primeiro por ordem do cargo, depois por ordem original
      const ordemA = ordemCargoMinisterial(a.cargo);
      const ordemB = ordemCargoMinisterial(b.cargo);
      if (ordemA !== ordemB) {
        return ordemA - ordemB;
      }
      return a._ord - b._ord;
    })
    .map((x, i) => {
      return [i+1, x.nome, x.cargo, x.comum, x.cidade];
    });
  
  const START_ROW_MIN = 5, START_COL_MIN = 1, NUM_COLS_MIN = 5;
  const rowsToClearMin = Math.max(shMin.getMaxRows() - START_ROW_MIN + 1, 0);
  if (rowsToClearMin > 0) shMin.getRange(START_ROW_MIN, START_COL_MIN, rowsToClearMin, NUM_COLS_MIN).clearContent();
  if (ministerio.length) shMin.getRange(START_ROW_MIN, START_COL_MIN, ministerio.length, NUM_COLS_MIN).setValues(ministerio);
  
  // Criar cabeçalho se não existir
  const headerExistsMin = shMin.getRange(4, 1, 1, NUM_COLS_MIN).getDisplayValues()[0].some(cell => cell && cell.toString().trim());
  if (!headerExistsMin) {
    shMin.getRange(4, 1, 1, NUM_COLS_MIN).setValues([['ID', 'Nome', 'Ministério', 'Comum', 'Cidade']]);
    shMin.getRange(4, 1, 1, NUM_COLS_MIN).setFontWeight('bold');
    shMin.getRange(4, 1, 1, NUM_COLS_MIN).setBackground('#e8f0fe');
  }

  /* ===== ITAPEVI x VISITANTES ===== */
  const shSeg = ss.getSheetByName('Itapevi x Visitantes') || ss.insertSheet('Itapevi x Visitantes');
  shSeg.clearContents();

  const isItapevi = c => key(c).includes('itapevi');
  const mapIta = {}, mapVis = {};
  linhas.forEach(x => {
  const bucket = isItapevi(x.cidade) ? mapIta : mapVis;
  if (!bucket[x.comum]) bucket[x.comum] = {musicos:0, organistas:0};

  // 👉 Só conta músico se tiver instrumento (e não for cargo relacionado a organistas)
  if (x.inst && !ehCargoOrganista(x.cargo)) bucket[x.comum].musicos++;

  // Organistas (inclui Examinadora, Instrutoras e Secretários/Secretárias da Música)
  if (ehCargoOrganista(x.cargo)) {
    bucket[x.comum].organistas++;
  }
});


  const HEADER = ['Comum','Músicos','Organistas'];
  let row = 1;
  // Itapevi
  shSeg.getRange(row,1,1,3).setValues([HEADER]).setFontWeight('bold'); row++;
  const linhasIta = Object.keys(mapIta).sort((a,b)=>a.localeCompare(b,'pt-BR'))
                     .map(k => [k, mapIta[k].musicos, mapIta[k].organistas]);
  if (linhasIta.length) { shSeg.getRange(row,1,linhasIta.length,3).setValues(linhasIta); row += linhasIta.length; }
  row += 2;
  // Visitantes
  shSeg.getRange(row,1,1,3).setValues([HEADER]).setFontWeight('bold'); row++;
  const linhasVis = Object.keys(mapVis).sort((a,b)=>a.localeCompare(b,'pt-BR'))
                     .map(k => [k, mapVis[k].musicos, mapVis[k].organistas]);
  if (linhasVis.length) { shSeg.getRange(row,1,linhasVis.length,3).setValues(linhasVis); }

  const totIta = linhasIta.reduce((acc, r) => { acc.m += r[1]; acc.o += r[2]; return acc; }, {m:0,o:0});
  const totVis = linhasVis.reduce((acc, r) => { acc.m += r[1]; acc.o += r[2]; return acc; }, {m:0,o:0});
  shSeg.getRange(1,6,1,2).setValues([['Músicos Itapevi','']]).setFontWeight('bold');
  shSeg.getRange(2,6,1,2).setValues([['Organistas Itapevi','']]).setFontWeight('bold');
  shSeg.getRange(4,6,1,2).setValues([['Músicos Visitantes','']]).setFontWeight('bold');
  shSeg.getRange(5,6,1,2).setValues([['Organistas Visitantes','']]).setFontWeight('bold');
  shSeg.getRange(1,7).setValue(totIta.m);
  shSeg.getRange(2,7).setValue(totIta.o);
  shSeg.getRange(4,7).setValue(totVis.m);
  shSeg.getRange(5,7).setValue(totVis.o);
  try { shSeg.autoResizeColumns(1, shSeg.getLastColumn()); } catch (e) {}
  try { shSeg.getDataRange().setFontFamily('Arial').setFontSize(11); } catch (e) {}

  /* ===== IGREJAS ITAPEVI (preenche colunas B:C a partir da coluna A) ===== */
  const shIgrejas = ss.getSheetByName('Igrejas Itapevi');
  if (shIgrejas) {
    const lr = shIgrejas.getLastRow();
    if (lr >= 1) {
      // Normaliza comum: remove prefixo "BR-22-2093 -", sufixo " - ITAPEVI", colapsa espaços
      const normComum = s => {
        let k = key(s);
        k = k.replace(/^br-\d+(?:-\d+)?\s*-\s*/, '');
        k = k.replace(/\s*-\s*itapevi$/, '');
        k = k.replace(/\s+/g, ' ').trim();
        return k;
      };
      // Mapa normalizado
      const mapItaNorm = {};
      Object.keys(mapIta).forEach(orig => {
        const nk = normComum(orig);
        if (!mapItaNorm[nk]) mapItaNorm[nk] = { musicos: 0, organistas: 0 };
        mapItaNorm[nk].musicos    += mapIta[orig].musicos;
        mapItaNorm[nk].organistas += mapIta[orig].organistas;
      });
      // Lê coluna A
      const listaComuns = shIgrejas.getRange(1, 1, lr, 1).getDisplayValues()
        .map(r => (r[0] || '').toString().trim());
      const pegaContagem = (comum) => {
        const exato = mapIta[comum];
        if (exato) return [exato.musicos, exato.organistas];
        const normed = mapItaNorm[normComum(comum)];
        return normed ? [normed.musicos, normed.organistas] : [0, 0];
      };
      const saida = listaComuns.map((comum, i) => {
        if (!comum) return ['', ''];
        if (i === 0 && /^comum$/i.test(comum)) return ['Músicos', 'Organistas'];
        const [m, o] = pegaContagem(comum);
        return [m, o];
      });
      shIgrejas.getRange(1, 2, lr, 2).setValues(saida);
      try { shIgrejas.getRange(1, 2, lr, 2).setFontFamily('Arial').setFontSize(11); } catch (e) {}
    }
  }

  /* ===== COMUNS (por cidade) ===== */
  const shCom = ss.getSheetByName('Comuns') || ss.insertSheet('Comuns');
  shCom.clearContents();

  const cityMap = {};
  linhas.forEach(x => {
    const cidade = x.cidade || '(Sem cidade)';
    if (!cityMap[cidade]) cityMap[cidade] = { commons: {}, totalM:0, totalO:0 };
    if (!cityMap[cidade].commons[x.comum]) cityMap[cidade].commons[x.comum] = { m:0, o:0 };
    if (ehMusico(x)) { cityMap[cidade].commons[x.comum].m++; cityMap[cidade].totalM++; }
    if (ehCargoOrganista(x.cargo)) {
      cityMap[cidade].commons[x.comum].o++; cityMap[cidade].totalO++;
    }
  });

  let r = 1;
  const HEADER_COMUNS = ['Comum','Músicos','Organistas'];
  const cidades = Object.keys(cityMap).sort((a,b)=>a.localeCompare(b,'pt-BR'));
  cidades.forEach(cidade => {
    const totalCidade = cityMap[cidade].totalM + cityMap[cidade].totalO;
    shCom.getRange(r,1).setValue(cidade).setFontWeight('bold'); r++;
    shCom.getRange(r,1,1,3).setValues([HEADER_COMUNS]).setFontWeight('bold');
    shCom.getRange(r,6,1,2).setValues([['Total por cidade', totalCidade]]).setFontWeight('bold');
    r++;
    const linhasCidade = Object.keys(cityMap[cidade].commons)
      .sort((a,b)=>a.localeCompare(b,'pt-BR'))
      .map(comum => {
        const c = cityMap[cidade].commons[comum];
        return [comum, c.m, c.o];
      });
    if (linhasCidade.length) {
      shCom.getRange(r,1,linhasCidade.length,3).setValues(linhasCidade);
      r += linhasCidade.length;
    }
    r++;
  });

  r++;
  shCom.getRange(r,1).setValue('Totais por cidade').setFontWeight('bold'); r++;
  shCom.getRange(r,1,1,4).setValues([['Cidade','Músicos','Organistas','Total']]).setFontWeight('bold'); r++;

  const tabelaTotais = cidades.map(cidade => {
    const tm = cityMap[cidade].totalM;
    const to = cityMap[cidade].totalO;
    return [cidade, tm, to, tm + to];
  });
  if (tabelaTotais.length) shCom.getRange(r,1,tabelaTotais.length,4).setValues(tabelaTotais);
  try { shCom.autoResizeColumns(1, shCom.getLastColumn()); } catch(e){}
  try { shCom.getDataRange().setFontFamily('Arial').setFontSize(11); } catch(e){}

  /* ===== PRESENTES POR LOCALIDADE DO ENSAIO ===== */
  const shPresentes = ss.getSheetByName('Presentes por Localidade') || ss.insertSheet('Presentes por Localidade');
  shPresentes.clearContents();

  // Função para determinar se a pessoa esteve presente
  const estevePresente = (x) => {
    // Considera presente se:
    // 1. Vai tocar (vai = 'sim')
    // 2. Tocou no último ensaio (tocou = 'sim')
    // 3. Tem instrumento definido (indica participação musical)
    const vaiSim = isYes(x.vai);
    const tocouSim = isYes(x.tocou);
    const temInstrumento = !!x.inst;
    
    return vaiSim || tocouSim || temInstrumento;
  };

  // Agrupa por local_ensaio
  const localMap = {};
  linhas.forEach(x => {
    if (!estevePresente(x)) return; // Só conta os presentes
    
    const local = x.local_ensaio || '(Sem local definido)';
    if (!localMap[local]) {
      localMap[local] = {
        musicos: 0,
        organistas: 0,
        ministerio: 0,
        apoio: 0,
        total: 0,
        detalhes: []
      };
    }
    
    // Classifica por tipo de cargo
    if (ehCargoOrganista(x.cargo)) {
      localMap[local].organistas++;
    } else if (ehMusico(x)) {
      localMap[local].musicos++;
    } else if (['Ancião','Diácono','Cooperador do Ofício','Cooperador de Jovens','Encarregado Regional','Encarregado Local','Instrutores'].includes(x.cargo)) {
      localMap[local].ministerio++;
    } else if (['Porteiros (as)','Bombeiros (as)','Médicos (as) / Ambulatório','Enfermeiros (as)','Irmandade'].includes(x.cargo)) {
      localMap[local].apoio++;
    }
    
    localMap[local].total++;
    localMap[local].detalhes.push({
      nome: x.nome,
      comum: x.comum,
      cidade: x.cidade,
      cargo: x.cargo,
      inst: x.inst,
      nivel: x.nivel
    });
  });

  // Ordena as localidades alfabeticamente
  const locais = Object.keys(localMap).sort((a,b) => a.localeCompare(b,'pt-BR'));
  
  let rowPresentes = 1;
  const HEADER_PRESENTES = ['Local do Ensaio','Músicos','Organistas','Ministério','Apoio','Total'];
  
  // Cabeçalho principal
  shPresentes.getRange(rowPresentes,1,1,6).setValues([HEADER_PRESENTES]).setFontWeight('bold');
  shPresentes.getRange(rowPresentes,1,1,6).setBackground('#4285f4').setFontColor('white');
  rowPresentes += 2;

  // Dados por localidade
  locais.forEach(local => {
    const dados = localMap[local];
    
    // Linha de resumo da localidade
    shPresentes.getRange(rowPresentes,1,1,6).setValues([[
      local,
      dados.musicos,
      dados.organistas,
      dados.ministerio,
      dados.apoio,
      dados.total
    ]]);
    
    // Destaca a linha se tem muitos presentes
    if (dados.total >= 10) {
      shPresentes.getRange(rowPresentes,1,1,6).setBackground('#e8f0fe');
    }
    
    rowPresentes++;
    
    // Detalhes dos presentes (se solicitado, pode ser expandido)
    if (dados.detalhes.length > 0) {
      // Cabeçalho dos detalhes
      shPresentes.getRange(rowPresentes,1,1,6).setValues([['Nome','Comum','Cidade','Cargo','Instrumento','Nível']]).setFontWeight('bold').setBackground('#f8f9fa');
      rowPresentes++;
      
      // Dados dos detalhes
      dados.detalhes.forEach(detalhe => {
        shPresentes.getRange(rowPresentes,1,1,6).setValues([[
          detalhe.nome,
          detalhe.comum,
          detalhe.cidade,
          detalhe.cargo,
          detalhe.inst,
          detalhe.nivel
        ]]);
        rowPresentes++;
      });
      
      rowPresentes++; // Espaço entre localidades
    }
  });

  // Totais gerais
  rowPresentes++;
  const totalGeral = locais.reduce((acc, local) => {
    const dados = localMap[local];
    acc.musicos += dados.musicos;
    acc.organistas += dados.organistas;
    acc.ministerio += dados.ministerio;
    acc.apoio += dados.apoio;
    acc.total += dados.total;
    return acc;
  }, {musicos: 0, organistas: 0, ministerio: 0, apoio: 0, total: 0});

  shPresentes.getRange(rowPresentes,1,1,6).setValues([[
    'TOTAL GERAL',
    totalGeral.musicos,
    totalGeral.organistas,
    totalGeral.ministerio,
    totalGeral.apoio,
    totalGeral.total
  ]]).setFontWeight('bold').setBackground('#ffeb3b');

  // Formatação final
  try { shPresentes.autoResizeColumns(1, shPresentes.getLastColumn()); } catch(e){}
  try { shPresentes.getDataRange().setFontFamily('Arial').setFontSize(11); } catch(e){}
  
  // Congela a primeira linha
  try { shPresentes.setFrozenRows(1); } catch(e){}
}
