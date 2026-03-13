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

// Flag para evitar múltiplas tentativas de restauração simultâneas
let isRestoring = false;
let restorePromise: Promise<boolean> | null = null;

// Função helper para garantir que a sessão está restaurada antes de fazer queries
export const ensureSessionRestored = async (): Promise<boolean> => {
  if (!supabase || !env.SUPABASE_URL || !env.SUPABASE_ANON_KEY) {
    return false;
  }

  // Se já estiver restaurando, aguardar a promessa existente
  if (isRestoring && restorePromise) {
    return restorePromise;
  }

  isRestoring = true;
  restorePromise = (async () => {
    try {
      // 1. Verificar se já existe sessão ativa
      // getSession() é local e rápido. Se autoRefreshToken estiver ligado, Supabase cuidará do resto.
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (session && session.user && !error) {
        const expiresAt = session.expires_at;
        // Se a sessão for válida por mais de 30 segundos, não forçamos refresh manual
        // O autoRefreshToken do Supabase cuidará disso em background.
        if (expiresAt && expiresAt * 1000 > Date.now() + 30000) {
          return true;
        }

        // Se estiver quase expirando, vamos apenas tentar um getUser() que força validação leve
        // ou deixar o autoRefreshToken agir. Evitamos refreshSession manual pra não causar conflito de token reuse.
        console.log('🔄 Sessão próxima da expiração, notificando Supabase...');
      }

      // 2. Tentar restaurar do authService apenas se necessário (fallback para primeiro carregamento)
      try {
        const { authService } = require('./authService');
        const sessionData = await authService.getSession();
        
        if (sessionData?.access_token && sessionData?.refresh_token) {
          // Só definir se o cliente atual realmente estiver sem nada
          if (!session) {
            console.log('🔑 Restaurando sessão do authService (fallback)...');
            const { data: { session: restored }, error: setError } = await supabase.auth.setSession({
              access_token: sessionData.access_token,
              refresh_token: sessionData.refresh_token,
            });
            if (restored && !setError) return true;
          }
        }
      } catch (authError) {
        console.warn('⚠️ Erro ao restaurar do authService:', authError);
      }

      // Se chegamos aqui, apenas retornamos o estado atual do getSession
      const { data: { session: finalSession } } = await supabase.auth.getSession();
      return !!finalSession?.user;
    } catch (error) {
      console.warn('⚠️ Erro ao verificar sessão:', error);
      return false;
    } finally {
      isRestoring = false;
      restorePromise = null;
    }
  })();

  return restorePromise;
};

// Exportar com fallback seguro
export { supabase };

// Função helper para verificar se Supabase está disponível
export const isSupabaseConfigured = (): boolean => {
  return supabase !== null && !!env.SUPABASE_URL && !!env.SUPABASE_ANON_KEY;
};
