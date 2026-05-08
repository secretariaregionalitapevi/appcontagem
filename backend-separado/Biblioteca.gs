/**
 * ============================================================================
 * BIBLIOTECA DE AUTONOMIA REGIONAL (PULL ARCHITECTURE)
 * ============================================================================
 * Funções centralizadas para permitir que as planilhas regionais puxem 
 * seus próprios dados de forma autônoma da Matriz.
 * 
 * Uso em Planilhas Regionais:
 * SistemaSAM_Biblioteca.processarDadosRegionaisCentral('Cotia', SpreadsheetApp.getActiveSpreadsheet());
 * ============================================================================
 */

/**
 * Ponto de entrada central para as regionais puxarem seus dados.
 * @param {string} localEnsaio - O nome da localidade (ex: 'Cotia', 'Itapevi')
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ssDestino - Objeto d a planilha de destino  
 * @returns {Object} Resumo da execução
 */
function processarDadosRegionaisCentral(localEnsaio, ssDestino) {
  try {
    console.log(`🚀 Iniciando Sincronização ULTRA-RÁPIDA (Supabase) para: ${localEnsaio}`);
    
    // 1. Busca os registros diretamente no Supabase (Alta Performance)
    const registros = buscarRegistrosSupabase(localEnsaio);
    
    if (!registros || registros.length === 0) {
      console.log('ℹ️ Nenhum dado encontrado no Supabase para este local.');
      return { 
        sucesso: true, 
        mensagem: "Nenhum dado encontrado no banco de dados para este local.",
        detalhes: { total: 0 }
      };
    }

    // 2. Atualiza a aba 'Registros' da regional (Bulk)
    const shRegistros = ssDestino.getSheetByName('Registros');
    if (shRegistros) {
      atualizarAbaRegistrosLocalBulk(shRegistros, registros);
    }
    
    // 3. Atualiza Dashboard (Recontagem Local Rápida)
    let resumoExecucao = { membros: 0, organistas: 0, ministry: 0 };
    const shResumo = ssDestino.getSheetByName('Resumo');
    if (shResumo) {
      resumoExecucao = atualizarResumoContadorIncremental(shResumo, null, ssDestino);
    }
    
    // 4. Atualiza Organistas e Ministério
    try {
      alimentarAbaOrganistasDestino(localEnsaio, ssDestino, localEnsaio);
      alimentarAbaMinisterioDestino(localEnsaio, ssDestino, localEnsaio);
    } catch (e) {
      console.warn('⚠️ Erro ao atualizar abas secundárias:', e.message);
    }
    
    console.log(`✅ Sincronização concluída com sucesso para: ${localEnsaio}`);
    
    return {
      sucesso: true,
      mensagem: `Sincronização concluída com sucesso para ${localEnsaio}.`,
      detalhes: {
        total: registros.length
      }
    };
  } catch (err) {
    console.error(`❌ Erro crítico na Sincronização Autônoma: ${err.message}`);
    return {
      sucesso: false,
      mensagem: `Erro: ${err.message}`
    };
  }
}
