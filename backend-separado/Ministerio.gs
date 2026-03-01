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

function alimentarAbaMinisterioItapevi(localEnsaio = 'Itapevi') {
  try {
    console.log(`🏛️ Iniciando alimentação da aba Ministério na planilha externa de Itapevi para: ${localEnsaio}`);
    
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
    const idxLocalEnsaio = headerRow.findIndex(h => h && h.toString().toLowerCase().includes('local_ensaio'));
    const idxVaiTocar = headerRow.findIndex(h => h && h.toString().toLowerCase().includes('vai_tocar'));
    const idxInstrumento = headerRow.findIndex(h => h && h.toString().toLowerCase().includes('instrumento'));

    if (idxNome < 0 || idxCargo < 0) {
      throw new Error('Colunas "nome" ou "cargo" não encontradas');
    }

    // Função para verificar se é cargo ministerial
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
    
    // Função para verificar se esteve presente
    const estevePresenteMin = (row) => {
      const vaiTocar = norm(row[idxVaiTocar] || '');
      const instrumento = norm(row[idxInstrumento] || '');
      const cargo = norm(row[idxCargo] || '');
      
      // Considera presente se vai tocar, tem instrumento ou tem cargo ministerial
      return isYes(vaiTocar) || !!instrumento || ehCargoMinisterial(cargo);
    };

    // Filtra dados para cargos ministeriais presentes do local especificado
    const ministerio = [];
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const nome = norm(row[idxNome] || '');
      if (!nome) continue;

      const cargo = norm(row[idxCargo] || '');
      const comum = norm(row[idxComum] || '') || '(Sem comum)';
      const cidade = norm(row[idxCidade] || '') || localEnsaio;
      const localEnsaioRow = norm(row[idxLocalEnsaio] || '') || '(Sem local definido)';
      
      const isLocalCorreto = compararLocaisEnsaio(localEnsaioRow, localEnsaio);
      
      // Verifica se é cargo ministerial e esteve presente
      if (ehCargoMinisterial(cargo) && estevePresenteMin(row) && isLocalCorreto) {
        ministerio.push({
          nome,
          cargo,
          comum,
          cidade,
          localEnsaio: localEnsaioRow,
          _ord: i
        });
        console.log(`👔 Ministério encontrado: ${nome} (${cargo}) - ${localEnsaioRow}`);
      }
    }

    console.log(`📊 Encontrados ${ministerio.length} cargos ministeriais para o local: ${localEnsaio}`);

    // Ordena por ordem do cargo, depois por ordem original
    ministerio.sort((a, b) => {
      const ordemA = ordemCargoMinisterial(a.cargo);
      const ordemB = ordemCargoMinisterial(b.cargo);
      if (ordemA !== ordemB) {
        return ordemA - ordemB;
      }
      return a._ord - b._ord;
    });

    // Acessa a planilha externa de Itapevi
    const ssItapevi = openItapeviSheet();
    
    // Cria ou limpa a aba Ministério
    let shMinisterio = ssItapevi.getSheetByName('Ministério');
    if (!shMinisterio) {
      shMinisterio = ssItapevi.insertSheet('Ministério');
      console.log(`✅ Nova aba Ministério criada na planilha externa de Itapevi`);
    } else {
      // Limpa dados existentes
      const ultimaLinha = shMinisterio.getLastRow();
      if (ultimaLinha > 4) {
        shMinisterio.getRange(5, 1, ultimaLinha - 4, shMinisterio.getLastColumn()).clearContent();
        console.log(`✅ Dados limpos na aba Ministério (preparando para inserir ${ministerio.length} registros)`);
      }
    }

    // Verifica se existe cabeçalho na linha 4
    const headerExists = shMinisterio.getRange(4, 1, 1, 5).getValues()[0].some(cell => cell && cell.toString().trim());
    
    if (!headerExists) {
      shMinisterio.getRange(4, 1, 1, 5).setValues([[
        'ID', 'Nome', 'Ministério', 'Comum', 'Cidade'
      ]]);
      shMinisterio.getRange(4, 1, 1, 5).setFontWeight('bold');
      shMinisterio.getRange(4, 1, 1, 5).setBackground('#e8f0fe');
      console.log(`✅ Cabeçalho criado na linha 4 com 5 colunas`);
    } else {
      console.log(`✅ Cabeçalho já existe na linha 4, preservando`);
    }

    // Popula dados a partir da linha 5
    if (ministerio.length > 0) {
      const dadosParaInserir = ministerio.map((min, index) => {
        return [
          index + 1, // ID sequencial
          min.nome,
          min.cargo,
          min.comum,
          min.cidade
        ];
      });

      shMinisterio.getRange(5, 1, dadosParaInserir.length, 5).setValues(dadosParaInserir);
      console.log(`✅ ${ministerio.length} registros ministeriais inseridos a partir da linha 5 com IDs sequenciais`);
    }

    // Formatação
    shMinisterio.getRange(4, 1, 1, 5).setBorder(true, true, true, true, true, true);
    
    // Autoajusta as colunas APÓS inserir os dados
    shMinisterio.autoResizeColumns(1, 5);
    
    // Define larguras específicas seguindo a mesma lógica das Organistas
    shMinisterio.setColumnWidth(2, 405); // Coluna B (Nome) - mesma largura que Nome em Organistas
    shMinisterio.setColumnWidth(3, 220); // Coluna C (Ministério)
    shMinisterio.setColumnWidth(4, 315); // Coluna D (Comum)
    shMinisterio.setColumnWidth(5, 120); // Coluna E (Cidade) - mesma largura que Cidade em Organistas
    
    console.log(`✅ Aba Ministério da planilha externa de Itapevi alimentada com sucesso para: ${localEnsaio}`);
    
    return {
      ok: true,
      localEnsaio: localEnsaio,
      abaAtualizada: 'Ministério',
      planilhaId: ITAPEVI_SHEET_ID,
      totalMinisterio: ministerio.length,
      ministerio: ministerio.map(min => min.nome)
    };

  } catch (error) {
    console.error(`❌ Erro ao alimentar aba Ministério da planilha externa de Itapevi para ${localEnsaio}:`, error);
    throw error;
  }
}

// Função para alimentar aba Ministério da planilha de Cotia

function alimentarAbaMinisterioCotia(localEnsaio = 'Cotia') {
  try {
    console.log(`🏛️ Iniciando alimentação da aba Ministério na planilha externa de Cotia para: ${localEnsaio}`);
    
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
    const idxLocalEnsaio = headerRow.findIndex(h => h && h.toString().toLowerCase().includes('local_ensaio'));
    const idxVaiTocar = headerRow.findIndex(h => h && h.toString().toLowerCase().includes('vai_tocar'));
    const idxInstrumento = headerRow.findIndex(h => h && h.toString().toLowerCase().includes('instrumento'));

    if (idxNome < 0 || idxCargo < 0) {
      throw new Error('Colunas "nome" ou "cargo" não encontradas');
    }

    // Função para verificar se é cargo ministerial
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
    
    // Função para verificar se esteve presente
    const estevePresenteMin = (row) => {
      const vaiTocar = norm(row[idxVaiTocar] || '');
      const instrumento = norm(row[idxInstrumento] || '');
      const cargo = norm(row[idxCargo] || '');
      
      // Considera presente se vai tocar, tem instrumento ou tem cargo ministerial
      return isYes(vaiTocar) || !!instrumento || ehCargoMinisterial(cargo);
    };

    // Filtra dados para cargos ministeriais presentes do local especificado
    const ministerio = [];
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const nome = norm(row[idxNome] || '');
      if (!nome) continue;

      const cargo = norm(row[idxCargo] || '');
      const comum = norm(row[idxComum] || '') || '(Sem comum)';
      const cidade = norm(row[idxCidade] || '') || localEnsaio;
      const localEnsaioRow = norm(row[idxLocalEnsaio] || '') || '(Sem local definido)';
      
      const isLocalCorreto = compararLocaisEnsaio(localEnsaioRow, localEnsaio);
      
      // Verifica se é cargo ministerial e esteve presente
      if (ehCargoMinisterial(cargo) && estevePresenteMin(row) && isLocalCorreto) {
        ministerio.push({
          nome,
          cargo,
          comum,
          cidade,
          localEnsaio: localEnsaioRow,
          _ord: i
        });
        console.log(`👔 Ministério encontrado: ${nome} (${cargo}) - ${localEnsaioRow}`);
      }
    }

    console.log(`📊 Encontrados ${ministerio.length} cargos ministeriais para o local: ${localEnsaio}`);

    // Ordena por ordem do cargo, depois por ordem original
    ministerio.sort((a, b) => {
      const ordemA = ordemCargoMinisterial(a.cargo);
      const ordemB = ordemCargoMinisterial(b.cargo);
      if (ordemA !== ordemB) {
        return ordemA - ordemB;
      }
      return a._ord - b._ord;
    });

    // Acessa a planilha externa de Cotia
    const ssCotia = openCotiaSheet();
    
    // Cria ou limpa a aba Ministério
    let shMinisterio = ssCotia.getSheetByName('Ministério');
    if (!shMinisterio) {
      shMinisterio = ssCotia.insertSheet('Ministério');
      console.log(`✅ Nova aba Ministério criada na planilha externa de Cotia`);
    } else {
      // Limpa dados existentes
      const ultimaLinha = shMinisterio.getLastRow();
      if (ultimaLinha > 4) {
        shMinisterio.getRange(5, 1, ultimaLinha - 4, shMinisterio.getLastColumn()).clearContent();
        console.log(`✅ Dados limpos na aba Ministério (preparando para inserir ${ministerio.length} registros)`);
      }
    }

    // Verifica se existe cabeçalho na linha 4
    const headerExists = shMinisterio.getRange(4, 1, 1, 5).getValues()[0].some(cell => cell && cell.toString().trim());
    
    if (!headerExists) {
      shMinisterio.getRange(4, 1, 1, 5).setValues([[
        'ID', 'Nome', 'Ministério', 'Comum', 'Cidade'
      ]]);
      shMinisterio.getRange(4, 1, 1, 5).setFontWeight('bold');
      shMinisterio.getRange(4, 1, 1, 5).setBackground('#e8f0fe');
      console.log(`✅ Cabeçalho criado na linha 4 com 5 colunas`);
    } else {
      console.log(`✅ Cabeçalho já existe na linha 4, preservando`);
    }

    // Popula dados a partir da linha 5
    if (ministerio.length > 0) {
      const dadosParaInserir = ministerio.map((min, index) => {
        return [
          index + 1, // ID sequencial
          min.nome,
          min.cargo,
          min.comum,
          min.cidade
        ];
      });

      shMinisterio.getRange(5, 1, dadosParaInserir.length, 5).setValues(dadosParaInserir);
      console.log(`✅ ${ministerio.length} registros ministeriais inseridos a partir da linha 5 com IDs sequenciais`);
    }

    // Formatação
    shMinisterio.getRange(4, 1, 1, 5).setBorder(true, true, true, true, true, true);
    
    // Autoajusta as colunas APÓS inserir os dados
    shMinisterio.autoResizeColumns(1, 5);
    
    // Define larguras específicas seguindo a mesma lógica das Organistas
    shMinisterio.setColumnWidth(2, 405); // Coluna B (Nome) - mesma largura que Nome em Organistas
    shMinisterio.setColumnWidth(3, 220); // Coluna C (Ministério)
    shMinisterio.setColumnWidth(4, 315); // Coluna D (Comum)
    shMinisterio.setColumnWidth(5, 120); // Coluna E (Cidade) - mesma largura que Cidade em Organistas
    
    console.log(`✅ Aba Ministério da planilha externa de Cotia alimentada com sucesso para: ${localEnsaio}`);
    
    return {
      ok: true,
      localEnsaio: localEnsaio,
      abaAtualizada: 'Ministério',
      planilhaId: COTIA_SHEET_ID,
      totalMinisterio: ministerio.length,
      ministerio: ministerio.map(min => min.nome)
    };

  } catch (error) {
    console.error(`❌ Erro ao alimentar aba Ministério da planilha externa de Cotia para ${localEnsaio}:`, error);
    throw error;
  }
}

// Função para alimentar aba Ministério da planilha de Caucaia

function alimentarAbaMinisterioCaucaia(localEnsaio = 'Caucaia') {
  try {
    console.log(`🏛️ Iniciando alimentação da aba Ministério na planilha externa de Caucaia para: ${localEnsaio}`);
    
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
    const idxLocalEnsaio = headerRow.findIndex(h => h && h.toString().toLowerCase().includes('local_ensaio'));
    const idxVaiTocar = headerRow.findIndex(h => h && h.toString().toLowerCase().includes('vai_tocar'));
    const idxInstrumento = headerRow.findIndex(h => h && h.toString().toLowerCase().includes('instrumento'));

    if (idxNome < 0 || idxCargo < 0) {
      throw new Error('Colunas "nome" ou "cargo" não encontradas');
    }

    // Função para verificar se é cargo ministerial
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
    
    // Função para verificar se esteve presente
    const estevePresenteMin = (row) => {
      const vaiTocar = norm(row[idxVaiTocar] || '');
      const instrumento = norm(row[idxInstrumento] || '');
      const cargo = norm(row[idxCargo] || '');
      
      // Considera presente se vai tocar, tem instrumento ou tem cargo ministerial
      return isYes(vaiTocar) || !!instrumento || ehCargoMinisterial(cargo);
    };

    // Filtra dados para cargos ministeriais presentes do local especificado
    const ministerio = [];
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const nome = norm(row[idxNome] || '');
      if (!nome) continue;

      const cargo = norm(row[idxCargo] || '');
      const comum = norm(row[idxComum] || '') || '(Sem comum)';
      const cidade = norm(row[idxCidade] || '') || localEnsaio;
      const localEnsaioRow = norm(row[idxLocalEnsaio] || '') || '(Sem local definido)';
      
      const isLocalCorreto = compararLocaisEnsaio(localEnsaioRow, localEnsaio);
      
      // Verifica se é cargo ministerial e esteve presente
      if (ehCargoMinisterial(cargo) && estevePresenteMin(row) && isLocalCorreto) {
        ministerio.push({
          nome,
          cargo,
          comum,
          cidade,
          localEnsaio: localEnsaioRow,
          _ord: i
        });
        console.log(`👔 Ministério encontrado: ${nome} (${cargo}) - ${localEnsaioRow}`);
      }
    }

    console.log(`📊 Encontrados ${ministerio.length} cargos ministeriais para o local: ${localEnsaio}`);

    // Ordena por ordem do cargo, depois por ordem original
    ministerio.sort((a, b) => {
      const ordemA = ordemCargoMinisterial(a.cargo);
      const ordemB = ordemCargoMinisterial(b.cargo);
      if (ordemA !== ordemB) {
        return ordemA - ordemB;
      }
      return a._ord - b._ord;
    });

    // Acessa a planilha externa de Caucaia
    const ssCaucaia = openCaucaiaSheet();
    
    // Cria ou limpa a aba Ministério
    let shMinisterio = ssCaucaia.getSheetByName('Ministério');
    if (!shMinisterio) {
      shMinisterio = ssCaucaia.insertSheet('Ministério');
      console.log(`✅ Nova aba Ministério criada na planilha externa de Caucaia`);
    } else {
      // Limpa dados existentes
      const ultimaLinha = shMinisterio.getLastRow();
      if (ultimaLinha > 4) {
        shMinisterio.getRange(5, 1, ultimaLinha - 4, shMinisterio.getLastColumn()).clearContent();
        console.log(`✅ Dados limpos na aba Ministério (preparando para inserir ${ministerio.length} registros)`);
      }
    }

    // Verifica se existe cabeçalho na linha 4
    const headerExists = shMinisterio.getRange(4, 1, 1, 5).getValues()[0].some(cell => cell && cell.toString().trim());
    
    if (!headerExists) {
      shMinisterio.getRange(4, 1, 1, 5).setValues([[
        'ID', 'Nome', 'Ministério', 'Comum', 'Cidade'
      ]]);
      shMinisterio.getRange(4, 1, 1, 5).setFontWeight('bold');
      shMinisterio.getRange(4, 1, 1, 5).setBackground('#e8f0fe');
      console.log(`✅ Cabeçalho criado na linha 4 com 5 colunas`);
    } else {
      console.log(`✅ Cabeçalho já existe na linha 4, preservando`);
    }

    // Popula dados a partir da linha 5
    if (ministerio.length > 0) {
      const dadosParaInserir = ministerio.map((min, index) => {
        return [
          index + 1, // ID sequencial
          min.nome,
          min.cargo,
          min.comum,
          min.cidade
        ];
      });

      shMinisterio.getRange(5, 1, dadosParaInserir.length, 5).setValues(dadosParaInserir);
      console.log(`✅ ${ministerio.length} registros ministeriais inseridos a partir da linha 5 com IDs sequenciais`);
    }

    // Formatação
    shMinisterio.getRange(4, 1, 1, 5).setBorder(true, true, true, true, true, true);
    
    // Autoajusta as colunas APÓS inserir os dados
    shMinisterio.autoResizeColumns(1, 5);
    
    // Define larguras específicas seguindo a mesma lógica das Organistas
    shMinisterio.setColumnWidth(2, 405); // Coluna B (Nome) - mesma largura que Nome em Organistas
    shMinisterio.setColumnWidth(3, 220); // Coluna C (Ministério)
    shMinisterio.setColumnWidth(4, 315); // Coluna D (Comum)
    shMinisterio.setColumnWidth(5, 120); // Coluna E (Cidade) - mesma largura que Cidade em Organistas
    
    console.log(`✅ Aba Ministério da planilha externa de Caucaia alimentada com sucesso para: ${localEnsaio}`);
    
    return {
      ok: true,
      localEnsaio: localEnsaio,
      abaAtualizada: 'Ministério',
      planilhaId: CAUCAIA_SHEET_ID,
      totalMinisterio: ministerio.length,
      ministerio: ministerio.map(min => min.nome)
    };

  } catch (error) {
    console.error(`❌ Erro ao alimentar aba Ministério da planilha externa de Caucaia para ${localEnsaio}:`, error);
    throw error;
  }
}

// Função para alimentar aba Ministério da planilha de Jandira

function alimentarAbaMinisterioJandira(localEnsaio = 'Jandira') {
  try {
    console.log(`🏛️ Iniciando alimentação da aba Ministério na planilha externa de Jandira para: ${localEnsaio}`);
    
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
    const idxLocalEnsaio = headerRow.findIndex(h => h && h.toString().toLowerCase().includes('local_ensaio'));
    const idxVaiTocar = headerRow.findIndex(h => h && h.toString().toLowerCase().includes('vai_tocar'));
    const idxInstrumento = headerRow.findIndex(h => h && h.toString().toLowerCase().includes('instrumento'));

    if (idxNome < 0 || idxCargo < 0) {
      throw new Error('Colunas "nome" ou "cargo" não encontradas');
    }

    // Função para verificar se é cargo ministerial
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
    
    // Função para verificar se esteve presente
    const estevePresenteMin = (row) => {
      const vaiTocar = norm(row[idxVaiTocar] || '');
      const instrumento = norm(row[idxInstrumento] || '');
      const cargo = norm(row[idxCargo] || '');
      
      // Considera presente se vai tocar, tem instrumento ou tem cargo ministerial
      return isYes(vaiTocar) || !!instrumento || ehCargoMinisterial(cargo);
    };

    // Filtra dados para cargos ministeriais presentes do local especificado
    const ministerio = [];
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const nome = norm(row[idxNome] || '');
      if (!nome) continue;

      const cargo = norm(row[idxCargo] || '');
      const comum = norm(row[idxComum] || '') || '(Sem comum)';
      const cidade = norm(row[idxCidade] || '') || localEnsaio;
      const localEnsaioRow = norm(row[idxLocalEnsaio] || '') || '(Sem local definido)';
      
      const isLocalCorreto = compararLocaisEnsaio(localEnsaioRow, localEnsaio);
      
      // Verifica se é cargo ministerial e esteve presente
      if (ehCargoMinisterial(cargo) && estevePresenteMin(row) && isLocalCorreto) {
        ministerio.push({
          nome,
          cargo,
          comum,
          cidade,
          localEnsaio: localEnsaioRow,
          _ord: i
        });
        console.log(`👔 Ministério encontrado: ${nome} (${cargo}) - ${localEnsaioRow}`);
      }
    }

    console.log(`📊 Encontrados ${ministerio.length} cargos ministeriais para o local: ${localEnsaio}`);

    // Ordena por ordem do cargo, depois por ordem original
    ministerio.sort((a, b) => {
      const ordemA = ordemCargoMinisterial(a.cargo);
      const ordemB = ordemCargoMinisterial(b.cargo);
      if (ordemA !== ordemB) {
        return ordemA - ordemB;
      }
      return a._ord - b._ord;
    });

    // Acessa a planilha externa de Jandira
    const ssJandira = openJandiraSheet();
    
    // Cria ou limpa a aba Ministério
    let shMinisterio = ssJandira.getSheetByName('Ministério');
    if (!shMinisterio) {
      shMinisterio = ssJandira.insertSheet('Ministério');
      console.log(`✅ Nova aba Ministério criada na planilha externa de Jandira`);
    } else {
      // Limpa dados existentes
      const ultimaLinha = shMinisterio.getLastRow();
      if (ultimaLinha > 4) {
        shMinisterio.getRange(5, 1, ultimaLinha - 4, shMinisterio.getLastColumn()).clearContent();
        console.log(`✅ Dados limpos na aba Ministério (preparando para inserir ${ministerio.length} registros)`);
      }
    }

    // Verifica se existe cabeçalho na linha 4
    const headerExists = shMinisterio.getRange(4, 1, 1, 5).getValues()[0].some(cell => cell && cell.toString().trim());
    
    if (!headerExists) {
      shMinisterio.getRange(4, 1, 1, 5).setValues([[
        'ID', 'Nome', 'Ministério', 'Comum', 'Cidade'
      ]]);
      shMinisterio.getRange(4, 1, 1, 5).setFontWeight('bold');
      shMinisterio.getRange(4, 1, 1, 5).setBackground('#e8f0fe');
      console.log(`✅ Cabeçalho criado na linha 4 com 5 colunas`);
    } else {
      console.log(`✅ Cabeçalho já existe na linha 4, preservando`);
    }

    // Popula dados a partir da linha 5
    if (ministerio.length > 0) {
      const dadosParaInserir = ministerio.map((min, index) => {
        return [
          index + 1, // ID sequencial
          min.nome,
          min.cargo,
          min.comum,
          min.cidade
        ];
      });

      shMinisterio.getRange(5, 1, dadosParaInserir.length, 5).setValues(dadosParaInserir);
      console.log(`✅ ${ministerio.length} registros ministeriais inseridos a partir da linha 5 com IDs sequenciais`);
    }

    // Formatação
    shMinisterio.getRange(4, 1, 1, 5).setBorder(true, true, true, true, true, true);
    
    // Autoajusta as colunas APÓS inserir os dados
    shMinisterio.autoResizeColumns(1, 5);
    
    // Define larguras específicas seguindo a mesma lógica das Organistas
    shMinisterio.setColumnWidth(2, 405); // Coluna B (Nome) - mesma largura que Nome em Organistas
    shMinisterio.setColumnWidth(3, 220); // Coluna C (Ministério)
    shMinisterio.setColumnWidth(4, 315); // Coluna D (Comum)
    shMinisterio.setColumnWidth(5, 120); // Coluna E (Cidade) - mesma largura que Cidade em Organistas
    
    console.log(`✅ Aba Ministério da planilha externa de Jandira alimentada com sucesso para: ${localEnsaio}`);
    
    return {
      ok: true,
      localEnsaio: localEnsaio,
      abaAtualizada: 'Ministério',
      planilhaId: JANDIRA_SHEET_ID,
      totalMinisterio: ministerio.length,
      ministerio: ministerio.map(min => min.nome)
    };

  } catch (error) {
    console.error(`❌ Erro ao alimentar aba Ministério da planilha externa de Jandira para ${localEnsaio}:`, error);
    throw error;
  }
}

// Função para alimentar aba Ministério da planilha de Fazendinha

function alimentarAbaMinisterioFazendinha(localEnsaio = 'Fazendinha') {
  try {
    console.log(`🏛️ Iniciando alimentação da aba Ministério na planilha externa de Fazendinha para: ${localEnsaio}`);
    
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
    const idxLocalEnsaio = headerRow.findIndex(h => h && h.toString().toLowerCase().includes('local_ensaio'));
    const idxVaiTocar = headerRow.findIndex(h => h && h.toString().toLowerCase().includes('vai_tocar'));
    const idxInstrumento = headerRow.findIndex(h => h && h.toString().toLowerCase().includes('instrumento'));

    if (idxNome < 0 || idxCargo < 0) {
      throw new Error('Colunas "nome" ou "cargo" não encontradas');
    }

    // Função para verificar se é cargo ministerial
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
    
    // Função para verificar se esteve presente
    const estevePresenteMin = (row) => {
      const vaiTocar = norm(row[idxVaiTocar] || '');
      const instrumento = norm(row[idxInstrumento] || '');
      const cargo = norm(row[idxCargo] || '');
      
      // Considera presente se vai tocar, tem instrumento ou tem cargo ministerial
      return isYes(vaiTocar) || !!instrumento || ehCargoMinisterial(cargo);
    };

    // Filtra dados para cargos ministeriais presentes do local especificado
    const ministerio = [];
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const nome = norm(row[idxNome] || '');
      if (!nome) continue;

      const cargo = norm(row[idxCargo] || '');
      const comum = norm(row[idxComum] || '') || '(Sem comum)';
      const cidade = norm(row[idxCidade] || '') || localEnsaio;
      const localEnsaioRow = norm(row[idxLocalEnsaio] || '') || '(Sem local definido)';
      
      const isLocalCorreto = compararLocaisEnsaio(localEnsaioRow, localEnsaio);
      
      // Verifica se é cargo ministerial e esteve presente
      if (ehCargoMinisterial(cargo) && estevePresenteMin(row) && isLocalCorreto) {
        ministerio.push({
          nome,
          cargo,
          comum,
          cidade,
          localEnsaio: localEnsaioRow,
          _ord: i
        });
        console.log(`👔 Ministério encontrado: ${nome} (${cargo}) - ${localEnsaioRow}`);
      }
    }

    console.log(`📊 Encontrados ${ministerio.length} cargos ministeriais para o local: ${localEnsaio}`);

    // Ordena por ordem do cargo, depois por ordem original
    ministerio.sort((a, b) => {
      const ordemA = ordemCargoMinisterial(a.cargo);
      const ordemB = ordemCargoMinisterial(b.cargo);
      if (ordemA !== ordemB) {
        return ordemA - ordemB;
      }
      return a._ord - b._ord;
    });

    // Acessa a planilha externa de Fazendinha
    const ssFazendinha = openFazendinhaSheet();
    
    // Cria ou limpa a aba Ministério
    let shMinisterio = ssFazendinha.getSheetByName('Ministério');
    if (!shMinisterio) {
      shMinisterio = ssFazendinha.insertSheet('Ministério');
      console.log(`✅ Nova aba Ministério criada na planilha externa de Fazendinha`);
    } else {
      // Limpa dados existentes
      const ultimaLinha = shMinisterio.getLastRow();
      if (ultimaLinha > 4) {
        shMinisterio.getRange(5, 1, ultimaLinha - 4, shMinisterio.getLastColumn()).clearContent();
        console.log(`✅ Dados limpos na aba Ministério (preparando para inserir ${ministerio.length} registros)`);
      }
    }

    // Verifica se existe cabeçalho na linha 4
    const headerExists = shMinisterio.getRange(4, 1, 1, 5).getValues()[0].some(cell => cell && cell.toString().trim());
    
    if (!headerExists) {
      shMinisterio.getRange(4, 1, 1, 5).setValues([[
        'ID', 'Nome', 'Ministério', 'Comum', 'Cidade'
      ]]);
      shMinisterio.getRange(4, 1, 1, 5).setFontWeight('bold');
      shMinisterio.getRange(4, 1, 1, 5).setBackground('#e8f0fe');
      console.log(`✅ Cabeçalho criado na linha 4 com 5 colunas`);
    } else {
      console.log(`✅ Cabeçalho já existe na linha 4, preservando`);
    }

    // Popula dados a partir da linha 5
    if (ministerio.length > 0) {
      const dadosParaInserir = ministerio.map((min, index) => {
        return [
          index + 1, // ID sequencial
          min.nome,
          min.cargo,
          min.comum,
          min.cidade
        ];
      });

      shMinisterio.getRange(5, 1, dadosParaInserir.length, 5).setValues(dadosParaInserir);
      console.log(`✅ ${ministerio.length} registros ministeriais inseridos a partir da linha 5 com IDs sequenciais`);
    }

    // Formatação
    shMinisterio.getRange(4, 1, 1, 5).setBorder(true, true, true, true, true, true);
    
    // Autoajusta as colunas APÓS inserir os dados
    shMinisterio.autoResizeColumns(1, 5);
    
    // Define larguras específicas seguindo a mesma lógica das Organistas
    shMinisterio.setColumnWidth(2, 405); // Coluna B (Nome) - mesma largura que Nome em Organistas
    shMinisterio.setColumnWidth(3, 220); // Coluna C (Ministério)
    shMinisterio.setColumnWidth(4, 315); // Coluna D (Comum)
    shMinisterio.setColumnWidth(5, 120); // Coluna E (Cidade) - mesma largura que Cidade em Organistas
    
    console.log(`✅ Aba Ministério da planilha externa de Fazendinha alimentada com sucesso para: ${localEnsaio}`);
    
    return {
      ok: true,
      localEnsaio: localEnsaio,
      abaAtualizada: 'Ministério',
      planilhaId: FAZENDINHA_SHEET_ID,
      totalMinisterio: ministerio.length,
      ministerio: ministerio.map(min => min.nome)
    };

  } catch (error) {
    console.error(`❌ Erro ao alimentar aba Ministério da planilha externa de Fazendinha para ${localEnsaio}:`, error);
    throw error;
  }
}

// Função para alimentar aba Ministério da planilha de Pirapora

function alimentarAbaMinisterioPirapora(localEnsaio = 'Pirapora') {
  try {
    console.log(`🏛️ Iniciando alimentação da aba Ministério na planilha externa de Pirapora para: ${localEnsaio}`);
    
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
    const idxLocalEnsaio = headerRow.findIndex(h => h && h.toString().toLowerCase().includes('local_ensaio'));
    const idxVaiTocar = headerRow.findIndex(h => h && h.toString().toLowerCase().includes('vai_tocar'));
    const idxInstrumento = headerRow.findIndex(h => h && h.toString().toLowerCase().includes('instrumento'));

    if (idxNome < 0 || idxCargo < 0) {
      throw new Error('Colunas "nome" ou "cargo" não encontradas');
    }

    // Função para verificar se é cargo ministerial
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
    
    // Função para verificar se esteve presente
    const estevePresenteMin = (row) => {
      const vaiTocar = norm(row[idxVaiTocar] || '');
      const instrumento = norm(row[idxInstrumento] || '');
      const cargo = norm(row[idxCargo] || '');
      
      // Considera presente se vai tocar, tem instrumento ou tem cargo ministerial
      return isYes(vaiTocar) || !!instrumento || ehCargoMinisterial(cargo);
    };

    // Filtra dados para cargos ministeriais presentes do local especificado
    const ministerio = [];
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const nome = norm(row[idxNome] || '');
      if (!nome) continue;

      const cargo = norm(row[idxCargo] || '');
      const comum = norm(row[idxComum] || '') || '(Sem comum)';
      const cidade = norm(row[idxCidade] || '') || localEnsaio;
      const localEnsaioRow = norm(row[idxLocalEnsaio] || '') || '(Sem local definido)';
      
      const isLocalCorreto = compararLocaisEnsaio(localEnsaioRow, localEnsaio);
      
      // Verifica se é cargo ministerial e esteve presente
      if (ehCargoMinisterial(cargo) && estevePresenteMin(row) && isLocalCorreto) {
        ministerio.push({
          nome,
          cargo,
          comum,
          cidade,
          localEnsaio: localEnsaioRow,
          _ord: i
        });
        console.log(`👔 Ministério encontrado: ${nome} (${cargo}) - ${localEnsaioRow}`);
      }
    }

    console.log(`📊 Encontrados ${ministerio.length} cargos ministeriais para o local: ${localEnsaio}`);

    // Ordena por ordem do cargo, depois por ordem original
    ministerio.sort((a, b) => {
      const ordemA = ordemCargoMinisterial(a.cargo);
      const ordemB = ordemCargoMinisterial(b.cargo);
      if (ordemA !== ordemB) {
        return ordemA - ordemB;
      }
      return a._ord - b._ord;
    });

    // Acessa a planilha externa de Pirapora
    const ssPirapora = openPiraporaSheet();
    
    // Cria ou limpa a aba Ministério
    let shMinisterio = ssPirapora.getSheetByName('Ministério');
    if (!shMinisterio) {
      shMinisterio = ssPirapora.insertSheet('Ministério');
      console.log(`✅ Nova aba Ministério criada na planilha externa de Pirapora`);
    } else {
      // Limpa dados existentes
      const ultimaLinha = shMinisterio.getLastRow();
      if (ultimaLinha > 4) {
        shMinisterio.getRange(5, 1, ultimaLinha - 4, shMinisterio.getLastColumn()).clearContent();
        console.log(`✅ Dados limpos na aba Ministério (preparando para inserir ${ministerio.length} registros)`);
      }
    }

    // Verifica se existe cabeçalho na linha 4
    const headerExists = shMinisterio.getRange(4, 1, 1, 5).getValues()[0].some(cell => cell && cell.toString().trim());
    
    if (!headerExists) {
      shMinisterio.getRange(4, 1, 1, 5).setValues([[
        'ID', 'Nome', 'Ministério', 'Comum', 'Cidade'
      ]]);
      shMinisterio.getRange(4, 1, 1, 5).setFontWeight('bold');
      shMinisterio.getRange(4, 1, 1, 5).setBackground('#e8f0fe');
      console.log(`✅ Cabeçalho criado na linha 4 com 5 colunas`);
    } else {
      console.log(`✅ Cabeçalho já existe na linha 4, preservando`);
    }

    // Popula dados a partir da linha 5
    if (ministerio.length > 0) {
      const dadosParaInserir = ministerio.map((min, index) => {
        return [
          index + 1, // ID sequencial
          min.nome,
          min.cargo,
          min.comum,
          min.cidade
        ];
      });

      shMinisterio.getRange(5, 1, dadosParaInserir.length, 5).setValues(dadosParaInserir);
      console.log(`✅ ${ministerio.length} registros ministeriais inseridos a partir da linha 5 com IDs sequenciais`);
    }

    // Formatação
    shMinisterio.getRange(4, 1, 1, 5).setBorder(true, true, true, true, true, true);
    
    // Autoajusta as colunas APÓS inserir os dados
    shMinisterio.autoResizeColumns(1, 5);
    
    // Define larguras específicas seguindo a mesma lógica das Organistas
    shMinisterio.setColumnWidth(2, 405); // Coluna B (Nome) - mesma largura que Nome em Organistas
    shMinisterio.setColumnWidth(3, 220); // Coluna C (Ministério)
    shMinisterio.setColumnWidth(4, 315); // Coluna D (Comum)
    shMinisterio.setColumnWidth(5, 120); // Coluna E (Cidade) - mesma largura que Cidade em Organistas
    
    console.log(`✅ Aba Ministério da planilha externa de Pirapora alimentada com sucesso para: ${localEnsaio}`);
    
    return {
      ok: true,
      localEnsaio: localEnsaio,
      abaAtualizada: 'Ministério',
      planilhaId: PIRAPORA_SHEET_ID,
      totalMinisterio: ministerio.length,
      ministerio: ministerio.map(min => min.nome)
    };

  } catch (error) {
    console.error(`❌ Erro ao alimentar aba Ministério da planilha externa de Pirapora para ${localEnsaio}:`, error);
    throw error;
  }
}

// Função para alimentar aba Ministério da planilha de VargemGrande

function alimentarAbaMinisterioVargemGrande(localEnsaio = 'VargemGrande') {
  try {
    console.log(`🏛️ Iniciando alimentação da aba Ministério na planilha externa de VargemGrande para: ${localEnsaio}`);
    
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
    const idxLocalEnsaio = headerRow.findIndex(h => h && h.toString().toLowerCase().includes('local_ensaio'));
    const idxVaiTocar = headerRow.findIndex(h => h && h.toString().toLowerCase().includes('vai_tocar'));
    const idxInstrumento = headerRow.findIndex(h => h && h.toString().toLowerCase().includes('instrumento'));

    if (idxNome < 0 || idxCargo < 0) {
      throw new Error('Colunas "nome" ou "cargo" não encontradas');
    }

    // Função para verificar se é cargo ministerial
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
    
    // Função para verificar se esteve presente
    const estevePresenteMin = (row) => {
      const vaiTocar = norm(row[idxVaiTocar] || '');
      const instrumento = norm(row[idxInstrumento] || '');
      const cargo = norm(row[idxCargo] || '');
      
      // Considera presente se vai tocar, tem instrumento ou tem cargo ministerial
      return isYes(vaiTocar) || !!instrumento || ehCargoMinisterial(cargo);
    };

    // Filtra dados para cargos ministeriais presentes do local especificado
    const ministerio = [];
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const nome = norm(row[idxNome] || '');
      if (!nome) continue;

      const cargo = norm(row[idxCargo] || '');
      const comum = norm(row[idxComum] || '') || '(Sem comum)';
      const cidade = norm(row[idxCidade] || '') || localEnsaio;
      const localEnsaioRow = norm(row[idxLocalEnsaio] || '') || '(Sem local definido)';
      
      const isLocalCorreto = compararLocaisEnsaio(localEnsaioRow, localEnsaio);
      
      // Verifica se é cargo ministerial e esteve presente
      if (ehCargoMinisterial(cargo) && estevePresenteMin(row) && isLocalCorreto) {
        ministerio.push({
          nome,
          cargo,
          comum,
          cidade,
          localEnsaio: localEnsaioRow,
          _ord: i
        });
        console.log(`👔 Ministério encontrado: ${nome} (${cargo}) - ${localEnsaioRow}`);
      }
    }

    console.log(`📊 Encontrados ${ministerio.length} cargos ministeriais para o local: ${localEnsaio}`);

    // Ordena por ordem do cargo, depois por ordem original
    ministerio.sort((a, b) => {
      const ordemA = ordemCargoMinisterial(a.cargo);
      const ordemB = ordemCargoMinisterial(b.cargo);
      if (ordemA !== ordemB) {
        return ordemA - ordemB;
      }
      return a._ord - b._ord;
    });

    // Acessa a planilha externa de VargemGrande
    const ssVargemGrande = openVargemGrandeSheet();
    
    // Cria ou limpa a aba Ministério
    let shMinisterio = ssVargemGrande.getSheetByName('Ministério');
    if (!shMinisterio) {
      shMinisterio = ssVargemGrande.insertSheet('Ministério');
      console.log(`✅ Nova aba Ministério criada na planilha externa de VargemGrande`);
    } else {
      // Limpa dados existentes
      const ultimaLinha = shMinisterio.getLastRow();
      if (ultimaLinha > 4) {
        shMinisterio.getRange(5, 1, ultimaLinha - 4, shMinisterio.getLastColumn()).clearContent();
        console.log(`✅ Dados limpos na aba Ministério (preparando para inserir ${ministerio.length} registros)`);
      }
    }

    // Verifica se existe cabeçalho na linha 4
    const headerExists = shMinisterio.getRange(4, 1, 1, 5).getValues()[0].some(cell => cell && cell.toString().trim());
    
    if (!headerExists) {
      shMinisterio.getRange(4, 1, 1, 5).setValues([[
        'ID', 'Nome', 'Ministério', 'Comum', 'Cidade'
      ]]);
      shMinisterio.getRange(4, 1, 1, 5).setFontWeight('bold');
      shMinisterio.getRange(4, 1, 1, 5).setBackground('#e8f0fe');
      console.log(`✅ Cabeçalho criado na linha 4 com 5 colunas`);
    } else {
      console.log(`✅ Cabeçalho já existe na linha 4, preservando`);
    }

    // Popula dados a partir da linha 5
    if (ministerio.length > 0) {
      const dadosParaInserir = ministerio.map((min, index) => {
        return [
          index + 1, // ID sequencial
          min.nome,
          min.cargo,
          min.comum,
          min.cidade
        ];
      });

      shMinisterio.getRange(5, 1, dadosParaInserir.length, 5).setValues(dadosParaInserir);
      console.log(`✅ ${ministerio.length} registros ministeriais inseridos a partir da linha 5 com IDs sequenciais`);
    }

    // Formatação
    shMinisterio.getRange(4, 1, 1, 5).setBorder(true, true, true, true, true, true);
    
    // Autoajusta as colunas APÓS inserir os dados
    shMinisterio.autoResizeColumns(1, 5);
    
    // Define larguras específicas seguindo a mesma lógica das Organistas
    shMinisterio.setColumnWidth(2, 405); // Coluna B (Nome) - mesma largura que Nome em Organistas
    shMinisterio.setColumnWidth(3, 220); // Coluna C (Ministério)
    shMinisterio.setColumnWidth(4, 315); // Coluna D (Comum)
    shMinisterio.setColumnWidth(5, 120); // Coluna E (Cidade) - mesma largura que Cidade em Organistas
    
    console.log(`✅ Aba Ministério da planilha externa de VargemGrande alimentada com sucesso para: ${localEnsaio}`);
    
    return {
      ok: true,
      localEnsaio: localEnsaio,
      abaAtualizada: 'Ministério',
      planilhaId: VARGEMGRANDE_SHEET_ID,
      totalMinisterio: ministerio.length,
      ministerio: ministerio.map(min => min.nome)
    };

  } catch (error) {
    console.error(`❌ Erro ao alimentar aba Ministério da planilha externa de VargemGrande para ${localEnsaio}:`, error);
    throw error;
  }
}

// Função para alimentar aba Organistas da planilha de VargemGrande
