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

// Função principal genérica para alimentar aba Ministério em qualquer planilha destino
function alimentarAbaMinisterioDestino(localEnsaio, ssDestino, nomePlanilha, shSource = null) {
  try {
    console.log(`🏛️ Iniciando alimentação da aba Ministério na planilha externa de ${nomePlanilha} para: ${localEnsaio}`);
    
    // Se localEnsaio não foi fornecido ou está vazio, usa o nome da planilha como padrão
    if (!localEnsaio || localEnsaio === 'undefined' || String(localEnsaio).trim() === '') {
      localEnsaio = nomePlanilha;
      console.log(`⚠️ [alimentarAbaMinisterioDestino] Usando local padrão: "${localEnsaio}"`);
    }

    // 🚨 AJUSTE: Usar shSource se fornecido (ex: aba Registros da regional)
    const shDados = shSource || openOrCreateSheet(SHEET_NAME);
    const lastRow = shDados.getLastRow();
    const lastCol = shDados.getLastColumn();
    
    if (lastRow < 2) {
      console.warn(`[alimentarAbaMinisterioDestino] Fonte "${shDados.getName()}" está vazia.`);
      return { ok: false, mensagem: 'Sem dados para processar' };
    }

    const headerRow = shDados.getRange(1, 1, 1, lastCol).getDisplayValues()[0];
    const data = shDados.getRange(2, 1, lastRow - 1, lastCol).getDisplayValues();

    const headerMap = {};
    headerRow.forEach((h, i) => {
      if (h) headerMap[h.toString().trim().toUpperCase()] = i;
    });

    const idxNome = headerMap['NOME COMPLETO'];
    const idxCargo = headerMap['CARGO'];
    const idxComum = headerMap['COMUM'];
    const idxCidade = headerMap['CIDADE'];
    const idxLocalEnsaio = headerMap['LOCAL_ENSAIO'];
    const idxVaiTocar = headerMap['VAI_TOCAR'];
    const idxInstrumento = headerMap['INSTRUMENTO'];

    if (idxNome === undefined || idxCargo === undefined) {
      throw new Error('Colunas "NOME COMPLETO" ou "CARGO" não encontradas na aba Dados');
    }
    
    if (!localEnsaio || localEnsaio === 'undefined' || String(localEnsaio).trim() === '' || localEnsaio === nomePlanilha) {
      if (idxLocalEnsaio >= 0) {
        for (let i = 0; i < Math.min(data.length, 100); i++) {
          const localEncontrado = norm(data[i][idxLocalEnsaio] || '');
          if (localEncontrado && localEncontrado !== '(Sem local definido)' && compararLocaisEnsaio(localEncontrado, nomePlanilha)) {
            localEnsaio = localEncontrado;
            break;
          }
        }
      }
      if (!localEnsaio || localEnsaio === 'undefined' || String(localEnsaio).trim() === '') {
        localEnsaio = nomePlanilha;
      }
    }

    const ehCargoMinisterial = (cargo) => {
      if (!cargo) return false;
      const cargoUpper = cargo.toUpperCase();
      const cargosMin = [
        'ANCIÃO', 'DIÁCONO', 'ENCARREGADO REGIONAL', 'COOPERADOR DO OFÍCIO', 'COOPERADOR DE JOVENS'
      ];
      return cargosMin.includes(cargoUpper);
    };
    
    const ordemCargoMinisterial = (cargo) => {
      if (!cargo) return 999;
      const cargoUpper = cargo.toUpperCase();
      if (cargoUpper === 'ANCIÃO') return 1;
      if (cargoUpper === 'DIÁCONO') return 2;
      if (cargoUpper === 'ENCARREGADO REGIONAL') return 3;
      if (cargoUpper === 'COOPERADOR DO OFÍCIO') return 4;
      if (cargoUpper === 'COOPERADOR DE JOVENS') return 5;
      return 999;
    };

    
    const estevePresenteMin = (row) => {
      const vaiTocar = norm(row[idxVaiTocar] || '');
      const instrumento = norm(row[idxInstrumento] || '');
      const cargo = norm(row[idxCargo] || '');
      return isYes(vaiTocar) || !!instrumento || ehCargoMinisterial(cargo);
    };

    const ministerio = [];
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const nome = norm(row[idxNome] || '');
      if (!nome) continue;

      const cargo = norm(row[idxCargo] || '');
      const comum = norm(row[idxComum] || '') || '(Sem comum)';
      const cidade = norm(row[idxCidade] || '') || localEnsaio;
      const localEnsaioRow = norm(row[idxLocalEnsaio] || '') || '(Sem local definido)';
      
      // Na planilha regional (shSource fornecido), ignoramos o filtro de local
      const isLocalCorreto = shSource ? true : compararLocaisEnsaio(localEnsaioRow, localEnsaio);
      
      if (ehCargoMinisterial(cargo) && estevePresenteMin(row) && isLocalCorreto) {
        ministerio.push({ nome, cargo, comum, cidade, localEnsaio: localEnsaioRow, _ord: i });
      }
    }

    ministerio.sort((a, b) => {
      const ordemA = ordemCargoMinisterial(a.cargo);
      const ordemB = ordemCargoMinisterial(b.cargo);
      if (ordemA !== ordemB) return ordemA - ordemB;
      return a._ord - b._ord;
    });

    let shMinisterio = ssDestino.getSheetByName('Ministério');
    if (!shMinisterio) {
      shMinisterio = ssDestino.insertSheet('Ministério');
    } else {
      const ultimaLinha = shMinisterio.getLastRow();
      if (ultimaLinha > 4) {
        shMinisterio.getRange(5, 1, ultimaLinha - 4, shMinisterio.getLastColumn()).clearContent();
      }
    }

    const headerExists = shMinisterio.getRange(4, 1, 1, 5).getValues()[0].some(cell => cell && cell.toString().trim());
    if (!headerExists) {
      shMinisterio.getRange(4, 1, 1, 5).setValues([['ID', 'Nome', 'Ministério', 'Comum', 'Cidade']]);
      shMinisterio.getRange(4, 1, 1, 5).setFontWeight('bold');
      shMinisterio.getRange(4, 1, 1, 5).setBackground('#e8f0fe');
    }

    if (ministerio.length > 0) {
      const dadosParaInserir = ministerio.map((min, index) => [index + 1, min.nome, min.cargo, min.comum, min.cidade]);
      shMinisterio.getRange(5, 1, dadosParaInserir.length, 5).setValues(dadosParaInserir);
    }

    try {
      shMinisterio.getRange(4, 1, Math.max(1, ministerio.length + 1), 5).setBorder(true, true, true, true, true, true);
      shMinisterio.setColumnWidth(2, 405);
      shMinisterio.setColumnWidth(3, 200);
      shMinisterio.setColumnWidth(4, 370);
      shMinisterio.setColumnWidth(5, 150);
    } catch (e) { }
    
    return {
      ok: true, localEnsaio: localEnsaio, abaAtualizada: 'Ministério', planilhaId: ssDestino.getId(), totalMinisterio: ministerio.length, ministerio: ministerio.map(min => min.nome)
    };
  } catch (error) {
    console.error(`❌ Erro ao alimentar aba Ministério de ${nomePlanilha}:`, error);
    throw error;
  }
}

function alimentarAbaMinisterioItapevi(localEnsaio = 'Itapevi') {
  return alimentarAbaMinisterioDestino(localEnsaio, openItapeviSheet(), 'Itapevi');
}

// Função para alimentar aba Ministério da planilha de Cotia

function alimentarAbaMinisterioCotia(localEnsaio = 'Cotia') {
  return alimentarAbaMinisterioDestino(localEnsaio, openCotiaSheet(), 'Cotia');
}

// Função para alimentar aba Ministério da planilha de Caucaia

function alimentarAbaMinisterioCaucaia(localEnsaio = 'Caucaia') {
  return alimentarAbaMinisterioDestino(localEnsaio, openCaucaiaSheet(), 'Caucaia');
}

// Função para alimentar aba Ministério da planilha de Jandira

function alimentarAbaMinisterioJandira(localEnsaio = 'Jandira') {
  return alimentarAbaMinisterioDestino(localEnsaio, openJandiraSheet(), 'Jandira');
}

// Função para alimentar aba Ministério da planilha de Fazendinha

function alimentarAbaMinisterioFazendinha(localEnsaio = 'Fazendinha') {
  return alimentarAbaMinisterioDestino(localEnsaio, openFazendinhaSheet(), 'Fazendinha');
}

// Função para alimentar aba Ministério da planilha de Pirapora

function alimentarAbaMinisterioPirapora(localEnsaio = 'Pirapora') {
  return alimentarAbaMinisterioDestino(localEnsaio, openPiraporaSheet(), 'Pirapora');
}

// Função para alimentar aba Ministério da planilha de VargemGrande

function alimentarAbaMinisterioVargemGrande(localEnsaio = 'VargemGrande') {
  return alimentarAbaMinisterioDestino(localEnsaio, openVargemGrandeSheet(), 'VargemGrande');
}

// Função para alimentar aba Organistas da planilha de VargemGrande
