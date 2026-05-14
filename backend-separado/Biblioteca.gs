/**
 * ============================================================================
 * BIBLIOTECA DE AUTONOMIA REGIONAL (PULL ARCHITECTURE)
 * ============================================================================
 */

/**
 * Ponto de entrada central para as regionais puxarem seus dados.
 */
function processarDadosRegionaisCentral(localEnsaio, ssDestino) {
  try {
    console.log("🚀 Iniciando Sincronização para: " + localEnsaio);
    updateExportProgress(8, 'Conectando à matriz...', 'Preparando atualização local');
    
    // 1. Busca os registros diretamente no Supabase
    updateExportProgress(22, 'Buscando registros de ' + localEnsaio + '...', 'Lendo fonte');
    var registros = buscarRegistrosSupabase(localEnsaio);
    
    if (!registros) registros = [];
    if (registros.length === 0) {
      console.log('Nenhum dado encontrado; limpando a aba local antes da recontagem.');
    }

    // 2. Atualiza a aba 'Registros'
    updateExportProgress(42, 'Atualizando aba Registros...', 'Recebendo dados');
    var shRegistros = ssDestino.getSheetByName('Registros');
    if (shRegistros) {
      ssDestino.toast("📥 Recebendo dados de " + localEnsaio + "...", 'Sincronização', 5);
      atualizarAbaRegistrosLocalBulk(shRegistros, registros);
      SpreadsheetApp.flush();
    }
    
    // 3. Atualiza Dashboard
    updateExportProgress(62, 'Atualizando dashboard...', 'Recontando painel');
    ssDestino.toast('📊 Atualizando Dashboard...', 'Sincronização', 5);
    var resumoExecucao = { membros: 0, organistas: 0, ministry: 0 };
    var shResumo = ssDestino.getSheetByName('Resumo');
    if (shResumo) {
      resumoExecucao = atualizarResumoContadorIncremental(shResumo, null, ssDestino);
    }
    
    // 4. Atualiza Organistas e Ministério
    try {
      updateExportProgress(82, 'Atualizando listas auxiliares...', 'Organistas e Ministério');
      ssDestino.toast('🎹 Atualizando listas auxiliares...', 'Sincronização', 5);
      alimentarAbaOrganistasDestino(localEnsaio, ssDestino, localEnsaio, shRegistros);
      alimentarAbaMinisterioDestino(localEnsaio, ssDestino, localEnsaio, shRegistros);
    } catch (e) {
      console.warn('⚠️ Erro abas secundárias:', e.message);
    }
    
    ssDestino.toast('✅ Sincronização concluída!', 'Sucesso', 5);
    updateExportProgress(100, 'Painel atualizado com sucesso.', 'Concluído');
    
    return {
      sucesso: true,
      mensagem: "Sincronização concluída com sucesso.",
      detalhes: {
        total: registros ? registros.length : 0,
        resumo: {
          totalMembros: resumoExecucao.membros,
          totalOrganistas: resumoExecucao.organistas,
          totalMinisterio: resumoExecucao.ministerio
        }
      }
    };
  } catch (err) {
    console.error("❌ Erro crítico: " + err.message);
    updateExportProgress(100, 'Falha na atualização local.', 'Erro');
    return { sucesso: false, mensagem: err.message };
  }
}


/**
 * SINCRONIZAÇÃO LOCAL (Self-healing & Autonomia Total)
 * Atualiza o dashboard e listas auxiliares usando os dados que já estão na aba 'Registros'.
 * Útil como garantia caso a sincronização remota falhe ou o dado tenha sido empurrado pela matriz.
 */
function sincronizarLocalmenteDesdeRegistros(ssDestino, silencioso = false) {
  try {
    updateExportProgress(8, 'Identificando localidade...', 'Preparando atualização local');
    let shRegistros = ssDestino.getSheetByName('Registros');
    if (false && shRegistros) {
      return { sucesso: false, mensagem: "A aba 'Registros' está vazia. Importe dados primeiro." };
    }

    // 1. Identifica a Localidade (Trava Master / Segurança)
    // Determina o local do ensaio de forma robusta
    let localEnsaio = ssDestino.getName().split(' - ')[0];
    if (localEnsaio.includes('EnR')) {
      const parts = ssDestino.getName().trim().split(' ');
      localEnsaio = parts[parts.length - 1];
    }
 
    if (!localEnsaio || localEnsaio.includes('Planilha') || localEnsaio.includes('Regional')) {
      // Fallback: Tenta pegar da célula B2 da aba Resumo se existir
      const shResumo = ssDestino.getSheetByName('Resumo');
      if (shResumo) localEnsaio = shResumo.getRange('B2').getValue();
    }

    if (!localEnsaio || String(localEnsaio).trim() === '') {
      return { sucesso: false, mensagem: 'Nao foi possivel identificar o local de ensaio desta planilha.' };
    }

    if (!shRegistros) {
      shRegistros = ssDestino.insertSheet('Registros');
    }

    updateExportProgress(24, 'Puxando registros atualizados...', 'Lendo fonte');
    if (!silencioso) ssDestino.toast('Puxando registros atualizados...', 'Sincronizacao Local', 3);
    let registrosRemotos = buscarRegistrosSupabase(localEnsaio);
    if (!registrosRemotos) registrosRemotos = [];
    updateExportProgress(42, 'Atualizando aba Registros...', 'Recebendo dados');
    atualizarAbaRegistrosLocalBulk(shRegistros, registrosRemotos);
    SpreadsheetApp.flush();
    
    updateExportProgress(55, 'Aplicando travas de segurança...', 'Conferindo registros');
    if (!silencioso) ssDestino.toast('🛡️ Aplicando travas de segurança...', 'Sincronização Local', 3);

    // --- TRAVA DE SEGURANÇA 1 & 2: Limpeza de Duplicatas e Localidade ---
    const totalRemovidos = aplicarTravasSegurancaRegistros(shRegistros, localEnsaio);
    if (totalRemovidos > 0) {
      ssDestino.toast(`🧹 ${totalRemovidos} registros inválidos/duplicados removidos.`, 'Segurança', 3);
    }

    // 2. Atualiza Dashboard (Resumo)
    updateExportProgress(68, 'Atualizando dashboard...', 'Recontando painel');
    ssDestino.toast('📊 Atualizando Dashboard...', 'Sincronização Local', 3);
    const shResumo = ssDestino.getSheetByName('Resumo');
    let resumoExecucao = { membros: 0, organistas: 0, ministerio: 0 };
    if (shResumo) {
      resumoExecucao = atualizarResumoContadorIncremental(shResumo, null, ssDestino);
    }
    
    // 3. Atualiza Organistas e Ministério (Alimentação Automática)
    try {
      updateExportProgress(84, 'Atualizando listas auxiliares...', 'Organistas e Ministério');
      ssDestino.toast('🎹 Atualizando listas auxiliares...', 'Sincronização Local', 3);
      // Passamos shRegistros como fonte para garantir fidelidade total ao que foi limpo
      alimentarAbaOrganistasDestino(localEnsaio, ssDestino, localEnsaio, shRegistros);
      alimentarAbaMinisterioDestino(localEnsaio, ssDestino, localEnsaio, shRegistros);
    } catch (e) {
       console.warn('⚠️ Erro listas auxiliares:', e.message);
    }

    if (!silencioso) ssDestino.toast('✅ Painel atualizado com sucesso!', 'Sucesso', 5);
    updateExportProgress(100, 'Painel atualizado com sucesso.', 'Concluído');
    return { 
      sucesso: true, 
      mensagem: 'Painel atualizado com sucesso.',
      detalhes: {
        localEnsaio: localEnsaio,
        registrosRecebidos: registrosRemotos.length,
        removidosTravas: totalRemovidos
      }
    };
  } catch (err) {
    console.error("❌ Erro no sincronismo local: " + err.message);
    updateExportProgress(100, 'Falha na atualização local.', 'Erro');
    return { sucesso: false, mensagem: err.message };
  }
}

/**
 * IMPLEMENTAÇÃO DAS 3 TRAVAS DE SEGURANÇA
 * 1. Duplicidade (UUID e Nome+Comum+Data)
 * 2. Localidade (Garantir que só existem dados da regional correta)
 * 3. Integridade (Validar campos essenciais)
 */
function aplicarTravasSegurancaRegistros(shRegistros, localReferencia) {
  const data = shRegistros.getDataRange().getValues();
  if (data.length < 2) return 0;

  const headers = data[0].map(h => (h || '').toString().trim().toUpperCase());
  const idxUuid = headers.indexOf('UUID');
  const idxNome = headers.indexOf('NOME COMPLETO');
  const idxComum = headers.indexOf('COMUM');
  const idxCidade = headers.indexOf('CIDADE');
  const idxCargo = headers.indexOf('CARGO');
  const idxInstrumento = headers.indexOf('INSTRUMENTO');
  const idxData = headers.indexOf('DATA_ENSAIO');
  const idxLocal = headers.indexOf('LOCAL_ENSAIO');

  const vistosUuid = new Set();
  const vistosSemUuid = new Set();
  const rowsToDelete = [];
  let countRemovidos = 0;

  // Percorre de baixo para cima para não quebrar os índices na deleção posterior (ou apenas filtramos)
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const uuid = idxUuid >= 0 ? (row[idxUuid] || '').toString().trim() : '';
    const nome = idxNome >= 0 ? (row[idxNome] || '').toString().trim().toUpperCase() : '';
    const comum = idxComum >= 0 ? (row[idxComum] || '').toString().trim().toUpperCase() : '';
    const cidade = idxCidade >= 0 ? (row[idxCidade] || '').toString().trim().toUpperCase() : '';
    const cargo = idxCargo >= 0 ? (row[idxCargo] || '').toString().trim().toUpperCase() : '';
    const instrumento = idxInstrumento >= 0 ? (row[idxInstrumento] || '').toString().trim().toUpperCase() : '';
    const local = idxLocal >= 0 ? (row[idxLocal] || '').toString().trim() : '';
    
    let dataStr = '';
    if (idxData >= 0) {
      try {
        dataStr = Utilities.formatDate(new Date(row[idxData]), "GMT-3", "yyyy-MM-dd");
      } catch(e) { dataStr = String(row[idxData]).split(' ')[0]; }
    }

    // TRAVA 1: Duplicidade
    const keyUuid = uuid ? `UUID:${uuid}` : '';
    // Se existe UUID, ele e a identidade principal do registro.
    // A chave logica so vale para linhas antigas/sem UUID e precisa ser completa
    // para nao apagar pessoas diferentes com o mesmo nome na mesma comum.
    const keySemUuid = `${nome}|${comum}|${cidade}|${local}|${cargo}|${instrumento}|${dataStr}`;
    
    // TRAVA 2: Localidade (Filtro rigoroso)
    const isLocalDiferente = localReferencia && local && !compararLocaisEnsaio(local, localReferencia);

    // TRAVA 3: Integridade (Nome vazio)
    const isInvalido = !nome;

    const isDuplicadoUuid = keyUuid && vistosUuid.has(keyUuid);
    const isDuplicadoSemUuid = !keyUuid && vistosSemUuid.has(keySemUuid);

    if (isInvalido || isLocalDiferente || isDuplicadoUuid || isDuplicadoSemUuid) {
      rowsToDelete.push(i + 1);
      countRemovidos++;
    } else {
      if (keyUuid) {
        vistosUuid.add(keyUuid);
      } else {
        vistosSemUuid.add(keySemUuid);
      }
    }
  }

  // Deleta as linhas de baixo para cima
  for (let j = rowsToDelete.length - 1; j >= 0; j--) {
    shRegistros.deleteRow(rowsToDelete[j]);
  }

  return countRemovidos;
}
