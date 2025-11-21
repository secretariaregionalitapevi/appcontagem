import React, { useState, useEffect, useMemo } from 'react';
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
} from 'react-native';
import { useAuthContext } from '../context/AuthContext';
import { SimpleSelectField } from '../components/SimpleSelectField';
import { AutocompleteField } from '../components/AutocompleteField';
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
import { useOfflineQueue } from '../hooks/useOfflineQueue';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { Comum, Cargo, Instrumento, Pessoa, RegistroPresenca } from '../types/models';
import { getCurrentDateTimeISO } from '../utils/dateUtils';
import { localStorageService } from '../services/localStorageService';
import { showToast } from '../utils/toast';
import { useNavigation } from '@react-navigation/native';
import { getNaipeByInstrumento } from '../utils/instrumentNaipe';

export const RegisterScreen: React.FC = () => {
  const { user } = useAuthContext();
  const navigation = useNavigation();
  const isOnline = useOnlineStatus();
  const { pendingCount, refreshCount } = useOfflineQueue();

  const [comuns, setComuns] = useState<Comum[]>([]);
  const [cargos, setCargos] = useState<Cargo[]>([]);
  const [instrumentos, setInstrumentos] = useState<Instrumento[]>([]);
  const [pessoas, setPessoas] = useState<Pessoa[]>([]);

  const [selectedComum, setSelectedComum] = useState<string>('');
  const [selectedCargo, setSelectedCargo] = useState<string>('');
  const [selectedInstrumento, setSelectedInstrumento] = useState<string>('');
  const [selectedPessoa, setSelectedPessoa] = useState<string>('');
  const [isNomeManual, setIsNomeManual] = useState(false);

  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [duplicateModalVisible, setDuplicateModalVisible] = useState(false);
  const [duplicateInfo, setDuplicateInfo] = useState<{
    nome: string;
    comum: string;
    data: string;
    horario: string;
  } | null>(null);
  const [pendingRegistro, setPendingRegistro] = useState<RegistroPresenca | null>(null);
  const [newRegistrationModalVisible, setNewRegistrationModalVisible] = useState(false);

  // Mostrar campo de instrumento apenas para Músico
  // Organista NÃO mostra campo de instrumento (sempre toca órgão)
  const selectedCargoObj = cargos.find(c => c.id === selectedCargo);
  const cargoNome = selectedCargoObj?.nome || '';
  const isOrganista = cargoNome === 'Organista';
  const showInstrumento = !isOrganista && selectedCargoObj?.is_musical;

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (isOnline && !syncing) {
      console.log('🌐 Conexão restaurada - iniciando sincronização automática...');
      syncData();
    }
  }, [isOnline]);

  useEffect(() => {
    // Verificar se precisa de instrumento obrigatório (apenas Músico)
    // Organista não precisa de instrumento (sempre toca órgão)
    const selectedCargoObj = cargos.find(c => c.id === selectedCargo);
    const cargoNome = selectedCargoObj?.nome || '';
    const precisaInstrumento = cargoNome === 'Músico'; // Organista removido

    // Só carregar pessoas se tiver comum + cargo + (instrumento se necessário)
    if (selectedComum && selectedCargo) {
      if (precisaInstrumento && !selectedInstrumento) {
        // Precisa de instrumento mas não foi selecionado ainda
        setPessoas([]);
        setSelectedPessoa('');
        return;
      }
      // Tem todos os campos necessários, carregar pessoas
      loadPessoas();
    } else {
      setPessoas([]);
      setSelectedPessoa('');
    }
  }, [selectedComum, selectedCargo, selectedInstrumento, cargos]);

  const loadInitialData = async () => {
    try {
      setInitialLoading(true);

      // Se está online, sempre tentar sincronizar primeiro
      if (isOnline) {
        console.log('🔄 Sincronizando dados do Supabase...');
        try {
          await syncData();
        } catch (syncError) {
          console.warn('⚠️ Erro na sincronização:', syncError);
        }
      }

      // Carregar do banco local/cache
      let [comunsData, cargosData, instrumentosData] = await Promise.all([
        supabaseDataService.getComunsFromLocal(),
        supabaseDataService.getCargosFromLocal(),
        supabaseDataService.getInstrumentosFromLocal(),
      ]);

      console.log('📊 Dados carregados:', {
        comuns: comunsData.length,
        cargos: cargosData.length,
        instrumentos: instrumentosData.length,
      });

      // Debug detalhado dos cargos
      console.log('🔍 Debug cargos:', {
        quantidade: cargosData.length,
        cargos: cargosData.map(c => ({ id: c.id, nome: c.nome, is_musical: c.is_musical })),
      });

      // Se ainda não há dados e está online, tentar buscar diretamente
      if (isOnline && comunsData.length === 0) {
        console.log('🔄 Nenhuma comum no cache, buscando diretamente do Supabase...');
        try {
          const comunsDiretas = await supabaseDataService.fetchComuns();
          if (comunsDiretas.length > 0) {
            comunsData = comunsDiretas;
            // Salvar no cache
            await supabaseDataService.syncComunsToLocal();
          }
        } catch (error) {
          console.warn('⚠️ Erro ao buscar comuns diretamente:', error);
        }
      }

      if (comunsData.length === 0) {
        console.warn('⚠️ Nenhuma comum encontrada - verifique a conexão e tente novamente');
      }

      setComuns(comunsData);
      setCargos(cargosData);
      setInstrumentos(instrumentosData);
    } catch (error) {
      console.error('❌ Erro ao carregar dados iniciais:', error);
      Alert.alert('Erro', 'Não foi possível carregar os dados. Verifique sua conexão.');
    } finally {
      setInitialLoading(false);
    }
  };

  const syncData = async () => {
    if (syncing || !isOnline) return; // Não sincronizar se já está sincronizando ou está offline

    try {
      setSyncing(true);
      console.log('🔄 Iniciando sincronização de dados...');
      
      // Atualizar contador antes de sincronizar
      await refreshCount();
      
      const result = await offlineSyncService.syncAllData();
      
      // Atualizar contador após sincronizar
      await refreshCount();
      
      // Não mostrar erro se for apenas falta de conexão ou sessão (são esperados)
      if (!result.success && result.error) {
        if (!result.error.includes('conexão') && !result.error.includes('Sessão')) {
          console.warn('⚠️ Erro na sincronização:', result.error);
        }
      } else if (result.success) {
        console.log('✅ Sincronização concluída com sucesso');
      }
    } catch (error) {
      // Não logar erros de rede como erros críticos
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (
        !errorMessage.toLowerCase().includes('fetch') &&
        !errorMessage.toLowerCase().includes('network')
      ) {
        console.error('❌ Erro ao sincronizar:', error);
      }
    } finally {
      setSyncing(false);
    }
  };

  const loadPessoas = async () => {
    try {
      console.log('📚 Carregando pessoas:', {
        selectedComum,
        selectedCargo,
        selectedInstrumento,
        showInstrumento,
      });

      const pessoasData = await supabaseDataService.getPessoasFromLocal(
        selectedComum,
        selectedCargo,
        showInstrumento ? selectedInstrumento : undefined
      );

      console.log(`✅ ${pessoasData.length} pessoas carregadas`);
      setPessoas(pessoasData);
    } catch (error) {
      console.error('❌ Erro ao carregar pessoas:', error);
      setPessoas([]);
    }
  };

  const handleSubmit = async () => {
    if (!selectedComum || !selectedCargo || !selectedPessoa) {
      Alert.alert('Erro', 'Preencha todos os campos obrigatórios');
      return;
    }

    // Validar instrumento apenas para Músico (obrigatório)
    // Organista não precisa de instrumento (sempre toca órgão)
    const cargoNome = cargos.find(c => c.id === selectedCargo)?.nome || '';
    const instrumentoObrigatorio = cargoNome === 'Músico'; // Organista removido
    if (instrumentoObrigatorio && !selectedInstrumento) {
      Alert.alert('Erro', 'Selecione o instrumento para Músico');
      return;
    }

    if (!user) {
      Alert.alert('Erro', 'Usuário não autenticado');
      return;
    }

    setLoading(true);

    // Preparar registro antes do try para estar disponível no catch
    const localEnsaio = await localStorageService.getLocalEnsaio();

    // Usar nome do usuário ao invés do ID
    const nomeUsuario = user.nome || user.email || user.id;

    // Buscar classe da organista do banco de dados se for Organista
    // Se nome é manual, não buscar classe (cadastro desatualizado)
    let classeOrganistaDB: string | undefined = undefined;
    if (isOrganista && !isNomeManual) {
      const pessoaSelecionada = pessoas.find(p => p.id === selectedPessoa);
      if (pessoaSelecionada && pessoaSelecionada.classe_organista) {
        classeOrganistaDB = pessoaSelecionada.classe_organista;
      } else {
        // Se não encontrou classe mas é organista da lista, usar OFICIALIZADA
        classeOrganistaDB = 'OFICIALIZADA';
      }
    }

    // Se nome é manual, usar o texto digitado como pessoa_id temporário
    // O sistema precisa lidar com isso nos serviços de sincronização
    const pessoaIdFinal = isNomeManual ? `manual_${selectedPessoa}` : selectedPessoa;

    const registro: RegistroPresenca = {
      pessoa_id: pessoaIdFinal,
      comum_id: selectedComum,
      cargo_id: selectedCargo,
      instrumento_id: showInstrumento ? selectedInstrumento : null,
      classe_organista: classeOrganistaDB, // Buscar do banco de dados (ou null se manual)
      local_ensaio: localEnsaio || 'Não definido',
      data_hora_registro: getCurrentDateTimeISO(),
      usuario_responsavel: nomeUsuario, // Usar nome ao invés de ID
      status_sincronizacao: 'pending',
    };

    try {
      const result = await offlineSyncService.createRegistro(registro);
      
      // Atualizar contador da fila após criar registro
      await refreshCount();

      console.log('📋 Resultado do createRegistro:', result);
      console.log('🔍 Verificando duplicata - success:', result.success, 'error:', result.error);

      if (result.success) {
        // Verificar se realmente foi enviado ou apenas salvo localmente
        const foiEnviado = !result.error || !result.error.includes('salvo localmente');
        
        if (foiEnviado) {
          // Registro foi enviado com sucesso
          showToast.success('Registro enviado!', 'Registro enviado com sucesso!');
        } else {
          // Registro foi salvo localmente mas não enviado
          // Tentar sincronizar imediatamente
          if (isOnline && !syncing) {
            console.log('🔄 Tentando sincronizar registro pendente imediatamente...');
            setTimeout(() => {
              syncData();
            }, 500);
          }
          showToast.warning(
            'Registro salvo localmente',
            'O registro foi salvo mas não foi enviado. Tentando sincronizar...'
          );
        }
        
        // Limpar formulário apenas se foi enviado com sucesso
        if (foiEnviado) {
          setSelectedComum('');
          setSelectedCargo('');
          setSelectedInstrumento('');
          setSelectedPessoa('');
          setIsNomeManual(false);
        }
      } else {
        // Verificar se é erro de duplicata
        const isDuplicateError = result.error && (
          result.error.includes('DUPLICATA') ||
          result.error.includes('duplicat') ||
          result.error.includes('já foi cadastrado hoje') ||
          result.error.includes('DUPLICATA_BLOQUEADA')
        );
        
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
              (pessoas.find(p => p.id === selectedPessoa)?.nome + ' ' + 
               (pessoas.find(p => p.id === selectedPessoa)?.sobrenome || '')).trim() || '';
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
              const match = errorPart.match(/^(.+?)\s+(BR-\d+-\d+\s*-\s*.+?)\s+(\d{2}\/\d{2}\/\d{4})\/(\d{2}:\d{2})/);
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

          // Se não conseguiu extrair data/horário, usar data/horário atual
          if (!dataFormatada || !horarioFormatado) {
            const agora = new Date();
            dataFormatada = agora.toLocaleDateString('pt-BR', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
            });
            horarioFormatado = agora.toLocaleTimeString('pt-BR', {
              hour: '2-digit',
              minute: '2-digit',
              hour12: false,
            });
          }

          console.log('📋 Informações extraídas:', { nome, comumNome, dataFormatada, horarioFormatado });

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
                <div style="text-align: left;">
                  <strong>${nome || 'Nome não encontrado'}</strong> de <strong>${comumNome || 'Comum não encontrada'}</strong><br>
                  já foi cadastrado hoje!<br><br>
                  <small>Data: ${dataFormatada}</small><br>
                  <small>Horário: ${horarioFormatado}</small>
                </div>
              `;

              const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
                typeof navigator !== 'undefined' ? navigator.userAgent : ''
              );

              // Garantir que FontAwesome está carregado
              if (typeof window !== 'undefined' && typeof document !== 'undefined') {
                const linkId = 'fontawesome-css';
                if (!document.getElementById(linkId)) {
                  const link = document.createElement('link');
                  link.id = linkId;
                  link.rel = 'stylesheet';
                  link.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css';
                  document.head.appendChild(link);
                }
              }

              Swal.fire({
                title: '⚠️ Cadastro Duplicado!',
                html: mensagem,
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: '<i class="fa-solid fa-check"></i> Cadastrar Mesmo Assim',
                cancelButtonText: '<i class="fa-solid fa-times"></i> Cancelar',
                confirmButtonColor: '#f59e0b',
                cancelButtonColor: '#6b7280',
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
                },
                didOpen: () => {
                  // Ajustar estilos dos botões para mostrar ícones corretamente
                  setTimeout(() => {
                    const confirmBtn = document.querySelector('.swal2-confirm, .swal-duplicity-confirm') as HTMLElement;
                    const cancelBtn = document.querySelector('.swal2-cancel, .swal-duplicity-cancel') as HTMLElement;
                    
                    if (confirmBtn) {
                      const icon = confirmBtn.querySelector('i');
                      if (icon) {
                        icon.style.marginRight = '0.5rem';
                      }
                    }
                    if (cancelBtn) {
                      const icon = cancelBtn.querySelector('i');
                      if (icon) {
                        icon.style.marginRight = '0.5rem';
                      }
                    }
                  }, 100);
                },
              }).then(async (result: any) => {
                if (!result.isConfirmed) {
                  // Usuário cancelou - recarrega a página
                  console.log('❌ Usuário cancelou registro por duplicata - recarregando página...');
                  setTimeout(() => {
                    window.location.reload();
                  }, 100);
                  return;
                }

                // Usuário confirmou - criar registro mesmo assim
                console.log('✅ Usuário confirmou registro mesmo com duplicata');
                setLoading(true);
                try {
                  const registroForce = { ...registro };
                  const resultForce = await offlineSyncService.createRegistro(registroForce, true);
                  
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
                    // Recarregar página após sucesso
                    setTimeout(() => {
                      window.location.reload();
                    }, 1000);
                  } else {
                    showToast.error(
                      'Erro',
                      resultForce.error || 'Erro ao cadastrar registro duplicado'
                    );
                    // Recarregar página mesmo em caso de erro
                    setTimeout(() => {
                      window.location.reload();
                    }, 2000);
                  }
                } catch (error) {
                  showToast.error('Erro', 'Ocorreu um erro ao processar o registro duplicado');
                  console.error('Erro ao criar registro duplicado:', error);
                  // Recarregar página mesmo em caso de erro
                  setTimeout(() => {
                    window.location.reload();
                  }, 2000);
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
              setPendingRegistro(registro);
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
            setPendingRegistro(registro);
            setDuplicateModalVisible(true);
          }
        } else {
          showToast.error('Erro', result.error || 'Erro ao enviar registro');
        }
      }
    } catch (error) {
      Alert.alert('Erro', 'Ocorreu um erro ao processar o registro');
      console.error('Erro ao criar registro:', error);
    } finally {
      setLoading(false);
    }
  };

  // Exibir apenas o nome sem código na busca, mas manter código completo no valor
  // MEMOIZAR para evitar recriação constante que causa loops
  // IMPORTANTE: useMemo DEVE estar ANTES de qualquer return condicional
  const comunsOptions = useMemo(() => {
    return comuns.map(c => {
      // Extrair nome sem código usando a função do supabaseDataService
      const nomeExibicao = supabaseDataService.extrairNomeComum(c.nome);
      return {
        id: c.id,
        label: nomeExibicao || c.nome, // Nome sem código para exibição
        value: c.id,
        nomeCompleto: c.nome, // Manter nome completo (com código) para registro
      };
    });
  }, [comuns]);

  // MEMOIZAR cargosOptions para evitar recriação constante
  const cargosOptions = useMemo(() => {
    return cargos.map(c => ({
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

  if (initialLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Carregando dados...</Text>
      </View>
    );
  }

  const handleEditRegistros = () => {
    (navigation as any).navigate('EditRegistros');
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
      const localEnsaio = await localStorageService.getLocalEnsaio();
      const nomeUsuario = user.nome || user.email || user.id;

      // Buscar cargo e instrumento para obter nomes
      const cargoObj = cargos.find(c => c.id === data.cargo);
      const instrumentoObj = data.instrumento ? instrumentos.find(i => i.id === data.instrumento) : null;

      if (!cargoObj) {
        Alert.alert('Erro', 'Cargo não encontrado');
        return;
      }

      // Criar registro com dados do modal
      const registro: RegistroPresenca = {
        pessoa_id: `manual_${data.nome.toUpperCase()}`,
        comum_id: `external_${data.comum.toUpperCase()}_${Date.now()}`, // ID temporário
        cargo_id: data.cargo,
        instrumento_id: data.instrumento || undefined,
        classe_organista: data.classe || undefined,
        local_ensaio: localEnsaio || 'Não definido',
        data_hora_registro: getCurrentDateTimeISO(),
        usuario_responsavel: nomeUsuario,
        status_sincronizacao: 'pending',
      };

      // Preparar dados para Google Sheets
      const naipeInstrumento = instrumentoObj
        ? getNaipeByInstrumento(instrumentoObj.nome).toUpperCase()
        : data.classe
          ? 'TECLADO'
          : '';

      const instrumentoFinal = instrumentoObj?.nome.toUpperCase() || (data.classe ? 'ÓRGÃO' : '');

      const sheetRow = {
        UUID: registro.id || `external_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        'NOME COMPLETO': data.nome.trim().toUpperCase(),
        COMUM: data.comum.toUpperCase(),
        CIDADE: data.cidade.toUpperCase(),
        CARGO: cargoObj.nome.toUpperCase(),
        INSTRUMENTO: instrumentoFinal,
        NAIPE_INSTRUMENTO: naipeInstrumento,
        CLASSE_ORGANISTA: (data.classe || '').toUpperCase(),
        LOCAL_ENSAIO: (localEnsaio || 'Não definido').toUpperCase(),
        DATA_ENSAIO: new Date().toLocaleString('pt-BR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }),
        REGISTRADO_POR: nomeUsuario.toUpperCase(),
        ANOTACOES: 'Cadastro fora da Regional',
      };

      // Enviar para Google Sheets diretamente
      const GOOGLE_SHEETS_API_URL =
        'https://script.google.com/macros/s/AKfycbxPtvi86jPy7y41neTpIPvn3hpycd3cMjbgjgifzLD6qRwrJVPlF9EDulaQp42nma-i/exec';
      
      const response = await fetch(GOOGLE_SHEETS_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8',
        },
        body: JSON.stringify({
          op: 'append',
          sheet: 'Dados',
          data: sheetRow,
        }),
      });

      if (response.ok || response.type === 'opaque') {
        showToast.success(
          'Registro salvo!',
          'Registro de visita salvo com sucesso.'
        );

        // Recarregar página após salvar (igual ao backupcont)
        if (Platform.OS === 'web' && typeof window !== 'undefined') {
          setTimeout(() => {
            window.location.reload();
          }, 1000);
        }
      } else {
        throw new Error('Erro ao enviar para Google Sheets');
      }
    } catch (error) {
      console.error('Erro ao salvar novo registro:', error);
      showToast.error('Erro', 'Erro ao salvar registro. Tente novamente.');
    }
  };

  return (
    <View style={styles.container}>
      <AppHeader onEditRegistrosPress={handleEditRegistros} />
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          collapsable={false}
          style={Platform.OS === 'web' ? { zIndex: 1, position: 'relative' as const } : undefined}
        >
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Registro de Participante</Text>
              <Text style={styles.cardSubtitle}>
                Preencha os campos abaixo para registrar a presença
              </Text>
            </View>
            <View style={styles.cardBody}>
              <View>
                <AutocompleteField
                  label="COMUM CONGREGAÇÃO *"
                  value={selectedComum}
                  options={comunsOptions}
                  onSelect={option => {
                    setSelectedComum(String(option.value));
                    setSelectedPessoa('');
                    setIsNomeManual(false);
                  }}
                  placeholder="Selecione a comum..."
                />
                <TouchableOpacity
                  onPress={(e) => {
                    e.preventDefault?.();
                    e.stopPropagation?.();
                    console.log('🔘 Botão "+ Novo registro" clicado');
                    setNewRegistrationModalVisible(true);
                  }}
                  style={styles.newRegistrationLink}
                  activeOpacity={0.7}
                >
                  <Text style={styles.newRegistrationLinkText}>+ Novo registro</Text>
                </TouchableOpacity>
              </View>

              <AutocompleteField
                label="CARGO/MINISTÉRIO *"
                value={selectedCargo}
                options={cargosOptions}
                onSelect={option => {
                  setSelectedCargo(String(option.value));
                  setSelectedInstrumento('');
                  setSelectedPessoa('');
                  setIsNomeManual(false);
                }}
                placeholder="Selecione o cargo..."
              />

              {showInstrumento && (
                <SimpleSelectField
                  label="Instrumento (apenas para cargos musicais)"
                  value={selectedInstrumento}
                  options={instrumentosOptions}
                  onSelect={(option: any) => {
                    setSelectedInstrumento(option.value);
                    setSelectedPessoa('');
                    setIsNomeManual(false);
                  }}
                  placeholder="Selecione o instrumento"
                />
              )}

              <NameSelectField
                label="Nome e Sobrenome *"
                value={selectedPessoa}
                options={pessoasOptions}
                onSelect={(option: any) => {
                  if (option.id === 'manual') {
                    setSelectedPessoa(option.value);
                    setIsNomeManual(true);
                  } else {
                    setSelectedPessoa(option.value);
                    setIsNomeManual(false);
                  }
                }}
                placeholder="Selecione o nome..."
              />

              <Text style={styles.hint}>
                Selecione um nome da lista após preencher Comum e Cargo.
              </Text>

              <PrimaryButton
                title="ENVIAR REGISTRO"
                onPress={handleSubmit}
                loading={loading}
                style={styles.submitButton}
              />
            </View>
          </View>

          <View style={styles.footer}>
            <OfflineBadge count={pendingCount} syncing={syncing} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Modal de Duplicata */}
      {duplicateInfo && (
        <DuplicateModal
          visible={duplicateModalVisible}
          nome={duplicateInfo.nome}
          comum={duplicateInfo.comum}
          data={duplicateInfo.data}
          horario={duplicateInfo.horario}
          onCancel={() => {
            setDuplicateModalVisible(false);
            setDuplicateInfo(null);
            setPendingRegistro(null);
            // Recarregar página após cancelar (igual ao backupcont)
            if (Platform.OS === 'web' && typeof window !== 'undefined') {
              setTimeout(() => {
                window.location.reload();
              }, 100);
            }
          }}
          onConfirm={async () => {
            if (!pendingRegistro) {
              setDuplicateModalVisible(false);
              setDuplicateInfo(null);
              return;
            }

            setDuplicateModalVisible(false);
            setLoading(true);
            try {
              // Forçar duplicata - criar registro mesmo assim
              // Pular verificação de duplicata (skipDuplicateCheck = true)
              const registroForce = { ...pendingRegistro };
              const resultForce = await offlineSyncService.createRegistro(registroForce, true);
              
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
                // Recarregar página após sucesso (igual ao backupcont)
                if (Platform.OS === 'web' && typeof window !== 'undefined') {
                  setTimeout(() => {
                    window.location.reload();
                  }, 1000);
                } else {
                  // Mobile: limpar formulário
                  setSelectedComum('');
                  setSelectedCargo('');
                  setSelectedInstrumento('');
                  setSelectedPessoa('');
                  setIsNomeManual(false);
                }
              } else {
                // Se ainda for duplicata, mostrar modal novamente
                if (
                  resultForce.error &&
                  (resultForce.error.includes('DUPLICATA:') ||
                    resultForce.error.includes('DUPLICATA_BLOQUEADA'))
                ) {
                  // Extrair informações novamente
                  let nome = duplicateInfo.nome;
                  let comumNome = duplicateInfo.comum;
                  let dataFormatada = duplicateInfo.data;
                  let horarioFormatado = duplicateInfo.horario;

                  if (resultForce.error.includes('DUPLICATA:')) {
                    const parts = resultForce.error.split('DUPLICATA:')[1]?.split('|');
                    if (parts && parts.length >= 4) {
                      nome = parts[0];
                      comumNome = parts[1];
                      dataFormatada = parts[2];
                      horarioFormatado = parts[3];
                    }
                  }

                  setDuplicateInfo({
                    nome,
                    comum: comumNome,
                    data: dataFormatada,
                    horario: horarioFormatado,
                  });
                  setDuplicateModalVisible(true);
                } else {
                  showToast.error(
                    'Erro',
                    resultForce.error || 'Erro ao cadastrar registro duplicado'
                  );
                  // Recarregar página mesmo em caso de erro
                  if (Platform.OS === 'web' && typeof window !== 'undefined') {
                    setTimeout(() => {
                      window.location.reload();
                    }, 2000);
                  }
                }
              }
            } catch (error) {
              showToast.error('Erro', 'Ocorreu um erro ao processar o registro duplicado');
              console.error('Erro ao criar registro duplicado:', error);
              // Recarregar página mesmo em caso de erro
              if (Platform.OS === 'web' && typeof window !== 'undefined') {
                setTimeout(() => {
                  window.location.reload();
                }, 2000);
              }
            } finally {
              setLoading(false);
              setDuplicateInfo(null);
              setPendingRegistro(null);
            }
          }}
        />
      )}

      {/* Modal de Novo Registro (para visitas de outras cidades) */}
      <NewRegistrationModal
        visible={newRegistrationModalVisible}
        cargos={cargos}
        instrumentos={instrumentos}
        onClose={() => setNewRegistrationModalVisible(false)}
        onSave={handleSaveNewRegistration}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: theme.spacing.lg,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
  },
  loadingText: {
    marginTop: theme.spacing.md,
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    marginBottom: theme.spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'visible',
  },
  cardHeader: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  cardTitle: {
    fontSize: theme.fontSize.xl,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  cardSubtitle: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    lineHeight: 20,
  },
  cardBody: {
    padding: theme.spacing.lg,
  },
  hint: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textSecondary,
    fontStyle: 'italic',
    marginTop: -theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  submitButton: {
    marginTop: theme.spacing.md,
    alignSelf: 'center',
  },
  footer: {
    alignItems: 'center',
    marginTop: theme.spacing.lg,
    ...(Platform.OS === 'web'
      ? {
          position: 'relative' as const,
          zIndex: 1,
        }
      : {
          elevation: 0,
        }),
  },
  syncIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: theme.spacing.sm,
  },
  syncText: {
    marginLeft: theme.spacing.sm,
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  newRegistrationLink: {
    marginTop: theme.spacing.xs,
    marginBottom: theme.spacing.md,
    alignSelf: 'flex-start',
    ...(Platform.OS === 'web'
      ? {
          cursor: 'pointer',
          zIndex: 10,
        }
      : {
          zIndex: 10,
        }),
  },
  newRegistrationLinkText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.primary,
    fontWeight: '600',
    textDecorationLine: 'underline',
    ...(Platform.OS === 'web'
      ? {
          cursor: 'pointer',
          userSelect: 'none',
        }
      : {}),
  },
});
