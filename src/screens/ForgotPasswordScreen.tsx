import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Image,
  Linking,
  TextInput,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { FontAwesome5 } from '@expo/vector-icons';
import { useAuthContext } from '../context/AuthContext';
import { PrimaryButton } from '../components/PrimaryButton';
import { theme } from '../theme';
import { showToast } from '../utils/toast';
import pkg from '../../package.json';

export const ForgotPasswordScreen: React.FC = () => {
  const navigation = useNavigation();
  const { resetPasswordForEmail } = useAuthContext();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  // Definir título da página na web
  useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      document.title = 'CCB | Recuperar Senha';
    }
  }, []);

  const handleResetPassword = async () => {
    if (!email.trim()) {
      showToast.error('Campo obrigatório', 'Por favor, informe seu e-mail.');
      return;
    }

    setLoading(true);
    try {
      const { error } = await resetPasswordForEmail(email.trim());

      if (error) {
        showToast.error('Erro', error.message || 'Ocorreu um erro ao enviar o link de recuperação.');
      } else {
        setSent(true);
        showToast.success(
          'E-mail enviado!',
          'Verifique sua caixa de entrada para redefinir sua senha.'
        );
      }
    } catch (error) {
      console.error('Erro ao resetar senha:', error);
      showToast.error('Erro', 'Ocorreu um erro inesperado. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.loginWrap}>
          {/* Logo CCB */}
          <View style={styles.logoContainer}>
            <TouchableOpacity
              onPress={() => Linking.openURL('https://congregacaocristanobrasil.org.br/')}
              activeOpacity={0.7}
            >
              <Image
                source={require('../img/logo-ccb-light.png')}
                style={styles.logo}
                resizeMode="contain"
              />
            </TouchableOpacity>
          </View>

          <Text style={styles.title}>Recuperar Senha</Text>
          
          <Text style={styles.leadText}>
            {sent 
              ? 'Um link de recuperação foi enviado para o seu e-mail. Por favor, verifique sua caixa de entrada.' 
              : 'Informe seu e-mail cadastrado e enviaremos um link para você redefinir sua senha.'}
          </Text>

          {!sent && (
            <View style={styles.card}>
              <View style={styles.inputGroup}>
                <View style={styles.inputGroupText}>
                  <FontAwesome5 name="envelope" size={16} color={theme.colors.icon} />
                </View>
                <TextInput
                  style={styles.input}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="Seu e-mail"
                  placeholderTextColor={theme.colors.textSecondary}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  autoComplete="email"
                />
              </View>

              <PrimaryButton
                title="Enviar link de recuperação"
                onPress={handleResetPassword}
                loading={loading}
                style={styles.button}
              />
            </View>
          )}

          <TouchableOpacity 
            style={styles.backButton} 
            onPress={() => navigation.goBack()}
          >
            <FontAwesome5 name="arrow-left" size={14} color={theme.colors.primary} />
            <Text style={styles.backButtonText}>Voltar para o Login</Text>
          </TouchableOpacity>

          {/* Rodapé */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              <Text style={styles.footerBold}>©</Text> Aplicativo de Contagem v{pkg.version || '1.0'}
              {'\n'}
              <Text style={styles.footerBold}>Regional Itapevi</Text>
            </Text>
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
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: theme.spacing.md,
  },
  loginWrap: {
    width: '100%',
    maxWidth: 440,
    alignSelf: 'center',
    paddingVertical: theme.spacing.md,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  logo: {
    width: 200,
    height: 120,
    marginVertical: theme.spacing.sm,
  },
  title: {
    fontSize: theme.fontSize.xxl,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.md,
    color: theme.colors.text,
  },
  leadText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: theme.spacing.lg,
    paddingHorizontal: theme.spacing.md,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  inputGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.surface,
    overflow: 'hidden',
    minHeight: 48,
  },
  inputGroupText: {
    backgroundColor: theme.colors.surface,
    paddingHorizontal: theme.spacing.sm,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 40,
  },
  input: {
    flex: 1,
    fontSize: theme.fontSize.md,
    color: theme.colors.text,
    paddingVertical: theme.spacing.sm,
    paddingLeft: theme.spacing.md,
    paddingRight: theme.spacing.md,
    minHeight: 48,
    borderLeftWidth: 1,
    borderLeftColor: theme.colors.border,
  },
  button: {
    marginTop: theme.spacing.sm,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.sm,
  },
  backButtonText: {
    color: theme.colors.primary,
    fontWeight: '600',
    fontSize: theme.fontSize.sm,
    marginLeft: theme.spacing.sm,
  },
  footer: {
    marginTop: theme.spacing.xl,
    alignItems: 'center',
  },
  footerText: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },
  footerBold: {
    fontWeight: '700',
  },
});
