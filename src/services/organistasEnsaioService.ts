import { supabase, isSupabaseConfigured, ensureSessionRestored } from './supabaseClient';
import { OrganistaEnsaio } from '../types/models';
import { Platform } from 'react-native';
import { env } from '../config/env';

const TABLE_NAME = 'organistas_ensaio';
const GOOGLE_SHEETS_API_URL = env.SHEETS_ENDPOINT_URL || 'https://script.google.com/macros/s/AKfycbxPtvi86jPy7y41neTpIPvn3hpycd3cMjbgjgifzLD6qRwrJVPlF9EDulaQp42nma-i/exec';

export const organistasEnsaioService = {
  /**
   * Buscar organistas da tabela presencas baseado no local do ensaio
   * Retorna todas as organistas que estiveram presentes em ensaios anteriores
   * Filtra por cargo Organista ou instrumento Órgão
   */
  async fetchOrganistasByLocalEnsaio(localEnsaio: string): Promise<any[]> {
    if (!isSupabaseConfigured() || !supabase) {
      throw new Error('Supabase não está configurado');
    }

    if (!localEnsaio) {
      return [];
    }

    try {
      // Garantir que sessão está restaurada
      await ensureSessionRestored();

      // Normalizar local do ensaio para busca
      const localTrimmed = localEnsaio.trim().toUpperCase();

      // Buscar organistas da tabela presencas que:
      // 1. Estiveram presentes no local do ensaio
      // 2. Têm cargo Organista OU instrumento Órgão
      // 3. Ordenar por data mais recente primeiro
      const { data, error } = await supabase
        .from('presencas')
        .select('nome_completo, comum, cidade, cargo, instrumento, nivel, local_ensaio, data_ensaio')
        .ilike('local_ensaio', `%${localTrimmed}%`)
        .or('cargo.ilike.%ORGANISTA%,instrumento.ilike.%ÓRGÃO%')
        .order('data_ensaio', { ascending: false })
        .limit(1000); // Limitar para performance

      if (error) {
        console.error('❌ Erro ao buscar organistas da tabela presencas:', error);
        throw error;
      }

      if (!data || data.length === 0) {
        console.log('⚠️ Nenhuma organista encontrada na tabela presencas');
        return [];
      }

      // Remover duplicatas baseado em nome_completo + comum
      // Manter apenas o registro mais recente de cada organista
      const uniqueMap = new Map<string, any>();
      data.forEach((item: any) => {
        const nomeCompleto = (item.nome_completo || '').trim();
        const comum = (item.comum || '').trim();
        const key = `${nomeCompleto}_${comum}`.toUpperCase();

        // Se já existe, manter apenas o mais recente (já está ordenado por data_ensaio desc)
        // Isso garante que temos a data da última presença da organista
        if (!uniqueMap.has(key)) {
          uniqueMap.set(key, {
            nome: nomeCompleto,
            comum: comum,
            cidade: (item.cidade || '').trim(),
            cargo: (item.cargo || '').trim(),
            nivel: (item.nivel || '').trim(),
            instrumento: (item.instrumento || '').trim(),
            ultimaPresenca: item.data_ensaio || item.created_at, // Data da última presença
          });
        }
      });

      const uniqueData = Array.from(uniqueMap.values());

      // Ordenar por nome para facilitar busca
      uniqueData.sort((a, b) => {
        const nomeA = (a.nome || '').toUpperCase();
        const nomeB = (b.nome || '').toUpperCase();
        return nomeA.localeCompare(nomeB);
      });

      console.log(`✅ ${uniqueData.length} organistas únicas encontradas na tabela presencas`);

      return uniqueData;
    } catch (error) {
      console.error('❌ Erro ao buscar organistas:', error);
      throw error;
    }
  },

  /**
   * Buscar registros de organistas no ensaio por local e data
   */
  async fetchRegistrosByLocalAndDate(
    localEnsaio: string,
    dataEnsaio: string
  ): Promise<OrganistaEnsaio[]> {
    if (!isSupabaseConfigured() || !supabase) {
      throw new Error('Supabase não está configurado');
    }

    try {
      await ensureSessionRestored();

      const { data, error } = await supabase
        .from(TABLE_NAME)
        .select('*')
        .eq('local_ensaio', localEnsaio)
        .eq('data_ensaio', dataEnsaio)
        .order('organista_nome', { ascending: true });

      if (error) {
        console.error('❌ Erro ao buscar registros de organistas:', error);
        throw error;
      }

      return (data || []) as OrganistaEnsaio[];
    } catch (error) {
      console.error('❌ Erro ao buscar registros de organistas:', error);
      throw error;
    }
  },

  /**
   * Salvar ou atualizar registro de organista no ensaio
   */
  async saveOrganistaEnsaio(registro: OrganistaEnsaio): Promise<{ success: boolean; error?: string }> {
    if (!isSupabaseConfigured() || !supabase) {
      return { success: false, error: 'Supabase não está configurado' };
    }

    try {
      await ensureSessionRestored();

      // Verificar se já existe registro para esta organista, local e data
      const { data: existing } = await supabase
        .from(TABLE_NAME)
        .select('id')
        .eq('organista_nome', registro.organista_nome)
        .eq('local_ensaio', registro.local_ensaio)
        .eq('data_ensaio', registro.data_ensaio)
        .maybeSingle();

      if (existing) {
        // Atualizar registro existente
        const { error } = await supabase
          .from(TABLE_NAME)
          .update({
            tocou: registro.tocou,
            observacoes: registro.observacoes || null,
            usuario_responsavel: registro.usuario_responsavel,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id);

        if (error) {
          console.error('❌ Erro ao atualizar registro de organista:', error);
          return { success: false, error: error.message };
        }

        console.log('✅ Registro de organista atualizado com sucesso');

        // Atualizar planilha do Google Sheets após atualizar no Supabase
        await atualizarPlanilhaOrganistas(registro.local_ensaio);

        return { success: true };
      } else {
        // Inserir novo registro
        const { error } = await supabase
          .from(TABLE_NAME)
          .insert({
            organista_nome: registro.organista_nome,
            organista_comum: registro.organista_comum || null,
            organista_cidade: registro.organista_cidade || null,
            local_ensaio: registro.local_ensaio,
            data_ensaio: registro.data_ensaio,
            tocou: registro.tocou,
            usuario_responsavel: registro.usuario_responsavel,
            observacoes: registro.observacoes || null,
          });

        if (error) {
          console.error('❌ Erro ao salvar registro de organista:', error);
          return { success: false, error: error.message };
        }

        console.log('✅ Registro de organista salvo com sucesso');

        // Atualizar planilha do Google Sheets após salvar no Supabase
        await atualizarPlanilhaOrganistas(registro.local_ensaio);

        return { success: true };
      }
    } catch (error: any) {
      console.error('❌ Erro ao salvar registro de organista:', error);
      return { success: false, error: error.message || 'Erro desconhecido' };
    }
  },

  /**
   * Deletar registro de organista no ensaio
   */
  async deleteOrganistaEnsaio(id: string): Promise<{ success: boolean; error?: string }> {
    if (!isSupabaseConfigured() || !supabase) {
      return { success: false, error: 'Supabase não está configurado' };
    }

    try {
      await ensureSessionRestored();

      const { error } = await supabase
        .from(TABLE_NAME)
        .delete()
        .eq('id', id);

      if (error) {
        console.error('❌ Erro ao deletar registro de organista:', error);
        return { success: false, error: error.message };
      }

      console.log('✅ Registro de organista deletado com sucesso');
      return { success: true };
    } catch (error: any) {
      console.error('❌ Erro ao deletar registro de organista:', error);
      return { success: false, error: error.message || 'Erro desconhecido' };
    }
  },
};

/**
 * Função auxiliar para atualizar a planilha de organistas no Google Sheets
 */
async function atualizarPlanilhaOrganistas(localEnsaio: string): Promise<void> {
  try {
    // Mapear local para a função correspondente no Google Apps Script
    const localMap: { [key: string]: string } = {
      'Itapevi': 'exportar_completo_itapevi',
      'Caucaia do Alto': 'exportar_completo_caucaia',
      'Jandira': 'exportar_completo_jandira',
      'Fazendinha': 'exportar_completo_fazendinha',
      'Pirapora': 'exportar_completo_pirapora',
      'Vargem Grande': 'exportar_completo_vargemgrande',
      'Cotia': 'exportar_completo_cotia',
    };

    // Normalizar nome do local
    const localNormalizado = localEnsaio.trim();
    const op = localMap[localNormalizado] || localMap['Itapevi']; // Default para Itapevi

    console.log(`🔄 Atualizando planilha de organistas para ${localNormalizado}...`);

    const requestBody = {
      op: op,
      local_ensaio: localNormalizado,
    };

    // Fazer chamada assíncrona sem esperar resposta (fire and forget)
    fetch(GOOGLE_SHEETS_API_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify(requestBody),
    }).catch(error => {
      // Ignorar erros silenciosamente - não queremos bloquear o fluxo principal
      console.warn('⚠️ Erro ao atualizar planilha (não crítico):', error);
    });

    console.log(`✅ Requisição de atualização da planilha enviada para ${localNormalizado}`);
  } catch (error) {
    // Ignorar erros silenciosamente - não queremos bloquear o fluxo principal
    console.warn('⚠️ Erro ao atualizar planilha (não crítico):', error);
  }
}

