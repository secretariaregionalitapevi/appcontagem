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
        membros: resumoExecucao.membros,
        organistas: resumoExecucao.organistas,
        ministerio: resumoExecucao.ministerio
      }
    };
  } catch (err) {
    console.error("❌ Erro crítico: " + err.message);
    return { sucesso: false, mensagem: err.message };
  }
}
