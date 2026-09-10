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
  ScrollView,
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
  isForaRegional?: boolean;
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
  isForaRegional = false,
}) => {
  const { width, height } = useWindowDimensions();
  const isSmall = width < 380;
  // Em telas muito pequenas de altura (ex: iPhone SE), compactar ainda mais
  const isTiny = height < 680;

  const scaleAnim = React.useRef(new Animated.Value(0)).current;
  const opacityAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (visible) {
      scaleAnim.setValue(1);
      opacityAnim.setValue(1);
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

  // Altura máxima da parte scrollável:
  // deixa espaço para os botões (≈72px linha ou ≈130px coluna) + borda
  const buttonsEstimatedHeight = onConfirm && isSmall ? 140 : 80;
  const maxScrollHeight = height * 0.85 - buttonsEstimatedHeight;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={isForaRegional ? onCancel : () => undefined}
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
              maxHeight: height * 0.92,
            },
          ]}
        >
          {/* ── Conteúdo scrollável ── */}
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            style={{ maxHeight: maxScrollHeight }}
            bounces={false}
          >
            {/* Ícone no topo */}
            <View style={[styles.iconContainer, isTiny && styles.iconContainerTiny]}>
              <View style={[styles.iconCircle, !isForaRegional && styles.warningIconCircle, isTiny && styles.iconCircleTiny]}>
                <FontAwesome5
                  name={isForaRegional ? 'copy' : 'exclamation-triangle'}
                  size={isTiny ? 22 : 32}
                  color={isForaRegional ? '#255ec8' : '#f59e0b'}
                />
              </View>
            </View>

            {!isForaRegional ? (
              <Text style={styles.eyebrow}>PRESENÇA JÁ REGISTRADA</Text>
            ) : null}

            {/* Título */}
            <Text style={[styles.title, isTiny && styles.titleTiny]}>
              {isForaRegional ? 'Cadastro Duplicado!' : 'Duplicidade detectada'}
            </Text>

            {/* Mensagem principal */}
            <View style={[styles.messageContainer, isTiny && styles.messageContainerTiny]}>
              <Text style={styles.nomeText}>{nome || 'Nome não encontrado'}</Text>
              <Text style={styles.comumText}>de {comum || 'Comum não encontrada'}</Text>
              <Text style={styles.messageSuffix}>
                {isForaRegional
                  ? (detalhe ? `Já temos um registro ${detalhe}.` : 'Já foi cadastrado(a).')
                  : `Este participante já foi registrado${detalhe ? ` ${detalhe}` : ''}. Um novo registro não é permitido.`}
              </Text>
            </View>

            {/* Box de data e horário */}
            <View style={[styles.detailsContainer, isSmall && styles.detailsContainerCompact]}>
              <View style={[styles.detailBox, isSmall && styles.detailBoxCompact]}>
                <View style={styles.detailItem}>
                  <View style={styles.detailIconWrapper}>
                    <FontAwesome5 name="calendar-alt" size={16} color="#255ec8" />
                  </View>
                  <View style={styles.detailTextContainer}>
                    <Text style={styles.detailLabel}>Registro realizado em</Text>
                    <Text style={styles.detailValue}>{data || '--/--/----'}</Text>
                  </View>
                </View>

                <View style={[styles.detailDivider, isSmall && styles.detailDividerCompact]} />

                <View style={styles.detailItem}>
                  <View style={styles.detailIconWrapper}>
                    <FontAwesome5 name="clock" size={16} color="#255ec8" />
                  </View>
                  <View style={styles.detailTextContainer}>
                    <Text style={styles.detailLabel}>Horário registrado</Text>
                    <Text style={styles.detailValue}>{horario || '--:--'}</Text>
                  </View>
                </View>
              </View>
            </View>
          </ScrollView>

          {/* ── Botões — SEMPRE fixos no rodapé, nunca cortados ── */}
          <View
            style={[
              styles.buttonsContainer,
              onConfirm && isSmall && styles.buttonsContainerColumn,
            ]}
          >
            {/* Botão Fechar (vermelho) */}
            <TouchableOpacity
              style={[styles.actionButton, styles.cancelButton, !isForaRegional && styles.regionalCancelButton]}
              onPress={onCancel}
              activeOpacity={0.6}
            >
              <FontAwesome5 name="times" size={14} color="#fff" style={styles.buttonIcon} />
              <Text style={styles.buttonText}>{isForaRegional ? 'Fechar' : 'Cancelar'}</Text>
            </TouchableOpacity>

            {/* Botão Confirmar (azul) — só aparece quando onConfirm é fornecido */}
            {onConfirm ? (
              <TouchableOpacity
                style={[styles.actionButton, styles.confirmButton]}
                onPress={onConfirm}
                activeOpacity={0.6}
              >
                <FontAwesome5 name="check" size={14} color="#fff" style={styles.buttonIcon} />
                <Text style={styles.buttonText}>{confirmLabel}</Text>
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
          // @ts-ignore
          backdropFilter: 'blur(4px)',
        }
      : {}),
  },
  modal: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    width: '100%',
    maxWidth: 440,
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
  scrollContent: {
    paddingBottom: 4,
  },
  // ── Ícone ──
  iconContainer: {
    alignItems: 'center',
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.md,
  },
  iconContainerTiny: {
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.xs ?? 4,
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
  eyebrow: {
    color: '#b45309',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.1,
    textAlign: 'center',
    marginBottom: 8,
  },
  warningIconCircle: {
    borderColor: '#fde7c2',
    backgroundColor: '#fff8eb',
  },
  iconCircleTiny: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 3,
  },
  // ── Título ──
  title: {
    fontSize: 26,
    fontWeight: '600',
    color: '#545454',
    textAlign: 'center',
    marginBottom: theme.spacing.md,
    paddingHorizontal: theme.spacing.xl,
  },
  titleTiny: {
    fontSize: 20,
    marginBottom: theme.spacing.sm,
  },
  // ── Mensagem ──
  messageContainer: {
    marginBottom: theme.spacing.lg,
    paddingHorizontal: theme.spacing.xl,
    alignItems: 'center',
  },
  messageContainerTiny: {
    marginBottom: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
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
  // ── Detalhes ──
  detailsContainer: {
    marginHorizontal: theme.spacing.xl,
    marginBottom: theme.spacing.lg,
  },
  detailsContainerCompact: {
    marginHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.md,
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
  // ── Botões (sempre no rodapé) ──
  buttonsContainer: {
    flexDirection: 'row',
    gap: 10,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
    backgroundColor: '#ffffff',
    alignItems: 'stretch',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  buttonsContainerColumn: {
    flexDirection: 'column',
    gap: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    paddingHorizontal: 12,
    borderRadius: 14,
    minHeight: 48,
    flex: 1,
    ...Platform.select({
      web: {
        // @ts-ignore
        outlineStyle: 'none',
        cursor: 'pointer',
      },
      default: {
        elevation: 4,
      },
    }),
  },
  cancelButton: {
    backgroundColor: '#ef4444',
  },
  regionalCancelButton: {
    backgroundColor: '#0b4f71',
  },
  confirmButton: {
    backgroundColor: '#255ec8',
    flex: 1.5,
  },
  buttonIcon: {
    marginRight: 7,
  },
  buttonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ffffff',
    textAlign: 'center',
    flexShrink: 1,
  },
});
