import NetInfo from '@react-native-community/netinfo';
import { supabaseDataService } from './supabaseDataService';
import { googleSheetsService } from './googleSheetsService';
import { RegistroPresenca } from '../types/models';
import { authService } from './authService';
import { uuidv4 } from '../utils/uuid';
import { supabase, isSupabaseConfigured } from './supabaseClient';
import { formatDate, formatTime } from '../utils/dateUtils';

// 🚨 PROTEÇÃO: Flag global para evitar processamento duplicado simultâneo
let isProcessingQueue = false;
let lastProcessTimestamp = 0;
const PROCESS_COOLDOWN = 2000; // 2 segundos de cooldown entre processamentos

export const offlineSyncService = {
  async isOnline(): Promise<boolean> {
    const state = await NetInfo.fetch();
    return state.isConnected === true && state.isInternetReachable === true;
  },

  async syncAllData(): Promise<{ success: boolean; error?: string; syncResult?: { successCount: number; totalCount: number } }> {
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

      // Sincronizar dados de referência (com tratamento de erro individual para não quebrar tudo)
      try {
        await supabaseDataService.syncComunsToLocal();
      } catch (error) {
        console.warn(
          '⚠️ Erro ao sincronizar comuns (continuando...):',
          error instanceof Error ? error.message : error
        );
      }

      try {
        await supabaseDataService.syncCargosToLocal();
      } catch (error) {
        console.warn(
          '⚠️ Erro ao sincronizar cargos (continuando...):',
          error instanceof Error ? error.message : error
        );
      }

      try {
        await supabaseDataService.syncInstrumentosToLocal();
      } catch (error) {
        console.warn(
          '⚠️ Erro ao sincronizar instrumentos (continuando...):',
          error instanceof Error ? error.message : error
        );
      }

      // Pessoas são buscadas diretamente da tabela cadastro quando necessário
      // await supabaseDataService.syncPessoasToLocal(); // REMOVIDO - não existe tabela pessoas

      // Sincronizar registros pendentes
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
  async processarFilaLocal(): Promise<{ successCount: number; errorCount: number }> {
    // 🚨 PROTEÇÃO: Evitar processamento duplicado simultâneo (ex: F5, múltiplos eventos online)
    const now = Date.now();
    if (isProcessingQueue) {
      console.log('⚠️ Processamento da fila já em andamento, ignorando chamada duplicada');
      return { successCount: 0, errorCount: 0 };
    }
    
    // Verificar cooldown para evitar processamento muito frequente (ex: F5 repetido)
    if (now - lastProcessTimestamp < PROCESS_COOLDOWN) {
      const remainingCooldown = PROCESS_COOLDOWN - (now - lastProcessTimestamp);
      console.log(`⚠️ Processamento muito recente, aguardando ${remainingCooldown}ms antes de processar novamente`);
      return { successCount: 0, errorCount: 0 };
    }
    
    // Marcar como processando
    isProcessingQueue = true;
    lastProcessTimestamp = now;
    
    try {
      // Buscar fila
      const registros = await supabaseDataService.getRegistrosPendentesFromLocal();
      
      if (registros.length === 0) {
        console.log('📭 Fila vazia, nada para processar');
        return { successCount: 0, errorCount: 0 };
      }
      
      // Testa conectividade antes de processar (com retry)
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
        return { successCount: 0, errorCount: 0 };
      }
      
      console.log(`🔄 Processando fila local: ${registros.length} item(s)`);
      
      const itensProcessados: RegistroPresenca[] = [];
      const itensComErro: RegistroPresenca[] = [];
      
      for (let i = 0; i < registros.length; i++) {
        const item = registros[i];
        
        // Verificar conectividade antes de cada item
        const stillOnline = await this.isOnline();
        if (!stillOnline) {
          console.log('⚠️ Conexão perdida durante processamento, interrompendo...');
          // Adicionar itens restantes de volta à fila
          itensComErro.push(...registros.slice(i));
          break;
        }
        
        try {
          console.log(`📤 Processando item ${i + 1}/${registros.length}: ${item.pessoa_id}`);
          
          // Validar item antes de processar
          if (!item.pessoa_id || !item.comum_id || !item.cargo_id) {
            console.warn(`⚠️ Item ${i + 1}: Dados incompletos, removendo da fila`);
            itensProcessados.push(item); // Remover da fila
            continue;
          }
          
          // Tenta enviar para Google Sheets primeiro (mais crítico)
          const sheetsResult = await googleSheetsService.sendRegistroToSheet(item);
          if (sheetsResult.success) {
            console.log(`✅ Item ${i + 1}: Google Sheets OK`);
            
            // 🚨 CORREÇÃO CRÍTICA: Remover da fila IMEDIATAMENTE após sucesso no Google Sheets
            // Isso previne que o mesmo registro seja processado novamente em caso de retry ou erro subsequente
            if (item.id) {
              try {
                await supabaseDataService.deleteRegistroFromLocal(item.id);
                console.log(`🗑️ Item ${i + 1}: Removido da fila imediatamente após sucesso no Google Sheets`);
              } catch (deleteError) {
                console.warn(`⚠️ Item ${i + 1}: Erro ao remover da fila (não crítico):`, deleteError);
              }
            }
            
            // Tenta enviar para Supabase (secundário, não bloqueia)
            try {
              await supabaseDataService.createRegistroPresenca(item, true);
              console.log(`✅ Item ${i + 1}: Supabase OK`);
            } catch (e: any) {
              // 🚨 CORREÇÃO: Tratar erro de constraint (23505) como sucesso - registro já existe
              const isConstraintError = 
                e.code === '23505' || 
                e.message?.includes('duplicate key') || 
                e.message?.includes('already exists') ||
                e.message?.includes('pessoas_pkey') ||
                e.message?.includes('presencas_pkey');
              
              if (isConstraintError) {
                console.log(`✅ Item ${i + 1}: Registro já existe no Supabase (constraint) - tratado como sucesso`);
              } else {
                console.warn(`⚠️ Item ${i + 1}: Erro no Supabase (não crítico):`, e.message);
              }
              // Continua mesmo se Supabase falhar (Google Sheets já salvou e registro já foi removido da fila)
            }
            
            itensProcessados.push(item);
          } else {
            // Verificar se é erro de rede ou erro de dados
            const isNetworkError = 
              sheetsResult.error?.includes('Failed to fetch') ||
              sheetsResult.error?.includes('Timeout') ||
              sheetsResult.error?.includes('Network') ||
              sheetsResult.error?.includes('AbortError');
            
            if (isNetworkError) {
              // Erro de rede - manter na fila
              throw new Error('Erro de rede ao enviar para Google Sheets');
            } else {
              // Erro de dados - tentar Supabase como fallback
              console.warn(`⚠️ Item ${i + 1}: Erro no Google Sheets, tentando Supabase...`);
              try {
                await supabaseDataService.createRegistroPresenca(item, true);
                console.log(`✅ Item ${i + 1}: Supabase OK (fallback)`);
                
                // 🚨 CORREÇÃO CRÍTICA: Remover da fila IMEDIATAMENTE após sucesso no Supabase (fallback)
                if (item.id) {
                  try {
                    await supabaseDataService.deleteRegistroFromLocal(item.id);
                    console.log(`🗑️ Item ${i + 1}: Removido da fila após sucesso no Supabase (fallback)`);
                  } catch (deleteError) {
                    console.warn(`⚠️ Item ${i + 1}: Erro ao remover da fila (não crítico):`, deleteError);
                  }
                }
                
                itensProcessados.push(item);
              } catch (supabaseError: any) {
                // 🚨 CORREÇÃO: Tratar erro de constraint (23505) como sucesso - registro já existe
                const isConstraintError = 
                  supabaseError.code === '23505' || 
                  supabaseError.message?.includes('duplicate key') || 
                  supabaseError.message?.includes('already exists') ||
                  supabaseError.message?.includes('pessoas_pkey') ||
                  supabaseError.message?.includes('presencas_pkey');
                
                // Verificar se é duplicata ou constraint
                if (supabaseError.message?.includes('DUPLICATA') || supabaseError.message?.includes('duplicat') || isConstraintError) {
                  console.log(`✅ Item ${i + 1}: Registro já existe (duplicata/constraint) - removendo da fila`);
                  
                  // 🚨 CORREÇÃO CRÍTICA: Remover da fila IMEDIATAMENTE quando duplicata/constraint detectada
                  if (item.id) {
                    try {
                      await supabaseDataService.deleteRegistroFromLocal(item.id);
                      console.log(`🗑️ Item ${i + 1}: Removido da fila (duplicata/constraint detectada)`);
                    } catch (deleteError) {
                      console.warn(`⚠️ Item ${i + 1}: Erro ao remover duplicata da fila:`, deleteError);
                    }
                  }
                  
                  itensProcessados.push(item); // Remover da fila
                } else {
                  throw supabaseError;
                }
              }
            }
          }
          
        } catch (error: any) {
          console.error(`❌ Item ${i + 1}: Erro:`, error.message);
          
          // Incrementa tentativas
          const tentativas = (item as any).tentativas || 0;
          (item as any).tentativas = tentativas + 1;
          
          // Se já tentou 3 vezes, remove da fila
          if ((item as any).tentativas >= 3) {
            console.log(`🗑️ Item ${i + 1}: Removido após 3 tentativas`);
            
            // 🚨 CORREÇÃO CRÍTICA: Remover da fila IMEDIATAMENTE após 3 tentativas
            if (item.id) {
              try {
                await supabaseDataService.deleteRegistroFromLocal(item.id);
                console.log(`🗑️ Item ${i + 1}: Removido da fila após 3 tentativas`);
              } catch (deleteError) {
                console.warn(`⚠️ Item ${i + 1}: Erro ao remover da fila após 3 tentativas:`, deleteError);
              }
            }
            
            itensProcessados.push(item); // Remover da fila
          } else {
            itensComErro.push(item); // Manter na fila para retry
          }
        }
        
        // Pequena pausa entre itens para não sobrecarregar
        if (i < registros.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 300));
        }
      }
      
      // Atualiza fila removendo itens processados
      // Salvar apenas itens com erro de volta na fila
      if (itensComErro.length > 0) {
        const filaKey = 'fila_registros_presenca';
        const { robustSetItem } = await import('../utils/robustStorage');
        await robustSetItem(filaKey, JSON.stringify(itensComErro));
      } else {
        // Se não há erros, limpar fila completamente
        const filaKey = 'fila_registros_presenca';
        const { robustRemoveItem } = await import('../utils/robustStorage');
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
      
      const result = {
        successCount: itensProcessados.length,
        errorCount: itensComErro.length,
      };
      
      console.log(`✅ Fila processada: ${result.successCount} enviados, ${result.errorCount} com erro`);
      
      // Mostrar toast quando processa fila
      if (result.successCount > 0) {
        const { showToast } = await import('../utils/toast');
        if (result.errorCount > 0) {
          showToast.success(
            'Fila processada', 
            `${result.successCount} enviado(s), ${result.errorCount} pendente(s)`
          );
        } else {
          showToast.success('Fila processada', `${result.successCount} registro(s) enviado(s) com sucesso!`);
        }
        console.log(`✅ ${result.successCount} registro(s) enviado(s) com sucesso!`);
      } else if (result.errorCount > 0) {
        const { showToast } = await import('../utils/toast');
        showToast.warning('Fila não processada', `${result.errorCount} registro(s) aguardando conexão estável`);
      }
      
      return result;
      
    } catch (error) {
      console.error('❌ Erro ao processar fila local:', error);
      return { successCount: 0, errorCount: 0 };
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
    
    // 🚀 OTIMIZAÇÃO: Verificar status online de forma rápida (sem logs desnecessários)
    let isOnline = false;
    try {
      isOnline = await this.isOnline();
    } catch (error) {
      // Se houver erro na verificação, assumir offline para garantir que salve localmente
      isOnline = false;
    }

    // 🛡️ VERIFICAÇÃO DE DUPLICADOS NO SUPABASE PRIMEIRO (se online)
    // Deve verificar ANTES de salvar em qualquer lugar
    // Verifica por nome + comum + cargo + data (mais rigoroso que UUID)
    // Pular verificação se skipDuplicateCheck = true (usuário confirmou duplicata)
    if (isOnline && !skipDuplicateCheck) {
      try {
        // 🚀 OTIMIZAÇÃO: Buscar apenas o necessário (evitar buscar pessoas se nome manual)
        const isNomeManual = registro.pessoa_id.startsWith('manual_');
        
        // Buscar comuns e cargos sempre (são rápidos do cache)
        const [comuns, cargos] = await Promise.all([
          supabaseDataService.getComunsFromLocal(),
          supabaseDataService.getCargosFromLocal(),
        ]);

        const comum = comuns.find(c => c.id === registro.comum_id);
        const cargo = cargos.find(c => c.id === registro.cargo_id);

        if (comum && cargo) {
          let nomeCompleto = '';
          let cargoReal = cargo.nome; // Usar cargo selecionado como padrão

          if (isNomeManual) {
            // 🚀 OTIMIZAÇÃO: Não buscar pessoas se nome manual
            nomeCompleto = registro.pessoa_id.replace(/^manual_/, '').toUpperCase();
            cargoReal = cargo.nome;
          } else {
            // Buscar pessoas apenas se necessário
            const pessoas = await supabaseDataService.getPessoasFromLocal(
              registro.comum_id,
              registro.cargo_id,
              registro.instrumento_id || undefined
            );
            const pessoa = pessoas.find(p => p.id === registro.pessoa_id);
            if (pessoa) {
              nomeCompleto = (pessoa.nome_completo || `${pessoa.nome} ${pessoa.sobrenome}`)
                .trim()
                .toUpperCase();
              cargoReal = pessoa.cargo_real || cargo.nome;
            }
          }

          const comumBusca = comum.nome.toUpperCase();
          const cargoBusca = cargoReal.toUpperCase(); // Usar cargo REAL, não o selecionado

          // Verificar duplicata no Supabase ANTES de salvar
          const dataRegistro = new Date(registro.data_hora_registro);
          const dataInicio = new Date(
            dataRegistro.getFullYear(),
            dataRegistro.getMonth(),
            dataRegistro.getDate()
          );
          const dataFim = new Date(dataInicio);
          dataFim.setDate(dataFim.getDate() + 1);

          // Usar supabase diretamente para verificar
          if (isSupabaseConfigured() && supabase) {
            // 🚀 OTIMIZAÇÃO: Query com timeout e limit(1) para parar na primeira duplicata (mais rápido)
            const duplicataPromise = supabase
              .from('presencas')
              .select('uuid, nome_completo, comum, cargo, data_ensaio, created_at')
              .ilike('nome_completo', nomeCompleto)
              .ilike('comum', comumBusca)
              .ilike('cargo', cargoBusca)
              .gte('data_ensaio', dataInicio.toISOString())
              .lt('data_ensaio', dataFim.toISOString())
              .limit(1); // 🚀 OTIMIZAÇÃO: Parar na primeira duplicata encontrada (mais rápido)
            
            // 🚀 OTIMIZAÇÃO: Timeout de 2 segundos para não bloquear muito tempo
            const timeoutPromise = new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Timeout na verificação de duplicatas')), 2000)
            );
            
            const { data: duplicatas, error: duplicataError } = await Promise.race([
              duplicataPromise,
              timeoutPromise
            ]) as any;

            // Se for timeout, continuar (não bloquear)
            if (duplicataError && duplicataError.message?.includes('Timeout')) {
              console.warn('⚠️ Timeout na verificação de duplicatas (continuando...):', duplicataError.message);
            } else if (!duplicataError && duplicatas && duplicatas.length > 0) {
              // Duplicata encontrada = bloquear
              const duplicata = duplicatas[0];
              console.error('🚨🚨🚨 DUPLICATA DETECTADA NO SUPABASE - BLOQUEANDO 🚨🚨🚨', {
                nome: nomeCompleto,
                comum: comumBusca,
                cargo: cargoBusca,
                uuidExistente: duplicata.uuid,
                dataExistente: duplicata.data_ensaio,
              });

              // Formatar data e horário do registro existente usando funções utilitárias
              try {
                const dataExistente = new Date(duplicata.data_ensaio || duplicata.created_at);
                const dataFormatada = formatDate ? formatDate(dataExistente) : dataExistente.toLocaleDateString('pt-BR');
                const horarioFormatado = formatTime ? formatTime(dataExistente) : dataExistente.toLocaleTimeString('pt-BR');

                return {
                  success: false,
                  error: `DUPLICATA:${nomeCompleto}|${comumBusca}|${dataFormatada}|${horarioFormatado}`,
                };
              } catch (formatError) {
                // Se erro ao formatar, usar data ISO como fallback
                console.warn('⚠️ Erro ao formatar data da duplicata:', formatError);
                return {
                  success: false,
                  error: `DUPLICATA:${nomeCompleto}|${comumBusca}|${duplicata.data_ensaio}|${duplicata.created_at}`,
                };
              }
            }
          }
        }
      } catch (error) {
        console.warn('⚠️ Erro ao verificar duplicatas no Supabase (continuando...):', error);
        // Se houver erro na verificação online, continuar com verificação local
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
              registro.instrumento_id || undefined
            ),
          ]);

          const comum = comuns.find(c => c.id === registro.comum_id);
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
