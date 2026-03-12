import { supabase, isSupabaseConfigured } from './supabaseClient';
import { Usuario } from '../types/models';

export interface UserProfile {
  id: string;
  email: string;
  name?: string; // Legado ou caso venha de provedores OAuth
  nome?: string; // Campo principal na tabela profiles (nome completo)
  role?: string;
  created_at?: string;
  updated_at?: string;
  // Campos legados (para compatibilidade)
}

export const userProfileService = {
  /**
   * Criar ou atualizar perfil do usuário na tabela profiles
   */
  async createOrUpdateProfile(
    userId: string,
    email: string,
    nome?: string,
    role?: string
  ): Promise<{ profile: UserProfile | null; error: Error | null }> {
    if (!isSupabaseConfigured() || !supabase) {
      return {
        profile: null,
        error: new Error(
          'Supabase não está configurado. Configure as variáveis de ambiente SUPABASE_URL e SUPABASE_ANON_KEY.'
        ),
      };
    }

    try {
      // Usar 'name' como campo principal na tabela profiles
      const result = await supabase
        .from('profiles')
        .upsert(
          {
            id: userId,
            email,
            name: nome || null,
            role: role || 'user',
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'id' }
        )
        .select()
        .single();

      if (result.error) {
        console.error('Erro ao criar/atualizar perfil:', result.error);
        return { profile: null, error: result.error };
      }

      return { profile: result.data, error: null };
    } catch (error) {
      console.error('Erro ao criar/atualizar perfil:', error);
      return { profile: null, error: error as Error };
    }
  },

  /**
   * Buscar perfil do usuário por ID
   */
  async getProfile(userId: string): Promise<{ profile: UserProfile | null; error: Error | null }> {
    if (!isSupabaseConfigured() || !supabase) {
      return {
        profile: null,
        error: new Error(
          'Supabase não está configurado. Configure as variáveis de ambiente SUPABASE_URL e SUPABASE_ANON_KEY.'
        ),
      };
    }

    try {
      console.log('🔍 [userProfileService] getProfile iniciado para:', userId);
      
      // Criar uma promise de timeout para não travar o app se o Supabase não responder
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout na consulta ao Supabase')), 12000)
      );

      // A query propriamente dita
      const queryPromise = (async () => {
        const result = await supabase!
          .from('profiles')
          .select('id, email, name, role, created_at, updated_at')
          .eq('id', userId)
          .single();
        return result;
      })();

      // Correr contra o relógio
      const result = await Promise.race([queryPromise, timeoutPromise]) as any;

      console.log('🔍 [userProfileService] Resposta do Supabase para getProfile:', result.error ? 'Erro' : 'Sucesso');
      if (result.error) {
        // Se o perfil não existe, não é um erro crítico
        if (result.error.code === 'PGRST116') {
          console.warn('⚠️ Perfil não encontrado para usuário:', userId);
          return { profile: null, error: null };
        }
        console.error('❌ Erro ao buscar perfil:', result.error);
        return { profile: null, error: result.error };
      }

      if (result.data) {
        console.log('✅ Perfil encontrado:', {
          id: result.data.id,
          email: result.data.email,
          nome: result.data.name || 'não definido', // Usando 'nome' como principal
          role: result.data.role || 'não definido',
        });

        // Retornar um objeto UserProfile construído com os dados
        return {
          profile: {
            id: result.data.id,
            email: result.data.email,
            nome: result.data.name || undefined, // Usando 'nome' como principal
            role: result.data.role || undefined,
            created_at: result.data.created_at || undefined,
            updated_at: result.data.updated_at || undefined,
          },
          error: null,
        };
      }

      return { profile: null, error: null }; // Caso result.data seja null (embora single() já trate isso)
    } catch (error) {
      console.error('❌ Erro ao buscar perfil:', error);
      return { profile: null, error: error as Error };
    }
  },

  /**
   * Converter UserProfile para Usuario
   * Usa name da tabela profiles (nome completo)
   */
  profileToUsuario(profile: UserProfile | null): Usuario | null {
    if (!profile) return null;

    // 🚨 CORREÇÃO: Usar name da tabela profiles (nome completo)
    const nome = profile.name || profile.nome || undefined;

    // Normalizar role: converter para lowercase e garantir que seja string
    let role = profile.role;
    if (role) {
      role = String(role).toLowerCase().trim();
    } else {
      role = 'user';
    }

    console.log('🔄 Convertendo perfil para Usuario:', {
      id: profile.id,
      email: profile.email,
      name: profile.name,
      nome: nome,
      roleOriginal: profile.role,
      roleNormalizado: role,
      isMaster: role === 'master' || role === 'admin',
    });

    return {
      id: profile.id,
      email: profile.email,
      nome: nome, // Pode ser undefined se não houver nome
      role: role, // Role normalizado
    };
  },
};
