import { useState, useEffect } from 'react';
import { authService } from '../services/authService';
import { userProfileService } from '../services/userProfileService';
import { Usuario } from '../types/models';
import { useInactivityTimeout } from './useInactivityTimeout';

export const useAuth = () => {
  const [user, setUser] = useState<Usuario | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRecoveringPassword, setIsRecoveringPassword] = useState(false);

  // Timeout de inatividade: 1 hora (3600000 ms)
  const handleInactivityTimeout = async () => {
    console.log('⏰ Timeout de inatividade - fazendo logout');
    await signOut();
  };

  useInactivityTimeout({
    timeout: 3600000, // 1 hora
    onTimeout: handleInactivityTimeout,
    enabled: !!user, // Só ativar se houver usuário logado
  });

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    try {
      const currentUser = await authService.getCurrentUser();
      setUser(currentUser);

      // Se não houver usuário autenticado, garantir que está null
      if (!currentUser) {
        setUser(null);
      }
    } catch (error) {
      console.error('Erro ao verificar usuário:', error);
      setUser(null);
    } finally {
      // Sempre definir loading como false, mesmo se houver erro
      setLoading(false);
    }
  };

  // Escutar eventos de autenticação (como recuperação de senha)
  useEffect(() => {
    const { data: { subscription } } = authService.onAuthStateChange(async (event, session) => {
      console.log(`🔔 [useAuth] Evento de Auth: ${event}`);
      
      if (event === 'PASSWORD_RECOVERY') {
        console.log('🔄 PASSWORD_RECOVERY detectado - redirecionando para ResetPassword');
        setIsRecoveringPassword(true);
      }
      
      if (event === 'SIGNED_IN' && session?.user) {
        // Buscar perfil de forma assíncrona sem bloquear o listener
        (async () => {
          try {
            const profile = await authService.getUserProfile(session.user.id);
            if (profile) {
              const mappedUser = userProfileService.profileToUsuario(profile);
              if (mappedUser) {
                setUser(mappedUser);
              }
            } else {
              setUser({
                id: session.user.id,
                email: session.user.email || '',
                role: session.user.user_metadata?.role || 'user',
              });
            }
          } catch (profileError) {
            console.warn('⚠️ Erro ao buscar perfil no listener de auth:', profileError);
          }
        })();
      }
 else if (event === 'SIGNED_OUT') {
        setUser(null);
        setIsRecoveringPassword(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    const { user: signedUser, error } = await authService.signIn(email, password);
    if (signedUser) {
      setUser(signedUser);
      setIsRecoveringPassword(false);
    }
    return { user: signedUser, error };
  };

  const signUp = async (email: string, password: string, nome?: string) => {
    const { user: signedUser, error } = await authService.signUp(email, password, nome);
    if (signedUser) {
      setUser(signedUser);
      setIsRecoveringPassword(false);
    }
    return { user: signedUser, error };
  };

  const signOut = async () => {
    try {
      await authService.signOut();
      setUser(null);
      setIsRecoveringPassword(false);
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
      // Mesmo com erro, limpar o estado do usuário
      setUser(null);
      setIsRecoveringPassword(false);
    }
  };

  const resetPasswordForEmail = async (email: string) => {
    return await authService.resetPasswordForEmail(email);
  };

  const updatePassword = async (password: string) => {
    return await authService.updatePassword(password);
  };

  return {
    user,
    loading,
    signIn,
    signUp,
    signOut,
    resetPasswordForEmail,
    updatePassword,
    isRecoveringPassword,
    setIsRecoveringPassword,
    isAuthenticated: !!user,
  };
};
