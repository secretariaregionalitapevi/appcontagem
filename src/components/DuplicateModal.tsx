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
  useWindowDimensions,
} from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { theme } from '../theme';

interface DuplicateModalProps {
  visible: boolean;
  nome: string;
  comum: string;
  detalhe?: string;
  data: string;
  horario: string;
  onCancel: () => void;
  onConfirm?: () => void;
  confirmLabel?: string;
}

export const DuplicateModal: React.FC<DuplicateModalProps> = ({
  visible,
  nome,
  comum,
  detalhe,
  data,
  horario,
  onCancel,
  onConfirm,
  confirmLabel = 'Cadastrar mesmo assim',
}) => {
  const { width } = useWindowDimensions();
  const compactActions = width < 380;
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
            <Text style={styles.nomeText}>{nome || 'Nome não encontrado'}</Text>
            <Text style={styles.comumText}>de {comum || 'Comum não encontrada'}</Text>
            <Text style={styles.messageSuffix}>
              {detalhe ? `ja temos um registro ${detalhe}.` : 'ja foi cadastrado(a).'}
            </Text>
          </View>

          {/* Box de Detalhes (Elaborado) */}
          <View style={[styles.detailsContainer, compactActions && styles.detailsContainerCompact]}>
            <View style={[styles.detailBox, compactActions && styles.detailBoxCompact]}>
              <View style={styles.detailItem}>
                <View style={styles.detailIconWrapper}>
                   <FontAwesome5 name="calendar-alt" size={16} color="#255ec8" />
                </View>
                <View style={styles.detailTextContainer}>
                  <Text style={styles.detailLabel}>Data</Text>
                  <Text style={styles.detailValue}>{data || '--/--/----'}</Text>
                </View>
              </View>
              
              <View style={[styles.detailDivider, compactActions && styles.detailDividerCompact]} />

              <View style={styles.detailItem}>
                <View style={styles.detailIconWrapper}>
                   <FontAwesome5 name="clock" size={16} color="#255ec8" />
                </View>
                <View style={styles.detailTextContainer}>
                  <Text style={styles.detailLabel}>Horário</Text>
                  <Text style={styles.detailValue}>{horario || '--:--'}</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Botões */}
          <View style={[styles.buttonsContainer, compactActions && styles.buttonsContainerCompact]}>
            <TouchableOpacity
              style={[styles.actionButton, styles.cancelButton, compactActions && styles.actionButtonCompact]}
              onPress={onCancel}
              activeOpacity={0.6}
            >
              <FontAwesome5 name="times" size={14} color="#fff" style={styles.buttonIcon} />
              <Text style={[styles.cancelButtonText, compactActions && styles.actionButtonTextCompact]}>
                Fechar
              </Text>
            </TouchableOpacity>
            {onConfirm ? (
              <TouchableOpacity
                style={[styles.actionButton, styles.confirmButton, compactActions && styles.actionButtonCompact]}
                onPress={onConfirm}
                activeOpacity={0.6}
              >
                <FontAwesome5 name="check" size={14} color="#fff" style={styles.buttonIcon} />
                <Text style={[styles.cancelButtonText, compactActions && styles.actionButtonTextCompact]}>
                  {confirmLabel}
                </Text>
              </TouchableOpacity>
            ) : null}
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
    alignItems: 'center',
  },
  nomeText: {
    fontSize: 20,
    fontWeight: '800',
    color: '#334155',
    textAlign: 'center',
    marginBottom: 4,
  },
  comumText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#64748b',
    textAlign: 'center',
  },
  messageSuffix: {
    fontSize: 15,
    color: '#94a3b8',
    textAlign: 'center',
    marginTop: 8,
  },
  bold: {
    fontWeight: '700',
    color: '#545454',
  },
  detailsContainer: {
    marginHorizontal: theme.spacing.xl,
    marginBottom: theme.spacing.xl,
  },
  detailsContainerCompact: {
    marginHorizontal: theme.spacing.lg,
  },
  detailBox: {
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  detailBoxCompact: {
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: 10,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    minWidth: 0,
  },
  detailTextContainer: {
    flex: 1,
    minWidth: 0,
  },
  detailIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#eff6ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  detailLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  detailValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#334155',
    flexShrink: 1,
  },
  detailDivider: {
    width: 1,
    height: 30,
    backgroundColor: '#e2e8f0',
    marginHorizontal: 12,
  },
  detailDividerCompact: {
    width: '100%',
    height: 1,
    marginHorizontal: 0,
  },
  buttonsContainer: {
    flexDirection: 'row',
    gap: 12,
    paddingVertical: theme.spacing.lg,
    paddingHorizontal: theme.spacing.lg,
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    alignItems: 'center',
  },
  buttonsContainerCompact: {
    flexDirection: 'column',
    paddingHorizontal: theme.spacing.md,
    alignItems: 'stretch',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    minHeight: 48,
    minWidth: 0,
    flex: 1,
    ...Platform.select({
      web: {
        // @ts-ignore
        outlineStyle: 'none',
        cursor: 'pointer',
      },
      default: {
        elevation: 4,
      }
    })
  },
  actionButtonCompact: {
    width: '100%',
    flex: 0,
  },
  cancelButton: {
    backgroundColor: '#ef4444',
  },
  confirmButton: {
    backgroundColor: '#255ec8',
    flex: 1.45,
  },
  buttonIcon: {
    marginRight: 8,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
    textAlign: 'center',
    flexShrink: 1,
  },
  actionButtonTextCompact: {
    fontSize: 15,
  },
});
