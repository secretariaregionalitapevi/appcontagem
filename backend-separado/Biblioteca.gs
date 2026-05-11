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
    
    // 1. Busca os registros diretamente no Supabase
    var registros = buscarRegistrosSupabase(localEnsaio);
    
    if (!registros || registros.length === 0) {
      console.log('ℹ️ Nenhum dado encontrado.');
      return { 
        sucesso: true, 
        mensagem: "Nenhum dado encontrado no banco de dados para este local.",
        detalhes: { total: 0 }
      };
    }

    // 2. Atualiza a aba 'Registros'
    var shRegistros = ssDestino.getSheetByName('Registros');
    if (shRegistros) {
      ssDestino.toast("📥 Recebendo dados de " + localEnsaio + "...", 'Sincronização', 5);
      atualizarAbaRegistrosLocalBulk(shRegistros, registros);
      SpreadsheetApp.flush();
    }
    
    // 3. Atualiza Dashboard
    ssDestino.toast('📊 Atualizando Dashboard...', 'Sincronização', 5);
    var resumoExecucao = { membros: 0, organistas: 0, ministry: 0 };
    var shResumo = ssDestino.getSheetByName('Resumo');
    if (shResumo) {
      resumoExecucao = atualizarResumoContadorIncremental(shResumo, null, ssDestino);
    }
    
    // 4. Atualiza Organistas e Ministério
    try {
      ssDestino.toast('🎹 Atualizando listas auxiliares...', 'Sincronização', 5);
      alimentarAbaOrganistasDestino(localEnsaio, ssDestino, localEnsaio, shRegistros);
      alimentarAbaMinisterioDestino(localEnsaio, ssDestino, localEnsaio, shRegistros);
    } catch (e) {
      console.warn('⚠️ Erro abas secundárias:', e.message);
    }
    
    ssDestino.toast('✅ Sincronização concluída!', 'Sucesso', 5);
    
    return {
      sucesso: true,
      mensagem: "Sincronização concluída com sucesso.",
      detalhes: {
        total: registros.length,
        resumo: {
          totalMembros: resumoExecucao.membros,
          totalOrganistas: resumoExecucao.organistas,
          totalMinisterio: resumoExecucao.ministerio
        }
      }
    };
  } catch (err) {
    console.error("❌ Erro crítico: " + err.message);
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
    const shRegistros = ssDestino.getSheetByName('Registros');
    if (!shRegistros || shRegistros.getLastRow() < 2) {
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
    
    if (!silencioso) ssDestino.toast('🛡️ Aplicando travas de segurança...', 'Sincronização Local', 3);

    // --- TRAVA DE SEGURANÇA 1 & 2: Limpeza de Duplicatas e Localidade ---
    const totalRemovidos = aplicarTravasSegurancaRegistros(shRegistros, localEnsaio);
    if (totalRemovidos > 0) {
      ssDestino.toast(`🧹 ${totalRemovidos} registros inválidos/duplicados removidos.`, 'Segurança', 3);
    }

    // 2. Atualiza Dashboard (Resumo)
    ssDestino.toast('📊 Atualizando Dashboard...', 'Sincronização Local', 3);
    const shResumo = ssDestino.getSheetByName('Resumo');
    let resumoExecucao = { membros: 0, organistas: 0, ministerio: 0 };
    if (shResumo) {
      resumoExecucao = atualizarResumoContadorIncremental(shResumo, null, ssDestino);
    }
    
    // 3. Atualiza Organistas e Ministério (Alimentação Automática)
    try {
      ssDestino.toast('🎹 Atualizando listas auxiliares...', 'Sincronização Local', 3);
      // Passamos shRegistros como fonte para garantir fidelidade total ao que foi limpo
      alimentarAbaOrganistasDestino(localEnsaio, ssDestino, localEnsaio, shRegistros);
      alimentarAbaMinisterioDestino(localEnsaio, ssDestino, localEnsaio, shRegistros);
    } catch (e) {
       console.warn('⚠️ Erro listas auxiliares:', e.message);
    }

    if (!silencioso) ssDestino.toast('✅ Painel atualizado com sucesso!', 'Sucesso', 5);
    return { 
      sucesso: true, 
      mensagem: 'Painel atualizado com sucesso.'
    };
  } catch (err) {
    console.error("❌ Erro no sincronismo local: " + err.message);
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
  const idxData = headers.indexOf('DATA_ENSAIO');
  const idxLocal = headers.indexOf('LOCAL_ENSAIO');

  const vists = new Set();
  const rowsToDelete = [];
  let countRemovidos = 0;

  // Percorre de baixo para cima para não quebrar os índices na deleção posterior (ou apenas filtramos)
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const uuid = idxUuid >= 0 ? (row[idxUuid] || '').toString().trim() : '';
    const nome = idxNome >= 0 ? (row[idxNome] || '').toString().trim().toUpperCase() : '';
    const comum = idxComum >= 0 ? (row[idxComum] || '').toString().trim().toUpperCase() : '';
    const local = idxLocal >= 0 ? (row[idxLocal] || '').toString().trim() : '';
    
    let dataStr = '';
    if (idxData >= 0) {
      try {
        dataStr = Utilities.formatDate(new Date(row[idxData]), "GMT-3", "yyyy-MM-dd");
      } catch(e) { dataStr = String(row[idxData]).split(' ')[0]; }
    }

    // TRAVA 1: Duplicidade
    const keyUuid = uuid ? `UUID:${uuid}` : '';
    const keyLogic = `${nome}|${comum}|${dataStr}`;
    
    // TRAVA 2: Localidade (Filtro rigoroso)
    const isLocalDiferente = localReferencia && local && !compararLocaisEnsaio(local, localReferencia);

    // TRAVA 3: Integridade (Nome vazio)
    const isInvalido = !nome;

    if (isInvalido || isLocalDiferente || (keyUuid && vists.has(keyUuid)) || vists.has(keyLogic)) {
      rowsToDelete.push(i + 1);
      countRemovidos++;
    } else {
      if (keyUuid) vists.add(keyUuid);
      vists.add(keyLogic);
    }
  }

  // Deleta as linhas de baixo para cima
  for (let j = rowsToDelete.length - 1; j >= 0; j--) {
    shRegistros.deleteRow(rowsToDelete[j]);
  }

  return countRemovidos;
}


