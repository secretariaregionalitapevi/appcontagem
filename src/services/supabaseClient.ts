import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { env } from '../config/env';
import { authService } from './authService';

// Criar cliente Supabase apenas se as variáveis estiverem configuradas
let supabase: SupabaseClient | null = null;

try {
  if (env.SUPABASE_URL && env.SUPABASE_ANON_KEY) {
    supabase = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
      auth: {
        persistSession: false, // Vamos gerenciar a sessão manualmente com secure-store
        autoRefreshToken: true,
        detectSessionInUrl: false,
      },
    });
  } else {
    console.warn('⚠️ Supabase não configurado. Configure SUPABASE_URL e SUPABASE_ANON_KEY no .env');
  }
} catch (error) {
  console.error('Erro ao inicializar Supabase:', error);
}

// Função helper para garantir que a sessão está restaurada antes de fazer queries
export const ensureSessionRestored = async (): Promise<boolean> => {
  if (!supabase || !env.SUPABASE_URL || !env.SUPABASE_ANON_KEY) {
    return false;
  }

  try {
    // 🚨 CORREÇÃO: Verificar se já há sessão ativa primeiro
    const {
      data: { session: currentSession },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (currentSession && currentSession.user && !sessionError) {
      // Verificar se a sessão ainda é válida (não expirou)
      const expiresAt = currentSession.expires_at;
      if (expiresAt && expiresAt * 1000 > Date.now()) {
        return true; // Sessão válida
      }
    }

    // 🚨 CORREÇÃO: Tentar restaurar do authService apenas se não houver sessão válida
    try {
      const sessionData = await authService.getSession();

      if (sessionData && sessionData.access_token && sessionData.refresh_token) {
        // Tentar definir a sessão
        const {
          data: { session },
          error: setSessionError,
        } = await supabase.auth.setSession({
          access_token: sessionData.access_token,
          refresh_token: sessionData.refresh_token,
        });

        if (session && !setSessionError) {
          return true;
        }

        // 🚨 CORREÇÃO: Se o token expirou ou é inválido, tentar refresh APENAS se tiver refresh_token válido
        if (setSessionError && sessionData.refresh_token) {
          // Verificar se o refresh_token não está muito antigo (mais de 30 dias)
          const tokenAge = sessionData.expires_at ? Date.now() - sessionData.expires_at * 1000 : 0;
          const maxAge = 30 * 24 * 60 * 60 * 1000; // 30 dias em ms

          if (tokenAge < maxAge) {
            try {
              const {
                data: { session: refreshedSession },
                error: refreshError,
              } = await supabase.auth.refreshSession({
                refresh_token: sessionData.refresh_token,
              });

              if (refreshedSession && !refreshError) {
                // Salvar nova sessão
                await authService.saveSession({
                  access_token: refreshedSession.access_token,
                  refresh_token: refreshedSession.refresh_token,
                  expires_at: refreshedSession.expires_at,
                });
                return true;
              } else if (refreshError) {
                console.warn('⚠️ Erro ao fazer refresh da sessão:', refreshError.message);
                // Se o refresh falhou, limpar sessão inválida
                await authService.clearSession();
              }
            } catch (refreshErr) {
              console.warn('⚠️ Exceção ao fazer refresh da sessão:', refreshErr);
              await authService.clearSession();
            }
          } else {
            console.warn('⚠️ Refresh token muito antigo, limpando sessão');
            await authService.clearSession();
          }
        }
      }
    } catch (authServiceError) {
      console.warn('⚠️ Erro ao buscar sessão do authService:', authServiceError);
    }

    // 🚨 CORREÇÃO: Se não conseguiu restaurar, retornar false mas não bloquear operações
    // (RLS pode permitir algumas operações sem autenticação)
    return false;
  } catch (error) {
    console.warn('⚠️ Erro ao garantir restauração de sessão:', error);
    return false;
  }
};

// Exportar com fallback seguro
export { supabase };

// Função helper para verificar se Supabase está disponível
export const isSupabaseConfigured = (): boolean => {
  return supabase !== null && !!env.SUPABASE_URL && !!env.SUPABASE_ANON_KEY;
};
