import NetInfo from '@react-native-community/netinfo';
import { Platform } from 'react-native';
import { supabaseDataService } from './supabaseDataService';
import { googleSheetsService } from './googleSheetsService';
import { RegistroPresenca } from '../types/models';
import { authService } from './authService';
import { uuidv4 } from '../utils/uuid';
import { supabase, isSupabaseConfigured } from './supabaseClient';
import { formatDate, formatTime } from '../utils/dateUtils';
import { robustRemoveItem, robustSetCriticalItem } from '../utils/robustStorage';
import { resolveComumById } from '../utils/normalizeComum';

// 🚨 PROTEÇÃO: Flag global para evitar processamento duplicado simultâneo
let isProcessingQueue = false;
let lastProcessTimestamp = 0;
const PROCESS_COOLDOWN = 2000; // 2 segundos de cooldown entre processamentos

// 🌐 CACHE DE CONECTIVIDADE: Evitar pings excessivos
let lastOnlineCheck = 0;
let lastOnlineResult = true;
type QueueProcessResult = {
  successCount: number;
  errorCount: number;
  duplicateCount: number;
  duplicateError?: string;
};
const ONLINE_CACHE_MS = 1000; // Cache reduzido para 1 segundo (mais resiliência no mobile)


export const offlineSyncService = {
  async isOnline(): Promise<boolean> {
    const now = Date.now();
    // 🚀 OTIMIZAÇÃO: Retornar resultado do cache se verificado recentemente
    if (now - lastOnlineCheck < ONLINE_CACHE_MS) {
      return lastOnlineResult;
    }

    if (Platform.OS === 'web') {
      // Para web/PWA: navigator.onLine é rápido, mas pode ser falso-negativo em mobile
      const navOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

      // 🚀 OTIMIZAÇÃO: Se navigator.onLine for true, confiar nele primeiro (mais rápido)
      if (navOnline) {
        lastOnlineCheck = now;
        lastOnlineResult = true;
        return true;
      }

      // 🚨 FALLBACK: Se navigator.onLine diz offline, tentar um ping rápido para confirmar (falso-negativo)
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2000); // 2s timeout
        const response = await fetch('https://clients3.google.com/generate_204', {
          method: 'GET',
          mode: 'no-cors',
          cache: 'no-store',
          signal: controller.signal
        });
        clearTimeout(timeoutId);

        lastOnlineCheck = now;
        lastOnlineResult = true;
        return true;
      } catch (e) {
        console.warn('🌐 [isOnline] Web Ping falhou, realmente offline');
        lastOnlineCheck = now;
        lastOnlineResult = false;
        return false;
      }
    }

    let NetInfoModule = NetInfo;
    try {
      const statePromise = NetInfoModule.fetch();
      const timeoutPromise = new Promise<any>((_, reject) =>
        setTimeout(() => reject(new Error('timeout')), 5000)
      );

      const state = await Promise.race([statePromise, timeoutPromise]);
      // 🚨 CORREÇÃO: Tratar isInternetReachable === null como "provavelmente online" 
      // Em redes mobile, o NetInfo às vezes retorna null para isInternetReachable mesmo com conexão estável.
      let result = state.isConnected === true && (state.isInternetReachable === true || state.isInternetReachable === null);

      // 🚀 OTIMIZAÇÃO MOBILE: Se NetInfo diz que está offline, fazer um ping rápido de confirmação
      // Útil em casos onde o NetInfo fica "preso" no status offline
      if (!result) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 3000);
          const pingUrl = 'https://clients3.google.com/generate_204';

          await fetch(pingUrl, {
            method: 'GET',
            mode: 'no-cors',
            cache: 'no-store',
            signal: controller.signal
          });

          clearTimeout(timeoutId);
          console.log('✅ Mobile Ping Success (NetInfo estava offline)');
          result = true;
        } catch (pingError) {
          // Ping também falhou, está realmente offline ou conexão muito ruim
        }
      }

      lastOnlineCheck = now;
      lastOnlineResult = result;
      return result;
    } catch (e) {
      console.log('⚠️ isOnline check timeout (usando último status conhecido)');
      return lastOnlineResult;
    }
  },

  async syncAllData(options: { fastSync?: boolean } = {}): Promise<{ success: boolean; error?: string; syncResult?: { successCount: number; totalCount: number } }> {
    const isOnline = await this.isOnline();
    if (!isOnline) {
      // Não é um erro crítico, apenas informativo
      return { success: false, error: 'Sem conexão com a internet' };
    }

    try {
      // Verificar se a sessão é válida ANTES de tentar sincronizar
      const sessionValid = await authService.isSessionValid();
      if (!sessionValid) {
        // Não é um erro crítico se não há sessão válida
        return { success: false, error: 'Sessão expirada. Faça login novamente.' };
      }

      // Sincronizar dados de referência APENAS se não for fastSync
      if (!options.fastSync) {
        console.log('🔄 [syncAllData] Sincronização completa de referências iniciada...');
        try {
          await Promise.all([
            supabaseDataService.syncComunsToLocal(),
            supabaseDataService.syncCargosToLocal(),
            supabaseDataService.syncInstrumentosToLocal()
          ]);
        } catch (error) {
          console.warn('⚠️ Erro parcial na sincronização de referências:', error);
        }
      } else {
        console.log('🚀 [syncAllData] Modo FAST: Pulando referências, focando na fila...');
      }

      // Sincronizar registros pendentes (Sempre faz parte do syncAllData)
      let syncResult: { successCount: number; totalCount: number } | undefined;
      try {
        syncResult = await this.syncPendingRegistros();
      } catch (error) {
        console.warn(
          '⚠️ Erro ao sincronizar registros pendentes (continuando...):',
          error instanceof Error ? error.message : error
        );
      }

      return { success: true, syncResult };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro ao sincronizar dados';
      // Não logar como erro crítico se for problema de rede
      if (
        !errorMessage.toLowerCase().includes('fetch') &&
        !errorMessage.toLowerCase().includes('network')
      ) {
        console.error('❌ Erro na sincronização:', errorMessage);
      }
      return {
        success: false,
        error: errorMessage,
      };
    }
  },

  // 🚨 FUNÇÃO MELHORADA: processarFilaLocal com retry e validação robusta
  async processarFilaLocal(_silent: boolean = true): Promise<QueueProcessResult> {
    // 🚨 PROTEÇÃO: Evitar processamento duplicado simultâneo (ex: F5, múltiplos eventos online)
    const now = Date.now();
    if (isProcessingQueue) {
      console.log('⚠️ Processamento da fila já em andamento, ignorando chamada duplicada');
      return { successCount: 0, errorCount: 0, duplicateCount: 0 };
    }

    // Verificar cooldown para evitar processamento muito frequente (ex: F5 repetido)
    if (now - lastProcessTimestamp < PROCESS_COOLDOWN) {
      const remainingCooldown = PROCESS_COOLDOWN - (now - lastProcessTimestamp);
      console.log(`⚠️ Processamento muito recente, aguardando ${remainingCooldown}ms antes de processar novamente`);
      return { successCount: 0, errorCount: 0, duplicateCount: 0 };
    }

    // Marcar como processando
    isProcessingQueue = true;
    lastProcessTimestamp = now;

    try {
      // Buscar fila
      const registros = await supabaseDataService.getRegistrosPendentesFromLocal();

      if (registros.length === 0) {
        console.log('📭 Fila vazia, nada para processar');
        return { successCount: 0, errorCount: 0, duplicateCount: 0 };
      }

      // Testa conectividade antes de processar (com retry)
      // 🚨 CORREÇÃO: Forçar uma verificação fresh (não-cached) antes de processar a fila
      lastOnlineCheck = 0;
      let conectividadeOK = false;
      for (let retry = 0; retry < 3; retry++) {
        conectividadeOK = await this.isOnline();
        if (conectividadeOK) break;
        if (retry < 2) {
          console.log(`⚠️ Tentativa ${retry + 1}/3: Conectividade não estável, aguardando...`);
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      if (!conectividadeOK) {
        console.log('⚠️ Conectividade não estável após 3 tentativas, mantendo itens na fila');
        return { successCount: 0, errorCount: 0, duplicateCount: 0 };
      }

      console.log(`🔄 Processando fila local: ${registros.length} item(s)`);

      const itensProcessados: RegistroPresenca[] = [];
      const itensComErro: RegistroPresenca[] = [];
      const itensDuplicados: RegistroPresenca[] = [];
      let duplicateError: string | undefined;

      for (let i = 0; i < registros.length; i++) {
        const item = registros[i];
        const itemEmProcessamento: RegistroPresenca = {
          ...item,
          sync_attempts: (item.sync_attempts || (item as any).tentativas || 0) + 1,
          sync_last_error: undefined,
        };

        // 🚀 OTIMIZAÇÃO: Não verificar isOnline() para cada item para não saturar a rede
        // A falha do fetch individual em createRegistro já tratará a volta para a fila


        try {
          console.log(`📤 Processando item ${i + 1}/${registros.length}: ${itemEmProcessamento.pessoa_id}`);

          // Validar item antes de processar
          if (!itemEmProcessamento.pessoa_id || !itemEmProcessamento.comum_id || !itemEmProcessamento.cargo_id) {
            console.warn(`⚠️ Item ${i + 1}: Dados incompletos, removendo da fila`);
            itensProcessados.push(itemEmProcessamento); // Remover da fila
            continue;
          }

          // 🚨 NOVO FLUXO: Enviar para Supabase PRIMEIRO (Trava de integridade)
          // Se o Supabase bloquear por duplicidade, não enviamos para o Google Sheets.
          if (supabaseDataService.isRegistroBloqueadoPorDuplicidade(itemEmProcessamento)) {
            console.warn(`Item ${i + 1}: bloqueado por trava de duplicidade - pulando Supabase e Sheets`);
            await supabaseDataService.deleteRegistrosDuplicadosFromLocal(itemEmProcessamento);
            itensDuplicados.push(itemEmProcessamento);
            continue;
          }

          let supabaseSuccess = itemEmProcessamento.sync_supabase_ok === true;
          let sheetsSuccess = itemEmProcessamento.sync_sheets_ok === true;
          let isBusinessDuplicate = false;

          if (supabaseSuccess) {
            console.log(`✅ Item ${i + 1}: Supabase já confirmado anteriormente`);
          } else {
            try {
              await supabaseDataService.createRegistroPresenca(itemEmProcessamento, false);
              console.log(`✅ Item ${i + 1}: Supabase OK`);
              supabaseSuccess = true;
              itemEmProcessamento.sync_supabase_ok = true;
            } catch (e: any) {
              const message = e?.message || String(e);
              const isDuplicateBlock = message.includes('DUPLICATA_BLOQUEADA');
              const isIdempotentConstraint =
                e.code === '23505' ||
                message.includes('duplicate key') ||
                message.includes('already exists') ||
                message.includes('pessoas_pkey') ||
                message.includes('presencas_pkey');

              if (isDuplicateBlock) {
                console.warn(`Item ${i + 1}: duplicidade real bloqueada no Supabase`);
                isBusinessDuplicate = true;
                duplicateError = message || duplicateError;
              } else if (isIdempotentConstraint) {
                console.warn(
                  `Item ${i + 1}: Supabase indicou registro já existente; mantendo fluxo para garantir Sheets`
                );
                supabaseSuccess = true;
                itemEmProcessamento.sync_supabase_ok = true;
              } else {
                console.warn(
                  `⚠️ Item ${i + 1}: Erro no Supabase; mantendo pendente e tentando Sheets se necessario:`,
                  message
                );
                itemEmProcessamento.sync_last_error = `Supabase: ${message}`;
              }
            }
          }

          if (isBusinessDuplicate) {
            await supabaseDataService.deleteRegistrosDuplicadosFromLocal(itemEmProcessamento);
            if (itemEmProcessamento.id) {
              await supabaseDataService.deleteRegistroFromLocal(itemEmProcessamento.id);
            }
            itensDuplicados.push(itemEmProcessamento);
            continue;
          }

          // 2. Enviar para Google Sheets (Garantia do Usuário)
          // Mesmo que o Supabase tenha falhado (por conexão), tentamos o Sheets.
          if (supabaseDataService.isRegistroBloqueadoPorDuplicidade(itemEmProcessamento)) {
            console.warn(`Item ${i + 1}: bloqueado por trava de duplicidade antes do Sheets`);
            await supabaseDataService.deleteRegistrosDuplicadosFromLocal(itemEmProcessamento);
            itensDuplicados.push(itemEmProcessamento);
            continue;
          }

          if (sheetsSuccess) {
            console.log(`✅ Item ${i + 1}: Google Sheets já confirmado anteriormente`);
          } else {
            const sheetsResult = await googleSheetsService.sendRegistroToSheet(itemEmProcessamento);
            if (sheetsResult.success) {
              console.log(`✅ Item ${i + 1}: Google Sheets OK`);
              sheetsSuccess = true;
              itemEmProcessamento.sync_sheets_ok = true;
            } else if (sheetsResult.error?.includes('DUPLICATA') || sheetsResult.error?.includes('duplicat')) {
              console.log(`✅ Item ${i + 1}: Registro já existe no Sheets`);
              sheetsSuccess = true;
              itemEmProcessamento.sync_sheets_ok = true;
            } else {
              itemEmProcessamento.sync_last_error = `Google Sheets: ${sheetsResult.error || 'Erro desconhecido'}`;
            }
          }

          if (supabaseSuccess && sheetsSuccess) {
            if (itemEmProcessamento.id) {
              try {
                await supabaseDataService.deleteRegistroFromLocal(itemEmProcessamento.id);
                console.log(`🗑️ Item ${i + 1}: Removido da fila com sucesso`);
              } catch (deleteError) {
                console.warn(`⚠️ Item ${i + 1}: Erro ao remover da fila (não crítico):`, deleteError);
              }
            }
            itensProcessados.push(itemEmProcessamento);
          } else {
            const missingTargets = [
              supabaseSuccess ? null : 'Supabase',
              sheetsSuccess ? null : 'Google Sheets',
            ].filter(Boolean).join(' e ');
            throw new Error(`Registro ainda pendente em: ${missingTargets}`);
          }

        } catch (error: any) {
          console.error(`❌ Item ${i + 1}: Erro:`, error.message);

          // Em evento ao vivo, falha repetida quase sempre e rede instavel.
          // Nunca descartar registro por limite de tentativas: manter na fila
          // ate enviar ou ate uma duplicidade real ser confirmada.
          itensComErro.push({
            ...itemEmProcessamento,
            sync_last_error: itemEmProcessamento.sync_last_error || error?.message || String(error),
            tentativas: itemEmProcessamento.sync_attempts,
          } as any);
        }

        // Pequena pausa entre itens para não sobrecarregar
        if (i < registros.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 150)); // Reduzido de 300ms para 150ms
        }
      }

      // Atualiza fila removendo itens processados
      // Salvar apenas itens com erro de volta na fila
      if (itensComErro.length > 0) {
        const filaKey = 'fila_registros_presenca';
        for (const item of itensComErro) {
          if (item.id) {
            await supabaseDataService.deleteRegistroFromLocal(item.id);
          }
        }
        await robustSetCriticalItem(filaKey, JSON.stringify(itensComErro));
      } else {
        // Se não há erros, limpar fila completamente
        const filaKey = 'fila_registros_presenca';
        await robustRemoveItem(filaKey);
      }

      // Remover itens processados do storage local também
      for (const item of itensProcessados) {
        if (item.id) {
          try {
            await supabaseDataService.deleteRegistroFromLocal(item.id);
          } catch (error) {
            console.warn(`⚠️ Erro ao remover item ${item.id} do storage local:`, error);
          }
        }
      }

      for (const item of itensDuplicados) {
        if (item.id) {
          try {
            await supabaseDataService.deleteRegistroFromLocal(item.id);
          } catch (error) {
            console.warn(`Erro ao remover duplicata ${item.id} do storage local:`, error);
          }
        }
      }

      const result = {
        successCount: itensProcessados.length,
        errorCount: itensComErro.length,
        duplicateCount: itensDuplicados.length,
        duplicateError,
      };

      console.log(`✅ Fila processada: ${result.successCount} enviados, ${result.errorCount} com erro`);

      // A fila roda em background. Oscilacao de rede nao deve interromper o
      // atendimento com modal; os itens permanecem salvos para a proxima tentativa.
      if (result.errorCount > 0) {
        console.log(`${result.errorCount} registro(s) permanecem na fila aguardando conexao estavel`);
      }

      return result;

    } catch (error) {
      console.error('❌ Erro ao processar fila local:', error);
      return { successCount: 0, errorCount: 0, duplicateCount: 0 };
    } finally {
      // 🚨 PROTEÇÃO: Sempre liberar flag de processamento, mesmo em caso de erro
      isProcessingQueue = false;
    }
  },

  async syncPendingRegistros(): Promise<{ successCount: number; totalCount: number }> {
    // 🚨 CORREÇÃO CRÍTICA: Usar APENAS processarFilaLocal para evitar duplicação
    // processarFilaLocal já faz todo o processamento necessário e remove registros da fila
    // NÃO processar novamente aqui para evitar que o mesmo registro seja enviado múltiplas vezes

    // Buscar contagem ANTES de processar para retornar totalCount correto
    const registrosAntes = await supabaseDataService.getRegistrosPendentesFromLocal();
    const totalCount = registrosAntes.length;

    // Processar fila (isso já remove os registros processados da fila)
    const result = await this.processarFilaLocal();

    // Retornar resultado compatível com a interface esperada
    return {
      successCount: result.successCount,
      totalCount: totalCount,
    };
  },

  async createRegistro(
    registro: RegistroPresenca,
    skipDuplicateCheck = false
  ): Promise<{ success: boolean; error?: string }> {
    // 🚨 OTIMIZAÇÃO: Medir tempo de processamento
    const inicioTempo = performance.now();

    // 🚀 OTIMIZAÇÃO: Verificar status online de forma rápida usando a própria função do serviço (com fallback para web)
    let isOnline = false;
    try {
      isOnline = await this.isOnline();
    } catch (error) {
      // Se houver erro na verificação, assumir offline para garantir que salve localmente
      isOnline = false;
    }

    // 🛡️ VERIFICAÇÃO DE DUPLICADOS NO SUPABASE PRIMEIRO (se online)
    // 🚀 OTIMIZAÇÃO: Centralizado em supabaseDataService.checkDuplicataRemota
    if (isOnline && !skipDuplicateCheck) {
      try {
        // 1. Resolver dados para a busca (Nome, Comum, Cargo Real)
        const isNomeManual = registro.pessoa_id.startsWith('manual_');
        const [comuns, cargos, instrumentos] = await Promise.all([
          supabaseDataService.getComunsFromLocal(),
          supabaseDataService.getCargosFromLocal(),
          supabaseDataService.getInstrumentosFromLocal(),
        ]);

        const isForaRegionalRegistro =
          registro.comum_id.startsWith('comum_fora_') ||
          registro.comum_id.startsWith('manual_') ||
          registro.comum_id.startsWith('external_');
        const comumObj = resolveComumById(comuns, registro.comum_id);
        const cargoObj = cargos.find(c => String(c.id) === String(registro.cargo_id));
        const instrumentoObj = registro.instrumento_id
          ? instrumentos.find(i => String(i.id) === String(registro.instrumento_id))
          : null;

        if ((comumObj || isForaRegionalRegistro) && cargoObj) {
          let nomeCompleto = '';
          let cargoReal = cargoObj.nome;
          let cidadeReal = registro.cidade || '';
          let comumNomeReal = comumObj ? comumObj.nome : (registro.comum_id.startsWith('manual_') ? registro.comum_id.replace('manual_', '').split('|')[0] : registro.comum_id);

          if (isNomeManual) {
            nomeCompleto = registro.pessoa_id.replace(/^manual_/, '').toUpperCase();
          } else {
            const pessoas = await supabaseDataService.getPessoasFromLocal(
              registro.comum_id,
              registro.cargo_id,
              registro.instrumento_id || undefined,
              isForaRegionalRegistro
            );
            const pessoa = pessoas.find(p => p.id === registro.pessoa_id);
            if (pessoa) {
              nomeCompleto = (pessoa.nome_completo || `${pessoa.nome} ${pessoa.sobrenome}`).trim().toUpperCase();
              cargoReal = pessoa.cargo_real || cargoObj.nome;
              cidadeReal = pessoa.cidade || cidadeReal;
            }
          }

          // 2. Executar verificação remota centralizada
          await supabaseDataService.checkDuplicataRemota({
            nome: nomeCompleto,
            comum: comumNomeReal,
            cargo: cargoReal,
            instrumento: instrumentoObj?.nome || '',
            cidade: cidadeReal,
            uuid: registro.id,
            pessoaId: registro.pessoa_id,
            isForaRegional: isForaRegionalRegistro,
            dataIso: registro.data_hora_registro
          });
        }
      } catch (error: any) {
        // Se for erro de duplicata, retornar formato esperado pelo controller
        if (error.message?.includes('DUPLICATA_BLOQUEADA')) {
          const infoStr = error.message.split('DUPLICATA_BLOQUEADA:')[1] || error.message;
          console.error('🚨 [OfflineSync] Duplicata bloqueada detectada:', infoStr);
          return {
            success: false,
            error: infoStr,
          };
        }
        
        // Se for timeout ou outro erro, apenas avisar e continuar (modo resiliente)
        console.warn('⚠️ Erro ao verificar duplicatas remota (continuando...):', error.message || error);
      }
    }

    // 🛡️ VERIFICAÇÃO DE DUPLICADOS LOCAL: Verificar se já existe registro no mesmo dia
    // 🚀 OTIMIZAÇÃO: Verificação rápida usando apenas IDs e datas (sem buscar pessoas)
    // Pular verificação se skipDuplicateCheck = true (usuário confirmou duplicata)
    if (!skipDuplicateCheck) {
      try {
        const registrosLocais = await supabaseDataService.getRegistrosPendentesFromLocal();

        // Extrair apenas a data (sem hora) para comparação
        const dataRegistro = new Date(registro.data_hora_registro);
        const dataRegistroStr = dataRegistro.toISOString().split('T')[0]; // YYYY-MM-DD

        // 🚀 OTIMIZAÇÃO: Verificação rápida por IDs e data (evita buscar pessoas)
        const duplicataLocal = registrosLocais.find(r => {
          const rData = new Date(r.data_hora_registro);
          const rDataStr = rData.toISOString().split('T')[0];

          // Comparar por IDs e data (muito mais rápido)
          return (
            r.pessoa_id === registro.pessoa_id &&
            r.comum_id === registro.comum_id &&
            r.cargo_id === registro.cargo_id &&
            (r.instrumento_id || null) === (registro.instrumento_id || null) &&
            rDataStr === dataRegistroStr &&
            r.status_sincronizacao === 'pending'
          );
        });

        if (duplicataLocal) {
          // Se encontrou duplicata por IDs, buscar dados completos apenas uma vez
          const [comuns, cargos, pessoas] = await Promise.all([
            supabaseDataService.getComunsFromLocal(),
            supabaseDataService.getCargosFromLocal(),
            supabaseDataService.getPessoasFromLocal(
              registro.comum_id,
              registro.cargo_id,
              registro.instrumento_id || undefined,
              registro.comum_id.startsWith('comum_fora_')
            ),
          ]);

          const comum = resolveComumById(comuns, registro.comum_id);
          const cargo = cargos.find(c => c.id === registro.cargo_id);
          const pessoa = pessoas.find(p => p.id === registro.pessoa_id);

          if (comum && cargo && pessoa) {
            const nomeBusca = `${pessoa.nome} ${pessoa.sobrenome}`.trim().toUpperCase();
            const comumBusca = comum.nome.toUpperCase();
            const cargoBusca = cargo.nome.toUpperCase();

            const rData = new Date(duplicataLocal.data_hora_registro);
            const dataFormatada = formatDate(rData);
            const horarioFormatado = formatTime(rData);

            return {
              success: false,
              error: `DUPLICATA:${nomeBusca}|${comumBusca}|${dataFormatada}|${horarioFormatado}`,
            };
          }
        }
      } catch (error) {
        console.warn('⚠️ Erro ao verificar duplicatas locais (continuando...):', error);
        // Continuar mesmo com erro na verificação local
      }
    }

    // 🚨 CORREÇÃO: Sempre usar UUID v4 válido (formato: 75aef8f7-86fc-49fe-8a0c-973c9658d6e8)
    // Não usar UUID local - sempre gerar UUID válido para compatibilidade com Supabase e Google Sheets
    const uuidFinal = registro.id && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(registro.id)
      ? registro.id
      : uuidv4();

    if (isOnline) {
      try {
        // 🚀 OTIMIZAÇÃO: Enviar para Google Sheets e Supabase EM PARALELO (mais rápido)
        // Google Sheets é mais rápido, mas Supabase pode ser feito em paralelo sem bloquear

        const registroComId = {
          ...registro,
          id: uuidFinal,
        };

        // Enviar ambos em paralelo - Google Sheets é crítico, Supabase é secundário
        // 🚨 CORREÇÃO CRÍTICA: NÃO capturar erros de duplicata silenciosamente
        const [sheetsResult, supabaseResult] = await Promise.allSettled([
          googleSheetsService.sendRegistroToSheet(registroComId),
          // Supabase em paralelo (não bloqueia se falhar, EXCETO duplicata)
          supabaseDataService.createRegistroPresenca(registroComId, skipDuplicateCheck).catch(err => {
            // 🚨 CORREÇÃO: Se for erro de duplicata, propagar o erro (não ignorar)
            if (err instanceof Error && (
              err.message.includes('DUPLICATA') ||
              err.message.includes('DUPLICATA_BLOQUEADA') ||
              err.message.includes('duplicat')
            )) {
              console.error('🚨 Erro de duplicata no Supabase - propagando erro:', err.message);
              throw err; // Propagar erro de duplicata
            }
            // Outros erros do Supabase podem ser ignorados (não críticos)
            console.warn('⚠️ Erro ao enviar para Supabase (não crítico):', err.message);
            return null; // Não falhar se Supabase der erro (exceto duplicata)
          })
        ]);

        const sheetsSuccess = sheetsResult.status === 'fulfilled' && sheetsResult.value.success;
        const supabaseSuccess = supabaseResult.status === 'fulfilled' && supabaseResult.value !== null;

        // 🚨 CORREÇÃO CRÍTICA: Verificar se Supabase retornou erro de duplicata
        // Se retornou erro de duplicata, bloquear mesmo que Google Sheets tenha sucesso
        if (supabaseResult.status === 'rejected') {
          const supabaseError = supabaseResult.reason;
          if (supabaseError instanceof Error && (
            supabaseError.message.includes('DUPLICATA') ||
            supabaseError.message.includes('DUPLICATA_BLOQUEADA') ||
            supabaseError.message.includes('duplicat')
          )) {
            console.error('🚨 Duplicata detectada no Supabase (bloqueando mesmo com Google Sheets OK):', supabaseError.message);
            // Extrair informações do erro para retornar ao usuário
            let errorMessage = supabaseError.message;
            if (errorMessage.includes('DUPLICATA_BLOQUEADA:')) {
              errorMessage = errorMessage.replace('DUPLICATA_BLOQUEADA:', 'DUPLICATA:');
            }
            return {
              success: false,
              error: errorMessage,
            };
          }
        }

        if (sheetsSuccess) {
          // Sucesso - retornar imediatamente (logs reduzidos para performance)
          const tempoTotal = performance.now() - inicioTempo;
          if (tempoTotal > 2000) {
            // Logar apenas se demorar mais de 2s
            console.log(`⏱️ Registro processado em ${tempoTotal.toFixed(2)}ms`);
          }
          return { success: true };
        } else {
          // Google Sheets falhou - verificar se é erro de conectividade
          const sheetsError = sheetsResult.status === 'rejected'
            ? sheetsResult.reason?.message || String(sheetsResult.reason)
            : sheetsResult.status === 'fulfilled' && !sheetsResult.value.success
              ? sheetsResult.value.error || 'Erro desconhecido'
              : 'Erro desconhecido';

          const isNetworkError =
            sheetsError?.includes('Failed to fetch') ||
            sheetsError?.includes('Timeout') ||
            sheetsError?.includes('Network') ||
            sheetsError?.includes('AbortError');

          if (isNetworkError) {
            // Erro de conectividade - salvar na fila
            console.warn('⚠️ Erro de conectividade ao enviar para Google Sheets, salvando na fila:', sheetsError);
            await supabaseDataService.saveRegistroToLocal({
              ...registro,
              id: uuidFinal,
              status_sincronizacao: 'pending',
            });
            const tempoTotal = performance.now() - inicioTempo;
            console.log(`⏱️ Registro salvo localmente em ${tempoTotal.toFixed(2)}ms (sem conexão)`);
            return {
              success: true,
              error: 'Registro salvo localmente. Será enviado quando a conexão voltar.',
            };
          } else {
            // Outro erro do Google Sheets - tentar Supabase como fallback
            console.warn('⚠️ Erro ao enviar para Google Sheets, tentando Supabase como fallback:', sheetsError);
            try {
              // O método createRegistroPresenca já trata UUID local automaticamente
              const createdRegistro = await supabaseDataService.createRegistroPresenca(
                {
                  ...registro,
                  id: uuidFinal, // Pode ser local, será convertido para válido dentro do método
                },
                skipDuplicateCheck
              );
              if (createdRegistro) {
                const tempoTotal = performance.now() - inicioTempo;
                console.log(`✅ Registro enviado para Supabase (fallback) em ${tempoTotal.toFixed(2)}ms`);
                return { success: true };
              }
            } catch (supabaseError) {
              // Verificar se é erro de duplicata
              if (
                supabaseError instanceof Error &&
                (supabaseError.message.includes('DUPLICATA') ||
                  supabaseError.message.includes('duplicat') ||
                  supabaseError.message.includes('já foi cadastrado') ||
                  supabaseError.message.includes('DUPLICATA_BLOQUEADA'))
              ) {
                console.error('🚨 Duplicata detectada no Supabase:', supabaseError.message);
                return {
                  success: false,
                  error: supabaseError.message.includes('DUPLICATA_BLOQUEADA')
                    ? supabaseError.message.replace('DUPLICATA_BLOQUEADA: ', '')
                    : supabaseError.message,
                };
              }
              // Ambos falharam - salvar na fila
              console.error('❌ Ambos Google Sheets e Supabase falharam, salvando na fila:', supabaseError);
              await supabaseDataService.saveRegistroToLocal({
                ...registro,
                id: uuidFinal,
                status_sincronizacao: 'pending',
              });
              return {
                success: true,
                error: 'Registro salvo localmente. Será sincronizado automaticamente quando possível.',
              };
            }
          }
        }
      } catch (error) {
        // Verificar se é erro de duplicata
        if (error instanceof Error && error.message.includes('DUPLICATA_BLOQUEADA')) {
          return {
            success: false,
            error: error.message.replace('DUPLICATA_BLOQUEADA: ', ''),
          };
        }

        // Verificar se é erro de conectividade
        const isNetworkError =
          error instanceof Error &&
          (error.message.includes('Failed to fetch') ||
            error.message.includes('Timeout') ||
            error.message.includes('Network') ||
            error.message.includes('AbortError'));

        if (isNetworkError) {
          // Erro de conectividade - salvar na fila
          console.warn('⚠️ Erro de conectividade, salvando na fila:', error);
          await supabaseDataService.saveRegistroToLocal({
            ...registro,
            id: uuidFinal,
            status_sincronizacao: 'pending',
          });
          return {
            success: true,
            error: 'Registro salvo localmente. Será enviado quando a conexão voltar.',
          };
        }

        // Outro erro - salvar na fila
        console.error('❌ Erro ao processar registro, salvando na fila:', error);
        await supabaseDataService.saveRegistroToLocal({
          ...registro,
          id: uuidFinal,
          status_sincronizacao: 'pending',
        });
        return {
          success: true,
          error: 'Registro salvo localmente. Será sincronizado automaticamente quando possível.',
        };
      }
    } else {
      // Offline: salvar localmente como pending
      try {
        console.log('📱 Modo offline detectado, salvando registro localmente...');
        await supabaseDataService.saveRegistroToLocal({
          ...registro,
          id: uuidFinal,
          status_sincronizacao: 'pending',
        });
        console.log('✅ Registro salvo localmente com sucesso (ID:', uuidFinal, ')');
        return {
          success: true,
          error: 'Registro salvo localmente. Será sincronizado quando a conexão voltar.',
        };
      } catch (error) {
        console.error('❌ ERRO CRÍTICO ao salvar registro localmente quando offline:', error);
        // Mesmo com erro, tentar retornar sucesso para não bloquear o usuário
        // O erro será logado para debug
        return {
          success: false,
          error: `Erro ao salvar registro localmente: ${error instanceof Error ? error.message : String(error)}`,
        };
      }
    }
  },
};
