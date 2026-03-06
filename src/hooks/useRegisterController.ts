import React, { useState, useEffect, useMemo, useLayoutEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
} from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { useAuthContext } from '../context/AuthContext';
import { SimpleSelectField } from '../components/SimpleSelectField';
import { AutocompleteField, AutocompleteFieldRef } from '../components/AutocompleteField';
import { NameSelectField } from '../components/NameSelectField';
import { TextInputField } from '../components/TextInputField';
import { PrimaryButton } from '../components/PrimaryButton';
import { OfflineBadge } from '../components/OfflineBadge';
import { AppHeader } from '../components/AppHeader';
import { DuplicateModal } from '../components/DuplicateModal';
import { NewRegistrationModal } from '../components/NewRegistrationModal';
import { theme } from '../theme';
import { supabaseDataService } from '../services/supabaseDataService';
import { offlineSyncService } from '../services/offlineSyncService';
import { googleSheetsService } from '../services/googleSheetsService';
import { useOfflineQueue } from '../hooks/useOfflineQueue';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { Comum, Cargo, Instrumento, Pessoa, RegistroPresenca } from '../types/models';
import { normalizeString } from '../utils/stringNormalization';
import { cacheManager } from '../utils/cacheManager';
import { getCurrentDateTimeISO, formatDate, formatTime } from '../utils/dateUtils';
import { localStorageService } from '../services/localStorageService';
import { showToast } from '../utils/toast';
import { useNavigation } from '@react-navigation/native';
import { getNaipeByInstrumento } from '../utils/instrumentNaipe';
import { formatRegistradoPor } from '../utils/userNameUtils';
import { generateExternalUUID } from '../utils/uuid';

export const useRegisterController = () => {
  const { user } = useAuthContext();

  // Definir título da página na web
  useLayoutEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      document.title = 'CCB | Contagem EnR';
    }
  }, []);
  const navigation = useNavigation();
  const { isOnline, setOnStatusChange } = useOnlineStatus();
  const { pendingCount, refreshCount } = useOfflineQueue();

  const [comuns, setComuns] = useState<Comum[]>([]);
  const [cargos, setCargos] = useState<Cargo[]>([]);
  const [instrumentos, setInstrumentos] = useState<Instrumento[]>([]);
  const [pessoas, setPessoas] = useState<Pessoa[]>([]);
  const [loadingPessoas, setLoadingPessoas] = useState(false);

  const [selectedComum, setSelectedComum] = useState<string>('');
  const [selectedCargo, setSelectedCargo] = useState<string>('');
  const [selectedInstrumento, setSelectedInstrumento] = useState<string>('');
  const [selectedPessoa, setSelectedPessoa] = useState<string>('');
  const [isNomeManual, setIsNomeManual] = useState(false);
  const [nameFieldKey, setNameFieldKey] = useState(0); // Key para forçar remontagem do NameSelectField

  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const syncIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const loadPessoasTimeoutRef = useRef<NodeJS.Timeout | null>(null); // 🚀 OTIMIZAÇÃO: Ref para debounce
  const comumFieldRef = useRef<AutocompleteFieldRef>(null); // 🚀 REF: Para focar no campo de comum após registro
  const [duplicateModalVisible, setDuplicateModalVisible] = useState(false);
  const [duplicateInfo, setDuplicateInfo] = useState<{
    nome: string;
    comum: string;
    data: string;
    horario: string;
  } | null>(null);
  const [pendingRegistro, setPendingRegistro] = useState<RegistroPresenca | null>(null);
  const [newRegistrationModalVisible, setNewRegistrationModalVisible] = useState(false);

  // 🚨 PROTEÇÃO SÍNCRONA: Ref contra duplo-clique acidental (debounce/throttle de React State)
  const isSubmittingRef = useRef<boolean>(false);

  // 🚨 CORREÇÃO: Modal funciona offline - salva na fila automaticamente quando não há conexão

  // Mostrar campo de instrumento apenas para Músico
  // Organista NÃO mostra campo de instrumento (sempre toca órgão)
  const selectedCargoObj = cargos.find(c => c.id === selectedCargo);
  const cargoNome = selectedCargoObj?.nome || '';
  const isOrganista = cargoNome === 'Organista';
  const isCandidato = cargoNome === 'Candidato (a)';
  // Mostrar campo de instrumento apenas para Músico (não para Organista nem Candidato)
  // Candidatos têm instrumento na tabela, será buscado automaticamente ao enviar
  const showInstrumento = !isOrganista && !isCandidato && selectedCargoObj?.is_musical;

  // Função de sincronização - declarada ANTES dos useEffects que a usam
  const syncData = useCallback(async () => {
    // Verificar se já está sincronizando
    if (syncing) {
      console.log('⏳ Sincronização já em andamento, aguardando...');
      return;
    }

    // Verificar se está online antes de sincronizar
    const isOnlineNow = isOnline;


    if (!isOnlineNow) {
      console.log('📴 Sem conexão - não é possível sincronizar agora');
      return;
    }

    try {
      setSyncing(true);
      console.log('🔄 [SYNC] Iniciando sincronização de dados...');

      // Verificar quantos registros pendentes existem
      const registrosPendentes = await supabaseDataService.getRegistrosPendentesFromLocal();
      console.log(`📊 [SYNC] ${registrosPendentes.length} registro(s) pendente(s) encontrado(s)`);

      if (registrosPendentes.length === 0) {
        console.log('📭 [SYNC] Nenhum registro pendente para sincronizar');
        setSyncing(false);
        return;
      }

      // Atualizar contador antes de sincronizar
      await refreshCount();

      // Sincronizar apenas registros pendentes (mais eficiente)
      const result = await offlineSyncService.syncPendingRegistros();

      console.log(
        `📊 [SYNC] Resultado: ${result.successCount} de ${result.totalCount} registros enviados`
      );

      // Atualizar contador após sincronizar
      await refreshCount();

      // Mostrar toast se registros foram sincronizados (igual ao contpedras)
      if (result.successCount > 0) {
        const mensagem =
          result.successCount === 1
            ? '1 item sincronizado'
            : `${result.successCount} itens sincronizados`;
        // Mostrar apenas mensagem, sem título (igual ao contpedras)
        showToast.success(mensagem);
      }
    } catch (error) {
      // Não logar erros de rede como erros críticos
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (
        !errorMessage.toLowerCase().includes('fetch') &&
        !errorMessage.toLowerCase().includes('network') &&
        !errorMessage.toLowerCase().includes('internet')
      ) {
        console.error('❌ [SYNC] Erro ao sincronizar:', error);
      } else {
        console.log('📴 [SYNC] Erro de rede (esperado se offline):', errorMessage);
      }
    } finally {
      setSyncing(false);
    }
  }, [syncing, isOnline, refreshCount]);

  useEffect(() => {
    loadInitialData(false);
  }, []);

  // Configurar listener para mudanças de status de conexão
  useEffect(() => {
    setOnStatusChange((newStatus: boolean) => {
      if (!newStatus) {
        // Conexão caiu - apenas logar, sem exibir alerta
        console.log('📵 Conexão perdida - modo offline ativado');
      } else {
        // Conexão restaurada - SINCRONIZAR IMEDIATAMENTE
        console.log('🌐 Conexão restaurada - iniciando sincronização automática...');

        // Verificar se há registros pendentes antes de sincronizar
        supabaseDataService
          .getRegistrosPendentesFromLocal()
          .then(registros => {
            if (registros.length > 0) {
              console.log(
                `🔄 ${registros.length} registro(s) pendente(s) encontrado(s) - iniciando sincronização...`
              );
              // Aguardar um pouco para garantir que a conexão está estável
              setTimeout(() => {
                if (!syncing) {
                  syncData().catch(error => {
                    console.error('❌ Erro na sincronização automática ao voltar online:', error);
                  });
                }
              }, 1500); // Reduzido para 1.5s para ser mais rápido
            } else {
              console.log('📭 Nenhum registro pendente para sincronizar');
            }
          })
          .catch(error => {
            console.error('❌ Erro ao verificar registros pendentes:', error);
            // Tentar sincronizar mesmo assim
            setTimeout(() => {
              if (!syncing) {
                syncData().catch(err => {
                  console.error('❌ Erro na sincronização automática:', err);
                });
              }
            }, 1500);
          });
      }
    });
  }, [setOnStatusChange, syncing, syncData]);

  // 🚨 SISTEMA EXATO DO BACKUPCONT: Listener para evento online
  useEffect(() => {
    const handleOnline = async () => {
      console.log('🌐 Evento online detectado - verificando conectividade real');

      // Aguardar um pouco para garantir que a conexão está estável (como BACKUPCONT)
      setTimeout(async () => {
        try {
          const isReallyOnline = await offlineSyncService.isOnline();
          if (isReallyOnline) {
            console.log('✅ Conectividade real confirmada - processando fila');
            // 🚨 MENSAGEM EXATA DO BACKUPCONT: Mostrar toast quando volta online
            // showToast.success('Conexão restaurada', 'Enviando registros pendentes...');
            // Usar processarFilaLocal que é exatamente como BACKUPCONT
            await offlineSyncService.processarFilaLocal();
            console.log('✅ Fila processada automaticamente');
          } else {
            console.log('⚠️ Evento online falso - mantendo modo offline');
          }
        } catch (e) {
          console.error('❌ Erro ao verificar conectividade:', e);
        }
      }, 3000); // 3 segundos (exatamente como BACKUPCONT)
    };

    const handleOffline = () => {
      console.log('📵 Conexão perdida - modo offline ativado');
      // 🚨 MENSAGEM EXATA DO BACKUPCONT: Mostrar toast quando fica offline
      showToast.warning('Modo offline', 'Registros serão salvos na fila');
    };

    // Adicionar listener apenas na web (React Native usa NetInfo)
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);
      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      };
    }

    // Para React Native, usar NetInfo listener
    if (Platform.OS !== 'web') {
      let lastStatus: boolean | null = null;

      const unsubscribe = NetInfo.addEventListener(state => {
        const isConnectedNow = state.isConnected === true && state.isInternetReachable === true;

        // 🚨 CRÍTICO: Só mostrar alerta quando status MUDAR (não na primeira verificação)
        if (lastStatus !== null && lastStatus !== isConnectedNow) {
          if (isConnectedNow) {
            // Voltou online
            console.log('✅ Conectividade restaurada - verificando...');
            setTimeout(async () => {
              try {
                const isReallyOnline = await offlineSyncService.isOnline();
                if (isReallyOnline) {
                  console.log('✅ Conectividade real confirmada - processando fila');
                  // showToast.success('Conexão restaurada', 'Enviando registros pendentes...', 3000);
                  await offlineSyncService.processarFilaLocal();
                }
              } catch (e) {
                console.error('❌ Erro ao verificar conectividade:', e);
              }
            }, 3000);
          } else {
            // Ficou offline
            console.log('📵 Conexão perdida - modo offline ativado');
            showToast.warning('Modo offline', 'Registros serão salvos na fila');
          }
        }

        lastStatus = isConnectedNow;
      });

      // Verificar status inicial
      NetInfo.fetch().then(state => {
        const initialStatus = state.isConnected === true && state.isInternetReachable === true;
        lastStatus = initialStatus;
        if (!initialStatus) {
          console.log('📵 Status inicial: offline');
        }
      });

      return () => {
        unsubscribe();
      };
    }
  }, []);

  // 🚨 SISTEMA EXATO DO BACKUPCONT: Processamento periódico da fila (a cada 30s)
  useEffect(() => {
    // Limpar intervalo anterior se existir
    if (syncIntervalRef.current) {
      clearInterval(syncIntervalRef.current);
      syncIntervalRef.current = null;
    }

    console.log('🔄 Iniciando processamento periódico da fila (a cada 30s) - como BACKUPCONT');

    syncIntervalRef.current = setInterval(async () => {
      try {
        // Verificar se há itens na fila (como BACKUPCONT)
        const fila = await supabaseDataService.getRegistrosPendentesFromLocal();

        if (fila.length > 0) {
          console.log('🔄 Processamento periódico da fila...');

          // Verifica conectividade real antes de processar (como BACKUPCONT)
          const isOnline = await offlineSyncService.isOnline();
          if (isOnline) {
            // Usar processarFilaLocal que é exatamente como BACKUPCONT
            await offlineSyncService.processarFilaLocal();
          } else {
            console.log('📵 Sem conectividade real - mantendo fila');
          }
        }
      } catch (error) {
        console.error('❌ Erro no processamento periódico:', error);
      }
    }, 30000); // A cada 30 segundos (exatamente como BACKUPCONT)

    // Cleanup: limpar intervalo quando componente desmontar
    return () => {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
        syncIntervalRef.current = null;
      }
    };
  }, []); // Sem dependências - sempre executar

  // 🚀 OTIMIZAÇÃO: Carregar com debounce leve (100ms) para evitar múltiplas chamadas rápidas
  // Mantém resposta rápida mas evita queries desnecessárias
  useEffect(() => {
    // Limpar timeout anterior se existir
    if (loadPessoasTimeoutRef.current) {
      clearTimeout(loadPessoasTimeoutRef.current);
    }

    // Verificar se precisa de instrumento obrigatório (apenas Músico)
    // Organista e Candidato(a) não precisam de instrumento obrigatório, mas podem ter
    const selectedCargoObj = cargos.find(c => c.id === selectedCargo);
    const cargoNome = selectedCargoObj?.nome || '';
    const precisaInstrumento = cargoNome === 'Músico'; // Apenas Músico requer instrumento obrigatório

    // Só carregar pessoas se tiver comum + cargo + (instrumento se necessário)
    if (selectedComum && selectedCargo) {
      if (precisaInstrumento && !selectedInstrumento) {
        // Precisa de instrumento mas não foi selecionado ainda
        setPessoas([]);
        setSelectedPessoa('');
        return;
      }
      // 🚀 OTIMIZAÇÃO: Debounce de 300ms (aumentado de 100ms) para evitar múltiplas chamadas rápidas
      // Reduz significativamente a carga no Supabase durante a seleção de campos
      loadPessoasTimeoutRef.current = setTimeout(() => {
        loadPessoas();
      }, 300);
    } else {
      setPessoas([]);
      setSelectedPessoa('');
    }

    // Cleanup: limpar timeout ao desmontar ou quando dependências mudarem
    return () => {
      if (loadPessoasTimeoutRef.current) {
        clearTimeout(loadPessoasTimeoutRef.current);
      }
    };
  }, [selectedComum, selectedCargo, selectedInstrumento, cargos]);

  const loadInitialData = async (isRefresh = false) => {
    try {
      if (!isRefresh) {
        setInitialLoading(true);
      }

      // Se está online, sempre tentar sincronizar primeiro (mas não travar se falhar)
      if (isOnline) {
        console.log('🔄 Sincronizando dados do Supabase...');
        try {
          await syncData();
        } catch (syncError) {
          console.warn('⚠️ Erro na sincronização inicial:', syncError);
        }
      }

      // Carregar do banco local/cache em paralelo (mais rápido)
      const [comunsData, cargosData, instrumentosData] = await Promise.all([
        supabaseDataService.getComunsFromLocal(),
        supabaseDataService.getCargosFromLocal(),
        (supabaseDataService as any).getInstrumentosFromLocal(),
      ]);

      console.log('📊 Dados carregados do local/cache:', {
        comuns: comunsData.length,
        cargos: cargosData.length,
        instrumentos: instrumentosData.length,
      });

      // Se ainda não há dados locais e está online, tentar buscar diretamente (fallback crítico)
      // 🚀 ATUALIZAÇÃO AUTOMÁTICA: Se estiver online, sempre tentar atualizar o cache em background
      // Mas se for um refresh manual, vamos esperar a resposta para atualizar a UI imediatamente
      let finalComuns = comunsData;

      if (isOnline) {
        if (isRefresh || comunsData.length === 0) {
          console.log('🔄 Sincronizando comuns diretamente do Supabase (aguardando)...');
          try {
            const comunsDiretas = await supabaseDataService.fetchComuns();
            if (comunsDiretas.length > 0) {
              finalComuns = comunsDiretas;
            }
          } catch (error) {
            console.warn('⚠️ Erro ao buscar comuns do Supabase:', error);
          }
        } else {
          // Sync em background se já temos dados mas queremos garantir que estão frescos
          console.log('🔄 Iniciando atualização de comuns em background...');
          supabaseDataService.syncComunsToLocal()
            .then(async () => {
              // Se o sync terminou, carregar os dados novos para a UI
              const novasComuns = await supabaseDataService.getComunsFromLocal();
              if (novasComuns.length > 0) {
                console.log(`✅ UI atualizada com ${novasComuns.length} comuns após sync de background`);
                setComuns(novasComuns);
              }
            })
            .catch(err => console.warn('⚠️ Erro no sync de background:', err));
        }

      }


      setComuns(finalComuns);
      setCargos(cargosData);
      setInstrumentos(instrumentosData);

      if (finalComuns.length === 0) {
        console.warn('⚠️ Nenhuma comum encontrada após todas as tentativas');
      }
    } catch (error) {
      console.error('❌ Erro crítico ao carregar dados iniciais:', error);
      Alert.alert('Erro', 'Não foi possível carregar os dados base. Verifique sua conexão.');
    } finally {
      if (!isRefresh) {
        setInitialLoading(false);
      }
    }
  };

  // Função helper para limpar todos os campos do formulário
  const clearAllFields = useCallback(() => {
    console.log('🧹 Limpando todos os campos do formulário');
    setSelectedComum('');
    setSelectedCargo('');
    setSelectedInstrumento('');
    setSelectedPessoa('');
    setIsNomeManual(false);
    setNameFieldKey(prev => prev + 1);

    setTimeout(() => {
      if (comumFieldRef.current) {
        comumFieldRef.current.focus();
        console.log('🎯 Focando no campo de comum após limpar formulário');
      }
    }, 100);
  }, []);

  // 🚀 FOCO AUTOMÁTICO: Focar no campo de comum após carregar a página (web e mobile)
  useEffect(() => {
    if (!initialLoading && comuns.length > 0) {
      // Aguardar um pouco para garantir que o componente está totalmente renderizado
      const focusTimeout = setTimeout(() => {
        if (comumFieldRef.current) {
          comumFieldRef.current.focus();
          console.log('🎯 Focando no campo de comum após carregar página');
        }
      }, 300);

      return () => clearTimeout(focusTimeout);
    }
  }, [initialLoading, comuns.length]);

  // Função para pull-to-refresh (otimizada com useCallback)
  const onRefresh = useCallback(async () => {
    if (refreshing || syncing) {
      console.log('⏳ Pull-to-refresh já em andamento, ignorando...');
      return;
    }

    try {
      setRefreshing(true);
      console.log('🔄 Pull-to-refresh: recarregando dados e limpando campos...');

      // 🚨 CRÍTICO: Limpar todos os campos do formulário primeiro
      console.log('🧹 Limpando campos do formulário...');
      clearAllFields();

      // Mostrar feedback visual imediato
      showToast.info('Atualizando...', 'Recarregando dados');

      // 1. Primeiro, sincronizar registros pendentes se estiver online
      if (isOnline) {
        console.log('🌐 Online - sincronizando registros pendentes primeiro...');
        try {
          await syncData();
        } catch (syncError) {
          console.warn('⚠️ Erro na sincronização durante pull-to-refresh:', syncError);
        }
      }

      // 2. Recarregar dados iniciais (comuns, cargos, instrumentos) - passando true para isRefresh
      console.log('📚 Recarregando dados iniciais...');
      await loadInitialData(true);

      // 3. Atualizar contador da fila
      console.log('📊 Atualizando contador da fila...');
      await refreshCount();

      // Feedback de sucesso
      showToast.success('Atualizado!', 'Dados recarregados e campos limpos');
      console.log('✅ Pull-to-refresh concluído com sucesso - campos limpos');
    } catch (error) {
      console.error('❌ Erro ao atualizar:', error);
      showToast.error('Erro', 'Não foi possível atualizar os dados');
    } finally {
      setRefreshing(false);
    }
  }, [refreshing, syncing, isOnline, syncData, refreshCount, loadInitialData]);

  const loadPessoas = async () => {
    // 🚀 OTIMIZAÇÃO: Verificar cache primeiro antes de mostrar loading
    // Buscar nomes de comum e cargo rapidamente (já estão em memória)
    const comumObj = comuns.find(c => c.id === selectedComum);
    const cargoObj = cargos.find(c => c.id === selectedCargo);
    const instrumentoObj =
      showInstrumento && selectedInstrumento
        ? instrumentos.find(i => i.id === selectedInstrumento)
        : undefined;

    if (!comumObj || !cargoObj) {
      setPessoas([]);
      return;
    }

    // 🚀 OTIMIZAÇÃO: Verificar cache ANTES de mostrar loading
    const CACHE_VERSION = 'v4'; // Sincronizado com supabaseDataService.ts
    const cacheKey = `pessoas_${CACHE_VERSION}_${comumObj.nome}_${cargoObj.nome}_${instrumentoObj?.nome || ''}`;

    try {
      // Tentar buscar do cache primeiro (síncrono/assíncrono rápido)
      const cached = await cacheManager.get<any[]>(cacheKey, 'pessoas');

      if (cached && cached.length > 0) {
        // 🚀 Cache encontrado - aplicar filtro de cargo e converter
        console.log(
          `✅ [loadPessoas] Cache encontrado: ${cached.length} pessoas - aplicando filtros`
        );

        // 🚨 CORREÇÃO: Aplicar filtro de cargo também nos dados do cache (mesma lógica do fetchPessoasFromCadastro)
        let filteredCached = cached;
        const cargoBusca = cargoObj.nome.trim().toUpperCase();
        if (
          cargoBusca !== 'ORGANISTA' &&
          cargoBusca !== 'MÚSICO' &&
          !cargoBusca.includes('MÚSICO')
        ) {
          const cargoBuscaNormalizado = normalizeString(cargoBusca);
          filteredCached = cached.filter((item: any) => {
            if (!item.cargo) return false;
            const itemCargoNormalizado = normalizeString(item.cargo.toUpperCase());

            if (itemCargoNormalizado === cargoBuscaNormalizado) return true;
            if (itemCargoNormalizado.includes(cargoBuscaNormalizado)) {
              const cargosConhecidos = [
                'ORGANISTA',
                'MÚSICO',
                'INSTRUTOR',
                'INSTRUTORA',
                'EXAMINADORA',
              ];
              const isSubstring = cargosConhecidos.some(
                c => c !== cargoBuscaNormalizado && c.includes(cargoBuscaNormalizado)
              );
              return !isSubstring;
            }
            return false;
          });
          console.log(
            `🔍 [loadPessoas] Filtro aplicado no cache: ${cached.length} → ${filteredCached.length} resultados`
          );
        }

        // Converter dados do cache para formato Pessoa[]
        const pessoas: Pessoa[] = filteredCached.map((p: any, index: number) => {
          const nomeCompleto = (p.nome || '').trim();
          const partesNome = nomeCompleto.split(' ').filter((p: string) => p.trim());
          const primeiroNome = partesNome[0] || '';
          const ultimoNome = partesNome.length > 1 ? partesNome[partesNome.length - 1] : '';

          const pessoa: Pessoa = {
            id: `pessoa_${index}_${nomeCompleto.toLowerCase().replace(/\s+/g, '_')}`,
            nome: primeiroNome,
            sobrenome: ultimoNome,
            nome_completo: nomeCompleto,
            comum_id: selectedComum,
            cargo_id: selectedCargo,
            cargo_real: (p.cargo || '').toUpperCase().trim(),
            instrumento_id: showInstrumento ? selectedInstrumento : null,
            cidade: (p.cidade || '').toUpperCase().trim(),
            nivel: (p.nivel || '').trim().toUpperCase() || null,
            ativo: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };

          if (
            p.nivel &&
            (p.nivel.toUpperCase().includes('OFICIALIZADA') ||
              p.nivel.toUpperCase().includes('CLASSE'))
          ) {
            pessoa.classe_organista = p.nivel.toUpperCase().trim();
          }

          return pessoa;
        });

        setPessoas(pessoas);
        return; // Retornar imediatamente - não precisa buscar do banco
      }
    } catch (error) {
      console.warn(
        '⚠️ [loadPessoas] Erro ao verificar cache, continuando com busca normal:',
        error
      );
    }

    // Se não encontrou cache, mostrar loading e buscar do banco
    setLoadingPessoas(true);
    setPessoas([]); // Limpar lista imediatamente para feedback visual

    try {
      const pessoasData = await (supabaseDataService as any).getPessoasFromLocal(
        selectedComum,
        selectedCargo,
        showInstrumento ? selectedInstrumento : undefined
      );

      setPessoas(pessoasData);
    } catch (error) {
      console.error('❌ Erro ao carregar pessoas:', error);
      setPessoas([]);
    } finally {
      setLoadingPessoas(false);
    }
  };

  const handleSubmit = async () => {
    // 🚨 BLOQUEIO SÍNCRONO: Se já estiver submetendo, bloquear imediatamente (mesmo se React state 'loading' não atualizou ainda)
    if (isSubmittingRef.current || loading) {
      console.warn('⚠️ [SUBMIT] Submissão bloqueada: já em andamento (duplo-clique detectado)');
      return;
    }

    isSubmittingRef.current = true;

    // 🚨 GARANTIA ABSOLUTA DE DESTRAVAMENTO: Try global da função
    try {
      console.log('🔘 [SUBMIT] Botão ENVIAR REGISTRO clicado');
      console.log('🔍 [SUBMIT] Estado atual:', {
        selectedComum,
        selectedCargo,
        selectedPessoa,
        isNomeManual,
        selectedPessoaType: typeof selectedPessoa,
        selectedPessoaLength: selectedPessoa?.length,
        selectedPessoaTrimmed: selectedPessoa?.trim(),
        selectedPessoaValue: selectedPessoa,
      });

      // Validar campos obrigatórios (permitir nome manual para candidatos também)
      if (!selectedComum || !selectedCargo) {
        console.warn('⚠️ [SUBMIT] Campos obrigatórios não preenchidos');
        Alert.alert('Erro', 'Preencha todos os campos obrigatórios');
        isSubmittingRef.current = false;
        return;
      }

      // 🚨 CORREÇÃO CRÍTICA: Se selectedPessoa está vazio mas há pessoas carregadas,
      // verificar se o texto digitado no campo corresponde a alguma opção
      // Se não corresponder, tratar como nome manual
      if (!selectedPessoa || selectedPessoa.trim() === '') {
        // Tentar buscar o texto do campo NameSelectField através do ref ou estado
        // Por enquanto, apenas mostrar erro - o handleBlur deve ter tratado isso
        console.warn('⚠️ [SUBMIT] Nome não selecionado', {
          selectedPessoa,
          isNomeManual,
          selectedPessoaTrimmed: selectedPessoa?.trim(),
          pessoasCount: pessoas.length,
        });
        Alert.alert('Erro', 'Selecione um nome da lista ou digite o nome completo manualmente.');
        isSubmittingRef.current = false;
        return;
      }

      // Verificar se é nome manual e se tem valor válido
      if (isNomeManual && (!selectedPessoa || selectedPessoa.trim().length < 3)) {
        console.warn('⚠️ [SUBMIT] Nome manual muito curto', {
          selectedPessoa,
          isNomeManual,
          length: selectedPessoa?.trim().length,
        });
        Alert.alert('Erro', 'O nome deve ter pelo menos 3 caracteres');
        isSubmittingRef.current = false;
        return;
      }

      // Validar instrumento apenas para Músico (obrigatório)
      // Organista não precisa de instrumento (sempre toca órgão)
      const cargoNome = cargos.find(c => c.id === selectedCargo)?.nome || '';
      const instrumentoObrigatorio = cargoNome === 'Músico'; // Organista removido
      if (instrumentoObrigatorio && !selectedInstrumento) {
        console.warn('⚠️ [SUBMIT] Instrumento não selecionado para Músico');
        Alert.alert('Erro', 'Selecione o instrumento para Músico');
        isSubmittingRef.current = false;
        return;
      }

      if (!user) {
        console.error('❌ [SUBMIT] Usuário não autenticado');
        Alert.alert('Erro', 'Usuário não autenticado');
        isSubmittingRef.current = false;
        return;
      }

      console.log('✅ [SUBMIT] Validações passaram, iniciando processamento...');
      setLoading(true);

      // 🚨 ESTRATÉGIA SIMPLIFICADA: Verificar status de conexão de forma mais confiável
      let isOfflineNow = false;

      // Verificar status de conexão de forma mais robusta
      try {
        // 1. Verificar hook primeiro (mais confiável)
        const hookOffline = !isOnline;

        // 2. Verificar nossa função robusta (engloba NetInfo e Fallbacks Web)
        let netInfoOffline = false;
        try {
          const isReallyOnline = await offlineSyncService.isOnline();
          netInfoOffline = !isReallyOnline;
          console.log(`📡 [${Platform.OS}] Serviço OfflineSync:`, {
            isReallyOnline,
          });
        } catch (netError) {
          console.warn(`⚠️ [${Platform.OS}] Serviço OfflineSync falhou:`, netError);
          // Se falhar, confiar no hook
          netInfoOffline = hookOffline;
        }

        // 3. Verificar navigator.onLine (se disponível)
        const navigatorOffline =
          typeof navigator !== 'undefined' && 'onLine' in navigator && navigator.onLine === false;

        // 🚨 ESTRATÉGIA: Se QUALQUER verificação indicar offline, considerar offline
        // No iOS, ser mais conservador - se houver qualquer dúvida, salvar na fila
        if (Platform.OS === 'ios') {
          // iOS: Se NetInfo OU hook indicar offline, salvar na fila
          isOfflineNow = netInfoOffline || hookOffline || navigatorOffline;
          console.log(`🍎 [iOS] Status offline:`, {
            netInfoOffline,
            hookOffline,
            navigatorOffline,
            isOfflineNow,
          });
        } else if (Platform.OS === 'android') {
          // Android: Se NetInfo OU hook indicar offline, salvar na fila
          isOfflineNow = netInfoOffline || hookOffline || navigatorOffline;
          console.log(`🤖 [Android] Status offline:`, {
            netInfoOffline,
            hookOffline,
            navigatorOffline,
            isOfflineNow,
          });
        } else {
          // Web: Usar navigator.onLine diretamente
          isOfflineNow = typeof navigator !== 'undefined' ? !navigator.onLine : hookOffline;
          console.log(`🌐 [Web] Status offline:`, { navigatorOffline, hookOffline, isOfflineNow });
        }
      } catch (error) {
        console.error('❌ Erro ao verificar status de conexão:', error);
        // Em caso de erro, assumir offline para segurança
        isOfflineNow = true;
      }

      // 🚨 CRÍTICO: Se estiver offline, salvar IMEDIATAMENTE na fila (SEM tentar online)
      if (isOfflineNow) {
        // 🚨 MENSAGEM EXATA DO BACKUPCONT: Mostrar alerta quando fica offline
        showToast.warning('Modo offline', 'Registros serão salvos na fila');

        console.log(`📴 [${Platform.OS}] Modo offline detectado - salvando diretamente na fila`);
        console.log(`📊 [${Platform.OS}] Dados do registro:`, {
          pessoa_id: isNomeManual ? `manual_${selectedPessoa}` : selectedPessoa,
          comum_id: selectedComum,
          cargo_id: selectedCargo,
          instrumento_id: selectedInstrumento,
        });

        // 🚨 CORREÇÃO: Modal pode permanecer aberto - não precisa fechar antes de salvar offline

        try {
          // Preparar registro para salvar na fila
          const localEnsaio = await localStorageService.getLocalEnsaio();

          // Usar nome do usuário ao invés do ID
          let nomeCompletoUsuario = user.nome;
          if (!nomeCompletoUsuario || nomeCompletoUsuario.trim() === '') {
            const emailSemDominio = user.email?.split('@')[0] || '';
            nomeCompletoUsuario = emailSemDominio.replace(/[._]/g, ' ').trim();
          }
          const nomeUsuario = formatRegistradoPor(nomeCompletoUsuario || user.id);

          // Buscar classe da organista do banco de dados se for Organista
          let classeOrganistaDB: string | undefined = undefined;
          if (isOrganista && !isNomeManual) {
            const pessoaSelecionada = pessoas.find(p => p.id === selectedPessoa);
            if (pessoaSelecionada && pessoaSelecionada.classe_organista) {
              classeOrganistaDB = pessoaSelecionada.classe_organista;
            } else {
              classeOrganistaDB = 'OFICIALIZADA';
            }
          }

          // Para Candidatos: buscar instrumento da pessoa selecionada
          let instrumentoCandidato: string | null = null;
          if (isCandidato && !isNomeManual) {
            const pessoaSelecionada = pessoas.find(p => p.id === selectedPessoa);
            if (pessoaSelecionada && pessoaSelecionada.instrumento_id) {
              instrumentoCandidato = pessoaSelecionada.instrumento_id;
            }
          }

          const pessoaIdFinal = isNomeManual ? `manual_${selectedPessoa}` : selectedPessoa;

          const registro: RegistroPresenca = {
            pessoa_id: pessoaIdFinal,
            comum_id: selectedComum,
            cargo_id: selectedCargo,
            instrumento_id: isCandidato
              ? instrumentoCandidato
              : showInstrumento && selectedInstrumento
                ? selectedInstrumento
                : null,
            classe_organista: classeOrganistaDB,
            local_ensaio: localEnsaio || 'Não definido',
            data_hora_registro: getCurrentDateTimeISO(),
            usuario_responsavel: nomeUsuario,
            status_sincronizacao: 'pending',
          };

          // 🚨 VERIFICAÇÃO CRÍTICA: Verificar duplicata ANTES de salvar
          const registrosPendentes = await supabaseDataService.getRegistrosPendentesFromLocal();
          const dataRegistro = new Date(registro.data_hora_registro);
          const dataRegistroStr = dataRegistro.toISOString().split('T')[0];

          // Verificação rápida de duplicata
          const isDuplicata = registrosPendentes.some(r => {
            const rData = new Date(r.data_hora_registro);
            const rDataStr = rData.toISOString().split('T')[0];
            return (
              r.pessoa_id === registro.pessoa_id &&
              r.comum_id === registro.comum_id &&
              r.cargo_id === registro.cargo_id &&
              rDataStr === dataRegistroStr &&
              r.status_sincronizacao === 'pending'
            );
          });

          if (isDuplicata) {
            console.warn('🚨 Registro duplicado - já está na fila');
            showToast.warning('Atenção', 'Este registro já está na fila');
            setLoading(false);
            isSubmittingRef.current = false;
            return;
          }

          // 🚨 CRÍTICO: Salvar na fila com tratamento robusto de erros
          console.log(`💾 [${Platform.OS}] Salvando registro na fila offline...`);
          console.log(
            `📋 [${Platform.OS}] Dados completos do registro:`,
            JSON.stringify(registro, null, 2)
          );

          try {
            await supabaseDataService.saveRegistroToLocal(registro);
            console.log(`✅ [${Platform.OS}] saveRegistroToLocal executado com sucesso`);
          } catch (saveError) {
            console.error(`❌ [${Platform.OS}] Erro ao chamar saveRegistroToLocal:`, saveError);
            throw saveError; // Re-lançar para ser tratado no catch externo
          }

          // Verificar se foi realmente salvo (especialmente importante no iOS/Android)
          console.log(`🔍 [${Platform.OS}] Verificando se registro foi salvo...`);
          const registrosAposSalvar = await supabaseDataService.getRegistrosPendentesFromLocal();
          console.log(
            `📊 [${Platform.OS}] Total de registros na fila após salvar:`,
            registrosAposSalvar.length
          );

          const foiSalvo = registrosAposSalvar.some(
            r =>
              r.pessoa_id === registro.pessoa_id &&
              r.comum_id === registro.comum_id &&
              r.cargo_id === registro.cargo_id &&
              r.status_sincronizacao === 'pending'
          );

          console.log(`✅ [${Platform.OS}] Registro foi salvo?`, foiSalvo);

          if (!foiSalvo) {
            // Se não foi salvo, tentar novamente com novo ID
            console.warn(
              `⚠️ [${Platform.OS}] Registro não encontrado após salvar, tentando novamente com novo ID...`
            );
            const registroComNovoId = {
              ...registro,
              id: generateExternalUUID(),
            };
            try {
              await supabaseDataService.saveRegistroToLocal(registroComNovoId);
              console.log(`✅ [${Platform.OS}] Registro salvo com novo ID`);
            } catch (retryError) {
              console.error(`❌ [${Platform.OS}] Erro ao salvar com novo ID:`, retryError);
              throw retryError;
            }
          }

          console.log(`🔄 [${Platform.OS}] Atualizando contador da fila...`);
          await refreshCount();
          console.log(`✅ [${Platform.OS}] Contador atualizado`);

          showToast.success('Salvo offline', 'Será enviado quando voltar online');
          console.log(`✅ [${Platform.OS}] Toast de sucesso exibido`);

          // Limpar apenas formulário de nome para digitação pesada
          clearAllFields();

          console.log(`✅ [${Platform.OS}] Formulário limpo, finalizando...`);
          setLoading(false);
          isSubmittingRef.current = false;
          return;
        } catch (error) {
          console.error(`❌ [${Platform.OS}] Erro crítico ao salvar registro offline:`, error);

          // Tentar novamente com novo ID
          try {
            const localEnsaio = await localStorageService.getLocalEnsaio();
            let nomeCompletoUsuario = user.nome;
            if (!nomeCompletoUsuario || nomeCompletoUsuario.trim() === '') {
              const emailSemDominio = user.email?.split('@')[0] || '';
              nomeCompletoUsuario = emailSemDominio.replace(/[._]/g, ' ').trim();
            }
            const nomeUsuario = formatRegistradoPor(nomeCompletoUsuario || user.id);

            let classeOrganistaDB: string | undefined = undefined;
            if (isOrganista && !isNomeManual) {
              const pessoaSelecionada = pessoas.find(p => p.id === selectedPessoa);
              if (pessoaSelecionada && pessoaSelecionada.classe_organista) {
                classeOrganistaDB = pessoaSelecionada.classe_organista;
              } else {
                classeOrganistaDB = 'OFICIALIZADA';
              }
            }

            let instrumentoCandidato: string | null = null;
            if (isCandidato && !isNomeManual) {
              const pessoaSelecionada = pessoas.find(p => p.id === selectedPessoa);
              if (pessoaSelecionada && pessoaSelecionada.instrumento_id) {
                instrumentoCandidato = pessoaSelecionada.instrumento_id;
              }
            }

            const pessoaIdFinal = isNomeManual ? `manual_${selectedPessoa}` : selectedPessoa;

            const registroComNovoId: RegistroPresenca = {
              pessoa_id: pessoaIdFinal,
              comum_id: selectedComum,
              cargo_id: selectedCargo,
              instrumento_id: isCandidato
                ? instrumentoCandidato
                : showInstrumento && selectedInstrumento
                  ? selectedInstrumento
                  : null,
              classe_organista: classeOrganistaDB,
              local_ensaio: localEnsaio || 'Não definido',
              data_hora_registro: getCurrentDateTimeISO(),
              usuario_responsavel: nomeUsuario,
              status_sincronizacao: 'pending',
              id: generateExternalUUID(),
            };

            await supabaseDataService.saveRegistroToLocal(registroComNovoId);
            await refreshCount();
            showToast.success('Salvo offline', 'Será enviado quando voltar online');

            // Limpar formulário
            setSelectedComum('');
            setSelectedCargo('');
            setSelectedInstrumento('');
            setSelectedPessoa('');
            setIsNomeManual(false);

            setLoading(false);
            isSubmittingRef.current = false;
            return;
          } catch (retryError) {
            console.error(`❌ [${Platform.OS}] Erro mesmo na segunda tentativa:`, retryError);
            showToast.error('Erro', 'Erro ao salvar registro offline. Tente novamente.');
            setLoading(false);
            isSubmittingRef.current = false;
            return;
          }
        }
      }

      // Preparar registro ANTES do try/catch para estar disponível em todo o escopo
      // Isso garante que o registro esteja disponível mesmo no catch
      const localEnsaioOnline = await localStorageService.getLocalEnsaio();

      // Usar nome do usuário ao invés do ID
      let nomeCompletoUsuarioOnline = user.nome;
      if (!nomeCompletoUsuarioOnline || nomeCompletoUsuarioOnline.trim() === '') {
        const emailSemDominio = user.email?.split('@')[0] || '';
        nomeCompletoUsuarioOnline = emailSemDominio.replace(/[._]/g, ' ').trim();
      }
      const nomeUsuarioOnline = formatRegistradoPor(nomeCompletoUsuarioOnline || user.id);

      // Buscar classe da organista do banco de dados se for Organista
      let classeOrganistaDBOnline: string | undefined = undefined;
      if (isOrganista && !isNomeManual) {
        const pessoaSelecionada = pessoas.find(p => p.id === selectedPessoa);
        if (pessoaSelecionada && pessoaSelecionada.classe_organista) {
          classeOrganistaDBOnline = pessoaSelecionada.classe_organista;
        } else {
          classeOrganistaDBOnline = 'OFICIALIZADA';
        }
      }

      // Para Candidatos: buscar instrumento da pessoa selecionada
      let instrumentoCandidatoOnline: string | null = null;
      if (isCandidato && !isNomeManual) {
        const pessoaSelecionada = pessoas.find(p => p.id === selectedPessoa);
        if (pessoaSelecionada && pessoaSelecionada.instrumento_id) {
          instrumentoCandidatoOnline = pessoaSelecionada.instrumento_id;
        }
      }

      const pessoaIdFinalOnline = isNomeManual ? `manual_${selectedPessoa}` : selectedPessoa;

      const registroOnline: RegistroPresenca = {
        pessoa_id: pessoaIdFinalOnline,
        comum_id: selectedComum,
        cargo_id: selectedCargo,
        instrumento_id: isCandidato
          ? instrumentoCandidatoOnline
          : showInstrumento && selectedInstrumento
            ? selectedInstrumento
            : null,
        classe_organista: classeOrganistaDBOnline,
        local_ensaio: localEnsaioOnline || 'Não definido',
        data_hora_registro: getCurrentDateTimeISO(),
        usuario_responsavel: nomeUsuarioOnline,
        status_sincronizacao: 'pending',
      };

      // Se estiver offline, já foi tratado acima - não chegará aqui
      // Se chegou aqui, está online - tentar enviar online
      try {
        console.log('🚀 [ONLINE] Iniciando envio de registro online...', {
          isOnline,
          isOfflineNow,
          pessoa_id: registroOnline.pessoa_id,
          comum_id: registroOnline.comum_id,
          cargo_id: registroOnline.cargo_id,
        });

        const result = await (offlineSyncService as any).createRegistro(registroOnline);

        console.log('📋 Resultado do createRegistro:', result);
        console.log('🔍 Verificando duplicata - success:', result.success, 'error:', result.error);

        // Atualizar contador da fila após criar registro (sempre, mesmo se houver erro)
        try {
          await refreshCount();
          console.log('✅ Contador da fila atualizado');
        } catch (countError) {
          console.warn('⚠️ Erro ao atualizar contador da fila:', countError);
          // Não bloquear o fluxo por erro no contador
        }

        if (result.success) {
          // Verificar se foi enviado com sucesso ou salvo localmente
          const foiEnviado = !result.error || !result.error.includes('salvo localmente');

          if (foiEnviado) {
            // 🚀 MELHORIA: Alerta de sucesso centralizado estilo SweetAlert2 para Web
            if (Platform.OS === 'web') {
              try {
                const Swal = typeof window !== 'undefined' ? require('sweetalert2') : null;
                if (Swal) {
                  const SwalConf = Swal.default || Swal;
                  SwalConf.fire({
                    title:
                      "<span style=\"font-family: 'Inter', 'Segoe UI', sans-serif; font-weight: 600; color: #333; font-size: 22px;\">Registro Enviado!</span>",
                    html: "<span style=\"font-family: 'Inter', 'Segoe UI', sans-serif; color: #555;\">A presença foi registrada com sucesso.</span>",
                    icon: 'success',
                    showConfirmButton: false,
                    timer: 1500,
                    timerProgressBar: true,
                    width: '260px',
                    padding: '16px 12px',
                    backdrop: false,
                    customClass: {
                      popup: 'swal-success-popup',
                    },
                    didOpen: () => {
                      // Injetando css direto caso não exista no app
                      const popup = SwalConf.getPopup();
                      if (popup) {
                        popup.style.fontFamily =
                          "'Inter', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif";
                        popup.style.borderRadius = '8px'; // Menos arredondado
                      }
                    },
                  });
                } else {
                  showToast.success('Registro enviado com sucesso');
                }
              } catch (e) {
                showToast.success('Registro enviado com sucesso');
              }
            } else {
              showToast.success('Registro enviado com sucesso');
            }
            // Limpar formulário usando função helper
            clearAllFields();
          } else {
            // Registro foi salvo localmente (sem internet ou erro de conectividade)
            if (!isOnline) {
              // Modo offline - mostrar mensagem informativa
              showToast.info('Salvo offline', 'Enviado quando voltar online');
            } else {
              // Online mas erro de conectividade - mostrar mensagem informativa
              showToast.warning('Salvo localmente', 'Será enviado automaticamente quando possível');
            }
            // Não limpar formulário se foi salvo localmente (usuário pode querer tentar novamente)
          }
        } else {
          // Verificar se é erro de duplicata
          const isDuplicateError =
            result.error &&
            (result.error.includes('DUPLICATA') ||
              result.error.includes('duplicat') ||
              result.error.includes('já foi cadastrado hoje') ||
              result.error.includes('DUPLICATA_BLOQUEADA'));

          console.log('❌ Registro falhou - Verificando se é duplicata...');
          console.log('   Error:', result.error);
          console.log('   É duplicata?:', isDuplicateError);

          if (isDuplicateError) {
            console.log('✅ DUPLICATA DETECTADA! Processando erro:', result.error);

            let nome = '';
            let comumNome = '';
            let dataFormatada = '';
            let horarioFormatado = '';

            // SEMPRE usar dados do formulário primeiro (mais confiável)
            nome = isNomeManual
              ? selectedPessoa
              : pessoas.find(p => p.id === selectedPessoa)?.nome_completo ||
              (
                pessoas.find(p => p.id === selectedPessoa)?.nome +
                ' ' +
                (pessoas.find(p => p.id === selectedPessoa)?.sobrenome || '')
              ).trim() ||
              '';
            comumNome = comuns.find(c => c.id === selectedComum)?.nome || '';

            // Tentar extrair informações do formato DUPLICATA:nome|comum|data|horario
            if (result.error && result.error.includes('DUPLICATA:')) {
              const errorPart = result.error.split('DUPLICATA:')[1]?.trim() || '';

              // Tentar formato com pipes primeiro: DUPLICATA:nome|comum|data|horario
              if (errorPart.includes('|')) {
                const parts = errorPart.split('|');
                if (parts.length >= 4) {
                  nome = parts[0].trim() || nome;
                  comumNome = parts[1].trim() || comumNome;
                  dataFormatada = parts[2].trim();
                  horarioFormatado = parts[3].trim();
                }
              } else {
                // Tentar formato sem pipes: DUPLICATA: nome comum data/horario
                // Exemplo: "DUPLICATA: ADRIANO MOTA BR-22-1739 - JARDIM MIRANDA 21/11/2025/13:18"
                const match = errorPart.match(
                  /^(.+?)\s+(BR-\d+-\d+\s*-\s*.+?)\s+(\d{2}\/\d{2}\/\d{4})\/(\d{2}:\d{2})/
                );
                if (match) {
                  nome = match[1].trim() || nome;
                  comumNome = match[2].trim() || comumNome;
                  dataFormatada = match[3].trim();
                  horarioFormatado = match[4].trim();
                } else {
                  // Tentar extrair apenas data e horário do formato: ... data/horario
                  const dataHorarioMatch = errorPart.match(/(\d{2}\/\d{2}\/\d{4})\/(\d{2}:\d{2})/);
                  if (dataHorarioMatch) {
                    dataFormatada = dataHorarioMatch[1];
                    horarioFormatado = dataHorarioMatch[2];
                  }
                }
              }
            }

            // Se não conseguiu extrair data/horário, usar data/horário atual via nosso utils (com timezone America/Sao_Paulo fixado)
            if (!dataFormatada || !horarioFormatado) {
              dataFormatada = formatDate();
              horarioFormatado = formatTime();
            }

            // ---- NOVA FUNÇÃO AUXILIAR PARA O NOME ----
            // Pega apenas "PRIMEIRONOME ÚLTIMONOME"
            const obterNomeCurto = (nc: string): string => {
              if (!nc) return '';
              const pedacos = nc.trim().split(/\s+/);
              if (pedacos.length <= 1) return pedacos[0] || '';
              return `${pedacos[0]} ${pedacos[pedacos.length - 1]}`;
            };

            const nomeExibicao = obterNomeCurto(nome);

            console.log('📋 Informações extraídas:', {
              nome: nomeExibicao,
              comumNome,
              dataFormatada,
              horarioFormatado,
            });

            // Mostrar alerta de duplicata usando SweetAlert2 (igual ao backupcont)
            if (Platform.OS === 'web') {
              // Usar SweetAlert2 na web (igual ao backupcont)
              const getSwal = (): any => {
                if (typeof window === 'undefined') return null;
                try {
                  const sweetalert2 = require('sweetalert2');
                  return sweetalert2.default || sweetalert2;
                } catch (error) {
                  console.warn('SweetAlert2 não disponível:', error);
                  return null;
                }
              };

              const Swal = getSwal();
              if (Swal) {
                const mensagem = `
                <div style="color: #545454; font-size: 16px; margin-top: 5px;">
                  <strong style="color: #545454;">${nomeExibicao || 'Nome não encontrado'}</strong> de <strong style="color: #545454;">${comumNome || 'Comum não encontrada'}</strong><br>
                  já foi cadastrado(a).<br><br>
                  <div style="text-align: left; background-color: #f8f9fa; padding: 12px 16px; border-radius: 8px; border: 1px solid #e9ecef; width: 100%; box-sizing: border-box; margin: 0 auto; overflow: hidden;">
                    <span style="font-weight: 600; color: #495057;">Data:</span> <span style="color: #6c757d">${dataFormatada}</span><br>
                    <span style="font-weight: 600; color: #495057;">Horário:</span> <span style="color: #6c757d">${horarioFormatado}</span>
                  </div>
                </div>
              `;

                const isMobileDevice =
                  /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
                    typeof navigator !== 'undefined' ? navigator.userAgent : ''
                  );

                // Garantir que FontAwesome está carregado
                if (typeof window !== 'undefined' && typeof document !== 'undefined') {
                  const linkId = 'fontawesome-css';
                  if (!document.getElementById(linkId)) {
                    const link = document.createElement('link');
                    link.id = linkId;
                    link.rel = 'stylesheet';
                    link.href =
                      'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css';
                    document.head.appendChild(link);
                  }
                }

                Swal.fire({
                  title: 'Cadastro Duplicado!',
                  html: mensagem,
                  icon: 'warning',
                  iconColor: '#f8bb86',
                  showCancelButton: true,
                  confirmButtonText: '<i class="fas fa-check"></i> Cadastrar Mesmo Assim',
                  cancelButtonText: '<i class="fas fa-times"></i> Cancelar',
                  confirmButtonColor: '#d33',
                  cancelButtonColor: '#6e7881',
                  reverseButtons: true,
                  width: isMobileDevice ? '90%' : '500px',
                  padding: isMobileDevice ? '1.5rem' : '2rem',
                  position: 'center',
                  backdrop: true,
                  allowOutsideClick: false,
                  allowEscapeKey: true,
                  focusConfirm: false,
                  focusCancel: false,
                  buttonsStyling: true,
                  customClass: {
                    confirmButton: 'swal-duplicity-confirm',
                    cancelButton: 'swal-duplicity-cancel',
                    title: 'swal-duplicity-title',
                  },
                  didOpen: () => {
                    const popupEl = Swal.getPopup();
                    if (popupEl) {
                      popupEl.style.fontFamily =
                        "system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
                    }

                    const titleEl = Swal.getTitle();
                    if (titleEl) {
                      titleEl.style.color = '#545454';
                      titleEl.style.fontSize = '26px';
                      titleEl.style.fontWeight = '600';
                    }
                  },
                }).then(async (result: any) => {
                  if (!result.isConfirmed) {
                    // Usuário cancelou - limpar campos e recarregar página
                    console.log(
                      '❌ Usuário cancelou registro por duplicata - limpando campos e recarregando página...'
                    );
                    setSelectedComum('');
                    setSelectedCargo('');
                    setSelectedInstrumento('');
                    setSelectedPessoa('');
                    setIsNomeManual(false);

                    return;
                  }

                  // Usuário confirmou - criar registro mesmo assim
                  console.log('✅ Usuário confirmou registro mesmo com duplicata');
                  setLoading(true);
                  try {
                    const registroForce = { ...registroOnline };
                    const resultForce = await (offlineSyncService as any).createRegistro(
                      registroForce,
                      true
                    );

                    if (resultForce.success) {
                      if (isOnline && !syncing) {
                        setTimeout(() => {
                          syncData();
                        }, 500);
                      }
                      showToast.success(
                        'Registro enviado!',
                        'Registro duplicado cadastrado com sucesso!'
                      );
                      // Limpar formulário ANTES de recarregar
                      clearAllFields();
                      // Recarregar página após sucesso
                    } else {
                      showToast.error(
                        'Erro',
                        resultForce.error || 'Erro ao cadastrar registro duplicado'
                      );
                      // Limpar formulário ANTES de recarregar
                      setSelectedComum('');
                      setSelectedCargo('');
                      setSelectedInstrumento('');
                      setSelectedPessoa('');
                      setIsNomeManual(false);
                      // Recarregar página mesmo em caso de erro
                    }
                  } catch (error) {
                    showToast.error('Erro', 'Ocorreu um erro ao processar o registro duplicado');
                    console.error('Erro ao criar registro duplicado:', error);
                    // Limpar formulário ANTES de recarregar
                    setSelectedComum('');
                    setSelectedCargo('');
                    setSelectedInstrumento('');
                    setSelectedPessoa('');
                    setIsNomeManual(false);
                    // Recarregar página mesmo em caso de erro
                  } finally {
                    setLoading(false);
                  }
                });
              } else {
                // Fallback: usar modal React Native
                setDuplicateInfo({
                  nome: nome || 'Nome não encontrado',
                  comum: comumNome || 'Comum não encontrada',
                  data: dataFormatada,
                  horario: horarioFormatado,
                });
                setPendingRegistro(registroOnline);
                setDuplicateModalVisible(true);
              }
            } else {
              // Mobile: usar modal React Native
              setDuplicateInfo({
                nome: nome || 'Nome não encontrado',
                comum: comumNome || 'Comum não encontrada',
                data: dataFormatada,
                horario: horarioFormatado,
              });
              setPendingRegistro(registroOnline);
              setDuplicateModalVisible(true);
            }
          } else {
            // Erro não é duplicata - mostrar erro
            const errorMessage = result.error || 'Erro ao enviar registro';
            console.error('❌ Erro ao enviar registro:', errorMessage);
            showToast.error('Erro', errorMessage);

            // Se for erro de salvamento local, tentar salvar manualmente como fallback
            if (errorMessage.includes('salvar') || errorMessage.includes('localmente')) {
              console.log('🔄 Tentando salvar registro manualmente como fallback...');
              try {
                await supabaseDataService.saveRegistroToLocal({
                  ...registroOnline,
                  status_sincronizacao: 'pending',
                });
                console.log('✅ Registro salvo manualmente com sucesso');
                showToast.info('Salvo offline', 'Registro salvo na fila local');
                await refreshCount();
              } catch (fallbackError) {
                console.error('❌ Erro ao salvar registro manualmente:', fallbackError);
              }
            }
          }
        }
      } catch (error) {
        console.error('❌ ERRO CRÍTICO ao processar registro:', error);
        const errorMessage = error instanceof Error ? error.message : String(error);

        // Tentar salvar localmente como último recurso
        try {
          console.log('🔄 Tentando salvar registro localmente como último recurso...');
          // Usar registroOnline se disponível, senão criar um novo
          // Criar registro fallback se registroOnline não estiver disponível
          let registroFallback: RegistroPresenca;
          if (registroOnline) {
            registroFallback = registroOnline;
          } else {
            const localEnsaioFallback = await localStorageService.getLocalEnsaio();
            let nomeCompletoUsuarioFallback = user?.nome || '';
            if (!nomeCompletoUsuarioFallback || nomeCompletoUsuarioFallback.trim() === '') {
              const emailSemDominio = user?.email?.split('@')[0] || '';
              nomeCompletoUsuarioFallback = emailSemDominio.replace(/[._]/g, ' ').trim();
            }
            const nomeUsuarioFallback = formatRegistradoPor(
              nomeCompletoUsuarioFallback || user?.id || ''
            );

            registroFallback = {
              pessoa_id: isNomeManual ? `manual_${selectedPessoa}` : selectedPessoa,
              comum_id: selectedComum,
              cargo_id: selectedCargo,
              instrumento_id: showInstrumento && selectedInstrumento ? selectedInstrumento : null,
              local_ensaio: localEnsaioFallback || 'Não definido',
              data_hora_registro: getCurrentDateTimeISO(),
              usuario_responsavel: nomeUsuarioFallback,
              status_sincronizacao: 'pending',
            };
          }
          await supabaseDataService.saveRegistroToLocal({
            ...registroFallback,
            status_sincronizacao: 'pending',
          });
          console.log('✅ Registro salvo localmente como último recurso');
          showToast.warning('Salvo offline', 'Registro salvo na fila. Será enviado quando possível.');
          await refreshCount();
        } catch (fallbackError) {
          console.error(
            '❌ ERRO CRÍTICO: Não foi possível salvar registro nem localmente:',
            fallbackError
          );
          Alert.alert(
            'Erro Crítico',
            'Não foi possível salvar o registro. Tente novamente ou verifique sua conexão.'
          );
        }
      } finally {
        setLoading(false);
        isSubmittingRef.current = false;
      }
    } finally {
      // 🚨 GARANTIA ABSOLUTA: Destravar mesmo em return antecipado ou exceção não mapeada
      isSubmittingRef.current = false;
      setLoading(false);
    }
  };

  // Exibir apenas o nome sem código na busca, mas manter código completo no valor
  // MEMOIZAR para evitar recriação constante que causa loops
  // IMPORTANTE: useMemo DEVE estar ANTES de qualquer return condicional
  const comunsOptions = useMemo(() => {
    return comuns.map(c => {
      // Extrair nome sem código usando a função do supabaseDataService
      const nomeExibicao = (supabaseDataService as any).extrairNomeComum(c.nome);
      return {
        id: c.id,
        label: nomeExibicao || c.nome, // Nome sem código para exibição
        value: c.id,
        nomeCompleto: c.nome, // Manter nome completo (com código) para registro
      };
    });
  }, [comuns]);

  // MEMOIZAR cargosOptions para evitar recriação constante
  // 🚨 FILTRO: Excluir cargos que só devem aparecer no modal (fora da regional)
  // Na página principal, apenas mostrar cargos da regional:
  // - Músico, Organista (cargos musicais - usarão cargo real do banco)
  // - Irmandade, Ancião, Diácono, Cooperador do Ofício, Cooperador de Jovens
  // - Porteiro (a), Bombeiro (a), Médico (a), Enfermeiro (a)
  const cargosOptions = useMemo(() => {
    // Cargos que NÃO devem aparecer na página principal (só no modal)
    const cargosExcluidos = [
      'Candidato (a)',
      'Instrutor',
      'Instrutora',
      'Examinadora',
      'Encarregado Local',
      'Encarregado Regional',
      'Secretário da Música',
      'Secretária da Música',
    ];

    return cargos
      .filter(c => !cargosExcluidos.includes(c.nome))
      .map(c => ({
        id: c.id,
        label: c.nome,
        value: c.id,
      }));
  }, [cargos]);

  // MEMOIZAR instrumentosOptions para evitar recriação constante
  const instrumentosOptions = useMemo(() => {
    return instrumentos.map(i => ({
      id: i.id,
      label: i.nome,
      value: i.id,
    }));
  }, [instrumentos]);

  // MEMOIZAR pessoasOptions para evitar recriação constante
  const pessoasOptions = useMemo(() => {
    return pessoas.map(p => ({
      id: p.id,
      label: p.nome_completo || `${p.nome} ${p.sobrenome}`, // Usar nome completo se disponível
      value: p.id,
    }));
  }, [pessoas]);

  const handleEditRegistros = () => {
    (navigation as any).navigate('EditRegistros');
  };

  const handleOrganistasEnsaio = () => {
    console.log(
      '🎹 [handleOrganistasEnsaio] Iniciando navegação para tela de Organistas no Ensaio'
    );
    console.log('🎹 [handleOrganistasEnsaio] Navigation disponível?', !!navigation);
    console.log('🎹 [handleOrganistasEnsaio] Tipo do navigation:', typeof navigation);
    console.log('🎹 [handleOrganistasEnsaio] Navigation object:', navigation);

    try {
      if (!navigation) {
        console.error('❌ [handleOrganistasEnsaio] Navigation não está disponível');
        showToast.error('Erro', 'Navegação não disponível. Tente recarregar a página.');
        return;
      }

      // Verificar se o método navigate existe
      if (typeof (navigation as any).navigate !== 'function') {
        console.error('❌ [handleOrganistasEnsaio] Método navigate não está disponível');
        console.error('❌ [handleOrganistasEnsaio] Métodos disponíveis:', Object.keys(navigation));
        showToast.error('Erro', 'Navegação não configurada corretamente.');
        return;
      }

      // Verificar se podemos obter o estado atual da navegação
      const state = (navigation as any).getState?.();
      console.log('🎹 [handleOrganistasEnsaio] Estado atual da navegação:', state);
      console.log(
        '🎹 [handleOrganistasEnsaio] Rotas disponíveis:',
        state?.routes?.map((r: any) => r.name)
      );

      // Verificar se a rota existe
      const routeExists = state?.routes?.some((r: any) => r.name === 'OrganistasEnsaio');
      console.log('🎹 [handleOrganistasEnsaio] Rota OrganistasEnsaio existe?', routeExists);

      console.log('🎹 [handleOrganistasEnsaio] Chamando navigation.navigate("OrganistasEnsaio")');

      // Tentar navegar com um pequeno delay para garantir que tudo está pronto
      setTimeout(() => {
        try {
          (navigation as any).navigate('OrganistasEnsaio');
          console.log('✅ [handleOrganistasEnsaio] Navegação chamada com sucesso');
        } catch (navError) {
          console.error('❌ [handleOrganistasEnsaio] Erro ao executar navigate:', navError);
          showToast.error('Erro', 'Não foi possível navegar. Tente novamente.');
        }
      }, 50);
    } catch (error) {
      console.error('❌ [handleOrganistasEnsaio] Erro ao navegar para OrganistasEnsaio:', error);
      console.error('❌ [handleOrganistasEnsaio] Detalhes do erro:', {
        message: error instanceof Error ? error.message : String(error),
        name: error instanceof Error ? error.name : 'Unknown',
        stack: error instanceof Error ? error.stack : undefined,
      });
      showToast.error('Erro', 'Não foi possível acessar a página de organistas. Tente novamente.');
    }
  };

  // Função para salvar novo registro do modal (pessoas de outras cidades)
  const handleSaveNewRegistration = async (data: {
    comum: string;
    cidade: string;
    cargo: string;
    instrumento?: string;
    classe?: string;
    nome: string;
  }) => {
    if (!user) {
      Alert.alert('Erro', 'Usuário não autenticado');
      return;
    }

    try {
      let localEnsaio = await localStorageService.getLocalEnsaio();

      // 🚨 CRÍTICO: Converter ID para nome do local (mesma lógica do registro principal)
      // Garantir que sempre salvamos o nome, nunca o ID
      let localEnsaioNome: string = 'Não definido';
      if (localEnsaio) {
        if (/^\d+$/.test(localEnsaio.trim())) {
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
          const localEncontrado = locais.find(l => l.id === localEnsaio!.trim());
          localEnsaioNome = localEncontrado?.nome || localEnsaio;
          console.log('🔄 [MODAL] Local de ensaio convertido de ID para nome:', localEnsaioNome);
        } else {
          // Já é um nome, usar diretamente
          localEnsaioNome = localEnsaio.trim();
        }
      }

      // Extrair apenas primeiro e último nome do usuário
      // Se não tem nome no perfil, extrair do email (remover @gmail.com e formatar)
      let nomeCompletoUsuario = user.nome;
      if (!nomeCompletoUsuario || nomeCompletoUsuario.trim() === '') {
        // Extrair nome do email: ricardograngeiro@gmail.com -> ricardograngeiro
        // A função formatRegistradoPor vai separar e formatar corretamente
        const emailSemDominio = user.email?.split('@')[0] || '';
        // Substituir pontos e underscores por espaços, mas manter minúsculas para a função separar
        nomeCompletoUsuario = emailSemDominio.replace(/[._]/g, ' ').trim();
      }
      // formatRegistradoPor extrai primeiro e último nome, separa palavras juntas e converte para maiúscula
      const nomeUsuario = formatRegistradoPor(nomeCompletoUsuario || user.id);

      // 🚨 CRÍTICO: Buscar cargo e garantir que usamos o ID, não o nome
      // No modal de novo registro, data.cargo é o NOME do cargo (ex: "Instrutora")
      // Precisamos encontrar o ID correspondente
      console.log('🔍 [MODAL] Buscando cargo:', {
        cargoNome: data.cargo,
        totalCargos: cargos.length,
        cargosDisponiveis: cargos.map(c => c.nome),
      });

      let cargoObj = cargos.find(c => c.nome === data.cargo);
      if (!cargoObj) {
        // Tentar buscar por ID também (caso já venha como ID)
        cargoObj = cargos.find(c => c.id === data.cargo);
      }

      if (!cargoObj) {
        console.error('❌ [MODAL] Cargo não encontrado:', {
          cargoProcurado: data.cargo,
          cargosDisponiveis: cargos.map(c => ({ id: c.id, nome: c.nome })),
        });
        Alert.alert('Erro', `Cargo "${data.cargo}" não encontrado na lista de cargos`);
        return;
      }

      console.log('✅ [MODAL] Cargo encontrado:', {
        id: cargoObj.id,
        nome: cargoObj.nome,
      });

      const instrumentoObj = data.instrumento
        ? instrumentos.find(i => i.id === data.instrumento)
        : null;

      // Criar registro com dados do modal
      // 🚨 CRÍTICO: Usar cargoObj.id (ID do cargo), não data.cargo (nome)
      const registro: RegistroPresenca & { cidade?: string } = {
        pessoa_id: `manual_${data.nome.toUpperCase()}`,
        comum_id: `external_${data.comum.toUpperCase()}_${Date.now()}`, // ID temporário
        cargo_id: cargoObj.id, // 🚨 USAR ID DO CARGO, NÃO O NOME
        instrumento_id: data.instrumento || undefined,
        classe_organista: data.classe || undefined,
        local_ensaio: localEnsaioNome,
        data_hora_registro: getCurrentDateTimeISO(),
        usuario_responsavel: nomeUsuario,
        status_sincronizacao: 'pending',
        cidade: data.cidade, // Adicionar cidade ao registro
      };

      // 🚨 CRÍTICO: Verificar se está offline ANTES de tentar enviar
      const isOfflineNow = !(await offlineSyncService.isOnline());
      console.log('🌐 [MODAL] Status de conexão:', isOfflineNow ? 'OFFLINE' : 'ONLINE');

      if (isOfflineNow) {
        // 🚨 CORREÇÃO CRÍTICA: Se offline, salvar usando saveRegistroToLocal (funciona em Android/iOS/Web)
        console.log('📴 [MODAL] Modo offline detectado - salvando usando saveRegistroToLocal');

        try {
          // Usar o mesmo formato de registro que o sistema principal usa
          const registroOffline: RegistroPresenca & { cidade?: string } = {
            pessoa_id: `manual_${data.nome.toUpperCase()}`,
            comum_id: `external_${data.comum.toUpperCase()}_${Date.now()}`,
            cargo_id: cargoObj.id,
            instrumento_id: data.instrumento || undefined,
            classe_organista: data.classe || undefined,
            local_ensaio: localEnsaioNome,
            data_hora_registro: getCurrentDateTimeISO(),
            usuario_responsavel: nomeUsuario,
            status_sincronizacao: 'pending',
            cidade: data.cidade, // 🚨 CORREÇÃO: Incluir cidade no registro offline
          };

          // Salvar usando saveRegistroToLocal (funciona em Android/iOS/Web)
          await supabaseDataService.saveRegistroToLocal(registroOffline);
          console.log('✅ [MODAL] Registro salvo offline com sucesso');

          showToast.success('Salvo offline', 'Registro será enviado quando voltar online');

          // Limpar formulário ANTES de recarregar
          setSelectedComum('');
          setSelectedCargo('');
          setSelectedInstrumento('');
          setSelectedPessoa('');
          setIsNomeManual(false);

          // Recarregar página após salvar (apenas web)
          if (Platform.OS === 'web' && typeof window !== 'undefined') {
          }
          return;
        } catch (filaError) {
          console.error('❌ [MODAL] Erro ao salvar offline:', filaError);
          showToast.error('Erro', 'Erro ao salvar registro offline. Tente novamente.');
          throw filaError;
        }
      }

      // 🚨 CRÍTICO: Para registros externos (modal de novo registro), enviar DIRETAMENTE para Google Sheets
      // NÃO usar createRegistro que tenta validar contra listas locais
      // Seguir o mesmo padrão do backupcont: enviar direto para Google Sheets, NÃO para Supabase
      console.log(
        '📤 [MODAL] Enviando registro externo diretamente para Google Sheets (sem validação local)'
      );
      console.log('📤 [MODAL] Dados do registro:', {
        nome: data.nome,
        comum: data.comum,
        cidade: data.cidade,
        cargo: cargoObj.nome,
        instrumento: instrumentoObj?.nome,
        classe: data.classe,
        localEnsaio: localEnsaioNome,
        localEnsaioOriginal: localEnsaio,
        registradoPor: nomeUsuario,
        userId: user.id,
      });
      console.log('🔄 [MODAL] Verificação de conversão de local:', {
        original: localEnsaio,
        convertido: localEnsaioNome,
        ehNumero: localEnsaio ? /^\d+$/.test(localEnsaio.trim()) : false,
      });

      console.log('🔄 [MODAL] ========== INICIANDO ENVIO PARA GOOGLE SHEETS ==========');
      console.log('🔄 [MODAL] Chamando sendExternalRegistroToSheet...');
      console.log('🔄 [MODAL] Parâmetros que serão enviados:', {
        nome: data.nome,
        comum: data.comum,
        cidade: data.cidade,
        cargo: cargoObj.nome,
        instrumento: instrumentoObj?.nome,
        classe: data.classe,
        localEnsaio: localEnsaioNome,
        localEnsaioOriginal: localEnsaio,
        registradoPor: nomeUsuario,
        userId: user.id,
      });
      console.log(
        '✅ [MODAL] CONFIRMAÇÃO: localEnsaio que será enviado é:',
        localEnsaioNome,
        '(deve ser nome, não ID)'
      );
      let result;
      try {
        console.log('🔄 [MODAL] ANTES de chamar sendExternalRegistroToSheet');
        console.log('📤 [MODAL] Dados que serão enviados:', {
          nome: data.nome,
          comum: data.comum,
          cidade: data.cidade,
          cargo: cargoObj.nome,
          instrumento: instrumentoObj?.nome,
          classe: data.classe,
        });
        result = await googleSheetsService.sendExternalRegistroToSheet({
          nome: data.nome,
          comum: data.comum,
          cidade: data.cidade,
          cargo: cargoObj.nome, // Usar nome do cargo encontrado
          instrumento: instrumentoObj?.nome,
          classe: data.classe,
          localEnsaio: localEnsaioNome,
          registradoPor: nomeUsuario,
          userId: user.id,
        });
        console.log('🔄 [MODAL] DEPOIS de chamar sendExternalRegistroToSheet');
        console.log('📥 [MODAL] Resultado do envio recebido:', result);
        console.log('📥 [MODAL] Tipo do resultado:', typeof result);
        console.log('📥 [MODAL] result.success:', result?.success);
        console.log('📥 [MODAL] result.error:', result?.error);
        console.log('📥 [MODAL] Resultado completo (JSON):', JSON.stringify(result, null, 2));

        // 🚨 CRÍTICO: Se result.success não é true, lançar exceção IMEDIATAMENTE
        // Isso garante que o modal não feche silenciosamente
        if (!result || result.success !== true) {
          const errorMsg = result?.error || 'Erro desconhecido ao enviar registro';
          console.error('❌ [MODAL] Envio falhou - lançando exceção:', errorMsg);
          throw new Error(errorMsg);
        }
      } catch (sendError: any) {
        console.error('❌ [MODAL] Erro ao chamar sendExternalRegistroToSheet:', sendError);
        console.error('❌ [MODAL] Detalhes do erro:', {
          message: sendError.message,
          name: sendError.name,
          stack: sendError.stack,
        });

        // 🚨 CRÍTICO: Mostrar erro IMEDIATAMENTE para o usuário
        const errorMessage = sendError.message || 'Erro ao enviar registro. Tente novamente.';
        console.error('❌ [MODAL] Exibindo toast de erro:', errorMessage);
        showToast.error('Erro ao salvar', errorMessage);

        // Se falhou, tentar salvar usando saveRegistroToLocal como fallback (funciona em Android/iOS/Web)
        console.log('🔄 [MODAL] Tentando salvar usando saveRegistroToLocal como fallback...');
        try {
          const registroFallback: RegistroPresenca & { cidade?: string } = {
            pessoa_id: `manual_${data.nome.toUpperCase()}`,
            comum_id: `external_${data.comum.toUpperCase()}_${Date.now()}`,
            cargo_id: cargoObj.id,
            instrumento_id: data.instrumento || undefined,
            classe_organista: data.classe || undefined,
            local_ensaio: localEnsaioNome,
            data_hora_registro: getCurrentDateTimeISO(),
            usuario_responsavel: nomeUsuario,
            status_sincronizacao: 'pending',
            cidade: data.cidade, // 🚨 CORREÇÃO: Incluir cidade no registro fallback
          };

          await supabaseDataService.saveRegistroToLocal(registroFallback);
          console.log('✅ [MODAL] Registro salvo como fallback');
          showToast.warning(
            'Salvo na fila',
            'Erro ao enviar. Registro será enviado quando possível.'
          );

          // Limpar formulário ANTES de recarregar
          setSelectedComum('');
          setSelectedCargo('');
          setSelectedInstrumento('');
          setSelectedPessoa('');
          setIsNomeManual(false);

          if (Platform.OS === 'web' && typeof window !== 'undefined') {
          }
          return;
        } catch (fallbackError) {
          console.error('❌ [MODAL] Erro crítico ao salvar fallback:', fallbackError);
          // Não mostrar outro toast de erro aqui - já mostramos acima
          throw sendError; // Re-lançar erro original
        }
      }

      // 🚨 CRÍTICO: Se chegou aqui, result.success é true (já verificamos acima)
      // Se não fosse true, teria lançado exceção no catch acima
      console.log('✅ [MODAL] Registro enviado com sucesso para Google Sheets');
      console.log('✅ [MODAL] Cargo que foi salvo:', cargoObj.nome);
      console.log('✅ [MODAL] Resultado completo:', result);

      // 🚨 CORREÇÃO: Salvar também no Supabase após envio bem-sucedido para Google Sheets
      console.log('💾 [MODAL] Salvando registro no Supabase...');
      console.log('💾 [MODAL] Dados do registro que será salvo no Supabase:', {
        pessoa_id: registro.pessoa_id,
        comum_id: registro.comum_id,
        cargo_id: registro.cargo_id,
        cargo_nome: cargoObj.nome,
        instrumento_id: registro.instrumento_id,
        classe_organista: registro.classe_organista,
        cidade: registro.cidade,
      });
      try {
        await supabaseDataService.createRegistroPresenca(registro, true);
        console.log('✅ [MODAL] Registro salvo no Supabase com sucesso');
        console.log('✅ [MODAL] Cargo "Instrutora" foi salvo corretamente:', {
          cargo_id: registro.cargo_id,
          cargo_nome: cargoObj.nome,
        });
      } catch (supabaseError) {
        // Não bloquear se Supabase falhar - Google Sheets já foi salvo
        console.error('❌ [MODAL] Erro ao salvar no Supabase:', supabaseError);
        console.error('❌ [MODAL] Detalhes do erro Supabase:', {
          error: supabaseError,
          cargo_id: registro.cargo_id,
          cargo_nome: cargoObj.nome,
          registro_completo: registro,
        });
        // Salvar na fila local para tentar novamente depois
        try {
          await supabaseDataService.saveRegistroToLocal(registro);
          console.log('✅ [MODAL] Registro salvo na fila local para sincronização posterior');
        } catch (filaError) {
          console.error('❌ [MODAL] Erro ao salvar na fila local:', filaError);
        }
      }

      // 🚀 MELHORIA: Toast compacto e elegante (uma linha)
      showToast.success('Registro de visita salvo com sucesso');

      // Limpar formulário ANTES de recarregar
      setSelectedComum('');
      setSelectedCargo('');
      setSelectedInstrumento('');
      setSelectedPessoa('');
      setIsNomeManual(false);

      // Recarregar página após salvar (aguardar mais tempo para toast aparecer)
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        // Aumentado de 1500ms para 2000ms para dar tempo do toast aparecer
      }
    } catch (error) {
      console.error('❌ [MODAL] Erro ao salvar novo registro:', error);
      const errorMessage =
        error instanceof Error ? error.message : 'Erro ao salvar registro. Tente novamente.';
      showToast.error('Erro', errorMessage);
      throw error; // Re-lançar para o modal tratar
    }
  };

  // 🚨 REMOVIDO: Log desnecessário que estava causando loop - função já está definida e funcionando

  return {
    user,
    navigation,
    isOnline,
    pendingCount,
    refreshCount,
    comuns,
    cargos,
    instrumentos,
    pessoas,
    loadingPessoas,
    selectedComum,
    setSelectedComum,
    selectedCargo,
    setSelectedCargo,
    selectedInstrumento,
    setSelectedInstrumento,
    selectedPessoa,
    setSelectedPessoa,
    isNomeManual,
    setIsNomeManual,
    nameFieldKey,
    setNameFieldKey,
    loading,
    setLoading,
    initialLoading,
    syncing,
    refreshing,
    onRefresh,
    comumFieldRef,
    duplicateModalVisible,
    setDuplicateModalVisible,
    duplicateInfo,
    setDuplicateInfo,
    pendingRegistro,
    setPendingRegistro,
    newRegistrationModalVisible,
    setNewRegistrationModalVisible,
    isOrganista,
    isCandidato,
    showInstrumento,
    syncData,
    loadInitialData,
    clearAllFields,
    loadPessoas,
    handleSubmit,
    comunsOptions,
    cargosOptions,
    instrumentosOptions,
    pessoasOptions,
    handleEditRegistros,
    handleOrganistasEnsaio,
    handleSaveNewRegistration,
  };
};
