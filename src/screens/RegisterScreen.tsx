import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
  useWindowDimensions,
} from 'react-native';
import { SimpleSelectField } from '../components/SimpleSelectField';
import { AutocompleteField } from '../components/AutocompleteField';
import { NameSelectField } from '../components/NameSelectField';
import { PrimaryButton } from '../components/PrimaryButton';
import { OfflineBadge } from '../components/OfflineBadge';
import { AppHeader } from '../components/AppHeader';
import { DuplicateModal } from '../components/DuplicateModal';
import { NewRegistrationModal } from '../components/NewRegistrationModal';
import { Skeleton } from '../components/Skeleton';
import { theme } from '../theme';
import { useRegisterController } from '../hooks/useRegisterController';
import { offlineSyncService } from '../services/offlineSyncService';
import { showToast } from '../utils/toast';

export const RegisterScreen: React.FC = () => {
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
    handleHardReset,
    handleSaveNewRegistration,
  } = controller;

  const { width } = useWindowDimensions();
  const isMobile = width <= 768;

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
        onRefresh={onRefresh}
        onHardReset={handleHardReset}
      />
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
        enabled={Platform.OS === 'ios'}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          collapsable={false}
          nestedScrollEnabled={true}
          showsVerticalScrollIndicator={true}
          scrollEnabled={true}
          // 🚨 CRÍTICO: Habilitar bounces para permitir pull-to-refresh no mobile
          bounces={Platform.OS !== 'web'}
          alwaysBounceVertical={Platform.OS === 'ios'}
          // 🚨 CRÍTICO: Garantir que o scroll funcione corretamente no mobile
          scrollEventThrottle={16}
          removeClippedSubviews={false}
          // 🚨 CRÍTICO: Permitir scroll mesmo quando há elementos com z-index alto
          overScrollMode={Platform.OS === 'android' ? 'always' : undefined}
          // 🚨 CRÍTICO: Garantir que o conteúdo possa ser puxado para cima (pull-to-refresh)
          contentInsetAdjustmentBehavior={Platform.OS === 'ios' ? 'automatic' : undefined}
          automaticallyAdjustContentInsets={false}
          // 🚨 CRÍTICO: Permitir que o scroll comece do topo
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
          refreshControl={
            Platform.OS !== 'web' ? (
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                // 🚨 CRÍTICO: Cores específicas para cada plataforma
                colors={Platform.OS === 'android' ? [theme.colors.primary] : undefined}
                tintColor={Platform.OS === 'ios' ? theme.colors.primary : undefined}
                // 🚨 CRÍTICO: Android precisa de offset para não sobrepor o header
                progressViewOffset={Platform.OS === 'android' ? 0 : 0}
                // 🚨 CRÍTICO: Título apenas no Android (iOS não mostra)
                title={Platform.OS === 'android' ? 'Puxe para atualizar' : undefined}
                titleColor={Platform.OS === 'android' ? theme.colors.textSecondary : undefined}
                progressBackgroundColor={
                  Platform.OS === 'android' ? theme.colors.surface : undefined
                }
                enabled={true}
                // 🚨 CRÍTICO: Android precisa de size default
                size={Platform.OS === 'android' ? 0 : undefined} // 0 is default
              />
            ) : undefined
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
                      zIndex: 100,
                      overflow: 'visible' as const,
                      backgroundColor: theme.colors.surface,
                    }
                    : {}
                }
              >
                <AutocompleteField
                  ref={comumFieldRef}
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
                {/* 🚨 CORREÇÃO: Permitir botão "+ Novo registro" funcionar offline - modal salva na fila automaticamente */}
                <TouchableOpacity
                  onPress={e => {
                    e.preventDefault?.();
                    e.stopPropagation?.();
                    console.log('🔘 [RegisterScreen] Botão "+ Novo registro" clicado');
                    console.log('🔘 [RegisterScreen] isOnline:', isOnline);
                    console.log('🔘 [RegisterScreen] Abrindo modal...');
                    setNewRegistrationModalVisible(true);
                    console.log(
                      '✅ [RegisterScreen] Modal aberto - newRegistrationModalVisible = true'
                    );
                  }}
                  style={styles.newRegistrationLink}
                  activeOpacity={0.7}
                >
                  <Text style={styles.newRegistrationLinkText}>+ Novo registro</Text>
                </TouchableOpacity>
              </View>

              <View
                style={[
                  styles.field,
                  Platform.OS === 'web'
                    ? { position: 'relative' as const, zIndex: 90, overflow: 'visible' as const }
                    : {},
                ]}
              >
                <Text style={styles.label}>CARGO/MINISTÉRIO *</Text>
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
                    value={selectedCargo}
                    onChange={e => {
                      setSelectedCargo(e.target.value);
                      setSelectedInstrumento('');
                      setSelectedPessoa('');
                      setIsNomeManual(false);
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
                    label=""
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
                )}
              </View>

              {showInstrumento && (
                <View
                  style={[
                    styles.field,
                    Platform.OS === 'web'
                      ? {
                        position: 'relative' as const,
                        zIndex: 80,
                        overflow: 'visible' as const,
                      }
                      : {},
                  ]}
                >
                  <Text style={styles.label}>INSTRUMENTO (APENAS PARA CARGOS MUSICAIS) *</Text>
                  <SimpleSelectField
                    label=""
                    value={selectedInstrumento}
                    options={instrumentosOptions}
                    onSelect={(option: any) => {
                      setSelectedInstrumento(String(option.value));
                      setSelectedPessoa('');
                      setIsNomeManual(false);
                    }}
                    placeholder="Selecione o instrumento..."
                  />
                </View>
              )}

              <View
                style={
                  Platform.OS === 'web'
                    ? {
                      position: 'relative' as const,
                      zIndex: 70,
                      overflow: 'visible' as const,
                    }
                    : {}
                }
              >
                <NameSelectField
                  key={nameFieldKey} // Key para forçar remontagem quando limpar
                  label="Nome e Sobrenome *"
                  value={selectedPessoa}
                  options={pessoasOptions}
                  onSelect={option => {
                    console.log('👤 [RegisterScreen] Nome selecionado:', JSON.stringify(option));

                    // 🚨 CORREÇÃO CRÍTICA: Se o id é 'manual', tratar como entrada manual
                    if (option.id === 'manual') {
                      // Se o valor está totalmente vazio, LIMPAR o estado (usuário apagou o campo)
                      if (!option.label || option.label.trim() === '') {
                        console.log('🧹 [RegisterScreen] Campo limpo - resetando estado');
                        setSelectedPessoa('');
                        setIsNomeManual(false);
                        return;
                      }

                      // Se há texto digitado, tratar como nome manual
                      const novoValor = option.label.trim();
                      console.log('✏️ [RegisterScreen] DEFININDO NOME MANUAL:', novoValor);
                      setSelectedPessoa(novoValor);
                      setIsNomeManual(true);
                    } else {
                      // Seleção de um item da lista (ou valor vazio vindo da busca)

                      // 🚨 CORREÇÃO: Se o valor/id está vazio, NÃO limpar automaticamente o estado
                      // O NameSelectField envia id: '' enquanto o usuário está digitando/buscando
                      if (!option.value && !option.id) {
                        // Se o label também virou vazio, aí sim limpamos
                        if (!option.label || option.label.trim() === '') {
                          console.log('🧹 [RegisterScreen] Limpando selectedPessoa (campo vazio)');
                          setSelectedPessoa('');
                          setIsNomeManual(false);
                        }
                        // Caso contrário, APENAS IGNORAR - o usuário ainda está digitando ou a lista está carregando
                        return;
                      }

                      // 🚨 CRÍTICO: Usar option.value (ID) ou option.id como fallback
                      const pessoaId = option.value || (option.id as string);
                      console.log('✅ [RegisterScreen] Definindo selectedPessoa (ID):', pessoaId);
                      setSelectedPessoa(pessoaId);
                      setIsNomeManual(false);
                    }
                  }}
                  placeholder="Selecione o nome..."
                  loading={loadingPessoas}
                  onSubmit={handleSubmit}
                />
              </View>

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

                  // 🚨 CORREÇÃO: Não fechar modal automaticamente - usuário pode estar usando o modal

                  try {
                    await handleSubmit();
                  } catch (error) {
                    console.error('❌ [BUTTON] Erro não tratado no handleSubmit:', error);
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
            // Limpar formulário
            setSelectedComum('');
            setSelectedCargo('');
            setSelectedInstrumento('');
            setSelectedPessoa('');
            setIsNomeManual(false);
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
                // Limpar formulário
                setSelectedComum('');
                setSelectedCargo('');
                setSelectedInstrumento('');
                setSelectedPessoa('');
                setIsNomeManual(false);
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
                  // Limpar formulário
                  setSelectedComum('');
                  setSelectedCargo('');
                  setSelectedInstrumento('');
                  setSelectedPessoa('');
                  setIsNomeManual(false);
                }
              }
            } catch (error) {
              showToast.error('Erro', 'Ocorreu um erro ao processar o registro duplicado');
              console.error('Erro ao criar registro duplicado:', error);
              // Limpar formulário
              setSelectedComum('');
              setSelectedCargo('');
              setSelectedInstrumento('');
              setSelectedPessoa('');
              setIsNomeManual(false);
            } finally {
              setLoading(false);
              setDuplicateInfo(null);
              setPendingRegistro(null);
            }
          }}
        />
      )}

      {/* Modal de Novo Registro (para visitas de outras cidades) */}
      {/* 🚨 CORREÇÃO: Permitir modal funcionar offline - handleSaveNewRegistration já salva na fila quando offline */}
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
        // 🚨 CRÍTICO: Para mobile, NÃO usar padding no contentContainerStyle
        // Isso permite que o pull-to-refresh funcione corretamente
        // O padding será aplicado no card em vez disso
        paddingHorizontal: theme.spacing.md,
        paddingTop: 0, // CRÍTICO: Sem paddingTop para permitir pull-to-refresh
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
    // 🚨 CRÍTICO: Adicionar marginTop e paddingTop no mobile para compensar remoção do paddingTop do scrollContent
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
});
