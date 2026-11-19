import { env } from '../config/env';
import { PUBLIC_MEETING } from '../config/publicMeeting';

export interface MeetingChurch {
  id: string;
  nome: string;
}
export interface MeetingMunicipality {
  id: string;
  nome: string;
  comuns: MeetingChurch[];
}
export interface MeetingPerson {
  id: string;
  nome: string;
  cargo?: string;
}
export interface MeetingCatalog {
  evento: {
    slug: string;
    titulo: string;
    data: string;
    local: string;
    horario?: string | null;
    aberto: boolean;
  };
  municipios: MeetingMunicipality[];
}
export interface MeetingReceipt {
  id: string;
  confirmado_em: string;
  ja_confirmado: boolean;
}
export class MeetingRequestError extends Error {
  constructor(
    public kind: 'closed' | 'invalid' | 'unavailable' | 'network',
    message: string
  ) {
    super(message);
    this.name = 'MeetingRequestError';
  }
}
export class PublicMeetingService {
  constructor(
    private fetcher: typeof fetch = (input, options) => fetch(input, options),
    private config = {
      url: env.SUPABASE_URL,
      key: env.SUPABASE_ANON_KEY,
    }
  ) {}
  private async rpc(
    name: string,
    values: Record<string, string>,
    signal?: AbortSignal
  ): Promise<any> {
    if (!this.config.url || !this.config.key)
      throw new MeetingRequestError(
        'unavailable',
        'A confirmação está temporariamente indisponível. Tente novamente em instantes.'
      );
    const controller = new AbortController();
    const cancel = () => controller.abort();
    if (signal?.aborted) controller.abort();
    signal?.addEventListener('abort', cancel);
    const timer = setTimeout(cancel, 15000);
    try {
      const request = this.fetcher;
      const response = await request(this.config.url.replace(/\/$/, '') + '/rest/v1/rpc/' + name, {
        method: 'POST',
        headers: {
          apikey: this.config.key,
          Authorization: 'Bearer ' + this.config.key,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ p_evento: PUBLIC_MEETING.slug, ...values }),
        signal: controller.signal,
      });
      const data = await response.json();
      if (!response.ok) {
        const message = typeof data?.message === 'string' ? data.message : '';
        if (message.includes('INSCRICOES_ENCERRADAS'))
          throw new MeetingRequestError(
            'closed',
            'As confirmações para esta reunião foram encerradas.'
          );
        if (message.includes('PARTICIPANTE_INVALIDO'))
          throw new MeetingRequestError(
            'invalid',
            'Confira seu município, sua comum e selecione novamente seu nome.'
          );
        throw new MeetingRequestError(
          'unavailable',
          'Não foi possível concluir agora. Tente novamente em instantes.'
        );
      }
      return data;
    } catch (error) {
      if (signal?.aborted) {
        const aborted = new Error('Aborted');
        aborted.name = 'AbortError';
        throw aborted;
      }
      if (error instanceof MeetingRequestError) throw error;
      throw new MeetingRequestError(
        'network',
        'Não foi possível conectar. Confira sua internet e tente novamente.'
      );
    } finally {
      clearTimeout(timer);
      signal?.removeEventListener('abort', cancel);
    }
  }
  async catalog(signal?: AbortSignal): Promise<MeetingCatalog> {
    const data = await this.rpc('ram_public_catalog', {}, signal);
    if (
      !data ||
      data.evento?.slug !== PUBLIC_MEETING.slug ||
      typeof data.evento.aberto !== 'boolean' ||
      !Array.isArray(data.municipios) ||
      data.municipios.some(
        (city: MeetingMunicipality) =>
          !city ||
          typeof city.id !== 'string' ||
          typeof city.nome !== 'string' ||
          !Array.isArray(city.comuns) ||
          city.comuns.some(
            church => !church || typeof church.id !== 'string' || typeof church.nome !== 'string'
          )
      )
    )
      throw new MeetingRequestError(
        'unavailable',
        'Não foi possível carregar as opções. Tente novamente.'
      );
    return data;
  }
  async people(
    city: string,
    church: string,
    query: string,
    signal?: AbortSignal
  ): Promise<MeetingPerson[]> {
    if (!city || !church || query.trim().length < 2) return [];
    const data = await this.rpc(
      'ram_public_people',
      { p_municipio: city, p_comum: church, p_busca: query.trim().slice(0, 80) },
      signal
    );
    if (
      !Array.isArray(data) ||
      data.length > 25 ||
      data.some(
        person => !person || typeof person.id !== 'string' || typeof person.nome !== 'string'
      )
    )
      throw new MeetingRequestError(
        'unavailable',
        'Não foi possível buscar os nomes. Tente novamente.'
      );
    return data;
  }
  async confirm(city: string, church: string, person: string): Promise<MeetingReceipt> {
    if (!city || !church || !person)
      throw new MeetingRequestError('invalid', 'Selecione seu município, sua comum e seu nome.');
    const data = await this.rpc('ram_public_confirm', {
      p_municipio: city,
      p_comum: church,
      p_pessoa: person,
    });
    if (
      !data ||
      typeof data.id !== 'string' ||
      !data.id ||
      typeof data.confirmado_em !== 'string' ||
      !Number.isFinite(Date.parse(data.confirmado_em)) ||
      typeof data.ja_confirmado !== 'boolean'
    )
      throw new MeetingRequestError(
        'unavailable',
        'Não foi possível confirmar o recebimento. Tente novamente; sua presença não será duplicada.'
      );
    return data;
  }
}
export const publicMeetingService = new PublicMeetingService();
