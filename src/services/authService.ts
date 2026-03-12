
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { supabase, isSupabaseConfigured } from './supabaseClient';
import { Usuario } from '../types/models';
import { userProfileService } from './userProfileService';
import {
  sanitizeInput,
  validateEmail,
  sanitizeForLogging,
  checkRateLimit,
  FIELD_LIMITS,
} from '../utils/securityUtils';

// Polyfill para web
const getSecureStore = () => {
  if (Platform.OS === 'web') {
    return {
      getItemAsync: async (key: string) => {
        try {
          return localStorage.getItem(key);
        } catch {
          return null;
        }
      },
      setItemAsync: async (key: string, value: string) => {
        try {
          localStorage.setItem(key, value);
        } catch (error) {
          console.warn('Erro ao salvar no localStorage:', error);
        }
      },
      deleteItemAsync: async (key: string) => {
        try {
          localStorage.removeItem(key);
        } catch (error) {
          console.warn('Erro ao remover do localStorage:', error);
        }
      },
    };
  }
  return SecureStore;
};

const SESSION_KEY = 'supabase_session';
const USER_KEY = 'supabase_user';

const secureStore = getSecureStore();

export interface AuthSession {
  access_token: string;
  refresh_token: string;
  expires_at?: number;
}

export const authService = {
  async signUp(
    email: string,
    password: string,
    nome?: string
  ): Promise<{ user: Usuario | null; error: Error | null }> {
    if (!isSupabaseConfigured() || !supabase) {
      console.error('❌ Supabase não configurado no signUp');
      return {
        user: null,
        error: new Error(
          'Supabase não está configurado. Configure as variáveis de ambiente SUPABASE_URL e SUPABASE_ANON_KEY.'
        ),
      };
    }

    // 🛡️ SEGURANÇA: Rate limiting
    const rateLimitCheck = checkRateLimit(email, 'auth');
    if (!rateLimitCheck.allowed) {
      return {
        user: null,
        error: new Error(
          rateLimitCheck.error || 'Muitas tentativas. Tente novamente em alguns instantes.'
        ),
      };
    }

    // 🛡️ SEGURANÇA: Validar e sanitizar inputs
    const emailValidation = validateEmail(email);
    if (!emailValidation.valid) {
      return {
        user: null,
        error: new Error(emailValidation.error || 'Email inválido'),
      };
    }

    const emailSanitizado = sanitizeInput(email.trim().toLowerCase(), {
      fieldType: 'email',
      maxLength: FIELD_LIMITS.email,
    });
    const nomeSanitizado = nome
      ? sanitizeInput(nome.trim(), { fieldType: 'nome', maxLength: FIELD_LIMITS.nome })
      : undefined;

    // 🛡️ SEGURANÇA: Validar senha (mínimo 6 caracteres - padrão Supabase)
    if (!password || password.length < 6) {
      return {
        user: null,
        error: new Error('A senha deve ter pelo menos 6 caracteres'),
      };
    }

    try {
      console.log('🔐 Chamando supabase.auth.signUp...');
      const { data, error } = await supabase.auth.signUp({
        email: emailSanitizado,
        password,
        options: {
          data: {
            nome: nomeSanitizado || '',
            full_name: nomeSanitizado || '',
          },
        },
      });

      // 🛡️ SEGURANÇA: Log sanitizado (sem dados sensíveis)
      console.log(
        '📡 Resposta do Supabase:',
        sanitizeForLogging({
          hasUser: !!data.user,
          hasSession: !!data.session,
          error: error?.message,
        })
      );

      if (error) {
        console.error('❌ Erro do Supabase:', error);
        return { user: null, error };
      }

      // Se não há erro mas também não há user, pode ser que o email precise ser confirmado
      if (!data.user) {
        console.warn('⚠️ Usuário criado mas precisa confirmar email');
        return {
          user: null,
          error: new Error('Um email de confirmação foi enviado. Verifique sua caixa de entrada.'),
        };
      }

      if (data.user) {
        console.log('✅ Usuário criado com sucesso:', data.user.id);
        console.log('📝 Nome recebido no signUp:', nome);
        console.log('📋 Metadados do usuário:', data.user.user_metadata);

        // 🛡️ SEGURANÇA: Sanitizar nome final
        const nomeFinalRaw =
          nomeSanitizado ||
          data.user.user_metadata?.nome ||
          data.user.user_metadata?.full_name ||
          data.user.user_metadata?.name ||
          undefined;
        const nomeFinal = nomeFinalRaw
          ? sanitizeInput(nomeFinalRaw, { fieldType: 'nome', maxLength: FIELD_LIMITS.nome })
          : undefined;

        console.log('✅ Nome final a ser salvo:', nomeFinal);

        // Aguardar um pouco para garantir que o trigger do Supabase criou o perfil
        await new Promise(resolve => setTimeout(resolve, 500));

        // 🚨 CRÍTICO: Configurar a sessão ANTES de atualizar o perfil para satisfazer o RLS do Supabase
        if (data.session) {
          await this.saveSession(data.session);
          console.log('🔑 Sessão configurada prematuramente para autorizar o upsert no profiles.');
        }

        console.log('🔍 [userProfileService] Buscando na tabela profiles para ID:', data.user.id);
        const result = await supabase
          .from('profiles')
          .select('id, email, name, role, created_at, updated_at')
          .eq('id', data.user.id)
          .single();
        
        console.log('🔍 [userProfileService] Resposta do Supabase profiles:', result.error ? 'Erro' : 'Sucesso', result.data || result.error);

        // Criar ou atualizar perfil na tabela profiles
        const { profile, error: profileError } = await userProfileService.createOrUpdateProfile(
          data.user.id,
          data.user.email || '',
          nomeFinal,
          data.user.user_metadata?.role || 'user'
        );

        if (profileError) {
          console.warn('⚠️ Erro ao criar perfil, mas usuário foi criado:', profileError);
        } else if (profile) {
          console.log('✅ Perfil criado/atualizado com sucesso:', {
            id: profile.id,
            email: profile.email,
            nome: profile.nome || profile.name,
            role: profile.role,
          });
        }

        // Usar dados do perfil se disponível, senão usar dados do auth
        let user: Usuario;

        if (profile) {
          user = userProfileService.profileToUsuario(profile)!;
          console.log('✅ Usuário criado a partir do perfil:', {
            id: user.id,
            email: user.email,
            nome: user.nome,
            role: user.role,
          });
        } else {
          user = {
            id: data.user.id,
            email: data.user.email || '',
            nome: nomeFinal || undefined,
            role: data.user.user_metadata?.role || 'user',
          };
          console.log('⚠️ Usuário criado sem perfil (usando metadados):', {
            id: user.id,
            email: user.email,
            nome: user.nome,
            role: user.role,
          });
        }

        if (data.session) {
          await secureStore.setItemAsync(USER_KEY, JSON.stringify(user));
        }

        return { user, error: null };
      }

      return { user: null, error: new Error('Erro ao criar conta') };
    } catch (error) {
      return { user: null, error: error as Error };
    }
  },

  async signIn(
    email: string,
    password: string
  ): Promise<{ user: Usuario | null; error: Error | null }> {
    if (!isSupabaseConfigured() || !supabase) {
      return {
        user: null,
        error: new Error(
          'Supabase não está configurado. Configure as variáveis de ambiente SUPABASE_URL e SUPABASE_ANON_KEY.'
        ),
      };
    }

    // 🛡️ SEGURANÇA: Rate limiting
    const rateLimitCheck = checkRateLimit(email, 'auth');
    if (!rateLimitCheck.allowed) {
      return {
        user: null,
        error: new Error(
          rateLimitCheck.error || 'Muitas tentativas. Tente novamente em alguns instantes.'
        ),
      };
    }

    // 🛡️ SEGURANÇA: Validar e sanitizar email
    const emailValidation = validateEmail(email);
    if (!emailValidation.valid) {
      return {
        user: null,
        error: new Error(emailValidation.error || 'Email inválido'),
      };
    }

    const emailSanitizado = sanitizeInput(email.trim().toLowerCase(), {
      fieldType: 'email',
      maxLength: FIELD_LIMITS.email,
    });

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: emailSanitizado,
        password,
      });

      if (error) {
        return { user: null, error };
      }

      if (data.user && data.session) {
        // Buscar perfil do usuário na tabela profiles
        const { profile, error: profileError } = await userProfileService.getProfile(data.user.id);

        if (profileError) {
          console.warn('Erro ao buscar perfil, usando dados do auth:', profileError);
        }

        // Usar dados do perfil se disponível, senão usar dados do auth
        let user: Usuario;

        if (profile) {
          user = userProfileService.profileToUsuario(profile)!;
          console.log('✅ Usuário carregado do perfil:', {
            id: user.id,
            email: user.email,
            nome: user.nome,
            role: user.role,
            isMaster: user.role === 'master' || user.role === 'admin',
          });
        } else {
          // Fallback: usar dados do auth ou metadados
          const nomeFromMetadata =
            data.user.user_metadata?.nome ||
            data.user.user_metadata?.full_name ||
            data.user.user_metadata?.name;

          // Normalizar role do metadata também
          let roleFromMetadata = data.user.user_metadata?.role || 'user';
          if (roleFromMetadata) {
            roleFromMetadata = String(roleFromMetadata).toLowerCase().trim();
          }

          user = {
            id: data.user.id,
            email: data.user.email || '',
            nome: nomeFromMetadata || undefined,
            role: roleFromMetadata,
          };

          console.log('⚠️ Usuário carregado do auth (sem perfil):', {
            id: user.id,
            email: user.email,
            nome: user.nome,
            role: user.role,
            roleFromMetadata: data.user.user_metadata?.role,
            isMaster: user.role === 'master' || user.role === 'admin',
          });

          // Se não há perfil mas temos sessão, tentar criar/atualizar o perfil
          // Isso garante que o role seja salvo corretamente
          if (data.session) {
            try {
              const { profile: newProfile } = await userProfileService.createOrUpdateProfile(
                data.user.id,
                data.user.email || '',
                nomeFromMetadata,
                roleFromMetadata
              );
              if (newProfile) {
                const updatedUser = userProfileService.profileToUsuario(newProfile);
                if (updatedUser) {
                  user = updatedUser;
                  console.log('✅ Perfil criado/atualizado após login:', {
                    id: user.id,
                    role: user.role,
                    isMaster: user.role === 'master' || user.role === 'admin',
                  });
                }
              }
            } catch (error) {
              console.warn('⚠️ Não foi possível criar/atualizar perfil após login:', error);
            }
          }
        }

        await this.saveSession(data.session);
        await secureStore.setItemAsync(USER_KEY, JSON.stringify(user));

        return { user, error: null };
      }

      return { user: null, error: new Error('Erro ao fazer login') };
    } catch (error) {
      return { user: null, error: error as Error };
    }
  },

  async resetPasswordForEmail(email: string): Promise<{ data: any; error: Error | null }> {
    if (!isSupabaseConfigured() || !supabase) {
      return { data: null, error: new Error('Supabase não configurado') };
    }

    const emailValidation = validateEmail(email);
    if (!emailValidation.valid) {
      return { data: null, error: new Error(emailValidation.error || 'Email inválido') };
    }

    const emailSanitizado = sanitizeInput(email.trim().toLowerCase(), {
      fieldType: 'email',
      maxLength: FIELD_LIMITS.email,
    });

    try {
      // Definir URL de redirecionamento (PWA/WEB)
      const redirectTo = Platform.OS === 'web' ? window.location.origin : undefined;

      const { data, error } = await supabase.auth.resetPasswordForEmail(emailSanitizado, {
        redirectTo,
      });

      return { data, error };
    } catch (error) {
      return { data: null, error: error as Error };
    }
  },

  async updatePassword(password: string): Promise<{ data: any; error: Error | null }> {
    if (!isSupabaseConfigured() || !supabase) {
      return { data: null, error: new Error('Supabase não configurado') };
    }

    if (!password || password.length < 6) {
      return { data: null, error: new Error('A senha deve ter pelo menos 6 caracteres') };
    }

    try {
      const { data, error } = await supabase.auth.updateUser({
        password: password,
      });

      return { data, error };
    } catch (error) {
      return { data: null, error: error as Error };
    }
  },

  async signOut(): Promise<void> {
    if (isSupabaseConfigured() && supabase) {
      await supabase.auth.signOut();
    }
    await secureStore.deleteItemAsync(SESSION_KEY);
    await secureStore.deleteItemAsync(USER_KEY);
  },

  onAuthStateChange(callback: (event: any, session: any) => void) {
    if (!isSupabaseConfigured() || !supabase) {
      return { data: { subscription: { unsubscribe: () => { } } } };
    }
    return supabase.auth.onAuthStateChange(callback);
  },

  async getUserProfile(userId: string) {
    console.log('🔍 [authService] getUserProfile para:', userId);
    // Importado dinamicamente para evitar dependência circular se houver
    const { userProfileService } = require('./userProfileService');
    console.log('🔍 [authService] Chamando userProfileService.getProfile...');
    const { profile } = await userProfileService.getProfile(userId);
    console.log('🔍 [authService] Perfil retornado:', !!profile);
    return profile;
  },

  async getCurrentUser(): Promise<Usuario | null> {
    console.log('🔍 [authService] getCurrentUser inicializado');
    try {
      // 🔑 PRIMEIRO: Tentar restaurar a sessão Supabase na memória usando tokens salvos
      // Isso é crítico para mobile/PWA onde o cliente Supabase perde a sessão após reload
      if (isSupabaseConfigured() && supabase) {
        try {
          const sessionStr = await secureStore.getItemAsync(SESSION_KEY);
          if (sessionStr) {
            const sessionData = JSON.parse(sessionStr);
            if (sessionData?.access_token && sessionData?.refresh_token) {
              // Verificar se a sessão Supabase já está ativa
              const { data: { session: existingSession } } = await supabase.auth.getSession();
              if (!existingSession || !existingSession.user) {
                // Sessão não está na memória - restaurar
                console.log('🔑 Restaurando sessão Supabase na inicialização...');
                const { data: { session: restored } } = await supabase.auth.setSession({
                  access_token: sessionData.access_token,
                  refresh_token: sessionData.refresh_token,
                }).catch(() => ({ data: { session: null } }));
                if (restored) {
                  console.log('✅ Sessão Supabase restaurada na inicialização');
                  // Atualizar tokens salvos com os novos tokens (já pode ter feito refresh)
                  if (restored.access_token !== sessionData.access_token) {
                    await secureStore.setItemAsync(SESSION_KEY, JSON.stringify({
                      access_token: restored.access_token,
                      refresh_token: restored.refresh_token,
                      expires_at: restored.expires_at,
                    }));
                  }
                } else {
                  console.warn('⚠️ Não foi possível restaurar sessão Supabase (token pode ter expirado)');
                }
              }
            }
          }
        } catch (sessionRestoreError) {
          console.warn('⚠️ Erro ao tentar restaurar sessão Supabase:', sessionRestoreError);
        }
      }

      // Buscar usuário do secure store
      const userStr = await secureStore.getItemAsync(USER_KEY);
      console.log('🔍 [authService] Usuário no secureStore:', userStr ? 'Encontrado' : 'Não encontrado');
      if (userStr) {
        try {
          const cachedUser = JSON.parse(userStr);

          // Se temos sessão válida, buscar perfil atualizado do Supabase
          const session = await this.getSession();
          console.log('🔍 [authService] Sessão atual para getCurrentUser:', !!session);
          if (session && isSupabaseConfigured() && supabase) {
            try {
              console.log('🔍 [authService] Chamando supabase.auth.getUser()...');
              const {
                data: { user: authUser },
              } = await supabase.auth.getUser();
              if (authUser) {
                console.log('🔍 [authService] Usuário auth encontrado:', authUser.id, 'Buscando perfil...');
                const { profile, error: profileError } = await userProfileService.getProfile(
                  authUser.id
                );

                if (profileError) {
                  console.warn('Erro ao buscar perfil atualizado:', profileError);
                }

                if (profile) {
                  const updatedUser = userProfileService.profileToUsuario(profile);
                  
                  // 🔄 SINCRONIZAÇÃO: Se o nome não estiver no metadado do Auth, salvar agora
                  // Isso garante que e-mails enviados pelo Supabase (como reset password) tenham o nome
                  try {
                    const nomeParaMetadata = profile.nome || profile.name;
                    if (nomeParaMetadata && !authUser.user_metadata?.nome) {
                      console.log('🔄 Sincronizando nome para user_metadata:', nomeParaMetadata);
                      await supabase.auth.updateUser({
                        data: { 
                          nome: nomeParaMetadata,
                          full_name: nomeParaMetadata 
                        }
                      }).catch(e => console.warn('Erro ao sincronizar metadata:', e));
                    }
                  } catch (syncError) {
                    console.warn('Erro silencioso na sincronização de metadata:', syncError);
                  }

                  if (updatedUser) {
                    console.log('✅ Perfil atualizado carregado:', {
                      id: updatedUser.id,
                      email: updatedUser.email,
                      nome: updatedUser.nome,
                      role: updatedUser.role,
                    });
                    await secureStore.setItemAsync(USER_KEY, JSON.stringify(updatedUser));
                    return updatedUser;
                  }
                } else {
                  console.warn('⚠️ Perfil não encontrado, usando cache');
                }
              }
            } catch (error) {
              console.warn('Erro ao buscar perfil atualizado, usando cache:', error);
            }
          }

          console.log('📦 Usando usuário do cache:', {
            id: cachedUser.id,
            email: cachedUser.email,
            nome: cachedUser.nome,
            role: cachedUser.role,
          });

          return cachedUser;
        } catch (parseError) {
          console.warn('Erro ao fazer parse do usuário:', parseError);
          // Limpar dados corrompidos
          await secureStore.deleteItemAsync(USER_KEY);
          return null;
        }
      }
      return null;
    } catch (error) {
      console.warn('Erro ao obter usuário atual:', error);
      return null;
    }
  },

  async getSession(): Promise<AuthSession | null> {
    try {
      const sessionStr = await secureStore.getItemAsync(SESSION_KEY);
      if (sessionStr) {
        try {
          return JSON.parse(sessionStr);
        } catch (parseError) {
          console.warn('Erro ao fazer parse da sessão:', parseError);
          // Limpar dados corrompidos
          await secureStore.deleteItemAsync(SESSION_KEY);
          return null;
        }
      }
      return null;
    } catch (error) {
      console.warn('Erro ao obter sessão:', error);
      return null;
    }
  },

  async saveSession(session: any): Promise<void> {
    const authSession: AuthSession = {
      access_token: session.access_token,
      refresh_token: session.refresh_token,
      expires_at: session.expires_at,
    };
    await secureStore.setItemAsync(SESSION_KEY, JSON.stringify(authSession));

    // Configurar o token no cliente Supabase se estiver configurado
    if (isSupabaseConfigured() && supabase) {
      await supabase.auth.setSession({
        access_token: session.access_token,
        refresh_token: session.refresh_token,
      });
    }
  },

  async refreshSession(): Promise<boolean> {
    if (!isSupabaseConfigured() || !supabase) {
      return false;
    }

    try {
      const session = await this.getSession();
      if (!session) {
        return false;
      }

      const { data, error } = await supabase.auth.refreshSession({
        refresh_token: session.refresh_token,
      });

      if (error || !data.session) {
        return false;
      }

      await this.saveSession(data.session);
      return true;
    } catch {
      return false;
    }
  },

  async isSessionValid(): Promise<boolean> {
    const session = await this.getSession();
    if (!session) {
      return false;
    }

    if (session.expires_at) {
      const now = Math.floor(Date.now() / 1000);
      if (now >= session.expires_at) {
        // Tentar renovar
        return await this.refreshSession();
      }
    }

    return true;
  },

  async clearSession(): Promise<void> {
    try {
      await secureStore.deleteItemAsync(SESSION_KEY);
      await secureStore.deleteItemAsync(USER_KEY);
      if (isSupabaseConfigured() && supabase) {
        await supabase.auth.signOut();
      }
    } catch (error) {
      console.warn('Erro ao limpar sessão:', error);
    }
  },
};
