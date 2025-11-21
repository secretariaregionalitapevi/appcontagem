// ========================================
// GOOGLE APPS SCRIPT - CONTAGEM DE PARTICIPANTES
// ========================================
// 
// INSTRUÇÕES:
// 1. Acesse: https://script.google.com/
// 2. Crie um novo projeto
// 3. Cole este código completo
// 4. Configure a planilha (veja abaixo)
// 5. Execute a função testSave() para testar
// 6. Implante como aplicativo web
// 7. Copie a URL e cole no ENDPOINT do app.js

// ========================================
// CONFIGURAÇÃO DA PLANILHA
// ========================================
// Substitua 'ID_DA_SUA_PLANILHA' pelo ID da sua planilha Google Sheets
// O ID está na URL da planilha: https://docs.google.com/spreadsheets/d/ID_DA_SUA_PLANILHA/edit
const SHEET_ID = '1nmavqqu4FBnOTeaKW2PiLVPxdjfgBEgZEj-Do6zYE3c';
const SHEET_NAME = 'Dados';

// ========================================
// CONFIGURAÇÃO DE TIMEZONE
// ========================================
const TIMEZONE = 'America/Sao_Paulo';
const DATE_FORMAT = 'dd/MM/yyyy HH:mm:ss';

// ========================================
// FUNÇÃO UTILITÁRIA PARA FORMATAÇÃO DE DATA
// ========================================
function getCurrentTimestamp() {
  return Utilities.formatDate(new Date(), TIMEZONE, DATE_FORMAT);
}

// ========================================
// FUNÇÃO PARA FORÇAR CONVERSÃO DE TIMESTAMP PARA PADRÃO BRASILEIRO
// ========================================
function forceBrazilianTimestamp(timestamp) {
  console.log('🔄 Forçando conversão de timestamp:', timestamp);
  console.log('🔄 TIMEZONE configurado:', TIMEZONE);
  console.log('🔄 DATE_FORMAT configurado:', DATE_FORMAT);
  
  // Se timestamp estiver vazio ou nulo, usar timestamp atual
  if (!timestamp || timestamp === '' || timestamp === null || timestamp === undefined) {
    console.log('⚠️ Timestamp vazio, usando timestamp atual');
    return getCurrentTimestamp();
  }
  
  // Converter para string para garantir que seja tratado como texto
  const timestampStr = String(timestamp).trim();
  console.log('📝 Timestamp como string:', timestampStr);
  
  // Se já estiver no formato brasileiro (dd/MM/yyyy HH:mm:ss), retornar como está
  if (timestampStr.match(/^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}:\d{2}$/)) {
    console.log('✅ Timestamp já está no formato brasileiro');
    return timestampStr;
  }
  
  // Se estiver em formato ISO (com T e Z), converter
  if (timestampStr.includes('T') && timestampStr.includes('Z')) {
    console.log('🔄 Convertendo timestamp ISO para formato brasileiro');
    console.log('🔄 Timestamp ISO detectado:', timestampStr);
    try {
      const date = new Date(timestampStr);
      console.log('🔄 Data criada:', date);
      console.log('🔄 Data válida:', !isNaN(date.getTime()));
      
      if (isNaN(date.getTime())) {
        console.log('❌ Data inválida, usando timestamp atual');
        return getCurrentTimestamp();
      }
      
      const brazilianTimestamp = Utilities.formatDate(date, TIMEZONE, DATE_FORMAT);
      console.log('✅ Timestamp ISO convertido:', brazilianTimestamp);
      console.log('✅ TIMEZONE usado:', TIMEZONE);
      console.log('✅ DATE_FORMAT usado:', DATE_FORMAT);
      return brazilianTimestamp;
    } catch (error) {
      console.error('❌ Erro ao converter timestamp ISO:', error);
      console.error('❌ Stack trace:', error.stack);
      return getCurrentTimestamp();
    }
  }
  
  // Se estiver em formato ISO sem Z (UTC), tentar converter
  if (timestampStr.includes('T')) {
    console.log('🔄 Convertendo timestamp ISO (sem Z) para formato brasileiro');
    try {
      const date = new Date(timestampStr);
      const brazilianTimestamp = Utilities.formatDate(date, TIMEZONE, DATE_FORMAT);
      console.log('✅ Timestamp ISO (sem Z) convertido:', brazilianTimestamp);
      return brazilianTimestamp;
    } catch (error) {
      console.error('❌ Erro ao converter timestamp ISO (sem Z):', error);
      return getCurrentTimestamp();
    }
  }
  
  // Se estiver em formato de data JavaScript (milissegundos), converter
  if (timestampStr.match(/^\d+$/)) {
    console.log('🔄 Convertendo timestamp em milissegundos para formato brasileiro');
    try {
      const date = new Date(parseInt(timestampStr));
      const brazilianTimestamp = Utilities.formatDate(date, TIMEZONE, DATE_FORMAT);
      console.log('✅ Timestamp em milissegundos convertido:', brazilianTimestamp);
      return brazilianTimestamp;
    } catch (error) {
      console.error('❌ Erro ao converter timestamp em milissegundos:', error);
      return getCurrentTimestamp();
    }
  }
  
  // Se estiver em formato americano (MM/dd/yyyy), converter
  if (timestampStr.match(/^\d{2}\/\d{2}\/\d{4}/)) {
    console.log('🔄 Convertendo timestamp formato americano para brasileiro');
    try {
      const date = new Date(timestampStr);
      const brazilianTimestamp = Utilities.formatDate(date, TIMEZONE, DATE_FORMAT);
      console.log('✅ Timestamp formato americano convertido:', brazilianTimestamp);
      return brazilianTimestamp;
    } catch (error) {
      console.error('❌ Erro ao converter timestamp formato americano:', error);
      return getCurrentTimestamp();
    }
  }
  
  // Para qualquer outro formato, tentar converter como data
  console.log('🔄 Tentando converter timestamp em formato desconhecido');
  try {
    const date = new Date(timestampStr);
    // Verificar se a data é válida
    if (isNaN(date.getTime())) {
      console.log('❌ Data inválida, usando timestamp atual');
      return getCurrentTimestamp();
    }
    const brazilianTimestamp = Utilities.formatDate(date, TIMEZONE, DATE_FORMAT);
    console.log('✅ Timestamp formato desconhecido convertido:', brazilianTimestamp);
    return brazilianTimestamp;
  } catch (error) {
    console.error('❌ Erro ao converter timestamp formato desconhecido:', error);
    return getCurrentTimestamp();
  }
}

// ========================================
// FUNÇÃO PRINCIPAL PARA REQUISIÇÕES POST
// ========================================
function doPost(e) {
  try {
    console.log('=== DO POST RECEBIDO ===');
    console.log('Event object:', e);
    
    // Verificar se o objeto e é válido
    if (!e) {
      console.log('⚠️ Event object é undefined - executando diretamente no editor');
      return ContentService
        .createTextOutput(JSON.stringify({
          success: false,
          error: 'Função executada diretamente no editor. Use via requisição HTTP ou execute testSummary()',
          message: 'Para testar, execute a função testSummary() no editor'
        }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    console.log('Headers:', e.parameter ? e.parameter : 'N/A');
    console.log('PostData:', e.postData ? e.postData : 'N/A');
    
    // Verificar se é uma ação de resumo
    if (e && e.parameter && e.parameter.action === 'summary') {
      console.log('📊 Processando resumo...');
      return processSummary(e.parameter.data);
    }
    
    let data = null;
    
    // Tentar extrair dados do payload
    if (e && e.parameter && e.parameter.payload) {
      try {
        console.log('Payload recebido:', e.parameter.payload);
        data = JSON.parse(e.parameter.payload);
        console.log('Dados extraídos do payload:', data);
      } catch (parseError) {
        console.error('Erro ao parsear payload:', parseError);
      }
    } else if (e.postData && e.postData.contents) {
      try {
        console.log('Conteúdo recebido:', e.postData.contents);
        
        // Tentar parsear como URLSearchParams primeiro
        const params = new URLSearchParams(e.postData.contents);
        const payload = params.get('payload');
        if (payload) {
          data = JSON.parse(payload);
          console.log('Dados extraídos do payload (URLSearchParams):', data);
        } else {
          // Se não for URLSearchParams, tentar parsear diretamente como JSON
          data = JSON.parse(e.postData.contents);
          console.log('Dados extraídos do payload (JSON direto):', data);
        }
      } catch (parseError) {
        console.error('Erro ao parsear payload:', parseError);
        console.log('Tentando parsear como string simples...');
        
        // Se falhar, tentar extrair dados manualmente
        const content = e.postData.contents;
        if (content.includes('cargo=')) {
          // Formato: cargo=valor&ministerio=valor
          const urlParams = new URLSearchParams(content);
          data = {
            timestamp: urlParams.get('timestamp') || '',
            cargo: urlParams.get('cargo') || '',
            ministerio: urlParams.get('ministerio') || '',
            administracao: urlParams.get('administracao') || ''
          };
          console.log('Dados extraídos manualmente:', data);
        }
      }
    }
    
    // Se não conseguiu extrair do payload, tentar dos parâmetros
    if (!data && e && e.parameter) {
      data = {
        timestamp: e.parameter.timestamp || '',
        cargo: e.parameter.cargo || '',
        ministerio: e.parameter.ministerio || '',
        administracao: e.parameter.administracao || ''
      };
      console.log('Dados extraídos dos parâmetros:', data);
    }
    
    // Validar se o cargo foi especificado
    const cargo = data ? data.cargo : (e && e.parameter ? e.parameter.cargo : '');
    if (!cargo || cargo.trim() === '') {
      console.error('Cargo não especificado');
      return ContentService
        .createTextOutput(JSON.stringify({
          success: false, 
          error: 'Cargo não especificado',
          received: e,
          data: data
        }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    // Salvar na planilha
    const result = saveToSheet(data);
    console.log('Resultado do salvamento:', result);
    
    return ContentService
      .createTextOutput(JSON.stringify({
        success: true, 
        result: result,
        message: 'Dados salvos com sucesso'
      }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    console.error('Erro no doPost:', error);
    return ContentService
      .createTextOutput(JSON.stringify({
        success: false, 
        error: error.toString(),
        stack: error.stack
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ========================================
// FUNÇÃO PARA REQUISIÇÕES GET
// ========================================
function doGet(e) {
  try {
    console.log('=== DO GET RECEBIDO ===');
    console.log('Event object:', e);
    
    // Verificar se o objeto e é válido
    if (!e) {
      console.log('⚠️ Event object é undefined - executando diretamente no editor');
      return ContentService
        .createTextOutput(JSON.stringify({
          success: false,
          error: 'Função executada diretamente no editor. Use via requisição HTTP ou execute testSummary()',
          message: 'Para testar, execute a função testSummary() no editor'
        }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    // VERIFICAÇÃO DIRETA PARA RESUMO
    if (e.parameter && e.parameter.action === 'getSummary') {
      console.log('📊 RESUMO DETECTADO - retornando dados...');
      const summaryData = getSummaryData();
      console.log('📊 Dados do resumo:', summaryData);
      return ContentService
        .createTextOutput(JSON.stringify(summaryData))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    console.log('Parâmetros recebidos:', e.parameter ? e.parameter : 'N/A');
    console.log('Tipo dos parâmetros:', typeof e.parameter);
    console.log('Ação solicitada:', e.parameter ? e.parameter.action : 'N/A');
    
    // VERIFICAÇÃO PRIORITÁRIA PARA RESUMO - MAIS ROBUSTA
    if (e.parameter && (
      e.parameter.action === 'getSummary' || 
      e.parameter.getSummary === 'true' ||
      e.parameter.getSummary === true ||
      (e.parameter.action && e.parameter.action.includes('Summary'))
    )) {
      console.log('📊 RESUMO DETECTADO IMEDIATAMENTE - processando...');
      console.log('📊 Parâmetros de resumo:', e.parameter);
      try {
        const summaryData = getSummaryData();
        console.log('✅ Dados do resumo obtidos:', summaryData);
        return ContentService
          .createTextOutput(JSON.stringify(summaryData))
          .setMimeType(ContentService.MimeType.JSON);
      } catch (summaryError) {
        console.error('❌ Erro ao obter resumo:', summaryError);
        return ContentService
          .createTextOutput(JSON.stringify({
            success: false,
            error: 'Erro ao obter resumo: ' + summaryError.message
          }))
          .setMimeType(ContentService.MimeType.JSON);
      }
    }
    
    // Verificar se é uma requisição de resumo (múltiplas formas de verificar)
    const isSummaryRequest = e && e.parameter && (
      e.parameter.action === 'getSummary' ||
      e.parameter.action === 'summary' ||
      e.parameter.getSummary === 'true' ||
      e.parameter.getSummary === true
    );
    
    if (isSummaryRequest) {
      console.log('📊 Requisição de resumo detectada - processando...');
      console.log('📊 Parâmetros recebidos:', e.parameter);
      try {
        const summaryData = getSummaryData();
        console.log('✅ Dados do resumo obtidos com sucesso:', summaryData);
        console.log('📤 Retornando dados do resumo para o frontend...');
        return ContentService
          .createTextOutput(JSON.stringify(summaryData))
          .setMimeType(ContentService.MimeType.JSON);
      } catch (summaryError) {
        console.error('❌ Erro ao obter dados do resumo:', summaryError);
        return ContentService
          .createTextOutput(JSON.stringify({
            success: false,
            error: 'Erro ao obter dados do resumo: ' + summaryError.message
          }))
          .setMimeType(ContentService.MimeType.JSON);
      }
    }
    
    // Se for teste de conectividade, retornar OK
    if (e && e.parameter && e.parameter.test === 'connectivity') {
      console.log('🔗 Teste de conectividade detectado');
      return ContentService
        .createTextOutput(JSON.stringify({
          success: true,
          message: 'Conectividade OK',
          timestamp: getCurrentTimestamp()
        }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    // Se não for uma ação específica, verificar se é um registro normal
    if (!e || !e.parameter || !e.parameter.cargo) {
      console.log('⚠️ Parâmetros insuficientes para registro normal');
      return ContentService
        .createTextOutput(JSON.stringify({
          success: false,
          error: 'Parâmetros insuficientes. Use action=getSummary para buscar resumo ou forneça cargo para registro.',
          receivedParams: e.parameter || 'Nenhum parâmetro recebido'
        }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    const data = {
      timestamp: getCurrentTimestamp(),
      cargo: (e && e.parameter) ? e.parameter.cargo || '' : '',
      ministerio: (e && e.parameter) ? e.parameter.ministerio || '' : '',
      administracao: (e && e.parameter) ? e.parameter.administracao || '' : ''
    };
    
    console.log('Dados preparados:', data);
    
    if (!data.cargo) {
      return ContentService
        .createTextOutput(JSON.stringify({
          success: false, 
          error: 'Cargo não especificado'
        }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    // Salvar na planilha
    const result = saveToSheet(data);
    console.log('Resultado do salvamento:', result);
    
    return ContentService
      .createTextOutput(JSON.stringify({
        success: true, 
        result: result,
        message: 'Dados salvos com sucesso'
      }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    console.error('Erro no doGet:', error);
    return ContentService
      .createTextOutput(JSON.stringify({
        success: false, 
        error: error.toString()
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ========================================
// FUNÇÃO PARA PROCESSAR RESUMO
// ========================================
function processSummary(summaryDataString) {
  try {
    console.log('=== PROCESSANDO RESUMO ===');
    console.log('Dados do resumo recebidos:', summaryDataString);
    
    // Verificar se os dados são válidos
    if (!summaryDataString || summaryDataString === 'undefined') {
      console.log('⚠️ Dados de resumo não fornecidos, gerando resumo automaticamente...');
      return generateSummaryByCargo();
    }
    
    const summaryData = JSON.parse(summaryDataString);
    console.log('Dados parseados:', summaryData);
    
    // Abrir a planilha de resumo
    const summarySheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName('Resumo');
    
    // Se a planilha de resumo não existir, criar
    if (!summarySheet) {
      console.log('Criando planilha de resumo...');
      const spreadsheet = SpreadsheetApp.openById(SHEET_ID);
      const newSheet = spreadsheet.insertSheet('Resumo');
      console.log('Planilha de resumo criada');
    }
    
    const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName('Resumo');
    
    // Limpar planilha de resumo
    sheet.clear();
    
    // Adicionar cabeçalho
    sheet.getRange(1, 1, 1, 2).setValues([['CARGO', 'QUANTIDADE']]);
    sheet.getRange(1, 1, 1, 2).setFontWeight('bold');
    sheet.getRange(1, 1, 1, 2).setBackground('#f0f0f0');
    
    let currentRow = 2;
    
    // MINISTÉRIO PRESENTE
    sheet.getRange(currentRow, 1).setValue('MINISTÉRIO PRESENTE');
    sheet.getRange(currentRow, 1).setFontWeight('bold');
    sheet.getRange(currentRow, 1).setBackground('#e0e0e0');
    currentRow++;
    
    const ministerioCargos = [
      'Anciães', 'Diáconos', 'Cooperadores do Ofício Ministerial',
      'Cooperadores de Jovens e Menores', 'Encarregados Regionais',
      'Encarregados Locais', 'Examinadoras de Organistas'
    ];
    
    ministerioCargos.forEach(cargo => {
      const quantidade = summaryData.cargoOrder[cargo] || 0;
      sheet.getRange(currentRow, 1).setValue(cargo);
      sheet.getRange(currentRow, 2).setValue(quantidade);
      currentRow++;
    });
    
    // Total Ministério
    sheet.getRange(currentRow, 1).setValue('TOTAL MINISTÉRIO');
    sheet.getRange(currentRow, 1).setFontWeight('bold');
    sheet.getRange(currentRow, 1).setBackground('#d0d0d0');
    sheet.getRange(currentRow, 2).setValue(summaryData.totals.totalMinisterio);
    sheet.getRange(currentRow, 2).setFontWeight('bold');
    currentRow += 2;
    
    // ADMINISTRAÇÃO
    sheet.getRange(currentRow, 1).setValue('ADMINISTRAÇÃO');
    sheet.getRange(currentRow, 1).setFontWeight('bold');
    sheet.getRange(currentRow, 1).setBackground('#e0e0e0');
    currentRow++;
    
    const adminCargos = [
      'Secretários da Música', 'Titular da Administração', 'Auxiliares da Administração'
    ];
    
    adminCargos.forEach(cargo => {
      const quantidade = summaryData.cargoOrder[cargo] || 0;
      sheet.getRange(currentRow, 1).setValue(cargo);
      sheet.getRange(currentRow, 2).setValue(quantidade);
      currentRow++;
    });
    
    // Total Administração
    sheet.getRange(currentRow, 1).setValue('TOTAL ADMINISTRAÇÃO');
    sheet.getRange(currentRow, 1).setFontWeight('bold');
    sheet.getRange(currentRow, 1).setBackground('#d0d0d0');
    sheet.getRange(currentRow, 2).setValue(summaryData.totals.totalAdministracao);
    sheet.getRange(currentRow, 2).setFontWeight('bold');
    currentRow += 2;
    
    // MÚSICOS E ORGANISTAS
    sheet.getRange(currentRow, 1).setValue('MÚSICOS E ORGANISTAS');
    sheet.getRange(currentRow, 1).setFontWeight('bold');
    sheet.getRange(currentRow, 1).setBackground('#e0e0e0');
    currentRow++;
    
    const musicosCargos = ['Músicos', 'Organistas'];
    
    musicosCargos.forEach(cargo => {
      const quantidade = summaryData.cargoOrder[cargo] || 0;
      sheet.getRange(currentRow, 1).setValue(cargo);
      sheet.getRange(currentRow, 2).setValue(quantidade);
      currentRow++;
    });
    
    // Total Músicos
    sheet.getRange(currentRow, 1).setValue('TOTAL DE MÚSICOS E ORGANISTAS');
    sheet.getRange(currentRow, 1).setFontWeight('bold');
    sheet.getRange(currentRow, 1).setBackground('#d0d0d0');
    sheet.getRange(currentRow, 2).setValue(summaryData.totals.totalMusicos);
    sheet.getRange(currentRow, 2).setFontWeight('bold');
    currentRow += 2;
    
    // IRMANDADE
    sheet.getRange(currentRow, 1).setValue('IRMANDADE');
    sheet.getRange(currentRow, 1).setFontWeight('bold');
    sheet.getRange(currentRow, 1).setBackground('#e0e0e0');
    currentRow++;
    
    const irmandadeCargos = ['Irmãos', 'Irmãs'];
    
    irmandadeCargos.forEach(cargo => {
      const quantidade = summaryData.cargoOrder[cargo] || 0;
      sheet.getRange(currentRow, 1).setValue(cargo);
      sheet.getRange(currentRow, 2).setValue(quantidade);
      currentRow++;
    });
    
    // Total Irmandade
    sheet.getRange(currentRow, 1).setValue('TOTAL IRMANDADE');
    sheet.getRange(currentRow, 1).setFontWeight('bold');
    sheet.getRange(currentRow, 1).setBackground('#d0d0d0');
    sheet.getRange(currentRow, 2).setValue(summaryData.totals.totalIrmandade);
    sheet.getRange(currentRow, 2).setFontWeight('bold');
    currentRow += 2;
    
    // Total Geral
    sheet.getRange(currentRow, 1).setValue('TOTAL GERAL');
    sheet.getRange(currentRow, 1).setFontWeight('bold');
    sheet.getRange(currentRow, 1).setBackground('#c0c0c0');
    sheet.getRange(currentRow, 2).setValue(summaryData.totals.totalGeral);
    sheet.getRange(currentRow, 2).setFontWeight('bold');
    sheet.getRange(currentRow, 2).setBackground('#c0c0c0');
    
    // Ajustar largura das colunas
    sheet.autoResizeColumns(1, 2);
    
    console.log('✅ Resumo salvo com sucesso na planilha');
    
    return ContentService
      .createTextOutput(JSON.stringify({
        success: true,
        message: "Resumo salvo com sucesso na planilha Google Sheets"
      }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    console.error("Erro ao processar resumo:", error.message, error.stack);
    return ContentService
      .createTextOutput(JSON.stringify({
        success: false,
        message: "Erro ao processar resumo: " + error.message
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ========================================
// FUNÇÃO PARA SALVAR DADOS NA PLANILHA
// ========================================
function saveToSheet(data) {
  try {
    console.log('=== SALVANDO NA PLANILHA ===');
    console.log('Sheet ID:', SHEET_ID);
    console.log('Sheet Name:', SHEET_NAME);
    console.log('Dados:', data);
    
    // Abrir a planilha
    const spreadsheet = SpreadsheetApp.openById(SHEET_ID);
    console.log('Planilha aberta:', spreadsheet.getName());
    
    // GARANTIR que a aba "Dados" existe e é a correta
    let sheet = spreadsheet.getSheetByName('Dados');
    if (!sheet) {
      console.log('❌ Aba "Dados" não encontrada - criando nova aba');
      sheet = spreadsheet.insertSheet('Dados');
      
      // Adicionar cabeçalhos
      const headers = ['Timestamp', 'Cargo', 'Ministério', 'Administração'];
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
      console.log('✅ Nova aba "Dados" criada com cabeçalhos');
    } else {
      console.log('✅ Aba "Dados" encontrada - salvando dados');
    }
    
    // REMOVER abas incorretas se existirem
    const participantesSheet = spreadsheet.getSheetByName('Participantes');
    if (participantesSheet) {
      console.log('🗑️ Removendo aba incorreta "Participantes"...');
      spreadsheet.deleteSheet(participantesSheet);
    }
    
    const logSheet = spreadsheet.getSheetByName('Log');
    if (logSheet) {
      console.log('🗑️ Removendo aba incorreta "Log"...');
      spreadsheet.deleteSheet(logSheet);
    }
    
    // Confirmar que estamos salvando na aba correta
    console.log('📋 Salvando na aba:', sheet.getName());
    console.log('📋 Nome esperado: Dados');
    console.log('📋 Nomes coincidem:', sheet.getName() === 'Dados');
    
    // Preparar nova linha - FORÇAR timestamp para padrão brasileiro
    console.log('📅 Timestamp recebido do frontend:', data.timestamp);
    console.log('📅 Tipo do timestamp:', typeof data.timestamp);
    console.log('📅 Dados completos recebidos:', data);
    
    // USAR A FUNÇÃO DE CONVERSÃO FORÇADA
    console.log('🔄 CHAMANDO forceBrazilianTimestamp...');
    const timestamp = forceBrazilianTimestamp(data.timestamp);
    console.log('✅ RESULTADO da conversão:', timestamp);
    
    console.log('📅 Timestamp final que será salvo:', timestamp);
    console.log('📅 Tipo do timestamp final:', typeof timestamp);
    
    const newRow = [
      timestamp,
      data.cargo || '',
      data.ministerio || '',
      data.administracao || ''
    ];
    
    console.log('Nova linha:', newRow);
    
    // Adicionar linha
    sheet.appendRow(newRow);
    console.log('Linha adicionada com sucesso');
    
    // Retornar resultado
    return {
      message: 'Dados salvos com sucesso na aba "Dados"',
      row: newRow,
      sheetName: 'Dados',
      totalRows: sheet.getLastRow()
    };
    
  } catch (error) {
    console.error('Erro ao salvar na planilha:', error);
    throw new Error(`Erro ao salvar na planilha: ${error.toString()}`);
  }
}


// ========================================
// FUNÇÃO PARA VERIFICAR TIMESTAMPS ISO EXISTENTES
// ========================================
function verificarTimestampsISO() {
  console.log('=== VERIFICAÇÃO DE TIMESTAMPS ISO ===');
  
  try {
    // Obter a planilha
    const sheet = SpreadsheetApp.getActiveSheet();
    console.log('📋 Planilha ativa:', sheet.getName());
    
    // Obter todos os dados da coluna A (timestamps)
    const lastRow = sheet.getLastRow();
    console.log('📊 Última linha com dados:', lastRow);
    
    if (lastRow <= 1) {
      console.log('⚠️ Nenhum dado encontrado');
      SpreadsheetApp.getUi().alert(
        '⚠️ Nenhum Dado Encontrado',
        'Não há dados na planilha para verificar.',
        SpreadsheetApp.getUi().ButtonSet.OK
      );
      return 'Nenhum dado encontrado';
    }
    
    // Obter todos os valores da coluna A (pular o cabeçalho)
    const timestampRange = sheet.getRange(2, 1, lastRow - 1, 1);
    const timestamps = timestampRange.getValues();
    
    console.log('📅 Timestamps encontrados:', timestamps.length);
    
    let isoCount = 0;
    let brazilianCount = 0;
    let otherCount = 0;
    const isoRows = [];
    
    // Analisar cada timestamp
    timestamps.forEach((row, index) => {
      const timestamp = row[0];
      const rowNumber = index + 2; // +2 porque começamos da linha 2
      const timestampStr = String(timestamp);
      
      if (timestampStr.includes('T') && timestampStr.includes('Z')) {
        isoCount++;
        isoRows.push(rowNumber);
        console.log(`📅 Linha ${rowNumber}: ISO - ${timestamp}`);
      } else if (timestampStr.match(/^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}:\d{2}$/)) {
        brazilianCount++;
        console.log(`📅 Linha ${rowNumber}: Brasileiro - ${timestamp}`);
      } else {
        otherCount++;
        console.log(`📅 Linha ${rowNumber}: Outro formato - ${timestamp}`);
      }
    });
    
    const result = `Verificação concluída! ${isoCount} timestamps ISO, ${brazilianCount} brasileiros, ${otherCount} outros formatos.`;
    console.log('📊 Resultado:', result);
    
    if (isoRows.length > 0) {
      console.log('📋 Linhas com timestamps ISO:', isoRows.join(', '));
    }
    
    // Mostrar notificação visual
    SpreadsheetApp.getUi().alert(
      '🔍 Verificação de Timestamps Concluída',
      `Resultado da verificação:\n\n` +
      `📅 Timestamps ISO: ${isoCount}\n` +
      `✅ Timestamps Brasileiros: ${brazilianCount}\n` +
      `❓ Outros formatos: ${otherCount}\n\n` +
      (isoRows.length > 0 ? `Linhas com ISO: ${isoRows.join(', ')}` : 'Todos os timestamps estão no formato correto!'),
      SpreadsheetApp.getUi().ButtonSet.OK
    );
    
    return result;
    
  } catch (error) {
    console.error('❌ Erro durante a verificação:', error);
    
    // Mostrar notificação de erro
    SpreadsheetApp.getUi().alert(
      '❌ Erro na Verificação',
      `Erro ao verificar timestamps:\n\n${error.message}`,
      SpreadsheetApp.getUi().ButtonSet.OK
    );
    
    throw new Error(`Erro durante a verificação: ${error.toString()}`);
  }
}

// ========================================
// FUNÇÃO PARA CONVERTER TIMESTAMPS ISO EXISTENTES PARA FORMATO BRASILEIRO
// ========================================
function converterTimestampsISO() {
  console.log('=== CONVERSÃO DE TIMESTAMPS ISO PARA FORMATO BRASILEIRO ===');
  
  try {
    // Obter a planilha
    const sheet = SpreadsheetApp.getActiveSheet();
    console.log('📋 Planilha ativa:', sheet.getName());
    
    // Obter todos os dados da coluna A (timestamps)
    const lastRow = sheet.getLastRow();
    console.log('📊 Última linha com dados:', lastRow);
    
    if (lastRow <= 1) {
      console.log('⚠️ Nenhum dado encontrado para converter');
      return 'Nenhum dado encontrado para converter';
    }
    
    // Obter todos os valores da coluna A (pular o cabeçalho)
    const timestampRange = sheet.getRange(2, 1, lastRow - 1, 1);
    const timestamps = timestampRange.getValues();
    
    console.log('📅 Timestamps encontrados:', timestamps.length);
    
    let convertedCount = 0;
    let skippedCount = 0;
    const convertedTimestamps = [];
    
    // Processar cada timestamp
    timestamps.forEach((row, index) => {
      const timestamp = row[0];
      const rowNumber = index + 2; // +2 porque começamos da linha 2
      
      console.log(`\n--- Processando linha ${rowNumber} ---`);
      console.log('📅 Timestamp original:', timestamp);
      console.log('📅 Tipo:', typeof timestamp);
      
      // Verificar se é um timestamp ISO
      const timestampStr = String(timestamp);
      if (timestampStr.includes('T') && timestampStr.includes('Z')) {
        console.log('🔄 Timestamp ISO detectado, convertendo...');
        
        try {
          const convertedTimestamp = forceBrazilianTimestamp(timestamp);
          convertedTimestamps.push([convertedTimestamp]);
          convertedCount++;
          
          console.log('✅ Convertido para:', convertedTimestamp);
        } catch (error) {
          console.error('❌ Erro ao converter timestamp da linha', rowNumber, ':', error);
          convertedTimestamps.push([timestamp]); // Manter original se falhar
        }
      } else {
        console.log('⏭️ Timestamp não é ISO, mantendo original');
        convertedTimestamps.push([timestamp]);
        skippedCount++;
      }
    });
    
    // Atualizar a planilha com os timestamps convertidos
    if (convertedCount > 0) {
      console.log('💾 Atualizando planilha com timestamps convertidos...');
      timestampRange.setValues(convertedTimestamps);
      console.log('✅ Planilha atualizada com sucesso!');
    }
    
    const result = `Conversão concluída! ${convertedCount} timestamps convertidos, ${skippedCount} mantidos.`;
    console.log('📊 Resultado:', result);
    
    // Mostrar notificação visual
    SpreadsheetApp.getUi().alert(
      '✅ Conversão de Timestamps Concluída',
      `Resultado da conversão:\n\n` +
      `🔄 Timestamps convertidos: ${convertedCount}\n` +
      `⏭️ Timestamps mantidos: ${skippedCount}\n\n` +
      (convertedCount > 0 ? 'Todos os timestamps ISO foram convertidos para o formato brasileiro!' : 'Nenhum timestamp ISO encontrado para converter.'),
      SpreadsheetApp.getUi().ButtonSet.OK
    );
    
    return result;
    
  } catch (error) {
    console.error('❌ Erro durante a conversão:', error);
    
    // Mostrar notificação de erro
    SpreadsheetApp.getUi().alert(
      '❌ Erro na Conversão',
      `Erro ao converter timestamps:\n\n${error.message}`,
      SpreadsheetApp.getUi().ButtonSet.OK
    );
    
    throw new Error(`Erro durante a conversão: ${error.toString()}`);
  }
}


// ========================================
// FUNÇÃO PARA CONTAGEM POR CARGO
// ========================================
function generateSummaryByCargo() {
  try {
    console.log('=== GERANDO RESUMO POR CARGO ===');
    
    // Abrir a planilha
    const spreadsheet = SpreadsheetApp.openById(SHEET_ID);
    
    // Obter dados da aba "Dados"
    const dataSheet = spreadsheet.getSheetByName('Dados');
    if (!dataSheet) {
      throw new Error('Aba "Dados" não encontrada');
    }
    
    // Obter todos os dados (exceto cabeçalho)
    const lastRow = dataSheet.getLastRow();
    if (lastRow <= 1) {
      console.log('⚠️ Nenhum dado encontrado na aba "Dados" - criando resumo com zeros');
      
      // Criar resumo com zeros
      let summarySheet = spreadsheet.getSheetByName('Resumo');
      if (!summarySheet) {
        summarySheet = spreadsheet.insertSheet('Resumo');
      } else {
        summarySheet.clear();
      }
      
      // Definir cabeçalho
      summarySheet.getRange(1, 1, 1, 2).setValues([['Categoria', 'Total']]);
      summarySheet.getRange(1, 1, 1, 2).setFontWeight('bold');
      summarySheet.getRange(1, 1, 1, 2).setBackground('#4285f4');
      summarySheet.getRange(1, 1, 1, 2).setFontColor('#ffffff');
      
      // Ordem específica das categorias (LISTA COMPLETA)
      const categoriaOrder = [
        // MINISTÉRIO
        'Ancião',
        'Diácono', 
        'Cooperador do Ofício',
        'Cooperador de Jovens',
        'Encarregado Regional',
        'Encarregado Local',
        'Examinadora',
        
        // ADMINISTRAÇÃO
        'Auxiliar da Administração',
        'Secretário da Administração',
        'Secretário da Música',
        'Titular da Administração',
        
        // IRMANDADE E MÚSICOS
        'Irmã',
        'Irmão',
        'Músico',
        'Organista'
      ];
      
      let currentRow = 2;
      
      // Adicionar todas as categorias com zero
      categoriaOrder.forEach(categoria => {
        summarySheet.getRange(currentRow, 1).setValue(categoria);
        summarySheet.getRange(currentRow, 2).setValue(0);
        currentRow++;
      });
      
      // Ajustar largura das colunas
      summarySheet.autoResizeColumns(1, 2);
      
      // Aplicar formatação
      const summaryDataRange = summarySheet.getRange(2, 1, categoriaOrder.length, 2);
      summaryDataRange.setBorder(true, true, true, true, true, true);
      
      // Alinhar números à direita
      summarySheet.getRange(2, 2, categoriaOrder.length, 1).setHorizontalAlignment('right');
      
      console.log('✅ Resumo criado com zeros - nenhum dado encontrado');
      
      return {
        success: true,
        message: 'Resumo criado com zeros - nenhum dado encontrado',
        totalCategories: categoriaOrder.length,
        totalRecords: 0
      };
    }
    
    const dataRange = dataSheet.getRange(2, 1, lastRow - 1, 4);
    const dataValues = dataRange.getValues();
    
    console.log('Dados obtidos:', dataValues.length, 'registros');
    
    // Contar por cargo
    const cargoCounts = {};
    
    dataValues.forEach((row, index) => {
      const cargo = row[1] || ''; // Coluna B (Cargo)
      const ministerio = row[2] || ''; // Coluna C (Ministério)
      const administracao = row[3] || ''; // Coluna D (Administração)
      
      console.log(`Linha ${index + 2}: Cargo="${cargo}", Ministério="${ministerio}", Administração="${administracao}"`);
      
      // Determinar categoria baseada no cargo e campos adicionais
      let categoria = '';
      
      if (cargo === 'Ministério' && ministerio) {
        // Mapear ministérios para categorias
        switch (ministerio) {
          case 'Ancião':
            categoria = 'Ancião';
            break;
          case 'Diácono':
            categoria = 'Diácono';
            break;
          case 'Cooperador do Ofício':
            categoria = 'Cooperador do Ofício';
            break;
          case 'Cooperador de Jovens':
            categoria = 'Cooperador de Jovens';
            break;
          case 'Encarregado Regional':
            categoria = 'Encarregado Regional';
            break;
          case 'Encarregado Local':
            categoria = 'Encarregado Local';
            break;
          case 'Examinadora':
            categoria = 'Examinadora';
            break;
          default:
            categoria = ministerio;
        }
      } else if (cargo === 'Administração' && administracao) {
        // Mapear administrações para categorias
        switch (administracao) {
          case 'Auxiliar da Administração':
            categoria = 'Auxiliar da Administração';
            break;
          case 'Secretário da Administração':
            categoria = 'Secretário da Administração';
            break;
          case 'Secretário da Música':
            categoria = 'Secretário da Música';
            break;
          case 'Titular da Administração':
            categoria = 'Titular da Administração';
            break;
          default:
            categoria = administracao;
        }
      } else {
        // Cargos diretos
        switch (cargo) {
          case 'Irmão':
            categoria = 'Irmão';
            break;
          case 'Irmã':
            categoria = 'Irmã';
            break;
          case 'Músico':
            categoria = 'Músico';
            break;
          case 'Organista':
            categoria = 'Organista';
            break;
          default:
            categoria = cargo;
        }
      }
      
      if (categoria) {
        cargoCounts[categoria] = (cargoCounts[categoria] || 0) + 1;
        console.log(`Categoria determinada: "${categoria}" - Total: ${cargoCounts[categoria]}`);
      } else {
        console.log(`Nenhuma categoria determinada para: Cargo="${cargo}", Ministério="${ministerio}", Administração="${administracao}"`);
      }
    });
    
    console.log('Contagens por cargo:', cargoCounts);
    
    // Criar ou limpar aba "Resumo"
    let summarySheet = spreadsheet.getSheetByName('Resumo');
    if (!summarySheet) {
      summarySheet = spreadsheet.insertSheet('Resumo');
    } else {
      summarySheet.clear();
    }
    
    // Definir cabeçalho
    summarySheet.getRange(1, 1, 1, 2).setValues([['Categoria', 'Total']]);
    summarySheet.getRange(1, 1, 1, 2).setFontWeight('bold');
    summarySheet.getRange(1, 1, 1, 2).setBackground('#4285f4');
    summarySheet.getRange(1, 1, 1, 2).setFontColor('#ffffff');
    
    // Ordem específica das categorias (LISTA COMPLETA)
    const categoriaOrder = [
      // MINISTÉRIO
      'Ancião',
      'Diácono', 
      'Cooperador do Ofício',
      'Cooperador de Jovens',
      'Encarregado Regional',
      'Encarregado Local',
      'Examinadora',
      
      // ADMINISTRAÇÃO
      'Auxiliar da Administração',
      'Secretário da Administração',
      'Secretário da Música',
      'Titular da Administração',
      
      // IRMANDADE E MÚSICOS
      'Irmã',
      'Irmão',
      'Músico',
      'Organista'
    ];
    
    let currentRow = 2;
    
    // Adicionar dados na ordem específica
    categoriaOrder.forEach(categoria => {
      const total = cargoCounts[categoria] || 0;
      summarySheet.getRange(currentRow, 1).setValue(categoria);
      summarySheet.getRange(currentRow, 2).setValue(total);
      currentRow++;
    });
    
    // Ajustar largura das colunas
    summarySheet.autoResizeColumns(1, 2);
    
    // Aplicar formatação
    const summaryDataRange = summarySheet.getRange(2, 1, categoriaOrder.length, 2);
    summaryDataRange.setBorder(true, true, true, true, true, true);
    
    // Alinhar números à direita
    summarySheet.getRange(2, 2, categoriaOrder.length, 1).setHorizontalAlignment('right');
    
    console.log('✅ Resumo gerado com sucesso');
    
    return {
      success: true,
      message: 'Resumo gerado com sucesso',
      totalCategories: categoriaOrder.length,
      totalRecords: dataValues.length
    };
    
  } catch (error) {
    console.error('Erro ao gerar resumo:', error);
    throw new Error(`Erro ao gerar resumo: ${error.toString()}`);
  }
}

// ========================================
// FUNÇÃO PARA OBTER DADOS DO RESUMO
// ========================================
function getSummaryData() {
  try {
    console.log('=== OBTENDO DADOS DO RESUMO ===');
    
    // Abrir a planilha
    const spreadsheet = SpreadsheetApp.openById(SHEET_ID);
    
    // Obter dados da aba "Dados"
    const dataSheet = spreadsheet.getSheetByName('Dados');
    if (!dataSheet) {
      throw new Error('Aba "Dados" não encontrada');
    }
    
    // Obter todos os dados (exceto cabeçalho)
    const lastRow = dataSheet.getLastRow();
    if (lastRow <= 1) {
      console.log('⚠️ Nenhum dado encontrado - retornando zeros');
      return {
        success: true,
        data: {
          totalParticipants: 0,
          onlineCount: 0,
          offlineCount: 0,
          brothersCount: 0,
          sistersCount: 0,
          musiciansCount: 0,
          organistsCount: 0,
          ancioesCount: 0,
          diaconosCount: 0,
          cooperadoresOficioCount: 0,
          cooperadoresJovensCount: 0,
          encarregadosLocaisCount: 0,
          encarregadosRegionaisCount: 0,
          examinadorasCount: 0,
          auxiliaresAdminCount: 0,
          secretariosAdminCount: 0,
          secretariosMusicaCount: 0,
          titularAdminCount: 0
        }
      };
    }
    
    const dataRange = dataSheet.getRange(2, 1, lastRow - 1, 4);
    const dataValues = dataRange.getValues();
    
    console.log('Dados obtidos:', dataValues.length, 'registros');
    
    // Calcular estatísticas
    const cargoStats = {};
    const ministryStats = {};
    const adminStats = {};
    let totalParticipants = dataValues.length;
    let onlineCount = 0; // Assumindo que todos estão "online" quando salvos na planilha
    let offlineCount = 0;
    
    dataValues.forEach((row, index) => {
      const cargo = (row[1] || '').toString().trim();
      const ministerio = (row[2] || '').toString().trim();
      const administracao = (row[3] || '').toString().trim();
      
      console.log(`Linha ${index + 2}: Cargo="${cargo}", Ministério="${ministerio}", Administração="${administracao}"`);
      
      // Determinar categoria final baseada no cargo e campos adicionais
      let categoriaFinal = '';
      
      if (cargo === 'Ministério' && ministerio) {
        // Para ministério, usar o valor do campo ministério
        categoriaFinal = ministerio;
        console.log(`  → Ministério detectado: "${ministerio}"`);
      } else if (cargo === 'Administração' && administracao) {
        // Para administração, usar o valor do campo administração
        categoriaFinal = administracao;
        console.log(`  → Administração detectada: "${administracao}"`);
      } else if (cargo) {
        // Para outros cargos, usar o cargo diretamente
        categoriaFinal = cargo;
        console.log(`  → Cargo direto: "${cargo}"`);
      }
      
      // Contar apenas uma vez por registro na categoria final
      if (categoriaFinal) {
        cargoStats[categoriaFinal] = (cargoStats[categoriaFinal] || 0) + 1;
        console.log(`  ✅ Categoria final: "${categoriaFinal}" - Total: ${cargoStats[categoriaFinal]}`);
      } else {
        console.log(`  ⚠️ Linha ${index + 2} sem categoria válida - ignorada`);
      }
    });
    
    // Log de debug - mostrar todas as categorias contadas
    console.log('📊 Todas as categorias contadas:', cargoStats);
    console.log('📊 Estatísticas por ministério:', ministryStats);
    console.log('📊 Estatísticas por administração:', adminStats);
    
    // Log detalhado de todas as categorias encontradas
    console.log('📋 RESUMO DETALHADO DE TODAS AS CATEGORIAS:');
    Object.keys(cargoStats).sort().forEach(categoria => {
      console.log(`  ${categoria}: ${cargoStats[categoria]}`);
    });
    
    // Calcular estatísticas específicas para o resumo - ORDEM DO RELATÓRIO
    const summaryData = {
      totalParticipants: totalParticipants,
      onlineCount: onlineCount,
      offlineCount: offlineCount,
      
      // MINISTÉRIO (ordem do relatório)
      ancioesCount: cargoStats['Ancião'] || 0,
      diaconosCount: cargoStats['Diácono'] || 0,
      cooperadoresOficioCount: cargoStats['Cooperador do Ofício'] || 0,
      cooperadoresJovensCount: cargoStats['Cooperador de Jovens'] || 0,
      encarregadosRegionaisCount: cargoStats['Encarregado Regional'] || 0,
      encarregadosLocaisCount: cargoStats['Encarregado Local'] || 0,
      examinadorasCount: cargoStats['Examinadora'] || 0,
      
      // ADMINISTRAÇÃO (ordem do relatório)
      secretariosMusicaCount: cargoStats['Secretário da Música'] || 0,
      secretariosAdminCount: cargoStats['Secretário da Administração'] || 0,
      titularAdminCount: cargoStats['Titular da Administração'] || 0,
      auxiliaresAdminCount: cargoStats['Auxiliar da Administração'] || 0,
      
      // MÚSICOS (ordem do relatório)
      musiciansCount: cargoStats['Músico'] || 0,
      organistsCount: cargoStats['Organista'] || 0,
      
      // IRMÃOS/IRMÃS (ordem do relatório)
      brothersCount: cargoStats['Irmão'] || 0,
      sistersCount: cargoStats['Irmã'] || 0
    };
    
    console.log('✅ Dados do resumo calculados:', summaryData);
    
    return {
      success: true,
      data: summaryData
    };
    
  } catch (error) {
    console.error('Erro ao obter dados do resumo:', error);
    return {
      success: false,
      error: error.toString()
    };
  }
}

// ========================================
// FUNÇÃO PARA VERIFICAR E CORRIGIR ABAS
// ========================================
function verificarAbas() {
  try {
    console.log('=== VERIFICANDO ABAS DA PLANILHA ===');
    
    const spreadsheet = SpreadsheetApp.openById(SHEET_ID);
    const sheets = spreadsheet.getSheets();
    
    console.log('Abas encontradas:');
    sheets.forEach((sheet, index) => {
      console.log(`${index + 1}. "${sheet.getName()}"`);
    });
    
    // Verificar se a aba "Dados" existe
    const dadosSheet = spreadsheet.getSheetByName('Dados');
    if (!dadosSheet) {
      console.log('❌ Aba "Dados" não encontrada - criando...');
      const newSheet = spreadsheet.insertSheet('Dados');
      
      // Adicionar cabeçalhos
      const headers = ['Timestamp', 'Cargo', 'Ministério', 'Administração'];
      newSheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      newSheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
      console.log('✅ Aba "Dados" criada com cabeçalhos');
    } else {
      console.log('✅ Aba "Dados" encontrada');
    }
    
    // REMOVER abas incorretas automaticamente
    const participantesSheet = spreadsheet.getSheetByName('Participantes');
    if (participantesSheet) {
      console.log('🗑️ Removendo aba incorreta "Participantes"...');
      spreadsheet.deleteSheet(participantesSheet);
      console.log('✅ Aba "Participantes" removida');
    }
    
    const logSheet = spreadsheet.getSheetByName('Log');
    if (logSheet) {
      console.log('🗑️ Removendo aba incorreta "Log"...');
      spreadsheet.deleteSheet(logSheet);
      console.log('✅ Aba "Log" removida');
    }
    
    // Garantir que a aba "Dados" é a primeira (ativa)
    if (dadosSheet) {
      spreadsheet.setActiveSheet(dadosSheet);
      console.log('✅ Aba "Dados" definida como ativa');
    }
    
    return {
      success: true,
      message: 'Verificação de abas concluída',
      sheets: sheets.map(sheet => sheet.getName())
    };
    
  } catch (error) {
    console.error('Erro ao verificar abas:', error);
    throw error;
  }
}

// ========================================
// FUNÇÃO PARA CORRIGIR ABAS AUTOMATICAMENTE
// ========================================
function corrigirAbas() {
  try {
    console.log('=== CORRIGINDO ABAS AUTOMATICAMENTE ===');
    
    const spreadsheet = SpreadsheetApp.openById(SHEET_ID);
    
    // FORÇAR criação da aba "Dados"
    let dadosSheet = spreadsheet.getSheetByName('Dados');
    if (!dadosSheet) {
      console.log('❌ Aba "Dados" não encontrada - criando...');
      dadosSheet = spreadsheet.insertSheet('Dados');
      
      // Adicionar cabeçalhos
      const headers = ['Timestamp', 'Cargo', 'Ministério', 'Administração'];
      dadosSheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      dadosSheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
      console.log('✅ Aba "Dados" criada com cabeçalhos');
    }
    
    // REMOVER todas as abas incorretas
    const sheets = spreadsheet.getSheets();
    sheets.forEach(sheet => {
      const sheetName = sheet.getName();
      if (sheetName === 'Participantes' || sheetName === 'Log') {
        console.log(`🗑️ Removendo aba incorreta "${sheetName}"...`);
        spreadsheet.deleteSheet(sheet);
        console.log(`✅ Aba "${sheetName}" removida`);
      }
    });
    
    // Garantir que "Dados" é a aba ativa
    spreadsheet.setActiveSheet(dadosSheet);
    
    return {
      success: true,
      message: 'Abas corrigidas automaticamente',
      activeSheet: dadosSheet.getName()
    };
    
  } catch (error) {
    console.error('Erro ao corrigir abas:', error);
    return {
      success: false,
      error: error.toString()
    };
  }
}

// ========================================
// FUNÇÃO PARA LIMPAR DADOS DE TESTE
// ========================================
function clearTestData() {
  try {
    const spreadsheet = SpreadsheetApp.openById(SHEET_ID);
    let sheet = spreadsheet.getSheetByName(SHEET_NAME);
    
    if (sheet) {
      // Manter apenas os cabeçalhos
      const lastRow = sheet.getLastRow();
      if (lastRow > 1) {
        sheet.getRange(2, 1, lastRow - 1, 4).clear();
        console.log('Dados de teste limpos');
      }
    }
    
    return { success: true, message: 'Dados de teste limpos' };
  } catch (error) {
    console.error('Erro ao limpar dados:', error);
    throw error;
  }
}

// ========================================
// FUNÇÃO PARA MOSTRAR TODAS AS CATEGORIAS
// ========================================
function showAllCategories() {
  console.log('=== MOSTRANDO TODAS AS CATEGORIAS ===');
  
  try {
    const result = getSummaryData();
    
    if (result.success && result.data) {
      console.log('📊 RESUMO COMPLETO DE TODAS AS CATEGORIAS:');
      console.log(`Total de Participantes: ${result.data.totalParticipants}`);
      console.log('');
      console.log('MINISTÉRIO:');
      console.log(`Anciães: ${result.data.ancioesCount}`);
      console.log(`Diáconos: ${result.data.diaconosCount}`);
      console.log(`Cooperadores do Ofício: ${result.data.cooperadoresOficioCount}`);
      console.log(`Cooperadores de Jovens: ${result.data.cooperadoresJovensCount}`);
      console.log(`Encarregados Regionais: ${result.data.encarregadosRegionaisCount}`);
      console.log(`Encarregados Locais: ${result.data.encarregadosLocaisCount}`);
      console.log(`Examinadoras: ${result.data.examinadorasCount}`);
      console.log('');
      console.log('ADMINISTRAÇÃO:');
      console.log(`Secretários da Música: ${result.data.secretariosMusicaCount}`);
      console.log(`Secretários da Administração: ${result.data.secretariosAdminCount}`);
      console.log(`Titular da Administração: ${result.data.titularAdminCount}`);
      console.log(`Auxiliares da Administração: ${result.data.auxiliaresAdminCount}`);
      console.log('');
      console.log('MÚSICOS:');
      console.log(`Músicos: ${result.data.musiciansCount}`);
      console.log(`Organistas: ${result.data.organistsCount}`);
      console.log('');
      console.log('IRMÃOS/IRMÃS:');
      console.log(`Irmãos: ${result.data.brothersCount}`);
      console.log(`Irmãs: ${result.data.sistersCount}`);
      
      // Mostrar notificação visual
      SpreadsheetApp.getUi().alert(
        '📊 Todas as Categorias',
        `RESUMO COMPLETO:\n\n` +
        `Total: ${result.data.totalParticipants}\n\n` +
        `MINISTÉRIO:\n` +
        `Anciães: ${result.data.ancioesCount}\n` +
        `Diáconos: ${result.data.diaconosCount}\n` +
        `Cooperadores do Ofício: ${result.data.cooperadoresOficioCount}\n` +
        `Cooperadores de Jovens: ${result.data.cooperadoresJovensCount}\n` +
        `Encarregados Regionais: ${result.data.encarregadosRegionaisCount}\n` +
        `Encarregados Locais: ${result.data.encarregadosLocaisCount}\n` +
        `Examinadoras: ${result.data.examinadorasCount}\n\n` +
        `ADMINISTRAÇÃO:\n` +
        `Secretários da Música: ${result.data.secretariosMusicaCount}\n` +
        `Secretários da Administração: ${result.data.secretariosAdminCount}\n` +
        `Titular da Administração: ${result.data.titularAdminCount}\n` +
        `Auxiliares da Administração: ${result.data.auxiliaresAdminCount}\n\n` +
        `MÚSICOS:\n` +
        `Músicos: ${result.data.musiciansCount}\n` +
        `Organistas: ${result.data.organistsCount}\n\n` +
        `IRMÃOS/IRMÃS:\n` +
        `Irmãos: ${result.data.brothersCount}\n` +
        `Irmãs: ${result.data.sistersCount}`,
        SpreadsheetApp.getUi().ButtonSet.OK
      );
      
      return result;
    } else {
      throw new Error('Falha ao obter dados do resumo');
    }
    
  } catch (error) {
    console.error('❌ Erro ao mostrar categorias:', error);
    SpreadsheetApp.getUi().alert(
      '❌ Erro',
      `Erro ao mostrar categorias:\n\n${error.message}`,
      SpreadsheetApp.getUi().ButtonSet.OK
    );
    throw error;
  }
}

// ========================================
// FUNÇÃO DE TESTE PARA REQUISIÇÃO GET
// ========================================
function testGetRequest() {
  console.log('=== TESTANDO REQUISIÇÃO GET ===');
  
  try {
    // Simular uma requisição GET com action=getSummary
    const mockEvent = {
      parameter: {
        action: 'getSummary'
      }
    };
    
    console.log('📤 Simulando requisição GET com action=getSummary...');
    const result = doGet(mockEvent);
    
    console.log('✅ Resultado da requisição GET:', result.getContent());
    
    // Mostrar notificação visual
    SpreadsheetApp.getUi().alert(
      '✅ Teste de Requisição GET Concluído',
      `Resultado do teste:\n\n` +
      `Status: ${result.getContent()}\n\n` +
      `Verifique o console para mais detalhes.`,
      SpreadsheetApp.getUi().ButtonSet.OK
    );
    
    return result;
    
  } catch (error) {
    console.error('❌ Erro no teste de requisição GET:', error);
    
    // Mostrar notificação de erro
    SpreadsheetApp.getUi().alert(
      '❌ Erro no Teste de Requisição GET',
      `Erro durante o teste:\n\n${error.message}`,
      SpreadsheetApp.getUi().ButtonSet.OK
    );
    
    throw error;
  }
}

// ========================================
// FUNÇÃO DE TESTE PARA RESUMO
// ========================================
function testSummary() {
  console.log('=== TESTANDO FUNÇÃO DE RESUMO ===');
  
  try {
    const result = getSummaryData();
    console.log('✅ Resultado do teste:', result);
    
    // Mostrar notificação visual
    SpreadsheetApp.getUi().alert(
      '✅ Teste de Resumo Concluído',
      `Resultado do teste:\n\n` +
      `Success: ${result.success}\n` +
      `Total Participants: ${result.data ? result.data.totalParticipants : 'N/A'}\n\n` +
      `MINISTÉRIO:\n` +
      `Anciães: ${result.data ? result.data.ancioesCount : 'N/A'}\n` +
      `Diáconos: ${result.data ? result.data.diaconosCount : 'N/A'}\n` +
      `Cooperadores do Ofício: ${result.data ? result.data.cooperadoresOficioCount : 'N/A'}\n` +
      `Cooperadores de Jovens: ${result.data ? result.data.cooperadoresJovensCount : 'N/A'}\n` +
      `Encarregados Regionais: ${result.data ? result.data.encarregadosRegionaisCount : 'N/A'}\n` +
      `Encarregados Locais: ${result.data ? result.data.encarregadosLocaisCount : 'N/A'}\n` +
      `Examinadoras: ${result.data ? result.data.examinadorasCount : 'N/A'}\n\n` +
      `ADMINISTRAÇÃO:\n` +
      `Secretários da Música: ${result.data ? result.data.secretariosMusicaCount : 'N/A'}\n` +
      `Secretários da Administração: ${result.data ? result.data.secretariosAdminCount : 'N/A'}\n` +
      `Titular da Administração: ${result.data ? result.data.titularAdminCount : 'N/A'}\n` +
      `Auxiliares da Administração: ${result.data ? result.data.auxiliaresAdminCount : 'N/A'}\n\n` +
      `MÚSICOS:\n` +
      `Músicos: ${result.data ? result.data.musiciansCount : 'N/A'}\n` +
      `Organistas: ${result.data ? result.data.organistsCount : 'N/A'}\n\n` +
      `IRMÃOS/IRMÃS:\n` +
      `Irmãos: ${result.data ? result.data.brothersCount : 'N/A'}\n` +
      `Irmãs: ${result.data ? result.data.sistersCount : 'N/A'}\n\n` +
      `Verifique o console para mais detalhes.`,
      SpreadsheetApp.getUi().ButtonSet.OK
    );
    
    return result;
    
  } catch (error) {
    console.error('❌ Erro no teste:', error);
    
    // Mostrar notificação de erro
    SpreadsheetApp.getUi().alert(
      '❌ Erro no Teste',
      `Erro durante o teste:\n\n${error.message}`,
      SpreadsheetApp.getUi().ButtonSet.OK
    );
    
    throw error;
  }
}

// ========================================
// FUNÇÕES DE MENU E ATUALIZAÇÃO AUTOMÁTICA
// ========================================

// Função executada automaticamente quando um formulário é submetido
function onFormSubmit(e) {
  console.log('📝 Formulário submetido, atualizando resumo...');
  atualizarResumo();
}

// Função executada quando a planilha é aberta - cria menu personalizado
function onOpen() {
  console.log('📊 Planilha aberta, criando menu personalizado...');
  
  try {
    SpreadsheetApp.getUi()
      .createMenu('🔄 Resumo')
      .addItem('📊 Atualizar Resumo', 'atualizarAgora')
      .addItem('🧪 Testar Resumo', 'testSummary')
      .addItem('📋 Mostrar Todas as Categorias', 'showAllCategories')
      .addItem('🌐 Testar Requisição GET', 'testGetRequest')
      .addSeparator()
      .addItem('🔍 Verificar Abas', 'verificarAbas')
      .addItem('🔧 Corrigir Abas', 'corrigirAbas')
      .addSeparator()
      .addItem('🕐 Verificar Timestamps ISO', 'verificarTimestampsISO')
      .addItem('🔄 Converter Timestamps ISO', 'converterTimestampsISO')
      .addToUi();
    
    console.log('✅ Menu personalizado criado com sucesso');
  } catch (error) {
    console.error('❌ Erro ao criar menu:', error);
  }
}

// Função para atualizar resumo imediatamente (chamada pelo menu)
function atualizarAgora() {
  console.log('🔄 Atualizando resumo via menu...');
  
  try {
    const result = generateSummaryByCargo();
    
    // Mostrar notificação de sucesso
    SpreadsheetApp.getUi().alert(
      '✅ Resumo Atualizado!',
      `Resumo atualizado com sucesso!\n\n` +
      `Total de registros processados: ${result.totalRecords}\n` +
      `Categorias criadas: ${result.totalCategories}`,
      SpreadsheetApp.getUi().ButtonSet.OK
    );
    
    console.log('✅ Resumo atualizado via menu:', result);
    return result;
    
  } catch (error) {
    console.error('❌ Erro ao atualizar resumo via menu:', error);
    
    // Mostrar notificação de erro
    SpreadsheetApp.getUi().alert(
      '❌ Erro ao Atualizar',
      `Erro ao atualizar resumo:\n\n${error.message}`,
      SpreadsheetApp.getUi().ButtonSet.OK
    );
    
    throw error;
  }
}

// Função para atualizar resumo (usada internamente)
function atualizarResumo() {
  console.log('🔄 Atualizando resumo automaticamente...');
  
  try {
    const result = generateSummaryByCargo();
    console.log('✅ Resumo atualizado automaticamente:', result);
    return result;
  } catch (error) {
    console.error('❌ Erro ao atualizar resumo automaticamente:', error);
    // Não mostrar alerta para atualizações automáticas
    return null;
  }
}
