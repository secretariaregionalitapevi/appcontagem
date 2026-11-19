import { usePwaUpdateGuard } from '../hooks/usePwaUpdateGuard';
import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Platform,
  KeyboardAvoidingView,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { RegisterBottomBar } from '../components/RegisterBottomBar';
import { AppHeader } from '../components/AppHeader';
import { AutocompleteField } from '../components/AutocompleteField';
import { PrimaryButton } from '../components/PrimaryButton';
import { RefreshableScrollView } from '../components/RefreshableScrollView';
import { theme } from '../theme';
import { supabaseDataService } from '../services/supabaseDataService';
import { googleSheetsService } from '../services/googleSheetsService';
import { showToast } from '../utils/toast';
import { Cargo } from '../types/models';

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

type RootStackParamList = {
  EditRecordDetail: { registro: RegistroPresencaSupabase; localEnsaio: string };
};

type EditRecordDetailRouteProp = RouteProp<RootStackParamList, 'EditRecordDetail'>;

const EditTextInput: React.FC<React.ComponentProps<typeof TextInput>> = ({
  style,
  onFocus,
  onBlur,
  ...props
}) => {
  const [focused, setFocused] = useState(false);
  return (
    <TextInput
      {...props}
      placeholderTextColor="#91a0ad"
      style={[styles.input, style, focused && styles.inputFocused]}
      onFocus={event => {
        setFocused(true);
        onFocus?.(event);
      }}
      onBlur={event => {
        setFocused(false);
        onBlur?.(event);
      }}
    />
  );
};

const FormSectionTitle: React.FC<{
  icon: React.ComponentProps<typeof FontAwesome5>['name'];
  title: string;
  subtitle: string;
  color?: string;
  background?: string;
}> = ({ icon, title, subtitle, color = '#1684dc', background = '#e8f3ff' }) => (
  <View style={styles.sectionTitleRow}>
    <View style={[styles.sectionIcon, { backgroundColor: background }]}>
      <FontAwesome5 solid name={icon} size={19} color={color} />
    </View>
    <View style={{ flex: 1, minHeight: 0 }}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.sectionSubtitle}>{subtitle}</Text>
    </View>
  </View>
);

export const EditRecordDetailScreen: React.FC = () => {
  const navigation = useNavigation();
  const { width } = useWindowDimensions();
  const isWide = width >= 680;
  const route = useRoute<EditRecordDetailRouteProp>();
  usePwaUpdateGuard(true);
  const { registro, localEnsaio } = route.params;

  const [cargos, setCargos] = useState<Cargo[]>([]);
  const [instrumentos, setInstrumentos] = useState<{ id: string; nome: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);

  // Estados do formulário
  const [nome, setNome] = useState(registro.nome_completo || '');
  const [comum, setComum] = useState(registro.comum || '');
  const [cidade, setCidade] = useState(registro.cidade || '');
  const [cargoId, setCargoId] = useState('');
  const [instrumento, setInstrumento] = useState(registro.instrumento || '');
  const [naipe, setNaipe] = useState(registro.naipe_instrumento || '');
  const [classe, setClasse] = useState(registro.classe_organista || '');
  const [anotacoes, setAnotacoes] = useState(registro.anotacoes || '');

  useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      document.title = 'CCB | Detalhes do Registro';
    }
    loadData();
  }, []);

  const loadData = async (showFullScreenLoading = true) => {
    try {
      if (showFullScreenLoading) {
        setLoading(true);
      }
      const [cargosData, instrumentosData] = await Promise.all([
        supabaseDataService.getCargosFromLocal(),
        supabaseDataService.getInstrumentosFromLocal(),
      ]);

      setCargos(cargosData);
      setInstrumentos(instrumentosData);

      // Encontrar o ID do cargo pelo nome
      const cargoEncontrado = cargosData.find(
        c => c.nome.toUpperCase() === (registro.cargo || '').toUpperCase()
      );
      if (cargoEncontrado) {
        setCargoId(cargoEncontrado.id);
      }
    } catch (error) {
      console.error('❌ Erro ao carregar dados:', error);
    } finally {
      if (showFullScreenLoading) {
        setLoading(false);
      }
    }
  };

  const onRefresh = async () => {
    try {
      setRefreshing(true);
      await loadData(false);
    } finally {
      setRefreshing(false);
    }
  };

  const cargosOptions = useMemo(() => {
    return cargos.map(c => ({
      id: c.id,
      label: c.nome,
      value: c.id,
    }));
  }, [cargos]);

  const instrumentosOptions = useMemo(() => {
    return instrumentos.map(i => ({
      id: i.id,
      label: i.nome,
      value: i.nome, // Usamos o nome como valor para o instrumento
    }));
  }, [instrumentos]);

  const handleSave = async () => {
    if (!registro.uuid) {
      showToast.error('Erro', 'Registro sem identificador único');
      return;
    }

    if (!nome.trim() || !comum.trim() || !cargoId) {
      showToast.error('Campos obrigatórios', 'Preencha Nome, Comum e Cargo');
      return;
    }

    try {
      setSaving(true);
      const cargoSelecionado = cargos.find(c => c.id === cargoId);
      const cargoNome = cargoSelecionado?.nome || cargoId;

      const updateData = {
        nome_completo: nome.trim().toUpperCase(),
        comum: comum.trim().toUpperCase(),
        cidade: cidade.trim().toUpperCase(),
        cargo: cargoNome.toUpperCase(),
        instrumento: instrumento.trim() ? instrumento.trim().toUpperCase() : undefined,
        naipe_instrumento: naipe.trim() ? naipe.trim().toUpperCase() : undefined,
        classe_organista: classe.trim() ? classe.trim().toUpperCase() : undefined,
        anotacoes: anotacoes.trim() ? anotacoes.trim().toUpperCase() : undefined,
      };

      // 1. Google Sheets
      const sheetsResult = await googleSheetsService.updateRegistroInSheet(
        registro.uuid,
        updateData
      );

      // 2. Supabase
      const supabaseResult = await supabaseDataService.updateRegistroInSupabase(
        registro.uuid,
        updateData
      );

      if (supabaseResult.success || sheetsResult.success) {
        showToast.success('Sucesso', 'Registro atualizado com sucesso!');
        setTimeout(() => {
          navigation.goBack();
        }, 300);
      } else {
        throw new Error(supabaseResult.error || 'Erro ao atualizar no banco de dados');
      }
    } catch (error) {
      console.error('❌ Erro ao salvar:', error);
      showToast.error('Erro', 'Não foi possível salvar as alterações');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <AppHeader mobileDesign />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Carregando dados...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <AppHeader mobileDesign />
      <KeyboardAvoidingView
        style={{ flex: 1, minHeight: 0 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <RefreshableScrollView
          refreshing={refreshing}
          onRefresh={onRefresh}
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          nestedScrollEnabled={true}
          showsVerticalScrollIndicator={true}
          bounces={Platform.OS !== 'web'}
          alwaysBounceVertical={Platform.OS === 'ios'}
          scrollEventThrottle={16}
          removeClippedSubviews={false}
          overScrollMode={Platform.OS === 'android' ? 'always' : undefined}
          contentInsetAdjustmentBehavior={Platform.OS === 'ios' ? 'automatic' : undefined}
        >
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.titleRow}>
                <TouchableOpacity
                  style={styles.backButton}
                  accessibilityRole="button"
                  accessibilityLabel="Voltar para a lista"
                  onPress={() => navigation.goBack()}
                >
                  <FontAwesome5 solid name="chevron-left" size={24} color="#174c70" />
                </TouchableOpacity>
                <View style={{ flex: 1 }}>
                  <Text style={styles.eyebrow}>GESTÃO DE PRESENÇAS</Text>
                  <Text style={styles.cardTitle}>Editar registro</Text>
                </View>
                <View style={styles.editBadge}>
                  <FontAwesome5 solid name="edit" size={15} color="#176497" />
                  <Text style={styles.editBadgeText}>Edição</Text>
                </View>
              </View>
              <View style={styles.participantSummary}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
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
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.summaryName}>{registro.nome_completo || 'Participante'}</Text>
                  <View style={styles.summaryLocation}>
                    <FontAwesome5 solid name="map-marker-alt" size={14} color="#dc4545" />
                    <Text style={styles.cardSubtitle}>
                      Local original:{' '}
                      <Text style={styles.cityBold}>{registro.local_ensaio || localEnsaio}</Text>
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            <View style={styles.cardBody}>
              <View style={[styles.formSection, { zIndex: 3 }]}>
                <FormSectionTitle
                  icon="user"
                  title="Identificação"
                  subtitle="Dados do participante e da comum"
                />
                <View style={styles.fieldsGrid}>
                  <View style={styles.formField}>
                    <Text style={styles.label}>Nome completo *</Text>
                    <EditTextInput
                      style={styles.input}
                      value={nome}
                      onChangeText={setNome}
                      placeholder="Nome completo"
                      autoCapitalize="characters"
                    />
                  </View>

                  <View style={[styles.formField, isWide && styles.halfField]}>
                    <Text style={styles.label}>Comum congregação *</Text>
                    <EditTextInput
                      style={styles.input}
                      value={comum}
                      onChangeText={setComum}
                      placeholder="Comum"
                      autoCapitalize="characters"
                    />
                  </View>

                  <View style={[styles.formField, isWide && styles.halfField]}>
                    <Text style={styles.label}>Cidade</Text>
                    <EditTextInput
                      style={styles.input}
                      value={cidade}
                      onChangeText={setCidade}
                      placeholder="Cidade"
                      autoCapitalize="characters"
                    />
                  </View>
                </View>
              </View>
              <View style={[styles.formSection, { zIndex: 2 }]}>
                <FormSectionTitle
                  icon="music"
                  color="#8552cc"
                  background="#f2ecfc"
                  title="Ministério e atividade musical"
                  subtitle="Cargo, instrumento e classificação"
                />
                <View style={styles.fieldsGrid}>
                  <View style={[styles.formField, isWide && styles.halfField, { zIndex: 100 }]}>
                    <Text style={styles.label}>Cargo / ministério *</Text>
                    <AutocompleteField
                      appearance="soft"
                      value={cargoId}
                      options={cargosOptions}
                      onSelect={option => setCargoId(String(option.value))}
                      placeholder="Selecione o cargo..."
                      icon="user"
                    />
                  </View>

                  <View style={[styles.formField, isWide && styles.halfField, { zIndex: 90 }]}>
                    <Text style={styles.label}>Instrumento</Text>
                    <AutocompleteField
                      appearance="soft"
                      value={instrumento}
                      options={instrumentosOptions}
                      onSelect={option => {
                        const novoInstrumento = String(option.label);
                        setInstrumento(novoInstrumento);
                        // Tentar inferir naipe automaticamente
                        const getNaipe = require('../utils/instrumentNaipe').getNaipeByInstrumento;
                        const novoNaipe = getNaipe(novoInstrumento);
                        if (novoNaipe) {
                          setNaipe(novoNaipe);
                        }
                      }}
                      placeholder="Selecione o instrumento..."
                      icon="music"
                    />
                  </View>

                  <View style={[styles.formField, isWide && styles.halfField]}>
                    <Text style={styles.label}>Naipe do instrumento</Text>
                    <EditTextInput
                      style={styles.input}
                      value={naipe}
                      onChangeText={setNaipe}
                      placeholder="Naipe"
                      autoCapitalize="characters"
                    />
                  </View>

                  {/* Lógica Condicional: Só mostrar Classe se for Organista ou cargo feminino musical */}
                  {(cargoId === 'cargo_2_organista' ||
                    cargoId === 'cargo_5_instrutora' ||
                    cargoId === 'cargo_6_examinadora' ||
                    (cargos.find(c => c.id === cargoId)?.nome || '')
                      .toUpperCase()
                      .includes('ORGANISTA')) && (
                    <View style={[styles.formField, isWide && styles.halfField, { zIndex: 80 }]}>
                      <Text style={styles.label}>Classe da organista</Text>
                      <AutocompleteField
                        appearance="soft"
                        value={classe}
                        options={[
                          { id: '1', label: 'OFICIALIZADA', value: 'OFICIALIZADA' },
                          { id: '2', label: 'CULTO OFICIAL', value: 'CULTO OFICIAL' },
                          { id: '3', label: 'RJM / MEIA HORA', value: 'RJM / MEIA HORA' },
                          { id: '4', label: 'MEIA HORA', value: 'MEIA HORA' },
                          { id: '5', label: 'CANDIDATA', value: 'CANDIDATA' },
                        ]}
                        onSelect={option => setClasse(String(option.value))}
                        placeholder="Selecione a classe..."
                        icon="keyboard"
                      />
                    </View>
                  )}
                </View>
              </View>
              <View style={styles.formSection}>
                <FormSectionTitle
                  icon="file-alt"
                  color="#dc9616"
                  background="#fff5df"
                  title="Observações"
                  subtitle="Informações complementares do registro"
                />
                <View style={styles.formField}>
                  <Text style={styles.label}>Anotações</Text>
                  <EditTextInput
                    style={[styles.input, styles.textArea]}
                    value={anotacoes}
                    onChangeText={setAnotacoes}
                    placeholder="Anotações extras..."
                    multiline
                    numberOfLines={3}
                    autoCapitalize="characters"
                  />
                </View>
              </View>
              <View style={styles.buttonContainer}>
                <Text style={styles.requiredHint}>* Campos obrigatórios</Text>
                <PrimaryButton
                  style={styles.saveButton}
                  title="Salvar alterações"
                  onPress={handleSave}
                  loading={saving}
                  icon="save"
                />
              </View>
            </View>
          </View>
        </RefreshableScrollView>
      </KeyboardAvoidingView>
      <RegisterBottomBar
        activeTab="records"
        onHomePress={() => navigation.navigate('Register' as never)}
        onEditRegistrosPress={() => navigation.navigate('EditRegistros' as never)}
        onOrganistasEnsaioPress={() => navigation.navigate('OrganistasEnsaio' as never)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 12, flexWrap: 'wrap' },
  eyebrow: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1.3,
    color: '#748a9b',
    marginBottom: 5,
  },
  editBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 20,
    backgroundColor: '#edf5fb',
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  editBadgeText: { fontSize: 11, color: '#176497', fontWeight: '600' },
  participantSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 22,
    padding: 16,
    backgroundColor: '#f6f9fc',
    borderRadius: 16,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 17,
    backgroundColor: '#e3eff8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#176497', fontSize: 17, fontWeight: '700' },
  summaryName: { fontSize: 14, fontWeight: '700', color: '#28455a', lineHeight: 21 },
  summaryLocation: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 5 },
  cityBold: { fontWeight: '700', color: '#314c61' },
  formSection: {
    borderWidth: 1,
    borderColor: '#e7edf3',
    borderRadius: 18,
    padding: 18,
    backgroundColor: '#ffffff',
    overflow: 'visible',
  },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 22 },
  sectionIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#edf5fb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#28455a', lineHeight: 21 },
  sectionSubtitle: { fontSize: 11, lineHeight: 17, color: '#8192a1', marginTop: 2 },
  fieldsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 16,
  },
  halfField: { width: '48%' },
  inputFocused: { borderColor: '#2a83b9', backgroundColor: '#ffffff' },
  requiredHint: { fontSize: 11, color: '#8192a1' },
  saveButton: { width: '100%', minHeight: 54, borderRadius: 14 },
  container: {
    flex: 1,
    backgroundColor: '#f3f6fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: theme.spacing.md,
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.md,
  },
  scrollView: {
    flex: 1,
    minHeight: 0,
  },
  scrollContent: {
    padding: theme.spacing.md,
    paddingBottom: theme.spacing.xl,
    flexGrow: 1,
  },
  card: {
    width: '100%',
    maxWidth: 860,
    alignSelf: 'center',
    borderWidth: 1,
    borderColor: '#e3ebf1',
    backgroundColor: theme.colors.surface,
    borderRadius: 24,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 20,
    overflow: 'visible',
  },
  cardHeader: {
    padding: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 15,
    backgroundColor: '#f0f5f9',
    justifyContent: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  backButtonText: {
    color: theme.colors.primary,
    fontWeight: '600',
    fontSize: theme.fontSize.sm,
  },
  cardTitle: {
    fontSize: 26,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  cardSubtitle: {
    flexShrink: 1,
    lineHeight: 19,
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginTop: 4,
  },
  cardBody: {
    padding: 20,
    gap: 16,
  },
  formField: {
    width: '100%',
    marginBottom: 4,
  },
  label: {
    fontSize: theme.fontSize.xs,
    fontWeight: '700',
    color: theme.colors.textSecondary,
    marginBottom: 8,
    textTransform: 'none',
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 13,
    padding: theme.spacing.md,
    fontSize: theme.fontSize.md,
    color: theme.colors.text,
    backgroundColor: '#f4f7fa',
    minHeight: 52,
    ...(Platform.OS === 'web' ? { outlineStyle: 'none' as any } : {}),
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  buttonContainer: {
    borderTopWidth: 1,
    borderTopColor: '#e7edf3',
    paddingTop: 20,
    gap: 14,
    marginTop: theme.spacing.md,
    alignItems: 'center',
  },
});
