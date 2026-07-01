import React, { useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  useWindowDimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SimpleSelectField } from '../components/SimpleSelectField';
import { AutocompleteField } from '../components/AutocompleteField';
import { NameSelectField } from '../components/NameSelectField';
import { PrimaryButton } from '../components/PrimaryButton';
import { OfflineBadge } from '../components/OfflineBadge';
import { AppHeader } from '../components/AppHeader';
import { DuplicateModal } from '../components/DuplicateModal';
import { NewRegistrationModal } from '../components/NewRegistrationModal';
import { RefreshableScrollView } from '../components/RefreshableScrollView';
import { Skeleton } from '../components/Skeleton';
import { theme } from '../theme';
import { useRegisterController } from '../hooks/useRegisterController';
import { supabaseDataService } from '../services/supabaseDataService';
import { showToast } from '../utils/toast';
import { offlineSyncService } from '../services/offlineSyncService';
import { generateExternalUUID } from '../utils/uuid';

const ORGANISTA_CLASSES = [
  { id: 'Ensaio', label: 'Ensaio', value: 'Ensaio' },
  { id: 'Meia-Hora', label: 'Meia-Hora', value: 'Meia-Hora' },
  { id: 'RDJM', label: 'RDJM', value: 'RDJM' },
  { id: 'Culto a Noite', label: 'Culto a Noite', value: 'Culto a Noite' },
  { id: 'Oficializada', label: 'Oficializada', value: 'Oficializada' },
];

export const RegisterScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const controller = useRegisterController();
  const {
    user,
    isOnline,
    pendingCount,
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
    selectedClasseOrganista,
    setSelectedClasseOrganista,
    showClasseOrganista,
    isForaRegional,
  } = controller;

  const { width } = useWindowDimensions();
  const isMobile = width <= 768;

  const handleConfirmDuplicate = async () => {
    if (!controller.pendingRegistro) {
      controller.setDuplicateModalVisible(false);
      controller.setDuplicateInfo(null);
      return;
    }

    try {
      controller.setDuplicateModalVisible(false);
      controller.setLoading(true);

      const result = await offlineSyncService.createRegistro(
        { ...controller.pendingRegistro, id: generateExternalUUID() },
        true // skipDuplicateCheck
      );

      if (!result.success) {
        showToast.error('Erro', result.error || 'Nao foi possivel cadastrar o registro.');
        controller.setDuplicateModalVisible(true);
        return;
      }

      showToast.success('Registro Salvo!', 'Cadastro realizado mesmo com alerta de duplicidade.', 1500);
      controller.setDuplicateInfo(null);
      controller.setPendingRegistro(null);

      setTimeout(() => {
        controller.clearAllFields();
      }, 300);
    } catch (error) {
      console.error('Erro ao cadastrar mesmo assim:', error);
      showToast.error('Erro', 'Erro ao processar registro. Tente novamente.');
      controller.setDuplicateModalVisible(true);
    } finally {
      controller.setLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <View style={styles.container}>
        <AppHeader />
        <View style={styles.scrollContent}>
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Skeleton width={200} height={28} borderRadius={4} style={{ marginBottom: 8 }} />
              <Skeleton width={'80%'} height={16} borderRadius={4} />
            </View>
            <View style={styles.cardBody}>
              <View style={styles.field}>
                <Skeleton width={150} height={14} borderRadius={4} style={{ marginBottom: 8 }} />
                <Skeleton width={'100%'} height={52} borderRadius={8} />
              </View>
              <View style={styles.field}>
                <Skeleton width={130} height={14} borderRadius={4} style={{ marginBottom: 8 }} />
                <Skeleton width={'100%'} height={52} borderRadius={8} />
              </View>
              <View style={styles.field}>
                <Skeleton width={180} height={14} borderRadius={4} style={{ marginBottom: 8 }} />
                <Skeleton width={'100%'} height={52} borderRadius={8} />
              </View>

              <Skeleton width={220} height={52} borderRadius={8} style={styles.submitButton} />
            </View>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <AppHeader
        onEditRegistrosPress={handleEditRegistros}
        onOrganistasEnsaioPress={handleOrganistasEnsaio}
      />
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
        enabled={Platform.OS === 'ios'}
      >
        <RefreshableScrollView
          refreshing={refreshing}
          onRefresh={onRefresh}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          collapsable={false}
          nestedScrollEnabled={true}
          showsVerticalScrollIndicator={true}
          scrollEnabled={true}
          // 🚨 CRÃTICO: Habilitar bounces para permitir pull-to-refresh no mobile
          bounces={Platform.OS !== 'web'}
          alwaysBounceVertical={Platform.OS === 'ios'}
          // 🚨 CRÃTICO: Garantir que o scroll funcione corretamente no mobile
          scrollEventThrottle={16}
          removeClippedSubviews={false}
          // 🚨 CRÃTICO: Permitir scroll mesmo quando há elementos com z-index alto
          overScrollMode={Platform.OS === 'android' ? 'always' : undefined}
          // 🚨 CRÃTICO: Garantir que o conteúdo possa ser puxado para cima (pull-to-refresh)
          contentInsetAdjustmentBehavior={Platform.OS === 'ios' ? 'automatic' : undefined}
          automaticallyAdjustContentInsets={false}
          // 🚨 CRÃTICO: Permitir que o scroll comece do topo
          contentOffset={Platform.OS !== 'web' ? { x: 0, y: 0 } : undefined}
          style={
            Platform.OS === 'web'
              ? {
                position: 'relative' as const,
                overflow: 'visible' as const,
                zIndex: 1,
                // @ts-ignore
                WebkitOverflowScrolling: 'touch',
                // @ts-ignore - Permitir que dropdowns apareçam acima (propriedade CSS apenas para web)
                overflowY: 'auto',
              }
              : {
                flex: 1,
                backgroundColor: theme.colors.background,
              }
          }
        >
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={[styles.cardTitle, Platform.OS === 'web' && isMobile && { fontSize: theme.fontSize.lg }]}>Registro de Participante</Text>
              <Text style={styles.cardSubtitle}>
                Preencha os campos abaixo para registrar a presença
              </Text>
            </View>
            <View style={[styles.cardBody, Platform.OS === 'web' && isMobile && { padding: theme.spacing.md }]}>
              <View
                style={
                  Platform.OS === 'web'
                    ? {
                      position: 'relative' as const,
                      zIndex: 999999,
                      overflow: 'visible' as const,
                      // @ts-ignore
                      isolation: 'isolate',
                    }
                    : {}
                }
              >
                <Text style={styles.label}>COMUM CONGREGAÇÃO *</Text>
                <AutocompleteField
                  ref={comumFieldRef}
                  label=""
                  value={isComumManual ? undefined : selectedComum}
                  options={comunsOptions}
                  onSelect={option => {
                    setSelectedComum(String(option.value));
                    setSelectedPessoa('');
                    setIsNomeManual(false);
                    setIsComumManual(false);
                    setCidadeManual('');
                    
                    // 🚀 SEQUENCIAL: Focar no Cargo após selecionar Comum
                    setTimeout(() => {
                      if (cargoFieldRef.current) {
                        cargoFieldRef.current.focus();
                      }
                    }, 100);
                  }}
                  placeholder={isComumManual ? `"${selectedComum.replace(/^manual_/, '')}" (manual)` : 'Selecione a comum...'}
                  allowManualEntry={true}
                  onManualEntry={text => {
                    const manualValue = `manual_${text}`;
                    setSelectedComum(manualValue);
                    setIsComumManual(true);
                    setSelectedPessoa('');
                  }}
                  autoManualEntry={true}
                  onChangeText={text => {
                    if (isComumManual) {
                      const queryNorm = text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
                      const queryWords = queryNorm.split(/\s+/).filter(w => w.length > 2 || !['de', 'da', 'do', 'dos', 'das', 'no', 'na'].includes(w));
                      const hasMatches = comunsOptions.some(opt => {
                        const labelNorm = opt.label.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
                        // @ts-ignore
                        const nomeNorm = opt.nomeCompleto ? opt.nomeCompleto.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim() : '';
                        // @ts-ignore
                        const cidadeNorm = opt.cidade ? opt.cidade.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim() : '';
                        const combined = `${labelNorm} ${nomeNorm} ${cidadeNorm}`;
                        if (queryWords.length === 0) return combined.includes(queryNorm);
                        return queryWords.every(word => combined.includes(word));
                      });
                      if (hasMatches || text.trim() === '') {
                        setIsComumManual(false);
                      }
                    }
                    if (isComumManual || !comunsOptions.some(opt => opt.label.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim() === text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim())) {
                      setSelectedComum(`manual_${text}`);
                    }
                  }}
                />

                {/* Campo CIDADE - aparece quando comum é manual */}
                {isComumManual && (
                  <View style={{ marginTop: 8, marginBottom: 12 }}>
                    <View style={styles.manualBadge}>
                      <Text style={styles.manualBadgeText}>✏️ Comum manual: "{selectedComum.replace(/^manual_/, '')}"</Text>
                      <TouchableOpacity
                        onPress={() => {
                          setIsComumManual(false);
                          setSelectedComum('');
                          setCidadeManual('');
                        }}
                        activeOpacity={0.7}
                      >
                        <Text style={{ color: '#ef4444', fontSize: 13, fontWeight: '700' }}>✕ Limpar</Text>
                      </TouchableOpacity>
                    </View>
                    <Text style={styles.label}>CIDADE *</Text>
                    <TextInput
                      style={styles.cityInput}
                      value={cidadeManual}
                      onChangeText={setCidadeManual}
                      placeholder="Digite a cidade..."
                      placeholderTextColor={theme.colors.textSecondary}
                      returnKeyType="done"
                    />
                  </View>
                )}
              </View>

              <View
                style={[
                  styles.field,
                  Platform.OS === 'web'
                    ? { position: 'relative' as const, zIndex: 1002, overflow: 'visible' as const }
                    : {},
                ]}
              >
                <Text style={styles.label}>CARGO/MINISTÉRIO *</Text>
                {Platform.OS === 'web' ? (
                  <select
                    ref={cargoFieldRef}
                    style={
                      {
                        ...styles.selectWeb,
                        appearance: 'none',
                        WebkitAppearance: 'none',
                        MozAppearance: 'none',
                        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 10 10'%3E%3Cpath fill='%23999' d='M5 7L1 3h8z'/%3E%3C/svg%3E")`,
                        backgroundRepeat: 'no-repeat',
                        backgroundPosition: 'right center',
                        backgroundSize: '10px 10px',
                        paddingRight: '35px',
                      } as any
                    }
                    value={selectedCargo}
                    onChange={e => {
                      setSelectedCargo(e.target.value);
                      setSelectedInstrumento('');
                      setSelectedPessoa('');
                      setSelectedClasseOrganista('');
                      setIsNomeManual(false);

                      // 🚀 SEQUENCIAL: No Web, focar no Nome após selecionar Cargo
                      if (e.target.value) {
                        setTimeout(() => {
                          if (nomeFieldRef.current) {
                            nomeFieldRef.current.focus();
                          }
                        }, 100);
                      }
                    }}
                    required
                  >
                    <option value="">Selecione o cargo...</option>
                    {cargosOptions.map(cargo => (
                      <option key={cargo.id} value={cargo.value}>
                        {cargo.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <SimpleSelectField
                    ref={cargoFieldRef}
                    label=""
                    value={selectedCargo}
                    options={cargosOptions}
                    onSelect={option => {
                      setSelectedCargo(String(option.value));
                      setSelectedInstrumento('');
                      setSelectedPessoa('');
                      setSelectedClasseOrganista('');
                      setIsNomeManual(false);

                      // 🚀 SEQUENCIAL: No Mobile, focar no Nome após selecionar Cargo
                      setTimeout(() => {
                        if (nomeFieldRef.current) {
                          nomeFieldRef.current.focus();
                        }
                      }, 100);
                    }}
                    placeholder="Selecione o cargo..."
                  />
                )}
              </View>
              <View
                style={
                  Platform.OS === 'web'
                    ? {
                      position: 'relative' as const,
                      zIndex: 1,
                      overflow: 'visible' as const,
                      // @ts-ignore
                      isolation: 'isolate',
                    }
                    : {}
                }
              >
                <NameSelectField
                  ref={nomeFieldRef}
                  key={nameFieldKey} // Key para forçar remontagem quando limpar
                  label="Nome e Sobrenome *"
                  value={selectedPessoa}
                  options={pessoasOptions}
                  onSelect={(option: any) => {
                    if (option.id === 'manual') {
                      if (loadingPessoas) {
                        return;
                      }

                      if (!option.value || option.value === '' || !option.value.trim()) {
                        setSelectedPessoa('');
                        setIsNomeManual(false);
                        return;
                      }

                      setSelectedPessoa(option.value.trim());
                      setIsNomeManual(true);
                      // Ao ser manual, o campo de instrumento aparecerá (via useRegisterController)
                      setSelectedInstrumento(''); 
                    } else {
                      if (!option.value || option.value === '' || !option.id || option.id === '') {
                        setSelectedPessoa('');
                        setIsNomeManual(false);
                        return;
                      }
                      
                      const pessoaId = option.value || option.id;
                      setSelectedPessoa(pessoaId);
                      setIsNomeManual(false);

                      // 🚨 NOVO FLUXO: Capturar cargo, instrumento e classe automaticamente dos dados da pessoa
                      if (option.data) {
                        const p = option.data;
                        
                        // 1. Definir instrumento automaticamente
                        if (p.instrumento_id) {
                          setSelectedInstrumento(p.instrumento_id);
                        }
                        
                        // 2. Definir classe automaticamente
                        if (p.classe_organista || p.nivel) {
                          const classe = p.classe_organista || p.nivel;
                          setSelectedClasseOrganista(classe);
                        }
                      }
                    }
                  }}
                  placeholder="Selecione o nome..."
                  loading={loadingPessoas}
                  onSubmit={handleSubmit}
                />
              </View>

              {/* CLASSE DA ORGANISTA (Condicional: Somente para Cargo Organista) */}
              {showClasseOrganista && (
                <View
                  style={[
                    styles.field,
                    Platform.OS === 'web'
                      ? {
                        position: 'relative' as const,
                        zIndex: 100, // Z-index menor que o do nome para o dropdown do nome sobrepor este campo
                        overflow: 'visible' as const,
                        // @ts-ignore
                        isolation: 'isolate',
                        marginTop: theme.spacing.md,
                        marginBottom: theme.spacing.md,
                      }
                      : {
                        marginTop: theme.spacing.md,
                      },
                  ]}
                >
                  <Text style={styles.label}>CLASSE DA ORGANISTA *</Text>
                  {Platform.OS === 'web' ? (
                    <select
                      style={
                        {
                          ...styles.selectWeb,
                          appearance: 'none',
                          WebkitAppearance: 'none',
                          MozAppearance: 'none',
                          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 10 10'%3E%3Cpath fill='%23999' d='M5 7L1 3h8z'/%3E%3C/svg%3E")`,
                          backgroundRepeat: 'no-repeat',
                          backgroundPosition: 'right center',
                          backgroundSize: '10px 10px',
                          paddingRight: '35px',
                          borderWidth: 1,
                          borderColor: '#3b82f6',
                          backgroundColor: '#eff6ff',
                        } as any
                      }
                      value={selectedClasseOrganista}
                      onChange={e => setSelectedClasseOrganista(e.target.value)}
                      required
                    >
                      <option value="">Selecione a classe...</option>
                      {ORGANISTA_CLASSES.map(cls => (
                        <option key={cls.value} value={cls.value}>
                          {cls.label}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <SimpleSelectField
                      label=""
                      value={selectedClasseOrganista}
                      options={ORGANISTA_CLASSES}
                      onSelect={option => setSelectedClasseOrganista(String(option.value))}
                      placeholder="Selecione a classe..."
                      style={{
                        borderWidth: 1,
                        borderColor: '#3b82f6',
                        backgroundColor: '#eff6ff',
                        borderRadius: theme.borderRadius.md,
                      }}
                    />
                  )}
                </View>
              )}

              {showInstrumento && (
                <View
                  style={[
                    styles.field,
                    Platform.OS === 'web'
                      ? {
                        position: 'relative' as const,
                        zIndex: 100, // Z-index menor que o do nome para o dropdown do nome sobrepor este campo
                        overflow: 'visible' as const,
                        // @ts-ignore
                        isolation: 'isolate',
                        marginTop: theme.spacing.md,
                        marginBottom: theme.spacing.md,
                      }
                      : {
                        marginTop: theme.spacing.md,
                      },
                  ]}
                >
                  <Text style={styles.label}>INSTRUMENTO (APENAS PARA CARGOS MUSICAIS) *</Text>
                  {Platform.OS === 'web' ? (
                    <select
                      style={
                        {
                          ...styles.selectWeb,
                          appearance: 'none',
                          WebkitAppearance: 'none',
                          MozAppearance: 'none',
                          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 10 10'%3E%3Cpath fill='%23999' d='M5 7L1 3h8z'/%3E%3C/svg%3E")`,
                          backgroundRepeat: 'no-repeat',
                          backgroundPosition: 'right center',
                          backgroundSize: '10px 10px',
                          paddingRight: '35px',
                        } as any
                      }
                      value={selectedInstrumento}
                      onChange={e => setSelectedInstrumento(e.target.value)}
                      required
                    >
                      <option value="">Selecione o instrumento...</option>
                      {instrumentosOptions.map(inst => (
                        <option key={inst.id} value={inst.value}>
                          {inst.label}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <SimpleSelectField
                      label=""
                      value={selectedInstrumento}
                      options={instrumentosOptions}
                      onSelect={(option: any) => {
                        setSelectedInstrumento(String(option.value));
                      }}
                      placeholder="Selecione o instrumento..."
                    />
                  )}
                </View>
              )}

              <Text style={styles.hint}>
                Selecione um nome da lista após preencher Comum e Cargo.
              </Text>

              <PrimaryButton
                title="ENVIAR REGISTRO"
                onPress={async () => {
                  console.log('🔘 [BUTTON] Botão ENVIAR REGISTRO pressionado');
                  console.log('📊 [BUTTON] Estado atual:', {
                    loading,
                    selectedComum: !!selectedComum,
                    selectedCargo: !!selectedCargo,
                    selectedPessoa: !!selectedPessoa,
                    isOnline,
                    newRegistrationModalVisible,
                  });

                  // 🚨 CORREÇÃƒO: Não fechar modal automaticamente - usuário pode estar usando o modal

                  try {
                    await handleSubmit();
                  } catch (error) {
                    console.error('âŒ [BUTTON] Erro não tratado no handleSubmit:', error);
                    setLoading(false);
                    showToast.error('Erro', 'Erro ao processar registro. Tente novamente.');
                  }
                }}
                loading={loading}
                disabled={loading}
                style={styles.submitButton}
              />
            </View>
          </View>

          <View style={styles.footer}>
            <OfflineBadge count={pendingCount} syncing={syncing} />
          </View>
        </RefreshableScrollView>
      </KeyboardAvoidingView>

      {/* Modal de Duplicata */}
      {duplicateInfo && (
        <DuplicateModal
          visible={duplicateModalVisible}
          nome={duplicateInfo.nome}
          comum={duplicateInfo.comum}
          detalhe={duplicateInfo.detalhe}
          data={duplicateInfo.data}
          horario={duplicateInfo.horario}
          onCancel={() => {
            if (pendingRegistro) {
              supabaseDataService.deleteRegistrosDuplicadosFromLocal(pendingRegistro).catch(error => {
                console.warn('Erro ao limpar duplicata pendente:', error);
              });
            }
            setDuplicateModalVisible(false);
            setDuplicateInfo(null);
            setPendingRegistro(null);
            // Limpar formulário
            setSelectedComum('');
            setSelectedCargo('');
            setSelectedInstrumento('');
            setSelectedPessoa('');
            setSelectedClasseOrganista('');
            setIsNomeManual(false);
            setIsComumManual(false);
            setCidadeManual('');
          }}
          onConfirm={duplicateInfo.isForaRegional ? handleConfirmDuplicate : undefined}
          confirmLabel="Cadastrar mesmo assim"
        />
      )}

      {/* Modal de Novo Registro (para visitas de outras cidades) */}
      {/* 🚨 CORREÇÃƒO: Permitir modal funcionar offline - handleSaveNewRegistration já salva na fila quando offline */}
      {newRegistrationModalVisible && (
        <NewRegistrationModal
          visible={newRegistrationModalVisible}
          cargos={cargos}
          instrumentos={instrumentos}
          onClose={() => {
            console.log('🚨 [RegisterScreen] Fechando modal manualmente via onClose');
            setNewRegistrationModalVisible(false);
          }}
          onSave={handleSaveNewRegistration}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    ...(Platform.OS !== 'web'
      ? {
        height: '100%',
      }
      : {}),
  },
  keyboardView: {
    flex: 1,
    ...(Platform.OS !== 'web'
      ? {
        height: '100%',
      }
      : {}),
  },
  scrollContent: {
    flexGrow: 1,
    ...(Platform.OS === 'web'
      ? {
        padding: theme.spacing.lg,
        paddingBottom: theme.spacing.xl * 2,
        overflow: 'visible' as const,
        minHeight: '100%',
        // @ts-ignore
        position: 'relative' as const,
      }
      : {
        // 🚨 CRÃTICO: Para mobile, NÃƒO usar padding no contentContainerStyle
        // Isso permite que o pull-to-refresh funcione corretamente
        // O padding será aplicado no card em vez disso
        paddingHorizontal: theme.spacing.md,
        paddingTop: 0, // CRÃTICO: Sem paddingTop para permitir pull-to-refresh
        paddingBottom: theme.spacing.xl * 2,
        minHeight: '100%',
        overflow: 'visible' as const,
      }),
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
    // 🚨 CRÃTICO: Adicionar marginTop e paddingTop no mobile para compensar remoção do paddingTop do scrollContent
    // Isso permite que o pull-to-refresh funcione corretamente
    ...(Platform.OS !== 'web'
      ? {
        marginTop: theme.spacing.lg,
        paddingTop: theme.spacing.md,
      }
      : {}),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: Platform.OS === 'web' ? 0.1 : 0.15,
    shadowRadius: Platform.OS === 'web' ? 4 : 6,
    elevation: Platform.OS === 'web' ? 3 : 4,
    ...(Platform.OS === 'web'
      ? {
        position: 'relative' as const,
        zIndex: 1,
        overflow: 'visible' as const,
      }
      : {
        marginHorizontal: theme.spacing.xs, // Margem horizontal no mobile
        overflow: 'visible' as const,
      }),
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
    ...(Platform.OS === 'web'
      ? {
        overflow: 'visible' as const,
        position: 'relative' as const,
        zIndex: 1,
      }
      : {
        overflow: 'visible' as const,
        padding: theme.spacing.md, // Menos padding no mobile nativo
      }),
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
    ...(Platform.OS !== 'web'
      ? {
        width: '100%', // Botão full width no mobile
        maxWidth: 400, // Mas com limite máximo
        paddingVertical: theme.spacing.md, // Mais padding vertical no mobile
        minHeight: 50, // Altura mínima maior no mobile para melhor toque
      }
      : {}),
  },
  footer: {
    alignItems: 'center',
    marginTop: theme.spacing.lg,
    ...(Platform.OS === 'web'
      ? {
        position: 'relative' as const,
        zIndex: 0,
        // @ts-ignore
        isolation: 'isolate',
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
      }
      : {}),
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
  field: {
    marginBottom: theme.spacing.md,
  },
  label: {
    fontSize: theme.fontSize.sm,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  selectWeb: {
    width: '100%',
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.surface,
    paddingTop: theme.spacing.sm,
    paddingBottom: theme.spacing.sm,
    paddingLeft: theme.spacing.md,
    paddingRight: '35px',
    fontSize: theme.fontSize.md,
    color: theme.colors.text,
    minHeight: 48,
    // @ts-ignore - Propriedades CSS apenas para web
    outlineStyle: 'none',
    outlineWidth: 0,
    cursor: 'pointer',
  } as any,
  cityInput: {
    borderWidth: 1,
    borderColor: '#22c55e',
    borderRadius: theme.borderRadius.md,
    backgroundColor: '#f0fdf4',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    fontSize: theme.fontSize.md,
    color: theme.colors.text,
    minHeight: 48,
    marginBottom: theme.spacing.sm,
  },
  manualBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fefce8',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#fde047',
  },
  manualBadgeText: {
    fontSize: 12,
    color: '#854d0e',
    fontWeight: '500',
    flex: 1,
    marginRight: 8,
  },
});

