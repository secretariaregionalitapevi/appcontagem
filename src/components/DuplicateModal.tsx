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
import { FontAwesome5 } from '@expo/vector-icons';
import { theme } from '../theme';

interface DuplicateModalProps {
  visible: boolean;
  nome: string;
  comum: string;
  data: string;
  horario: string;
  onCancel: () => void;
  onConfirm: () => void;
}

export const DuplicateModal: React.FC<DuplicateModalProps> = ({
  visible,
  nome,
  comum,
  data,
  horario,
  onCancel,
  onConfirm,
}) => {
  const scaleAnim = React.useRef(new Animated.Value(0)).current;
  const opacityAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (visible) {
      // Definir valores imediatamente para garantir visibilidade
      scaleAnim.setValue(1);
      opacityAnim.setValue(1);

      // Animar suavemente
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: false,
          tension: 50,
          friction: 7,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: false,
        }),
      ]).start();
    } else {
      scaleAnim.setValue(0);
      opacityAnim.setValue(0);
    }
  }, [visible]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
      statusBarTranslucent
    >
      <Animated.View
        style={[
          styles.overlay,
          {
            opacity: opacityAnim,
            ...(Platform.OS === 'web'
              ? {
                  zIndex: 999999999,
                  position: 'fixed' as ViewStyle['position'],
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                }
              : {}),
          },
        ]}
      >
        <Animated.View
          style={[
            styles.modal,
            {
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          {/* Ícone de alerta no topo */}
          <View style={styles.iconContainer}>
            <View style={styles.iconCircle}>
              <FontAwesome5 name="copy" size={36} color="#255ec8" />
            </View>
          </View>

          {/* Título */}
          <Text style={styles.title}>Cadastro Duplicado!</Text>

          {/* Mensagem principal estilo EnR */}
          <View style={styles.messageContainer}>
            <Text style={styles.message}>
              <Text style={styles.bold}>{nome || 'Nome não encontrado'}</Text> de <Text style={styles.bold}>{comum || 'Comum não encontrada'}</Text>
            </Text>
            <Text style={styles.messageSuffix}>já foi cadastrado(a).</Text>
          </View>

          {/* Box de Detalhes (Backup style) */}
          <View style={styles.detailsContainer}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Data: </Text>
              <Text style={styles.detailValue}>{data || '--/--/----'}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Horário: </Text>
              <Text style={styles.detailValue}>{horario || '--:--'}</Text>
            </View>
          </View>

          {/* Botões */}
          <View style={styles.buttonsContainer}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={onCancel}
              activeOpacity={0.6}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <FontAwesome5 name="times" size={14} color="#fff" style={styles.buttonIcon} />
              <Text style={styles.cancelButtonText}>Cancelar</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.confirmButton}
              onPress={onConfirm}
              activeOpacity={0.6}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <FontAwesome5 name="check-double" size={14} color="#fff" style={styles.buttonIcon} />
              <Text style={styles.confirmButtonText} numberOfLines={1}>Cadastrar Mesmo Assim</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.lg,
    ...(Platform.OS === 'web'
      ? {
          backdropFilter: 'blur(4px)',
        }
      : {}),
  },
  modal: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    width: '100%',
    maxWidth: 440,
    padding: 0,
    overflow: 'hidden',
    ...(Platform.OS === 'web'
      ? {
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(0, 0, 0, 0.05)',
          position: 'relative' as ViewStyle['position'],
          zIndex: 999999999,
        }
      : {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.25,
          shadowRadius: 24,
          elevation: 20,
        }),
  },
  iconContainer: {
    alignItems: 'center',
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.md,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 4,
    borderColor: '#e8f0fe',
    backgroundColor: '#f0f7ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 26,
    fontWeight: '600',
    color: '#545454',
    textAlign: 'center',
    marginBottom: theme.spacing.md,
    paddingHorizontal: theme.spacing.xl,
  },
  messageContainer: {
    marginBottom: theme.spacing.lg,
    paddingHorizontal: theme.spacing.xl,
  },
  message: {
    fontSize: 18, // Um pouco maior conforme imagem
    color: '#545454',
    textAlign: 'center',
    lineHeight: 26,
    fontWeight: '600',
  },
  messageSuffix: {
    fontSize: 16,
    color: '#797979',
    textAlign: 'center',
    marginTop: 4,
  },
  bold: {
    fontWeight: '700',
    color: '#545454',
  },
  detailsContainer: {
    backgroundColor: '#f8f9fa',
    marginHorizontal: theme.spacing.xl,
    borderRadius: 12,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.xl,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  detailIcon: {
    marginRight: theme.spacing.sm,
    width: 16,
  },
  detailText: {
    fontSize: 14,
    color: '#6c757d',
    flex: 1,
  },
  detailLabel: {
    fontWeight: '700', // Mais negrito conforme modelo
    color: '#495057',
    width: 65, // Alinhamento fixo
  },
  detailValue: {
    fontSize: 14,
    color: '#6c757d',
    fontWeight: '500',
  },
  buttonsContainer: {
    flexDirection: 'row',
    gap: 12, // Gap fixo conforme modelo
    padding: theme.spacing.lg,
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    alignItems: 'center',
  },
  cancelButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    backgroundColor: '#dc2626', // Vermelho para cancelar
    minHeight: 46,
    ...(Platform.OS === 'web'
      ? {
          transition: 'all 0.2s ease',
          cursor: 'pointer',
          ':hover': {
            backgroundColor: '#b91c1c',
          },
        }
      : {}),
  },
  buttonIcon: {
    marginRight: 8, // Espaço entre ícone e texto conforme modelo
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#ffffff',
    textAlign: 'center',
  },
  confirmButton: {
    flex: 2, // Aumentar flex para garantir linha única
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    backgroundColor: '#255ec8', // Azul original
    minHeight: 46,
    ...(Platform.OS === 'web'
      ? {
          transition: 'all 0.2s ease',
          cursor: 'pointer',
          ':hover': {
            backgroundColor: '#1d4ed8',
          },
          ':active': {
            transform: 'scale(0.98)',
          },
        }
      : {}),
  },
  confirmButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#ffffff',
    textAlign: 'center',
  },
});
