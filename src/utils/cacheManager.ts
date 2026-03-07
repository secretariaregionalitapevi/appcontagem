/**
 * 🚀 Sistema de Cache com TTL para Otimização de Performance
 *
 * Gerencia cache de dados de referência (comuns, cargos, instrumentos)
 * com TTL configurável para reduzir queries desnecessárias ao Supabase
 */

import { robustGetItem, robustSetItem } from './robustStorage';
import { Platform } from 'react-native';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live em milissegundos
}

// 🚀 CONFIGURAÇÃO: TTL para diferentes tipos de dados
const CACHE_TTL = {
  comuns: 60 * 60 * 1000, // 1 hora (dados raramente mudam)
  cargos: 60 * 60 * 1000, // 1 hora (lista fixa)
  instrumentos: 60 * 60 * 1000, // 1 hora (lista fixa)
  pessoas: 5 * 60 * 1000, // 5 minutos (podem mudar mais frequentemente)
  default: 30 * 60 * 1000, // 30 minutos (padrão)
};

class CacheManager {
  private memoryCache: Map<string, CacheEntry<any>> = new Map();

  /**
   * Obter dados do cache (memória primeiro, depois localStorage)
   */
  async get<T>(key: string, type: keyof typeof CACHE_TTL = 'default'): Promise<T | null> {
    // 1. Tentar cache em memória primeiro (mais rápido)
    const memoryEntry = this.memoryCache.get(key);
    if (memoryEntry) {
      const now = Date.now();
      const age = now - memoryEntry.timestamp;
      if (age < memoryEntry.ttl) {
        // Cache válido
        return memoryEntry.data as T;
      } else {
        // Cache expirado, remover
        this.memoryCache.delete(key);
      }
    }

    // 2. Tentar localStorage (web) ou AsyncStorage (mobile)
    // 🚀 OTIMIZAÇÃO: Suportar mobile também (AsyncStorage via robustGetItem)
    try {
      const cached = await robustGetItem(`cache_${key}`);
      if (cached && cached !== 'null') {
        try {
          const entry: CacheEntry<T> = JSON.parse(cached);

          // 🚨 DEFESA: Se entry for null ou não tiver os campos necessários, descartar
          if (!entry || typeof entry !== 'object' || !('timestamp' in entry)) {
            console.warn(`⚠️ Cache ${key} corrompido ou nulo, ignorando`);
            return null;
          }

          const now = Date.now();
          const age = now - entry.timestamp;

          if (age < entry.ttl) {
            // Cache válido, também salvar em memória
            this.memoryCache.set(key, entry);
            return entry.data;
          } else {
            // Cache expirado, remover
            await robustSetItem(`cache_${key}`, null);
          }
        } catch (parseError) {
          console.warn(`⚠️ Erro ao parsear cache ${key}:`, parseError);
          return null;
        }
      }
    } catch (error) {
      console.warn(`⚠️ Erro ao ler cache ${key}:`, error);
    }

    return null;
  }

  /**
   * Salvar dados no cache
   */
  async set<T>(key: string, data: T, type: keyof typeof CACHE_TTL = 'default'): Promise<void> {
    const ttl = CACHE_TTL[type] || CACHE_TTL.default;
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl,
    };

    // Salvar em memória (sempre)
    this.memoryCache.set(key, entry);

    // Salvar em localStorage/AsyncStorage (persistente)
    // 🚀 OTIMIZAÇÃO: Suportar mobile também (AsyncStorage via robustSetItem)
    try {
      await robustSetItem(`cache_${key}`, JSON.stringify(entry));
    } catch (error) {
      console.warn(`⚠️ Erro ao salvar cache ${key}:`, error);
    }
  }

  /**
   * Invalidar cache (forçar refresh)
   */
  async invalidate(key: string): Promise<void> {
    this.memoryCache.delete(key);
    // 🚀 OTIMIZAÇÃO: Suportar mobile também
    try {
      await robustSetItem(`cache_${key}`, null);
    } catch (error) {
      console.warn(`⚠️ Erro ao invalidar cache ${key}:`, error);
    }
  }

  /**
   * Limpar todo o cache
   */
  async clear(): Promise<void> {
    this.memoryCache.clear();
    // Nota: Não limpar localStorage completamente (pode ter outros dados)
  }

  /**
   * Verificar se cache está válido
   */
  isValid(key: string): boolean {
    const entry = this.memoryCache.get(key);
    if (!entry) return false;

    const now = Date.now();
    const age = now - entry.timestamp;
    return age < entry.ttl;
  }
}

// Singleton
export const cacheManager = new CacheManager();
