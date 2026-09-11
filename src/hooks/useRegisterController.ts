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
import { SimpleSelectField, SimpleSelectFieldRef } from '../components/SimpleSelectField';
import { AutocompleteField, AutocompleteFieldRef } from '../components/AutocompleteField';
import { NameSelectField, NameSelectFieldRef } from '../components/NameSelectField';
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
import { normalizeInstrumentoForSearch } from '../utils/normalizeInstrumento';
import { formatRegistradoPor } from '../utils/userNameUtils';
import { generateExternalUUID, generateDeterministicUUID } from '../utils/uuid';
import { resolveComumById } from '../utils/normalizeComum';

import { isCargoFemininoOrganista } from '../utils/normalizeCargoFeminino';

// Função auxiliar para pegar apenas Primeiro e Ãšltimo nome conforme padrão EnR
const obterNomeCurto = (nc: string): string => {
  if (!nc) return '';
  const pedacos = nc.trim().split(/\s+/);
  if (pedacos.length <= 1) return pedacos[0] || '';
  return `${pedacos[0]} ${pedacos[pedacos.length - 1]}`;
};

const obterDetalheDuplicata = (cargo?: string, instrumento?: string): string | undefined => {
  const cargoLimpo = (cargo || '').trim().toUpperCase();
  const instrumentoLimpo = (instrumento || '').trim().toUpperCase();
  const cargoNormalizado = normalizeString(cargoLimpo);

  if (cargoNormalizado.includes('MUSICO') && instrumentoLimpo) {
    return `com ${instrumentoLimpo}`;
  }

  return cargoLimpo ? `como ${cargoLimpo}` : undefined;
};

export const useRegisterController = ({ isForaRegional: initialIsForaRegional = false } = {}) => {
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
  const [isForaRegional, setIsForaRegional] = useState(initialIsForaRegional);
  const [selectedCargo, setSelectedCargo] = useState<string>('');
  const [selectedInstrumento, setSelectedInstrumento] = useState<string>('');
  const [selectedPessoa, setSelectedPessoa] = useState<string>('');
  const [isNomeManual, setIsNomeManual] = useState(false);
  const [isComumManual, setIsComumManual] = useState(false);
  const [cidadeManual, setCidadeManual] = useState('');
  const [selectedClasseOrganista, setSelectedClasseOrganista] = useState<string>('');
  const [nameFieldKey, setNameFieldKey] = useState(0); // Key para forçar remontagem do NameSelectField

  // monitorar selectedComum para determinar isForaRegional
  useEffect(() => {
    if (!selectedComum) {
      setIsForaRegional(initialIsForaRegional);
      return;
    }
    const isFora = selectedComum.startsWith('comum_fora_') || selectedComum.startsWith('manual_');
    setIsForaRegional(isFora);
  }, [selectedComum, initialIsForaRegional]);

  // Monitorar transição de regional/fora regional para limpar campos dependentes
  const lastIsForaRegionalRef = useRef(isForaRegional);
  useEffect(() => {
    if (lastIsForaRegionalRef.current !== isForaRegional) {
      console.log('🔄 [RegisterController] Mudança no status de Regional detectada. Limpando campos dependentes.');
      setSelectedCargo('');
      setSelectedInstrumento('');
      setSelectedPessoa('');
      setIsNomeManual(false);
      setSelectedClasseOrganista('');
      lastIsForaRegionalRef.current = isForaRegional;
    }
  }, [isForaRegional]);

  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const syncIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const loadPessoasTimeoutRef = useRef<NodeJS.Timeout | null>(null); // 🚀 OTIMIZAÇÃƒO: Ref para debounce
  const comumFieldRef = useRef<AutocompleteFieldRef>(null); // 🚀 REF: Para focar no campo de comum após registro
  const cargoFieldRef = useRef<any>(null); // 🚀 REF: Para focar no cargo (Web: select, Mobile: SimpleSelectField)
  const nomeFieldRef = useRef<NameSelectFieldRef>(null); // 🚀 REF: Para focar no nome após cargo selecionado
  const suppressSyncSuccessToastUntilRef = useRef<number>(0);
  const [duplicateModalVisible, setDuplicateModalVisible] = useState(false);
  const [duplicateInfo, setDuplicateInfo] = useState<{
    nome: string;
    comum: string;
    detalhe?: string;
    data: string;
    horario: string;
    isForaRegional: boolean;
  } | null>(null);
  const [pendingRegistro, setPendingRegistro] = useState<RegistroPresenca | null>(null);
  const [newRegistrationModalVisible, setNewRegistrationModalVisible] = useState(false);

  // 🚨 PROTEÇÃƒO SÃNCRONA: Ref contra duplo-clique acidental (debounce/throttle de React State)
  const isSubmittingRef = useRef<boolean>(false);

  // 🚨 CORREÇÃƒO: Modal funciona offline - salva na fila automaticamente quando não há conexão

  // Mostrar campo de instrumento apenas para Músico
  // Organista NÃƒO mostra campo de instrumento (sempre toca órgão)
  const selectedCargoObj = cargos.find(c => c.id === selectedCargo);
  const cargoNome = selectedCargoObj?.nome || (selectedCargo.startsWith('manual_') ? selectedCargo.replace('manual_', '') : '');

  const normalizedCargo = cargoNome.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toUpperCase();

  const isOrganista = isCargoFemininoOrganista(cargoNome) || normalizedCargo === 'ORGANISTA';
  const isCandidato = normalizedCargo === 'CANDIDATO (A)' || normalizedCargo === 'CANDIDATO' || normalizedCargo === 'CANDIDATA';
  const isInstrutor = normalizedCargo === 'INSTRUTOR' || normalizedCargo === 'INSTRUTORA';

  // O campo de classe só deve aparecer para o cargo específico "Organista"
  // Para Instrutora e Examinadora, forçamos como "OFICIALIZADA" no envio
  // Modificado: O campo de classe só deve aparecer quando a comum não retornar o nome (isNomeManual)
  // ou quando for de fora da regional e o cadastro estiver incompleto.
  const isEncarregado = normalizedCargo.includes('ENCARREGADO');
  
  // Mostrar campo de instrumento para: 
  // 1. Músico (Musical=true)
  // 2. Instrutor
  // 3. Encarregados (Local/Regional) quando em "Outras Localidades" (isForaRegional=true)
  // 🚨 NOVO FLUXO: Mostramos o campo se:
  // - For "Outras Localidades" (tudo manual)
  // - For Nome Manual (não encontrado na lista)
  // - For uma pessoa selecionada mas que veio SEM instrumento do banco de dados (falha no mapeamento ou dado incompleto)
  const isMusicalCargo = selectedCargoObj?.is_musical || 
                         normalizedCargo === 'MUSICO' || 
                         isInstrutor || 
                         (isForaRegional && isEncarregado);

  const selectedPessoaData = useMemo(() => {
    if (!selectedPessoa || isNomeManual) return null;
    return pessoas.find(p => p.id === selectedPessoa);
  }, [selectedPessoa, isNomeManual, pessoas]);

  const showClasseOrganista = normalizedCargo === 'ORGANISTA' && (
    isNomeManual ||
    (isForaRegional && !!selectedPessoa && !selectedPessoaData?.classe_organista && !selectedPessoaData?.nivel)
  );

  const showInstrumento = !isOrganista && !isCandidato && isMusicalCargo && (
    isNomeManual ||
    (isForaRegional && !!selectedPessoa && !selectedPessoaData?.instrumento_id)
  );

  // DEBUGGING VISIBILIDADE INSTRUMENTO
  console.log('🎸 [RegisterController] Visibilidade Instrumento:', {
    selectedCargo,
    cargoNome: cargoNome.trim().toUpperCase(),
    isOrganista,
    isCandidato,
    isMusicalCargo,
    selectedPessoa,
    hasPessoaInstrumento: selectedPessoaData?.instrumento_id,
    showInstrumento
  });

  // Função de sincronização - declarada ANTES dos useEffects que a usam
  const syncData = useCallback(async () => {
    // Verificar se já está sincronizando
    if (syncing) {
      console.log('â³ Sincronização já em andamento, aguardando...');
      return;
    }

    // Verificar se está online antes de sincronizar
    const isOnlineNow =
      Platform.OS === 'web' ? typeof navigator !== 'undefined' && navigator.onLine : isOnline;

    if (!isOnlineNow) {
      console.log('📴 Sem conexão - não Ã© possível sincronizar agora');
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
      if (result.successCount > 0 && Date.now() > suppressSyncSuccessToastUntilRef.current) {
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
        console.error('âŒ [SYNC] Erro ao sincronizar:', error);
      } else {
        console.log('📴 [SYNC] Erro de rede (esperado se offline):', errorMessage);
      }
    } finally {
      setSyncing(false);
    }
  }, [syncing, isOnline, refreshCount]);

  const syncDataFast = useCallback(async () => {
    if (syncing) return;
    setSyncing(true);
    try {
      const result = await offlineSyncService.syncAllData({ fastSync: true });
      await refreshCount();
      const successCount = result.syncResult?.successCount || 0;
      if (successCount > 0 && Date.now() > suppressSyncSuccessToastUntilRef.current) {
        showToast.success(`${successCount} item(s) sincronizado(s)`);
      }
    } catch (error) {
      console.log('📴 [SYNC FAST] Erro:', error);
    } finally {
      setSyncing(false);
    }
  }, [syncing, refreshCount]);

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
        console.log('ðŸŒ Conexão restaurada - iniciando sincronização automática...');

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
                  syncDataFast().catch(error => {
                    console.error('âŒ Erro na sincronização automática ao voltar online:', error);
                  });
                }
              }, 500); // Reduzido de 1500ms para 500ms para ser mais rápido
            } else {
              console.log('📭 Nenhum registro pendente para sincronizar');
            }
          })
          .catch(error => {
            console.error('âŒ Erro ao verificar registros pendentes:', error);
            // Tentar sincronizar mesmo assim
            setTimeout(() => {
              if (!syncing) {
                syncData().catch(err => {
                  console.error('âŒ Erro na sincronização automática:', err);
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
      console.log('ðŸŒ Evento online detectado - verificando conectividade real');

      // Aguardar um pouco para garantir que a conexão está estável (como BACKUPCONT)
      setTimeout(async () => {
        try {
          const isReallyOnline = await offlineSyncService.isOnline();
          if (isReallyOnline) {
            console.log('✅ Conectividade real confirmada - processando fila');
            await syncDataFast();
            console.log('✅ Fila processada automaticamente via syncDataFast');
          }
        } catch (e) {
          console.error('âŒ Erro ao verificar conectividade:', e);
        }
      }, 1000); // Reduzido de 3000ms para 1000ms
    };

    const handleOffline = () => {
      console.log('📵 Conexão perdida - modo offline ativado');
      // Sem modal: os registros continuam sendo salvos na fila automaticamente.
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

        // 🚨 CRÃTICO: Só mostrar alerta quando status MUDAR (não na primeira verificação)
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
                console.error('âŒ Erro ao verificar conectividade:', e);
              }
            }, 3000);
          } else {
            // Ficou offline
            console.log('📵 Conexão perdida - modo offline ativado');
            // Sem modal: o badge da fila ja informa o estado ao usuario.
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
        console.error('âŒ Erro no processamento periódico:', error);
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

  // 🚀 OTIMIZAÇÃƒO: Carregar com debounce leve (100ms) para evitar múltiplas chamadas rápidas
  // MantÃ©m resposta rápida mas evita queries desnecessárias
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

    // 🚨 NOVO FLUXO: Não bloquear busca de pessoas se o instrumento não estiver selecionado
    // Isso permite que o sistema busque todos os músicos da comum/cargo primeiro
    if (selectedComum && selectedCargo) {

      // 🚨 CORREÇÃƒO: Não recarregar se o instrumento mudar mas já tivermos uma pessoa selecionada (Fora Regional)
      // Isso evita que o nome selecionado "suma" da lista quando o usuário escolhe um instrumento manualmente
      if (isForaRegional && selectedPessoa && !isNomeManual && selectedInstrumento) {
        console.log('â­ï¸ [RegisterController] Pulando loadPessoas (pessoa já selecionada)');
        console.log('⏭️ [RegisterController] Pulando loadPessoas (pessoa já selecionada)');
        return;
      }

      // 🚀 OTIMIZAÇÃƒO: Debounce de 300ms (aumentado de 100ms) para evitar múltiplas chamadas rápidas
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
  }, [selectedComum, selectedCargo, selectedInstrumento, cargos, isForaRegional, selectedPessoa, isNomeManual]);

  const loadInitialData = async (isRefresh = false) => {
    try {
      if (!isRefresh) {
        setInitialLoading(true);
      }

      // Carregar o cache primeiro. Sincronização de rede nunca bloqueia a abertura da tela.
      // Carregar do banco local/cache em paralelo (mais rápido)
      // Se formos a tela principal (initialIsForaRegional = false), carregamos comuns regionais E de fora para busca unificada
      let comunsFinal: Comum[] = [];
      let cargosData: Cargo[] = [];
      let instrumentosData: Instrumento[] = [];
      let missingRegionalComuns = false;;

      if (!initialIsForaRegional) {
        console.log('🔄 [RegisterController] Carregando comuns regional e fora regional...');
        const [comunsLocal, comunsFora, cargosLocal, instrumentosLocal] = await Promise.all([
          supabaseDataService.getComunsFromLocal(),
          // Referências externas são opcionais e não podem bloquear o atendimento.
          Promise.resolve([] as Comum[]),
          supabaseDataService.getCargosFromLocal(),
          (supabaseDataService as any).getInstrumentosFromLocal(),
        ]);
        comunsFinal = [...comunsLocal, ...comunsFora];
        cargosData = cargosLocal;
        instrumentosData = instrumentosLocal;
        
        if (comunsLocal.length === 0) {
          missingRegionalComuns = true;
        }
      } else {
        // Para tela legada de outras localidades, carregar apenas fora regional
        const [comunsFora, cargosLocal, instrumentosLocal] = await Promise.all([
          supabaseDataService.fetchComunsForaRegional(),
          supabaseDataService.getCargosFromLocal(),
          (supabaseDataService as any).getInstrumentosFromLocal(),
        ]);
        comunsFinal = comunsFora;
        cargosData = cargosLocal;
        instrumentosData = instrumentosLocal;
      }

      console.log('💾Dados carregados do local/cache:', {
        comuns: comunsFinal.length,
        cargos: cargosData.length,
        instrumentos: instrumentosData.length,
      });

      // Se ainda não há dados locais regionais e está online, tentar buscar diretamente (fallback crítico)
      if (!initialIsForaRegional && isOnline && missingRegionalComuns) {
        console.log('🔄 Nenhuma comum regional no cache local, buscando diretamente do Supabase...');
        try {
          const comunsDiretas = await supabaseDataService.fetchComuns();
          if (comunsDiretas.length > 0) {
            // Recriar a lista final com as comuns recém buscadas + as de fora já carregadas
            // Como comunsLocal estava vazio, comunsFinal tem apenas as de fora
            const comunsFora = comunsFinal;
            comunsFinal = [...comunsDiretas, ...comunsFora];
            
            // Salvar no cache em background
            supabaseDataService
              .syncComunsToLocal()
              .catch(err => console.warn('⚠️ Erro ao salvar comuns no cache:', err));
          }
        } catch (error) {
          console.warn('âš ï¸ Erro ao buscar comuns diretamente:', error);
        }
      }

      setComuns(comunsFinal);
      setCargos(cargosData);
      setInstrumentos(instrumentosData);

      if (comunsFinal.length === 0) {
        console.warn('âš ï¸ Nenhuma comum encontrada após todas as tentativas');
      }
    } catch (error) {
      console.error('âŒ Erro crítico ao carregar dados iniciais:', error);
      showToast.error('Erro', 'Não foi possível carregar os dados base. Verifique sua conexão.');
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
    setIsComumManual(false);
    setCidadeManual('');
    setNameFieldKey(prev => prev + 1);

    setTimeout(() => {
      if (comumFieldRef.current) {
        comumFieldRef.current.focus();
        console.log('🎯 Focando no campo de comum após limpar formulário');
      }
    }, 100);
  }, []);

  // 🚀 FOCO AUTOMÃTICO: Focar no campo de comum após carregar a página (web e mobile)
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
    if (refreshing) {
      console.log('⏳ Pull-to-refresh já em andamento, ignorando...');
      return;
    }

    try {
      setRefreshing(true);
      console.log('🔄 Pull-to-refresh: recarregando dados e limpando campos...');

      // 🚨 CRÃTICO: Limpar todos os campos do formulário primeiro
      console.log('🧹 Limpando campos do formulário...');
      clearAllFields();

      // Mostrar feedback visual imediato
      showToast.info('Atualizando...', 'Recarregando dados');

      // O refresh nunca espera rede: recarrega cache e libera a interface.
      // A fila será tentada em segundo plano ao final.

      // 1. Recarregar dados iniciais (comuns, cargos, instrumentos) - passando true para isRefresh
      console.log('📚 Recarregando dados iniciais...');
      loadInitialData(true).catch(error => console.log('📴 [REFRESH] Recarga adiada:', error));

      // 3. Atualizar contador da fila
      console.log('📊 Atualizando contador da fila...');
      await refreshCount();

      // Sincronização desacoplada: falhas ou lentidão não prendem o refresh.
      if (isOnline) {
        syncData().catch(error => console.log('📴 [REFRESH] Sincronização adiada:', error));
      }

      // Feedback de sucesso
      showToast.success('Atualizado!', 'Dados locais recarregados e campos limpos');
      console.log('✅ Pull-to-refresh concluído com sucesso - campos limpos');
    } catch (error) {
      console.error('âŒ Erro ao atualizar:', error);
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
    console.log('ðŸ” [loadPessoas] Iniciando com:', {
      selectedComum,
      selectedCargo,
      selectedInstrumento,
      isForaRegional
    });

    // 🚀 OTIMIZAÇÃƒO: Verificar cache primeiro antes de mostrar loading
    // Buscar nomes de comum e cargo rapidamente (já estão em memória)
    // 🚀 OTIMIZAÇÃƒO: Resolver nomes mesmo que sejam manuais
    let comumNome: string | undefined;
    let cargoNome: string | undefined;
    let instrumentoNome: string | undefined;

    if (selectedComum.startsWith('manual_')) {
      comumNome = selectedComum.replace(/^manual_/, '').split('|')[0];
    } else {
      comumNome = resolveComumById(comuns, selectedComum)?.nome;
    }

    if (selectedCargo.startsWith('manual_')) {
      cargoNome = selectedCargo.replace(/^manual_/, '');
    } else {
      cargoNome = cargos.find(c => c.id === selectedCargo)?.nome;
    }

    if (selectedInstrumento && !isForaRegional) {
      instrumentoNome = instrumentos.find(i => i.id === selectedInstrumento)?.nome;
    }

    if (!comumNome || !cargoNome) {
      setPessoas([]);
      return;
    }

    // 🚀 OTIMIZAÇÃƒO: Verificar cache ANTES de mostrar loading
    const CACHE_VERSION = 'v7'; // Bust cache to apply exact common matching for fora-regional names
    const cacheKey = `pessoas_${CACHE_VERSION}_${isForaRegional ? 'fora_' : ''}${comumNome}_${cargoNome}_${instrumentoNome || ''}`;

    try {
      // Tentar buscar do cache primeiro (síncrono/assíncrono rápido)
      const cached = await cacheManager.get<any[]>(cacheKey, 'pessoas');

      if (cached && cached.length > 0) {
        // 🚀 Cache encontrado - aplicar filtro de cargo e converter
        console.log(
          `✅ [loadPessoas] Cache encontrado: ${cached.length} pessoas - aplicando filtros`
        );

        // 🚨 CORREÇÃƒO: Aplicar filtro de cargo tambÃ©m nos dados do cache (mesma lógica do fetchPessoasFromCadastro)
        let filteredCached = cached;
        const cargoBusca = cargoNome.trim().toUpperCase();
        if (
          cargoBusca !== 'ORGANISTA' &&
          cargoBusca !== 'MÃšSICO' &&
          !cargoBusca.includes('MÃšSICO')
        ) {
          const cargoBuscaNormalizado = normalizeString(cargoBusca);
          filteredCached = cached.filter((item: any) => {
            if (!item.cargo) return false;
            const itemCargoNormalizado = normalizeString(item.cargo.toUpperCase());

            if (itemCargoNormalizado === cargoBuscaNormalizado) return true;
            if (itemCargoNormalizado.includes(cargoBuscaNormalizado)) {
              const cargosConhecidos = [
                'ORGANISTA',
                'MÃšSICO',
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
            `ðŸ” [loadPessoas] Filtro aplicado no cache: ${cached.length} â†’ ${filteredCached.length} resultados`
          );
        }

        // Converter dados do cache para formato Pessoa[]
        const pessoas: Pessoa[] = filteredCached.map((p: any) => {
          const nomeCompleto = (p.nome || '').trim();
          const partesNome = nomeCompleto.split(' ').filter((p: string) => p.trim());
          const primeiroNome = partesNome[0] || '';
          const ultimoNome = partesNome.length > 1 ? partesNome[partesNome.length - 1] : '';

          // 🚨 NOVO: Mapear ID do instrumento pelo nome (mesma lógica do supabaseDataService)
          let realInstrumentoId = null;
          if (p.instrumento) {
            const instNomeBusca = normalizeInstrumentoForSearch(p.instrumento);
            // Correspondencia exata: CLARINETE nao pode capturar
            // CLARINETE BAIXO apenas por ser um prefixo do nome.
            const instEncontrado = instrumentos.find(
              i => normalizeInstrumentoForSearch(i.nome) === instNomeBusca
            );
            if (instEncontrado) realInstrumentoId = instEncontrado.id;
          }

          // 🚨 NOVO: Mapear ID do cargo pelo nome real do banco (evita Encarregado virar Músico)
          let realCargoId = selectedCargo;
          if (p.cargo) {
            const cargoNomeBusca = p.cargo.trim().toUpperCase();
            const cargoEncontrado = cargos.find(c => c.nome.toUpperCase() === cargoNomeBusca);
            if (cargoEncontrado) {
              realCargoId = cargoEncontrado.id;
              console.log(`ðŸ‘” [loadPessoas] Mapeado cargo real: "${cargoNomeBusca}" -> ${realCargoId}`);
            }
          }

          const pessoa: Pessoa = {
            id: p.id || `p_${nomeCompleto.toLowerCase().replace(/\s+/g, '_')}_${(comumNome || '').toLowerCase().replace(/\s+/g, '_')}`,
            nome: primeiroNome,
            sobrenome: ultimoNome,
            nome_completo: nomeCompleto,
            comum_id: selectedComum,
            cargo_id: realCargoId,
            cargo_real: (p.cargo || '').toUpperCase().trim(),
            instrumento_id: realInstrumentoId || (showInstrumento ? selectedInstrumento : null),
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
      console.log('ðŸ” [loadPessoas] Erro ao verificar cache, continuando com busca normal:', error);
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
    // Bloqueio síncrono antes de qualquer await: evita dois envios durante oscilação.
    if (isSubmittingRef.current || loading) {
      console.warn('⚠️ [SUBMIT] Submissão bloqueada: já em andamento');
      return false;
    }
    isSubmittingRef.current = true;

    // Apenas armazenamento local; nenhuma rede deve bloquear o envio.
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
      return false;
    }


    // 🛑 GARANTIA ABSOLUTA DE DESTRAVAMENTO: Try global da função
    try {
      // Recuperar texto digitado manualmente no NameSelectField para evitar perdas ou delay de blur no Web
      const nomeDigitado = nomeFieldRef.current?.getText?.().trim() || '';
      const isNomeManualFinal = isNomeManual || 
                                (!!nomeDigitado && (!selectedPessoa || selectedPessoa.trim() === '')) ||
                                (isForaRegional && !selectedPessoa);

      const selectedPessoaParaEnvio = isNomeManualFinal && nomeDigitado ? nomeDigitado : selectedPessoa;

      console.log('🔴 [SUBMIT] Botão ENVIAR REGISTRO clicado');
      console.log('🔎 [SUBMIT] Estado atual:', {
        selectedComum,
        selectedCargo,
        selectedPessoa,
        nomeDigitado,
        selectedPessoaParaEnvio,
        isNomeManualFinal,
        selectedPessoaType: typeof selectedPessoa,
        selectedPessoaLength: selectedPessoa?.length,
        selectedPessoaTrimmed: selectedPessoa?.trim(),
        selectedPessoaValue: selectedPessoa,
      });

      // Validar campos obrigatórios (permitir nome manual para candidatos também)
      if (!selectedComum || !selectedCargo) {
        console.warn('⚠️ [SUBMIT] Campos obrigatórios não preenchidos');
        showToast.error('Erro', 'Preencha todos os campos obrigatórios');
        isSubmittingRef.current = false;
        return false;
      }

      // 🛑 CORREÇÃO CRÍTICA: Se selectedPessoa está vazio mas há pessoas carregadas,
      // verificar se o texto digitado no campo corresponde a alguma opção
      // Se não corresponder, tratar como nome manual
      if (!selectedPessoaParaEnvio || selectedPessoaParaEnvio.trim() === '') {
        // Tentar buscar o texto do campo NameSelectField através do ref ou estado
        // Por enquanto, apenas mostrar erro - o handleBlur deve ter tratado isso
        console.warn('⚠️ [SUBMIT] Nome não selecionado', {
          selectedPessoaParaEnvio,
          isNomeManualFinal,
          pessoasCount: pessoas.length,
        });
        Alert.alert('Erro', 'Selecione um nome da lista ou digite o nome completo manualmente.');
        isSubmittingRef.current = false;
        return false;
      }

      // Verificar se é nome manual e se tem valor válido
      if (isNomeManualFinal && (!selectedPessoaParaEnvio || selectedPessoaParaEnvio.trim().length < 3)) {
        console.warn('⚠️ [SUBMIT] Nome manual muito curto', {
          selectedPessoaParaEnvio,
          isNomeManualFinal,
          length: selectedPessoaParaEnvio?.trim().length,
        });
        Alert.alert('Erro', 'O nome deve ter pelo menos 3 caracteres');
        isSubmittingRef.current = false;
        return false;
      }

      // Validar instrumento apenas para Músico e Instrutor
      // 🛑 CORREÇÃO: Só é OBRIGATÓRIO se for nome manual ou fora da regional
      // Para nomes selecionados da lista, o sistema cuida disso internamente (não bloqueia o usuário)
      const cargoNome = cargos.find(c => c.id === selectedCargo)?.nome || '';
      const isMúsicoOuInstrutor = cargoNome.trim().toUpperCase() === 'MÚSICO' || cargoNome.trim().toUpperCase() === 'INSTRUTOR'; 
      const instrumentoObrigatorioParaUsuario = (isNomeManualFinal || isForaRegional) && isMúsicoOuInstrutor;

      if (instrumentoObrigatorioParaUsuario && !selectedInstrumento) {
        console.warn('⚠️ [SUBMIT] Instrumento não selecionado para entrada manual');
        Alert.alert('Erro', 'Selecione o instrumento');
        isSubmittingRef.current = false;
        return false;
      }

      if (!user) {
        console.error('❌ [SUBMIT] Usuário não autenticado');
        showToast.error('Erro', 'Sessão expirada. Por favor, faça login novamente.');
        isSubmittingRef.current = false;
        return false;
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
          } else if (!isNomeManualFinal) {
            const pessoaSelecionada = pessoas.find(p => p.id === selectedPessoaParaEnvio);
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
        if (isCandidato && !isNomeManualFinal) {
          const pessoaSelecionada = pessoas.find(p => p.id === selectedPessoaParaEnvio);
          if (pessoaSelecionada && pessoaSelecionada.instrumento_id) {
            instrumentoCandidato = pessoaSelecionada.instrumento_id;
          }
        }

        const pessoaIdFinal = isNomeManualFinal ? `manual_${selectedPessoaParaEnvio}` : selectedPessoaParaEnvio;
        // 🛑 NOVO FLUXO: Garantir que se uma pessoa foi selecionada da lista, 
        // usamos o cargo REAL dela ao invés do selecionado no dropdown (que pode ser genérico)
        let cargoIdFinal = selectedCargo;
        if (selectedPessoaParaEnvio && !isNomeManualFinal) {
          const pessoaObj = pessoas.find(p => p.id === selectedPessoaParaEnvio);
          if (pessoaObj && pessoaObj.cargo_id && pessoaObj.cargo_id !== selectedCargo) {
            console.log(`🛑 [handleSubmit] Corrigindo cargo: ${selectedCargo} -> ${pessoaObj.cargo_id} (Pessoa: ${pessoaObj.nome_completo})`);
            cargoIdFinal = pessoaObj.cargo_id;
          }
        }

        const comumIdFinal = isComumManual ? (selectedComum.startsWith('manual_') ? selectedComum : `manual_${selectedComum}`) + (cidadeManual ? `|${cidadeManual}` : '') : selectedComum;
        const dataHoraFinal = getCurrentDateTimeISO();

        const instrumentoIdFinal = isCandidato
          ? instrumentoCandidato
          : isNomeManualFinal || isForaRegional
            ? selectedInstrumento || null
            : (selectedPessoaData?.instrumento_id || selectedInstrumento || null);

        const registro: RegistroPresenca = {
          pessoa_id: pessoaIdFinal,
          comum_id: comumIdFinal,
          cargo_id: cargoIdFinal,
          instrumento_id: instrumentoIdFinal,
          classe_organista: classeOrganistaFinal,
          local_ensaio: localEnsaio || 'Não definido',
          data_hora_registro: dataHoraFinal,
          usuario_responsavel: nomeUsuario,
          status_sincronizacao: 'pending',
          is_offline_manual: isNomeManual && !isOnline, // 🚨 NOVO: Marcar se foi manual por falta de rede
          is_fora_regional: isForaRegional,
          id: (() => {
            // Gerar um UUID determinístico para evitar duplicidade acidental no mesmo dia (race conditions)
            const dataSimples = dataHoraFinal.split('T')[0];
            const seedParts = [pessoaIdFinal, comumIdFinal, dataSimples];
            if (isForaRegional) {
              seedParts.push(cargoIdFinal, instrumentoIdFinal || '');
            }
            const seed = seedParts.join('|');
            return generateDeterministicUUID(seed);
          })(),
        };

        // 2. Trava de Segurança: Verificar duplicata na fila local (rápido)
        const dupLocal = await supabaseDataService.checkDuplicataLocal({
          pessoaId: registro.pessoa_id,
          comumId: registro.comum_id,
          cargoId: registro.cargo_id, // 🚨 CORREÇÃƒO: Usar cargoId
          instrumentoId: registro.instrumento_id,
          isForaRegional,
          dataIso: registro.data_hora_registro
        });

        if (dupLocal) {
          console.warn('⚠️ Duplicata detectada na fila local');
          let nomePessoa = registro.pessoa_id.startsWith('manual_') 
            ? registro.pessoa_id.replace('manual_', '') 
            : (pessoas.find(p => p.id === registro.pessoa_id)?.nome_completo || '');
          
          if (!nomePessoa && !registro.pessoa_id.startsWith('manual_')) {
            const p = pessoas.find(p => p.id === registro.pessoa_id);
            if (p) nomePessoa = `${p.nome} ${p.sobrenome || ''}`.trim();
          }

          const nomeComum = resolveComumById(comuns, registro.comum_id)?.nome || '';
          const cargoDuplicata = cargos.find(c => c.id === registro.cargo_id)?.nome || '';
          const instrumentoDuplicata = instrumentos.find(i => i.id === registro.instrumento_id)?.nome || '';
          
          setDuplicateInfo({ 
            nome: Boolean(registro.is_fora_regional) ? obterNomeCurto(nomePessoa) : nomePessoa,
            comum: nomeComum, 
            detalhe: obterDetalheDuplicata(cargoDuplicata, instrumentoDuplicata),
            data: dupLocal.data, 
            horario: dupLocal.horario,
            isForaRegional: Boolean(registro.is_fora_regional)
          });
          setPendingRegistro(registro);
          setDuplicateModalVisible(true);
          await supabaseDataService.deleteRegistrosDuplicadosFromLocal(registro);
          setLoading(false);
          isSubmittingRef.current = false;
          return false;
        }

        // 3. A rede serve apenas para feedback; não bloqueia a gravação local.
        const isOnlineNow = isOnline;

        // Na regional, validar no Supabase antes de salvar ou anunciar sucesso.
        // Fora da regional continua com a confirmacao posterior, e offline continua resiliente.
        if (isOnlineNow && !isForaRegional) {
          const pessoaDuplicata = pessoas.find(p => p.id === registro.pessoa_id);
          const nomeDuplicata = registro.pessoa_id.startsWith('manual_')
            ? registro.pessoa_id.replace(/^manual_/, '')
            : (pessoaDuplicata?.nome_completo || [pessoaDuplicata?.nome, pessoaDuplicata?.sobrenome].filter(Boolean).join(' ').trim());
          const comumDuplicata = resolveComumById(comuns, registro.comum_id)?.nome || '';
          const cargoDuplicata = pessoaDuplicata?.cargo_real || cargos.find(c => c.id === registro.cargo_id)?.nome || '';
          const instrumentoDuplicata = instrumentos.find(i => i.id === registro.instrumento_id)?.nome || '';

          try {
            await supabaseDataService.checkDuplicataRemota({
              nome: nomeDuplicata,
              comum: comumDuplicata,
              cargo: cargoDuplicata,
              instrumento: instrumentoDuplicata,
              cidade: pessoaDuplicata?.cidade || registro.cidade || '',
              uuid: registro.id,
              sameUuidIsDuplicate: true,
              pessoaId: registro.pessoa_id,
              isForaRegional: false,
              dataIso: registro.data_hora_registro
            });
          } catch (error) {
            if (error instanceof Error && error.message.includes('DUPLICATA_BLOQUEADA')) {
              const infoStr = error.message.split('DUPLICATA_BLOQUEADA:')[1] || '';
              const details = infoStr ? infoStr.split('|') : [];

              setDuplicateInfo({
                nome: details[0] || nomeDuplicata,
                comum: details[1] || comumDuplicata,
                detalhe: obterDetalheDuplicata(details[4] || cargoDuplicata, details[5] || instrumentoDuplicata),
                data: details[2] || '--/--/----',
                horario: details[3] || '--:--:--',
                isForaRegional: false
              });
              setPendingRegistro(null);
              setDuplicateModalVisible(true);
              setLoading(false);
              isSubmittingRef.current = false;
              return false;
            }

            // Falhas transitórias não impedem o modo offline; a fila validará novamente ao sincronizar.
            console.warn('[SUBMIT] Verificação prévia de duplicidade indisponível; mantendo na fila.', error);
          }
        }

        // 4. Salvar localmente antes de qualquer operação remota
        console.log('💾 [SUBMIT] Salvando registro na fila para processamento em segundo plano...');
        // Online: concluir validacao e envio antes de anunciar sucesso.
        // createRegistro salva na fila automaticamente se a conexao oscilar.
        if (isOnlineNow) {
          const envio = await offlineSyncService.createRegistro(registro, false, true);

          if (!envio.success) {
            const erroEnvio = envio.error || 'Nao foi possivel validar o registro.';
            const payloadDuplicata = erroEnvio
              .replace(/^DUPLICATA_BLOQUEADA:\s*/i, '')
              .replace(/^DUPLICATA:\s*/i, '');
            const details = payloadDuplicata.split('|');
            const isDuplicate = /DUPLICATA/i.test(erroEnvio) || details.length >= 4;

            if (isDuplicate) {
              const pessoaDuplicata = pessoas.find(p => p.id === registro.pessoa_id);
              const nomeFallback = registro.pessoa_id.startsWith('manual_')
                ? registro.pessoa_id.replace(/^manual_/, '')
                : (pessoaDuplicata?.nome_completo || '');
              const comumFallback = resolveComumById(comuns, registro.comum_id)?.nome || '';
              const cargoFallback = pessoaDuplicata?.cargo_real || cargos.find(c => c.id === registro.cargo_id)?.nome || '';
              const instrumentoFallback = instrumentos.find(i => i.id === registro.instrumento_id)?.nome || '';

              setDuplicateInfo({
                nome: details[0] || nomeFallback,
                comum: details[1] || comumFallback,
                detalhe: obterDetalheDuplicata(details[4] || cargoFallback, details[5] || instrumentoFallback),
                data: details[2] || '--/--/----',
                horario: details[3] || '--:--:--',
                isForaRegional: Boolean(registro.is_fora_regional),
              });
              setPendingRegistro(isForaRegional ? registro : null);
              setDuplicateModalVisible(true);
            } else {
              showToast.error('Erro', erroEnvio);
            }

            setLoading(false);
            isSubmittingRef.current = false;
            return false;
          }

          const feedbackMsgOnline = envio.error || 'Enviado para Supabase e Google Sheets.';
          suppressSyncSuccessToastUntilRef.current = Date.now() + 15000;
          showToast.success('Registro salvo!', feedbackMsgOnline, 2500);
          clearAllFields();
          setLoading(false);
          isSubmittingRef.current = false;
          refreshCount().catch(error => console.warn('[SUBMIT] Contador sera atualizado depois:', error));
          return true;
        }

        await supabaseDataService.saveRegistroToLocal(registro);
        
        // 5. Feedback imediato ao usuário (O QUE O USUÁRIO PEDIU)
        // Liberar tela e mostrar sucesso rápido (2 segundos conforme pedido)
        const feedbackMsg = isOnlineNow
          ? 'Salvo no dispositivo; sincronização iniciada em segundo plano.'
          : 'Salvo no dispositivo; será sincronizado quando a conexão voltar.';
        suppressSyncSuccessToastUntilRef.current = Date.now() + 15000;
        showToast.success('Registro salvo!', feedbackMsg, 2500);
        
        // Limpar campos imediatamente
        clearAllFields();

        // 5. Encerrar imediatamente: nem o contador local deve segurar a tela.
        setLoading(false);
        isSubmittingRef.current = false;
        refreshCount().catch(error => console.warn('[SUBMIT] Contador será atualizado depois:', error));

        if (isOnlineNow) {
          offlineSyncService.processarFilaLocal(true)
            .then(async syncResult => {
              if (syncResult.duplicateCount > 0) {
                console.warn(
                  '⚠️ [SUBMIT] Duplicidade detectada no processamento em background.',
                  syncResult.duplicateError
                );

                if (isForaRegional) {
                  // Fora da regional: pode ser pessoa diferente com mesmo nome.
                  // Mostrar modal com opção de cadastrar mesmo assim.
                  const infoStr = syncResult.duplicateError?.split('DUPLICATA_BLOQUEADA:')[1] || '';
                  const details = infoStr ? infoStr.split('|') : [];
                  const nomeFallback = registro.pessoa_id.startsWith('manual_')
                    ? registro.pessoa_id.replace('manual_', '')
                    : '';
                  const comumFallback = resolveComumById(comuns, registro.comum_id)?.nome || '';
                  const cargoFallback = cargos.find(c => c.id === registro.cargo_id)?.nome || '';
                  const instrumentoFallback = instrumentos.find(i => i.id === registro.instrumento_id)?.nome || '';

                  setDuplicateInfo({
                    nome: details[0] || nomeFallback,
                    comum: details[1] || comumFallback,
                    detalhe: obterDetalheDuplicata(details[4] || cargoFallback, details[5] || instrumentoFallback),
                    data: details[2] || '--/--/----',
                    horario: details[3] || '--:--:--',
                    isForaRegional: Boolean(registro.is_fora_regional)
                  });
                  // Guardar registro original para o "cadastrar mesmo assim"
                  setPendingRegistro(registro);
                  setDuplicateModalVisible(true);
                } else {
                  // Dentro da regional: manter bloqueado e exigir fechamento explícito do modal.
                  const infoStr = syncResult.duplicateError?.split('DUPLICATA_BLOQUEADA:')[1] || '';
                  const details = infoStr ? infoStr.split('|') : [];
                  const nomeFallback = registro.pessoa_id.startsWith('manual_')
                    ? registro.pessoa_id.replace('manual_', '')
                    : (pessoas.find(p => p.id === registro.pessoa_id)?.nome_completo || '');
                  const comumFallback = resolveComumById(comuns, registro.comum_id)?.nome || '';
                  const cargoFallback = cargos.find(c => c.id === registro.cargo_id)?.nome || '';
                  const instrumentoFallback = instrumentos.find(i => i.id === registro.instrumento_id)?.nome || '';

                  setDuplicateInfo({
                    nome: details[0] || nomeFallback,
                    comum: details[1] || comumFallback,
                    detalhe: obterDetalheDuplicata(details[4] || cargoFallback, details[5] || instrumentoFallback),
                    data: details[2] || '--/--/----',
                    horario: details[3] || '--:--:--',
                    isForaRegional: false
                  });
                  setPendingRegistro(null);
                  setDuplicateModalVisible(true);
                }
              }
              await refreshCount();
            })
            .catch(err => {
              console.error('[SUBMIT] Erro na sincronizacao em background:', err);
            });

          return true;
        }

        return true;

      } catch (error) {
        console.error('❌ [SUBMIT] Erro no processamento otimista:', error);
        showToast.error('Erro', 'Ocorreu um erro ao salvar o registro localmente.');
        setLoading(false);
        isSubmittingRef.current = false;
        return false;
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
      // Incluir cidade no label para facilitar busca e identificação
      const labelFinal = c.cidade ? `${nomeExibicao || c.nome} (${c.cidade})` : (nomeExibicao || c.nome);
      
      return {
        id: c.id,
        label: labelFinal,
        value: c.id,
        nomeCompleto: c.nome,
        cidade: c.cidade || '',
      };
    });
  }, [comuns]);

  // MEMOIZAR cargosOptions para evitar recriação constante
  // 🛑 FILTRO: Excluir cargos que só devem aparecer no modal (fora da regional) quando estivermos na regional
  const cargosOptions = useMemo(() => {
    if (isForaRegional) {
      return cargos.map(c => ({
        id: c.id,
        label: c.nome,
        value: c.id,
      }));
    }

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
  }, [cargos, isForaRegional]);

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
    return pessoas.map(p => {
      // 🛑 NOVO FLUXO: Incluir instrumento no label para diferenciar músicos
      const nomeBase = (p.nome_completo || `${p.nome || ''} ${p.sobrenome || ''}`).trim();
      if (!nomeBase) return null;
      const instrumento = p.instrumento_id ? ` (${p.instrumento_id.replace(/^instrumento_(\d+_)?/gi, '').replace(/_/g, ' ').toUpperCase()})` : '';
      
      return {
        id: p.id,
        label: `${nomeBase}${instrumento}`,
        value: p.id,
        data: p, // 🛑 CRÍTICO: Passar objeto original para capturar instrumento no onSelect
      };
    }).filter(Boolean) as any[];
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
          const locais: { id: string; nome: string }[] = (typeof window !== 'undefined' && window.APP_CONFIG?.LOCAIS_ENSAIO) || [
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
        is_fora_regional: true,
        id: generateExternalUUID(),
      };

      // 2. Trava de Segurança: Verificar duplicata na fila local
      const dupLocal = await supabaseDataService.checkDuplicataLocal({
        pessoaId: registro.pessoa_id,
        comumId: registro.comum_id,
        cargoId: registro.cargo_id,
        instrumentoId: registro.instrumento_id,
        isForaRegional: true,
        dataIso: registro.data_hora_registro
      });

      if (dupLocal) {
        console.warn('⚠️ Duplicata detectada no modal (fila local)');
        const instrumentoNome = instrumentos.find(i => i.id === registro.instrumento_id)?.nome || '';
        setDuplicateInfo({ 
          nome: obterNomeCurto(data.nome.toUpperCase()), 
          comum: data.comum.toUpperCase(), 
          detalhe: obterDetalheDuplicata(cargoObj.nome, instrumentoNome),
          data: dupLocal.data, 
          horario: dupLocal.horario,
          isForaRegional: true
        });
        setPendingRegistro(registro);
        setDuplicateModalVisible(true);
        await supabaseDataService.deleteRegistrosDuplicadosFromLocal(registro);
        setNewRegistrationModalVisible(false);
        setLoading(false);
        isSubmittingRef.current = false;
        return;
      }

      // 3. Duplicidade remota será tratada pela fila depois da gravação local.
      const isOnlineNow = isOnline;

      // 4. Salvar localmente antes de qualquer operação remota
      console.log('ðŸ’¾ [MODAL] Salvando registro externo na fila...');
      await supabaseDataService.saveRegistroToLocal(registro);

      const feedbackMsgModal = isOnlineNow
        ? 'Salvo no dispositivo; sincronização iniciada em segundo plano.'
        : 'Salvo no dispositivo; será sincronizado quando a conexão voltar.';
      suppressSyncSuccessToastUntilRef.current = Date.now() + 15000;
      showToast.success('Registro salvo!', feedbackMsgModal, 2500);

      setNewRegistrationModalVisible(false);
      setSelectedComum('');
      setSelectedCargo('');
      setSelectedInstrumento('');
      setSelectedPessoa('');
      setIsNomeManual(false);
      refreshCount().catch(error => console.warn('[MODAL] Contador será atualizado depois:', error));

      if (isOnlineNow) {
        offlineSyncService.processarFilaLocal(true).catch(err => {
          console.error('[MODAL] Erro na sincronizacao em background:', err);
        });
      }

      return;

      // 3. Feedback imediato ao usuário
      const feedbackMsg = isOnlineNow 
        ? 'O registro foi realizado com sucesso!' 
        : 'Salvo localmente! Será enviado em breve.';
      showToast.success('Registro Salvo!', feedbackMsg, 1500);

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
        console.error('âŒ [MODAL] Erro na sincronização em background:', err);
      });

    } catch (error) {
      console.error('âŒ [MODAL] Erro no processamento otimista:', error);
      showToast.error('Erro', 'Ocorreu um erro ao salvar o registro localmente.');
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
    cargoFieldRef,
    nomeFieldRef,
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
    handleHardReset: onHardReset,
    selectedClasseOrganista,
    setSelectedClasseOrganista,
    showClasseOrganista,
    isForaRegional,
  };
}
