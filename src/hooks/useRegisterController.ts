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
import { robustClear } from '../utils/robustStorage';
import { handleHardReset } from '../utils/appActions';
import { showToast } from '../utils/toast';
import { useNavigation } from '@react-navigation/native';
import { getNaipeByInstrumento } from '../utils/instrumentNaipe';
import { formatRegistradoPor } from '../utils/userNameUtils';
import { generateExternalUUID } from '../utils/uuid';

import { isCargoFemininoOrganista } from '../utils/normalizeCargoFeminino';

// Função auxiliar para pegar apenas Primeiro e Último nome conforme padrão EnR
const obterNomeCurto = (nc: string): string => {
  if (!nc) return '';
  const pedacos = nc.trim().split(/\s+/);
  if (pedacos.length <= 1) return pedacos[0] || '';
  return `${pedacos[0]} ${pedacos[pedacos.length - 1]}`;
};

export const useRegisterController = ({ isForaRegional = false } = {}) => {
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
  const [isComumManual, setIsComumManual] = useState(false);
  const [cidadeManual, setCidadeManual] = useState('');
  const [selectedClasseOrganista, setSelectedClasseOrganista] = useState<string>('');
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
  const cargoNome = selectedCargoObj?.nome || (selectedCargo.startsWith('manual_') ? selectedCargo.replace('manual_', '') : '');

  const isOrganista = isCargoFemininoOrganista(cargoNome);
  const isCandidato = cargoNome.trim().toUpperCase() === 'CANDIDATO (A)';
  const isInstrutor = cargoNome.trim().toUpperCase() === 'INSTRUTOR';

  // O campo de classe só deve aparecer para o cargo específico "Organista"
  // Para Instrutora e Examinadora, forçamos como "OFICIALIZADA" no envio
  const showClasseOrganista = cargoNome.trim().toUpperCase() === 'ORGANISTA';

  const isEncarregado = cargoNome.trim().toUpperCase().includes('ENCARREGADO');
  
  // Mostrar campo de instrumento para: 
  // 1. Músico (Musical=true)
  // 2. Instrutor
  // 3. Encarregados (Local/Regional) quando em "Outras Localidades" (isForaRegional=true)
  const showInstrumento = !isOrganista && !isCandidato && (
    selectedCargoObj?.is_musical || 
    cargoNome.trim().toUpperCase() === 'MÚSICO' || 
    isInstrutor || 
    (isForaRegional && isEncarregado)
  );

  // DEBUGGING VISIBILIDADE INSTRUMENTO
  console.log('🎸 [RegisterController] Visibilidade Instrumento:', {
    selectedCargo,
    cargoNome: cargoNome.trim().toUpperCase(),
    isOrganista,
    isCandidato,
    isInstrutor,
    is_musical: selectedCargoObj?.is_musical,
    showInstrumento
  });

  // Função de sincronização - declarada ANTES dos useEffects que a usam
  const syncData = useCallback(async () => {
    // Verificar se já está sincronizando
    if (syncing) {
      console.log('⏳ Sincronização já em andamento, aguardando...');
      return;
    }

    // Verificar se está online antes de sincronizar
    const isOnlineNow =
      Platform.OS === 'web' ? typeof navigator !== 'undefined' && navigator.onLine : isOnline;

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
            // Usar syncData para garantir que o estado syncing seja atualizado (mostra no badge)
            await syncData();
            console.log('✅ Fila processada automaticamente via syncData');
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
                  await syncData();
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
            // Usar syncData para que apareça "Sincronizando" no badge (recuperação de fila)
            await syncData();
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
        isForaRegional
          ? supabaseDataService.fetchComunsForaRegional()
          : supabaseDataService.getComunsFromLocal(),
        supabaseDataService.getCargosFromLocal(),
        (supabaseDataService as any).getInstrumentosFromLocal(),
      ]);

      console.log('📊 Dados carregados do local/cache:', {
        comuns: comunsData.length,
        cargos: cargosData.length,
        instrumentos: instrumentosData.length,
      });

      // Se ainda não há dados locais e está online, tentar buscar diretamente (fallback crítico)
      let finalComuns = comunsData;
      if (!isForaRegional && isOnline && comunsData.length === 0) {
        console.log('🔄 Nenhuma comum no cache local, buscando diretamente do Supabase...');
        try {
          const comunsDiretas = await supabaseDataService.fetchComuns();
          if (comunsDiretas.length > 0) {
            finalComuns = comunsDiretas;
            // Salvar no cache em background
            supabaseDataService
              .syncComunsToLocal()
              .catch(err => console.warn('⚠️ Erro ao salvar comuns no cache:', err));
          }
        } catch (error) {
          console.warn('⚠️ Erro ao buscar comuns diretamente:', error);
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
    setSelectedClasseOrganista('');
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

  // Função para Hard Reset (usando utilitário compartilhado)
  const onHardReset = useCallback(async () => {
    await handleHardReset();
  }, []);

  const loadPessoas = async () => {
    console.log('🔍 [loadPessoas] Iniciando com:', {
      selectedComum,
      selectedCargo,
      selectedInstrumento,
      isForaRegional
    });

    // 🚀 OTIMIZAÇÃO: Verificar cache primeiro antes de mostrar loading
    // Buscar nomes de comum e cargo rapidamente (já estão em memória)
    // 🚀 OTIMIZAÇÃO: Resolver nomes mesmo que sejam manuais
    let comumNome: string | undefined;
    let cargoNome: string | undefined;
    let instrumentoNome: string | undefined;

    if (selectedComum.startsWith('manual_')) {
      comumNome = selectedComum.replace(/^manual_/, '').split('|')[0];
    } else {
      comumNome = comuns.find(c => c.id === selectedComum)?.nome;
    }

    if (selectedCargo.startsWith('manual_')) {
      cargoNome = selectedCargo.replace(/^manual_/, '');
    } else {
      cargoNome = cargos.find(c => c.id === selectedCargo)?.nome;
    }

    if (selectedInstrumento) {
      instrumentoNome = instrumentos.find(i => i.id === selectedInstrumento)?.nome;
    }

    if (!comumNome || !cargoNome) {
      setPessoas([]);
      return;
    }

    // 🚀 OTIMIZAÇÃO: Verificar cache ANTES de mostrar loading
    const CACHE_VERSION = 'v4'; // Sincronizado com supabaseDataService.ts
    const cacheKey = `pessoas_${CACHE_VERSION}_${isForaRegional ? 'fora_' : ''}${comumNome}_${cargoNome}_${instrumentoNome || ''}`;

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
        const cargoBusca = cargoNome.trim().toUpperCase();
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
      console.log('🔍 [loadPessoas] Erro ao verificar cache, continuando com busca normal:', error);
    }

    // Se não encontrou cache, mostrar loading e buscar do banco
    setLoadingPessoas(true);
    setPessoas([]); // Limpar lista imediatamente para feedback visual

    try {
      console.log('🔍 [loadPessoas] Buscando do banco local/remoto...', {
        selectedComum,
        selectedCargo,
        isForaRegional
      });

      const pessoasData = await (supabaseDataService as any).getPessoasFromLocal(
        selectedComum,
        selectedCargo,
        showInstrumento ? selectedInstrumento : undefined,
        isForaRegional
      );

      console.log(`✅ [loadPessoas] Recebeu ${pessoasData.length} pessoas`);

      setPessoas(pessoasData);
    } catch (error) {
      console.error('❌ Erro ao carregar pessoas:', error);
      setPessoas([]);
    } finally {
      setLoadingPessoas(false);
    }
  };


  const handleSubmit = async () => {
    // 1. Buscar local de ensaio UMA ÚNICA VEZ para todo o processo de submissão
    // Isso evita problemas se o storage falhar intermitentemente entre verificações
    const localEnsaioUnico = await localStorageService.getLocalEnsaio();

    // 2. Verificar se existe local de ensaio definido (Prevenção contra 'NÃO DEFINIDO')
    if (!localEnsaioUnico || localEnsaioUnico === 'Não definido' || localEnsaioUnico.trim() === '') {
      console.error('❌ Submissão bloqueada: Local de ensaio não definido');
      showToast.error(
        'Sessão expirada',
        'Local de ensaio não localizado. Por favor, faça login novamente para continuar.'
      );
      setLoading(false);
      isSubmittingRef.current = false;
      return;
    }

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

      // Validar instrumento apenas para Músico e Instrutor (obrigatório)
      // Encarregados podem ter instrumento, mas NÃO é obrigatório
      const cargoNome = cargos.find(c => c.id === selectedCargo)?.nome || '';
      const instrumentoObrigatorio = cargoNome.trim().toUpperCase() === 'MÚSICO' || cargoNome.trim().toUpperCase() === 'INSTRUTOR'; 
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

      console.log('✅ [SUBMIT] Validações passaram, iniciando processamento otimista...');
      setLoading(true);

      try {
        // 1. Preparar os dados do registro (mesma lógica de antes)
        const localEnsaio = localEnsaioUnico;

        let nomeCompletoUsuario = user.nome;
        if (!nomeCompletoUsuario || nomeCompletoUsuario.trim() === '') {
          const emailSemDominio = user.email?.split('@')[0] || '';
          nomeCompletoUsuario = emailSemDominio.replace(/[._]/g, ' ').trim();
        }
        const nomeUsuario = formatRegistradoPor(nomeCompletoUsuario || user.id);

        let classeOrganistaFinal: string | undefined = undefined;
        if (isOrganista) {
          if (selectedClasseOrganista) {
            classeOrganistaFinal = selectedClasseOrganista;
          } else if (!isNomeManual) {
            const pessoaSelecionada = pessoas.find(p => p.id === selectedPessoa);
            if (pessoaSelecionada && pessoaSelecionada.classe_organista) {
              classeOrganistaFinal = pessoaSelecionada.classe_organista;
            } else {
              classeOrganistaFinal = 'OFICIALIZADA';
            }
          } else {
            classeOrganistaFinal = 'OFICIALIZADA';
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

        const registro: RegistroPresenca = {
          pessoa_id: pessoaIdFinal,
          comum_id: isComumManual ? (selectedComum.startsWith('manual_') ? selectedComum : `manual_${selectedComum}`) + (cidadeManual ? `|${cidadeManual}` : '') : selectedComum,
          cargo_id: selectedCargo,
          instrumento_id: isCandidato
            ? instrumentoCandidato
            : showInstrumento && selectedInstrumento
              ? selectedInstrumento
              : null,
          classe_organista: classeOrganistaFinal,
          local_ensaio: localEnsaio || 'Não definido',
          data_hora_registro: getCurrentDateTimeISO(),
          usuario_responsavel: nomeUsuario,
          status_sincronizacao: 'pending',
          id: generateExternalUUID(), // Garantir UUID único para a fila
        };

        // 2. Trava de Segurança: Verificar duplicata na fila local (rápido)
        const dupLocal = await supabaseDataService.checkDuplicataLocal({
          pessoaId: registro.pessoa_id,
          comumId: registro.comum_id,
          instrumentoId: registro.instrumento_id, // Usar instrumento agora
          dataIso: registro.data_hora_registro
        });

        if (dupLocal) {
          console.warn('🚨 Duplicata detectada na fila local');
          let nomePessoa = registro.pessoa_id.startsWith('manual_') 
            ? registro.pessoa_id.replace('manual_', '') 
            : (pessoas.find(p => p.id === registro.pessoa_id)?.nome_completo || '');
          
          if (!nomePessoa && !registro.pessoa_id.startsWith('manual_')) {
            const p = pessoas.find(p => p.id === registro.pessoa_id);
            if (p) nomePessoa = `${p.nome} ${p.sobrenome || ''}`.trim();
          }

          const nomeComum = comuns.find(c => c.id === registro.comum_id)?.nome || '';
          
          setDuplicateInfo({ 
            nome: obterNomeCurto(nomePessoa), // Usar nome curto conforme backup
            comum: nomeComum, 
            data: dupLocal.data, 
            horario: dupLocal.horario 
          });
          setPendingRegistro(registro);
          setDuplicateModalVisible(true);
          setLoading(false);
          isSubmittingRef.current = false;
          return;
        }

        // 3. Trava de Segurança: Verificar duplicata remota (rápido - 3s timeout) - SOMENTE SE ONLINE
        const isOnlineNow = await offlineSyncService.isOnline();
        if (isOnlineNow) {
          try {
            await supabaseDataService.checkDuplicataRemota({
              nome: registro.pessoa_id.startsWith('manual_') ? registro.pessoa_id.replace('manual_', '') : (pessoas.find(p => p.id === registro.pessoa_id)?.nome_completo || ''),
              comum: (comuns.find(c => c.id === registro.comum_id)?.nome || ''),
              instrumento: (instrumentos.find(i => i.id === registro.instrumento_id)?.nome || ''), // Passar instrumento
              dataIso: registro.data_hora_registro
            });
          } catch (dupError: any) {
            if (dupError.message?.includes('DUPLICATA_BLOQUEADA')) {
              console.warn('🚨 Duplicata remota detectada:', dupError.message);
              
              // Parsing robusto: Ignorar prefixos e colons que fogem do padrão (ex: colons no horário)
              const msg = dupError.message;
              let infoStr = '';
              if (msg.includes('DUPLICATA:')) {
                infoStr = msg.split('DUPLICATA:')[1];
              } else if (msg.includes('DUPLICATA_BLOQUEADA:')) {
                infoStr = msg.split('DUPLICATA_BLOQUEADA:')[1];
              }
              
              const details = infoStr ? infoStr.split('|') : [];
              
              if (details.length >= 4) {
                setDuplicateInfo({ 
                  nome: obterNomeCurto(details[0]), 
                  comum: details[1], 
                  data: details[2], 
                  horario: details[3] 
                });
              } else {
                console.error('❌ Falha ao parsear detalhes da duplicata remota:', infoStr);
                // Usar dados do formulário mas marcar como desconhecido se o parsing falhar
                const nomeFallback = registro.pessoa_id.startsWith('manual_') ? registro.pessoa_id.replace('manual_', '') : (pessoas.find(p => p.id === registro.pessoa_id)?.nome_completo || '');
                const comumFallback = comuns.find(c => c.id === registro.comum_id)?.nome || '';
                setDuplicateInfo({ 
                  nome: obterNomeCurto(nomeFallback), 
                  comum: comumFallback, 
                  data: '--/--/----', 
                  horario: '--:--:--' 
                });
              }
              
              setPendingRegistro(registro);
              setDuplicateModalVisible(true);
              setLoading(false);
              isSubmittingRef.current = false;
              return;
            }
          }
        }

        // 4. Salvar localmente (quase instantâneo)
        console.log('💾 [SUBMIT] Salvando registro na fila para processamento em segundo plano...');
        await supabaseDataService.saveRegistroToLocal(registro);
        
        // 5. Feedback imediato ao usuário (O QUE O USUÁRIO PEDIU)
        // Liberar tela e mostrar sucesso rápido (2 segundos conforme pedido)
        showToast.success('Registro Salvo!', 'O registro foi realizado com sucesso!', 2000);
        
        // Limpar campos imediatamente
        clearAllFields();
        await refreshCount();

        // 5. Encerrar estado de loading e trava de submissão
        setLoading(false);
        isSubmittingRef.current = false;

        // 6. Disparar sincronização em segundo plano (SEM AWAIT)
        // 🚨 SILENCIO NO ONLINE: Não setar 'syncing' para não aparecer no badge enquanto online
        console.log('🔄 [SUBMIT] Disparando sincronização silenciosa em background...');
        offlineSyncService
          .processarFilaLocal(true) // 🚨 MODO SILENCIOSO: Não mostrar alerta de fila processada no online
          .catch(err => {

            console.error('❌ [SUBMIT] Erro na sincronização em background:', err);
          })
          .finally(() => {
            refreshCount(); // Atualizar contagem final
          });

      } catch (error) {
        console.error('❌ [SUBMIT] Erro no processamento otimista:', error);
        showToast.error('Erro', 'Ocorreu um erro ao salvar o registro localmente.');
        setLoading(false);
        isSubmittingRef.current = false;
      }
    } finally {
      // Garantia final
      setLoading(false);
      isSubmittingRef.current = false;
    }
  };

  // Exibir apenas o nome sem código na busca, mas manter código completo no valor
  // MEMOIZAR para evitar recriação constante que causa loops
  // IMPORTANTE: useMemo DEVE estar ANTES de qualquer return condicional
  const comunsOptions = useMemo(() => {
    return comuns.map(c => {
      // Priorizar displayName (já limpo no fetching)
      const nomeExibicao = c.displayName || (supabaseDataService as any).extrairNomeComum(c.nome);
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
      showToast.error('Erro', 'Não foi possível acessar a página de organistas.');
    }
  };

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

    console.log('✅ [MODAL] Iniciando processamento otimista para novo registro...');

    try {
      // 1. Preparar os dados (mesma lógica de conversão de local e nome)
      let localEnsaio = await localStorageService.getLocalEnsaio();
      let localEnsaioNome: string = 'Não definido';
      if (localEnsaio) {
        if (/^\d+$/.test(localEnsaio.trim())) {
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
        } else {
          localEnsaioNome = localEnsaio.trim();
        }
      }

      let nomeCompletoUsuario = user.nome;
      if (!nomeCompletoUsuario || nomeCompletoUsuario.trim() === '') {
        const emailSemDominio = user.email?.split('@')[0] || '';
        nomeCompletoUsuario = emailSemDominio.replace(/[._]/g, ' ').trim();
      }
      const nomeUsuario = formatRegistradoPor(nomeCompletoUsuario || user.id);

      // Buscar ID do cargo correspondente ao nome recebido do modal
      let cargoObj = cargos.find(c => c.nome === data.cargo);
      if (!cargoObj) {
        cargoObj = cargos.find(c => c.id === data.cargo);
      }

      if (!cargoObj) {
        console.error('❌ [MODAL] Cargo não encontrado:', data.cargo);
        Alert.alert('Erro', `Cargo "${data.cargo}" não encontrado`);
        return;
      }

      // Criar o registro externo
      const registro: RegistroPresenca = {
        pessoa_id: `manual_${data.nome.toUpperCase()}`,
        comum_id: `external_${data.comum.toUpperCase()}_${Date.now()}`,
        cargo_id: cargoObj.id,
        instrumento_id: data.instrumento || undefined,
        classe_organista: data.classe || undefined,
        local_ensaio: localEnsaioNome,
        data_hora_registro: getCurrentDateTimeISO(),
        usuario_responsavel: nomeUsuario,
        status_sincronizacao: 'pending',
        cidade: data.cidade, // Campo agora suportado no modelo
        id: generateExternalUUID(),
      };

      // 2. Trava de Segurança: Verificar duplicata na fila local
      const dupLocal = await supabaseDataService.checkDuplicataLocal({
        pessoaId: registro.pessoa_id,
        comumId: registro.comum_id,
        instrumentoId: registro.instrumento_id,
        dataIso: registro.data_hora_registro
      });

      if (dupLocal) {
        console.warn('🚨 Duplicata detectada no modal (fila local)');
        setDuplicateInfo({ 
          nome: obterNomeCurto(data.nome.toUpperCase()), 
          comum: data.comum.toUpperCase(), 
          data: dupLocal.data, 
          horario: dupLocal.horario 
        });
        setPendingRegistro(registro);
        setDuplicateModalVisible(true);
        setNewRegistrationModalVisible(false);
        setLoading(false);
        isSubmittingRef.current = false;
        return;
      }

      // 3. Trava de Segurança: Verificar duplicata remota (SOMENTE SE ONLINE)
      const isOnlineNow = await offlineSyncService.isOnline();
      if (isOnlineNow) {
        try {
          await supabaseDataService.checkDuplicataRemota({
            nome: data.nome.toUpperCase(),
            comum: data.comum.toUpperCase(),
            instrumento: (instrumentos.find(i => i.id === registro.instrumento_id)?.nome || ''), // Passar instrumento
            dataIso: registro.data_hora_registro
          });
        } catch (dupError: any) {
          if (dupError.message?.includes('DUPLICATA_BLOQUEADA')) {
            console.warn('🚨 Duplicata remota detectada no modal:', dupError.message);
            
            const msg = dupError.message;
            let infoStr = '';
            if (msg.includes('DUPLICATA:')) {
              infoStr = msg.split('DUPLICATA:')[1];
            } else if (msg.includes('DUPLICATA_BLOQUEADA:')) {
              infoStr = msg.split('DUPLICATA_BLOQUEADA:')[1];
            }
            
            const details = infoStr ? infoStr.split('|') : [];
            
            if (details.length >= 4) {
              setDuplicateInfo({ 
                nome: obterNomeCurto(details[0]), 
                comum: details[1], 
                data: details[2], 
                horario: details[3] 
              });
            } else {
              setDuplicateInfo({ 
                nome: obterNomeCurto(data.nome.toUpperCase()), 
                comum: data.comum.toUpperCase(), 
                data: '--/--/----', 
                horario: '--:--:--' 
              });
            }
            
            setPendingRegistro(registro);
            setDuplicateModalVisible(true);
            setNewRegistrationModalVisible(false);
            setLoading(false);
            isSubmittingRef.current = false;
            return;
          }
        }
      }

      // 4. Salvar localmente (quase instantâneo)
      console.log('💾 [MODAL] Salvando registro externo na fila...');
      await supabaseDataService.saveRegistroToLocal(registro);

      // 3. Feedback imediato ao usuário
      showToast.success('Registro Salvo!', 'O registro foi realizado com sucesso!', 2000);

      // 4. Limpar e fechar
      setNewRegistrationModalVisible(false); // Fechar o modal imediatamente
      setSelectedComum('');
      setSelectedCargo('');
      setSelectedInstrumento('');
      setSelectedPessoa('');
      setIsNomeManual(false);
      await refreshCount();

      // 5. Disparar sincronização em background (SEM AWAIT)
      console.log('🔄 [MODAL] Disparando sincronização em background...');
      offlineSyncService.processarFilaLocal(true).catch(err => {
        console.error('❌ [MODAL] Erro na sincronização em background:', err);
      });

    } catch (error) {
      console.error('❌ [MODAL] Erro no processamento otimista:', error);
      showToast.error('Erro', 'Ocorreu um erro ao salvar o registro localmente.');
    }
  };

  const handleConfirmDuplicate = async () => {
    if (!pendingRegistro) {
      setDuplicateModalVisible(false);
      setDuplicateInfo(null);
      return;
    }

    try {
      console.log('💾 [DUP_CONFIRM] Iniciando registro ultra-rápido de duplicata...');
      
      // 1. Fechar modal IMEDIATAMENTE e travar submissão
      setDuplicateModalVisible(false);
      setDuplicateInfo(null);
      setLoading(true);
      isSubmittingRef.current = true;

      // 2. Salvar localmente (quase instantâneo)
      const registro = { ...pendingRegistro };
      await supabaseDataService.saveRegistroToLocal(registro);

      // 3. Feedback imediato ao usuário (Mesma mensagem do handleSubmit)
      showToast.success('Registro Salvo!', 'O registro foi realizado com sucesso!', 2000);

      // 4. Limpar campos e liberar UI
      clearAllFields();
      setPendingRegistro(null);
      await refreshCount();

      // 4. Se for visitinte de outra localidade, voltar após o toast (conforme comportamento da tela)
      if (isForaRegional) {
        setTimeout(() => {
          navigation.goBack();
        }, 500);
      }

      setLoading(false);
      isSubmittingRef.current = false;

      // 6. Disparar sincronização silenciosa em background
      console.log('🔄 [DUP_CONFIRM] Disparando sincronização silenciosa...');
      offlineSyncService.processarFilaLocal(true).catch(err => {
        console.error('❌ [DUP_CONFIRM] Erro na sincronização em background:', err);
      });

    } catch (error) {
      console.error('❌ [DUP_CONFIRM] Erro no processamento otimista:', error);
      showToast.error('Erro', 'Ocorreu um erro ao salvar o registro localmente.');
      setLoading(false);
      isSubmittingRef.current = false;
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
    isComumManual,
    setIsComumManual,
    cidadeManual,
    setCidadeManual,
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
    handleConfirmDuplicate,
    handleHardReset: onHardReset,
    selectedClasseOrganista,
    setSelectedClasseOrganista,
    showClasseOrganista,
  };
}
