import { usePwaUpdateGuard } from '../hooks/usePwaUpdateGuard';
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Image,
  Linking,
  TextInput,
} from 'react-native';
import Constants from 'expo-constants';
import pkg from '../../package.json';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuthContext } from '../context/AuthContext';
import { showToast } from '../utils/toast';
import { translateAuthError } from '../utils/authUtils';

type RootStackParamList = {
  Login: undefined;
  SignUp: undefined;
  Register: undefined;
  EditRegistros: undefined;
};

type LoginScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Login'>;
import { TextInputField } from '../components/TextInputField';
import { PrimaryButton } from '../components/PrimaryButton';
import { theme } from '../theme';
import { localStorageService } from '../services/localStorageService';
import { LocalEnsaio } from '../types/models';
import { locationSafetyService } from '../services/locationSafetyService';
import { LoginLocalSelect } from '../components/LoginLocalSelect';
import { FontAwesome5 } from '@expo/vector-icons';

export const LoginScreen: React.FC = () => {
  const navigation = useNavigation<LoginScreenNavigationProp>();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [localEnsaio, setLocalEnsaio] = useState<string>('');
  const [locaisEnsaio, setLocaisEnsaio] = useState<LocalEnsaio[]>([]);
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  usePwaUpdateGuard(loading || Boolean(email || password));

  // Configurações carregadas do config.js (ou fallback padrão)
  const appConfig = (typeof window !== 'undefined' && window.APP_CONFIG) || {
    REGIONAL_NAME: 'Regional Itapevi',
    LOCAIS_ENSAIO: (typeof window !== 'undefined' && window.APP_CONFIG?.LOCAIS_ENSAIO) || [
      { id: '1', nome: 'Cotia' },
      { id: '2', nome: 'Caucaia do Alto' },
      { id: '3', nome: 'Fazendinha' },
      { id: '4', nome: 'Itapevi' },
      { id: '5', nome: 'Jandira' },
      { id: '6', nome: 'Pirapora' },
      { id: '7', nome: 'Vargem Grande' },
    ],
  };

  const { signIn, signUp } = useAuthContext();

  // Definir título da página na web
  useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      document.title = `CCB | Login - ${appConfig.REGIONAL_NAME}`;
    }
  }, [appConfig.REGIONAL_NAME]);

  React.useEffect(() => {
    loadLocaisEnsaio();
  }, []);

  const loadLocaisEnsaio = async () => {
    try {
      // Locais de ensaio carregados do arquivo de configuração
      const mockLocais: LocalEnsaio[] = appConfig.LOCAIS_ENSAIO;
      console.log('📍 Locais de ensaio carregados:', mockLocais);
      setLocaisEnsaio(mockLocais);
    } catch (error) {
      console.error('Erro ao carregar locais de ensaio:', error);
    }
  };

  const handleLogin = async () => {
    if (loading) return;
    if (!email || !password || !localEnsaio) {
      showToast.error('Campos obrigatórios', 'Preencha e-mail, senha e Local do Ensaio.');
      return;
    }

    setLoading(true);
    try {
      locationSafetyService.reset();
      const confirmedTarget = await locationSafetyService.confirmEntry(localEnsaio);
      if (!confirmedTarget) return;
      setLocalEnsaio(confirmedTarget);
      console.log('Tentando fazer login...');
      const result = isSignUp ? await signUp(email, password) : await signIn(email, password);

      console.log('Resultado do login:', result);

      if (result.error) {
        const errorMessage = translateErrorMessage(result.error.message || 'Erro ao fazer login');
        // 🚨 MELHORIA: Usar toast ao invés de Alert para mensagens mais elegantes
        showToast.error('Credenciais inválidas', errorMessage);
      } else if (result.user) {
        // Salvar local do ensaio selecionado
        await localStorageService.setLocalEnsaio(confirmedTarget);
        console.log('Login bem-sucedido, navegando...');
        // Navegar para a tela de registro
        (navigation as any).navigate('Register');
      }
    } catch (error) {
      console.error('Erro no login:', error);
      const errorMessage = error instanceof Error ? error.message : 'Ocorreu um erro inesperado';
      showToast.error('Erro no login', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const translateErrorMessage = (message: string): string => {
    return translateAuthError(message);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.loginWrap}>
          <View style={styles.sacCard}>
            {/* Header Estilo Santa Ceia */}
            <View style={styles.sacHeader}>
              <TouchableOpacity
                onPress={() => Linking.openURL('https://congregacaocristanobrasil.org.br/')}
                activeOpacity={0.7}
              >
                <Image
                  source={require('../img/logo-ccb-light.png')}
                  style={styles.sacLogo}
                  resizeMode="contain"
                />
              </TouchableOpacity>
              <Text style={styles.sacTitle}>Lançamento de Presença</Text>
              <Text style={styles.sacSubtitle}>Ensaios Regionais</Text>
            </View>

            <View style={styles.sacBody}>
              {/* Lead Text (Estilizado) */}

              {/* Formulário com Icons boxes */}
              <View style={styles.formGroup}>
                <View style={styles.inputIconBox}>
                  <FontAwesome5 name="envelope" size={18} color="#1e4b7a" />
                </View>
                <TextInput
                  style={styles.sacInput}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="E-mail cadastrado"
                  placeholderTextColor="#94a3b8"
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
              </View>

              <View style={styles.formGroup}>
                <View style={styles.inputIconBox}>
                  <FontAwesome5 solid name="lock" size={18} color="#1e4b7a" />
                </View>
                <TextInput
                  style={styles.sacInput}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Senha"
                  placeholderTextColor="#94a3b8"
                  secureTextEntry={!showPassword}
                />
                <TouchableOpacity
                  style={styles.passwordToggle}
                  onPress={() => setShowPassword(!showPassword)}
                >
                  <FontAwesome5
                    name={showPassword ? 'eye-slash' : 'eye'}
                    size={16}
                    color="#94a3b8"
                  />
                </TouchableOpacity>
              </View>

              <View style={styles.formGroup}>
                <View style={styles.inputIconBox}>
                  <FontAwesome5 solid name="map-marker-alt" size={18} color="#dc5265" />
                </View>
                {Platform.OS === 'web' ? (
                  <LoginLocalSelect
                    disabled={loading}
                    value={localEnsaio}
                    options={locaisEnsaio}
                    onChange={setLocalEnsaio}
                  />
                ) : (
                  <View style={styles.sacSelectNative}>
                    <Text style={[styles.sacSelectText, !localEnsaio && { color: '#94a3b8' }]}>
                      {localEnsaio
                        ? locaisEnsaio.find(l => l.id === localEnsaio)?.nome || 'Local do Ensaio'
                        : 'Local do Ensaio'}
                    </Text>
                  </View>
                )}
              </View>

              <TouchableOpacity
                style={[styles.sacBtn, loading && { opacity: 0.7 }]}
                onPress={handleLogin}
                disabled={loading}
              >
                <FontAwesome5
                  name="sign-in-alt"
                  size={16}
                  color="#fff"
                  style={{ marginRight: 8 }}
                />
                <Text style={styles.sacBtnText}>{loading ? 'CARREGANDO...' : 'LOGIN'}</Text>
              </TouchableOpacity>

              {!isSignUp && (
                <TouchableOpacity
                  onPress={() => navigation.navigate('ForgotPassword' as any)}
                  style={styles.forgotPasswordContainer}
                >
                  <Text style={styles.forgotPasswordText}>Esqueceu a senha?</Text>
                </TouchableOpacity>
              )}

              <View style={styles.divider} />

              <View style={styles.registerContainer}>
                <Text style={styles.registerText}>Não tem uma conta?</Text>
                <TouchableOpacity
                  style={styles.sacBtnSecondary}
                  onPress={() => navigation.navigate('SignUp')}
                  activeOpacity={0.7}
                >
                  <Text style={styles.sacBtnSecondaryText}>CRIAR CONTA</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Rodapé da Página */}
          <View style={styles.sacPageFooter}>
            <Text style={styles.footerText}>
              © Aplicativo de Contagem v{pkg.version || '1.0'}
              {'\n'}
              <Text
                style={styles.footerLink}
                onPress={() => Linking.openURL('https://congregacaocristanobrasil.org.br/')}
              >
                Congregação Cristã no Brasil
              </Text>
              {'\n'}
              Regional Itapevi
            </Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const loginFontFamily =
  Platform.OS === 'web'
    ? 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    : Platform.OS === 'ios'
      ? 'System'
      : 'sans-serif';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f1f5f9',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  loginWrap: {
    width: '100%',
    maxWidth: 500,
    alignSelf: 'center',
  },
  sacCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 25,
    elevation: 5,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  sacHeader: {
    backgroundColor: '#1e4b7a',
    padding: 40,
    alignItems: 'center',
  },
  sacLogo: {
    width: 260,
    height: 110,
    marginBottom: 15,
    tintColor: '#fff', // Para forçar branco se a imagem permitir
  },
  sacTitle: {
    letterSpacing: -0.5,
    color: '#fff',
    fontSize: 26,
    fontFamily: loginFontFamily,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  sacSubtitle: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 15,
    fontFamily: loginFontFamily,
    lineHeight: 20,
    textAlign: 'center',
  },
  sacBody: {
    padding: 30,
  },
  leadText: {
    fontSize: 15,
    fontFamily: loginFontFamily,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 5,
  },
  boldText: {
    fontWeight: '700',
    color: '#1e4b7a',
  },
  subText: {
    fontSize: 13,
    fontFamily: loginFontFamily,
    color: '#94a3b8',
    textAlign: 'center',
    marginBottom: 20,
  },
  formGroup: {
    flexDirection: 'row',
    alignItems: 'stretch',
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    backgroundColor: '#fff',
    height: 52,
    overflow: 'hidden',
  },
  inputIconBox: {
    width: 50,
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
    borderRightWidth: 1,
    borderRightColor: '#e2e8f0',
  },
  sacInput: {
    flex: 1,
    minWidth: 0,
    paddingHorizontal: 15,
    fontSize: 15,
    fontFamily: loginFontFamily,
    color: '#334155',
  },
  sacSelectWeb: {
    flex: 1,
    fontSize: 15,
    fontFamily: loginFontFamily,
    color: '#334155',
    paddingLeft: 15,
    paddingRight: 15,
    backgroundColor: 'transparent',
    borderWidth: 0,
    outline: 'none',
    cursor: 'pointer',
  } as any,
  sacSelectNative: {
    flex: 1,
    paddingHorizontal: 15,
    justifyContent: 'center',
  },
  sacSelectText: {
    fontSize: 15,
    fontFamily: loginFontFamily,
    color: '#334155',
  },
  passwordToggle: {
    width: 50,
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sacBtn: {
    height: 48,
    backgroundColor: '#1e4b7a',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  sacBtnText: {
    color: '#fff',
    fontSize: 14,
    fontFamily: loginFontFamily,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  forgotPasswordContainer: {
    alignItems: 'center',
    paddingVertical: 15,
  },
  forgotPasswordText: {
    color: '#1e4b7a',
    fontSize: 13,
    fontFamily: loginFontFamily,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: '#e2e8f0',
    marginVertical: 10,
  },
  registerContainer: {
    alignItems: 'center',
  },
  registerText: {
    fontSize: 13,
    fontFamily: loginFontFamily,
    color: '#64748b',
    marginBottom: 10,
  },
  sacBtnSecondary: {
    width: '100%',
    padding: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  sacBtnSecondaryText: {
    color: '#64748b',
    fontSize: 13,
    fontFamily: loginFontFamily,
    fontWeight: '600',
  },
  sacPageFooter: {
    marginTop: 20,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 11,
    fontFamily: loginFontFamily,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 16,
  },
  footerLink: {
    color: '#64748b',
    textDecorationLine: 'underline',
  },
});
