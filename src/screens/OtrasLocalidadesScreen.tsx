import React, { useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
    TouchableOpacity,
    useWindowDimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { AppHeader } from '../components/AppHeader';
import { SimpleSelectField } from '../components/SimpleSelectField';
import { AutocompleteField, AutocompleteFieldRef } from '../components/AutocompleteField';
import { NameSelectField } from '../components/NameSelectField';
import { PrimaryButton } from '../components/PrimaryButton';
import { OfflineBadge } from '../components/OfflineBadge';
import { DuplicateModal } from '../components/DuplicateModal';
import { Skeleton } from '../components/Skeleton';
import { theme } from '../theme';
import { useRegisterController } from '../hooks/useRegisterController';
import { offlineSyncService } from '../services/offlineSyncService';
import { showToast } from '../utils/toast';

export const OtrasLocalidadesScreen: React.FC = () => {
    const navigation = useNavigation();
    const controller = useRegisterController();
    const {
        isOnline,
        pendingCount,
        cargos,
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
        duplicateModalVisible,
        setDuplicateModalVisible,
        duplicateInfo,
        setDuplicateInfo,
        pendingRegistro,
        setPendingRegistro,
        isOrganista,
        isCandidato,
        showInstrumento,
        syncData,
        handleSubmit: originalHandleSubmit,
        comunsOptions,
        cargosOptions,
        instrumentosOptions,
        pessoasOptions,
    } = controller;

    const comumFieldRef = useRef<AutocompleteFieldRef>(null);
    const { width } = useWindowDimensions();
    const isMobile = width <= 768;

    // Após envio bem-sucedido, volta para a tela anterior
    const handleSubmit = async () => {
        try {
            await originalHandleSubmit();
            // Se chegou aqui sem erro, envio foi OK → voltar
            setTimeout(() => {
                navigation.goBack();
            }, 500);
        } catch (error) {
            console.error('❌ [OtrasLocalidades] Erro no handleSubmit:', error);
            showToast.error('Erro', 'Erro ao processar registro. Tente novamente.');
            setLoading(false);
        }
    };

    if (initialLoading) {
        return (
            <View style={styles.container}>
                <AppHeader onBackPress={() => navigation.goBack()} />
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
            {/* Header igual ao principal com botão de volta no lado direito */}
            <AppHeader onBackPress={() => navigation.goBack()} />

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
                    bounces={Platform.OS !== 'web'}
                    alwaysBounceVertical={Platform.OS === 'ios'}
                    scrollEventThrottle={16}
                    removeClippedSubviews={false}
                    style={
                        Platform.OS === 'web'
                            ? {
                                position: 'relative' as const,
                                overflow: 'visible' as const,
                                zIndex: 1,
                                // @ts-ignore
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
                            <Text style={[styles.cardTitle, Platform.OS === 'web' && isMobile && { fontSize: theme.fontSize.lg }]}>
                                Registro de Participante
                            </Text>
                            <Text style={styles.cardSubtitle}>
                                Preencha os campos abaixo para registrar a presença de visitantes de outras localidades
                            </Text>
                        </View>

                        <View style={[styles.cardBody, Platform.OS === 'web' && isMobile && { padding: theme.spacing.md }]}>

                            {/* COMUM CONGREGAÇÃO */}
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
                            </View>

                            {/* CARGO/MINISTÉRIO */}
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

                            {/* INSTRUMENTO */}
                            {showInstrumento && (
                                <View
                                    style={[
                                        styles.field,
                                        Platform.OS === 'web'
                                            ? {
                                                position: 'relative' as const,
                                                zIndex: 999999,
                                                overflow: 'visible' as const,
                                                // @ts-ignore
                                                isolation: 'isolate',
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

                            {/* NOME */}
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
                                    key={nameFieldKey}
                                    label="Nome e Sobrenome *"
                                    value={selectedPessoa}
                                    options={pessoasOptions}
                                    onSelect={(option: any) => {
                                        if (option.id === 'manual') {
                                            if (loadingPessoas) return;
                                            if (!option.value || option.value === '' || !option.value.trim()) {
                                                setSelectedPessoa('');
                                                setIsNomeManual(false);
                                                return;
                                            }
                                            setSelectedPessoa(option.value.trim());
                                            setIsNomeManual(true);
                                        } else {
                                            if (!option.value || option.value === '' || !option.id || option.id === '') {
                                                setSelectedPessoa('');
                                                setIsNomeManual(false);
                                                return;
                                            }
                                            setSelectedPessoa(option.value || option.id);
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
                                    try {
                                        await handleSubmit();
                                    } catch (error) {
                                        console.error('❌ [OtrasLocalidades] Erro:', error);
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
                            const registroForce = { ...pendingRegistro };
                            const resultForce = await (offlineSyncService as any).createRegistro(registroForce, true);
                            if (resultForce.success) {
                                if (isOnline && !syncing) {
                                    setTimeout(() => syncData(), 500);
                                }
                                showToast.success('Registro enviado!', 'Registro cadastrado com sucesso!');
                                setTimeout(() => navigation.goBack(), 600);
                            } else {
                                showToast.error('Erro', resultForce.error || 'Erro ao cadastrar registro');
                            }
                        } catch (error) {
                            showToast.error('Erro', 'Ocorreu um erro ao processar o registro duplicado');
                        } finally {
                            setLoading(false);
                            setDuplicateInfo(null);
                            setPendingRegistro(null);
                        }
                    }}
                />
            )}
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
                paddingHorizontal: theme.spacing.md,
                paddingTop: 0,
                paddingBottom: theme.spacing.xl * 2,
                minHeight: '100%',
                overflow: 'visible' as const,
            }),
    },
    card: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        marginBottom: theme.spacing.lg,
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
                marginHorizontal: theme.spacing.xs,
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
                padding: theme.spacing.md,
            }),
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
                width: '100%',
                maxWidth: 400,
                paddingVertical: theme.spacing.md,
                minHeight: 50,
            }
            : {}),
    },
    footer: {
        alignItems: 'center',
        marginTop: theme.spacing.lg,
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
        // @ts-ignore
        outlineStyle: 'none',
        outlineWidth: 0,
        cursor: 'pointer',
    } as any,
});
