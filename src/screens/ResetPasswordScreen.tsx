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
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { FontAwesome5 } from '@expo/vector-icons';
import { useAuthContext } from '../context/AuthContext';
import { PrimaryButton } from '../components/PrimaryButton';
import { theme } from '../theme';
import { showToast } from '../utils/toast';
import { translateAuthError } from '../utils/authUtils';
import pkg from '../../package.json';

export const ResetPasswordScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const { updatePassword, setIsRecoveringPassword } = useAuthContext();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // Definir título da página na web
  useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      document.title = 'CCB | Redefinir Senha';
    }
  }, []);

  const handleUpdatePassword = async () => {
    if (!password || !confirmPassword) {
      showToast.error('Campos obrigatórios', 'Por favor, preencha a nova senha e a confirmação.');
      return;
    }

    if (password !== confirmPassword) {
      showToast.error('Senhas não coincidem', 'A senha e a confirmação devem ser iguais.');
      return;
    }

    if (password.length < 6) {
      showToast.error('Senha muito curta', 'A senha deve ter pelo menos 6 caracteres.');
      return;
    }

    setLoading(true);
    try {
      const { error } = await updatePassword(password);

      if (error) {
        showToast.error('Erro', translateAuthError(error.message));
      } else {
        showToast.success(
          'Senha atualizada!',
          'Sua senha foi redefinida com sucesso. Você já pode fazer login.'
        );
        setIsRecoveringPassword(false);
        // Pequeno delay para garantir que o usuário veja a mensagem
        setTimeout(() => {
          (navigation as any).navigate('Login');
        }, 2000);
      }
    } catch (error) {
      console.error('Erro ao atualizar senha:', error);
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

          <Text style={styles.title}>Redefinir Senha</Text>
          
          <Text style={styles.leadText}>
            Informe sua nova senha abaixo para recuperar o acesso ao sistema.
          </Text>

          <View style={styles.card}>
            <View style={styles.inputGroup}>
              <View style={styles.inputGroupText}>
                <FontAwesome5 name="lock" size={16} color={theme.colors.icon} />
              </View>
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                placeholder="Nova Senha"
                placeholderTextColor={theme.colors.textSecondary}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity
                style={styles.togglePassword}
                onPress={() => setShowPassword(!showPassword)}
              >
                <FontAwesome5
                  name={showPassword ? 'eye-slash' : 'eye'}
                  size={16}
                  color={theme.colors.icon}
                />
              </TouchableOpacity>
            </View>

            <View style={styles.inputGroup}>
              <View style={styles.inputGroupText}>
                <FontAwesome5 name="lock" size={16} color={theme.colors.icon} />
              </View>
              <TextInput
                style={styles.input}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Confirmar Nova Senha"
                placeholderTextColor={theme.colors.textSecondary}
                secureTextEntry={!showPassword}
              />
            </View>

            <PrimaryButton
              title="Atualizar Senha"
              onPress={handleUpdatePassword}
              loading={loading}
              style={styles.button}
            />
          </View>

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
    marginBottom: theme.spacing.md,
  },
  inputGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
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
  togglePassword: {
    paddingHorizontal: theme.spacing.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  button: {
    marginTop: theme.spacing.md,
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
