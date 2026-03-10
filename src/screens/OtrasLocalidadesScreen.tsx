import React, { useRef, useState } from 'react';
import {
    View,
    Text,
    TextInput,
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
import { Cargo } from '../types/models';

const FIXED_CARGOS = [
    'Músico',
    'Organista',
    'Instrutor',
    'Instrutora',
    'Examinadora',
    'Encarregado Local',
    'Encarregado Regional',
    'Secretário da Música',
    'Secretária da Música',
    'Irmandade',
    'Ancião',
    'Diácono',
    'Cooperador do Ofício',
    'Cooperador de Jovens',
    'Porteiro (a)',
    'Bombeiro (a)',
    'Médico (a)',
    'Enfermeiro (a)',
];

const ORGANISTA_CLASSES = [
    { id: 'Ensaio', label: 'Ensaio', value: 'Ensaio' },
    { id: 'Meia-Hora', label: 'Meia-Hora', value: 'Meia-Hora' },
    { id: 'RDJM', label: 'RDJM', value: 'RDJM' },
    { id: 'Culto a Noite', label: 'Culto a Noite', value: 'Culto a Noite' },
    { id: 'Oficializada', label: 'Oficializada', value: 'Oficializada' },
];

export const OtrasLocalidadesScreen: React.FC = () => {
    const navigation = useNavigation();
    const controller = useRegisterController({ isForaRegional: true });
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
        instrumentosOptions,
        pessoas,
        pessoasOptions,
        cidadeManual,
        setCidadeManual,
        selectedClasseOrganista,
        setSelectedClasseOrganista,
        showClasseOrganista,
    } = controller;

    const comumFieldRef = useRef<AutocompleteFieldRef>(null);

    const { width } = useWindowDimensions();
    const isMobile = width <= 768;

    // Memoize options to avoid mapping every render
    const visistaCargosOptions = React.useMemo(() => {
        return FIXED_CARGOS.map(nome => {
            // Tentar achar o ID real do cargo no banco de dados local
            const cargoReal = (cargos as Cargo[]).find(c =>
                c.nome.trim().toUpperCase() === nome.trim().toUpperCase()
            );
            return {
                id: cargoReal ? cargoReal.id : `manual_${nome}`,
                label: nome,
                value: cargoReal ? cargoReal.id : `manual_${nome}`,
            };
        });
    }, [cargos]);

    // Função para normalizar texto (removes accents, lowercase)
    const normalize = (text: string) => {
        if (!text) return '';
        return text
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .trim();
    };

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
                                            zIndex: 100,
                                            overflow: 'visible' as const,
                                        }
                                        : {}
                                }
                            >
                                <AutocompleteField
                                    ref={comumFieldRef}
                                    label="COMUM CONGREGAÇÃO *"
                                    value={controller.isComumManual ? undefined : selectedComum}
                                    options={comunsOptions}
                                    onSelect={option => {
                                        setSelectedComum(String(option.value));
                                        setSelectedPessoa('');
                                        setIsNomeManual(false);
                                        controller.setIsComumManual(false);
                                        setCidadeManual('');
                                    }}
                                    placeholder={controller.isComumManual ? `"${selectedComum}" (manual)` : 'Selecione a comum...'}
                                    allowManualEntry={true}
                                    onManualEntry={(text) => {
                                        const manualValue = `manual_${text}`;
                                        setSelectedComum(manualValue);
                                        controller.setIsComumManual(true);
                                        setSelectedPessoa('');
                                    }}
                                    autoManualEntry={true}
                                    onChangeText={(text) => {
                                        if (controller.isComumManual) {
                                            const query = normalize(text);
                                            const hasMatches = comunsOptions.some(opt => {
                                                const labelNorm = normalize(opt.label);
                                                // @ts-ignore
                                                const nomeNorm = opt.nomeCompleto ? normalize(opt.nomeCompleto) : '';
                                                return labelNorm.includes(query) || nomeNorm.includes(query);
                                            });
                                            if (hasMatches || text.trim() === '') {
                                                controller.setIsComumManual(false);
                                            }
                                        }
                                        // Se estamos em modo manual, atualizar o selectedComum para o que está sendo digitado
                                        if (controller.isComumManual || !comunsOptions.some(opt => normalize(opt.label) === normalize(text))) {
                                            setSelectedComum(`manual_${text}`);
                                        }
                                    }}
                                />

                                {/* Campo CIDADE - aparece quando comum é manual */}
                                {controller.isComumManual && (
                                    <View style={{ marginTop: -8, marginBottom: 12 }}>
                                        <View style={styles.manualBadge}>
                                            <Text style={styles.manualBadgeText}>✏️ Comum manual: "{selectedComum.replace(/^manual_/, '')}"</Text>
                                            <TouchableOpacity
                                                onPress={() => {
                                                    controller.setIsComumManual(false);
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

                            {/* CARGO/MINISTÉRIO */}
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
                                            const val = e.target.value;
                                            setSelectedCargo(val);
                                            setSelectedInstrumento('');
                                            setSelectedPessoa('');
                                            setSelectedClasseOrganista('');
                                            setIsNomeManual(false);
                                        }}
                                        required
                                    >
                                        <option value="">Selecione o cargo...</option>
                                        {visistaCargosOptions.map(cargo => (
                                            <option key={cargo.id} value={cargo.value}>
                                                {cargo.label}
                                            </option>
                                        ))}
                                    </select>
                                ) : (
                                    <SimpleSelectField
                                        label=""
                                        value={selectedCargo}
                                        options={visistaCargosOptions}
                                        onSelect={option => {
                                            const val = String(option.value);
                                            setSelectedCargo(val);
                                            setSelectedInstrumento('');
                                            setSelectedPessoa('');
                                            setSelectedClasseOrganista('');
                                            setIsNomeManual(false);
                                        }}
                                        placeholder="Selecione o cargo..."
                                    />
                                )}
                            </View>

                            {/* CLASSE DA ORGANISTA (Condicional: Somente para Cargo Organista) */}
                            {showClasseOrganista && (
                                <View
                                    style={[
                                        styles.field,
                                        Platform.OS === 'web'
                                            ? { position: 'relative' as const, zIndex: 85, overflow: 'visible' as const }
                                            : {},
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

                            {/* INSTRUMENTO */}
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

                            {/* NOME */}
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
                                            const pessoaId = option.value || option.id;
                                            setSelectedPessoa(pessoaId);
                                            setIsNomeManual(false);

                                            // Preencher automaticamente a classe se a pessoa selecionada já tiver uma
                                            if (isOrganista) {
                                                const pessoaSelecionada = (pessoas as any[]).find(p => p.id === pessoaId);
                                                if (pessoaSelecionada && pessoaSelecionada.classe_organista) {
                                                    setSelectedClasseOrganista(pessoaSelecionada.classe_organista);
                                                }
                                            }
                                        }
                                    }}
                                    placeholder="Selecione o nome..."
                                    loading={loadingPessoas}
                                />
                            </View>

                            <Text style={styles.hint}>
                                Selecione na lista ou digite o nome completo se não encontrar.
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
