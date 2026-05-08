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
import { showToast } from '../utils/toast';
import pkg from '../../package.json';

export const ForgotPasswordScreen: React.FC = () => {
  const navigation = useNavigation();
  const { resetPasswordForEmail } = useAuthContext();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  // Configurações carregadas do config.js (ou fallback padrão)
  const appConfig = (typeof window !== 'undefined' && window.APP_CONFIG) || {
    REGIONAL_NAME: 'Regional Itapevi',
  };

  // Definir título da página na web
  useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      document.title = `CCB | Recuperar Senha - ${appConfig.REGIONAL_NAME}`;
    }
  }, [appConfig.REGIONAL_NAME]);

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
          
          <View style={styles.sacCard}>
            {/* Header Estilo Santa Ceia - IDENTICO AO LOGIN */}
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
              <Text style={styles.sacTitle}>Recuperar Senha</Text>
              <Text style={styles.sacSubtitle}>
                Sistema Administrativo de Contagem
              </Text>
            </View>

            <View style={styles.sacBody}>
              <Text style={styles.leadText}>
                {sent 
                  ? 'Um link de recuperação foi enviado para o seu e-mail.' 
                  : 'Informe seu e-mail cadastrado e enviaremos um link para você redefinir sua senha.'}
              </Text>
              
              {sent && (
                <Text style={styles.subText}>
                  Por favor, verifique sua caixa de entrada.
                </Text>
              )}

              {!sent && (
                <View style={styles.formGroup}>
                  <View style={styles.inputIconBox}>
                    <FontAwesome5 name="envelope" size={18} color="#1e4b7a" />
                  </View>
                  <TextInput
                    style={styles.sacInput}
                    value={email}
                    onChangeText={setEmail}
                    placeholder="Seu e-mail cadastrado"
                    placeholderTextColor="#94a3b8"
                    autoCapitalize="none"
                    keyboardType="email-address"
                    autoComplete="email"
                  />
                </View>
              )}

              {!sent && (
                <TouchableOpacity 
                  style={[styles.sacBtn, loading && { opacity: 0.7 }]} 
                  onPress={handleResetPassword}
                  disabled={loading}
                >
                  <FontAwesome5 name="paper-plane" size={16} color="#fff" style={{ marginRight: 10 }} />
                  <Text style={styles.sacBtnText}>
                    {loading ? 'ENVIANDO...' : 'ENVIAR LINK DE RECUPERAÇÃO'}
                  </Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity 
                style={styles.forgotPasswordContainer} 
                onPress={() => navigation.goBack()}
              >
                <Text style={styles.forgotPasswordText}>
                  <FontAwesome5 name="arrow-left" size={12} color="#1e4b7a" />  Voltar para o Login
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Rodapé - IDENTICO AO LOGIN */}
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
              {appConfig.REGIONAL_NAME}
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
    backgroundColor: '#f1f5f9',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  loginWrap: {
    width: '100%',
    maxWidth: 500, // Ajustado para bater com o Login
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
    padding: 40, // Ajustado para bater com o Login
    alignItems: 'center',
  },
  sacLogo: {
    width: 260, // Ajustado para bater com o Login
    height: 110,
    marginBottom: 15,
    tintColor: '#fff', // FORÇAR BRANCO
  },
  sacTitle: {
    color: '#fff',
    fontSize: 26, // Ajustado para bater com o Login
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  sacSubtitle: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 15,
    lineHeight: 20,
    textAlign: 'center',
  },
  sacBody: {
    padding: 30,
  },
  leadText: {
    fontSize: 15,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 5,
  },
  subText: {
    fontSize: 13,
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
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
    borderRightWidth: 1,
    borderRightColor: '#e2e8f0',
  },
  sacInput: {
    flex: 1,
    paddingHorizontal: 15,
    fontSize: 15,
    color: '#334155',
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
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  forgotPasswordContainer: {
    alignItems: 'center',
    paddingVertical: 15,
    marginTop: 10,
  },
  forgotPasswordText: {
    color: '#1e4b7a',
    fontSize: 13,
    fontWeight: '600',
  },
  sacPageFooter: {
    marginTop: 20,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 11,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 16,
  },
  footerLink: {
    color: '#64748b',
    textDecorationLine: 'underline',
  },
});
