import React, { useState, useEffect, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    TextInput,
    Platform,
    KeyboardAvoidingView,
    ActivityIndicator,
} from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { AppHeader } from '../components/AppHeader';
import { AutocompleteField } from '../components/AutocompleteField';
import { PrimaryButton } from '../components/PrimaryButton';
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

export const EditRecordDetailScreen: React.FC = () => {
    const navigation = useNavigation();
    const route = useRoute<EditRecordDetailRouteProp>();
    const { registro, localEnsaio } = route.params;

    const [cargos, setCargos] = useState<Cargo[]>([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    // Estados do formulário
    const [nome, setNome] = useState(registro.nome_completo || '');
    const [comum, setComum] = useState(registro.comum || '');
    const [cidade, setCidade] = useState(registro.cidade || '');
    const [cargoId, setCargoId] = useState('');
    const [instrumento, setInstrumento] = useState(registro.instrumento || '');
    const [naipe, setNaipe] = useState(registro.naipe_instrumento || '');
    const [classe, setClasse] = useState(registro.classe_organista || '');
    const [dataEnsaio, setDataEnsaio] = useState(registro.data_ensaio || '');
    const [anotacoes, setAnotacoes] = useState(registro.anotacoes || '');

    useEffect(() => {
        if (Platform.OS === 'web' && typeof document !== 'undefined') {
            document.title = 'CCB | Detalhes do Registro';
        }
        loadCargos();
    }, []);

    const loadCargos = async () => {
        try {
            setLoading(true);
            const cargosData = await supabaseDataService.getCargosFromLocal();
            setCargos(cargosData);

            // Encontrar o ID do cargo pelo nome
            const cargoEncontrado = cargosData.find(
                c => c.nome.toUpperCase() === (registro.cargo || '').toUpperCase()
            );
            if (cargoEncontrado) {
                setCargoId(cargoEncontrado.id);
            }
        } catch (error) {
            console.error('❌ Erro ao carregar cargos:', error);
        } finally {
            setLoading(false);
        }
    };

    const cargosOptions = useMemo(() => {
        return cargos.map(c => ({
            id: c.id,
            label: c.nome,
            value: c.id,
        }));
    }, [cargos]);

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
                data_ensaio: dataEnsaio || undefined,
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
                <AppHeader onBackPress={() => navigation.goBack()} />
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={theme.colors.primary} />
                    <Text style={styles.loadingText}>Carregando dados...</Text>
                </View>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <AppHeader onBackPress={() => navigation.goBack()} />
            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                <ScrollView
                    style={styles.scrollView}
                    contentContainerStyle={styles.scrollContent}
                    keyboardShouldPersistTaps="handled"
                >
                    <View style={styles.card}>
                        <View style={styles.cardHeader}>
                            <TouchableOpacity
                                style={styles.backButton}
                                onPress={() => navigation.goBack()}
                            >
                                <FontAwesome5 name="arrow-left" size={16} color={theme.colors.primary} />
                                <Text style={styles.backButtonText}>Voltar para Lista</Text>
                            </TouchableOpacity>
                            <Text style={styles.cardTitle}>Editar Registro</Text>
                            <Text style={styles.cardSubtitle}>
                                Local original: {registro.local_ensaio || localEnsaio}
                            </Text>
                        </View>

                        <View style={styles.cardBody}>
                            <View style={styles.formField}>
                                <Text style={styles.label}>NOME COMPLETO *</Text>
                                <TextInput
                                    style={styles.input}
                                    value={nome}
                                    onChangeText={setNome}
                                    placeholder="Nome completo"
                                    autoCapitalize="characters"
                                />
                            </View>

                            <View style={styles.formField}>
                                <Text style={styles.label}>COMUM *</Text>
                                <TextInput
                                    style={styles.input}
                                    value={comum}
                                    onChangeText={setComum}
                                    placeholder="Comum"
                                    autoCapitalize="characters"
                                />
                            </View>

                            <View style={styles.formField}>
                                <Text style={styles.label}>CIDADE</Text>
                                <TextInput
                                    style={styles.input}
                                    value={cidade}
                                    onChangeText={setCidade}
                                    placeholder="Cidade"
                                    autoCapitalize="characters"
                                />
                            </View>

                            <View style={[styles.formField, { zIndex: 100 }]}>
                                <Text style={styles.label}>CARGO/MINISTÉRIO *</Text>
                                <AutocompleteField
                                    value={cargoId}
                                    options={cargosOptions}
                                    onSelect={option => setCargoId(String(option.value))}
                                    placeholder="Selecione o cargo..."
                                    icon="user"
                                />
                            </View>

                            <View style={styles.formField}>
                                <Text style={styles.label}>INSTRUMENTO</Text>
                                <TextInput
                                    style={styles.input}
                                    value={instrumento}
                                    onChangeText={setInstrumento}
                                    placeholder="Instrumento"
                                    autoCapitalize="characters"
                                />
                            </View>

                            <View style={styles.formField}>
                                <Text style={styles.label}>NAIPE DO INSTRUMENTO</Text>
                                <TextInput
                                    style={styles.input}
                                    value={naipe}
                                    onChangeText={setNaipe}
                                    placeholder="Naipe"
                                    autoCapitalize="characters"
                                />
                            </View>

                            <View style={styles.formField}>
                                <Text style={styles.label}>CLASSE DA ORGANISTA</Text>
                                <TextInput
                                    style={styles.input}
                                    value={classe}
                                    onChangeText={setClasse}
                                    placeholder="Classe"
                                    autoCapitalize="characters"
                                />
                            </View>

                            <View style={styles.formField}>
                                <Text style={styles.label}>ANOTAÇÕES</Text>
                                <TextInput
                                    style={[styles.input, styles.textArea]}
                                    value={anotacoes}
                                    onChangeText={setAnotacoes}
                                    placeholder="Anotações extras..."
                                    multiline
                                    numberOfLines={3}
                                    autoCapitalize="characters"
                                />
                            </View>

                            <View style={styles.buttonContainer}>
                                <PrimaryButton
                                    title="SALVAR ALTERAÇÕES"
                                    onPress={handleSave}
                                    loading={saving}
                                    icon="save"
                                />
                            </View>
                        </View>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
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
    },
    scrollContent: {
        padding: theme.spacing.md,
        paddingBottom: theme.spacing.xl,
    },
    card: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        overflow: 'visible',
    },
    cardHeader: {
        padding: theme.spacing.lg,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    backButton: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: theme.spacing.md,
        gap: theme.spacing.xs,
    },
    backButtonText: {
        color: theme.colors.primary,
        fontWeight: '600',
        fontSize: theme.fontSize.sm,
    },
    cardTitle: {
        fontSize: theme.fontSize.xl,
        fontWeight: 'bold',
        color: theme.colors.text,
    },
    cardSubtitle: {
        fontSize: theme.fontSize.sm,
        color: theme.colors.textSecondary,
        marginTop: 4,
    },
    cardBody: {
        padding: theme.spacing.lg,
    },
    formField: {
        marginBottom: theme.spacing.lg,
    },
    label: {
        fontSize: theme.fontSize.xs,
        fontWeight: '700',
        color: theme.colors.textSecondary,
        marginBottom: 8,
        textTransform: 'uppercase',
    },
    input: {
        borderWidth: 1.5,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.md,
        padding: theme.spacing.md,
        fontSize: theme.fontSize.md,
        color: theme.colors.text,
        backgroundColor: '#fff',
    },
    textArea: {
        minHeight: 100,
        textAlignVertical: 'top',
    },
    buttonContainer: {
        marginTop: theme.spacing.md,
        alignItems: 'center',
    },
});
