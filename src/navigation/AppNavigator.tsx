import React, { useEffect, useRef } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { LoginScreen } from '../screens/LoginScreen';
import { SignUpScreen } from '../screens/SignUpScreen';
import { RegisterScreen } from '../screens/RegisterScreen';
import { EditRegistrosScreen } from '../screens/EditRegistrosScreen';
import { EditRecordDetailScreen } from '../screens/EditRecordDetailScreen';
import { OrganistasEnsaioScreen } from '../screens/OrganistasEnsaioScreen';
import { OtrasLocalidadesScreen } from '../screens/OtrasLocalidadesScreen';
import { ForgotPasswordScreen } from '../screens/ForgotPasswordScreen';
import { ResetPasswordScreen } from '../screens/ResetPasswordScreen';
import { useAuthContext } from '../context/AuthContext';
import { View, ActivityIndicator, StyleSheet, Text, Platform } from 'react-native';
import { theme } from '../theme';
import { localStorageService } from '../services/localStorageService';

const Stack = createNativeStackNavigator();

export const AppNavigator: React.FC = () => {
  const { user, loading, isRecoveringPassword, setIsRecoveringPassword } = useAuthContext();
  const navigationRef = useRef<any>(null);
  const previousUserRef = useRef<typeof user>(user);

  // Navegar para Login quando o usuário fizer logout
  useEffect(() => {
    // Se estiver em recuperação de senha, não forçar logout
    if (isRecoveringPassword) return;

    // Só navegar se houve mudança de autenticado para não autenticado
    const wasAuthenticated = previousUserRef.current !== null;
    const isNowUnauthenticated = !loading && !user;

    if (wasAuthenticated && isNowUnauthenticated && navigationRef.current?.isReady()) {
      // Pequeno delay para garantir que o estado foi atualizado
      const timer = setTimeout(() => {
        try {
          navigationRef.current?.reset({
            index: 0,
            routes: [{ name: 'Login' }],
          });
        } catch (error) {
          console.warn('Erro ao navegar para Login:', error);
        }
      }, 100);

      return () => clearTimeout(timer);
    }

    // Atualizar referência do usuário anterior
    previousUserRef.current = user;
  }, [user, loading]);

  // Forçar login se não houver usuário autenticado ou se o local de ensaio estiver ausente
  useEffect(() => {
    const checkAuthAndLocal = async () => {
      // Se estiver em recuperação de senha, não forçar login
      if (isRecoveringPassword) return;

      if (!loading && navigationRef.current?.isReady()) {
        const localId = await localStorageService.getLocalEnsaio();
        
        const currentRoute = navigationRef.current?.getCurrentRoute()?.name;
        
        if ((!user || !localId) && currentRoute !== 'Login') {
          console.log(`🛡️ [AppNavigator] Redirecionando para Login: user=${!!user}, localId=${!!localId}, currentRoute=${currentRoute}`);
          
          // Pequeno delay para garantir que o estado foi atualizado
          setTimeout(() => {
            try {
              if (navigationRef.current?.isReady()) {
                navigationRef.current?.reset({
                  index: 0,
                  routes: [{ name: 'Login' }],
                });
              }
            } catch (error) {
              console.warn('Erro ao navegar para Login:', error);
            }
          }, 100);
        }
      }
    };

    checkAuthAndLocal();
  }, [user, loading]);

  // Lidar com Redirecionamento de Recuperação de Senha (Web/PWA)
  useEffect(() => {
    const handleRecovery = async () => {
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        const hash = window.location.hash;
        const isRecoveryRedirect = hash && (hash.includes('type=recovery') || hash.includes('access_token='));
        
        if (isRecoveryRedirect) {
          console.log('🔄 Redirecionamento de recuperação detectado na URL');
          setIsRecoveringPassword(true);
          
          // Aguardar o Supabase processar a sessão e o navigator estar pronto
          const checkAndNavigate = () => {
            if (navigationRef.current?.isReady()) {
              console.log('🚀 Navegando para ResetPassword...');
              navigationRef.current?.navigate('ResetPassword');
            } else {
              setTimeout(checkAndNavigate, 100);
            }
          };
          
          checkAndNavigate();
        }
      }
    };
    handleRecovery();
  }, []);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Carregando...</Text>
      </View>
    );
  }

  return (
    <NavigationContainer ref={navigationRef}>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          animation: 'fade',
        }}
        initialRouteName={user ? 'Register' : 'Login'}
      >
        <Stack.Screen name="Login" component={LoginScreen} options={{ title: 'CCB | Login' }} />
        <Stack.Screen
          name="SignUp"
          component={SignUpScreen}
          options={{ title: 'CCB | Cadastro' }}
        />
        <Stack.Screen
          name="ForgotPassword"
          component={ForgotPasswordScreen}
          options={{ title: 'CCB | Recuperar Senha' }}
        />
        <Stack.Screen
          name="ResetPassword"
          component={ResetPasswordScreen}
          options={{ title: 'CCB | Redefinir Senha' }}
        />
        <Stack.Screen
          name="Register"
          component={RegisterScreen}
          options={{ title: 'CCB | Contagem EnR' }}
        />
        <Stack.Screen 
          name="EditRegistros" 
          component={EditRegistrosScreen} 
          options={{ title: 'CCB | Editar Registros' }}
        />
        <Stack.Screen
          name="EditRecordDetail"
          component={EditRecordDetailScreen}
          options={{ title: 'CCB | Editar Detalhes' }}
        />
        <Stack.Screen
          name="OrganistasEnsaio"
          component={OrganistasEnsaioScreen}
          options={{ title: 'CCB | Organistas no Ensaio' }}
        />
        <Stack.Screen
          name="OtrasLocalidades"
          component={OtrasLocalidadesScreen}
          options={{
            title: 'CCB | Outras Localidades',
            animation: 'slide_from_right',
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
  },
  loadingText: {
    marginTop: theme.spacing.md,
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
  },
});
