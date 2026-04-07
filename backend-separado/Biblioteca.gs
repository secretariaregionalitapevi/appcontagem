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
    console.log(`🚀 Iniciando Sincronização Autônoma (Pull) para: ${localEnsaio}`);
    
    // 1. Gera o Resumo (Dashboard)
    const resResumo = exportarParaPlanilhaDestinoCompleta(localEnsaio, ssDestino, localEnsaio);
    
    // 2. Gera Organistas
    const resOrg = alimentarAbaOrganistasDestino(localEnsaio, ssDestino, localEnsaio);
    
    // 3. Gera Ministério
    const resMin = alimentarAbaMinisterioDestino(localEnsaio, ssDestino, localEnsaio);
    
    console.log(`✅ Sincronização Autônoma concluída com sucesso para: ${localEnsaio}`);
    
    return {
      sucesso: true,
      mensagem: `Sincronização concluída com sucesso. Resumo, Organistas e Ministério atualizados.`,
      detalhes: {
        resumo: resResumo,
        organistas: resOrg,
        ministerio: resMin
      }
    };
  } catch (err) {
    console.error(`❌ Erro crítico na Sincronização Autônoma: ${err.message}`);
    throw err;
  }
}
