import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  Platform,
  Alert,
} from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { AppHeader } from '../components/AppHeader';
import { AutocompleteField } from '../components/AutocompleteField';
import { theme } from '../theme';
import { supabaseDataService } from '../services/supabaseDataService';
import { googleSheetsService } from '../services/googleSheetsService';
import { showToast } from '../utils/toast';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useAuthContext } from '../context/AuthContext';
import { localStorageService } from '../services/localStorageService';
import { PrimaryButton } from '../components/PrimaryButton';
import { Cargo } from '../types/models';
import { handleHardReset } from '../utils/appActions';

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
        const locais: { id: string; nome: string }[] = [
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
      return;
    }

    try {
      setLoading(true);
      const results = await supabaseDataService.fetchRegistrosFromSupabase(
        localEnsaio,
        term || undefined
      );
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
      localEnsaio
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
        const sheetsResult = await googleSheetsService.deleteRegistroFromSheet?.(registro.uuid!);
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

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateString;
    }
  };

  // Se não é master, mostrar mensagem
  if (!isMaster) {
    return (
      <View style={styles.container}>
        <AppHeader />
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
      </View>
    );
  }

  // Se não tem local definido
  if (!localEnsaio) {
    return (
      <View style={styles.container}>
        <AppHeader />
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
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <AppHeader 
        onRefresh={onRefresh}
        onHardReset={handleHardReset}
      />
      <ScrollView
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
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.headerTop}>
              <TouchableOpacity
                style={styles.backButton}
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
                <FontAwesome5 name="arrow-left" size={16} color={theme.colors.primary} />
                <Text style={styles.backButtonText}>Voltar</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.cardTitle}>Editar Registros</Text>
            <Text style={styles.cardSubtitle}>
              Local: {localEnsaio} • {registros.length} registro(s) encontrado(s)
            </Text>
          </View>

          {/* Campo de busca */}
          <View style={styles.searchContainer}>
            <FontAwesome5
              name="search"
              size={16}
              color={theme.colors.textSecondary}
              style={styles.searchIcon}
            />
            <TextInput
              style={styles.searchInput}
              placeholder="Pesquisar por nome, cargo ou comum..."
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
              <FontAwesome5 name="search" size={48} color={theme.colors.textSecondary} />
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
                      <Text style={styles.registroNome}>
                        {registro.nome_completo || 'Nome não informado'}
                      </Text>
                      <View style={styles.actionButtons}>
                        <TouchableOpacity
                          style={styles.editButton}
                          onPress={() => {
                            console.log('🔘 Botão de editar clicado para:', registro.nome_completo);
                            handleEdit(registro);
                          }}
                          activeOpacity={0.7}
                        >
                          <FontAwesome5 name="edit" size={16} color={theme.colors.primary} />
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[styles.deleteButton, deleting === registro.uuid && { opacity: 0.5 }]}
                          onPress={() => handleDelete(registro)}
                          disabled={deleting === registro.uuid}
                          activeOpacity={0.7}
                        >
                          {deleting === registro.uuid ? (
                            <ActivityIndicator size="small" color={theme.colors.error} />
                          ) : (
                            <FontAwesome5 name="trash-alt" size={16} color={theme.colors.error} />
                          )}
                        </TouchableOpacity>
                      </View>
                    </View>

                    <View style={styles.registroDetails}>
                      <View style={styles.detailRow}>
                        <FontAwesome5 name="users" size={12} color={theme.colors.textSecondary} />
                        <Text style={styles.detailText}>{registro.comum || 'Não informado'}</Text>
                      </View>

                      <View style={styles.detailRow}>
                        <FontAwesome5 name="user" size={12} color={theme.colors.textSecondary} />
                        <Text style={styles.detailText}>{registro.cargo || 'Não informado'}</Text>
                      </View>

                      {registro.instrumento && (
                        <View style={styles.detailRow}>
                          <FontAwesome5 name="music" size={12} color={theme.colors.textSecondary} />
                          <Text style={styles.detailText}>{registro.instrumento}</Text>
                        </View>
                      )}

                      {registro.classe_organista && (
                        <View style={styles.detailRow}>
                          <FontAwesome5
                            name="keyboard"
                            size={12}
                            color={theme.colors.textSecondary}
                          />
                          <Text style={styles.detailText}>Classe: {registro.classe_organista}</Text>
                        </View>
                      )}

                      <View style={styles.detailRow}>
                        <FontAwesome5
                          name="map-marker-alt"
                          size={12}
                          color={theme.colors.textSecondary}
                        />
                        <Text style={styles.detailText}>
                          {registro.local_ensaio || 'Não informado'}
                        </Text>
                      </View>

                      <View style={styles.detailRow}>
                        <FontAwesome5 name="clock" size={12} color={theme.colors.textSecondary} />
                        <Text style={styles.detailText}>
                          {formatDate(registro.data_ensaio || registro.created_at || '')}
                        </Text>
                      </View>

                      {registro.anotacoes && (
                        <View style={styles.detailRow}>
                          <FontAwesome5
                            name="sticky-note"
                            size={12}
                            color={theme.colors.textSecondary}
                          />
                          <Text style={styles.detailText}>{registro.anotacoes}</Text>
                        </View>
                      )}
                    </View>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: theme.spacing.lg,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
  },
  cardHeader: {
    padding: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  headerTop: {
    marginBottom: theme.spacing.md,
  },
  backButton: {
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
    fontSize: theme.fontSize.xl,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  cardSubtitle: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  searchIcon: {
    marginRight: theme.spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: theme.fontSize.md,
    color: theme.colors.text,
    paddingVertical: theme.spacing.sm,
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
    padding: theme.spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
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
  registroItem: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  registroContent: {
    padding: theme.spacing.md,
  },
  registroHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  registroNome: {
    fontSize: theme.fontSize.md,
    fontWeight: '600',
    color: theme.colors.text,
    flex: 1,
  },
  editButton: {
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.primary + '20', // Fundo mais visível
    minWidth: 40,
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.primary + '40',
  },
  deleteButton: {
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    backgroundColor: '#FEE8E8', // Vermelho suave
    minWidth: 40,
    minHeight: 40,
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
