import { supabase, isSupabaseConfigured, ensureSessionRestored } from './supabaseClient';
import { Comum, Cargo, Instrumento, Pessoa, RegistroPresenca } from '../types/models';
import { getDatabase } from '../database/database';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { uuidv4 } from '../utils/uuid';
import { getNaipeByInstrumento } from '../utils/instrumentNaipe';
import {
  normalizarRegistroCargoFeminino,
  isCargoFemininoOrganista,
} from '../utils/normalizeCargoFeminino';
import { extractFirstAndLastName } from '../utils/userNameUtils';
import { normalizarNivel } from '../utils/normalizeNivel';
import {
  robustGetItem,
  robustSetItem,
  robustRemoveItem,
  initializeStorage,
  robustGetAllKeys,
} from '../utils/robustStorage';
import {
  normalizeForSearch,
  normalizeString,
  sanitizeString,
  isValidString,
} from '../utils/stringNormalization';
import {
  normalizeInstrumentoForSearch,
  expandInstrumentoSearch,
} from '../utils/normalizeInstrumento';
import { getDeviceInfo, logDeviceInfo, isXiaomiDevice } from '../utils/deviceDetection';
import { formatDate, formatTime } from '../utils/dateUtils';
import { cacheManager } from '../utils/cacheManager';
import { authService } from './authService';

// 🚨 FUNÇÃO AUXILIAR: Substituir vogais e Ç por wildcard _ para busca robusta a acentos
const buildAccentWildcard = (str: string): string => {
  if (!str) return '';
  return str.replace(/[AEIOUÁÉÍÓÚÂÊÎÔÛÃÕÄËÏÖÜCÇaeiouáéíóúâêîôûãõäëïöücç]/g, '_');
};

// 🚨 FUNÇÃO AUXILIAR: Verificar se é Secretário da Música (excluir) vs Secretário do GEM (incluir como instrutor)
const isSecretarioDaMusica = (cargo: string | undefined): boolean => {
  if (!cargo) return false;
  const cargoUpper = cargo.toUpperCase();
  return (
    cargoUpper.includes('SECRETÁRIO') &&
    cargoUpper.includes('MÚSICA') &&
    !cargoUpper.includes('GEM')
  );
};

// --- LOG FORENSE INICIAL ---

// Cache em memória para web (quando SQLite não está disponível)
const memoryCache: {
  comuns: Comum[];
  cargos: Cargo[];
  instrumentos: Instrumento[];
  pessoas: Pessoa[];
  registros: RegistroPresenca[];
} = {
  comuns: [],
  cargos: [],
  instrumentos: [],
  pessoas: [],
  registros: [],
};

// Flag global para evitar salvamentos simultâneos
let savingLock = false;
let lastSaveTimestamp = 0;
let lastSaveKey = '';

// Lista fixa de instrumentos do backup.js
const INSTRUMENTS_FIXED = [
  'ACORDEON',
  'VIOLINO',
  'VIOLA',
  'VIOLONCELO',
  'FLAUTA',
  'OBOÉ',
  "OBOÉ D'AMORE",
  'CORNE INGLÊS',
  'CLARINETE',
  'CLARINETE ALTO',
  'CLARINETE BAIXO (CLARONE)',
  'CLARINETE CONTRA BAIXO',
  'FAGOTE',
  'SAXOFONE SOPRANO (RETO)',
  'SAXOFONE SOPRANINO',
  'SAXOFONE ALTO',
  'SAXOFONE TENOR',
  'SAXOFONE BARÍTONO',
  'SAXOFONE BAIXO',
  'SAX OCTA CONTRABAIXO',
  'SAX HORN',
  'TROMPA',
  'TROMPETE',
  'CORNET',
  'FLUGELHORN',
  'TROMBONE',
  'TROMBONITO',
  'EUFÔNIO',
  'BARÍTONO (PISTO)',
  'TUBA',
];

// Lista fixa de cargos do backup.js (ordem exata do CARGOS_FIXED)
// 🚨 CORREÇÃO: Adicionar cargos do modal que não estavam na lista fixa
const CARGOS_FIXED = [
  'Músico',
  'Organista',
  'Candidato (a)',
  'Instrutor',
  'Instrutora',
  'Examinadora',
  'Encarregado Local',
  'Encarregado Regional',
  'Secretário da Música',
  'Secretária da Música',
  'Irmandade',
  'Ancião',
  'Diácono',
  'Cooperador do Ofício',
  'Cooperador de Jovens',
  'Porteiro (a)',
  'Bombeiro (a)',
  'Médico (a)',
  'Enfermeiro (a)',
];

export const supabaseDataService = {
  // Comuns - Buscar da tabela cadastro (seguindo lógica do app.js)
  async fetchComuns(): Promise<Comum[]> {
    if (!isSupabaseConfigured() || !supabase) {
      throw new Error('Supabase não está configurado');
    }

    try {
      console.log('📚 Buscando comuns da tabela cadastro (seguindo lógica do app.js)...');

      // Tentar buscar da tabela cadastro
      const tableName = 'cadastro';
      let allData: any[] = [];
      let hasMore = true;
      let currentPage = 0;
      const pageSize = 1000; // Supabase permite até 1000 por página
      let finalError: any = null;

      // Função simples para buscar uma página
      const fetchPage = async (
        table: string,
        page: number
      ): Promise<{ data: any[]; error: any; hasMore: boolean }> => {
        const from = page * pageSize;
        const to = from + pageSize - 1;

        try {
          // �� SIMPLIFICAÇÃO: Buscar apenas a coluna comum. 
          // O usuário confirmou que o banco foi limpo manualmente.
          const result = await supabase
            .from(table)
            .select('comum')
            .not('comum', 'is', null)
            .neq('comum', '')
            .order('comum', { ascending: true })
            .range(from, to);

          if (result.error) {
            return {
              data: [],
              error: result.error,
              hasMore: false,
            };
          }

          return {
            data: result.data || [],
            error: null,
            hasMore: (result.data?.length || 0) === pageSize,
          };
        } catch (error) {
          return {
            data: [],
            error: error as any,
            hasMore: false,
          };
        }
      };

      // Loop de busca (apenas na tabela cadastro)
      while (hasMore) {
        try {
          const pageResult = await fetchPage(tableName, currentPage);

          if (pageResult.error) {
            finalError = pageResult.error;
            break;
          }

          if (pageResult.data && pageResult.data.length > 0) {
            allData = allData.concat(pageResult.data);
            console.log(
              `📄 Página ${currentPage + 1}: ${pageResult.data.length} registros (total: ${allData.length})`
            );
          }

          hasMore = pageResult.hasMore;
          currentPage++;
        } catch (error) {
          console.error(`❌ Erro ao buscar página ${currentPage + 1}:`, error);
          finalError = error;
          break;
        }
      }

      if (finalError) {
        console.error('❌ Erro ao buscar comuns:', finalError);
        throw finalError;
      }

      if (allData.length === 0) {
        console.warn('⚠️ Nenhuma comum encontrada na tabela', tableName);
        return [];
      }

      console.log(`✅ Total de ${allData.length} registros encontrados na tabela ${tableName}`);

      // Função para extrair apenas o nome da comum (remover código de localização)
      const extrairNomeComum = (comumCompleto: string): string => {
        if (!comumCompleto) return '';
        if (comumCompleto.includes(' - ')) {
          const partes = comumCompleto.split(' - ');
          return partes.slice(1).join(' - ').trim();
        }
        if (comumCompleto.includes(' -')) {
          const partes = comumCompleto.split(' -');
          return partes.slice(1).join(' -').trim();
        }
        return comumCompleto.trim();
      };

      // --- LÓGICA DE DEDUPLICAÇÃO ROBUSTA POR CÓDIGO REGIONAL ---
      // Usar um Map para agrupar por Código Regional (ex: BR-22-1234)
      // Se não houver código, usar nome normalizado
      const mapComuns = new Map<string, { original: string; display: string }>();

      allData.forEach((record: any) => {
        const original = record.comum;
        if (original && typeof original === 'string') {
          const display = extrairNomeComum(original);

          // Tentar extrair código regional (ex: BR-22-1234)
          const matchCodigo = original.match(/BR-\d{2}-\d+/);
          const codigoKey = matchCodigo ? matchCodigo[0] : null;

          // Chave de unificação: Código Regional ou Nome Normalizado (se sem código)
          const key = codigoKey || normalizeString(display.toUpperCase());

          if (key) {
            const existing = mapComuns.get(key);

            // Lógica de Prioridade:
            // 1. Se não houver registro anterior, inserir.
            // 2. Se o novo nome for mais curto e o código for o mesmo, ele ganha (ex: "PEDRAS" ganha de "PEDRAS (CHACARA)")
            // 3. Se um tem código e o outro não, o com código ganha (se por acaso a chave for o nome)
            let isBetter = !existing;
            if (existing && codigoKey) {
              const displayNovo = display.trim();
              const displayVelho = existing.display.trim();

              // Se o novo nome for mais curto ou não tiver parênteses, é provavelmente mais "limpo"
              const temParentesesVelho = displayVelho.includes('(');
              const temParentesesNovo = displayNovo.includes('(');

              if (temParentesesVelho && !temParentesesNovo) {
                isBetter = true;
              } else if (!temParentesesVelho && !temParentesesNovo && displayNovo.length < displayVelho.length) {
                isBetter = true;
              }
            }

            if (isBetter) {
              mapComuns.set(key, { original, display });
            }
          }
        }
      });

      // Converter Map para formato Comum[] e ordenar
      const comuns: Comum[] = Array.from(mapComuns.values())
        .map((item, index) => ({
          id: `comum_${index + 1}_${item.display.toLowerCase().replace(/\s+/g, '_')}`,
          nome: item.original, // Nome completo (para o registro)
          displayName: item.display, // Nome limpo (para a lista)
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } as any))
        .sort((a, b) => a.displayName.localeCompare(b.displayName, 'pt-BR'));

      console.log(`✅ Retornando ${comuns.length} comuns únicas processadas da tabela ${tableName}`);
      if (comuns.length > 0) {
        console.log(`📋 Primeiras 5 comuns:`, comuns.slice(0, 5).map(c => c.displayName));
      }

      return comuns;
    } catch (error) {
      console.error('❌ Erro ao buscar comuns:', error);
      throw error;
    }
  },

  async syncComunsToLocal(): Promise<void> {
    try {
      console.log('🔄 Sincronizando comuns do Supabase para banco local...');
      const comuns = await this.fetchComuns();

      if (comuns.length === 0) {
        console.warn('⚠️ Nenhuma comum retornada do Supabase');
        return;
      }

      console.log(`✅ ${comuns.length} comuns recebidas do Supabase`);

      // Salvar no cache em memória (para web)
      memoryCache.comuns = comuns;

      // Salvar usando robustStorage (com fallbacks)
      try {
        await robustSetItem('cache_comuns_v3', JSON.stringify(comuns));
        console.log('✅ Comuns salvas no cache');
      } catch (error) {
        console.warn('⚠️ Erro ao salvar comuns no cache:', error);
      }

      // Tentar salvar no SQLite (para mobile)
      if (Platform.OS !== 'web') {
        try {
          const db = await getDatabase();
          await db.withTransactionAsync(async () => {
            for (const comum of comuns) {
              await db.runAsync(
                `INSERT OR REPLACE INTO comuns (id, nome, created_at, updated_at) VALUES (?, ?, ?, ?)`,
                [comum.id, comum.nome, comum.created_at || null, comum.updated_at || null]
              );
            }
          });
          console.log(`✅ ${comuns.length} comuns sincronizadas para banco local (mobile)`);
        } catch (error) {
          console.warn('⚠️ Erro ao salvar no SQLite (mobile):', error);
        }
      }
    } catch (error) {
      console.error('❌ Erro ao sincronizar comuns:', error);
      throw error;
    }
  },

  async getComunsFromLocal(): Promise<Comum[]> {
    // Para web, usar cache em memória ou AsyncStorage
    if (Platform.OS === 'web') {
      // Primeiro tentar cache em memória
      if (memoryCache.comuns.length > 0) {
        console.log(`✅ Retornando ${memoryCache.comuns.length} comuns do cache em memória`);
        return memoryCache.comuns;
      }

      // Tentar robustStorage
      try {
        const cached = await robustGetItem('cache_comuns_v3');
        if (cached) {
          const comuns = JSON.parse(cached);
          // Validar e sanitizar dados
          const validComuns = comuns
            .filter((c: any) => isValidString(c.id) && isValidString(c.nome))
            .map((c: any) => ({
              ...c,
              nome: sanitizeString(c.nome),
            }));

          memoryCache.comuns = validComuns;
          console.log(`✅ Retornando ${validComuns.length} comuns do cache robusto`);
          return validComuns;
        }
      } catch (error) {
        console.warn('⚠️ Erro ao ler do cache robusto:', error);
      }

      console.warn('⚠️ Nenhuma comum encontrada no cache (web)');
      return [];
    }

    // Para mobile, usar SQLite
    try {
      const db = await getDatabase();
      const result = (await db.getAllAsync('SELECT * FROM comuns ORDER BY nome')) as Comum[];
      return result;
    } catch (error) {
      console.warn('⚠️ Erro ao ler do SQLite:', error);
      return [];
    }
  },

  // Cargos - Usar lista fixa do backup.js
  async fetchCargos(): Promise<Cargo[]> {
    console.log('📚 Usando lista fixa de cargos do backup.js...');

    // Sempre usar lista fixa de cargos (seguindo lógica do backup.js)
    const cargos: Cargo[] = CARGOS_FIXED.map((nome, index) => {
      // Determinar se é cargo musical baseado no nome (apenas Músico e Organista)
      // Candidatos têm instrumento na tabela, mas não mostramos campo na UI
      const isMusical = nome === 'Músico' || nome === 'Organista';

      return {
        id: `cargo_${index + 1}_${nome.toLowerCase().replace(/\s+/g, '_').replace(/[()]/g, '')}`,
        nome: nome,
        is_musical: isMusical,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    });

    console.log(`✅ ${cargos.length} cargos da lista fixa`);

    // Salvar no cache em memória
    memoryCache.cargos = cargos;
    // Salvar usando robustStorage (com fallbacks)
    try {
      await robustSetItem('cached_cargos', JSON.stringify(cargos));
    } catch (error) {
      console.warn('⚠️ Erro ao salvar cargos no cache:', error);
    }

    return cargos;
  },

  async syncCargosToLocal(): Promise<void> {
    try {
      console.log('🔄 Sincronizando cargos (lista fixa)...');

      // Sempre usar lista fixa de cargos
      const cargos = await this.fetchCargos();

      if (cargos.length === 0) {
        console.warn('⚠️ Nenhum cargo retornado');
        return;
      }

      console.log(`✅ ${cargos.length} cargos da lista fixa`);

      // Salvar no cache em memória (para web)
      memoryCache.cargos = cargos;

      // Salvar usando robustStorage (com fallbacks)
      try {
        await robustSetItem('cached_cargos', JSON.stringify(cargos));
        console.log('✅ Cargos salvos no cache');
      } catch (error) {
        console.warn('⚠️ Erro ao salvar cargos no cache:', error);
      }

      // Tentar salvar no SQLite (para mobile)
      if (Platform.OS !== 'web') {
        try {
          const db = await getDatabase();
          await db.withTransactionAsync(async () => {
            for (const cargo of cargos) {
              await db.runAsync(
                `INSERT OR REPLACE INTO cargos (id, nome, is_musical, created_at, updated_at) VALUES (?, ?, ?, ?, ?)`,
                [
                  cargo.id,
                  cargo.nome,
                  cargo.is_musical ? 1 : 0,
                  cargo.created_at || null,
                  cargo.updated_at || null,
                ]
              );
            }
          });
          console.log(`✅ ${cargos.length} cargos sincronizados para banco local (mobile)`);
        } catch (error) {
          console.warn('⚠️ Erro ao salvar no SQLite (mobile):', error);
        }
      }
    } catch (error) {
      console.error('❌ Erro ao sincronizar cargos:', error);
      throw error;
    }
  },

  async getCargosFromLocal(): Promise<Cargo[]> {
    // Sempre retornar na ordem exata da lista fixa CARGOS_FIXED
    const cargosNaOrdem: Cargo[] = CARGOS_FIXED.map((nome, index) => {
      // Apenas Músico e Organista podem ter instrumento
      const isMusical = nome === 'Músico' || nome === 'Organista';
      return {
        id: `cargo_${index + 1}_${nome.toLowerCase().replace(/\s+/g, '_').replace(/[()]/g, '')}`,
        nome: nome,
        is_musical: isMusical,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    });

    // Para web, usar cache em memória ou AsyncStorage
    if (Platform.OS === 'web') {
      // Primeiro tentar cache em memória
      if (memoryCache.cargos.length > 0) {
        // Reordenar conforme lista fixa (manter ordem exata)
        const cargosOrdenados = CARGOS_FIXED.map(nome => {
          const cargo = memoryCache.cargos.find(c => c.nome === nome);
          return cargo || cargosNaOrdem.find(c => c.nome === nome)!;
        });
        console.log(`✅ Retornando ${cargosOrdenados.length} cargos do cache (ordem fixa)`);
        return cargosOrdenados;
      }

      // Tentar robustStorage
      try {
        const cached = await robustGetItem('cached_cargos');
        if (cached) {
          const cargos = JSON.parse(cached);
          // Validar e sanitizar dados
          const validCargos = cargos
            .filter((c: any) => isValidString(c.id) && isValidString(c.nome))
            .map((c: any) => ({
              ...c,
              nome: sanitizeString(c.nome),
            }));
          // Reordenar conforme lista fixa
          const cargosOrdenados = CARGOS_FIXED.map(nome => {
            const cargo = validCargos.find((c: any) => c.nome === nome);
            return cargo || cargosNaOrdem.find(c => c.nome === nome)!;
          });
          memoryCache.cargos = cargosOrdenados;
          console.log(`✅ Retornando ${cargosOrdenados.length} cargos do cache robusto`);
          return cargosOrdenados;
        }
      } catch (error) {
        console.warn('⚠️ Erro ao ler do cache robusto:', error);
      }

      console.log(`✅ Retornando ${cargosNaOrdem.length} cargos da lista fixa (ordem exata)`);
      return cargosNaOrdem;
    }

    // Para mobile, usar SQLite
    try {
      const db = await getDatabase();
      const result = (await db.getAllAsync('SELECT * FROM cargos')) as Cargo[];

      // Reordenar conforme lista fixa (manter ordem exata)
      const cargosOrdenados = CARGOS_FIXED.map(nome => {
        const cargo = result.find(c => c.nome === nome);
        return cargo || cargosNaOrdem.find(c => c.nome === nome)!;
      });

      return cargosOrdenados.map(c => ({ ...c, is_musical: (c as any).is_musical === 1 }));
    } catch (error) {
      console.warn('⚠️ Erro ao ler do SQLite, usando lista fixa:', error);
      return cargosNaOrdem;
    }
  },

  // Instrumentos
  async fetchInstrumentos(): Promise<Instrumento[]> {
    if (!isSupabaseConfigured() || !supabase) {
      throw new Error('Supabase não está configurado');
    }

    try {
      // Tentar buscar da tabela 'instrumentos'
      let result = await supabase.from('instrumentos').select('*').order('nome');

      if (result.error) {
        console.warn('⚠️ Erro ao buscar instrumentos da tabela instrumentos:', result.error);

        // Se a tabela não existir, tentar buscar da tabela cadastro/musicos_unificado
        console.log('🔄 Tentando buscar instrumentos da tabela cadastro...');

        // Tentar 'cadastro' primeiro
        let tableName = 'cadastro';
        let instrumentosData = await supabase
          .from(tableName)
          .select('instrumento')
          .not('instrumento', 'is', null)
          .neq('instrumento', '');

        if (
          instrumentosData.error ||
          !instrumentosData.data ||
          instrumentosData.data.length === 0
        ) {
          console.log('⚠️ Tabela cadastro não encontrada, tentando musicos_unificado...');
          tableName = 'musicos_unificado';
          instrumentosData = await supabase
            .from(tableName)
            .select('instrumento')
            .not('instrumento', 'is', null)
            .neq('instrumento', '');
        }

        if (instrumentosData.error) {
          console.error('❌ Erro ao buscar instrumentos:', instrumentosData.error);
          // Retornar lista padrão de instrumentos como fallback
          return this.getDefaultInstrumentos();
        }

        if (!instrumentosData.data || instrumentosData.data.length === 0) {
          console.warn('⚠️ Nenhum instrumento encontrado, usando lista padrão');
          return this.getDefaultInstrumentos();
        }

        // Extrair valores únicos e normalizar
        const instrumentosSet = new Set<string>();
        instrumentosData.data.forEach((record: any) => {
          const instrumento = record.instrumento;
          if (instrumento && typeof instrumento === 'string') {
            const instrumentoTrimmed = instrumento.trim();
            if (instrumentoTrimmed) {
              const instrumentoNormalizado = instrumentoTrimmed
                .toLowerCase()
                .replace(/(^.|[\s\-'.][a-z])/g, (m: string) => m.toUpperCase());
              instrumentosSet.add(instrumentoNormalizado);
            }
          }
        });

        const instrumentosArray = Array.from(instrumentosSet).sort((a, b) =>
          a.localeCompare(b, 'pt-BR')
        );

        console.log(
          `✅ ${instrumentosArray.length} instrumentos únicos encontrados na tabela ${tableName}`
        );

        // Converter para formato Instrumento[]
        const instrumentos: Instrumento[] = instrumentosArray.map((nome, index) => ({
          id: `instrumento_${index + 1}_${nome.toLowerCase().replace(/\s+/g, '_')}`,
          nome: nome,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }));

        return instrumentos;
      }

      return result.data || [];
    } catch (error) {
      console.error('❌ Erro ao buscar instrumentos:', error);
      // Retornar lista padrão em caso de erro
      return this.getDefaultInstrumentos();
    }
  },

  // Lista padrão de instrumentos do backup.js
  getDefaultInstrumentos(): Instrumento[] {
    return INSTRUMENTS_FIXED.map((nome, index) => ({
      id: `instrumento_${index + 1}_${nome.toLowerCase().replace(/\s+/g, '_')}`,
      nome: nome,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));
  },

  async syncInstrumentosToLocal(): Promise<void> {
    try {
      console.log('🔄 Sincronizando instrumentos...');

      // Sempre usar lista fixa de instrumentos do backup.js
      const instrumentos = this.getDefaultInstrumentos();

      console.log(`✅ ${instrumentos.length} instrumentos da lista fixa`);

      // Salvar no cache em memória (para web)
      memoryCache.instrumentos = instrumentos;

      // Salvar usando robustStorage (com fallbacks)
      try {
        await robustSetItem('cache_instrumentos', JSON.stringify(instrumentos));
        console.log('✅ Instrumentos salvos no cache');
      } catch (error) {
        console.warn('⚠️ Erro ao salvar instrumentos no cache:', error);
      }

      // Tentar salvar no SQLite (para mobile)
      if (Platform.OS !== 'web') {
        try {
          const db = await getDatabase();
          await db.withTransactionAsync(async () => {
            for (const instrumento of instrumentos) {
              await db.runAsync(
                `INSERT OR REPLACE INTO instrumentos (id, nome, created_at, updated_at) VALUES (?, ?, ?, ?)`,
                [
                  instrumento.id,
                  instrumento.nome,
                  instrumento.created_at || null,
                  instrumento.updated_at || null,
                ]
              );
            }
          });
          console.log(
            `✅ ${instrumentos.length} instrumentos sincronizados para banco local (mobile)`
          );
        } catch (error) {
          console.warn('⚠️ Erro ao salvar no SQLite (mobile):', error);
        }
      }
    } catch (error) {
      console.error('❌ Erro ao sincronizar instrumentos:', error);
      // Usar lista padrão mesmo em caso de erro
      const defaultInstrumentos = this.getDefaultInstrumentos();
      memoryCache.instrumentos = defaultInstrumentos;
    }
  },

  async getInstrumentosFromLocal(): Promise<Instrumento[]> {
    // Para web, usar cache em memória ou AsyncStorage
    if (Platform.OS === 'web') {
      // Primeiro tentar cache em memória
      if (memoryCache.instrumentos.length > 0) {
        console.log(
          `✅ Retornando ${memoryCache.instrumentos.length} instrumentos do cache em memória`
        );
        return memoryCache.instrumentos;
      }

      // Tentar robustStorage
      try {
        const cached = await robustGetItem('cache_instrumentos');
        if (cached) {
          const instrumentos = JSON.parse(cached);
          // Validar e sanitizar dados
          const validInstrumentos = instrumentos
            .filter((i: any) => isValidString(i.id) && isValidString(i.nome))
            .map((i: any) => ({
              ...i,
              nome: sanitizeString(i.nome),
            }));
          memoryCache.instrumentos = validInstrumentos;
          console.log(`✅ Retornando ${validInstrumentos.length} instrumentos do cache robusto`);
          return validInstrumentos;
        }
      } catch (error) {
        console.warn('⚠️ Erro ao ler do cache robusto:', error);
      }

      // Se não encontrou, usar lista padrão
      console.log('🔄 Usando lista padrão de instrumentos');
      const defaultInstrumentos = this.getDefaultInstrumentos();
      memoryCache.instrumentos = defaultInstrumentos;
      return defaultInstrumentos;
    }

    // Para mobile, usar SQLite
    try {
      const db = await getDatabase();
      const result = (await db.getAllAsync(
        'SELECT * FROM instrumentos ORDER BY nome'
      )) as Instrumento[];
      return result.length > 0 ? result : this.getDefaultInstrumentos();
    } catch (error) {
      console.warn('⚠️ Erro ao ler do SQLite, usando lista padrão:', error);
      // Retornar lista padrão em caso de erro
      return this.getDefaultInstrumentos();
    }
  },

  // Pessoas
  // REMOVIDO: fetchPessoas() - não existe tabela 'pessoas', usar fetchPessoasFromCadastro() ao invés

  async syncPessoasToLocal(): Promise<void> {
    // Não sincronizar pessoas - buscamos diretamente da tabela cadastro quando necessário
    console.log('ℹ️ Pessoas são buscadas diretamente da tabela cadastro quando necessário');
    return;
  },

  // Buscar pessoas da tabela cadastro (seguindo lógica do backupcont)
  async fetchPessoasFromCadastro(
    comumNome?: string,
    cargoNome?: string,
    instrumentoNome?: string
  ): Promise<any[]> {
    if (!isSupabaseConfigured() || !supabase) {
      throw new Error('Supabase não está configurado');
    }

    if (!comumNome || !cargoNome) {
      return [];
    }

    // 🚀 OTIMIZAÇÃO: Verificar cache primeiro (evitar queries repetidas)
    // 🚨 CORREÇÃO: Adicionar versão ao cache key para invalidar caches antigos quando a lógica mudar
    const CACHE_VERSION = 'v4'; // Incrementar para v4 para forçar refresh total
    const cacheKey = `pessoas_${CACHE_VERSION}_${comumNome}_${cargoNome}_${instrumentoNome || ''}`;
    const cached = await cacheManager.get<any[]>(cacheKey, 'pessoas');
    if (cached) {
      console.log(`✅ [fetchPessoasFromCadastro] Retornando ${cached.length} pessoas do cache`);

      // 🚨 CORREÇÃO CRÍTICA: Aplicar filtro de cargo também nos dados do cache
      // Isso garante que mesmo dados em cache sejam filtrados corretamente
      const cargoBusca = cargoNome.trim().toUpperCase();
      if (cargoBusca !== 'ORGANISTA' && cargoBusca !== 'MÚSICO' && !cargoBusca.includes('MÚSICO')) {
        const cargoBuscaNormalizado = normalizeString(cargoBusca.toUpperCase());
        const filteredCached = cached.filter((item: any) => {
          if (!item.cargo) return false;
          const itemCargoNormalizado = normalizeString(item.cargo.toUpperCase());

          // Verificar se o cargo do item corresponde exatamente ou contém o cargo buscado
          // Mas garantir que não seja substring de outro cargo conhecido
          if (itemCargoNormalizado === cargoBuscaNormalizado) return true;
          if (itemCargoNormalizado.includes(cargoBuscaNormalizado)) {
            // Verificar se não é substring de outro cargo conhecido
            const cargosConhecidos = [
              'ORGANISTA',
              'MÚSICO',
              'INSTRUTOR',
              'INSTRUTORA',
              'EXAMINADORA',
            ];
            const isSubstring = cargosConhecidos.some(
              c => c !== cargoBuscaNormalizado && c.includes(cargoBuscaNormalizado)
            );
            return !isSubstring;
          }
          return false;
        });

        console.log(
          `🔍 [fetchPessoasFromCadastro] Filtro aplicado no cache: ${cached.length} → ${filteredCached.length} resultados`
        );
        return filteredCached;
      }

      return cached;
    }

    try {
      // 🚀 OTIMIZAÇÃO: Restaurar sessão de forma rápida e não-bloqueante
      // Aguardar apenas o mínimo necessário (timeout de 500ms para resposta mais rápida)
      const sessionPromise = Promise.race([
        ensureSessionRestored(),
        new Promise(resolve => setTimeout(resolve, 500)), // Timeout de 500ms (reduzido de 2s)
      ]).catch(() => {
        // Se falhar, continuar mesmo assim
      });

      // Aguardar sessão rapidamente (com timeout) antes de fazer query
      await sessionPromise;

      // �� CORREÇÃO: Extrair apenas o nome da comum (sem código) e normalizar
      // O nome da comum pode vir como "BR-22-1804 - JARDIM LAVAPES DAS GRACAS" ou "BR-22-1804 JARDIM LAVAPES DAS GRACAS"
      // mas no banco pode estar apenas como "JARDIM LAVAPES DAS GRACAS" ou com acentos
      let comumBusca = comumNome.trim();

      // Extrair apenas o nome sem o código (using a função extrairNomeComum)
      // Tentar múltiplos formatos: "BR-XX-XXXX - NOME", "BR-XX-XXXX NOME", etc.
      if (comumBusca.includes(' - ') || comumBusca.includes(' -')) {
        const partes = comumBusca.split(/ - ?/);
        if (partes.length > 1) {
          comumBusca = partes.slice(1).join(' - ').trim();
        }
      } else if (/^BR-\d+-\d+\s/.test(comumBusca)) {
        // Formato: "BR-22-1804 JARDIM LAVAPES DAS GRACAS" (sem " - ")
        comumBusca = comumBusca.replace(/^BR-\d+-\d+\s+/, '').trim();
      }

      // Normalizar o nome da comum (remover acentos, normalizar espaços)
      // 🚨 CORREÇÃO: Normalizar espaços ANTES de converter para maiúscula para evitar problemas
      comumBusca = comumBusca.replace(/\s+/g, ' ').trim(); // Normalizar espaços primeiro
      comumBusca = normalizeString(comumBusca.toUpperCase()).replace(/\s+/g, ' ').trim(); // Garantir que não há espaços extras

      const cargoBusca = cargoNome.trim().toUpperCase();
      // 🚨 CORREÇÃO: Normalizar instrumento expandindo abreviações (ex: "RET" → "RETO")
      const instrumentoBusca = instrumentoNome
        ? normalizeInstrumentoForSearch(instrumentoNome.trim())
        : undefined;

      // Determinar se precisa de instrumento obrigatório (APENAS Músico)
      // Organista NÃO precisa de instrumento (sempre toca órgão)
      const precisaInstrumento = cargoBusca === 'MÚSICO';

      // Se precisa de instrumento mas não foi fornecido, retornar vazio
      if (precisaInstrumento && !instrumentoBusca) {
        console.log('⚠️ Cargo Músico requer instrumento');
        return [];
      }

      // Usar APENAS tabela cadastro (sem fallback para musicos_unificado)
      const tableName = 'cadastro';
      let allData: any[] = [];
      let hasMore = true;
      let currentPage = 0;
      // 🚀 OTIMIZAÇÃO: Aumentar pageSize para 2000 para reduzir número de queries (mais rápido)
      const pageSize = 2000; // Aumentado de 1000 para 2000
      let finalError: any = null;

      const fetchPage = async (
        table: string,
        page: number
      ): Promise<{ data: any[]; error: any; hasMore: boolean }> => {
        const from = page * pageSize;
        const to = from + pageSize - 1;

        // 🚨 CORREÇÃO CRÍTICA: Para SAXOFONE SOPRANO, fazer múltiplas queries e combinar resultados
        // (como o backupcont faz para garantir robustez)
        if (
          instrumentoBusca &&
          instrumentoBusca.includes('SAXOFONE') &&
          instrumentoBusca.includes('SOPRANO')
        ) {
          console.log('🔍 Buscando SAXOFONE SOPRANO com múltiplas variações...');

          // Criar queries separadas para cada variação (mais confiável que OR)
          const queries = [
            supabase
              .from(table)
              .select('nome, comum, cargo, instrumento, cidade, nivel')
              .ilike('comum', `%${buildAccentWildcard(comumBusca)}%`)
              .ilike('instrumento', '%SAXOFONE SOPRANO RET%')
              .order('nome', { ascending: true })
              .range(from, to),
            supabase
              .from(table)
              .select('nome, comum, cargo, instrumento, cidade, nivel')
              .ilike('comum', `%${buildAccentWildcard(comumBusca)}%`)
              .ilike('instrumento', '%SAXOFONE SOPRANO RETO%')
              .order('nome', { ascending: true })
              .range(from, to),
            supabase
              .from(table)
              .select('nome, comum, cargo, instrumento, cidade, nivel')
              .ilike('comum', `%${buildAccentWildcard(comumBusca)}%`)
              .ilike('instrumento', '%SAXOFONE SOPRANO (RETO)%')
              .order('nome', { ascending: true })
              .range(from, to),
            supabase
              .from(table)
              .select('nome, comum, cargo, instrumento, cidade, nivel')
              .ilike('comum', `%${buildAccentWildcard(comumBusca)}%`)
              .ilike('instrumento', '%SAX%RET%')
              .order('nome', { ascending: true })
              .range(from, to),
          ];

          // Executar todas as queries em paralelo
          const results = await Promise.all(queries);

          // Combinar resultados removendo duplicatas
          const combinedData: any[] = [];
          const seenNames = new Set<string>();

          results.forEach((result, idx) => {
            if (result.data && !result.error) {
              result.data.forEach((item: any) => {
                const key = `${item.nome}_${item.comum}`.toUpperCase();
                if (!seenNames.has(key)) {
                  seenNames.add(key);
                  combinedData.push(item);
                }
              });
            } else if (result.error) {
              console.warn(`⚠️ Erro na query ${idx + 1} para SAXOFONE SOPRANO:`, result.error);
            }
          });

          return {
            data: combinedData,
            error: null,
            hasMore: combinedData.length === pageSize,
          };
        }

        // Construir query base com filtro de comum (incluindo cidade e nivel - que é a classe da organista)
        // 🚨 CORREÇÃO CRÍTICA: Fazer múltiplas buscas para garantir que encontre mesmo com acentos diferentes
        // O Supabase ilike não normaliza acentos automaticamente, então precisamos buscar:
        // 1. Nome normalizado (sem acentos): "JARDIM LAVAPES DAS GRACAS"
        // 2. Nome original (com acentos): "JARDIM LAVAPÉS DAS GRAÇAS"
        // 3. Nome completo (com código): "BR-22-1804 - JARDIM LAVAPÉS DAS GRAÇAS"
        console.log('🔍 [fetchPessoasFromCadastro] Construindo query com:', {
          comumBuscaNormalizado: comumBusca,
          comumNomeOriginal: comumNome,
          cargoBusca: cargoBusca,
          cargoNome: cargoNome,
          tableName: table,
        });

        // Extrair nome sem código do nome original também (caso tenha acentos)
        let comumNomeSemCodigo = comumNome.trim();
        if (comumNomeSemCodigo.includes(' - ') || comumNomeSemCodigo.includes(' -')) {
          const partes = comumNomeSemCodigo.split(/ - ?/);
          if (partes.length > 1) {
            comumNomeSemCodigo = partes.slice(1).join(' - ').trim();
          }
        } else if (/^BR-\d+-\d+\s/.test(comumNomeSemCodigo)) {
          // Formato: "BR-22-1804 JARDIM LAVAPES DAS GRACAS" (sem " - ")
          comumNomeSemCodigo = comumNomeSemCodigo.replace(/^BR-\d+-\d+\s+/, '').trim();
        }

        // �� OTIMIZAÇÃO: Tentar apenas 1 query primeiro (mais rápida)
        // Se não encontrar, tentar as outras variações
        let combinedDataComum: any[] = [];
        const seenNames = new Set<string>();

        // Query 1: Nome normalizado (sem acentos) - mais comum
        // 🚀 OTIMIZAÇÃO: Aplicar filtros de cargo e instrumento diretamente na query para reduzir dados retornados
        let query1 = supabase
          .from(table)
          .select('nome, comum, cargo, instrumento, cidade, nivel')
          .ilike('comum', `%${comumBusca}%`);

        // Aplicar filtros diretamente na query (mais eficiente que filtrar depois)
        if (cargoBusca === 'ORGANISTA') {
          query1 = query1.ilike('instrumento', '%ÓRGÃO%');
        } else if (cargoBusca === 'MÚSICO' || cargoBusca.includes('MÚSICO')) {
          if (instrumentoBusca) {
            const variacoesBusca = expandInstrumentoSearch(instrumentoNome || '');
            if (variacoesBusca.length > 1) {
              const conditions = variacoesBusca.map(v => `instrumento.ilike.%${v}%`).join(',');
              query1 = query1.or(conditions);
            } else {
              query1 = query1.ilike('instrumento', `%${instrumentoBusca}%`);
            }
          } else {
            const isBuscandoSecretarioDaMusica = isSecretarioDaMusica(cargoNome);
            if (isBuscandoSecretarioDaMusica) {
              query1 = query1
                .ilike('cargo', '%SECRETÁRIO DA MÚSICA%')
                .or('cargo.ilike.%SECRETÁRIA DA MÚSICA%');
            } else {
              query1 = query1
                .ilike('cargo', '%MÚSICO%')
                .not('cargo', 'ilike', '%SECRETÁRIO DA MÚSICA%')
                .not('cargo', 'ilike', '%SECRETÁRIA DA MÚSICA%');
            }
          }
        } else {
          // 🚨 CORREÇÃO CRÍTICA: Para cargos específicos (Ancião, Diácono, etc), aplicar filtro de cargo
          query1 = query1.ilike('cargo', `%${cargoBusca}%`);
          console.log(`🔍 [fetchPessoasFromCadastro] Aplicando filtro de cargo: ${cargoBusca}`);
        }

        query1 = query1.order('nome', { ascending: true }).range(from, to);
        console.log(
          `🔍 [fetchPessoasFromCadastro] Query1 construída com filtro de cargo: ${cargoBusca}`
        );

        const result1 = await query1;

        if (result1.data && !result1.error && result1.data.length > 0) {
          // 🚀 OTIMIZAÇÃO: Se encontrou resultados na primeira query, usar apenas ela (mais rápido)
          // Retornar imediatamente sem tentar outras queries
          result1.data.forEach((item: any) => {
            const key = `${item.nome}_${item.comum}`.toUpperCase();
            if (!seenNames.has(key)) {
              seenNames.add(key);
              combinedDataComum.push(item);
            }
          });

          // 🚀 OTIMIZAÇÃO: Se encontrou resultados suficientes, retornar imediatamente
          // Evita queries de fallback desnecessárias
          if (combinedDataComum.length > 0) {
            // Aplicar filtro de cargo se necessário (já vem filtrado da query, mas garantir)
            let filteredData = combinedDataComum;
            if (
              cargoBusca !== 'ORGANISTA' &&
              cargoBusca !== 'MÚSICO' &&
              !cargoBusca.includes('MÚSICO')
            ) {
              const cargoBuscaNormalizado = normalizeString(cargoBusca.toUpperCase());
              filteredData = combinedDataComum.filter((item: any) => {
                if (!item.cargo) return false;
                const itemCargoNormalizado = normalizeString(item.cargo.toUpperCase());
                if (itemCargoNormalizado === cargoBuscaNormalizado) return true;
                if (itemCargoNormalizado.includes(cargoBuscaNormalizado)) {
                  const cargosConhecidos = [
                    'ORGANISTA',
                    'MÚSICO',
                    'INSTRUTOR',
                    'INSTRUTORA',
                    'EXAMINADORA',
                  ];
                  const isSubstring = cargosConhecidos.some(
                    c => c !== cargoBuscaNormalizado && c.includes(cargoBuscaNormalizado)
                  );
                  return !isSubstring;
                }
                return false;
              });
            }

            return {
              data: filteredData,
              error: null,
              hasMore: combinedDataComum.length === pageSize,
            };
          }
        } else {
          // Se não encontrou, tentar outras variações em paralelo (apenas se necessário)
          // 🚨 CORREÇÃO CRÍTICA: Aplicar filtro de cargo também nas queries de fallback
          const buildFallbackQuery = (comumFilter: string) => {
            let q = supabase
              .from(table)
              .select('nome, comum, cargo, instrumento, cidade, nivel')
              .ilike('comum', comumFilter);

            // Aplicar o mesmo filtro de cargo da query principal
            if (cargoBusca === 'ORGANISTA') {
              q = q.ilike('instrumento', '%ÓRGÃO%');
            } else if (cargoBusca === 'MÚSICO' || cargoBusca.includes('MÚSICO')) {
              if (instrumentoBusca) {
                const variacoesBusca = expandInstrumentoSearch(instrumentoNome || '');
                if (variacoesBusca.length > 1) {
                  const conditions = variacoesBusca.map(v => `instrumento.ilike.%${v}%`).join(',');
                  q = q.or(conditions);
                } else {
                  q = q.ilike('instrumento', `%${instrumentoBusca}%`);
                }
              } else {
                const isBuscandoSecretarioDaMusica = isSecretarioDaMusica(cargoNome);
                if (isBuscandoSecretarioDaMusica) {
                  q = q
                    .ilike('cargo', '%SECRETÁRIO DA MÚSICA%')
                    .or('cargo.ilike.%SECRETÁRIA DA MÚSICA%');
                } else {
                  q = q
                    .ilike('cargo', '%MÚSICO%')
                    .not('cargo', 'ilike', '%SECRETÁRIO DA MÚSICA%')
                    .not('cargo', 'ilike', '%SECRETÁRIA DA MÚSICA%');
                }
              }
            } else {
              // Para outros cargos (Ancião, Diácono, etc), aplicar filtro de cargo
              q = q.ilike('cargo', `%${cargoBusca}%`);
            }

            return q.order('nome', { ascending: true }).range(from, to);
          };


          const queriesComum = [
            buildFallbackQuery(`%${comumNomeSemCodigo.toUpperCase()}%`), // Nome original (com acentos)
            buildFallbackQuery(`%${comumNome.trim()}%`), // Nome completo (com código)
            // 🚨 CORREÇÃO CRÍTICA PARA ACENTOS: Busca com wildcards (_) onde há vogais ou C
            // Pois o banco pode ter CHÁCARA e a busca ser CHACARA (o ilike não ignora acentos sem extensão)
            buildFallbackQuery(`%${buildAccentWildcard(comumBusca)}%`),
            buildFallbackQuery(`%${buildAccentWildcard(comumNomeSemCodigo.toUpperCase())}%`),
          ];

          const resultsComum = await Promise.all(queriesComum);

          resultsComum.forEach(result => {
            if (result.data && !result.error) {
              result.data.forEach((item: any) => {
                const key = `${item.nome}_${item.comum}`.toUpperCase();
                if (!seenNames.has(key)) {
                  seenNames.add(key);
                  combinedDataComum.push(item);
                }
              });
            }
          });
        }

        // 🚀 OTIMIZAÇÃO: Se encontrou resultados, já vêm filtrados da query (mais eficiente)
        if (combinedDataComum.length > 0) {
          // 🚨 CORREÇÃO CRÍTICA: Filtrar resultados para garantir que apenas pessoas com o cargo correto sejam retornadas
          // Isso evita problemas como "ANCIÃO" aparecendo em "ORGANISTA"
          let filteredData = combinedDataComum;

          // Se não é ORGANISTA nem MÚSICO, fazer filtro adicional mais rigoroso
          if (
            cargoBusca !== 'ORGANISTA' &&
            cargoBusca !== 'MÚSICO' &&
            !cargoBusca.includes('MÚSICO')
          ) {
            const cargoBuscaNormalizado = normalizeString(cargoBusca.toUpperCase());
            filteredData = combinedDataComum.filter((item: any) => {
              if (!item.cargo) return false;
              const itemCargoNormalizado = normalizeString(item.cargo.toUpperCase());

              // Verificar se o cargo do item corresponde exatamente ou contém o cargo buscado
              // Mas garantir que não seja substring de outro cargo
              // Ex: "ANCIÃO" não deve aparecer em "ORGANISTA"
              if (itemCargoNormalizado === cargoBuscaNormalizado) return true;
              if (itemCargoNormalizado.includes(cargoBuscaNormalizado)) {
                // Verificar se não é substring de outro cargo conhecido
                const cargosConhecidos = [
                  'ORGANISTA',
                  'MÚSICO',
                  'INSTRUTOR',
                  'INSTRUTORA',
                  'EXAMINADORA',
                ];
                const isSubstring = cargosConhecidos.some(
                  c => c !== cargoBuscaNormalizado && c.includes(cargoBuscaNormalizado)
                );
                return !isSubstring;
              }
              return false;
            });

            console.log(
              `🔍 [fetchPessoasFromCadastro] Filtro adicional aplicado: ${combinedDataComum.length} → ${filteredData.length} resultados`
            );
          }

          return {
            data: filteredData,
            error: null,
            hasMore: combinedDataComum.length === pageSize,
          };
        }

        // 🚨 DEBUG: Fazer uma busca mais ampla apenas se realmente não encontrou nada
        // 🚀 OTIMIZAÇÃO: Só fazer busca de teste se realmente necessário (evita query extra)
        try {
          // Busca rápida com parte do nome (mais eficiente que buscar tudo)
          const testQuery = supabase
            .from(table)
            .select('comum')
            .ilike('comum', `%${comumBusca.slice(0, 10)}%`) // Primeiros 10 caracteres
            .limit(5); // Apenas 5 resultados para verificar

          const testResult = await testQuery;
          const amostraComuns = testResult.data?.map((item: any) => item.comum) || [];

          // 🚨 CORREÇÃO: Se encontrou resultados, usar o nome EXATO do banco para buscar
          if (testResult.data && testResult.data.length > 0) {
            // Encontrar a comum que corresponde (pode ter código ou não, com ou sem acentos)
            // Normalizar ambos os lados para comparação robusta
            const comumBuscaNormalizado = normalizeString(comumBusca.toUpperCase());
            const comumNomeNormalizado = normalizeString(comumNome.toUpperCase());

            const comumEncontrada = amostraComuns.find((c: string) => {
              if (!c) return false;

              const cUpper = c.toUpperCase().trim();
              const cNormalizado = normalizeString(cUpper);

              // Extrair apenas o nome da comum (sem código) para comparação
              let cNomeSemCodigo = cUpper;
              if (cNomeSemCodigo.includes(' - ')) {
                const partes = cNomeSemCodigo.split(' - ');
                if (partes.length > 1) {
                  cNomeSemCodigo = partes.slice(1).join(' - ').trim();
                }
              } else if (/^BR-\d+-\d+\s/.test(cNomeSemCodigo)) {
                cNomeSemCodigo = cNomeSemCodigo.replace(/^BR-\d+-\d+\s+/, '').trim();
              }
              const cNomeSemCodigoNormalizado = normalizeString(cNomeSemCodigo);

              // Comparar de múltiplas formas:
              // 1. Nome normalizado sem código
              if (cNomeSemCodigoNormalizado === comumBuscaNormalizado) return true;
              if (cNomeSemCodigoNormalizado.includes(comumBuscaNormalizado)) return true;
              if (comumBuscaNormalizado.includes(cNomeSemCodigoNormalizado)) return true;

              // 2. Nome completo normalizado
              if (cNormalizado.includes(comumNomeNormalizado)) return true;
              if (comumNomeNormalizado.includes(cNormalizado)) return true;

              // 3. Comparação direta (case-insensitive)
              if (cUpper.includes(comumBusca.toUpperCase())) return true;
              if (cUpper.includes(comumNome.toUpperCase())) return true;

              return false;
            });

            if (comumEncontrada) {
              // Fazer busca com o nome EXATO do banco (sem normalizar)
              let queryExata = supabase
                .from(table)
                .select('nome, comum, cargo, instrumento, cidade, nivel')
                .ilike('comum', `%${comumEncontrada}%`);

              // 🚨 CORREÇÃO CRÍTICA: Aplicar filtro de cargo ANTES de order e range
              // 🚨 CORREÇÃO: Verificar se está buscando especificamente por "Secretário da Música"
              const isBuscandoSecretarioDaMusica = isSecretarioDaMusica(cargoNome);

              // Aplicar filtros de cargo e instrumento
              let queryFinal = queryExata;
              if (cargoBusca === 'ORGANISTA') {
                queryFinal = queryFinal.ilike('instrumento', '%ÓRGÃO%');
              } else if (cargoBusca === 'MÚSICO' || cargoBusca.includes('MÚSICO')) {
                if (instrumentoBusca) {
                  // 🚨 CORREÇÃO CRÍTICA: Quando busca por instrumento (ex: Músico + Violino),
                  // buscar APENAS por instrumento, SEM filtrar por cargo.
                  // Isso garante que TODOS que tocam aquele instrumento apareçam, incluindo:
                  // Músicos, Instrutores, Encarregados, Secretário do GEM, Secretário da Música, etc.
                  // O cargo real será capturado do banco de dados quando o registro for salvo.
                  const variacoesBusca = expandInstrumentoSearch(instrumentoNome || '');
                  if (variacoesBusca.length > 1) {
                    const conditions = variacoesBusca
                      .map(v => `instrumento.ilike.%${v}%`)
                      .join(',');
                    queryFinal = queryFinal.or(conditions);
                  } else {
                    queryFinal = queryFinal.ilike('instrumento', `%${instrumentoBusca}%`);
                  }
                  // NÃO aplicar filtro de cargo aqui - buscar apenas por instrumento
                } else {
                  // 🚨 CORREÇÃO: Se está buscando Secretário da Música, buscar diretamente por esse cargo
                  if (isBuscandoSecretarioDaMusica) {
                    queryFinal = queryFinal
                      .ilike('cargo', '%SECRETÁRIO DA MÚSICA%')
                      .or('cargo.ilike.%SECRETÁRIA DA MÚSICA%');
                  } else {
                    // Caso contrário, excluir apenas Secretário da Música, mas incluir Secretário do GEM (tratado como Instrutor)
                    queryFinal = queryFinal
                      .ilike('cargo', '%MÚSICO%')
                      .not('cargo', 'ilike', '%SECRETÁRIO DA MÚSICA%')
                      .not('cargo', 'ilike', '%SECRETÁRIA DA MÚSICA%');
                  }
                }
              } else {
                // 🚨 CORREÇÃO CRÍTICA: Para cargos específicos (Ancião, Diácono, etc), aplicar filtro de cargo
                queryFinal = queryFinal.ilike('cargo', `%${cargoBusca}%`);
              }

              // Aplicar order e range após os filtros
              queryFinal = queryFinal.order('nome', { ascending: true }).range(from, to);

              const resultExato = await queryFinal;

              if (resultExato.data && resultExato.data.length > 0) {
                return {
                  data: resultExato.data || [],
                  error: resultExato.error,
                  hasMore: (resultExato.data?.length || 0) === pageSize,
                };
              }
            }
          }
        } catch (testError) {
          // Ignorar erro na busca de teste (não crítico)
        }

        // Se não encontrou com múltiplas queries, tentar query única como fallback
        let query = supabase
          .from(table)
          .select('nome, comum, cargo, instrumento, cidade, nivel')
          .ilike('comum', `%${comumBusca}%`)
          .order('nome', { ascending: true });

        // 🚨 CORREÇÃO: Verificar se está buscando especificamente por "Secretário da Música"
        const isBuscandoSecretarioDaMusica = isSecretarioDaMusica(cargoNome);

        // Aplicar filtros de cargo e instrumento diretamente na query (seguindo lógica do app.js)
        if (cargoBusca === 'ORGANISTA') {
          // Para organista, busca por instrumento ÓRGÃO para retornar todas as organistas
          // (incluindo instrutoras, examinadoras, secretárias da música)
          // Isso permite que ao selecionar um nome, o cargo real seja capturado do banco
          query = query.ilike('instrumento', '%ÓRGÃO%');
        } else if (cargoBusca === 'MÚSICO' || cargoBusca.includes('MÚSICO')) {
          // 🚨 CORREÇÃO CRÍTICA: Quando busca por instrumento (ex: Músico + Violino),
          // buscar APENAS por instrumento, SEM filtrar por cargo.
          // Isso garante que TODOS que tocam aquele instrumento apareçam, incluindo:
          // Músicos, Instrutores, Encarregados, Secretário do GEM, Secretário da Música, etc.
          // O cargo real será capturado do banco de dados quando o registro for salvo.
          if (instrumentoBusca) {
            // Para outros instrumentos, criar variações de busca
            const variacoesBusca = expandInstrumentoSearch(instrumentoNome || '');

            if (variacoesBusca.length > 1) {
              // Criar condições OR para todas as variações
              const conditions = variacoesBusca.map(v => `instrumento.ilike.%${v}%`).join(',');
              query = query.or(conditions);
            } else {
              query = query.ilike('instrumento', `%${instrumentoBusca}%`);
            }
            // NÃO aplicar filtro de cargo aqui - buscar apenas por instrumento
          } else {
            // Se não tem instrumento, buscar apenas por cargo MÚSICO
            // 🚨 CORREÇÃO: Se está buscando Secretário da Música, buscar diretamente por esse cargo
            if (isBuscandoSecretarioDaMusica) {
              query = query
                .ilike('cargo', '%SECRETÁRIO DA MÚSICA%')
                .or('cargo.ilike.%SECRETÁRIA DA MÚSICA%');
            } else {
              // Caso contrário, excluir apenas Secretário da Música, mas incluir Secretário do GEM (tratado como Instrutor)
              query = query
                .ilike('cargo', '%MÚSICO%')
                .not('cargo', 'ilike', '%SECRETÁRIO DA MÚSICA%')
                .not('cargo', 'ilike', '%SECRETÁRIA DA MÚSICA%');
            }
          }
        } else {
          // 🚨 CORREÇÃO CRÍTICA: Para outros cargos (Ancião, Diácono, etc), filtrar por cargo
          query = query.ilike('cargo', `%${cargoBusca}%`);
        }

        // Aplicar order e range para paginação
        query = query.order('nome', { ascending: true });
        const result = await query.range(from, to);

        return {
          data: result.data || [],
          error: result.error,
          hasMore: (result.data?.length || 0) === pageSize,
        };
      };

      // Buscar todas as páginas da tabela cadastro
      while (hasMore) {
        try {
          const pageResult = await fetchPage(tableName, currentPage);

          if (pageResult.error) {
            finalError = pageResult.error;
            console.error('❌ Erro ao buscar da tabela cadastro:', pageResult.error);
            break;
          }

          if (pageResult.data && pageResult.data.length > 0) {
            allData = allData.concat(pageResult.data);
            console.log(
              `📄 Página ${currentPage + 1}: ${pageResult.data.length} registros (total: ${allData.length})`
            );
          }

          hasMore = pageResult.hasMore;
          currentPage++;
        } catch (error) {
          finalError = error;
          console.error('❌ Erro ao buscar página:', error);
          break;
        }
      }

      // 🚨 CORREÇÃO CRÍTICA: Se houve erro na busca (ex: timeout de rede), lançar exceção
      // para que getPessoasFromLocal acione o fallback do SQLite.
      if (finalError && allData.length === 0) {
        throw finalError;
      }

      if (allData.length === 0) {
        console.log('⚠️ Nenhuma pessoa encontrada');
        return [];
      }

      console.log(`✅ Total de ${allData.length} registros encontrados na tabela ${tableName}`);

      // 🚨 CORREÇÃO CRÍTICA: Filtrar por cargo de forma mais precisa antes de remover duplicatas
      // Isso evita problemas como "ANCIÃO" aparecendo em "ORGANISTA"
      let dataFiltrada = allData;
      if (cargoBusca !== 'ORGANISTA' && cargoBusca !== 'MÚSICO' && !cargoBusca.includes('MÚSICO')) {
        const cargoBuscaNormalizado = normalizeString(cargoBusca.toUpperCase());
        dataFiltrada = allData.filter((item: any) => {
          if (!item.cargo) return false;
          const itemCargoNormalizado = normalizeString(item.cargo.toUpperCase());

          // Verificar se o cargo do item corresponde exatamente ou contém o cargo buscado
          // Mas garantir que não seja substring de outro cargo
          if (itemCargoNormalizado === cargoBuscaNormalizado) return true;
          if (itemCargoNormalizado.includes(cargoBuscaNormalizado)) {
            // Verificar se não é substring de outro cargo conhecido
            const cargosConhecidos = [
              'ORGANISTA',
              'MÚSICO',
              'INSTRUTOR',
              'INSTRUTORA',
              'EXAMINADORA',
            ];
            const isSubstring = cargosConhecidos.some(
              c => c !== cargoBuscaNormalizado && c.includes(cargoBuscaNormalizado)
            );
            return !isSubstring;
          }
          return false;
        });

        console.log(
          `🔍 [fetchPessoasFromCadastro] Filtro de cargo aplicado: ${allData.length} → ${dataFiltrada.length} resultados`
        );
      }

      // Remover duplicatas baseado em nome + comum
      const uniqueMap = new Map<string, any>();
      dataFiltrada.forEach(r => {
        const nomeCompleto = (r.nome || '').trim();
        const comum = (r.comum || '').trim();
        const key = `${nomeCompleto}_${comum}`;
        if (!uniqueMap.has(key)) {
          uniqueMap.set(key, r);
        }
      });

      const uniqueData = Array.from(uniqueMap.values());
      console.log(`✅ ${uniqueData.length} pessoas únicas após remover duplicatas`);

      // 🚀 OTIMIZAÇÃO: Salvar no cache para próximas consultas
      await cacheManager.set(cacheKey, uniqueData, 'pessoas');
      console.log(`💾 [fetchPessoasFromCadastro] Cache salvo para chave: ${cacheKey}`);

      return uniqueData;
    } catch (error) {
      console.error('❌ Erro ao buscar pessoas da tabela cadastro:', error);
      throw error;
    }
  },

  // Buscar candidatos da tabela candidatos (CÓPIA EXATA de fetchPessoasFromCadastro, só muda a tabela)
  async fetchCandidatosFromSupabase(comumNome?: string): Promise<any[]> {
    if (!isSupabaseConfigured() || !supabase) {
      throw new Error('Supabase não está configurado');
    }

    if (!comumNome) {
      return [];
    }

    try {
      // 🚨 CORREÇÃO CRÍTICA: Garantir que sessão está restaurada antes de buscar (RLS requer autenticação)
      const sessionRestaurada = await ensureSessionRestored();

      // Verificar autenticação após restaurar
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();
      console.log('🔐 Verificação de autenticação:', {
        user: user ? { id: user.id, email: user.email } : null,
        authError: authError?.message,
        hasUser: !!user,
        sessionRestaurada,
      });

      // Se ainda não há usuário autenticado, logar aviso mas continuar (RLS pode permitir)
      if (!user) {
        console.warn(
          '⚠️ Nenhum usuário autenticado encontrado. Verifique se RLS permite acesso sem autenticação.'
        );
      }

      console.log('📚 Buscando candidatos da tabela candidatos:', {
        comumNome,
        comumNomeLength: comumNome?.length,
        comumNomeTrimmed: comumNome?.trim(),
      });

      // Normalizar valores para busca (EXATAMENTE como fetchPessoasFromCadastro)
      const comumBusca = comumNome.trim();
      console.log('🔍 comumBusca normalizado:', comumBusca);

      // ÚNICA DIFERENÇA: usar tabela candidatos ao invés de cadastro
      const tableName = 'candidatos';
      let allData: any[] = [];
      let hasMore = true;
      let currentPage = 0;
      const pageSize = 1000;
      let finalError: any = null;

      const fetchPage = async (
        table: string,
        page: number
      ): Promise<{ data: any[]; error: any; hasMore: boolean }> => {
        const from = page * pageSize;
        const to = from + pageSize - 1;

        // Construir query base com filtro de comum
        // Tentar busca flexível: com e sem hífen (formato pode variar)
        const comumBuscaSemHifen = comumBusca.replace(/\s*-\s*/g, ' ').trim();
        const comumBuscaComHifen = comumBusca.includes(' - ')
          ? comumBusca
          : comumBusca.replace(/\s+/, ' - ');

        console.log(`🔍 Query página ${page + 1}:`, {
          comumBuscaOriginal: comumBusca,
          comumBuscaSemHifen,
          comumBuscaComHifen,
        });

        // Tentar busca com formato flexível (com OU sem hífen)
        // A tabela candidatos tem apenas 'instrumento' (texto), não 'instrumento_id'
        // 🚨 CORREÇÃO: Buscar também o campo 'cargo' e 'nivel' para usar os valores reais do banco
        let query = supabase
          .from(table)
          .select('nome, comum, cidade, instrumento, cargo, nivel')
          .or(
            `comum.ilike.%${comumBusca}%,comum.ilike.%${comumBuscaSemHifen}%,comum.ilike.%${comumBuscaComHifen}%`
          )
          .order('nome', { ascending: true });

        // Aplicar range para paginação
        const result = await query.range(from, to);

        console.log(`📊 Resultado query página ${page + 1}:`, {
          dataLength: result.data?.length || 0,
          error: result.error,
          sampleData: result.data?.slice(0, 3).map((c: any) => ({
            nome: c.nome,
            comum: c.comum,
          })),
        });

        return {
          data: result.data || [],
          error: result.error,
          hasMore: (result.data?.length || 0) === pageSize,
        };
      };

      // Buscar todas as páginas da tabela candidatos
      while (hasMore) {
        try {
          const pageResult = await fetchPage(tableName, currentPage);
          if (pageResult.error) {
            finalError = pageResult.error;
            console.error('❌ Erro ao buscar da tabela candidatos:', pageResult.error);
            break;
          }

          if (pageResult.data && pageResult.data.length > 0) {
            allData = allData.concat(pageResult.data);
            console.log(
              `📄 Página ${currentPage + 1}: ${pageResult.data.length} registros (total: ${allData.length})`
            );
          }

          hasMore = pageResult.hasMore;
          currentPage++;
        } catch (error) {
          finalError = error;
          console.error('❌ Erro ao buscar página:', error);
          break;
        }
      }

      // 🚨 CORREÇÃO CRÍTICA: Se houve erro na busca (ex: timeout de rede), lançar exceção
      // para que getPessoasFromLocal acione o fallback do SQLite.
      if (finalError && allData.length === 0) {
        throw finalError;
      }

      if (allData.length === 0) {
        console.log('⚠️ Nenhum candidato encontrado com filtro de comum');
        // Testar buscar TODOS os candidatos para verificar se a tabela tem dados
        try {
          console.log('🔍 Teste 1: buscando TODOS os candidatos (sem filtro, sem RLS):');
          const testResult1 = await supabase
            .from(tableName)
            .select('nome, comum, cidade, instrumento, cargo, nivel')
            .limit(5)
            .order('nome', { ascending: true });
          console.log('📊 Resultado teste 1:', {
            dataLength: testResult1.data?.length || 0,
            error: testResult1.error,
            errorCode: testResult1.error?.code,
            errorMessage: testResult1.error?.message,
            sampleData: testResult1.data?.slice(0, 3).map((c: any) => ({
              nome: c.nome,
              comum: c.comum,
            })),
          });

          // Teste 2: buscar apenas pelo código BR-22-1739
          console.log('🔍 Teste 2: buscando pelo código BR-22-1739:');
          const testResult2 = await supabase
            .from(tableName)
            .select('nome, comum, cidade, instrumento, cargo, nivel')
            .ilike('comum', '%BR-22-1739%')
            .limit(5)
            .order('nome', { ascending: true });
          console.log('📊 Resultado teste 2:', {
            dataLength: testResult2.data?.length || 0,
            error: testResult2.error,
            sampleData: testResult2.data?.slice(0, 3).map((c: any) => ({
              nome: c.nome,
              comum: c.comum,
            })),
          });

          // Teste 3: buscar apenas pelo nome JARDIM MIRANDA
          console.log('🔍 Teste 3: buscando pelo nome JARDIM MIRANDA:');
          const testResult3 = await supabase
            .from(tableName)
            .select('nome, comum, cidade, instrumento, cargo, nivel')
            .ilike('comum', '%JARDIM MIRANDA%')
            .limit(5)
            .order('nome', { ascending: true });
          console.log('📊 Resultado teste 3:', {
            dataLength: testResult3.data?.length || 0,
            error: testResult3.error,
            sampleData: testResult3.data?.slice(0, 3).map((c: any) => ({
              nome: c.nome,
              comum: c.comum,
            })),
          });
        } catch (testError) {
          console.error('❌ Erro no teste:', testError);
        }
        return [];
      }

      console.log(`✅ Total de ${allData.length} registros encontrados na tabela ${tableName}`);

      // Remover duplicatas baseado em nome + comum (EXATAMENTE como fetchPessoasFromCadastro)
      const uniqueMap = new Map<string, any>();
      allData.forEach(r => {
        const nomeCompleto = (r.nome || '').trim();
        const comum = (r.comum || '').trim();
        const key = `${nomeCompleto}_${comum}`;
        if (!uniqueMap.has(key)) {
          uniqueMap.set(key, r);
        }
      });

      const uniqueData = Array.from(uniqueMap.values());
      console.log(`✅ ${uniqueData.length} candidatos únicos após remover duplicatas`);

      return uniqueData;
    } catch (error) {
      console.error('❌ Erro ao buscar candidatos da tabela candidatos:', error);
      throw error;
    }
  },

  // Buscar pessoas da tabela cadastro_fora_regional (para visitantes de fora da regional)
  async fetchPessoasForaRegional(
    comumNome?: string,
    cargoNome?: string,
    instrumentoNome?: string
  ): Promise<any[]> {
    if (!isSupabaseConfigured() || !supabase) {
      throw new Error('Supabase não está configurado');
    }

    try {
      console.log('📚 Buscando pessoas da tabela cadastro_fora_regional...');

      let query = supabase
        .from('cadastro_fora_regional')
        .select('id, nome, comum, cidade, instrumento, cargo, nivel');

      if (comumNome) {
        query = query.ilike('comum', `%${comumNome}%`);
      }

      if (cargoNome) {
        // Normalizar cargo para busca
        const cargoBusca = cargoNome.trim().toUpperCase();
        query = query.ilike('cargo', `%${cargoBusca}%`);
      }

      if (instrumentoNome) {
        query = query.ilike('instrumento', `%${instrumentoNome}%`);
      }

      const { data, error } = await query.order('nome', { ascending: true });

      if (error) {
        console.error('❌ Erro ao buscar da tabela cadastro_fora_regional:', error);
        throw error;
      }

      console.log(`✅ ${data?.length || 0} registros encontrados em cadastro_fora_regional`);
      return data || [];
    } catch (error) {
      console.error('❌ Erro ao buscar pessoas fora regional:', error);
      throw error;
    }
  },

  // Buscar comuns exclusivas da tabela cadastro_fora_regional (para Outras Localidades)
  async fetchComunsForaRegional(): Promise<Comum[]> {
    if (!isSupabaseConfigured() || !supabase) {
      throw new Error('Supabase não está configurado');
    }

    try {
      console.log('📚 Buscando comuns da tabela cadastro_fora_regional...');

      const { data, error } = await supabase
        .from('cadastro_fora_regional')
        .select('comum, cidade')
        .not('comum', 'is', null)
        .neq('comum', '')
        .order('comum', { ascending: true });

      if (error) {
        console.error('❌ Erro ao buscar comuns de fora da regional:', error);
        throw error;
      }

      if (!data || data.length === 0) {
        console.log('⚠️ Nenhuma comum encontrada em cadastro_fora_regional');
        return [];
      }

      // Remover duplicatas e formatar
      const mapComuns = new Map<string, { original: string; display: string; cidade: string }>();

      data.forEach((record: any) => {
        const original = record.comum;
        const cidade = record.cidade || '';
        if (original && typeof original === 'string') {
          // Extrair nome da comum, removendo o padrão "BR-XX-XXXX " se existir para a exibição
          const display = original.replace(/^(?:BR-)?\d{2}-\d{4}\s+/, '').trim();
          const key = normalizeString(display.toUpperCase());

          if (key && !mapComuns.has(key)) {
            mapComuns.set(key, { original, display, cidade });
          }
        }
      });

      // Converter Map para formato Comum[] e ordenar
      const comuns: Comum[] = Array.from(mapComuns.values())
        .map((item, index) => ({
          id: `comum_fora_${index + 1}_${item.display.toLowerCase().replace(/\s+/g, '_')}|${item.cidade}|${item.original}`,
          nome: item.original,
          displayName: item.display,
          cidade: item.cidade,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } as any))
        .sort((a, b) => a.displayName.localeCompare(b.displayName, 'pt-BR'));

      console.log(`✅ Retornando ${comuns.length} comuns únicas de cadastro_fora_regional`);
      return comuns;
    } catch (error) {
      console.error('❌ Erro ao buscar comuns fora da regional:', error);
      throw error;
    }
  },

  async getPessoasFromLocal(
    comumId?: string,
    cargoId?: string,
    instrumentoId?: string,
    isForaRegional?: boolean
  ): Promise<Pessoa[]> {
    console.log('🚀 [getPessoasFromLocal] INÍCIO:', {
      comumId,
      cargoId,
      instrumentoId,
      isForaRegional,
    });
    // Se temos IDs, precisamos buscar os nomes primeiro
    let comumNome: string | undefined;
    let cargoNome: string | undefined;
    let instrumentoNome: string | undefined;

    // 🚀 OTIMIZAÇÃO: Buscar nomes dos IDs em paralelo
    const [comuns, cargos, instrumentos] = await Promise.all([
      comumId ? this.getComunsFromLocal() : Promise.resolve([]),
      cargoId ? this.getCargosFromLocal() : Promise.resolve([]),
      instrumentoId ? this.getInstrumentosFromLocal() : Promise.resolve([]),
    ]);

    if (comumId) {
      if (comumId.startsWith('manual_')) {
        // Extrair nome da comum do ID manual (manual_NomeComum|Cidade)
        const partes = comumId.replace(/^manual_/, '').split('|');
        comumNome = partes[0] || 'Manual';
      } else {
        const comum = comuns.find(c => c.id === comumId);
        comumNome = comum?.nome;
      }
    }

    if (cargoId) {
      if (cargoId.startsWith('manual_')) {
        cargoNome = cargoId.replace(/^manual_/, '');
      } else {
        const cargo = cargos.find(c => c.id === cargoId);
        cargoNome = cargo?.nome;
      }
    }

    if (instrumentoId) {
      const instrumento = instrumentos.find(i => i.id === instrumentoId);
      instrumentoNome = instrumento?.nome;
    }

    // Se não encontrou os nomes, retornar vazio
    if (!comumNome || !cargoNome) {
      console.warn('⚠️ [getPessoasFromLocal] comumNome ou cargoNome não encontrados:', {
        comumId,
        cargoId,
        comumNome,
        cargoNome,
      });
      return [];
    }

    // 🚨 NOVO: Se for Fora Regional, buscar da tabela específica
    if (isForaRegional) {
      try {
        console.log('🔍 [getPessoasFromLocal] MODO FORA REGIONAL ATIVO para:', { comumNome, cargoNome });
        const pessoasData = await this.fetchPessoasForaRegional(comumNome, cargoNome, instrumentoNome);

        console.log(`✅ [getPessoasFromLocal] Retornando ${pessoasData.length} pessoas de cadastro_fora_regional`);

        return pessoasData.map((p, index) => ({
          id: p.id || `fora_${index}_${p.nome.toLowerCase().replace(/\s+/g, '_')}`,
          nome: p.nome.split(' ')[0] || '',
          sobrenome: p.nome.split(' ').slice(1).join(' ') || '',
          nome_completo: p.nome,
          comum_id: comumId || '',
          cargo_id: cargoId || '',
          cargo_real: (p.cargo || '').toUpperCase().trim(),
          instrumento_id: instrumentoId || null,
          cidade: (p.cidade || '').toUpperCase().trim(),
          nivel: (p.nivel || '').trim().toUpperCase() || null,
          ativo: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }));
      } catch (error) {
        console.error('❌ Erro ao buscar pessoas fora regional:', error);
        return [];
      }
    }

    // Verificar se é cargo Candidato(a) - buscar da tabela candidatos
    // Normalizar para comparar (remover espaços e parênteses)
    const cargoNomeNormalizado = cargoNome.toUpperCase().replace(/\s+/g, '').replace(/[()]/g, '');
    if (cargoNomeNormalizado === 'CANDIDATOA' || cargoNomeNormalizado === 'CANDIDATO') {
      try {
        console.log('🔍 Buscando candidatos com:', {
          comumId,
          comumNome,
          cargoId,
          cargoNome,
        });
        const candidatosData = await this.fetchCandidatosFromSupabase(comumNome);
        console.log(`✅ ${candidatosData.length} candidatos retornados da busca`);

        // Buscar lista de instrumentos para converter nome (texto) para instrumento_id
        const instrumentos = await this.getInstrumentosFromLocal();

        // Converter para formato Pessoa[]
        const pessoas: Pessoa[] = candidatosData.map((p, index) => {
          const nomeCompleto = (p.nome || '').trim();
          const partesNome = nomeCompleto.split(' ').filter(p => p.trim());
          const primeiroNome = partesNome[0] || '';
          const ultimoNome = partesNome.length > 1 ? partesNome[partesNome.length - 1] : '';

          // Converter nome do instrumento (texto) para instrumento_id
          // A tabela candidatos tem apenas 'instrumento' (texto), não 'instrumento_id'
          let instrumentoId: string | null = null;
          if (p.instrumento) {
            const instrumentoNomeOriginal = (p.instrumento || '').trim();

            // 🚨 CORREÇÃO: Normalizar instrumento expandindo abreviações (ex: "RET" → "RETO")
            const instrumentoNomeNormalizado =
              normalizeInstrumentoForSearch(instrumentoNomeOriginal);

            // 🚨 CORREÇÃO: Criar variações de busca para encontrar mesmo com abreviações
            const variacoesBusca = expandInstrumentoSearch(instrumentoNomeOriginal);

            // 🚨 OTIMIZAÇÃO: Buscar instrumento pelo nome (case-insensitive e com variações)
            // Primeiro tentar busca exata com nome normalizado (mais rápida)
            let instrumentoEncontrado = instrumentos.find(inst => {
              const instNomeUpper = inst.nome.toUpperCase();
              return (
                instNomeUpper === instrumentoNomeNormalizado ||
                variacoesBusca.includes(instNomeUpper)
              );
            });

            // Se não encontrou, tentar busca normalizada (sem acentos)
            if (!instrumentoEncontrado) {
              const instrumentoNomeSemAcentos = normalizeString(instrumentoNomeNormalizado);
              instrumentoEncontrado = instrumentos.find(inst => {
                const instNomeNormalizado = normalizeString(inst.nome.toUpperCase());
                return instNomeNormalizado === instrumentoNomeSemAcentos;
              });
            }

            instrumentoId = instrumentoEncontrado?.id || null;

            // 🚨 OTIMIZAÇÃO: Log apenas se não encontrou (evitar logs desnecessários)
            if (!instrumentoId && instrumentoNomeOriginal) {
              console.warn('⚠️ Instrumento não encontrado para candidato:', {
                instrumentoOriginal: instrumentoNomeOriginal,
                instrumentoNormalizado: instrumentoNomeNormalizado,
                variacoesBusca,
                totalInstrumentos: instrumentos.length,
              });
            }
          }

          const pessoa: Pessoa = {
            id: `candidato_${index}_${nomeCompleto.toLowerCase().replace(/\s+/g, '_')}`,
            nome: primeiroNome,
            sobrenome: ultimoNome,
            nome_completo: nomeCompleto,
            comum_id: comumId || '',
            cargo_id: cargoId || '',
            // 🚨 CORREÇÃO: Usar o cargo REAL da tabela candidatos (ex: "MÚSICO") ao invés de "Candidato(a)"
            cargo_real: (p.cargo || '').trim().toUpperCase() || 'MÚSICO', // Usar cargo do banco de dados
            instrumento_id: instrumentoId, // Converter nome do instrumento para ID
            cidade: (p.cidade || '').toUpperCase().trim(),
            // 🚨 CORREÇÃO: Mapear campo nivel da tabela candidatos (ex: "CANDIDATO", "OFICIALIZADO", "CULTO OFICIAL")
            nivel: (p.nivel || '').trim().toUpperCase() || 'CANDIDATO', // Usar nivel do banco de dados
            ativo: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };

          return pessoa;
        });

        return pessoas;
      } catch (error) {
        console.error('❌ Erro ao buscar candidatos:', error);
        return [];
      }
    }

    // Buscar pessoas da tabela cadastro (para outros cargos)
    try {
      console.log('🔍 [getPessoasFromLocal] Chamando fetchPessoasFromCadastro with:', {
        comumId,
        comumNome,
        cargoId,
        cargoNome,
        instrumentoId,
        instrumentoNome,
      });

      if (!comumNome) {
        console.error('❌ [getPessoasFromLocal] comumNome está vazio!');
        return [];
      }

      if (!cargoNome) {
        console.error('❌ [getPessoasFromLocal] cargoNome está vazio!');
        return [];
      }

      const pessoasData = await this.fetchPessoasFromCadastro(
        comumNome,
        cargoNome,
        instrumentoNome
      );

      console.log(
        `✅ [getPessoasFromLocal] ${pessoasData.length} pessoas retornadas de fetchPessoasFromCadastro`
      );

      if (pessoasData.length === 0) {
        console.warn(
          '⚠️ [getPessoasFromLocal] Nenhuma pessoa encontrada - verificar logs de fetchPessoasFromCadastro'
        );
      }

      // Converter para formato Pessoa[]
      const pessoas: Pessoa[] = pessoasData.map((p, index) => {
        const nomeCompleto = (p.nome || '').trim();
        const partesNome = nomeCompleto.split(' ').filter(p => p.trim());
        const primeiroNome = partesNome[0] || '';
        const ultimoNome = partesNome.length > 1 ? partesNome[partesNome.length - 1] : '';

        const pessoa: Pessoa = {
          id: `pessoa_${index}_${nomeCompleto.toLowerCase().replace(/\s+/g, '_')}`,
          nome: primeiroNome,
          sobrenome: ultimoNome, // Último nome para registro (será usado apenas primeiro + último no registro)
          nome_completo: nomeCompleto, // Nome completo para exibição na lista
          comum_id: comumId || '',
          cargo_id: cargoId || '',
          cargo_real: (p.cargo || '').toUpperCase().trim(), // Cargo real da pessoa no banco de dados
          instrumento_id: instrumentoId || null,
          cidade: (p.cidade || '').toUpperCase().trim(), // Incluir cidade da pessoa
          // 🚨 CORREÇÃO: Mapear campo nivel da tabela cadastro (ex: "CANDIDATO", "OFICIALIZADO", "CULTO OFICIAL")
          nivel: (p.nivel || '').trim().toUpperCase() || null, // Nível da pessoa no banco de dados
          ativo: true, // Campo obrigatório do tipo, mas não usado como filtro na busca
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        // Incluir classe_organista se existir (para Organistas) - usar campo 'nivel' da tabela apenas se for classe
        // Nota: nivel agora é um campo separado, classe_organista é apenas para organistas
        if (
          p.nivel &&
          (p.nivel.toUpperCase().includes('OFICIALIZADA') ||
            p.nivel.toUpperCase().includes('CLASSE'))
        ) {
          pessoa.classe_organista = p.nivel.toUpperCase().trim();
        }

        return pessoa;
      });

      return pessoas;
    } catch (error) {
      console.error('❌ Erro ao buscar pessoas:', error);
      // Fallback: tentar buscar do banco local se houver
      try {
        const db = await getDatabase();
        let query = 'SELECT * FROM pessoas';
        const params: any[] = [];

        if (comumId) {
          query += ' AND comum_id = ?';
          params.push(comumId);
        }
        if (cargoId) {
          query += ' AND cargo_id = ?';
          params.push(cargoId);
        }
        if (instrumentoId) {
          query += ' AND instrumento_id = ?';
          params.push(instrumentoId);
        }

        query += ' ORDER BY nome, sobrenome';
        const result = (await db.getAllAsync(query, params)) as Pessoa[];
        return result.map(p => ({ ...p, ativo: (p as any).ativo === 1 }));
      } catch (fallbackError) {
        console.error('❌ Erro no fallback:', fallbackError);
        return [];
      }
    }
  },

  // Registros de Presença
  async createRegistroPresenca(
    registro: RegistroPresenca,
    skipDuplicateCheck = false
  ): Promise<RegistroPresenca> {
    // 🚨 OTIMIZAÇÃO: Medir tempo de processamento
    const inicioTempo = performance.now();

    if (!isSupabaseConfigured() || !supabase) {
      console.error('❌ Supabase não está configurado');
      throw new Error('Supabase não está configurado');
    }

    // 🚨 CORREÇÃO CRÍTICA: Garantir que sessão está restaurada antes de inserir
    // 🚀 OTIMIZAÇÃO: Timeout de 1 segundo para não bloquear muito tempo
    // Mas não bloquear se não conseguir restaurar (RLS pode permitir algumas operações)
    try {
      const sessionPromise = Promise.race([
        ensureSessionRestored(),
        new Promise(resolve => setTimeout(() => resolve(false), 1000)), // Timeout de 1s
      ]).catch(() => false);

      const sessionRestored = await sessionPromise;

      if (sessionRestored) {
        // 🚀 OTIMIZAÇÃO: Verificar autenticação com timeout também (não bloquear)
        const authPromise = Promise.race([
          supabase.auth.getUser(),
          new Promise(resolve =>
            setTimeout(() => resolve({ data: { user: null }, error: null }), 500)
          ),
        ]).catch(() => ({ data: { user: null }, error: null }));

        const {
          data: { user },
          error: authError,
        } = (await authPromise) as any;
        if (authError) {
          console.warn('⚠️ Erro ao verificar autenticação:', authError.message);
        } else if (user) {
          console.log('🔐 Sessão restaurada com sucesso:', { userId: user.id });
        }
      } else {
        console.warn(
          '⚠️ Não foi possível restaurar sessão. Tentando inserir mesmo assim (RLS pode permitir).'
        );
      }
    } catch (sessionError) {
      console.warn('⚠️ Erro ao restaurar sessão (continuando...):', sessionError);
      // Continuar mesmo com erro - pode funcionar sem autenticação dependendo das políticas RLS
    }

    // Buscar nomes a partir dos IDs
    let [comuns, cargos, instrumentos] = await Promise.all([
      this.getComunsFromLocal(),
      this.getCargosFromLocal(),
      this.getInstrumentosFromLocal(),
    ]);

    // Se as listas estiverem vazias, tentar recarregar
    if (comuns.length === 0 || cargos.length === 0) {
      console.warn('⚠️ Listas vazias detectadas, recarregando dados...');
      await this.syncData();
      [comuns, cargos, instrumentos] = await Promise.all([
        this.getComunsFromLocal(),
        this.getCargosFromLocal(),
        this.getInstrumentosFromLocal(),
      ]);
    }

    // Verificar se é registro externo (do modal de novo registro)
    const isExternalRegistro = registro.comum_id.startsWith('external_');

    let comum: any = null;
    // 🚨 CRÍTICO: Tentar buscar cargo por ID primeiro, depois por nome (fallback)
    let cargoSelecionado = cargos.find(c => c.id === registro.cargo_id);
    if (!cargoSelecionado) {
      // Se não encontrou por ID, pode ser que cargo_id seja o nome (caso antigo)
      // Tentar buscar por nome como fallback
      cargoSelecionado = cargos.find(c => c.nome === registro.cargo_id);
      if (cargoSelecionado) {
        console.warn('⚠️ Cargo encontrado por nome, mas deveria ser por ID:', registro.cargo_id);
      }
    }

    if (isExternalRegistro) {
      // Para registros externos, extrair nome da comum do ID
      const comumNome = registro.comum_id.replace(/^external_/, '').replace(/_\d+$/, '');
      comum = { id: registro.comum_id, nome: comumNome };
    } else if (registro.comum_id.startsWith('manual_')) {
      // 🚨 NOVO: Suporte para comum manual (página outras localidades)
      // Formato esperado: manual_NomeComum|Cidade (Cidade opcional)
      const partes = registro.comum_id.replace(/^manual_/, '').split('|');
      const comumNome = partes[0] || 'Manual';
      comum = { id: registro.comum_id, nome: comumNome, cidadeManual: partes[1] || '' };
    } else if (registro.comum_id.startsWith('comum_fora_')) {
      // 🚨 NOVO: Suporte para comuns da aba Outras Localidades
      // ID: comum_fora_1_parque_viana|cidade|BR-22-1234 NOME
      const partesID = registro.comum_id.split('|');
      const cidadePart = partesID[1] || '';
      const originalNomePart = partesID[2] || '';
      
      let comumNome = '';
      if (originalNomePart) {
        comumNome = originalNomePart;
      } else {
        // Fallback: tentar extrair do ID removendo o prefixo e o índice
        comumNome = partesID[0]
          .replace(/^comum_fora_(\d+_)*/gi, '') // Remove o prefixo e o índice numérico
          .replace(/_/g, ' ')
          .trim();
      }

      comum = {
        id: registro.comum_id,
        nome: comumNome.toUpperCase(),
        cidadeManual: cidadePart || '',
        isExternal: true
      };
    } else {
      comum = comuns.find(c => c.id === registro.comum_id);
    }

    const instrumento = registro.instrumento_id
      ? instrumentos.find(i => i.id === registro.instrumento_id)
      : null;

    if (!comum || !cargoSelecionado) {
      const dataParaEnviar = {
        pessoa_id: registro.pessoa_id,
        comum_id: registro.comum_id,
        cargo_id: registro.cargo_id,
        instrumento_id: registro.instrumento_id,
        classe_organista: registro.classe_organista,
        local_ensaio: registro.local_ensaio,
        data_hora_registro: registro.data_hora_registro,
        usuario_responsavel: registro.usuario_responsavel,
        status_sincronizacao: 'pending' as 'pending' | 'synced',
      };
      console.error('❌ Erro ao encontrar comum ou cargo:', {
        comum_id: registro.comum_id,
        cargo_id: registro.cargo_id,
        isExternal: isExternalRegistro,
        comuns_count: comuns.length,
        cargos_count: cargos.length,
        comuns_ids: comuns.map(c => c.id).slice(0, 5),
        cargos_ids: cargos.map(c => c.id).slice(0, 5),
        cargos_nomes: cargos.map(c => c.nome).slice(0, 5),
      });
      throw new Error('Dados incompletos: comum ou cargo não encontrados');
    }

    // Verificar se é nome manual (pessoa_id começa com "manual_")
    const isNomeManual = registro.pessoa_id.startsWith('manual_');
    let nomeCompleto = '';
    let cargoReal = cargoSelecionado.nome;
    let pessoa: Pessoa | null = null;

    if (isNomeManual) {
      // Extrair nome do pessoa_id (remove prefixo "manual_")
      nomeCompleto = registro.pessoa_id.replace(/^manual_/, '');
      // Para nomes manuais, usar cargo selecionado diretamente
      cargoReal = cargoSelecionado.nome;
    } else {
      // Buscar pessoa pelo ID (precisamos buscar da lista de pessoas carregadas)
      const pessoas = await this.getPessoasFromLocal(
        registro.comum_id,
        registro.cargo_id,
        registro.instrumento_id || undefined
      );
      pessoa = pessoas.find(p => p.id === registro.pessoa_id) || null;

      if (!pessoa) {
        throw new Error('Pessoa não encontrada');
      }

      // Usar cargo real da pessoa se disponível, senão usar o cargo selecionado
      cargoReal = pessoa.cargo_real || cargoSelecionado.nome;
      nomeCompleto = pessoa.nome_completo || `${pessoa.nome} ${pessoa.sobrenome}`;
    }

    const cargo = { ...cargoSelecionado, nome: cargoReal };

    // 🚨 CORREÇÃO: Sempre usar UUID v4 válido (formato: 75aef8f7-86fc-49fe-8a0c-973c9658d6e8)
    // Validar se UUID é válido, senão gerar novo UUID v4
    let uuid = registro.id || '';
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuid || !uuidRegex.test(uuid)) {
      // Gerar UUID v4 válido
      uuid = uuidv4();
      console.log('🔄 UUID inválido detectado, gerando UUID v4 válido:', uuid);
    }

    // Buscar cidade: para nomes manuais, buscar cidade da comum; caso contrário, usar cidade da pessoa
    let cidade = '';
    if (comum?.cidadeManual) {
      // 🚨 PRIORIDADE: Se temos cidade manual no objeto comum (vindo do ID), usar ela
      cidade = comum.cidadeManual;
    } else if (isNomeManual) {
      // 🚨 CORREÇÃO: Para nomes manuais, buscar cidade da comum na tabela cadastro
      // Se for registro externo (modal), usar cidade do registro
      if (isExternalRegistro) {
        cidade = (registro as any)?.cidade || '';
      } else {
        // Para nomes manuais da página principal, buscar cidade da primeira pessoa daquela comum
        try {
          const cidadeResult = await supabase
            .from('cadastro')
            .select('cidade')
            .ilike('comum', `%${comum.nome}%`)
            .not('cidade', 'is', null)
            .neq('cidade', '')
            .limit(1)
            .single();

          if (cidadeResult.data && cidadeResult.data.cidade) {
            cidade = cidadeResult.data.cidade;
            console.log('✅ [Supabase] Cidade encontrada da comum para nome manual:', cidade);
          } else {
            console.warn('⚠️ [Supabase] Cidade não encontrada para comum:', comum.nome);
          }
        } catch (error) {
          console.warn('⚠️ [Supabase] Erro ao buscar cidade da comum:', error);
        }
      }
    } else {
      // Para nomes da lista, usar cidade da pessoa
      cidade = (pessoa as any)?.cidade || '';
    }

    // Buscar nome do local de ensaio (se for ID, converter para nome)
    let localEnsaioNome = registro.local_ensaio || null;
    if (localEnsaioNome && /^\d+$/.test(localEnsaioNome)) {
      // Se for um número (ID), buscar the nome correspondente
      const locais: { id: string; nome: string }[] = [
        { id: '1', nome: 'Cotia' },
        { id: '2', nome: 'Caucaia do Alto' },
        { id: '3', nome: 'Fazendinha' },
        { id: '4', nome: 'Itapevi' },
        { id: '5', nome: 'Jandira' },
        { id: '6', nome: 'Pirapora' },
        { id: '7', nome: 'Vargem Grande' },
      ];
      const localEncontrado = locais.find(l => l.id === localEnsaioNome);
      localEnsaioNome = localEncontrado?.nome || localEnsaioNome;
    }

    // 🚨 CORREÇÃO: Para candidatos, buscar instrumento da pessoa se não tiver no registro
    // A pessoa candidata já tem o instrumento_id convertido do nome do instrumento
    let instrumentoParaSalvar = instrumento;
    if (!instrumentoParaSalvar && pessoa && pessoa.instrumento_id) {
      // Buscar instrumento pelo ID da pessoa
      const instrumentoDaPessoa = instrumentos.find(i => i.id === pessoa.instrumento_id);
      if (instrumentoDaPessoa) {
        instrumentoParaSalvar = instrumentoDaPessoa;
      }
    }

    // Buscar nivel da pessoa (OFICIALIZADO, CULTO OFICIAL ou CANDIDATO)
    // 🚨 CORREÇÃO: Normalizar nivel baseado em regras (instrumento e cargo)
    // IMPORTANTE: Calcular nivel DEPOIS de definir instrumentoParaSalvar
    let nivelPessoaOriginal = pessoa?.nivel || null;

    // 🚨 CORREÇÃO: Se for nome manual ou não houver pessoa, usar valor padrão baseado no cargo
    if (!nivelPessoaOriginal && isNomeManual) {
      // Para nomes manuais, tentar inferir nivel baseado no cargo
      if (cargoReal.toUpperCase().includes('CANDIDATO')) {
        nivelPessoaOriginal = 'CANDIDATO';
      } else {
        // Para outros cargos, deixar null (será normalizado depois)
        nivelPessoaOriginal = null;
      }
    }

    const nivelPessoa = normalizarNivel(
      nivelPessoaOriginal,
      instrumentoParaSalvar?.nome,
      cargoReal
    );

    // 🚨 OTIMIZAÇÃO: Log apenas se nivel não foi encontrado (evitar logs desnecessários)
    if (!nivelPessoa) {
      console.warn('⚠️ Nivel não encontrado:', {
        nivelPessoaOriginal,
        instrumentoParaSalvar: instrumentoParaSalvar?.nome,
        cargoReal,
        pessoaId: pessoa?.id,
        isNomeManual,
        pessoaNivel: pessoa?.nivel,
      });
    }

    // Normalizar para cargos femininos que tocam órgão (usar cargo real da pessoa)
    const normalizacao = normalizarRegistroCargoFeminino(
      cargoReal, // Usar cargo real da pessoa
      instrumentoParaSalvar?.nome,
      registro.classe_organista
    );

    // Usar valores normalizados se for cargo feminino
    const instrumentoFinal = normalizacao.isNormalizado
      ? normalizacao.instrumentoNome || 'ÓRGÃO'
      : instrumentoParaSalvar?.nome || null;

    // 🚨 CORREÇÃO: Calcular naipe sempre que houver instrumento (incluindo candidatos)
    const naipeInstrumento = normalizacao.isNormalizado
      ? normalizacao.naipeInstrumento || 'TECLADO'
      : instrumentoFinal // Usar instrumentoFinal ao invés de instrumentoParaSalvar para garantir que está normalizado
        ? getNaipeByInstrumento(instrumentoFinal)
        : null;

    // Log para debug se naipe não foi encontrado
    if (instrumentoFinal && !naipeInstrumento) {
      console.warn('⚠️ Naipe não encontrado para instrumento:', {
        instrumentoFinal,
        instrumentoParaSalvar: instrumentoParaSalvar?.nome,
        cargoReal,
      });
    }

    // 🚨 CORREÇÃO CRÍTICA: Para cargos femininos/órgão, classe_organista deve ser igual ao nivel
    // Se for cargo feminino (Organista, Instrutora, Examinadora, Secretária) ou órgão, usar o nivel normalizado como classe_organista
    const isOrgaoOuCargoFeminino =
      normalizacao.isNormalizado ||
      instrumentoParaSalvar?.nome?.toUpperCase() === 'ÓRGÃO' ||
      instrumentoParaSalvar?.nome?.toUpperCase() === 'ORGAO' ||
      isCargoFemininoOrganista(cargoReal);

    const classeOrganistaFinal =
      isOrgaoOuCargoFeminino && nivelPessoa
        ? nivelPessoa // Usar nivel como classe_organista para cargos femininos/órgão
        : normalizacao.isNormalizado
          ? normalizacao.classeOrganista || 'OFICIALIZADA'
          : registro.classe_organista || null;

    // Converter para formato da tabela presencas (nomes em maiúscula)
    const row = {
      uuid: uuid,
      nome_completo: nomeCompleto.trim().toUpperCase(),
      comum: comum.nome.toUpperCase(),
      cargo: cargoReal.toUpperCase(), // 🚨 CORREÇÃO: Usar cargo REAL da pessoa, não o selecionado
      instrumento: instrumentoFinal ? instrumentoFinal.toUpperCase() : null,
      naipe_instrumento: naipeInstrumento ? naipeInstrumento.toUpperCase() : null,
      classe_organista: classeOrganistaFinal ? classeOrganistaFinal.toUpperCase() : null, // Classe normalizada
      nivel: nivelPessoa && nivelPessoa.trim() ? nivelPessoa.toUpperCase() : null, // 🚨 CORREÇÃO: Campo nivel adicionado - coluna existe na tabela presencas do Supabase
      cidade: cidade.toUpperCase(),
      local_ensaio: localEnsaioNome?.toUpperCase() || null,
      data_ensaio: registro.data_hora_registro || new Date().toISOString(), // Usar ISO string ao invés de formato brasileiro
      registrado_por: (() => {
        // Extrair apenas primeiro e último nome do usuário
        const nomeUsuario = registro.usuario_responsavel || '';
        if (!nomeUsuario) return null;
        const nomeFormatado = extractFirstAndLastName(nomeUsuario);
        return nomeFormatado || null;
      })(),
      created_at: registro.created_at || new Date().toISOString(),
    };

    // 🛡️ VERIFICAÇÃO DE DUPLICADOS: Verificar se já existe registro no mesmo dia
    // IMPORTANTE: Verificar por nome + comum + cargo REAL (não importa o instrumento ou local de ensaio)
    // Baseado na lógica do backupcont/app.js
    // Pular verificação se skipDuplicateCheck = true (usuário confirmou duplicata)
    if (!skipDuplicateCheck) {
      try {
        const nomeBusca = row.nome_completo.trim().toUpperCase();
        const comumBusca = row.comum.trim().toUpperCase();
        const cargoBusca = row.cargo.trim().toUpperCase(); // Cargo REAL já está em row.cargo

        // Extrair apenas a data (sem hora) para comparação
        const dataRegistro = new Date(row.data_ensaio);
        const dataInicio = new Date(
          dataRegistro.getFullYear(),
          dataRegistro.getMonth(),
          dataRegistro.getDate()
        );
        const dataFim = new Date(dataInicio);
        dataFim.setDate(dataFim.getDate() + 1);

        console.log('🔍 Verificando duplicados:', {
          nome: nomeBusca,
          comum: comumBusca,
          cargo: cargoBusca,
          dataInicio: dataInicio.toISOString(),
          dataFim: dataFim.toISOString(),
        });

        // 🚀 OTIMIZAÇÃO: Query com timeout e limit(1) para parar na primeira duplicata encontrada
        const duplicataPromise = supabase
          .from('presencas')
          .select('uuid, nome_completo, comum, cargo, data_ensaio, created_at')
          .ilike('nome_completo', nomeBusca)
          .ilike('comum', comumBusca)
          .ilike('cargo', cargoBusca)
          .gte('data_ensaio', dataInicio.toISOString())
          .lt('data_ensaio', dataFim.toISOString())
          .limit(1); // 🚀 OTIMIZAÇÃO: Parar na primeira duplicata encontrada (mais rápido)

        // 🚀 OTIMIZAÇÃO: Timeout de 3 segundos para não bloquear muito tempo
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Timeout na verificação de duplicatas')), 3000)
        );

        const { data: duplicatas, error: duplicataError } = (await Promise.race([
          duplicataPromise,
          timeoutPromise,
        ])) as any;

        if (duplicataError) {
          // Se for timeout, continuar (não bloquear)
          if (duplicataError.message?.includes('Timeout')) {
            console.warn(
              '⚠️ Timeout na verificação de duplicatas (continuando...):',
              duplicataError.message
            );
          } else {
            console.warn('⚠️ Erro ao verificar duplicatas:', duplicataError);
          }
          // Continuar mesmo com erro na verificação
        } else if (duplicatas && duplicatas.length > 0) {
          const duplicata = duplicatas[0];
          console.error('🚨🚨🚨 DUPLICATA DETECTADA - BLOQUEANDO INSERÇÃO 🚨🚨🚨', {
            nome: nomeBusca,
            comum: comumBusca,
            cargo: cargoBusca,
            uuidExistente: duplicata.uuid,
            dataExistente: duplicata.data_ensaio,
            created_at: duplicata.created_at,
          });

          // Formatar data e horário do registro existente usando funções utilitárias
          // 🚨 CORREÇÃO: Usar timezone explícito se as funções importadas falharem
          let dataFormatada = '';
          let horarioFormatado = '';
          try {
            let dateForData = duplicata.data_ensaio || duplicata.created_at;
            if (dateForData && typeof dateForData === 'string' && dateForData.length === 10) {
              dateForData += 'T12:00:00';
            }
            const dataExistente = new Date(dateForData);
            const timeExistente = new Date(duplicata.created_at || duplicata.data_ensaio);

            if (typeof formatDate === 'function') {
              dataFormatada = formatDate(dataExistente);
            } else {
              dataFormatada = dataExistente.toLocaleDateString('pt-BR', {
                timeZone: 'America/Sao_Paulo',
              });
            }

            if (typeof formatTime === 'function') {
              horarioFormatado = formatTime(timeExistente);
            } else {
              horarioFormatado = timeExistente.toLocaleTimeString('pt-BR', {
                timeZone: 'America/Sao_Paulo',
              });
            }
          } catch (formatError) {
            console.warn('⚠️ Erro ao formatar data da duplicata:', formatError);
            let dateForData = duplicata.data_ensaio || duplicata.created_at;
            if (dateForData && typeof dateForData === 'string' && dateForData.length === 10) {
              dateForData += 'T12:00:00';
            }
            const dataExistente = new Date(dateForData);
            dataFormatada = dataExistente.toLocaleDateString('pt-BR', {
              timeZone: 'America/Sao_Paulo',
            });
            const timeExistente = new Date(duplicata.created_at || duplicata.data_ensaio);
            horarioFormatado = timeExistente.toLocaleTimeString('pt-BR', {
              timeZone: 'America/Sao_Paulo',
              hour12: false,
            });
          }

          // Lançar erro para bloquear inserção com informações formatadas
          throw new Error(
            `DUPLICATA_BLOQUEADA:DUPLICATA:${nomeBusca}|${comumBusca}|${dataFormatada}|${horarioFormatado}`
          );
        }
      } catch (error) {
        // Se o erro for de duplicata bloqueada, propagar o erro
        if (error instanceof Error && error.message.includes('DUPLICATA_BLOQUEADA')) {
          console.error('🚨🚨🚨 BLOQUEIO DEFINITIVO DE DUPLICATA 🚨🚨🚨');
          throw error;
        }
        // Outros erros na verificação não devem bloquear
        console.warn('⚠️ Erro ao verificar duplicatas (continuando...):', error);
      }
    }
    // 🚨 OTIMIZAÇÃO: Log apenas se nivel estiver null (evitar logs desnecessários)
    if (!row.nivel) {
      console.warn('⚠️ Nivel será NULL no Supabase:', {
        nivelPessoa,
        nivelPessoaOriginal,
        pessoaNivel: pessoa?.nivel,
        isNomeManual,
        cargoReal,
      });
    }

    // 🚨 OTIMIZAÇÃO: Log resumido ao invés de JSON completo (mais rápido)
    console.log('📤 Enviando para Supabase (tabela presencas):', {
      uuid: row.uuid,
      nome: row.nome_completo,
      comum: row.comum,
      cargo: row.cargo,
      instrumento: row.instrumento,
      nivel: row.nivel,
    });

    // 🚨 CORREÇÃO CRÍTICA: Tentar inserir com retry e logs detalhados
    let tentativas = 0;
    const maxTentativas = 3;
    let ultimoErro: any = null;

    while (tentativas < maxTentativas) {
      tentativas++;
      console.log(`📤 Tentativa ${tentativas}/${maxTentativas} de inserir no Supabase...`);

      try {
        const { data, error } = await supabase.from('presencas').insert(row).select().single();

        if (error) {
          ultimoErro = error;

          // 🚨 CORREÇÃO: Tratar erro de constraint (23505) como sucesso - registro já existe
          const isConstraintError =
            error.code === '23505' ||
            error.message?.includes('duplicate key') ||
            error.message?.includes('already exists') ||
            error.message?.includes('pessoas_pkey') ||
            error.message?.includes('presencas_pkey');

          if (isConstraintError) {
            console.log(
              `✅ Registro já existe no Supabase (constraint ${error.code}) - tratado como sucesso`
            );
            // Retornar registro como se tivesse sido inserido com sucesso
            return {
              ...registro,
              id: uuid,
              status_sincronizacao: 'synced',
            };
          }

          console.error(`❌ Erro ao inserir no Supabase (tentativa ${tentativas}):`, {
            code: error.code,
            message: error.message,
            details: error.details,
            hint: error.hint,
            row: JSON.stringify(row, null, 2),
          });

          // Se for erro de autenticação ou sessão, tentar restaurar sessão e tentar novamente
          if (
            (error.code === 'PGRST301' ||
              error.message?.includes('JWT') ||
              error.message?.includes('session') ||
              error.message?.includes('permission')) &&
            tentativas < maxTentativas
          ) {
            console.log('🔄 Tentando restaurar sessão e tentar novamente...');
            await ensureSessionRestored();
            await new Promise(resolve => setTimeout(resolve, 500)); // Aguardar 500ms
            continue; // Tentar novamente
          }

          // Se não for erro de sessão ou já tentou todas as vezes, lançar erro
          if (tentativas >= maxTentativas) {
            console.error('❌❌❌ FALHA DEFINITIVA AO INSERIR NO SUPABASE ❌❌❌', error);
            throw error;
          }
        } else {
          const tempoTotal = performance.now() - inicioTempo;
          console.log(
            `✅✅✅ Registro salvo no Supabase com sucesso ✅✅✅ (${tempoTotal.toFixed(2)}ms):`,
            data
          );
          // Retornar registro atualizado
          return {
            ...registro,
            id: data.uuid || uuid,
            status_sincronizacao: 'synced',
          };
        }
      } catch (error: any) {
        ultimoErro = error;

        // 🚨 CORREÇÃO: Tratar erro de constraint (23505) como sucesso - registro já existe
        const isConstraintError =
          error?.code === '23505' ||
          error?.message?.includes('duplicate key') ||
          error?.message?.includes('already exists') ||
          error?.message?.includes('pessoas_pkey') ||
          error?.message?.includes('presencas_pkey');

        if (isConstraintError) {
          console.log(`✅ Registro já existe no Supabase (constraint) - tratado como sucesso`);
          // Retornar registro como se tivesse sido inserido com sucesso
          return {
            ...registro,
            id: uuid,
            status_sincronizacao: 'synced',
          };
        }

        console.error(`❌ Exceção ao inserir no Supabase (tentativa ${tentativas}):`, error);

        if (tentativas >= maxTentativas) {
          console.error('❌❌❌ FALHA DEFINITIVA APÓS TODAS AS TENTATIVAS ❌❌❌', error);
          throw error;
        }

        // Aguardar antes de tentar novamente
        await new Promise(resolve => setTimeout(resolve, 1000 * tentativas));
      }
    }

    // Se chegou aqui, todas as tentativas falharam
    console.error('❌❌❌ TODAS AS TENTATIVAS FALHARAM ❌❌❌', ultimoErro);
    throw ultimoErro || new Error('Falha ao inserir no Supabase após múltiplas tentativas');
  },

  async getRegistrosPendentesFromLocal(): Promise<RegistroPresenca[]> {
    if (Platform.OS === 'web') {
      // Para web, usar cache em memória ou AsyncStorage
      const registros: RegistroPresenca[] = [];

      // Buscar do cache em memória
      if (memoryCache.registros.length > 0) {
        registros.push(...memoryCache.registros.filter(r => r.status_sincronizacao === 'pending'));
      }

      // Buscar do AsyncStorage
      try {
        const cached = await robustGetItem('cached_registros');
        if (cached) {
          const cachedRegistros = JSON.parse(cached);
          // Validar e sanitizar dados
          const validRegistros = cachedRegistros.filter(
            (r: any) => isValidString(r.id) && r.status_sincronizacao
          );
          memoryCache.registros = validRegistros;
          const pendingFromCache = validRegistros.filter(
            (r: RegistroPresenca) => r.status_sincronizacao === 'pending'
          );
          // Adicionar apenas se não estiverem já na lista
          for (const r of pendingFromCache) {
            if (!registros.find(existing => existing.id === r.id)) {
              registros.push(r);
            }
          }
        }
      } catch (error) {
        console.warn('⚠️ Erro ao ler registros do cache robusto:', error);
      }

      try {
        const allKeys = await robustGetAllKeys();
        const fallbackKeys = allKeys.filter(key => key.startsWith('registro_fallback_'));
        for (const key of fallbackKeys) {
          try {
            const data = await robustGetItem(key);
            if (data) {
              const registro = JSON.parse(data);
              if (
                registro.status_sincronizacao === 'pending' &&
                !registros.find(r => r.id === registro.id)
              ) {
                registros.push(registro);
              }
            }
          } catch (parseError) {
            console.warn('⚠️ Erro ao parsear registro fallback:', key, parseError);
          }
        }
      } catch (fallbackError) {
        console.warn('⚠️ Erro ao buscar registros fallback (web):', fallbackError);
      }

      // ALÉM DISSO, unificar a fila_registros_presenca no Web também caso tenha ficado preso do antigo localStorage
      try {
        const filaKey = 'fila_registros_presenca';
        const filaData = await robustGetItem(filaKey);
        const fila: RegistroPresenca[] = filaData ? JSON.parse(filaData) : [];
        const pendingFila = fila.filter(r => r.status_sincronizacao === 'pending' || !r.status_sincronizacao);

        for (const r of pendingFila) {
          if (!registros.find(existing => existing.id === r.id)) {
            registros.push(r);
          }
        }
      } catch (e) {
        // Nada faz
      }

      return registros;
    }

    // 🚨 SIMPLIFICAÇÃO TOTAL: Copiar EXATAMENTE o que funciona no BACKUPCONT
    // No BACKUPCONT: JSON.parse(localStorage.getItem('fila_envio') || '[]')
    try {
      const filaKey = 'fila_registros_presenca';
      const filaData = await robustGetItem(filaKey);
      const fila: RegistroPresenca[] = filaData ? JSON.parse(filaData) : [];

      // Filtrar apenas pendentes (status !== 'success' no BACKUPCONT)
      return fila.filter(r => r.status_sincronizacao === 'pending' || !r.status_sincronizacao);
    } catch (error) {
      console.warn('⚠️ Erro ao buscar registros pendentes:', error);
      return [];
    }
  },

  async getAllRegistrosFromLocal(): Promise<RegistroPresenca[]> {
    if (Platform.OS === 'web') {
      // Para web, usar cache em memória ou AsyncStorage
      if (memoryCache.registros.length > 0) {
        return memoryCache.registros;
      }
      try {
        const cached = await robustGetItem('cached_registros');
        if (cached) {
          const registros = JSON.parse(cached);
          // Validar e sanitizar dados
          const validRegistros = registros.filter(
            (r: any) => isValidString(r.id) && r.status_sincronizacao
          );
          memoryCache.registros = validRegistros;
          return validRegistros;
        }
      } catch (error) {
        console.warn('⚠️ Erro ao ler registros do cache robusto:', error);
      }
      return [];
    }

    // 🚨 CORREÇÃO CRÍTICA: Para mobile, usar AsyncStorage diretamente
    try {
      const filaKey = 'fila_registros_presenca';
      const filaData = await robustGetItem(filaKey);
      let registros: RegistroPresenca[] = filaData ? JSON.parse(filaData) : [];

      // Também buscar fallbacks individuais
      try {
        const allKeys = await robustGetAllKeys();
        const fallbackKeys = allKeys.filter(key => key.startsWith('registro_fallback_'));
        for (const key of fallbackKeys) {
          try {
            const data = await robustGetItem(key);
            if (data) {
              const registro = JSON.parse(data);
              const { _fallback, ...registroLimpo } = registro;
              if (!registros.find(r => r.id === registro.id)) {
                registros.push(registroLimpo as RegistroPresenca);
              }
            }
          } catch (parseError) {
            console.warn('⚠️ Erro ao parsear registro fallback:', key, parseError);
          }
        }
      } catch (fallbackError) {
        console.warn('⚠️ Erro ao buscar registros fallback:', fallbackError);
      }

      return registros.map(r => ({
        ...r,
        status_sincronizacao: r.status_sincronizacao as 'pending' | 'synced',
      }));
    } catch (error) {
      console.warn('⚠️ Erro ao buscar todos os registros do AsyncStorage:', error);
      return [];
    }
  },

  async deleteRegistroFromLocal(id: string): Promise<void> {
    // Para web, remover do cache em memória
    memoryCache.registros = memoryCache.registros.filter(r => r.id !== id);
    try {
      await robustSetItem('cached_registros', JSON.stringify(memoryCache.registros));
    } catch (error) {
      console.warn('⚠️ Erro ao remover registro do cache:', error);
    }
    // NÃO FAZ RETURN, segue abaixo para deletar do storage universal!

    // 🚨 CORREÇÃO CRÍTICA: Para mobile, usar AsyncStorage diretamente
    try {
      // Buscar fila existente
      const filaKey = 'fila_registros_presenca';
      const filaData = await robustGetItem(filaKey);
      if (filaData) {
        let fila: RegistroPresenca[] = JSON.parse(filaData);
        fila = fila.filter(r => r.id !== id);
        await robustSetItem(filaKey, JSON.stringify(fila));
      }

      // Também remover fallback individual se existir
      try {
        await robustRemoveItem(`registro_fallback_${id} `);
        // Também tentar deletar na web Storage caso exista (resquício)
        if (typeof localStorage !== 'undefined') {
          const webFilaData = localStorage.getItem('fila_envio');
          if (webFilaData) {
            let webFila = JSON.parse(webFilaData);
            webFila = webFila.filter((r: any) => r.id !== id);
            localStorage.setItem('fila_envio', JSON.stringify(webFila));
          }
        }
      } catch (e) {
        // Ignorar erro se não existir
      }
    } catch (error) {
      console.warn('⚠️ Erro ao remover registro do AsyncStorage:', error);
    }
  },

  async saveRegistroToLocal(registro: RegistroPresenca): Promise<void> {
    // 🚨 BLOQUEIO CRÍTICO: Prevenir salvamentos simultâneos do mesmo registro
    const saveKey = `${registro.pessoa_id}_${registro.comum_id}_${registro.cargo_id}_${registro.data_hora_registro} `;
    const now = Date.now();

    // 🚨 CORREÇÃO: Ajustar lógica de bloqueio para ser menos restritiva
    // Bloquear apenas se for EXATAMENTE o mesmo registro sendo salvo simultaneamente
    // Reduzir tempo de bloqueio de 3s para 1s para não bloquear salvamentos legítimos
    if (savingLock && lastSaveKey === saveKey && now - lastSaveTimestamp < 1000) {
      console.warn('🚨 [BLOQUEIO] Salvamento duplicado bloqueado (mesmo registro em menos de 1s)');
      // Em vez de retornar silenciosamente, aguardar um pouco e tentar novamente
      await new Promise(resolve => setTimeout(resolve, 500));
      // Verificar novamente após aguardar
      if (savingLock && lastSaveKey === saveKey && Date.now() - lastSaveTimestamp < 1000) {
        console.warn('🚨 [BLOQUEIO] Ainda bloqueado após aguardar - retornando');
        return;
      }
    }

    // Ativar lock
    savingLock = true;
    lastSaveTimestamp = now;
    lastSaveKey = saveKey;

    // 🚨 CORREÇÃO CRÍTICA: Declarar registrosPendentes FORA do try e buscar ANTES de usar
    let registrosPendentes: RegistroPresenca[] = [];
    try {
      registrosPendentes = await this.getRegistrosPendentesFromLocal();
    } catch (error) {
      console.warn(
        '⚠️ Erro ao buscar registros pendentes, continuando sem validação de duplicata:',
        error
      );
      registrosPendentes = []; // Garantir que está definida
    }

    try {
      // 🛡️ VERIFICAÇÃO RÁPIDA DE DUPLICATA (mais eficiente - verifica primeiro)
      const dataRegistro = new Date(registro.data_hora_registro);
      const dataRegistroStr = dataRegistro.toISOString().split('T')[0];

      let isDuplicataRapida = false;

      // 🚨 CORREÇÃO: Usar registrosPendentes já carregados (funciona para web e mobile)
      // Não usar SQLite no mobile - usar AsyncStorage diretamente
      if (!registrosPendentes || !Array.isArray(registrosPendentes)) {
        registrosPendentes = [];
      }
      isDuplicataRapida = registrosPendentes.some(r => {
        const rData = new Date(r.data_hora_registro);
        const rDataStr = rData.toISOString().split('T')[0];
        return (
          r.pessoa_id === registro.pessoa_id &&
          r.comum_id === registro.comum_id &&
          r.cargo_id === registro.cargo_id &&
          rDataStr === dataRegistroStr &&
          r.status_sincronizacao === 'pending'
        );
      });

      if (isDuplicataRapida) {
        console.warn(
          '🚨 [BLOQUEIO] Duplicata detectada na verificação rápida - verificando novamente...'
        );
        // 🚨 CORREÇÃO: Em vez de bloquear imediatamente, fazer verificação mais detalhada
        // Pode ser falso positivo se o registro anterior foi sincronizado
        const registrosPendentesAtualizados = await this.getRegistrosPendentesFromLocal();
        const duplicataConfirmada = registrosPendentesAtualizados.some(r => {
          const rData = new Date(r.data_hora_registro);
          const rDataStr = rData.toISOString().split('T')[0];
          return (
            r.pessoa_id === registro.pessoa_id &&
            r.comum_id === registro.comum_id &&
            r.cargo_id === registro.cargo_id &&
            rDataStr === dataRegistroStr &&
            r.status_sincronizacao === 'pending' &&
            r.id !== registro.id // Não é o mesmo registro
          );
        });

        if (duplicataConfirmada) {
          console.warn('🚨 [BLOQUEIO] Duplicata confirmada - NÃO será salvo');
          return;
        } else {
          console.log('✅ Duplicata não confirmada - continuando com salvamento');
        }
      }

      // 🛡️ VERIFICAÇÃO DETALHADA DE DUPLICATA (apenas se passou na rápida)
      // 🚀 OTIMIZAÇÃO: Só buscar pessoas se realmente necessário (não é manual)
      try {
        // Verificar se é registro manual (pessoa_id começa com "manual_")
        const isManualRegistro = registro.pessoa_id.startsWith('manual_');

        // Buscar dados para comparação (com tratamento de erro)
        let comuns: Comum[] = [];
        let cargos: Cargo[] = [];
        let pessoas: Pessoa[] = [];

        try {
          [comuns, cargos] = await Promise.all([
            this.getComunsFromLocal(),
            this.getCargosFromLocal(),
          ]);
        } catch (error) {
          console.warn('⚠️ Erro ao buscar comuns/cargos para validação de duplicata:', error);
        }

        // 🚀 OTIMIZAÇÃO: Só buscar pessoas se não for registro manual
        if (!isManualRegistro) {
          try {
            pessoas = await this.getPessoasFromLocal(
              registro.comum_id,
              registro.cargo_id,
              registro.instrumento_id || undefined
            );
          } catch (error) {
            console.warn('⚠️ Erro ao buscar pessoas para validação de duplicata:', error);
          }
        }

        const comum = comuns.find(c => c.id === registro.comum_id);
        const cargo = cargos.find(c => c.id === registro.cargo_id);
        const pessoa = isManualRegistro ? null : pessoas.find(p => p.id === registro.pessoa_id);

        // Preparar dados para comparação
        let nomeBusca = '';
        let comumBusca = '';
        let cargoBusca = '';

        if (isManualRegistro) {
          // Para registros manuais, usar o nome do pessoa_id
          nomeBusca = registro.pessoa_id
            .replace(/^manual_/, '')
            .trim()
            .toUpperCase();
          comumBusca = comum?.nome.toUpperCase() || '';
          cargoBusca = cargo?.nome.toUpperCase() || '';
        } else if (comum && cargo && pessoa) {
          nomeBusca = (pessoa.nome_completo || `${pessoa.nome} ${pessoa.sobrenome} `)
            .trim()
            .toUpperCase();
          comumBusca = comum.nome.toUpperCase();
          cargoBusca = (pessoa.cargo_real || cargo.nome).toUpperCase();
        } else {
          // Se não conseguiu buscar dados, usar verificação simplificada
          const dataRegistro = new Date(registro.data_hora_registro);
          const dataRegistroStr = dataRegistro.toISOString().split('T')[0];

          // Verificação simplificada: mesmo pessoa_id, comum_id, cargo_id e data
          if (!registrosPendentes || !Array.isArray(registrosPendentes)) {
            registrosPendentes = [];
          }
          const isDuplicata = registrosPendentes.some(r => {
            const rData = new Date(r.data_hora_registro);
            const rDataStr = rData.toISOString().split('T')[0];
            return (
              r.pessoa_id === registro.pessoa_id &&
              r.comum_id === registro.comum_id &&
              r.cargo_id === registro.cargo_id &&
              rDataStr === dataRegistroStr &&
              r.status_sincronizacao === 'pending'
            );
          });

          if (isDuplicata) {
            console.warn('🚨 [BLOQUEIO] Duplicata detectada (verificação simplificada)');
            return;
          }
        }

        if (nomeBusca && comumBusca && cargoBusca) {
          const dataRegistro = new Date(registro.data_hora_registro);
          const dataRegistroStr = dataRegistro.toISOString().split('T')[0]; // YYYY-MM-DD

          // Verificar se já existe registro duplicado na fila
          if (!registrosPendentes || !Array.isArray(registrosPendentes)) {
            registrosPendentes = [];
          }
          for (const r of registrosPendentes) {
            try {
              const rIsManual = r.pessoa_id.startsWith('manual_');
              const rComum = comuns.find(c => c.id === r.comum_id);
              const rCargo = cargos.find(c => c.id === r.cargo_id);

              let rNome = '';
              let rComumBusca = '';
              let rCargoBusca = '';

              if (rIsManual) {
                rNome = r.pessoa_id
                  .replace(/^manual_/, '')
                  .trim()
                  .toUpperCase();
                rComumBusca = rComum?.nome.toUpperCase() || '';
                rCargoBusca = rCargo?.nome.toUpperCase() || '';
              } else {
                const rPessoas = await this.getPessoasFromLocal(
                  r.comum_id,
                  r.cargo_id,
                  r.instrumento_id || undefined
                );
                const rPessoa = rPessoas.find(p => p.id === r.pessoa_id);

                if (rComum && rCargo && rPessoa) {
                  rNome = (rPessoa.nome_completo || `${rPessoa.nome} ${rPessoa.sobrenome} `)
                    .trim()
                    .toUpperCase();
                  rComumBusca = rComum.nome.toUpperCase();
                  rCargoBusca = (rPessoa.cargo_real || rCargo.nome).toUpperCase();
                }
              }

              if (rNome && rComumBusca && rCargoBusca) {
                const rData = new Date(r.data_hora_registro);
                const rDataStr = rData.toISOString().split('T')[0];

                // 🚨 CRÍTICO: Se for duplicata (mesmo nome, comum, cargo e data), BLOQUEAR salvamento
                if (
                  rNome === nomeBusca &&
                  rComumBusca === comumBusca &&
                  rCargoBusca === cargoBusca &&
                  rDataStr === dataRegistroStr &&
                  r.id !== registro.id // Não é o mesmo registro
                ) {
                  console.warn(
                    '🚨 [DUPLICATA BLOQUEADA] Registro duplicado detectado na fila - NÃO será salvo:',
                    {
                      nome: nomeBusca,
                      comum: comumBusca,
                      cargo: cargoBusca,
                      data: dataRegistroStr,
                      registroExistente: r.id,
                    }
                  );
                  // BLOQUEAR salvamento - retornar imediatamente
                  return;
                }
              }
            } catch (error) {
              // Se houver erro ao verificar um registro, continuar com os outros
              console.warn('⚠️ Erro ao verificar duplicata para registro:', r.id, error);
            }
          }
        }
      } catch (error) {
        // Se houver erro na validação de duplicata, logar mas continuar com o salvamento
        console.warn('⚠️ Erro na validação de duplicata, continuando com salvamento:', error);
        // Garantir que registrosPendentes está definida mesmo em caso de erro
        if (!registrosPendentes || !Array.isArray(registrosPendentes)) {
          try {
            registrosPendentes = await this.getRegistrosPendentesFromLocal();
          } catch (e) {
            registrosPendentes = [];
          }
        }
      }

      // Sempre usar UUID v4 válido
      const id =
        registro.id &&
          /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(registro.id)
          ? registro.id
          : uuidv4();

      // 🚨 VERIFICAÇÃO CRÍTICA: Verificar se UUID já existe na fila (garantir que registrosPendentes está definida)
      if (registrosPendentes && Array.isArray(registrosPendentes)) {
        const existeComMesmoId = registrosPendentes.find(r => r.id === id);
        if (existeComMesmoId) {
          console.warn('🚨 [BLOQUEIO] Registro com mesmo UUID já existe na fila');
          return;
        }
      }
      const now = new Date().toISOString();
      // 🚨 CORREÇÃO: Definir registroCompleto no escopo do try para estar disponível no catch
      const registroCompleto: RegistroPresenca = {
        ...registro,
        id,
        created_at: registro.created_at || now,
        updated_at: registro.updated_at || now,
      };

      if (Platform.OS === 'web') {
        // Para web, usar cache em memória e AsyncStorage
        const existingIndex = memoryCache.registros.findIndex(r => r.id === id);
        if (existingIndex >= 0) {
          memoryCache.registros[existingIndex] = registroCompleto;
        } else {
          memoryCache.registros.push(registroCompleto);
        }

        try {
          await robustSetItem('cached_registros', JSON.stringify(memoryCache.registros));
        } catch (error) {
          console.error('❌ Erro ao salvar no cache web:', error);
          // Tentar salvar novamente
          try {
            const registrosExistentes = await robustGetItem('cached_registros');
            const registros = registrosExistentes ? JSON.parse(registrosExistentes) : [];
            registros.push(registroCompleto);
            await robustSetItem('cached_registros', JSON.stringify(registros));
          } catch (retryError) {
            console.error('❌ Erro crítico ao salvar:', retryError);
            throw retryError;
          }
        }
        return;
      }

      // 🚨 SIMPLIFICAÇÃO TOTAL: Copiar EXATAMENTE o que funciona no BACKUPCONT
      // No BACKUPCONT: localStorage.getItem('fila_envio') || '[]', parse, push, setItem
      const filaKey = 'fila_registros_presenca';

      // 🚨 CRÍTICO: Garantir que o salvamento funcione MESMO se houver erro na validação
      try {
        // Buscar fila existente (exatamente como BACKUPCONT)
        const filaExistente = await robustGetItem(filaKey);
        let fila: RegistroPresenca[] = [];

        if (filaExistente) {
          try {
            fila = JSON.parse(filaExistente);
            if (!Array.isArray(fila)) {
              console.warn('⚠️ Fila não é array, resetando...');
              fila = [];
            }
          } catch (parseError) {
            console.warn('⚠️ Erro ao fazer parse da fila, resetando...', parseError);
            fila = [];
          }
        }

        // Adicionar registro à fila (exatamente como BACKUPCONT)
        // Garantir que status_sincronizacao seja 'pending'
        const registroParaFila: any = {
          ...registroCompleto,
          status_sincronizacao: 'pending' as 'pending', // Garantir que seja pending
          timestamp: new Date().toISOString(),
          tentativas: 0,
        };

        fila.push(registroParaFila as any);

        // Salvar fila atualizada (exatamente como BACKUPCONT)
        await robustSetItem(filaKey, JSON.stringify(fila));

        console.log('✅ Registro salvo na fila (mobile):', {
          totalItens: fila.length,
          ultimoItem: registroCompleto.pessoa_id,
          filaKey,
        });
      } catch (error) {
        console.error('❌ Erro ao salvar na fila:', error);
        // 🚨 CRÍTICO: Tentar salvar novamente com fallback
        try {
          const filaFallback: any[] = [
            {
              ...registroCompleto,
              status_sincronizacao: 'pending',
              timestamp: new Date().toISOString(),
              tentativas: 0,
            },
          ] as any[];
          await robustSetItem(filaKey, JSON.stringify(filaFallback));
          console.log('✅ Registro salvo na fila (fallback):', registroCompleto.pessoa_id);
        } catch (fallbackError) {
          console.error('❌ Erro crítico ao salvar na fila (fallback):', fallbackError);
          // NÃO lançar erro - apenas logar (como BACKUPCONT faz)
        }
      }
    } catch (error) {
      console.error('❌ ERRO CRÍTICO em saveRegistroToLocal:', error);

      // 🚨 CORREÇÃO CRÍTICA: Tentar salvar em AsyncStorage como último recurso antes de lançar erro
      try {
        console.log('🔄 Tentando salvar em AsyncStorage como último recurso...');
        // Criar registro completo se não foi criado antes (pode ter falhado antes)
        const idFinal = registro.id || uuidv4();
        const nowFinal = new Date().toISOString();
        const registroCompletoFallback: RegistroPresenca = {
          ...registro,
          id: idFinal,
          created_at: registro.created_at || nowFinal,
          updated_at: registro.updated_at || nowFinal,
        };
        const fallbackData = {
          ...registroCompletoFallback,
          _fallback: true, // Marcar como fallback para sincronizar depois
        };
        await robustSetItem(`registro_fallback_${idFinal} `, JSON.stringify(fallbackData));
        console.log('✅ Registro salvo em AsyncStorage como último recurso (ID:', idFinal, ')');
        // Não lançar erro - o registro foi salvo no fallback
        return; // Retornar sem erro para não bloquear o usuário
      } catch (fallbackError) {
        console.error('❌ Erro crítico mesmo no fallback final:', fallbackError);
        throw error; // Re-lançar erro original se fallback também falhar
      }
    } finally {
      // 🚨 CORREÇÃO: Liberar lock imediatamente após completar (não esperar 1 segundo)
      // O lock já serviu seu propósito de prevenir salvamentos simultâneos
      savingLock = false;
    }
  },

  async updateRegistroStatus(id: string, status: 'pending' | 'synced'): Promise<void> {
    if (Platform.OS === 'web') {
      // Para web, atualizar cache em memória e AsyncStorage
      const registro = memoryCache.registros.find(r => r.id === id);
      if (registro) {
        registro.status_sincronizacao = status;
        registro.updated_at = new Date().toISOString();
        try {
          await robustSetItem('cached_registros', JSON.stringify(memoryCache.registros));
        } catch (error) {
          console.warn('⚠️ Erro ao atualizar registro no cache:', error);
        }
      }
      return;
    }

    // 🚨 CORREÇÃO CRÍTICA: Para mobile, usar AsyncStorage diretamente
    try {
      const filaKey = 'fila_registros_presenca';
      const filaData = await robustGetItem(filaKey);
      if (filaData) {
        let fila: RegistroPresenca[] = JSON.parse(filaData);
        const index = fila.findIndex(r => r.id === id);
        if (index >= 0) {
          fila[index] = {
            ...fila[index],
            status_sincronizacao: status,
            updated_at: new Date().toISOString(),
          };
          await robustSetItem(filaKey, JSON.stringify(fila));
        }
      }
    } catch (error) {
      console.warn('⚠️ Erro ao atualizar status do registro no AsyncStorage:', error);
    }
  },

  async countRegistrosPendentes(): Promise<number> {
    try {
      // 🚨 CORREÇÃO CRÍTICA: Contar sempre buscando da função unificada (mais seguro e real)
      const registros = await this.getRegistrosPendentesFromLocal();
      return registros.length;
    } catch (error) {
      console.warn('⚠️ Erro ao contar registros pendentes:', error);
      return 0;
    }
  },

  /**
   * Extrai o nome da comum removendo o código de localização
   * Exemplo: "BR-22-1739 - JARDIM MIRANDA" -> "JARDIM MIRANDA"
   */
  extrairNomeComum(comumCompleto: string): string {
    if (!comumCompleto) return '';
    let nome = comumCompleto;
    // Remove "BR-XX-XXXX " do início, se existir
    nome = nome.replace(/^(?:BR-)?\d{2}-\d{4}\s+/, '').trim();
    // Se contém " - ", pegar a parte depois do " - "
    if (nome.includes(' - ')) {
      const partes = nome.split(' - ');
      return partes.slice(1).join(' - ').trim();
    }
    // Se contém apenas " -" (sem espaço antes), também tentar separar
    if (nome.includes(' -')) {
      const partes = nome.split(' -');
      return partes.slice(1).join(' -').trim();
    }
    // Se não tem separador, retornar como está (já com BR- removido)
    return nome.trim();
  },

  /**
   * Busca registros da tabela presencas do Supabase filtrados por local_ensaio
   * Permite busca por nome, cargo ou comum
   */
  async fetchRegistrosFromSupabase(localEnsaio: string, searchTerm?: string): Promise<any[]> {
    if (!isSupabaseConfigured() || !supabase) {
      throw new Error('Supabase não está configurado');
    }

    try {
      console.log('🔍 Buscando registros do Supabase para local:', localEnsaio);
      console.log('🔍 Termo de busca:', searchTerm || 'nenhum');

      const localTrimmed = localEnsaio.trim();

      // Se não há termo de busca, buscar todos os registros do local
      if (!searchTerm || !searchTerm.trim()) {
        const { data, error } = await supabase
          .from('presencas')
          .select('*')
          .ilike('local_ensaio', `%${localTrimmed}%`)
          .order('created_at', { ascending: false })
          .limit(500);

        if (error) {
          console.error('❌ Erro ao buscar registros:', error);
          throw error;
        }

        console.log(`✅ Encontrados ${data?.length || 0} registros do local ${localTrimmed}`);
        return data || [];
      }

      // Se há termo de busca, fazer 3 queries separadas e combinar
      const searchTermTrimmed = searchTerm.trim();

      const promises = [
        supabase
          .from('presencas')
          .select('*')
          .ilike('local_ensaio', `%${localTrimmed}%`)
          .ilike('nome_completo', `%${searchTermTrimmed}%`)
          .order('created_at', { ascending: false })
          .limit(500),
        supabase
          .from('presencas')
          .select('*')
          .ilike('local_ensaio', `%${localTrimmed}%`)
          .ilike('cargo', `%${searchTermTrimmed}%`)
          .order('created_at', { ascending: false })
          .limit(500),
        supabase
          .from('presencas')
          .select('*')
          .ilike('local_ensaio', `%${localTrimmed}%`)
          .ilike('comum', `%${searchTermTrimmed}%`)
          .order('created_at', { ascending: false })
          .limit(500),
      ];

      const results = await Promise.all(promises);
      const allData: any[] = [];
      const seenUUIDs = new Set<string>();

      // Combinar resultados removendo duplicatas
      results.forEach((result, idx) => {
        if (result && result.data && Array.isArray(result.data)) {
          console.log(`🔍 Resultado da query ${idx + 1}:`, result.data.length, 'registros');
          result.data.forEach(item => {
            const uuid =
              item.uuid || item.UUID || `${item.nome_completo || ''}_${item.comum || ''}`;
            if (!seenUUIDs.has(uuid)) {
              seenUUIDs.add(uuid);
              allData.push(item);
            }
          });
        } else if (result && result.error) {
          console.error(`❌ Erro na query ${idx + 1}:`, result.error);
        }
      });

      // Ordenar por data de criação (mais recente primeiro)
      allData.sort((a, b) => {
        const dateA = new Date(a.created_at || a.CREATED_AT || 0).getTime();
        const dateB = new Date(b.created_at || b.CREATED_AT || 0).getTime();
        return dateB - dateA;
      });

      console.log(`✅ Total de registros únicos encontrados: ${allData.length}`);
      return allData.slice(0, 500); // Limitar a 500 registros
    } catch (error) {
      console.error('❌ Erro ao buscar registros du Supabase:', error);
      throw error;
    }
  },

  /**
   * Atualiza um registro na tabela presencas do Supabase
   */
  async updateRegistroInSupabase(
    uuid: string,
    updateData: {
      nome_completo?: string;
      comum?: string;
      cidade?: string;
      cargo?: string;
      nivel?: string; // 🚨 CORREÇÃO: Adicionar campo nivel
      instrumento?: string;
      naipe_instrumento?: string;
      classe_organista?: string;
      data_ensaio?: string;
      anotacoes?: string;
    }
  ): Promise<{ success: boolean; error?: string }> {
    if (!isSupabaseConfigured() || !supabase) {
      return { success: false, error: 'Supabase não está configurado' };
    }

    try {
      console.log('💾 Atualizando registro no Supabase:', uuid, updateData);

      // Remover campos que não existem na tabela presencas
      const { anotacoes, ...supabaseUpdateData } = updateData;

      const { data, error } = await supabase
        .from('presencas')
        .update({
          ...supabaseUpdateData,
          updated_at: new Date().toISOString(),
        })
        .eq('uuid', uuid)
        .select();

      if (error) {
        console.error('❌ Erro ao atualizar registro no Supabase:', error);
        return { success: false, error: error.message };
      }

      if (!data || data.length === 0) {
        console.warn('⚠️ Nenhum registro foi atualizado (pode ser problema de permissões RLS)');
        return { success: false, error: 'Nenhum registro foi atualizado' };
      }

      console.log('✅ Registro atualizado com sucesso no Supabase');
      return { success: true };
    } catch (error) {
      console.error('❌ Erro ao atualizar registro no Supabase:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      };
    }
  },

  async syncData(): Promise<void> {
    try {
      console.log('🔄 Sincronizando dados básicos (Comuns, Cargos, Instrumentos)...');
      await Promise.all([
        this.syncComunsToLocal(),
        this.syncCargosToLocal(),
        this.syncInstrumentosToLocal(),
      ]);
      console.log('✅ Sincronização básica concluída');
    } catch (error) {
      console.error('❌ Erro durante sincronização básica:', error);
    }
  },

  async deleteRegistro(uuid: string): Promise<{ success: boolean; error?: string }> {
    if (!isSupabaseConfigured() || !supabase) {
      return { success: false, error: 'Supabase não está configurado' };
    }

    try {
      console.log(`🗑️ Deletando registro ${uuid} do Supabase...`);

      const { error } = await supabase
        .from('presencas')
        .delete()
        .eq('uuid', uuid);

      if (error) {
        console.error('❌ Erro ao deletar do Supabase:', error);
        return { success: false, error: error.message };
      }

      // Remover do cache em memória
      memoryCache.registros = memoryCache.registros.filter(r => (r as any).uuid !== uuid && r.id !== uuid);

      // Remover do robustStorage (cache web)
      try {
        const cached = await robustGetItem('cache_registros_presenca');
        if (cached) {
          const registros = JSON.parse(cached);
          const filtrados = registros.filter((r: any) => (r.uuid || r.id) !== uuid);
          await robustSetItem('cache_registros_presenca', JSON.stringify(filtrados));
        }
      } catch (e) {
        console.warn('⚠️ Erro ao atualizar cache robusto após deleção:', e);
      }

      // Remover do SQLite (mobile)
      if (Platform.OS !== 'web') {
        try {
          const db = await getDatabase();
          await db.runAsync('DELETE FROM registros_presenca WHERE uuid = ?', [uuid]);
        } catch (e) {
          console.warn('⚠️ Erro ao deletar do SQLite:', e);
        }
      }

      console.log(`✅ Registro ${uuid} deletado com sucesso`);
      return { success: true };
    } catch (error) {
      console.error('❌ Erro inesperado ao deletar registro:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Erro desconhecido' };
    }
  },
};
