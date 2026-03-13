import React, { useState, useEffect, useLayoutEffect, useCallback } from 'react';
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
  Switch,
  TextInput,
} from 'react-native';
import { useAuthContext } from '../context/AuthContext';
import { NameSelectField } from '../components/NameSelectField';
import { PrimaryButton } from '../components/PrimaryButton';
import { AppHeader } from '../components/AppHeader';
import { OfflineBadge } from '../components/OfflineBadge';
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
import { handleHardReset } from '../utils/appActions';
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
  const [dataEnsaio, setDataEnsaio] = useState<string>(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);
  const [loadingOrganistas, setLoadingOrganistas] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [organistaFieldKey, setOrganistaFieldKey] = useState(0); // Key para forçar remontagem do NameSelectField
  const [successModalVisible, setSuccessModalVisible] = useState(false);
  const [successData, setSuccessData] = useState<{
    nome: string, 
    tocou: boolean, 
    ultimaPresenca?: string,
    ultimoTocou?: boolean
  }>({
    nome: '',
    tocou: false
  });

  // Estados para busca de toda a regional
  const [comuns, setComuns] = useState<Comum[]>([]);
  const [cargos, setCargos] = useState<Cargo[]>([]);
  const [selectedComum, setSelectedComum] = useState<string>('');
  const [selectedCargo, setSelectedCargo] = useState<string>('');
  const [initialSearchLoading, setInitialSearchLoading] = useState(true);

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
        return (
          nome === 'ORGANISTA' || nome === 'INSTRUTORA' || nome === 'EXAMINADORA'
        );
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
          const locais: { id: string; nome: string }[] = [
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
        Alert.alert('Atenção', 'Local de ensaio não definido. Defina o local nas configurações.');
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
      const comumEncontrada = comuns.find(c => 
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
            id: p.id
          };
        });
      } else {
        // Fallback: buscar organistas que já estiveram nesse local (lógica original)
        const rawData = await organistasEnsaioService.fetchOrganistasByLocalEnsaio(localEnsaio);
        // Normalizar nomes das comuns do histórico
        data = rawData.map(org => ({
          ...org,
          comum: sanitizeComumName(org.comum)
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

  const loadRegistros = async () => {
    if (!isOnline) {
      return;
    }

    try {
      const registros = await organistasEnsaioService.fetchRegistrosByLocalAndDate(
        localEnsaio,
        dataEnsaio
      );

      // Converter registros para formato de lista e sanitizar nomes de comuns
      const items: OrganistaItem[] = registros.map(reg => ({
        nome: reg.organista_nome,
        comum: sanitizeComumName(reg.organista_comum),
        cidade: reg.organista_cidade,
        tocou: reg.tocou,
        registroId: reg.id,
      }));

      setOrganistasRegistradas(items);
      console.log(`✅ ${items.length} registros carregados para ${dataEnsaio}`);
    } catch (error: any) {
      console.error('❌ Erro ao carregar registros:', error);
    }
  };

  const handleSelectOrganista = (option: { id: string; label: string; value: unknown; data: any }) => {
    if (typeof option.value === 'string') {
      setSelectedOrganista(option.value);
      setOrganistaSelecionada(option.data);
    }
  };

  // Função helper para limpar o campo de organista
  const clearOrganistaField = () => {
    setSelectedOrganista('');
    setOrganistaSelecionada(null);
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
        ultimoTocou: ultimoTocou
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
      Alert.alert('Erro', 'Usuário não autenticado');
      return;
    }

    if (!isOnline) {
      Alert.alert('Offline', 'Conecte-se à internet para salvar o registro');
      return;
    }

    setLoading(true);
    try {
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
        local_ensaio: localEnsaio,
        data_ensaio: dataEnsaio,
        tocou: tocouNoEnsaio,
        usuario_responsavel: nomeUsuario,
      };

      console.log('💾 Salvando registro com tocou:', tocouNoEnsaio);
      const result = await organistasEnsaioService.saveOrganistaEnsaio(registro);

      if (result.success) {
        setSuccessModalVisible(false);
        // Limpar os campos para o próximo registro (mantendo a data do ensaio)
        clearOrganistaField();
        // Recarregar registros para atualizar a lista abaixo
        loadRegistros();
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

  const handleBack = () => {
    navigation.goBack();
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <AppHeader 
        title="Organistas no Ensaio" 
        onBackPress={handleBack} 
        onRefresh={onRefresh}
        onHardReset={handleHardReset}
      />

      {!isOnline && <OfflineBadge count={0} />}

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.content}>
          {/* Informações do Ensaio */}
          <View style={styles.infoSection}>
            <Text style={styles.infoLabel}>Local do Ensaio:</Text>
            <Text style={styles.infoValue}>{localEnsaio}</Text>
          </View>

          <View style={styles.infoSection}>
            <Text style={styles.infoLabel}>Data do Ensaio:</Text>
            {Platform.OS === 'web' ? (
              <View style={styles.dateInputContainer}>
                {/* @ts-ignore - input HTML nativo para web */}
                <input
                  type="date"
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
                    borderRadius: theme.borderRadius.sm,
                    marginTop: theme.spacing.xs,
                    width: '100%',
                    backgroundColor: '#fff',
                  }}
                />
              </View>
            ) : (
              <View style={styles.dateInputContainer}>
                <TextInput
                  style={styles.dateInput}
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
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4, zIndex: 1005 }}>
                <Text style={styles.sectionTitle}>Registrar Organista</Text>
              </View>
              <View style={[styles.field, Platform.OS === 'web' ? { zIndex: 10002, position: 'relative' } : {}]}>
                <Text style={styles.label}>Comum Congregação</Text>
                <AutocompleteField
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
                title={loading ? 'Salvando...' : 'Salvar Registro'}
                onPress={handleSave}
                disabled={loading || !isOnline}
                style={styles.saveButton}
              />
            )}
          </View>

          {/* Lista de Organistas Registradas */}
          <View style={[styles.section, styles.organistasSection]} collapsable={false}>
            <Text style={styles.sectionTitle}>
              Organistas Registradas ({organistasRegistradas.length})
            </Text>

            {organistasRegistradas.length === 0 ? (
              <Text style={styles.emptyText}>Nenhuma organista registrada para este ensaio</Text>
            ) : (
              organistasRegistradas.map((org, index) => (
                <View key={index} style={styles.organistaItem}>
                  <View style={styles.organistaContent}>
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
                    <View style={styles.switchContainer}>
                      <Text style={styles.switchLabel} numberOfLines={1}>
                        {org.tocou ? '✅ Tocou' : '❌ Não tocou'}
                      </Text>
                      <Switch
                        value={org.tocou || false}
                        onValueChange={value => handleToggleTocou(org.nome, value)}
                        trackColor={{ false: '#767577', true: theme.colors.primary }}
                        thumbColor={org.tocou ? '#fff' : '#f4f3f4'}
                        disabled={!isOnline}
                      />
                    </View>
                  </View>
                </View>
              ))
            )}
          </View>
        </View>
      </ScrollView>

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
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: theme.spacing.md,
  },
  content: {
    gap: theme.spacing.lg,
    paddingBottom: theme.spacing.xl,
  },
  infoSection: {
    backgroundColor: '#fff',
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  infoLabel: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
    fontWeight: '600',
    textTransform: 'uppercase',
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
    backgroundColor: '#fff',
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: theme.spacing.lg,
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
    textTransform: 'uppercase',
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
    marginBottom: theme.spacing.xl,
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
    fontSize: theme.fontSize.md,
    color: theme.colors.text,
    fontWeight: '700',
    marginBottom: theme.spacing.md,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  saveButton: {
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
    padding: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  organistaContent: {
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
    fontStyle: 'italic',
    textAlign: 'center',
    padding: theme.spacing.lg,
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
    marginTop: theme.spacing.xl,
  },
});
