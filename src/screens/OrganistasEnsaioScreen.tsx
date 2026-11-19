import { usePwaUpdateGuard } from '../hooks/usePwaUpdateGuard';
import { locationSafetyService } from '../services/locationSafetyService';
import React, { useState, useEffect, useLayoutEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  TouchableOpacity,
  Switch,
  TextInput,
} from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { EditOrganistaModal, OrganistaChanges } from '../components/EditOrganistaModal';
import { RegisterBottomBar } from '../components/RegisterBottomBar';
import { useAuthContext } from '../context/AuthContext';
import { NameSelectField } from '../components/NameSelectField';
import { PrimaryButton } from '../components/PrimaryButton';
import { AppHeader } from '../components/AppHeader';
import { OfflineBadge } from '../components/OfflineBadge';
import { RefreshableScrollView } from '../components/RefreshableScrollView';
import { theme } from '../theme';
import { RegistrationSuccessModal } from '../components/RegistrationSuccessModal';
import { organistasEnsaioService } from '../services/organistasEnsaioService';
import { localStorageService } from '../services/localStorageService';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { OrganistaEnsaio } from '../types/models';
import { formatDate } from '../utils/dateUtils';
import { showToast } from '../utils/toast';
import { useNavigation } from '@react-navigation/native';
import { formatRegistradoPor } from '../utils/userNameUtils';
import { AutocompleteField } from '../components/AutocompleteField';
import { SimpleSelectField } from '../components/SimpleSelectField';
import { supabaseDataService } from '../services/supabaseDataService';
import { Comum, Cargo, Pessoa } from '../types/models';

interface OrganistaItem {
  nome: string;
  comum?: string;
  cidade?: string;
  cargo?: string;
  nivel?: string;
  tocou?: boolean;
  registroId?: string;
  observacoes?: string;
  ultimaPresenca?: string; // Data da última presença em ensaios anteriores
}

export const OrganistasEnsaioScreen: React.FC = () => {
  const { user } = useAuthContext();
  const navigation = useNavigation();
  const { isOnline } = useOnlineStatus();

  // Definir título da página na web
  useLayoutEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      document.title = 'CCB | Organistas no Ensaio';
    }
  }, []);

  const [organistas, setOrganistas] = useState<any[]>([]);
  const [organistasRegistradas, setOrganistasRegistradas] = useState<OrganistaItem[]>([]);
  const [selectedOrganista, setSelectedOrganista] = useState('');
  const [organistaSelecionada, setOrganistaSelecionada] = useState<any>(null);
  const [localEnsaio, setLocalEnsaio] = useState<string>('Não definido');
  useEffect(() => locationSafetyService.subscribeVenue(venue => setLocalEnsaio(venue.nome)), []);
  const registrosRequest = useRef(0);
  const [dataEnsaio, setDataEnsaio] = useState<string>(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);
  const [editingRegistro, setEditingRegistro] = useState<OrganistaEnsaio | null>(null);
  const [mutationId, setMutationId] = useState<string | null>(null);
  const mutationInFlight = useRef(false);
  const [loadingOrganistas, setLoadingOrganistas] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [organistaFieldKey, setOrganistaFieldKey] = useState(0); // Key para forçar remontagem do NameSelectField
  const [successModalVisible, setSuccessModalVisible] = useState(false);
  const [successData, setSuccessData] = useState<{
    nome: string;
    tocou: boolean;
    ultimaPresenca?: string;
    ultimoTocou?: boolean;
  }>({
    nome: '',
    tocou: false,
  });

  // Estados para busca de toda a regional
  const [comuns, setComuns] = useState<Comum[]>([]);
  const [cargos, setCargos] = useState<Cargo[]>([]);
  const [selectedComum, setSelectedComum] = useState<string>('');
  const [selectedCargo, setSelectedCargo] = useState<string>('');
  const [isNomeManual, setIsNomeManual] = useState(false);
  const [initialSearchLoading, setInitialSearchLoading] = useState(true);
  usePwaUpdateGuard(
    Boolean(
      selectedComum ||
        selectedOrganista ||
        loading ||
        mutationId ||
        editingRegistro ||
        successModalVisible
    )
  );

  // Carregar local do ensaio, comuns e cargos
  useEffect(() => {
    loadLocalEnsaio();
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      setInitialSearchLoading(true);
      const [comunsData, cargosData] = await Promise.all([
        supabaseDataService.getComunsFromLocal(),
        supabaseDataService.getCargosFromLocal(),
      ]);

      setComuns(comunsData);

      // Filtrar apenas cargos de organistas/instrutoras/examinadoras
      const organistaCargos = cargosData.filter(c => {
        const nome = c.nome.toUpperCase();
        return nome === 'ORGANISTA' || nome === 'INSTRUTORA' || nome === 'EXAMINADORA';
      });
      setCargos(organistaCargos);

      // Se houver cargo de Organista, selecionar por padrão
      const organistaDefault = organistaCargos.find(c => c.nome.toUpperCase() === 'ORGANISTA');
      if (organistaDefault) {
        setSelectedCargo(organistaDefault.id);
      }
    } catch (error) {
      console.error('❌ Erro ao carregar dados iniciais:', error);
    } finally {
      setInitialSearchLoading(false);
    }
  };

  // Buscar organistas quando o local ou filtros mudarem
  useEffect(() => {
    if (localEnsaio && localEnsaio !== 'Não definido') {
      loadOrganistas();
      loadRegistros();
    }
  }, [localEnsaio, dataEnsaio, selectedComum, selectedCargo]);

  const loadLocalEnsaio = async () => {
    try {
      const local = await localStorageService.getLocalEnsaio();
      if (local) {
        // Converter ID para nome se necessário
        let localNome = local;
        if (/^\d+$/.test(local.trim())) {
          const locais: { id: string; nome: string }[] = (typeof window !== 'undefined' &&
            window.APP_CONFIG?.LOCAIS_ENSAIO) || [
            { id: '1', nome: 'Cotia' },
            { id: '2', nome: 'Caucaia do Alto' },
            { id: '3', nome: 'Fazendinha' },
            { id: '4', nome: 'Itapevi' },
            { id: '5', nome: 'Jandira' },
            { id: '6', nome: 'Pirapora' },
            { id: '7', nome: 'Vargem Grande' },
          ];
          const localEncontrado = locais.find(l => l.id === local.trim());
          localNome = localEncontrado?.nome || local;
        }
        setLocalEnsaio(localNome);
      } else {
        showToast.warning(
          'Atenção',
          'Local de ensaio não definido. Defina o local nas configurações.'
        );
      }
    } catch (error) {
      console.error('❌ Erro ao carregar local de ensaio:', error);
      showToast.error('Erro', 'Não foi possível carregar o local de ensaio');
    }
  };

  // Função para garantir que o nome da comum inclua o código (se disponível)
  const sanitizeComumName = (nomeOriginal?: string) => {
    if (!nomeOriginal) return undefined;

    // Se já tiver o código (formato BR-XX-XXXX), retornar original
    if (/^[A-Z]{2}-\d{2}-\d{4}/.test(nomeOriginal)) {
      return nomeOriginal;
    }

    // Tentar encontrar na lista de comuns pelo nome
    if (comuns.length > 0) {
      const comumEncontrada = comuns.find(
        c =>
          c.nome.toUpperCase() === nomeOriginal.toUpperCase() ||
          c.displayName?.toUpperCase().includes(nomeOriginal.toUpperCase())
      );
      if (comumEncontrada && comumEncontrada.displayName) {
        return comumEncontrada.displayName;
      }
    }

    return nomeOriginal;
  };

  const loadOrganistas = async () => {
    setLoadingOrganistas(true);
    try {
      let data: any[] = [];

      // Se tiver comum e cargo selecionados, buscar de toda a regional via supabaseDataService
      if (selectedComum && selectedCargo) {
        const pessoas = await supabaseDataService.getPessoasFromLocal(selectedComum, selectedCargo);
        data = pessoas.map(p => {
          // Extrair nome da comum se for o formato técnico (incluindo código)
          let comumDisplay = p.comum_id;
          if (comuns.length > 0) {
            const comumEncontrada = comuns.find(c => c.id === p.comum_id);
            if (comumEncontrada) {
              comumDisplay = comumEncontrada.displayName || comumEncontrada.nome;
            }
          }

          return {
            nome: p.nome_completo,
            comum: comumDisplay,
            cidade: p.cidade,
            cargo: p.cargo_real,
            id: p.id,
          };
        });
      } else {
        // Fallback: buscar organistas que já estiveram nesse local (lógica original)
        const rawData = await organistasEnsaioService.fetchOrganistasByLocalEnsaio(localEnsaio);
        // Normalizar nomes das comuns do histórico
        data = rawData.map(org => ({
          ...org,
          comum: sanitizeComumName(org.comum),
        }));
      }

      // Converter para formato de opções do NameSelectField
      const opcoes = data.map((org, index) => {
        // Para esta página dedicada, exibir SEMPRE apenas o nome na lista de resultados principal
        // Isso evita confusão com comum/cargo repetidos
        return {
          id: org.id || `organista_${index}_${org.nome.toLowerCase().replace(/\s+/g, '_')}`,
          label: org.nome,
          value: org.nome,
          data: org, // Guardar dados completos
        };
      });

      setOrganistas(opcoes);
      console.log(`✅ ${opcoes.length} organistas carregadas`);
    } catch (error: any) {
      console.error('❌ Erro ao carregar organistas:', error);
      showToast.error('Erro', 'Não foi possível carregar as organistas');
    } finally {
      setLoadingOrganistas(false);
    }
  };

  const loadRegistros = async (targetLocal = localEnsaio) => {
    const requestId = ++registrosRequest.current;
    if (!isOnline) {
      return;
    }

    try {
      const registros = await organistasEnsaioService.fetchRegistrosByLocalAndDate(
        targetLocal,
        dataEnsaio
      );

      // Converter registros para formato de lista e sanitizar nomes de comuns
      const items: OrganistaItem[] = registros.map(reg => ({
        nome: reg.organista_nome,
        comum: sanitizeComumName(reg.organista_comum),
        cidade: reg.organista_cidade,
        tocou: reg.tocou,
        registroId: reg.id,
        observacoes: reg.observacoes,
      }));

      if (requestId === registrosRequest.current) setOrganistasRegistradas(items);
      console.log(`✅ ${items.length} registros carregados para ${dataEnsaio}`);
    } catch (error: any) {
      console.error('❌ Erro ao carregar registros:', error);
    }
  };

  const handleSelectOrganista = (option: {
    id: string;
    label: string;
    value: unknown;
    data: any;
  }) => {
    console.log('🎹 [OrganistasEnsaio] Selecionada:', option.id);
    if (typeof option.value === 'string') {
      setSelectedOrganista(option.value);
      setOrganistaSelecionada(option.data);
      setIsNomeManual(option.id === 'manual');
    }
  };

  // Função helper para limpar o campo de organista
  const clearOrganistaField = () => {
    setSelectedOrganista('');
    setOrganistaSelecionada(null);
    setIsNomeManual(false);
    setOrganistaFieldKey(prev => prev + 1);
  };

  const clearFilters = () => {
    setSelectedComum('');
    // Manter o cargo Organista como padrão se existir
    const organistaDefault = cargos.find(c => c.nome.toUpperCase() === 'ORGANISTA');
    if (organistaDefault) {
      setSelectedCargo(organistaDefault.id);
    } else {
      setSelectedCargo('');
    }
    clearOrganistaField();
  };

  const reloadPage = () => {
    // Resetar estados e carregar do zero
    setSelectedComum('');
    const organistaDefault = cargos.find(c => c.nome.toUpperCase() === 'ORGANISTA');
    if (organistaDefault) {
      setSelectedCargo(organistaDefault.id);
    }
    clearOrganistaField();
    loadRegistersAndOrganistas();
  };

  const loadRegistersAndOrganistas = async () => {
    setLoading(true);
    try {
      await Promise.all([loadOrganistas(), loadRegistros()]);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!selectedOrganista) {
      showToast.error('Erro', 'Selecione uma organista');
      return;
    }

    setLoading(true);
    try {
      const target = await locationSafetyService.confirmTarget(localEnsaio, dataEnsaio);
      if (!target) return;
      // Tentar obter a data da última presença se não tiver nos dados da busca
      let ultimaPresenca = organistaSelecionada?.ultimaPresenca;
      let ultimoTocou = true; // Por padrão assume true se vier da busca (presencas)

      if (!ultimaPresenca) {
        const lastPresence = await organistasEnsaioService.fetchLastPresence(selectedOrganista);
        if (lastPresence) {
          ultimaPresenca = lastPresence.data || undefined;
          ultimoTocou = lastPresence.tocou;
        }
      } else {
        ultimoTocou = true;
      }

      // Preparar dados para o modal de confirmação
      setSuccessData({
        nome: selectedOrganista,
        tocou: true, // Será definido no confirmação
        ultimaPresenca: ultimaPresenca || undefined,
        ultimoTocou: ultimoTocou,
      });
      setSuccessModalVisible(true);
    } catch (error) {
      console.error('❌ Erro ao preparar registro:', error);
      showToast.error('Erro', 'Não foi possível preparar o registro');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmSave = async (tocouNoEnsaio: boolean) => {
    if (!user) {
      showToast.error('Erro', 'Usuário não autenticado');
      return;
    }

    if (!isOnline) {
      showToast.warning('Offline', 'Conecte-se à internet para salvar o registro');
      return;
    }

    setLoading(true);
    try {
      const target = await locationSafetyService.confirmTarget(localEnsaio, dataEnsaio);
      if (!target) return;
      const targetLocal = locationSafetyService.resolve(target)!.nome;
      // Preparar nome do usuário para o campo "registrado_por"
      let nomeCompletoUsuario = user.nome;
      if (!nomeCompletoUsuario || nomeCompletoUsuario.trim() === '') {
        const emailSemDominio = user.email?.split('@')[0] || '';
        nomeCompletoUsuario = emailSemDominio.replace(/[._]/g, ' ').trim();
      }
      const nomeUsuario = formatRegistradoPor(nomeCompletoUsuario || user.id);

      // Buscar comum selecionada se não houver na organista selecionada
      let organistaComum = organistaSelecionada?.comum;
      let organistaCidade = organistaSelecionada?.cidade;

      if (!organistaComum && selectedComum) {
        const comumData = comuns.find(c => c.id === selectedComum);
        // Priorizar displayName (que contém o código)
        organistaComum = comumData?.displayName || comumData?.nome || selectedComum;

        // Se a comum for manual e tiver o pipe (Nome|Cidade)
        if (selectedComum.includes('|')) {
          const partes = selectedComum.split('|');
          organistaComum = partes[0];
          organistaCidade = partes[1];
        }
      }

      // Sanitarizar nome da comum garantindo o código antes de salvar
      const comumSanitizada = sanitizeComumName(organistaComum);

      const registro: OrganistaEnsaio = {
        organista_nome: selectedOrganista,
        organista_comum: comumSanitizada || undefined,
        organista_cidade: organistaCidade || undefined,
        local_ensaio: targetLocal,
        data_ensaio: dataEnsaio,
        tocou: tocouNoEnsaio,
        usuario_responsavel: nomeUsuario,
        observacoes: isNomeManual ? 'SAM Desatualizado' : undefined,
      };

      console.log('💾 Salvando registro com tocou:', tocouNoEnsaio);
      const result = await organistasEnsaioService.saveOrganistaEnsaio(registro);

      if (result.success) {
        setSuccessModalVisible(false);
        // Limpar os campos para o próximo registro (mantendo a data do ensaio)
        clearOrganistaField();
        // Recarregar registros para atualizar a lista abaixo
        loadRegistros(targetLocal);
        showToast.success('Sucesso', 'Registro realizado com sucesso!');
      } else {
        showToast.error('Erro', result.error || 'Erro ao salvar registro');
      }
    } catch (error) {
      console.error('❌ Erro ao salvar organista:', error);
      showToast.error('Erro', 'Falha na conexão com o servidor');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleTocou = (nome: string, valor: boolean) => {
    // Atualizar registro existente
    const registro = organistasRegistradas.find(reg => reg.nome === nome);
    if (registro && registro.registroId && user) {
      // Preparar nome do usuário
      let nomeCompletoUsuario = user.nome;
      if (!nomeCompletoUsuario || nomeCompletoUsuario.trim() === '') {
        const emailSemDominio = user.email?.split('@')[0] || '';
        nomeCompletoUsuario = emailSemDominio.replace(/[._]/g, ' ').trim();
      }
      const nomeUsuario = formatRegistradoPor(nomeCompletoUsuario || user.id);

      const registroAtualizado: OrganistaEnsaio = {
        id: registro.registroId,
        organista_nome: nome,
        organista_comum: registro.comum,
        organista_cidade: registro.cidade,
        local_ensaio: localEnsaio,
        data_ensaio: dataEnsaio,
        tocou: valor,
        usuario_responsavel: nomeUsuario,
      };

      organistasEnsaioService.saveOrganistaEnsaio(registroAtualizado).then(result => {
        if (result.success) {
          showToast.success('Atualizado!', `${nome} ${valor ? 'tocou' : 'não tocou'} no ensaio`);
          loadRegistros();
        } else {
          showToast.error('Erro', result.error || 'Não foi possível atualizar');
        }
      });
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([loadOrganistas(), loadRegistros()]);
      showToast.success('Atualizado!', 'Dados recarregados');
    } catch (error) {
      console.error('❌ Erro ao atualizar:', error);
      showToast.error('Erro', 'Não foi possível atualizar');
    } finally {
      setRefreshing(false);
    }
  }, [localEnsaio, dataEnsaio]);

  const handleEditOrganista = (org: OrganistaItem) => {
    if (!user || !isOnline || !org.registroId || mutationInFlight.current) return;
    setEditingRegistro({
      id: org.registroId,
      organista_nome: org.nome,
      organista_comum: org.comum,
      organista_cidade: org.cidade,
      observacoes: org.observacoes,
      tocou: !!org.tocou,
      local_ensaio: localEnsaio,
      data_ensaio: dataEnsaio,
      usuario_responsavel: formatRegistradoPor(user.nome || user.email?.split('@')[0] || user.id),
    });
  };

  const handleSaveEdit = async (changes: OrganistaChanges) => {
    if (!isOnline) {
      showToast.warning('Offline', 'Conecte-se à internet para salvar as alterações.');
      return;
    }
    if (!user || !isOnline || !editingRegistro?.id || mutationInFlight.current) return;
    mutationInFlight.current = true;
    setMutationId(editingRegistro.id);
    try {
      const result = await organistasEnsaioService.updateOrganistaEnsaio({
        ...editingRegistro,
        ...changes,
      });
      if (!result.success) {
        showToast.error('Erro ao editar', result.error || 'Não foi possível salvar o registro');
        return;
      }
      setEditingRegistro(null);
      await loadRegistros();
      showToast.success('Registro atualizado', 'As alterações foram salvas.');
    } catch (error) {
      console.error('Erro ao editar organista:', error);
      showToast.error('Erro', 'Não foi possível editar o registro. Tente novamente.');
    } finally {
      mutationInFlight.current = false;
      setMutationId(null);
    }
  };

  const handleDeleteOrganista = async (org: OrganistaItem) => {
    if (!user || !isOnline || !org.registroId || mutationInFlight.current) return;
    mutationInFlight.current = true;
    setMutationId(org.registroId);
    const local = localEnsaio,
      date = dataEnsaio;
    try {
      const confirmed = await showToast.confirm(
        'Excluir registro?',
        `Excluir o registro de ${org.nome} neste ensaio?`
      );
      if (!confirmed) return;
      const result = await organistasEnsaioService.deleteOrganistaEnsaio(
        org.registroId,
        local,
        date
      );
      if (!result.success) {
        showToast.error('Erro ao excluir', result.error || 'Não foi possível excluir o registro');
        return;
      }
      await loadRegistros();
      showToast.success('Registro excluído', 'O registro foi removido deste ensaio.');
    } catch (error) {
      console.error('Erro ao excluir organista:', error);
      showToast.error('Erro', 'Não foi possível excluir o registro. Tente novamente.');
    } finally {
      mutationInFlight.current = false;
      setMutationId(null);
    }
  };

  const handleBack = () => {
    navigation.goBack();
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <AppHeader mobileDesign locationReview title="Organistas no Ensaio" />

      {!isOnline && <OfflineBadge count={0} />}

      <RefreshableScrollView
        refreshing={refreshing}
        onRefresh={onRefresh}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.content}>
          <View style={styles.pageHeading}>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Voltar"
              style={styles.backButton}
              onPress={handleBack}
            >
              <FontAwesome5 solid name="chevron-left" size={20} color="#174c70" />
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text style={styles.eyebrow}>CONTROLE DE PRESENÇA</Text>
              <Text style={styles.pageTitle}>Organistas no ensaio</Text>
            </View>
          </View>
          <View style={styles.ensaioContext}>
            <View style={[styles.infoSection, styles.locationCard]}>
              <View style={styles.locationDetails}>
                <View style={styles.contextLabel}>
                  <View style={[styles.contextIcon, { backgroundColor: '#fff0f2' }]}>
                    <FontAwesome5 solid name="map-marker-alt" size={18} color="#dc5265" />
                  </View>
                  <Text style={styles.infoLabel}>Local do ensaio</Text>
                </View>
                <Text style={styles.infoValue}>{localEnsaio}</Text>
              </View>
              <View
                style={styles.mapPreview}
                accessible
                accessibilityLabel="Mapa ilustrativo, sem localização geográfica real"
              >
                <View style={styles.mapParkNorth} />
                <View style={styles.mapParkSouth} />
                <View style={styles.mapRiver} />
                <View style={[styles.mapStreet, styles.mapStreetOne]} />
                <View style={[styles.mapStreet, styles.mapStreetTwo]} />
                <View style={[styles.mapStreet, styles.mapStreetThree]} />
                <View style={[styles.mapStreet, styles.mapStreetFour]} />
                <View style={[styles.mapStreet, styles.mapStreetFive]} />
                <View style={styles.mapPinHalo} />
                <View style={styles.mapPin}>
                  <FontAwesome5 solid name="map-marker-alt" size={30} color="#e54d63" />
                </View>
              </View>
            </View>
            <View style={styles.infoSection}>
              <View style={styles.contextLabel}>
                <View style={[styles.contextIcon, { backgroundColor: '#e6f7f4' }]}>
                  <FontAwesome5 solid name="calendar-alt" size={18} color="#079c98" />
                </View>
                <Text style={styles.infoLabel}>Data do ensaio</Text>
              </View>
              {Platform.OS === 'web' ? (
                <View style={styles.dateInputContainer}>
                  {/* @ts-ignore - input HTML nativo para web */}
                  <input
                    type="date"
                    disabled={!!mutationId}
                    value={dataEnsaio}
                    onChange={e => {
                      const novaData = e.target.value;
                      if (novaData) {
                        setDataEnsaio(novaData);
                      }
                    }}
                    style={{
                      fontSize: theme.fontSize.lg,
                      color: theme.colors.text,
                      fontWeight: '600',
                      padding: theme.spacing.sm,
                      border: `1px solid ${theme.colors.border}`,
                      borderRadius: 13,
                      boxSizing: 'border-box',
                      minHeight: 48,
                      marginTop: theme.spacing.xs,
                      width: '100%',
                      backgroundColor: '#f5f8fb',
                    }}
                  />
                </View>
              ) : (
                <View style={styles.dateInputContainer}>
                  <TextInput
                    style={styles.dateInput}
                    editable={!mutationId}
                    value={formatDate(new Date(dataEnsaio))}
                    placeholder="DD/MM/AAAA"
                    onChangeText={text => {
                      // Converter DD/MM/AAAA para YYYY-MM-DD
                      const partes = text.split('/');
                      if (partes.length === 3) {
                        const dia = partes[0].padStart(2, '0');
                        const mes = partes[1].padStart(2, '0');
                        const ano = partes[2];
                        if (dia && mes && ano && ano.length === 4) {
                          const dataFormatada = `${ano}-${mes}-${dia}`;
                          const dataObj = new Date(dataFormatada);
                          if (!isNaN(dataObj.getTime())) {
                            setDataEnsaio(dataFormatada);
                          }
                        }
                      }
                    }}
                    keyboardType="numeric"
                  />
                  <Text style={styles.dateHint}>Formato: DD/MM/AAAA</Text>
                </View>
              )}
            </View>
          </View>

          <View style={[styles.section, styles.registrarSection]}>
            <View
              style={
                Platform.OS === 'web'
                  ? {
                      position: 'relative' as any,
                      zIndex: 999999,
                      overflow: 'visible' as any,
                      // @ts-ignore
                      isolation: 'isolate',
                      marginBottom: theme.spacing.md,
                    }
                  : styles.filterSection
              }
            >
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 4,
                  zIndex: 1005,
                }}
              >
                <View style={styles.sectionHeading}>
                  <View style={styles.musicIcon}>
                    <FontAwesome5 solid name="music" size={19} color="#8552cc" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.sectionTitle}>Registrar organista</Text>
                    <Text style={styles.sectionSubtitle}>
                      Selecione a comum e identifique a participante
                    </Text>
                  </View>
                </View>
              </View>
              <View
                style={[
                  styles.field,
                  Platform.OS === 'web' ? { zIndex: 10002, position: 'relative' } : {},
                ]}
              >
                <Text style={styles.label}>Comum Congregação</Text>
                <AutocompleteField
                  appearance="soft"
                  leadingIcon="map-marker-alt"
                  iconColor="#1684dc"
                  label=""
                  placeholder="Selecione a comum..."
                  value={selectedComum}
                  options={comuns.map(c => ({
                    id: c.id,
                    label: c.displayName || c.nome,
                    value: c.id,
                  }))}
                  onSelect={option => setSelectedComum(String(option.value))}
                />
              </View>

              {/* Cargo oculto - fixo como Organista para esta página */}
              <View style={{ display: 'none' }}>
                <SimpleSelectField
                  label=""
                  placeholder="Selecione o cargo..."
                  value={selectedCargo}
                  options={cargos.map(c => ({
                    id: c.id,
                    label: c.nome,
                    value: c.id,
                  }))}
                  onSelect={option => setSelectedCargo(String(option.value))}
                />
              </View>
            </View>

            <View
              style={[
                styles.nameSelectWrapper,
                Platform.OS === 'web'
                  ? {
                      // @ts-ignore - Propriedades CSS apenas para web
                      position: 'relative' as const,
                      zIndex: 10000,
                      // @ts-ignore
                      isolation: 'isolate',
                    }
                  : {},
              ]}
            >
              <NameSelectField
                appearance="soft"
                leadingIcon="user"
                iconColor="#8552cc"
                key={organistaFieldKey} // Key para forçar remontagem quando limpar
                label="Organista"
                value={selectedOrganista}
                options={organistas}
                onSelect={handleSelectOrganista}
                placeholder="Digite para buscar organista..."
                loading={loadingOrganistas}
              />
            </View>

            {selectedOrganista && (
              <PrimaryButton
                icon="save"
                title={loading ? 'Salvando...' : 'Salvar registro'}
                onPress={handleSave}
                disabled={loading || !isOnline || !!mutationId}
                style={styles.saveButton}
              />
            )}
          </View>

          {/* Lista de Organistas Registradas */}
          <View style={[styles.section, styles.organistasSection]} collapsable={false}>
            <View style={styles.listHeading}>
              <View style={styles.sectionHeading}>
                <View style={[styles.musicIcon, { backgroundColor: '#e6f7f4' }]}>
                  <FontAwesome5 solid name="users" size={18} color="#079c98" />
                </View>
                <Text style={styles.sectionTitle}>Organistas registradas</Text>
              </View>
              <View style={styles.countBadge}>
                <Text style={styles.countText}>{organistasRegistradas.length}</Text>
              </View>
            </View>

            {organistasRegistradas.length === 0 ? (
              <View style={styles.emptyState}>
                <View style={styles.emptyIcon}>
                  <FontAwesome5 solid name="music" size={28} color="#8552cc" />
                </View>
                <Text style={styles.emptyTitle}>Nenhuma organista registrada</Text>
                <Text style={styles.emptyText}>Os registros deste ensaio aparecerão aqui.</Text>
              </View>
            ) : (
              organistasRegistradas.map((org, index) => (
                <View key={org.registroId || index} style={styles.organistaItem}>
                  <View style={styles.organistaContent}>
                    <View style={styles.organistaAvatar}>
                      <Text style={styles.avatarText}>
                        {org.nome
                          .trim()
                          .split(/\s+/)
                          .filter(Boolean)
                          .filter((_, i, parts) => i === 0 || i === parts.length - 1)
                          .map(part => part[0])
                          .join('')
                          .toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.organistaInfo}>
                      <Text style={styles.organistaNome} numberOfLines={3}>
                        {org.nome}
                      </Text>
                      {org.comum && (
                        <Text style={styles.organistaComum} numberOfLines={2}>
                          {org.comum}
                        </Text>
                      )}
                    </View>
                    <View
                      style={[
                        styles.switchContainer,
                        { backgroundColor: org.tocou ? '#e6f7f0' : '#fff1ed' },
                      ]}
                    >
                      <FontAwesome5
                        solid
                        name={org.tocou ? 'check-circle' : 'minus-circle'}
                        size={14}
                        color={org.tocou ? '#10986f' : '#d7794b'}
                      />
                      <Text style={styles.switchLabel} numberOfLines={1}>
                        {org.tocou ? 'Tocou' : 'Não tocou'}
                      </Text>
                      <Switch
                        accessibilityLabel={`Tocou no ensaio: ${org.nome}`}
                        value={org.tocou || false}
                        onValueChange={value => handleToggleTocou(org.nome, value)}
                        trackColor={{ false: '#767577', true: theme.colors.primary }}
                        thumbColor={org.tocou ? '#fff' : '#f4f3f4'}
                        disabled={!isOnline || !!mutationId || !!editingRegistro}
                      />
                    </View>
                    <View style={styles.recordActions}>
                      <TouchableOpacity
                        accessibilityRole="button"
                        accessibilityLabel={`Editar registro de ${org.nome}`}
                        disabled={!isOnline || !org.registroId || !!mutationId}
                        onPress={() => handleEditOrganista(org)}
                        style={[
                          styles.editRecordButton,
                          (!isOnline || !org.registroId || !!mutationId) && styles.actionDisabled,
                        ]}
                      >
                        <FontAwesome5 solid name="edit" size={18} color="#1684dc" />
                      </TouchableOpacity>
                      <TouchableOpacity
                        accessibilityRole="button"
                        accessibilityLabel={`Excluir registro de ${org.nome}`}
                        disabled={!isOnline || !org.registroId || !!mutationId}
                        onPress={() => handleDeleteOrganista(org)}
                        style={[
                          styles.deleteRecordButton,
                          (!isOnline || !org.registroId || !!mutationId) && styles.actionDisabled,
                        ]}
                      >
                        <FontAwesome5 solid name="trash-alt" size={18} color="#dc5265" />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              ))
            )}
          </View>
        </View>
      </RefreshableScrollView>
      <RegisterBottomBar
        activeTab="organists"
        onHomePress={() => navigation.navigate('Register' as never)}
        onEditRegistrosPress={() => navigation.navigate('EditRegistros' as never)}
        onOrganistasEnsaioPress={() => navigation.navigate('OrganistasEnsaio' as never)}
      />

      {editingRegistro && (
        <EditOrganistaModal
          key={editingRegistro.id}
          registro={editingRegistro}
          saving={!!mutationId}
          onClose={() => {
            if (!mutationInFlight.current) setEditingRegistro(null);
          }}
          onSave={handleSaveEdit}
        />
      )}
      <RegistrationSuccessModal
        visible={successModalVisible}
        nome={successData.nome}
        tocou={successData.tocou}
        ultimaPresenca={successData.ultimaPresenca}
        ultimoTocou={successData.ultimoTocou}
        onConfirm={handleConfirmSave}
        onClose={() => setSuccessModalVisible(false)}
        loading={loading}
      />
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  recordActions: { flexDirection: 'row', alignItems: 'center', gap: 8, marginLeft: 'auto' },
  editRecordButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#e8f3ff',
    borderWidth: 1,
    borderColor: '#cde4fb',
  },
  deleteRecordButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff0f2',
    borderWidth: 1,
    borderColor: '#fad3da',
  },
  actionDisabled: { opacity: 0.4 },
  pageHeading: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 15,
    backgroundColor: '#eaf1f7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  eyebrow: {
    fontSize: 9,
    letterSpacing: 1.3,
    color: '#748a9b',
    fontWeight: '700',
    marginBottom: 6,
  },
  pageTitle: { fontSize: 25, fontWeight: '700', color: '#243d50', letterSpacing: -0.5 },
  ensaioContext: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  contextLabel: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  contextIcon: {
    width: 32,
    height: 32,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionHeading: { flexDirection: 'row', alignItems: 'center', gap: 10, flexShrink: 1 },
  musicIcon: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: '#f2ecfc',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionSubtitle: { fontSize: 11, lineHeight: 18, color: '#8192a1', marginTop: 3 },
  listHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 18,
  },
  countBadge: {
    minWidth: 32,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: '#e6f7f4',
    alignItems: 'center',
  },
  countText: { fontSize: 12, fontWeight: '700', color: '#079c98' },
  emptyState: { paddingVertical: 30, alignItems: 'center', gap: 12 },
  emptyIcon: {
    width: 70,
    height: 70,
    borderRadius: 24,
    backgroundColor: '#f2ecfc',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: { fontSize: 15, color: '#334e63', fontWeight: '600', textAlign: 'center' },
  organistaAvatar: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: '#f2ecfc',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 14, fontWeight: '700', color: '#8552cc' },
  container: {
    flex: 1,
    backgroundColor: '#f3f6fa',
  },
  scrollView: {
    flex: 1,
    minHeight: 0,
  },
  scrollContent: {
    padding: theme.spacing.md,
  },
  content: {
    width: '100%',
    maxWidth: 760,
    alignSelf: 'center',
    gap: theme.spacing.lg,
    paddingBottom: theme.spacing.xl,
  },
  locationCard: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  locationDetails: { flex: 1, minWidth: 0 },
  mapPreview: {
    width: 108,
    height: 94,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#edf1f3',
    borderWidth: 1,
    borderColor: '#e0e8ec',
    position: 'relative',
    pointerEvents: 'none',
  },
  mapParkNorth: {
    position: 'absolute',
    width: 42,
    height: 37,
    left: 8,
    top: -3,
    borderRadius: 10,
    backgroundColor: '#cce8d7',
    transform: [{ rotate: '-18deg' }],
  },
  mapParkSouth: {
    position: 'absolute',
    width: 40,
    height: 33,
    right: -8,
    bottom: 5,
    borderRadius: 8,
    backgroundColor: '#d3ead8',
    transform: [{ rotate: '-18deg' }],
  },
  mapRiver: {
    position: 'absolute',
    width: 16,
    height: 160,
    right: 4,
    top: -25,
    backgroundColor: '#b7deee',
    transform: [{ rotate: '22deg' }],
  },
  mapStreet: {
    position: 'absolute',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#dbe3e7',
    borderRadius: 2,
  },
  mapStreetOne: { width: 160, height: 8, left: -22, top: 27, transform: [{ rotate: '-18deg' }] },
  mapStreetTwo: { width: 160, height: 7, left: -22, top: 64, transform: [{ rotate: '-18deg' }] },
  mapStreetThree: { width: 8, height: 140, left: 29, top: -20, transform: [{ rotate: '-18deg' }] },
  mapStreetFour: { width: 7, height: 140, left: 68, top: -20, transform: [{ rotate: '-18deg' }] },
  mapStreetFive: { width: 140, height: 5, left: -20, top: 48, transform: [{ rotate: '35deg' }] },
  mapPinHalo: {
    position: 'absolute',
    width: 34,
    height: 14,
    borderRadius: 17,
    left: 35,
    top: 52,
    backgroundColor: '#e54d6325',
  },
  mapPin: { position: 'absolute', left: 40, top: 24 },
  infoSection: {
    flexGrow: 1,
    flexBasis: 260,
    minWidth: 0,
    backgroundColor: '#fff',
    padding: theme.spacing.md,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  infoLabel: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
    fontWeight: '600',
    textTransform: 'none',
    letterSpacing: 0.5,
  },
  infoValue: {
    fontSize: theme.fontSize.lg,
    color: theme.colors.text,
    fontWeight: '600',
  },
  dateInputContainer: {
    marginTop: theme.spacing.xs,
  },
  dateInput: {
    fontSize: theme.fontSize.lg,
    color: theme.colors.text,
    fontWeight: '600',
    padding: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: '#fff',
  },
  dateHint: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
    fontStyle: 'italic',
  },
  section: {
    shadowColor: '#23425c',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.04,
    shadowRadius: 16,
    backgroundColor: '#fff',
    padding: theme.spacing.md,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: 0,
    position: 'relative' as any,
    zIndex: 1,
    overflow: 'visible' as any,
  },
  filterSection: {
    gap: theme.spacing.md,
    marginBottom: theme.spacing.md,
    zIndex: 1000,
    overflow: 'visible' as any,
  },
  field: {
    marginBottom: theme.spacing.sm,
    position: 'relative' as any,
    overflow: 'visible' as any,
  },
  label: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
    fontWeight: '600',
    textTransform: 'none',
  },
  clearFiltersBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    backgroundColor: '#f3f4f6',
    borderRadius: 4,
  },
  clearFiltersText: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.primary,
    fontWeight: '600',
  },
  nameSelectWrapper: {
    position: 'relative' as any,
    zIndex: 100, // 🚀 Aumentado para ficar acima da seção de organistas registradas
    marginBottom: 0,
    minHeight: 80,
    overflow: 'visible' as any,
    ...(Platform.OS === 'web'
      ? {
          // @ts-ignore - Propriedades CSS apenas para web
          isolation: 'isolate',
        }
      : {}),
  },
  sectionTitle: {
    lineHeight: 22,
    fontSize: theme.fontSize.md,
    color: theme.colors.text,
    fontWeight: '700',
    marginBottom: 0,
    textTransform: 'none',
    letterSpacing: 0.5,
  },
  saveButton: {
    width: '100%',
    minHeight: 56,
    borderRadius: 16,
    marginTop: theme.spacing.md,
  },
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    backgroundColor: '#f8fafc',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  switchLabel: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
  },
  organistaItem: {
    borderWidth: 1,
    borderColor: '#e3ebf1',
    borderRadius: 16,
    marginBottom: 12,
    padding: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  organistaContent: {
    flexWrap: 'wrap',
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.md,
  },
  organistaInfo: {
    flex: 1,
    minWidth: 0,
    marginRight: theme.spacing.sm,
  },
  organistaNome: {
    fontSize: theme.fontSize.md,
    color: theme.colors.text,
    fontWeight: '600',
    lineHeight: 20,
  },
  organistaComum: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
    lineHeight: 16,
  },
  emptyText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  registrarSection: {
    zIndex: 100, // 🚀 Aumentado para garantir que o dropdown apareça acima
    position: 'relative' as any,
    overflow: 'visible' as any, // 🚀 CRÍTICO: overflow visible para permitir que dropdown apareça
    ...(Platform.OS === 'web'
      ? {
          // @ts-ignore - Propriedades CSS apenas para web
          isolation: 'isolate',
        }
      : {}),
  },
  organistasSection: {
    zIndex: 1, // 🚀 Reduzido para ficar abaixo do dropdown
    position: 'relative' as any,
    marginTop: 0,
  },
});
