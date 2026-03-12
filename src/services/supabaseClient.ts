import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { env } from '../config/env';

// Criar cliente Supabase apenas se as variáveis estiverem configuradas
let supabase: SupabaseClient | null = null;

try {
  if (env.SUPABASE_URL && env.SUPABASE_ANON_KEY) {
    supabase = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,        // ✅ Deixar Supabase gerenciar sessão automaticamente
        autoRefreshToken: true,      // ✅ Renovar token antes de expirar
        detectSessionInUrl: true,    // ✅ Restaurar sessão de URL (OAuth callbacks)
        storageKey: 'supabase-auth', // Chave estável no localStorage/AsyncStorage
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
    // 1. Verificar se já existe sessão ativa (Supabase gerencia automaticamente com persistSession: true)
    const { data: { session }, error } = await supabase.auth.getSession();
    console.log('🔐 [ensureSessionRestored] Current session state:', {
      hasSession: !!session,
      hasUser: !!session?.user,
      error: error?.message
    });

    if (session && session.user && !error) {
      const expiresAt = session.expires_at;
      // Sessão válida por mais de 1 minuto
      if (expiresAt && expiresAt * 1000 > Date.now() + 60000) {
        return true;
      }
      // Sessão quase expirando ou expirada - tentar refresh
      console.log('🔄 Sessão expirando, fazendo refresh...');
      try {
        const { data: { session: refreshed }, error: refreshError } = await supabase.auth.refreshSession();
        if (refreshed && !refreshError) {
          console.log('✅ Sessão renovada com sucesso');
          // Salvar nova sessão no authService para consistência
          try {
            const { authService } = require('./authService');
            await authService.saveSession({
              access_token: refreshed.access_token,
              refresh_token: refreshed.refresh_token,
              expires_at: refreshed.expires_at,
            });
          } catch (_) { }
          return true;
        }
      } catch (_) { }
    }

    // 2. Nenhuma sessão ativa - tentar restaurar do authService (fallback)
    try {
      const { authService } = require('./authService');
      const sessionData = await authService.getSession();
      if (sessionData?.access_token && sessionData?.refresh_token) {
        console.log('🔑 Restaurando sessão do authService...');
        const { data: { session: restored }, error: setError } = await supabase.auth.setSession({
          access_token: sessionData.access_token,
          refresh_token: sessionData.refresh_token,
        });
        if (restored && !setError) {
          console.log('✅ Sessão restaurada do authService');
          return true;
        }
        // Se falhou, tentar refresh direto
        if (sessionData.refresh_token) {
          const { data: { session: refreshed2 }, error: refreshError2 } = await supabase.auth.refreshSession({
            refresh_token: sessionData.refresh_token,
          });
            if (refreshed2 && !refreshError2) {
              try {
                const { authService } = require('./authService');
                await authService.saveSession({
                  access_token: refreshed2.access_token,
                  refresh_token: refreshed2.refresh_token,
                  expires_at: refreshed2.expires_at,
                });
              } catch (_) { }
              return true;
            } else {
              // Refresh falhou - sessão inválida, limpar
              console.warn('⚠️ Refresh falhou, clearing stale session');
              const { authService } = require('./authService');
              await authService.clearSession().catch(() => { });
            }
        }
      }
    } catch (authError) {
      console.warn('⚠️ Erro ao restaurar do authService:', authError);
    }

    return false;
  } catch (error) {
    console.warn('⚠️ Erro ao verificar sessão:', error);
    return false;
  }
};

// Exportar com fallback seguro
export { supabase };

// Função helper para verificar se Supabase está disponível
export const isSupabaseConfigured = (): boolean => {
  return supabase !== null && !!env.SUPABASE_URL && !!env.SUPABASE_ANON_KEY;
};
