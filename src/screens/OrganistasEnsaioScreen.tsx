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
import { organistasEnsaioService } from '../services/organistasEnsaioService';
import { localStorageService } from '../services/localStorageService';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { OrganistaEnsaio } from '../types/models';
import { formatDate } from '../utils/dateUtils';
import { showToast } from '../utils/toast';
import { useNavigation } from '@react-navigation/native';
import { formatRegistradoPor } from '../utils/userNameUtils';

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
  const [selectedOrganista, setSelectedOrganista] = useState<string>('');
  const [tocou, setTocou] = useState<boolean>(false);
  const [localEnsaio, setLocalEnsaio] = useState<string>('Não definido');
  const [dataEnsaio, setDataEnsaio] = useState<string>(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);
  const [loadingOrganistas, setLoadingOrganistas] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [organistaFieldKey, setOrganistaFieldKey] = useState(0); // Key para forçar remontagem do NameSelectField

  // Carregar local do ensaio e buscar organistas
  useEffect(() => {
    loadLocalEnsaio();
  }, []);

  // Buscar organistas quando o local for carregado
  useEffect(() => {
    if (localEnsaio && localEnsaio !== 'Não definido') {
      loadOrganistas();
      loadRegistros();
    }
  }, [localEnsaio, dataEnsaio]);

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

  const loadOrganistas = async () => {
    if (!isOnline) {
      showToast.warning('Offline', 'Conecte-se à internet para buscar organistas');
      return;
    }

    setLoadingOrganistas(true);
    try {
      const data = await organistasEnsaioService.fetchOrganistasByLocalEnsaio(localEnsaio);
      
      // Converter para formato de opções do NameSelectField
      const opcoes = data.map((org, index) => ({
        id: `organista_${index}_${org.nome.toLowerCase().replace(/\s+/g, '_')}`,
        label: `${org.nome}${org.comum ? ` - ${org.comum}` : ''}${org.cargo ? ` (${org.cargo})` : ''}`,
        value: org.nome,
        data: org, // Guardar dados completos
      }));

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

      // Converter registros para formato de lista
      const items: OrganistaItem[] = registros.map(reg => ({
        nome: reg.organista_nome,
        comum: reg.organista_comum,
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

  const handleSelectOrganista = (option: { id: string; label: string; value: unknown }) => {
    if (typeof option.value === 'string') {
      setSelectedOrganista(option.value);
      // Verificar se já existe registro para esta organista
      const registroExistente = organistasRegistradas.find(
        reg => reg.nome === option.value
      );
      if (registroExistente) {
        setTocou(registroExistente.tocou || false);
      } else {
        setTocou(false);
      }
    }
  };

  // Função helper para limpar o campo de organista
  const clearOrganistaField = () => {
    console.log('🧹 Limpando campo de organista');
    setSelectedOrganista('');
    setTocou(false);
    // Incrementar key para forçar remontagem do NameSelectField
    setOrganistaFieldKey(prev => prev + 1);
  };

  const handleSave = async () => {
    if (!selectedOrganista || selectedOrganista.trim() === '') {
      Alert.alert('Atenção', 'Selecione uma organista');
      return;
    }

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
      // Buscar dados completos da organista selecionada
      const organistaSelecionada = organistas.find(
        opt => opt.value === selectedOrganista
      )?.data;

      // Preparar nome do usuário
      let nomeCompletoUsuario = user.nome;
      if (!nomeCompletoUsuario || nomeCompletoUsuario.trim() === '') {
        const emailSemDominio = user.email?.split('@')[0] || '';
        nomeCompletoUsuario = emailSemDominio.replace(/[._]/g, ' ').trim();
      }
      const nomeUsuario = formatRegistradoPor(nomeCompletoUsuario || user.id);

      const registro: OrganistaEnsaio = {
        organista_nome: selectedOrganista,
        organista_comum: organistaSelecionada?.comum || undefined,
        organista_cidade: organistaSelecionada?.cidade || undefined,
        local_ensaio: localEnsaio,
        data_ensaio: dataEnsaio,
        tocou: tocou,
        usuario_responsavel: nomeUsuario,
      };

      const result = await organistasEnsaioService.saveOrganistaEnsaio(registro);

      if (result.success) {
        showToast.success(
          'Salvo!',
          `${selectedOrganista} ${tocou ? 'tocou' : 'não tocou'} no ensaio`
        );
        
        // Limpar seleção IMEDIATAMENTE usando função helper
        clearOrganistaField();
        
        // Recarregar registros para atualizar a lista
        await loadRegistros();
        
        // NÃO recarregar a página - permanecer na mesma tela para novos registros
      } else {
        Alert.alert('Erro', result.error || 'Não foi possível salvar o registro');
      }
    } catch (error: any) {
      console.error('❌ Erro ao salvar registro:', error);
      Alert.alert('Erro', 'Não foi possível salvar o registro');
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
          showToast.success(
            'Atualizado!',
            `${nome} ${valor ? 'tocou' : 'não tocou'} no ensaio`
          );
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
      />
      
      {!isOnline && <OfflineBadge />}

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
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
                  onChange={(e) => {
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
                  onChangeText={(text) => {
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

          {/* Buscar e Registrar Nova Organista */}
          <View style={[styles.section, styles.registrarSection]}>
            <Text style={styles.sectionTitle}>Registrar Organista</Text>
            
            <View style={styles.nameSelectWrapper}>
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
              <View style={styles.switchContainer}>
                <Text style={styles.switchLabel}>
                  {selectedOrganista} tocou no ensaio?
                </Text>
                <Switch
                  value={tocou}
                  onValueChange={setTocou}
                  trackColor={{ false: '#767577', true: theme.colors.primary }}
                  thumbColor={tocou ? '#fff' : '#f4f3f4'}
                />
              </View>
            )}

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
              <Text style={styles.emptyText}>
                Nenhuma organista registrada para este ensaio
              </Text>
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
                        onValueChange={(value) => handleToggleTocou(org.nome, value)}
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
    overflow: 'hidden' as any,
  },
  nameSelectWrapper: {
    position: 'relative' as any,
    zIndex: 10,
    marginBottom: theme.spacing.xl,
    minHeight: 80,
    overflow: 'visible' as any,
  },
  sectionTitle: {
    fontSize: theme.fontSize.md,
    color: theme.colors.text,
    fontWeight: '700',
    marginBottom: theme.spacing.md,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: theme.spacing.sm,
    flexShrink: 0,
    minWidth: 120,
    paddingLeft: theme.spacing.sm,
  },
  switchLabel: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.text,
    flexShrink: 0,
  },
  saveButton: {
    marginTop: theme.spacing.md,
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
    zIndex: 10,
    position: 'relative' as any,
    overflow: 'visible' as any,
  },
  organistasSection: {
    zIndex: 50,
    position: 'relative' as any,
    marginTop: theme.spacing.xl,
  },
});

