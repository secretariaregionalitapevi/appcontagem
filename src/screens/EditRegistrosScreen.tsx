import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Platform,
  Alert,
} from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { RegisterBottomBar } from '../components/RegisterBottomBar';
import { AppHeader } from '../components/AppHeader';
import { AutocompleteField } from '../components/AutocompleteField';
import { RefreshableScrollView } from '../components/RefreshableScrollView';
import { theme } from '../theme';
import { supabaseDataService } from '../services/supabaseDataService';
import { googleSheetsService } from '../services/googleSheetsService';
import { showToast } from '../utils/toast';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useAuthContext } from '../context/AuthContext';
import { localStorageService } from '../services/localStorageService';
import { PrimaryButton } from '../components/PrimaryButton';
import { Cargo } from '../types/models';
import { formatRegistroDateTime } from '../utils/dateUtils';

interface RegistroPresencaSupabase {
  uuid?: string;
  nome_completo?: string;
  comum?: string;
  cidade?: string;
  cargo?: string;
  instrumento?: string;
  naipe_instrumento?: string;
  classe_organista?: string;
  local_ensaio?: string;
  data_ensaio?: string;
  registrado_por?: string;
  anotacoes?: string;
  created_at?: string;
  updated_at?: string;
}

export const EditRegistrosScreen: React.FC = () => {
  const navigation = useNavigation();
  const { user } = useAuthContext();
  const [registros, setRegistros] = useState<RegistroPresencaSupabase[]>([]);
  const [cargos, setCargos] = useState<Cargo[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [localEnsaio, setLocalEnsaio] = useState<string>('');

  // Atualizar lista automaticamente quando a tela ganha foco
  // (ex: ao voltar da tela de edição)
  useFocusEffect(
    React.useCallback(() => {
      if (searchTerm.trim()) {
        performSearch(searchTerm.trim());
      }
    }, [searchTerm])
  );

  // Verificar se usuário é master
  const userRole = user?.role ? String(user.role).toLowerCase().trim() : 'user';
  const isMaster = userRole === 'master' || userRole === 'admin';

  useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      document.title = 'CCB | Editar Registros';
    }
  }, []);

  useEffect(() => {
    loadLocalEnsaio();
    loadCargos();
  }, []);

  const loadCargos = async () => {
    try {
      const cargosData = await supabaseDataService.getCargosFromLocal();
      setCargos(cargosData);
      console.log('✅ Cargos carregados:', cargosData.length);
    } catch (error) {
      console.error('❌ Erro ao carregar cargos:', error);
    }
  };

  // Criar opções de cargos para o AutocompleteField
  const cargosOptions = useMemo(() => {
    return cargos.map(c => ({
      id: c.id,
      label: c.nome,
      value: c.id,
    }));
  }, [cargos]);

  const loadLocalEnsaio = async () => {
    try {
      const localId = await localStorageService.getLocalEnsaio();
      if (localId) {
        // Converter ID para nome
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
        const localEncontrado = locais.find(l => l.id === localId);
        setLocalEnsaio(localEncontrado?.nome || localId);
      } else {
        showToast.error('Erro', 'Local de ensaio não definido');
      }
    } catch (error) {
      console.error('Erro ao carregar local de ensaio:', error);
      showToast.error('Erro', 'Erro ao carregar local de ensaio');
    }
  };

  const performSearch = async (term: string) => {
    if (!localEnsaio || !isMaster) {
      console.warn(
        '⚠️ [performSearch] Busca cancelada (local não definido ou usuário não master):',
        { localEnsaio, isMaster, userRole: user?.role }
      );
      return;
    }

    console.log('🔍 [performSearch] Iniciando busca:', { term, localEnsaio, isMaster });
    try {
      setLoading(true);
      const results = await supabaseDataService.fetchRegistrosFromSupabase(
        localEnsaio,
        term || undefined
      );
      console.log(`✅ [performSearch] Busca concluída. Resultados: ${results.length}`);
      setRegistros(results);
    } catch (error) {
      console.error('Erro ao buscar registros:', error);
      showToast.error('Erro', 'Não foi possível buscar os registros');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (text: string) => {
    setSearchTerm(text);

    // Se o campo estiver vazio, limpar resultados
    if (!text.trim()) {
      setRegistros([]);
      return;
    }

    // Debounce da busca - só buscar se houver texto
    const timeoutId = setTimeout(() => {
      if (text.trim()) {
        performSearch(text.trim());
      } else {
        setRegistros([]);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await performSearch(searchTerm);
    setRefreshing(false);
  };

  const handleEdit = (registro: RegistroPresencaSupabase) => {
    console.log('📝 handleEdit chamado para registro:', registro);

    // Verificar permissão
    if (!isMaster) {
      console.log('❌ Usuário não é master');
      showToast.error('Sem permissão', 'Apenas usuários master podem editar registros');
      return;
    }

    // Verificar se o registro pertence ao local do usuário
    const registroLocal = registro.local_ensaio || '';
    if (registroLocal.toLowerCase().trim() !== localEnsaio.toLowerCase().trim()) {
      showToast.error(
        'Sem permissão',
        `Registro pertence a "${registroLocal}" mas você é de "${localEnsaio}"`
      );
      return;
    }

    // Navegar para a tela de detalhes da edição enviando o registro
    // @ts-ignore
    navigation.navigate('EditRecordDetail', {
      registro,
      localEnsaio,
    });
  };

  const handleDelete = async (registro: RegistroPresencaSupabase) => {
    if (!registro.uuid) return;
    console.log('🗑️ Tentando excluir registro:', registro.nome_completo, registro.uuid);

    const confirmed = await showToast.confirm(
      'Tem certeza?',
      registro.nome_completo || 'Este registro'
    );

    if (!confirmed) return;

    try {
      setDeleting(registro.uuid!);
      console.log('🗑️ [UI] Iniciando processo de exclusão...');
      console.log('🗑️ [UI] UUID:', registro.uuid);
      console.log('🗑️ [UI] Nome:', registro.nome_completo);

      // 1. Tentar deletar do Supabase (prioridade, pois define se o registro "existe" no app)
      const supabaseResult = await supabaseDataService.deleteRegistro(registro.uuid!);

      if (!supabaseResult.success) {
        console.error('❌ [UI] Erro ao deletar do Supabase:', supabaseResult.error);
        showToast.error('Erro ao remover do banco de dados', supabaseResult.error);
        setDeleting(null);
        return;
      }

      console.log('✅ [UI] Removido do Supabase com sucesso');

      // 2. Tentar deletar do Google Sheets (processo secundário, não bloqueia UI se falhar tecnicamente)
      try {
        console.log('📤 [UI] Solicitando remoção no Google Sheets...');
        const sheetsResult = await googleSheetsService.deleteRegistroFromSheet(
          registro.uuid!,
          registro.nome_completo,
          user?.nome || user?.email || 'Desconhecido'
        );
        console.log('📊 [UI] Resultado da solicitação Google Sheets:', sheetsResult);
      } catch (sheetsError) {
        console.warn('⚠️ [UI] Erro não tratado ao chamar deleteRegistroFromSheet:', sheetsError);
      }

      showToast.success('Registro excluído com sucesso!');

      // 3. Recarregar a lista para refletir a exclusão
      if (searchTerm.trim()) {
        performSearch(searchTerm.trim());
      } else {
        // Se estiver vazio, pelo menos limpar o estado local ou recarregar
        onRefresh();
      }
    } catch (error) {
      console.error('❌ Erro na exclusão:', error);
      showToast.error('Erro inesperado ao excluir registro');
    } finally {
      setDeleting(null);
    }
  };

  const bottomNavigation = (
    <RegisterBottomBar
      activeTab="records"
      onHomePress={() => navigation.navigate('Register' as never)}
      onEditRegistrosPress={() => navigation.navigate('EditRegistros' as never)}
      onOrganistasEnsaioPress={() => navigation.navigate('OrganistasEnsaio' as never)}
    />
  );

  // Se não é master, mostrar mensagem
  if (!isMaster) {
    return (
      <View style={styles.container}>
        <AppHeader mobileDesign />
        <View style={styles.noPermissionContainer}>
          <FontAwesome5 name="lock" size={48} color={theme.colors.error} />
          <Text style={styles.noPermissionText}>Acesso Restrito</Text>
          <Text style={styles.noPermissionSubtext}>
            Apenas usuários master podem editar registros
          </Text>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => {
              console.log('🔙 Botão voltar clicado (sem permissão)');
              navigation.goBack();
            }}
          >
            <FontAwesome5 name="arrow-left" size={16} color={theme.colors.primary} />
            <Text style={styles.backButtonText}>Voltar</Text>
          </TouchableOpacity>
        </View>
        {bottomNavigation}
      </View>
    );
  }

  // Se não tem local definido
  if (!localEnsaio) {
    return (
      <View style={styles.container}>
        <AppHeader mobileDesign />
        <View style={styles.noPermissionContainer}>
          <FontAwesome5 name="map-marker-alt" size={48} color={theme.colors.warning} />
          <Text style={styles.noPermissionText}>Local não definido</Text>
          <Text style={styles.noPermissionSubtext}>
            Defina o local de ensaio para visualizar os registros
          </Text>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => {
              console.log('🔙 Botão voltar clicado (sem local)');
              navigation.goBack();
            }}
          >
            <FontAwesome5 name="arrow-left" size={16} color={theme.colors.primary} />
            <Text style={styles.backButtonText}>Voltar</Text>
          </TouchableOpacity>
        </View>
        {bottomNavigation}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <AppHeader mobileDesign />
      <RefreshableScrollView
        refreshing={refreshing}
        onRefresh={onRefresh}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        nestedScrollEnabled={Platform.OS !== 'web'}
        scrollEnabled={true}
        bounces={Platform.OS === 'ios'}
        showsVerticalScrollIndicator={true}
        alwaysBounceVertical={false}
        scrollEventThrottle={16}
        removeClippedSubviews={Platform.OS === 'android'}
      >
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.titleRow}>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Voltar para a tela anterior"
                style={styles.navigationBack}
                onPress={() => {
                  console.log('🔙 Botão voltar clicado');
                  try {
                    if (navigation.canGoBack()) {
                      navigation.goBack();
                    } else {
                      navigation.navigate('Register' as never);
                    }
                  } catch (error) {
                    console.error('Erro ao voltar:', error);
                    navigation.navigate('Register' as never);
                  }
                }}
              >
                <FontAwesome5 solid name="chevron-left" size={24} color="#174c70" />
              </TouchableOpacity>
              <View style={styles.titleContent}>
                <Text style={styles.sectionEyebrow}>GESTÃO DE PRESENÇAS</Text>
                <Text style={styles.cardTitle}>Editar registros</Text>
              </View>
            </View>
            <Text style={styles.cardSubtitle}>Encontre e gerencie as presenças do ensaio.</Text>
            <View style={styles.metadataRow}>
              <View style={styles.locationInfo}>
                <View style={styles.locationIcon}>
                  <FontAwesome5 solid name="map-marker-alt" size={18} color="#dc4545" />
                </View>
                <Text style={styles.locationLabel}>
                  Local: <Text style={styles.locationCity}>{localEnsaio}</Text>
                </Text>
              </View>
              <View style={styles.resultsBadge} accessibilityLiveRegion="polite">
                <View style={styles.resultDot} />
                <Text style={styles.resultsText}>
                  <Text style={styles.resultsCount}>{registros.length}</Text>{' '}
                  {registros.length === 1 ? 'resultado encontrado' : 'resultados encontrados'}
                </Text>
              </View>
            </View>
          </View>

          {/* Campo de busca */}
          <View style={[styles.searchContainer, searchFocused && styles.searchContainerFocused]}>
            <FontAwesome5
              solid
              name="search"
              size={22}
              color={searchFocused ? '#0867a8' : '#718596'}
              style={styles.searchIcon}
            />
            <TextInput
              accessibilityLabel="Pesquisar por nome, cargo ou comum"
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              style={styles.searchInput}
              placeholder="Busque por nome, cargo ou comum"
              placeholderTextColor={theme.colors.textSecondary}
              value={searchTerm}
              onChangeText={handleSearch}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={theme.colors.primary} />
              <Text style={styles.loadingText}>Buscando registros...</Text>
            </View>
          ) : registros.length === 0 ? (
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIcon}>
                <FontAwesome5 solid name="search" size={36} color="#527b98" />
              </View>
              <Text style={styles.emptyText}>
                {searchTerm ? 'Nenhum registro encontrado' : 'Nenhuma pesquisa realizada'}
              </Text>
              <Text style={styles.emptySubtext}>
                {searchTerm
                  ? 'Tente refinar sua pesquisa'
                  : 'Digite no campo acima para buscar registros'}
              </Text>
            </View>
          ) : (
            <View style={styles.registrosList}>
              {registros.map((registro, index) => (
                <View key={registro.uuid || index} style={styles.registroItem}>
                  <View style={styles.registroContent}>
                    <View style={styles.registroHeader}>
                      <View style={styles.personAvatar}>
                        <Text style={styles.personInitials}>
                          {(registro.nome_completo || '?')
                            .trim()
                            .split(/\s+/)
                            .filter(Boolean)
                            .filter((_, i, parts) => i === 0 || i === parts.length - 1)
                            .map(part => part[0])
                            .join('')
                            .toUpperCase()}
                        </Text>
                      </View>
                      <View style={styles.personIdentity}>
                        <Text style={styles.personOverline}>PARTICIPANTE</Text>
                        <Text style={styles.registroNome}>
                          {registro.nome_completo || 'Nome não informado'}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.participantBadges}>
                      <View style={styles.roleBadge}>
                        <FontAwesome5 solid name="user" size={14} color="#7253a2" />
                        <Text style={styles.roleBadgeText}>
                          {registro.cargo || 'Cargo não informado'}
                        </Text>
                      </View>
                      {!!registro.instrumento && (
                        <View style={styles.instrumentBadge}>
                          <FontAwesome5 solid name="music" size={14} color="#147f89" />
                          <Text style={styles.instrumentBadgeText}>{registro.instrumento}</Text>
                        </View>
                      )}
                      {!!registro.classe_organista && (
                        <View style={styles.instrumentBadge}>
                          <Text style={styles.instrumentBadgeText}>
                            {registro.classe_organista}
                          </Text>
                        </View>
                      )}
                    </View>
                    <View style={styles.commonInfo}>
                      <View style={styles.commonIcon}>
                        <FontAwesome5 solid name="users" size={20} color="#1684dc" />
                      </View>
                      <View style={styles.personIdentity}>
                        <Text style={styles.personOverline}>COMUM CONGREGAÇÃO</Text>
                        <Text style={styles.commonName}>{registro.comum || 'Não informado'}</Text>
                      </View>
                    </View>
                    {!!registro.anotacoes && (
                      <View style={styles.recordNote}>
                        <FontAwesome5 solid name="file-alt" size={16} color="#dc9616" />
                        <Text style={styles.detailText}>{registro.anotacoes}</Text>
                      </View>
                    )}
                    <View style={styles.recordFooter}>
                      <View style={styles.recordMetadata}>
                        <View style={styles.detailRow}>
                          <FontAwesome5 solid name="map-marker-alt" size={14} color="#dc4545" />
                          <Text style={styles.recordLocation}>
                            {registro.local_ensaio || 'Não informado'}
                          </Text>
                        </View>
                        <View style={styles.detailRow}>
                          <FontAwesome5 solid name="clock" size={14} color="#079c98" />
                          <Text style={styles.recordDate}>
                            {formatRegistroDateTime(registro.data_ensaio, registro.created_at)}
                          </Text>
                        </View>
                      </View>
                      <View style={styles.actionButtons}>
                        <TouchableOpacity
                          accessibilityRole="button"
                          accessibilityLabel={`Editar ${registro.nome_completo || 'registro'}`}
                          style={styles.editButton}
                          onPress={() => {
                            console.log('🔘 Botão de editar clicado para:', registro.nome_completo);
                            handleEdit(registro);
                          }}
                          activeOpacity={0.7}
                        >
                          <FontAwesome5 solid name="edit" size={19} color="#ffffff" />
                          <Text style={styles.editActionLabel}>Editar</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          accessibilityRole="button"
                          accessibilityLabel={`Excluir ${registro.nome_completo || 'registro'}`}
                          style={[
                            styles.deleteButton,
                            deleting === registro.uuid && { opacity: 0.5 },
                          ]}
                          onPress={() => handleDelete(registro)}
                          disabled={deleting === registro.uuid}
                          activeOpacity={0.7}
                        >
                          {deleting === registro.uuid ? (
                            <ActivityIndicator size="small" color={theme.colors.error} />
                          ) : (
                            <FontAwesome5
                              solid
                              name="trash-alt"
                              size={21}
                              color={theme.colors.error}
                            />
                          )}
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      </RefreshableScrollView>
      {bottomNavigation}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f6fa',
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
    minHeight: 0,
  },
  scrollContent: {
    padding: theme.spacing.lg,
    flexGrow: 1,
  },
  card: {
    width: '100%',
    maxWidth: 760,
    alignSelf: 'center',
    borderWidth: 1,
    borderColor: '#e3ebf1',
    backgroundColor: theme.colors.surface,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 20,
    elevation: 3,
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  titleContent: { flex: 1, minWidth: 0 },
  navigationBack: {
    width: 44,
    height: 44,
    borderRadius: 15,
    backgroundColor: '#f0f5f9',
    borderWidth: 1,
    borderColor: '#e3ebf1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionEyebrow: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.4,
    color: '#6c8395',
    marginBottom: 5,
  },
  metadataRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 22,
  },
  locationInfo: { flexDirection: 'row', alignItems: 'center', gap: 7, flexShrink: 1 },
  locationIcon: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: '#fff0ef',
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationLabel: { fontSize: 13, lineHeight: 20, color: '#718196', flexShrink: 1 },
  locationCity: { fontWeight: '700', color: '#223c50' },
  resultsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#edf5fb',
    marginLeft: 'auto',
  },
  resultDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#3684b8' },
  resultsText: { fontSize: 11, color: '#42718f', lineHeight: 16 },
  resultsCount: { fontWeight: '800', color: '#125d8c' },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 28,
    backgroundColor: '#edf4f8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardHeader: {
    padding: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: '#edf2f6',
  },
  headerTop: {
    marginBottom: theme.spacing.md,
  },
  backButton: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.primary + '15',
    gap: theme.spacing.xs,
  },
  backButtonText: {
    fontSize: theme.fontSize.md,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  cardTitle: {
    fontSize: 26,
    letterSpacing: -0.6,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  cardSubtitle: {
    marginTop: 14,
    lineHeight: 21,
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  searchContainer: {
    margin: 20,
    backgroundColor: '#f3f7fa',
    borderWidth: 1,
    borderRadius: 16,
    borderColor: '#e1eaf1',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: 5,
  },
  searchContainerFocused: { borderColor: '#2a83b9', backgroundColor: '#ffffff' },
  searchIcon: {
    marginRight: theme.spacing.sm,
  },
  searchInput: {
    flex: 1,
    minWidth: 0,
    minHeight: 44,
    fontSize: theme.fontSize.md,
    color: theme.colors.text,
    paddingVertical: 10,
    backgroundColor: 'transparent',
    ...(Platform.OS === 'web' ? { outlineStyle: 'none' as any, borderWidth: 0 } : {}),
  },
  loadingContainer: {
    padding: theme.spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: theme.spacing.md,
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
  },
  emptyContainer: {
    minHeight: 240,
    padding: theme.spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    textAlign: 'center',
    fontSize: theme.fontSize.lg,
    fontWeight: '600',
    color: theme.colors.text,
    marginTop: theme.spacing.md,
  },
  emptySubtext: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
    textAlign: 'center',
  },
  noPermissionContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.xl,
  },
  noPermissionText: {
    fontSize: theme.fontSize.xl,
    fontWeight: '600',
    color: theme.colors.text,
    marginTop: theme.spacing.md,
  },
  noPermissionSubtext: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.sm,
    textAlign: 'center',
  },
  registrosList: {
    padding: theme.spacing.md,
  },
  personAvatar: {
    width: 48,
    height: 48,
    borderRadius: 17,
    backgroundColor: '#eaf3fa',
    alignItems: 'center',
    justifyContent: 'center',
  },
  personInitials: { fontSize: 17, fontWeight: '700', color: '#176497' },
  personIdentity: { flex: 1, minWidth: 0 },
  personOverline: {
    fontSize: 9,
    letterSpacing: 1.1,
    fontWeight: '700',
    color: '#8192a1',
    marginBottom: 5,
  },
  participantBadges: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginVertical: 16 },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#f3eefb',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
    maxWidth: '100%',
  },
  roleBadgeText: { fontSize: 11, fontWeight: '600', color: '#7253a2', flexShrink: 1 },
  instrumentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#eaf7f7',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
    maxWidth: '100%',
  },
  instrumentBadgeText: { fontSize: 11, fontWeight: '600', color: '#147f89', flexShrink: 1 },
  commonInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#f7f9fc',
    padding: 12,
    borderRadius: 12,
  },
  commonIcon: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  commonName: { fontSize: 12, lineHeight: 19, color: '#3b5368', fontWeight: '500' },
  recordNote: { flexDirection: 'row', gap: 8, marginTop: 12 },
  recordFooter: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
    borderTopWidth: 1,
    borderTopColor: '#edf2f6',
    marginTop: 16,
    paddingTop: 16,
  },
  recordMetadata: { gap: 6 },
  recordLocation: { fontSize: 11, fontWeight: '600', color: '#526c80', flexShrink: 1 },
  recordDate: { fontSize: 11, color: '#8494a2' },
  editActionLabel: { fontSize: 12, color: '#ffffff', fontWeight: '600' },
  registroItem: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  registroContent: {
    padding: theme.spacing.md,
  },
  registroHeader: {
    gap: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  registroNome: {
    fontSize: 17,
    lineHeight: 24,
    fontWeight: '600',
    color: theme.colors.text,
    flex: 1,
  },
  editButton: {
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 14,
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    backgroundColor: '#0867a8', // Fundo mais visível
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#0867a8',
  },
  deleteButton: {
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    backgroundColor: '#FEE8E8', // Vermelho suave
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.error + '40',
    marginLeft: theme.spacing.sm,
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  registroDetails: {
    gap: theme.spacing.xs,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  detailText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    flex: 1,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    ...(Platform.OS === 'web'
      ? {
          position: 'fixed' as any,
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 99999,
        }
      : {}),
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    ...(Platform.OS === 'web'
      ? {
          position: 'fixed' as any,
          zIndex: 99998,
        }
      : {}),
  },
  modalContentWrapper: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.lg,
    zIndex: 99999,
    ...(Platform.OS === 'web'
      ? {
          position: 'relative' as const,
          zIndex: 99999,
        }
      : {}),
  },
  modalContent: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    width: '100%',
    maxHeight: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
    zIndex: 100000,
    ...(Platform.OS === 'web'
      ? {
          maxWidth: '800px' as any,
          maxHeight: '90%' as any,
          width: '90%',
          position: 'relative' as const,
          zIndex: 100000,
        }
      : {}),
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  modalTitle: {
    fontSize: theme.fontSize.xl,
    fontWeight: '600',
    color: theme.colors.text,
  },
  modalCloseButton: {
    padding: theme.spacing.xs,
  },
  modalBody: {
    padding: theme.spacing.xl,
    maxHeight: 500,
    ...(Platform.OS === 'web'
      ? {
          maxHeight: '60vh' as any,
        }
      : {}),
  },
  formField: {
    marginBottom: theme.spacing.md,
  },
  formLabel: {
    fontSize: theme.fontSize.sm,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  formInput: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.sm,
    fontSize: theme.fontSize.md,
    color: theme.colors.text,
    backgroundColor: theme.colors.surface,
    minHeight: 44, // Altura uniforme para todos os campos
    ...(Platform.OS === 'web' ? { height: 44 } : {}), // Altura fixa no web
  },
  formTextArea: {
    minHeight: 80,
    textAlignVertical: 'top',
    paddingTop: theme.spacing.sm, // Padding extra no topo para melhor alinhamento
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    gap: theme.spacing.md,
    ...(Platform.OS === 'web'
      ? {
          position: 'sticky' as any,
          bottom: 0,
        }
      : {}),
  },
  cancelButton: {
    flex: 1,
    minHeight: 48,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    borderRadius: theme.borderRadius.md,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...(Platform.OS === 'web'
      ? {
          cursor: 'pointer',
          transition: 'all 0.2s ease',
        }
      : {
          elevation: 0,
        }),
  },
  cancelButtonText: {
    fontSize: theme.fontSize.md,
    fontWeight: '600',
    color: '#374151',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
