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
import { useAuthContext } from '../context/AuthContext';
import { View, ActivityIndicator, StyleSheet, Text } from 'react-native';
import { theme } from '../theme';
import { localStorageService } from '../services/localStorageService';

const Stack = createNativeStackNavigator();

export const AppNavigator: React.FC = () => {
  const { user, loading } = useAuthContext();
  const navigationRef = useRef<any>(null);
  const previousUserRef = useRef<typeof user>(user);

  // Navegar para Login quando o usuário fizer logout
  useEffect(() => {
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
      if (!loading && navigationRef.current?.isReady()) {
        const localId = await localStorageService.getLocalEnsaio();
        
        if (!user || !localId) {
          console.log(`🛡️ [AppNavigator] Redirecionando para Login: user=${!!user}, localId=${!!localId}`);
          
          // Pequeno delay para garantir que o estado foi atualizado
          setTimeout(() => {
            try {
              navigationRef.current?.reset({
                index: 0,
                routes: [{ name: 'Login' }],
              });
            } catch (error) {
              console.warn('Erro ao navegar para Login:', error);
            }
          }, 100);
        }
      }
    };

    checkAuthAndLocal();
  }, [user, loading]);

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
