import React from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Animated,
  ViewStyle,
} from 'react-native';
import { FontAwesome5, Ionicons } from '@expo/vector-icons';
import { theme } from '../theme';

interface RegistrationSuccessModalProps {
  visible: boolean;
  nome: string;
  tocou: boolean;
  ultimaPresenca?: string;
  ultimoTocou?: boolean;
  onConfirm: (tocou: boolean) => void;
  onClose: () => void;
  loading?: boolean;
}

export const RegistrationSuccessModal: React.FC<RegistrationSuccessModalProps> = ({
  visible,
  nome,
  tocou,
  ultimaPresenca,
  ultimoTocou = true,
  onConfirm,
  onClose,
  loading = false,
}) => {
  const scaleAnim = React.useRef(new Animated.Value(0)).current;
  const opacityAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
          tension: 50,
          friction: 7,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      scaleAnim.setValue(0);
      opacityAnim.setValue(0);
    }
  }, [visible]);

  // Formatar data da última presença
  const formatExibicaoData = (dataStr?: string) => {
    if (!dataStr) return 'Nenhum registro anterior';
    try {
      const data = new Date(dataStr);
      if (isNaN(data.getTime())) return dataStr;
      
      const dia = String(data.getDate()).padStart(2, '0');
      const mes = String(data.getMonth() + 1).padStart(2, '0');
      const ano = data.getFullYear();
      return `${dia}/${mes}/${ano}`;
    } catch (e) {
      return dataStr;
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <Animated.View
          style={[
            styles.modal,
            {
              opacity: opacityAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          {/* Ícone de Sucesso no topo */}
          <View style={styles.iconContainer}>
            <View style={styles.iconCircle}>
              <FontAwesome5 name="check-circle" size={40} color="#10b981" />
            </View>
          </View>

          {/* Título */}
          <Text style={styles.title}>Confirmar Registro</Text>

          {/* Mensagem Principal */}
          <View style={styles.messageContainer}>
            <Text style={styles.organistaName}>{nome}</Text>
            <Text style={styles.subtitle}>
              A organista tocou no ensaio?
            </Text>
          </View>

          {/* Box de Informações Adicionais */}
          <View style={[styles.infoBox, !ultimoTocou && styles.infoBoxWarning]}>
            <View style={styles.infoRow}>
              <FontAwesome5 
                name={ultimoTocou ? "calendar-alt" : "exclamation-triangle"} 
                size={14} 
                color={ultimoTocou ? "#6b7280" : "#b45309"} 
                style={styles.infoIcon} 
              />
              <Text style={[styles.infoLabel, !ultimoTocou && styles.infoLabelWarning]}>
                {ultimoTocou ? 'Tocou no último ensaio de:' : 'Não tocou no último ensaio de:'}
              </Text>
            </View>
            <Text style={[styles.infoValue, !ultimoTocou && styles.infoValueWarning]}>
              {formatExibicaoData(ultimaPresenca)}
            </Text>
          </View>

          {/* Botões de Confirmação */}
          <View style={styles.buttonRow}>
            <TouchableOpacity 
              style={[styles.confirmButton, styles.noButton, loading && styles.buttonDisabled]} 
              onPress={() => !loading && onConfirm(false)}
              activeOpacity={0.7}
              disabled={loading}
            >
              <Ionicons name="close-circle" size={20} color="white" style={styles.buttonIcon} />
              <Text style={styles.buttonText}>NÃO</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.confirmButton, styles.yesButton, loading && styles.buttonDisabled]} 
              onPress={() => !loading && onConfirm(true)}
              activeOpacity={0.7}
              disabled={loading}
            >
              <Ionicons name="checkmark-circle" size={20} color="white" style={styles.buttonIcon} />
              <Text style={styles.buttonText}>SIM</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.lg,
    ...(Platform.OS === 'web' ? { backdropFilter: 'blur(3px)' } : {}),
  },
  modal: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    width: '100%',
    maxWidth: 400,
    padding: theme.spacing.xl,
    alignItems: 'center',
    ...(Platform.OS === 'web'
      ? { boxShadow: '0 10px 40px rgba(0,0,0,0.2)' }
      : {
          elevation: 10,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 5 },
          shadowOpacity: 0.3,
          shadowRadius: 10,
        }),
  },
  iconContainer: {
    marginBottom: theme.spacing.md,
  },
  iconCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#ecfdf5',
    justifyContent: 'center',
    alignItems: 'center',
    borderColor: '#10b981',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: theme.colors.primary,
    marginBottom: theme.spacing.sm,
    textAlign: 'center',
  },
  messageContainer: {
    marginBottom: theme.spacing.lg,
    alignItems: 'center',
  },
  organistaName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 15,
    color: '#4b5563',
    textAlign: 'center',
  },
  bold: {
    fontWeight: '700',
    color: '#111827',
  },
  infoBox: {
    width: '100%',
    backgroundColor: '#f9fafb',
    padding: theme.spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#f3f4f6',
    marginBottom: theme.spacing.xl,
  },
  infoBoxWarning: {
    backgroundColor: '#fffbeb',
    borderColor: '#fef3c7',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  infoIcon: {
    marginRight: 6,
  },
  infoLabel: {
    fontSize: 13,
    color: '#6b7280',
    fontWeight: '600',
  },
  infoLabelWarning: {
    color: '#b45309',
  },
  infoValue: {
    fontSize: 15,
    color: '#374151',
    fontWeight: '700',
    marginLeft: 20,
  },
  infoValueWarning: {
    color: '#92400e',
  },
  buttonRow: {
    flexDirection: 'row',
    width: '100%',
    gap: 12,
  },
  confirmButton: {
    flex: 1,
    flexDirection: 'row',
    height: 54,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  noButton: {
    backgroundColor: '#ef4444', // Vermelho
  },
  yesButton: {
    backgroundColor: theme.colors.primary, // Azul
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonIcon: {
    marginRight: 8,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: 1,
  },
});
