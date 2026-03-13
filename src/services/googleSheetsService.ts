import { RegistroPresenca } from '../types/models';
import { supabaseDataService } from './supabaseDataService';
import { getNaipeByInstrumento } from '../utils/instrumentNaipe';
import {
  normalizarRegistroCargoFeminino,
  isCargoFemininoOrganista,
} from '../utils/normalizeCargoFeminino';
import { formatRegistradoPor } from '../utils/userNameUtils';
import { uuidv4 } from '../utils/uuid';
import { normalizarNivel } from '../utils/normalizeNivel';
import { formatDateTimeManual, formatTime } from '../utils/dateUtils';
import { supabase } from './supabaseClient';
import { sanitizeInput, sanitizeForLogging, FIELD_LIMITS } from '../utils/securityUtils';
import { env } from '../config/env';

// URL do Google Apps Script (do backupcont/config-deploy.js)
// 🚨 ATENÇÃO: Verificando se há espaços ou quebras de linha na URL
const GOOGLE_SHEETS_API_URL = (
  env.SHEETS_ENDPOINT_URL ||
  'https://script.google.com/macros/s/AKfycbxPtvi86jPy7y41neTpIPvn3hpycd3cMjbgjgifzLD6qRwrJVPlF9EDulaQp42nma-i/exec'
).trim();
const SHEET_NAME = 'Dados';

export interface SheetsResponse {
  success: boolean;
  message?: string;
}

// 🚨 FUNÇÃO AUXILIAR: Converter ID de local para nome (usado em ambos os fluxos)
function converterLocalEnsaioIdParaNome(localEnsaio: string | null | undefined): string {
  if (!localEnsaio) {
    return 'Não definido';
  }

  // Se já é um nome (não é apenas número), retornar como está
  if (!/^\d+$/.test(localEnsaio.trim())) {
    return localEnsaio.trim();
  }

  // Se é um número (ID), converter para nome
  const locais: { id: string; nome: string }[] = [
    { id: '1', nome: 'Cotia' },
    { id: '2', nome: 'Caucaia do Alto' },
    { id: '3', nome: 'Fazendinha' },
    { id: '4', nome: 'Itapevi' },
    { id: '5', nome: 'Jandira' },
    { id: '6', nome: 'Pirapora' },
    { id: '7', nome: 'Vargem Grande' },
  ];

  const localEncontrado = locais.find(l => l.id === localEnsaio.trim());
  return localEncontrado?.nome || localEnsaio;
}

/**
 * 🚨 FUNÇÃO AUXILIAR: Limpa prefixos internos dos nomes de comum
 * Remove "manual_", "comum_fora_", "external_" etc.
 */
function limparPrefixoComum(comum: string): string {
  if (!comum) return '';
  
  // 1. Se tem pipes (formato novo), extrair a parte original ou o nome
  if (comum.includes('|')) {
    const partes = comum.split('|');
    // No formato comum_fora_identificador|cidade|nome_original
    if (partes.length >= 3 && partes[2]) {
      return partes[2].trim(); 
    }
    // No formato manual_Nome|Cidade
    if (partes.length >= 2) {
      return partes[0].replace(/^(manual_|external_|comum_fora_)+/gi, '').replace(/[-_]\d+$/, '').replace(/_/g, ' ').trim();
    }
  }
  
  // 2. Remover prefixos repetidos de manual_, external_ e comum_fora_
  // 🚨 CORREÇÃO: Remover explicitamente o índice numérico (ex: comum_fora_162_)
  let limpo = comum.replace(/^(manual_|external_|comum_fora_)+/gi, '');
  
  // Remover qualquer número seguido de underscore no início (índice da lista)
  limpo = limpo.replace(/^\d+_/g, '');
  
  // 3. Remover sufixos de ID numérico se existirem (ex: _18 ou -18 no final)
  // Fazemos isso ANTES de trocar underscores por espaços
  limpo = limpo.replace(/[-_]\d+$/, '');

  // 4. Trocar underscores por espaços (caso tenha vindo de um ID)
  limpo = limpo.replace(/_/g, ' ');

  return limpo.trim();
}

export const googleSheetsService = {
  // 🚨 FUNÇÃO ESPECÍFICA PARA REGISTROS EXTERNOS (MODAL DE NOVO REGISTRO)
  // Envia diretamente para Google Sheets sem validar contra listas locais
  async sendExternalRegistroToSheet(data: {
    nome: string;
    comum: string;
    cidade: string;
    cargo: string;
    instrumento?: string;
    classe?: string;
    localEnsaio: string;
    registradoPor: string;
    userId?: string;
  }): Promise<{ success: boolean; error?: string; uuid?: string }> {
    console.log('🚀 [EXTERNAL] ========== INÍCIO sendExternalRegistroToSheet ==========');
    console.log('🚀 [EXTERNAL] sendExternalRegistroToSheet chamado');
    console.log('📋 [EXTERNAL] Dados recebidos:', JSON.stringify(data, null, 2));
    console.log('📋 [EXTERNAL] Cargo recebido:', data.cargo);
    console.log('📋 [EXTERNAL] Instrumento recebido:', data.instrumento || '(não fornecido)');
    console.log('📋 [EXTERNAL] Classe recebida:', data.classe || '(não fornecido)');
    console.log('📋 [EXTERNAL] Nome:', data.nome);
    console.log('📋 [EXTERNAL] Comum:', data.comum);
    console.log('📋 [EXTERNAL] Cidade:', data.cidade);
    console.log('📋 [EXTERNAL] Local Ensaio:', data.localEnsaio);

    try {
      console.log('📤 [EXTERNAL] Iniciando processamento dos dados...');
      console.log('📤 [EXTERNAL] Enviando registro externo diretamente para Google Sheets');

      // 🚨 CORREÇÃO: Usar UUID v4 válido (igual sistema normal), não external_
      const uuid = uuidv4();

      // 🚨 CORREÇÃO CRÍTICA: Determinar instrumento e naipe baseado no cargo (igual backupcont)
      // Cargos relacionados a organistas (Examinadora, Instrutora, Organista, Secretária da Música)
      // sempre devem ter instrumento "ÓRGÃO" e naipe "TECLADO", independente de ter classe ou não
      // 🚨 IMPORTANTE: "Instrutor" (masculino) é classe de músicos, NÃO organista
      // Apenas "Instrutora" (feminino) é organista
      const cargoUpper = data.cargo.trim().toUpperCase();
      console.log('🔍 [EXTERNAL] Verificando cargo:', cargoUpper);

      const isOrganista = cargoUpper === 'ORGANISTA';
      const isExaminadora = cargoUpper === 'EXAMINADORA';
      const isInstrutora = cargoUpper === 'INSTRUTORA'; // 🚨 Apenas feminino (Instrutora), NÃO Instrutor
      const isSecretariaMusica =
        (cargoUpper.includes('SECRETÁRI') || cargoUpper.includes('SECRETARI')) &&
        (cargoUpper.includes('MÚSICA') || cargoUpper.includes('MUSICA'));
      const isOrganistaOuRelacionado =
        isOrganista || isExaminadora || isInstrutora || isSecretariaMusica;

      console.log('🔍 [EXTERNAL] Verificações de cargo:');
      console.log('  - isOrganista:', isOrganista);
      console.log('  - isExaminadora:', isExaminadora);
      console.log('  - isInstrutora:', isInstrutora);
      console.log('  - isSecretariaMusica:', isSecretariaMusica);
      console.log('  - isOrganistaOuRelacionado:', isOrganistaOuRelacionado);

      let instrumentoFinal = '';
      let naipeFinal = '';

      if (isOrganistaOuRelacionado) {
        // 🚨 CRÍTICO: Cargos relacionados a organistas sempre têm instrumento "ÓRGÃO"
        instrumentoFinal = 'ÓRGÃO';
        naipeFinal = 'TECLADO';
        console.log(
          '✅ [EXTERNAL] Cargo relacionado a organista detectado - definindo instrumento como ÓRGÃO'
        );
      } else if (data.instrumento) {
        // Para outros cargos (ex: Músico), usar o instrumento fornecido
        instrumentoFinal = data.instrumento.toUpperCase();
        naipeFinal = getNaipeByInstrumento(data.instrumento).toUpperCase();
        console.log('✅ [EXTERNAL] Usando instrumento fornecido:', instrumentoFinal);
      } else {
        console.log(
          'ℹ️ [EXTERNAL] Cargo sem instrumento (ex: Encarregado Local, Ancião) - deixando vazio'
        );
      }
      // Se não é organista/relacionado e não tem instrumento, deixa vazio (ex: Encarregado Local, Ancião)

      // 🚨 CRÍTICO: Converter local de ensaio ANTES de criar sheetRow
      const localEnsaioConvertido = converterLocalEnsaioIdParaNome(data.localEnsaio);
      console.log('🔄 [EXTERNAL] Local de ensaio original:', data.localEnsaio);
      console.log('🔄 [EXTERNAL] Local de ensaio convertido:', localEnsaioConvertido);

      // 🚨 CRÍTICO: Garantir que TODOS os cargos sejam enviados, sem validação especial
      // Músico, Organista, Examinadora, Instrutor, Encarregado Local, etc. - todos devem funcionar igual
      console.log('📋 [EXTERNAL] Preparando dados para envio - TODOS os cargos são aceitos');
      console.log('📋 [EXTERNAL] Cargo que será enviado:', data.cargo.trim().toUpperCase());
      console.log(
        '📋 [EXTERNAL] Instrumento final:',
        instrumentoFinal || '(vazio - OK para cargos sem instrumento)'
      );
      console.log(
        '📋 [EXTERNAL] Naipe final:',
        naipeFinal || '(vazio - OK para cargos sem instrumento)'
      );

      // 🛡️ SEGURANÇA: Sanitizar todos os inputs antes de enviar
      // 🚨 CORREÇÃO: Limpar prefixos internos do nome da comum (ex: "manual_")
      const comumLimpa = limparPrefixoComum(data.comum);
      
      const nomeSanitizado = sanitizeInput(data.nome.trim(), {
        fieldType: 'nome',
        maxLength: FIELD_LIMITS.nome,
      });
      const comumSanitizado = sanitizeInput(comumLimpa, {
        fieldType: 'comum',
        maxLength: FIELD_LIMITS.comum,
      });
      const cidadeSanitizada = sanitizeInput(data.cidade.trim(), {
        fieldType: 'cidade',
        maxLength: FIELD_LIMITS.cidade,
      });
      const cargoSanitizado = sanitizeInput(data.cargo.trim(), {
        fieldType: 'cargo',
        maxLength: FIELD_LIMITS.cargo,
      });
      // 🚨 CORREÇÃO: Forçar "OFICIALIZADA" apenas para Instrutora/Examinadora/Secretária. 
      // Para o cargo "Organista", respeitar o que veio do formulário (sem forçar se estiver vazio).
      const isForcedOficializada = isExaminadora || isInstrutora || isSecretariaMusica;
      const classeSanitizada = (data.classe || (isForcedOficializada ? 'OFICIALIZADA' : ''))
        ? sanitizeInput((data.classe || (isForcedOficializada ? 'OFICIALIZADA' : '')).trim(), { fieldType: 'classe', maxLength: FIELD_LIMITS.classe })
        : '';
      const localEnsaioSanitizado = sanitizeInput(localEnsaioConvertido, { maxLength: 100 });

      // Formato esperado pelo Google Apps Script (igual ao backupcont)
      const sheetRow = {
        UUID: uuid,
        'NOME COMPLETO': nomeSanitizado.toUpperCase(),
        COMUM: comumSanitizado.toUpperCase(),
        CIDADE: cidadeSanitizada.toUpperCase(),
        CARGO: cargoSanitizado.toUpperCase(),
        INSTRUMENTO: instrumentoFinal,
        NAIPE_INSTRUMENTO: naipeFinal,
        CLASSE_ORGANISTA: classeSanitizada.toUpperCase(),
        LOCAL_ENSAIO: localEnsaioSanitizado.toUpperCase(),
        DATA_ENSAIO: (() => {
          try {
            if (formatDateTimeManual && typeof formatDateTimeManual === 'function') {
              return formatDateTimeManual();
            } else {
              const dataObj = new Date();
              const dia = String(dataObj.getDate()).padStart(2, '0');
              const mes = String(dataObj.getMonth() + 1).padStart(2, '0');
              const ano = dataObj.getFullYear();
              const horas = String(dataObj.getHours()).padStart(2, '0');
              const minutos = String(dataObj.getMinutes()).padStart(2, '0');
              return `${dia}/${mes}/${ano} ${horas}:${minutos}`;
            }
          } catch (error) {
            const dataObj = new Date();
            const dia = String(dataObj.getDate()).padStart(2, '0');
            const mes = String(dataObj.getMonth() + 1).padStart(2, '0');
            const ano = dataObj.getFullYear();
            const horas = String(dataObj.getHours()).padStart(2, '0');
            const minutos = String(dataObj.getMinutes()).padStart(2, '0');
            return `${dia}/${mes}/${ano} ${horas}:${minutos}`;
          }
        })(),
        REGISTRADO_POR: data.registradoPor.toUpperCase(),
        SYNC_STATUS: 'ATUALIZADO',
        SYNCED_AT: new Date().toISOString(),
        ANOTACOES: 'Cadastro fora da Regional',
        DUPLICATA: 'NÃO',
        NÍVEL: classeSanitizada.toUpperCase(), // Para externos, NÍVEL = Classe
      };

      // 🛡️ SEGURANÇA: Log sanitizado (sem dados sensíveis)
      const logData = sanitizeForLogging({
        uuid,
        nome: sheetRow['NOME COMPLETO'],
        comum: sheetRow.COMUM,
        cidade: sheetRow.CIDADE,
        cargo: sheetRow.CARGO,
        instrumento: sheetRow.INSTRUMENTO || '(vazio)',
        naipe: sheetRow.NAIPE_INSTRUMENTO || '(vazio)',
        classe: sheetRow.CLASSE_ORGANISTA || '(vazio)',
        localEnsaio: sheetRow.LOCAL_ENSAIO,
        dataEnsaio: sheetRow.DATA_ENSAIO,
        registradoPor: sheetRow.REGISTRADO_POR,
        anotacoes: sheetRow.ANOTACOES,
        syncStatus: sheetRow.SYNC_STATUS,
      });
      console.log('📤 [EXTERNAL] ========== DADOS FINAIS PARA ENVIO ==========');
      console.log('📤 [EXTERNAL] Dados sanitizados:', logData);
      console.log('📤 [EXTERNAL] URL da API:', GOOGLE_SHEETS_API_URL);
      console.log('📤 [EXTERNAL] Nome da planilha:', SHEET_NAME);
      console.log('📤 [EXTERNAL] ============================================');

      // 🚨 CORREÇÃO CRÍTICA: Não usar AbortController com no-cors
      // O backupcont não usa timeout explícito no fetch do modal
      // Vamos usar Promise.race para timeout sem AbortController
      const requestBody = JSON.stringify({
        op: 'append',
        sheet: SHEET_NAME,
        data: sheetRow,
      });

      console.log('📤 [EXTERNAL] Corpo da requisição:', requestBody);
      console.log('🌐 [EXTERNAL] Fazendo fetch para:', GOOGLE_SHEETS_API_URL);

      try {
        // 🚨 CRÍTICO: Usar mesmo formato do backupcont (text/plain, sem mode explícito, sem signal)
        // Promise.race para timeout sem usar AbortController (compatível com no-cors)
        console.log('🌐 [EXTERNAL] Iniciando fetch...');
        const fetchPromise = fetch(GOOGLE_SHEETS_API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'text/plain;charset=utf-8',
          },
          body: requestBody,
        });

        // 🚨 CORREÇÃO: Aumentado o timeout de 8s para 30s pois o Google Apps Script
        // costuma demorar mais em locais de baixa conexão, e matar a conexão leva a recadastro duplo.
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('Timeout')), 30000);
        });

        console.log('⏱️ [EXTERNAL] Aguardando resposta (timeout: 16s)...');
        const response = (await Promise.race([fetchPromise, timeoutPromise])) as Response;

        console.log('📥 [EXTERNAL] Resposta recebida!');
        console.log('📥 [EXTERNAL] Status da resposta:', response.status);
        console.log('📥 [EXTERNAL] Tipo da resposta:', response.type);
        console.log('📥 [EXTERNAL] Response OK:', response.ok);
        console.log('📥 [EXTERNAL] Response headers:', response.headers);

        // 🚨 CORREÇÃO CRÍTICA: Ler o corpo da resposta ANTES de verificar response.ok
        // Isso permite verificar se há erros silenciosos mesmo com status OK
        // Usar clone() para não consumir o stream original
        let responseBody = '';
        try {
          const responseClone = response.clone();
          responseBody = await responseClone.text();
          console.log('📥 [EXTERNAL] Corpo da resposta:', responseBody);
          console.log('📥 [EXTERNAL] Tamanho da resposta:', responseBody.length);
        } catch (readBodyError) {
          console.warn('⚠️ [EXTERNAL] Não foi possível ler corpo da resposta:', readBodyError);
        }

        // 🚨 CORREÇÃO CRÍTICA: Tentar parsear JSON da resposta para verificar se ok: false
        // O Google Apps Script retorna JSON com { ok: false, error: '...' } quando há erro
        let responseJson: any = null;
        if (responseBody) {
          try {
            responseJson = JSON.parse(responseBody);
            console.log('📥 [EXTERNAL] Resposta parseada como JSON:', responseJson);
            console.log('📥 [EXTERNAL] responseJson.ok:', responseJson?.ok);
            console.log('📥 [EXTERNAL] responseJson.op:', responseJson?.op);
            console.log('📥 [EXTERNAL] responseJson.inserted:', responseJson?.inserted);
            console.log('📥 [EXTERNAL] responseJson.error:', responseJson?.error);

            // 🚨 CRÍTICO: Se o JSON tem ok: false, é um erro mesmo com status HTTP OK
            if (responseJson && responseJson.ok === false) {
              const errorMsg = responseJson.error || 'Erro desconhecido do Google Apps Script';
              console.error('❌ [EXTERNAL] Google Apps Script retornou ok: false');
              console.error('❌ [EXTERNAL] Erro:', errorMsg);
              console.error('❌ [EXTERNAL] Cargo que causou erro:', sheetRow.CARGO);
              console.error('❌ [EXTERNAL] Nome que causou erro:', sheetRow['NOME COMPLETO']);
              console.error(
                '❌ [EXTERNAL] Dados completos que causaram erro:',
                JSON.stringify(sheetRow, null, 2)
              );
              throw new Error(errorMsg);
            }
          } catch (parseError) {
            // Se não é JSON válido, continuar com verificação de texto
            console.log('📥 [EXTERNAL] Resposta não é JSON válido, verificando como texto');
            console.log('📥 [EXTERNAL] Parse error:', parseError);
          }
        }

        // 🚨 CORREÇÃO CRÍTICA: Verificar response.ok PRIMEIRO (igual backupcont)
        // O backupcont só verifica response.ok, não verifica response.type
        if (response.ok) {
          // 🚨 VERIFICAÇÃO ADICIONAL: Verificar se a resposta contém erro (se não foi JSON)
          // Mesmo com status OK, o Google Apps Script pode retornar erro no corpo
          if (
            responseBody &&
            !responseJson &&
            (responseBody.toLowerCase().includes('error') ||
              responseBody.toLowerCase().includes('erro') ||
              responseBody.toLowerCase().includes('falha') ||
              responseBody.toLowerCase().includes('rejeitado') ||
              responseBody.toLowerCase().includes('invalid') ||
              responseBody.toLowerCase().includes('inválido') ||
              responseBody.toLowerCase().includes('rejected') ||
              responseBody.toLowerCase().includes('denied') ||
              responseBody.toLowerCase().includes('não reconhecida') ||
              responseBody.toLowerCase().includes('nao reconhecida'))
          ) {
            console.error('❌ [EXTERNAL] Resposta OK mas contém erro no corpo:', responseBody);
            console.error('❌ [EXTERNAL] Dados que causaram erro:', sheetRow);
            throw new Error(`Google Sheets retornou erro: ${responseBody}`);
          }

          // 🚨 VERIFICAÇÃO ADICIONAL: Verificar se a resposta está vazia ou muito curta
          // Pode indicar que o Google Apps Script não processou corretamente
          if (responseBody && responseBody.trim().length < 10) {
            console.warn(
              '⚠️ [EXTERNAL] Resposta muito curta, pode indicar problema:',
              responseBody
            );
          }

          // 🚨 VERIFICAÇÃO CRÍTICA: Se é JSON válido e ok: true, confirmar sucesso
          // Verificar se inserted é 1 para confirmar que realmente foi inserido
          if (responseJson && responseJson.ok === true) {
            const inserted = responseJson.inserted || 0;
            console.log('✅ [EXTERNAL] Google Sheets: Dados enviados com sucesso (JSON ok: true)');
            console.log('✅ [EXTERNAL] UUID retornado:', responseJson.uuid);
            console.log('✅ [EXTERNAL] Operação:', responseJson.op);
            console.log('✅ [EXTERNAL] Registros inseridos:', inserted);
            console.log('✅ [EXTERNAL] Cargo que foi salvo:', sheetRow.CARGO);
            console.log('✅ [EXTERNAL] Nome que foi salvo:', sheetRow['NOME COMPLETO']);
            if (inserted !== 1) {
              console.warn('⚠️ [EXTERNAL] ATENÇÃO: inserted não é 1, pode indicar problema');
            }
            return { success: true, uuid: responseJson.uuid };
          }

          // Se não é JSON válido mas status é OK, verificar indicadores de sucesso no texto
          if (
            responseBody &&
            (responseBody.includes('"ok":true') ||
              responseBody.includes('"inserted":1') ||
              (responseBody.includes('inserted') && responseBody.includes('1')))
          ) {
            console.log(
              '✅ [EXTERNAL] Google Sheets: Dados enviados com sucesso (indicadores no corpo)'
            );
            console.log('✅ [EXTERNAL] Cargo que foi salvo:', sheetRow.CARGO);
            return { success: true };
          }

          console.log('✅ [EXTERNAL] Google Sheets: Dados enviados com sucesso (status OK)');
          console.log(
            '✅ [EXTERNAL] Corpo da resposta confirmado:',
            responseBody.substring(0, 100)
          );
          console.log('✅ [EXTERNAL] Cargo que foi salvo:', sheetRow.CARGO);
          console.log('✅ [EXTERNAL] Nome que foi salvo:', sheetRow['NOME COMPLETO']);
          console.log('✅ [EXTERNAL] Retornando { success: true }');
          return { success: true };
        }

        // 🚨 CRÍTICO: Verificar se é erro antes de assumir sucesso em no-cors
        // Se responseBody contém erro, NÃO assumir sucesso mesmo em no-cors
        const temErroNoCorpo =
          responseBody &&
          (responseBody.toLowerCase().includes('error') ||
            responseBody.toLowerCase().includes('erro') ||
            responseBody.toLowerCase().includes('não reconhecida') ||
            responseBody.toLowerCase().includes('nao reconhecida') ||
            responseBody.toLowerCase().includes('operacao nao reconhecida') ||
            responseBody.toLowerCase().includes('operação não reconhecida') ||
            responseBody.toLowerCase().includes('operacao nao reconhecida') ||
            responseBody.toLowerCase().includes('operação não reconhecida'));

        if (temErroNoCorpo) {
          console.error(
            '❌ [EXTERNAL] Erro detectado no corpo da resposta (mesmo em no-cors):',
            responseBody
          );
          console.error('❌ [EXTERNAL] Cargo que causou erro:', sheetRow.CARGO);
          console.error('❌ [EXTERNAL] Nome que causou erro:', sheetRow['NOME COMPLETO']);
          throw new Error(`Google Sheets retornou erro: ${responseBody}`);
        }

        // 🚨 CRÍTICO: Se responseBody contém JSON válido com ok: false, é erro mesmo em no-cors
        if (responseJson && responseJson.ok === false) {
          const errorMsg = responseJson.error || 'Erro desconhecido do Google Apps Script';
          console.error(
            '❌ [EXTERNAL] Google Apps Script retornou ok: false (mesmo com status OK)'
          );
          console.error('❌ [EXTERNAL] Erro:', errorMsg);
          console.error('❌ [EXTERNAL] Cargo que causou erro:', sheetRow.CARGO);
          console.error('❌ [EXTERNAL] Nome que causou erro:', sheetRow['NOME COMPLETO']);
          throw new Error(errorMsg);
        }

        // Se a resposta é opaca (no-cors), também considera sucesso (fallback)
        // Isso é importante porque no-cors sempre retorna response.ok = false
        // MAS só assumir sucesso se não detectamos erro acima
        if (response.type === 'opaque') {
          console.log('✅ [EXTERNAL] Google Sheets: Dados enviados (no-cors - assumindo sucesso)');
          console.log(
            '⚠️ [EXTERNAL] ATENÇÃO: no-cors não permite verificar resposta, assumindo sucesso'
          );
          console.log('⚠️ [EXTERNAL] Cargo enviado:', sheetRow.CARGO);
          console.log('⚠️ [EXTERNAL] Se não aparecer na planilha, pode ser erro silencioso');
          return { success: true };
        }

        // Se status é 0, pode ser no-cors também
        if (response.status === 0) {
          console.log(
            '✅ [EXTERNAL] Google Sheets: Assumindo sucesso (status 0 - provável no-cors)'
          );
          console.log('⚠️ [EXTERNAL] ATENÇÃO: status 0 pode indicar no-cors, assumindo sucesso');
          console.log('⚠️ [EXTERNAL] Cargo enviado:', sheetRow.CARGO);
          console.log('⚠️ [EXTERNAL] Se não aparecer na planilha, pode ser erro silencioso');
          return { success: true };
        }

        // Se não está OK e não é opaque, tentar ler erro
        // 🚨 CORREÇÃO: Se já leu o corpo acima, usar ele. Senão, ler agora
        if (!responseBody) {
          try {
            responseBody = await response.text();
            console.error(
              '❌ [EXTERNAL] Erro HTTP ao enviar para Google Sheets:',
              response.status,
              responseBody
            );
          } catch (readError: any) {
            console.error('❌ [EXTERNAL] Erro ao ler resposta:', readError);
            // 🚨 CORREÇÃO: Se não conseguiu ler erro, mas response não está OK,
            // pode ser no-cors - assumir sucesso (igual backupcont faz)
            if ((response as any).type === 'opaque' || response.status === 0) {
              console.log('✅ [EXTERNAL] Google Sheets: Assumindo sucesso (no-cors ou status 0)');
              return { success: true };
            }
            throw new Error(`HTTP ${response.status}: Erro ao processar resposta`);
          }
        } else {
          // Já temos o corpo da resposta, apenas logar o erro
          console.error(
            '❌ [EXTERNAL] Erro HTTP ao enviar para Google Sheets:',
            response.status,
            responseBody
          );
        }

        // 🚨 CORREÇÃO CRÍTICA: Tentar parsear JSON do erro para obter mensagem mais clara
        let errorMessage = `HTTP ${response.status}: ${responseBody || 'Erro desconhecido'}`;
        if (responseBody) {
          try {
            const errorJson = JSON.parse(responseBody);
            if (errorJson && errorJson.error) {
              errorMessage = errorJson.error;
              console.error('❌ [EXTERNAL] Erro do Google Apps Script:', errorMessage);
            }
          } catch (parseError) {
            // Não é JSON, usar mensagem original
          }
        }

        // Se chegou aqui, response não está OK e temos o corpo da resposta
        throw new Error(errorMessage);
      } catch (fetchError: any) {
        // 🚨 CORREÇÃO: Verificar se é timeout
        if (fetchError.message === 'Timeout' || fetchError.name === 'AbortError') {
          console.error('❌ [EXTERNAL] Timeout ao enviar para Google Sheets');
          throw new Error('Timeout ao enviar registro. Tente novamente.');
        }

        // 🚨 CORREÇÃO CRÍTICA: Se for erro de rede, pode ser no-cors
        // Em no-cors, fetch pode falhar mas o envio pode ter funcionado
        // Retornar sucesso como fallback (igual backupcont faz)
        if (
          fetchError.message &&
          (fetchError.message.includes('Failed to fetch') ||
            fetchError.message.includes('NetworkError') ||
            fetchError.message.includes('Network request failed'))
        ) {
          console.warn(
            '⚠️ [EXTERNAL] Erro de rede detectado, mas pode ser no-cors - assumindo sucesso'
          );
          console.warn('⚠️ [EXTERNAL] Detalhes do erro:', fetchError.message);
          // Em no-cors, fetch pode falhar mas o envio pode ter funcionado
          // Retornar sucesso como fallback (igual backupcont faz)
          return { success: true };
        }

        console.error('❌ [EXTERNAL] Erro inesperado no fetch:', fetchError);
        throw fetchError;
      }
    } catch (error: any) {
      console.error('❌ [EXTERNAL] ========== ERRO CAPTURADO ==========');
      console.error('❌ [EXTERNAL] Tipo do erro:', error?.name || typeof error);
      console.error('❌ [EXTERNAL] Mensagem do erro:', error?.message);
      console.error('❌ [EXTERNAL] Stack do erro:', error?.stack);
      console.error('❌ [EXTERNAL] Cargo que causou erro:', data?.cargo);
      console.error('❌ [EXTERNAL] Nome que causou erro:', data?.nome);
      console.error(
        '❌ [EXTERNAL] Dados completos que causaram erro:',
        JSON.stringify(data, null, 2)
      );

      if (error.message === 'Timeout' || error.name === 'AbortError') {
        console.error('❌ [EXTERNAL] Erro de timeout');
        return { success: false, error: 'Timeout ao enviar registro. Tente novamente.' };
      }
      if (
        error.message &&
        (error.message.includes('Failed to fetch') ||
          error.message.includes('NetworkError') ||
          error.message.includes('Network request failed'))
      ) {
        console.warn(
          '⚠️ [EXTERNAL] Erro de rede detectado, mas pode ser no-cors - assumindo sucesso'
        );
        console.warn('⚠️ [EXTERNAL] Cargo:', data?.cargo);
        return { success: true };
      }

      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('❌ [EXTERNAL] Retornando erro:', errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      console.log('🏁 [EXTERNAL] ========== FIM sendExternalRegistroToSheet ==========');
    }
  },

  async sendRegistroToSheet(
    registro: RegistroPresenca
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // 🚀 OTIMIZAÇÃO: Buscar nomes a partir dos IDs (cache rápido)
      // Não recarregar se vazio - pode ser cache temporário, continuar mesmo assim
      const [comuns, cargos, instrumentos] = await Promise.all([
        supabaseDataService.getComunsFromLocal(),
        supabaseDataService.getCargosFromLocal(),
        supabaseDataService.getInstrumentosFromLocal(),
      ]);

      // Verificar se é registro externo (do modal de novo registro)
      const isExternalRegistro = registro.comum_id.startsWith('external_');

      // 🚨 CORREÇÃO: Verificar se é nome manual de uma comum da regional (não do modal)
      // Nomes manuais de comuns da regional indicam que o cadastro está desatualizado
      const isNomeManual = registro.pessoa_id.startsWith('manual_');
      const isNomeManualRegional = isNomeManual && !isExternalRegistro && !registro.is_offline_manual;

      let comum: any = null;
      // 🚨 CRÍTICO: Tentar buscar cargo por ID primeiro, depois por nome (fallback)
      let cargoSelecionado = cargos.find(c => c.id === registro.cargo_id);
      if (!cargoSelecionado) {
        // Se não encontrou por ID, pode ser que cargo_id seja o nome (caso antigo)
        // Tentar buscar por nome como fallback
        cargoSelecionado = cargos.find(c => c.nome === registro.cargo_id);
        if (cargoSelecionado) {
          console.warn('⚠️ Cargo encontrado por nome, mas deveria ser por ID:', registro.cargo_id);
        }
      }

      if (isExternalRegistro) {
        // Para registros externos, extrair nome da comum do ID
        const comumNome = limparPrefixoComum(registro.comum_id);
        comum = { id: registro.comum_id, nome: comumNome };
      } else if (registro.comum_id.startsWith('comum_fora_')) {
        // 🚨 NOVO: Suporte para comuns da aba Outras Localidades no fallback Sheets
        const partesID = registro.comum_id.split('|');
        const cidadePart = partesID[1] || '';
        const originalNomePart = partesID[2] || '';
        
        let comumNome = '';
        if (originalNomePart) {
          comumNome = originalNomePart;
        } else {
          // Fallback: tentar extrair do ID removendo prefixo e índice
          comumNome = partesID[0]
            .replace(/^comum_fora_(\d+_)*/gi, '')
            .replace(/_/g, ' ')
            .trim();
        }
        
        comum = {
          id: registro.comum_id,
          nome: comumNome.toUpperCase(),
          cidadeManual: cidadePart || '',
          isExternal: true
        };
      } else if (registro.comum_id.startsWith('manual_') || registro.comum_id.includes('|')) {
        // 🚨 NOVO: Suporte para comum manual (página outras localidades)
        // Remove qualquer prefixo manual_ (possivelmente repetido) para obter o nome limpo
        const partes = registro.comum_id.split('|');
        const nomeLimpo = limparPrefixoComum(partes[0]);
        comum = { id: registro.comum_id, nome: nomeLimpo || 'Manual', cidadeManual: partes[1] || '' };
      } else {
        comum = comuns.find(c => c.id === registro.comum_id);
      }

      const instrumentoOriginal = registro.instrumento_id
        ? instrumentos.find(i => i.id === registro.instrumento_id)
        : null;

      if (!comum || !cargoSelecionado) {
        console.error('❌ Erro ao encontrar comum ou cargo:', {
          comum_id: registro.comum_id,
          cargo_id: registro.cargo_id,
          isExternal: isExternalRegistro,
          comuns_count: comuns.length,
          cargos_count: cargos.length,
          comuns_ids: comuns.map(c => c.id).slice(0, 5),
          cargos_ids: cargos.map(c => c.id).slice(0, 5),
          cargos_nomes: cargos.map(c => c.nome).slice(0, 5),
        });
        throw new Error('Dados incompletos: comum ou cargo não encontrados');
      }

      // 🚀 OTIMIZAÇÃO: Verificar se é nome manual (evitar buscar pessoas se não necessário)
      // isNomeManual já foi declarado acima
      let nomeCompleto = '';
      let cargoReal = cargoSelecionado.nome;
      let pessoa: any = null;

      if (isNomeManual) {
        // Extrair nome do pessoa_id (remove prefixo "manual_")
        nomeCompleto = registro.pessoa_id.replace(/^manual_/, '');
        cargoReal = cargoSelecionado.nome;
      } else {
        // 🚀 OTIMIZAÇÃO: Buscar pessoa apenas se necessário (não é nome manual)
        const pessoas = await supabaseDataService.getPessoasFromLocal(
          registro.comum_id,
          registro.cargo_id,
          registro.instrumento_id || undefined
        );
        pessoa = pessoas.find(p => p.id === registro.pessoa_id);

        if (!pessoa) {
          throw new Error('Pessoa não encontrada');
        }

        cargoReal = pessoa.cargo_real || cargoSelecionado.nome;
        nomeCompleto = pessoa.nome_completo || `${pessoa.nome} ${pessoa.sobrenome}`;
      }

      // Buscar nivel da pessoa (OFICIALIZADO, CULTO OFICIAL ou CANDIDATO)
      // 🚨 CORREÇÃO: Para candidatos, buscar instrumento da pessoa se não tiver no registro
      // A pessoa candidata já tem o instrumento_id convertido do nome do instrumento
      let instrumentoParaUsar = instrumentoOriginal;
      if (!instrumentoParaUsar && !isExternalRegistro && !isNomeManual && pessoa?.instrumento_id) {
        // Buscar instrumento pelo ID da pessoa
        const instrumentoDaPessoa = instrumentos.find(i => i.id === pessoa.instrumento_id);
        if (instrumentoDaPessoa) {
          instrumentoParaUsar = instrumentoDaPessoa;
        }
      }

      let nivelPessoa = '';
      if (!isExternalRegistro && !isNomeManual) {
        const nivelPessoaOriginal = pessoa?.nivel || null;
        nivelPessoa =
          normalizarNivel(nivelPessoaOriginal, instrumentoParaUsar?.nome, cargoReal) || '';
      }

      // 🚨 DEFINIR FLAGS DE CARGO PARA MAPEAR NO SHEETS
      const cargoUpper = cargoReal.toUpperCase().trim();
      const isExaminadora = cargoUpper.includes('EXAMINADORA');
      const isInstrutora = cargoUpper === 'INSTRUTORA';

      const cargo = { ...cargoSelecionado, nome: cargoReal };

      // Normalizar para cargos femininos que tocam órgão (usar cargo real da pessoa)
      const normalizacao = normalizarRegistroCargoFeminino(
        cargoReal, // Usar cargo real da pessoa
        instrumentoOriginal?.nome,
        registro.classe_organista
      );

      // Usar instrumento normalizado se for cargo feminino
      const instrumento = normalizacao.isNormalizado ? { nome: 'ÓRGÃO' } : instrumentoParaUsar;

      // Buscar cidade da pessoa (se disponível)
      // Para registros externos, a cidade vem no registro
      // 🚨 CORREÇÃO CRÍTICA: Sempre garantir que cidade seja preenchida (não usar localEnsaio como fallback)
      let cidade = '';
      if (comum?.cidadeManual) {
        // 🚨 PRIORIDADE: Usar cidade vinda do ID manual
        cidade = comum.cidadeManual;
      } else if (isExternalRegistro) {
        cidade = (registro as any).cidade || '';
      } else if (isNomeManual) {
        try {
          if (!supabase) throw new Error('Supabase client not initialized');
          const cidadeResult = await supabase
            .from('cadastro')
            .select('cidade')
            .ilike('comum', `%${comum.nome}%`)
            .not('cidade', 'is', null)
            .neq('cidade', '')
            .limit(1)
            .single();

          if (cidadeResult.data && (cidadeResult.data as any).cidade) {
            cidade = (cidadeResult.data as any).cidade;
            console.log('✅ [GoogleSheets] Cidade encontrada da comum para nome manual:', cidade);
          } else {
            console.warn('⚠️ [GoogleSheets] Cidade não encontrada para comum:', comum.nome);
            const comumNomeUpper = comum.nome.toUpperCase();
            if (comumNomeUpper.includes('ITAPEVI')) {
              cidade = 'ITAPEVI';
            } else if (comumNomeUpper.includes('COTIA')) {
              cidade = 'COTIA';
            } else if (comumNomeUpper.includes('JANDIRA')) {
              cidade = 'JANDIRA';
            } else if (comumNomeUpper.includes('CAUCAIA')) {
              cidade = 'CAUCAIA DO ALTO';
            }
            console.log('🔄 [GoogleSheets] Cidade inferida da comum:', cidade);
          }
        } catch (error) {
          console.warn('⚠️ [GoogleSheets] Erro ao buscar cidade da comum:', error);
          const comumNomeUpper = comum.nome.toUpperCase();
          if (comumNomeUpper.includes('ITAPEVI')) {
            cidade = 'ITAPEVI';
          } else if (comumNomeUpper.includes('COTIA')) {
            cidade = 'COTIA';
          } else if (comumNomeUpper.includes('JANDIRA')) {
            cidade = 'JANDIRA';
          } else if (comumNomeUpper.includes('CAUCAIA')) {
            cidade = 'CAUCAIA DO ALTO';
          }
        }
      } else {
        cidade = pessoa?.cidade || '';
        if (!cidade) {
          const comumNomeUpper = comum.nome.toUpperCase();
          if (comumNomeUpper.includes('ITAPEVI')) {
            cidade = 'ITAPEVI';
          } else if (comumNomeUpper.includes('COTIA')) {
            cidade = 'COTIA';
          } else if (comumNomeUpper.includes('JANDIRA')) {
            cidade = 'JANDIRA';
          } else if (comumNomeUpper.includes('CAUCAIA')) {
            cidade = 'CAUCAIA DO ALTO';
          }
          console.log(
            '🔄 [GoogleSheets] Cidade não encontrada na pessoa, inferida da comum:',
            cidade
          );
        }
      }

      if (!cidade || cidade.trim() === '') {
        console.warn('⚠️ [GoogleSheets] Cidade vazia detectada, tentado inferir da comum');
        const comumNomeUpper = comum.nome.toUpperCase();
        if (comumNomeUpper.includes('ITAPEVI')) {
          cidade = 'ITAPEVI';
        } else if (comumNomeUpper.includes('COTIA')) {
          cidade = 'COTIA';
        } else if (comumNomeUpper.includes('JANDIRA')) {
          cidade = 'JANDIRA';
        } else if (comumNomeUpper.includes('CAUCAIA')) {
          cidade = 'CAUCAIA DO ALTO';
        }
        // Removido o fallback genérico (split(' ')[0]) para evitar que códigos como BR-22-0674
        // sejam salvos como cidade caso não haja match com as regionais.
        console.log('🔄 [GoogleSheets] Cidade definida como fallback (ou mantida vazia):', cidade);
      }

      // Buscar nome do local de ensaio (se for ID, converter para nome)
      let localEnsaioNome = registro.local_ensaio || '';
      
      if (!localEnsaioNome || localEnsaioNome === 'Não definido') {
        console.warn(`⚠️ [GoogleSheets] Local não definido para o registro de: ${nomeCompleto} (Responsável: ${registro.usuario_responsavel})`);
      }

      if (localEnsaioNome && /^\d+$/.test(localEnsaioNome)) {
        // Se for um número (ID), buscar o nome correspondente
        const locais: { id: string; nome: string }[] = [
          { id: '1', nome: 'Cotia' },
          { id: '2', nome: 'Caucaia do Alto' },
          { id: '3', nome: 'Fazendinha' },
          { id: '4', nome: 'Itapevi' },
          { id: '5', nome: 'Jandira' },
          { id: '6', nome: 'Pirapora' },
          { id: '7', nome: 'Vargem Grande' },
        ];
        const localEncontrado = locais.find(l => l.id === localEnsaioNome);
        localEnsaioNome = localEncontrado?.nome || localEnsaioNome;
      }

      // Usar função utilitária centralizada para formatação de data/hora

      // Buscar nome do usuário e extrair apenas primeiro e último nome
      const registradoPorNome = formatRegistradoPor(registro.usuario_responsavel || '');

      // Usar valores normalizados se for cargo feminino
      const instrumentoFinal = normalizacao.isNormalizado
        ? normalizacao.instrumentoNome || 'ÓRGÃO'
        : instrumentoParaUsar?.nome || '';

      // 🚨 CORREÇÃO: Calcular naipe usando instrumentoFinal (já normalizado) para garantir que funciona com candidatos
      const naipeInstrumento = normalizacao.isNormalizado
        ? normalizacao.naipeInstrumento || 'TECLADO'
        : instrumentoFinal
          ? getNaipeByInstrumento(instrumentoFinal)
          : '';

      // Log para debug se naipe não foi encontrado
      if (instrumentoFinal && !naipeInstrumento) {
        console.warn('⚠️ Naipe não encontrado para instrumento no Google Sheets:', {
          instrumentoFinal,
          instrumentoParaUsar: instrumentoParaUsar?.nome,
          cargoReal,
        });
      }

      // 🚨 CORREÇÃO CRÍTICA: Para cargos femininos/órgão, classe_organista deve ser igual ao nivel
      // Se for cargo feminino (Organista, Instrutora, Examinadora, Secretária) ou órgão, usar o nivel normalizado como classe_organista
      const isOrgaoOuCargoFeminino =
        normalizacao.isNormalizado ||
        instrumentoParaUsar?.nome?.toUpperCase() === 'ÓRGÃO' ||
        instrumentoParaUsar?.nome?.toUpperCase() === 'ORGAO' ||
        isCargoFemininoOrganista(cargoReal);

      const classeOrganistaFinal =
        isOrgaoOuCargoFeminino && nivelPessoa
          ? nivelPessoa // Usar nivel como classe_organista para cargos femininos/órgão
          : normalizacao.isNormalizado
            ? normalizacao.classeOrganista || 'OFICIALIZADA'
            : registro.classe_organista || '';

      // 🚨 CORREÇÃO: Diferenciar "SAM Desatualizado" de "Visitas fora da Regional"
      // Se a COMUM é manual, é "Visitas fora da Regional"
      // Se apenas o NOME é manual (em comum da regional), é "SAM Desatualizado"
      const isComumManual = registro.comum_id.startsWith('manual_');
      const isComumFora = registro.comum_id.startsWith('comum_fora_');
      let anotacoes = '';

      const cargoUpperForSam = cargoReal.toUpperCase();
      const isCargoMusicalParaSam =
        cargoUpperForSam.includes('MÚSIC') ||
        cargoUpperForSam.includes('MUSIC') ||
        cargoUpperForSam.includes('ORGANISTA') ||
        cargoUpperForSam.includes('CANDIDAT') ||
        cargoUpperForSam.includes('EXAMINADORA') ||
        cargoUpperForSam.includes('INSTRUTOR') ||
        isCargoFemininoOrganista(cargoReal);

      if (isComumManual || isComumFora) {
        anotacoes = 'Visitas fora da Regional';
        console.log('✏️ [GoogleSheets] Comum manual ou externa detectada - adicionando "Visitas fora da Regional"');
      } else if (isNomeManualRegional && isCargoMusicalParaSam) {
        anotacoes = 'SAM Desatualizado';
        console.log(
          '✏️ [GoogleSheets] Nome manual de comum da regional (cargo musical) detectado - adicionando "SAM Desatualizado"'
        );
      }

      // 🚨 CORREÇÃO CRÍTICA: Garantir que formatDateTimeManual funcione mesmo se houver problema de importação
      let dataEnsaioFormatada = '';
      try {
        if (formatDateTimeManual && typeof formatDateTimeManual === 'function') {
          dataEnsaioFormatada = formatDateTimeManual(registro.data_hora_registro);
        } else {
          // Fallback: formatar manualmente se função não estiver disponível
          const data = registro.data_hora_registro
            ? new Date(registro.data_hora_registro)
            : new Date();
          const dia = String(data.getDate()).padStart(2, '0');
          const mes = String(data.getMonth() + 1).padStart(2, '0');
          const ano = data.getFullYear();
          const horas = String(data.getHours()).padStart(2, '0');
          const minutos = String(data.getMinutes()).padStart(2, '0');
          dataEnsaioFormatada = `${dia}/${mes}/${ano} ${horas}:${minutos}`;
          console.warn('⚠️ formatDateTimeManual não disponível, usando fallback manual');
        }
      } catch (formatError) {
        // Fallback em caso de erro
        const data = registro.data_hora_registro
          ? new Date(registro.data_hora_registro)
          : new Date();
        const dia = String(data.getDate()).padStart(2, '0');
        const mes = String(data.getMonth() + 1).padStart(2, '0');
        const ano = data.getFullYear();
        const horas = String(data.getHours()).padStart(2, '0');
        const minutos = String(data.getMinutes()).padStart(2, '0');
        dataEnsaioFormatada = `${dia}/${mes}/${ano} ${horas}:${minutos}`;
        console.error('❌ Erro ao formatar data, usando fallback:', formatError);
      }

      // 🛡️ SEGURANÇA: Sanitizar todos os inputs antes de enviar
      const nomeCompletoSanitizado = sanitizeInput(nomeCompleto.trim(), {
        fieldType: 'nome',
        maxLength: FIELD_LIMITS.nome,
      });
      const comumNomeSanitizado = sanitizeInput(comum.nome, {
        fieldType: 'comum',
        maxLength: FIELD_LIMITS.comum,
      });
      const cidadeSanitizada = sanitizeInput(cidade, {
        fieldType: 'cidade',
        maxLength: FIELD_LIMITS.cidade,
      });
      const cargoRealSanitizado = sanitizeInput(cargoReal, {
        fieldType: 'cargo',
        maxLength: FIELD_LIMITS.cargo,
      });
      const nivelPessoaSanitizado = nivelPessoa
        ? sanitizeInput(nivelPessoa, { maxLength: 50 })
        : '';
      const instrumentoFinalSanitizado = sanitizeInput(instrumentoFinal, {
        fieldType: 'instrumento',
        maxLength: FIELD_LIMITS.instrumento,
      });
      const naipeInstrumentoSanitizado = sanitizeInput(naipeInstrumento, { maxLength: 50 });
      const classeOrganistaFinalSanitizada = sanitizeInput(classeOrganistaFinal, {
        fieldType: 'classe',
        maxLength: FIELD_LIMITS.classe,
      });
      const localEnsaioNomeSanitizado = sanitizeInput(localEnsaioNome, { maxLength: 100 });
      const registradoPorNomeSanitizado = sanitizeInput(registradoPorNome, { maxLength: 200 });
      const anotacoesSanitizadas = sanitizeInput(anotacoes, { maxLength: 500 });

      // Formato esperado pelo Google Apps Script (Code.gs) - tudo em maiúscula
      const sheetRow = {
        UUID: registro.id || '',
        'NOME COMPLETO': nomeCompletoSanitizado.toUpperCase(),
        COMUM: comumNomeSanitizado.toUpperCase(),
        CIDADE: cidadeSanitizada.toUpperCase(),
        CARGO: cargoRealSanitizado.toUpperCase(),
        NÍVEL: (nivelPessoaSanitizado || (isExaminadora || isInstrutora ? 'OFICIALIZADA' : registro.classe_organista || '')).toUpperCase(),
        INSTRUMENTO: instrumentoFinalSanitizado.toUpperCase(),
        NAIPE_INSTRUMENTO: naipeInstrumentoSanitizado.toUpperCase(),
        CLASSE_ORGANISTA: (classeOrganistaFinalSanitizada || nivelPessoaSanitizado || (isExaminadora || isInstrutora ? 'OFICIALIZADA' : '')).toUpperCase(),
        LOCAL_ENSAIO: localEnsaioNomeSanitizado.toUpperCase(),
        DATA_ENSAIO: dataEnsaioFormatada,
        REGISTRADO_POR: registradoPorNomeSanitizado.toUpperCase(),
        SYNC_STATUS: 'ATUALIZADO',
        SYNCED_AT: new Date().toISOString(),
        ANOTACOES: (
          anotacoesSanitizadas || (isComumManual || isComumFora ? 'Visitas fora da Regional' : isNomeManualRegional && isCargoMusicalParaSam ? 'SAM Desatualizado' : '')
        ).toUpperCase(),
        DUPLICATA: 'NÃO',
      };
      // 🛡️ SEGURANÇA: Log sanitizado (sem dados sensíveis)
      console.log('📤 Enviando para Google Sheets:', sanitizeForLogging(sheetRow));

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 🚀 OTIMIZAÇÃO: 30 segundos (aumentado para resiliência mobile)

      const response = await fetch(GOOGLE_SHEETS_API_URL, {
        method: 'POST',
        mode: 'no-cors', // 🚨 CRÍTICO: Usar no-cors para evitar bloqueio em PWAs mobile
        headers: {
          'Content-Type': 'text/plain;charset=utf-8',
        },
        body: JSON.stringify({
          op: 'append',
          Sheet: SHEET_NAME,
          data: sheetRow,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Se a resposta é opaca (no-cors), considera sucesso
      if ((response as any).type === 'opaque') {
        console.log('✅ Google Sheets: Dados enviados (no-cors)');
        return { success: true };
      }

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Erro HTTP ao enviar para Google Sheets:', response.status, errorText);
        return {
          success: false,
          error: `Erro HTTP ${response.status}: ${errorText}`,
        };
      }

      return { success: true };
    } catch (error: any) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.warn('⚠️ Timeout ao enviar para Google Sheets');
        return {
          success: false,
          error: 'Timeout ao enviar para Google Sheets',
        };
      }

      // 🚨 CORREÇÃO CRÍTICA: Se for erro de rede, pode ser no-cors/CORS block no PWA
      // Em dispositivos móveis, o fetch pode falhar mas o envio pode ter funcionado
      // Retornar sucesso como fallback (igual sendExternalRegistroToSheet faz)
      if (
        error.message &&
        (error.message.includes('Failed to fetch') ||
          error.message.includes('NetworkError') ||
          error.message.includes('Network request failed'))
      ) {
        console.warn('⚠️ Erro de rede detectado no Sync, mas pode ser no-cors - assumindo sucesso para não travar fila');
        return { success: true };
      }

      console.error('❌ Erro ao enviar para Google Sheets:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao conectar com Google Sheets',
      };
    }
  },

  /**
   * Atualiza um registro existente no Google Sheets
   */
  async updateRegistroInSheet(
    uuid: string,
    updateData: {
      nome_completo?: string;
      comum?: string;
      cidade?: string;
      cargo?: string;
      nivel?: string; // 🚨 CORREÇÃO: Adicionar campo nivel
      instrumento?: string;
      naipe_instrumento?: string;
      classe_organista?: string;
      data_ensaio?: string;
      anotacoes?: string;
    }
  ): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('📤 Atualizando registro no Google Sheets:', { uuid, updateData });

      // Mapear dados para o formato esperado pelo Google Sheets
      const sheetData: Record<string, string> = {};
      if (updateData.nome_completo) {
        sheetData['NOME COMPLETO'] = updateData.nome_completo.toUpperCase();
      }
      if (updateData.comum) {
        // 🚨 CORREÇÃO: Limpar prefixos internos antes de enviar atualização
        const comumLimpa = limparPrefixoComum(updateData.comum);
        sheetData['COMUM'] = comumLimpa.toUpperCase();
      }
      if (updateData.cidade !== undefined) {
        sheetData['CIDADE'] = updateData.cidade.toUpperCase();
      }
      if (updateData.cargo) {
        sheetData['CARGO'] = updateData.cargo.toUpperCase();
      }
      if (updateData.nivel !== undefined) {
        sheetData['NÍVEL'] = updateData.nivel.toUpperCase();
      }
      if (updateData.instrumento !== undefined) {
        sheetData['INSTRUMENTO'] = updateData.instrumento.toUpperCase();
      }
      if (updateData.naipe_instrumento !== undefined) {
        sheetData['NAIPE_INSTRUMENTO'] = updateData.naipe_instrumento.toUpperCase();
      }
      if (updateData.classe_organista !== undefined) {
        sheetData['CLASSE_ORGANISTA'] = updateData.classe_organista.toUpperCase();
      }
      if (updateData.data_ensaio) {
        // Formatar data se necessário
        const data = new Date(updateData.data_ensaio);
        const dia = String(data.getDate()).padStart(2, '0');
        const mes = String(data.getMonth() + 1).padStart(2, '0');
        const ano = data.getFullYear();
        const horas = String(data.getHours()).padStart(2, '0');
        const minutos = String(data.getMinutes()).padStart(2, '0');
        sheetData['DATA_ENSAIO'] = `${dia}/${mes}/${ano} ${horas}:${minutos}`;
      }
      if (updateData.anotacoes !== undefined) {
        sheetData['ANOTACOES'] = updateData.anotacoes.toUpperCase();
      }

      const requestBody = {
        op: 'update',
        Sheet: SHEET_NAME,
        match: {
          UUID: uuid,
        },
        data: sheetData,
      };

      console.log('📤 Request body para Google Sheets:', requestBody);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 16000); // 🚀 OTIMIZAÇÃO: 16 segundos

      const response = await fetch(GOOGLE_SHEETS_API_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8',
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Com no-cors, a resposta é sempre opaca, então consideramos sucesso
      if (response.type === 'opaque' || response.ok) {
        console.log('✅ Google Sheets: Requisição de atualização enviada com sucesso');
        return { success: true };
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.error('❌ Erro ao atualizar registro no Google Sheets:', error);
      // Não lança erro para não interromper o processo
      console.warn('⚠️ Continuando sem atualização no Google Sheets');
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      };
    }
  },

  async deleteRegistroFromSheet(uuid: string, nome?: string, responsavel?: string): Promise<{ success: boolean; error?: string }> {
    if (!uuid) {
      console.warn('⚠️ Tentativa de exclusão no Google Sheets sem UUID');
      return { success: false, error: 'UUID não fornecido' };
    }

    try {
      // Garantir que o UUID seja uma string limpa
      const cleanUuid = String(uuid).trim();

      console.log(`🗑️ [GoogleSheets] Preparando deleção para o registro: ${cleanUuid}`);

      // 🚨 ESTRATÉGIA ROBUSTA: Enviar match com UUID e id (algumas tabelas usam id)
      // E também garantir que o sheet seja o correto
      const requestBody = {
        op: 'delete',
        Sheet: SHEET_NAME,
        match: {
          UUID: cleanUuid,
        },
        meta: {
          nome: nome || '',
          responsavel: responsavel || '',
        },
      };

      console.log(`🌐 [GoogleSheets] Enviando payload de DELETE para URL: ${GOOGLE_SHEETS_API_URL}`);
      console.log('🌐 [GoogleSheets] Payload:', JSON.stringify(requestBody));

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 16000);

      // Usar fetch com no-cors para evitar problemas de CORS com Apps Script
      const response = await fetch(GOOGLE_SHEETS_API_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: {
          'Content-Type': 'text/plain',
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      
      console.log('✅ [GoogleSheets] Comando de deleção enviado com sucesso (no-cors)');
      return { success: true };
    } catch (error) {
      console.error('❌ [GoogleSheets] Erro crítico ao deletar registro:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      };
    }
  },
};
