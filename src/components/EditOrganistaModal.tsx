import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Modal,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Switch,
} from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { PrimaryButton } from './PrimaryButton';
import { OrganistaEnsaio } from '../types/models';

export type OrganistaChanges = Pick<
  OrganistaEnsaio,
  'organista_nome' | 'organista_comum' | 'organista_cidade' | 'observacoes' | 'tocou'
>;

export const EditOrganistaModal: React.FC<{
  registro: OrganistaEnsaio;
  saving: boolean;
  onClose: () => void;
  onSave: (changes: OrganistaChanges) => Promise<void>;
}> = ({ registro, saving, onClose, onSave }) => {
  const [nome, setNome] = useState(registro.organista_nome);
  const [comum, setComum] = useState(registro.organista_comum || '');
  const [cidade, setCidade] = useState(registro.organista_cidade || '');
  const [observacoes, setObservacoes] = useState(registro.observacoes || '');
  const [tocou, setTocou] = useState(registro.tocou);
  const [attempted, setAttempted] = useState(false);
  const submit = () => {
    setAttempted(true);
    if (saving || !nome.trim()) return;
    void onSave({
      organista_nome: nome.trim(),
      organista_comum: comum.trim(),
      organista_cidade: cidade.trim(),
      observacoes: observacoes.trim(),
      tocou,
    });
  };
  return (
    <Modal
      visible
      transparent
      animationType="fade"
      onRequestClose={() => {
        if (!saving) onClose();
      }}
    >
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.card} accessibilityViewIsModal>
          <View style={styles.header}>
            <View style={styles.icon}>
              <FontAwesome5 solid name="edit" size={20} color="#1684dc" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>Editar organista</Text>
              <Text style={styles.subtitle}>
                {registro.local_ensaio} · {registro.data_ensaio.split('-').reverse().join('/')}
              </Text>
            </View>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Fechar edição"
              style={styles.close}
              disabled={saving}
              onPress={onClose}
            >
              <FontAwesome5 solid name="times" size={19} color="#6c8395" />
            </TouchableOpacity>
          </View>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.body}>
            <Text style={styles.label}>Nome da organista *</Text>
            <TextInput
              accessibilityLabel="Nome da organista"
              style={[styles.input, attempted && !nome.trim() && styles.invalid]}
              value={nome}
              onChangeText={setNome}
              editable={!saving}
              autoCapitalize="words"
            />
            {attempted && !nome.trim() && (
              <Text style={styles.error}>Informe o nome da organista.</Text>
            )}
            <Text style={styles.label}>Comum congregação</Text>
            <TextInput
              accessibilityLabel="Comum congregação"
              style={styles.input}
              value={comum}
              onChangeText={setComum}
              editable={!saving}
            />
            <Text style={styles.label}>Cidade</Text>
            <TextInput
              accessibilityLabel="Cidade"
              style={styles.input}
              value={cidade}
              onChangeText={setCidade}
              editable={!saving}
            />
            <Text style={styles.label}>Observações</Text>
            <TextInput
              accessibilityLabel="Observações"
              style={[styles.input, styles.notes]}
              value={observacoes}
              onChangeText={setObservacoes}
              editable={!saving}
              multiline
            />
            <View style={styles.switchRow}>
              <FontAwesome5 solid name="music" size={18} color="#8552cc" />
              <Text style={styles.switchLabel}>Tocou neste ensaio</Text>
              <Switch
                accessibilityLabel="Tocou neste ensaio"
                value={tocou}
                onValueChange={setTocou}
                disabled={saving}
                trackColor={{ false: '#cbd5e1', true: '#8552cc' }}
              />
            </View>
          </ScrollView>
          <View style={styles.footer}>
            <TouchableOpacity
              accessibilityRole="button"
              disabled={saving}
              onPress={onClose}
              style={[styles.cancel, saving && { opacity: 0.5 }]}
            >
              <FontAwesome5 solid name="times" size={15} color="#ffffff" />
              <Text style={styles.cancelText}>Cancelar</Text>
            </TouchableOpacity>
            <PrimaryButton
              title="Salvar alterações"
              icon="save"
              onPress={submit}
              loading={saving}
              style={styles.save}
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15,35,52,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  card: {
    width: '100%',
    maxWidth: 560,
    maxHeight: '92%',
    backgroundColor: '#ffffff',
    borderRadius: 24,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e7edf3',
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: '#e8f3ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: 20, fontWeight: '700', color: '#243d50' },
  subtitle: { fontSize: 11, color: '#748a9b', marginTop: 5 },
  close: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  body: { padding: 20 },
  label: { fontSize: 13, color: '#526c80', fontWeight: '600', marginBottom: 8 },
  input: {
    minHeight: 50,
    backgroundColor: '#f5f8fb',
    borderWidth: 1,
    borderColor: '#e1e9f1',
    borderRadius: 13,
    padding: 14,
    marginBottom: 16,
    fontSize: 15,
    color: '#243d50',
  },
  notes: { minHeight: 80, textAlignVertical: 'top' },
  invalid: { borderColor: '#dc5265' },
  error: { color: '#dc5265', fontSize: 12, marginBottom: 12 },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 13,
    backgroundColor: '#f2ecfc',
  },
  switchLabel: { flex: 1, fontSize: 13, fontWeight: '600', color: '#7253a2' },
  footer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e7edf3',
  },
  cancel: {
    flexGrow: 1,
    minHeight: 52,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#dc5265',
    borderRadius: 13,
  },
  cancelText: { color: '#ffffff', fontWeight: '600', fontSize: 13 },
  save: { flexGrow: 2, minHeight: 52, paddingHorizontal: 16, borderRadius: 13 },
});
