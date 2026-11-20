import { env } from '../config/env';
import { PUBLIC_MEETING } from '../config/publicMeeting';
import md5 from 'blueimp-md5';
import { getNaipeByInstrumento } from '../utils/instrumentNaipe';
import { normalizarRegistroCargoFeminino } from '../utils/normalizeCargoFeminino';
import { normalizarNivel } from '../utils/normalizeNivel';
import { formatDate, formatTime } from '../utils/dateUtils';

const MEETING_SHEET_ID = '1LGoW7lbYS4crpEdTfGR2evuH9kArZgqrvVbmi6buBoQ';
const normalize = (value: string) =>
  value
    .trim()
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ');
export function meetingRegistrationId(city: string, church: string, name: string): string {
  const hash = md5(PUBLIC_MEETING.slug + '|' + city + '|' + church + '|' + normalize(name));
  return [
    hash.slice(0, 8),
    hash.slice(8, 12),
    hash.slice(12, 16),
    hash.slice(16, 20),
    hash.slice(20),
  ].join('-');
}

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
    public kind: 'closed' | 'invalid' | 'unavailable' | 'network' | 'duplicate',
    message: string
  ) {
    super(message);
    this.name = 'MeetingRequestError';
  }
}
export class PublicMeetingService {
  private selectedPeople = new Map<string, MeetingPerson>();
  constructor(
    private fetcher: typeof fetch = (input, options) => fetch(input, options),
    private config: { url: string; key: string; sheetsUrl?: string } = {
      url: env.SUPABASE_URL,
      key: env.SUPABASE_ANON_KEY,
      sheetsUrl: env.SHEETS_ENDPOINT_URL,
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
    for (const person of data)
      this.selectedPeople.set(city + '|' + church + '|' + person.id, person);
    return data;
  }
  async confirm(
    city: string,
    church: string,
    person: string,
    restoredSelection?: MeetingPerson
  ): Promise<MeetingReceipt> {
    if (!city || !church || !person)
      throw new MeetingRequestError('invalid', 'Selecione seu município, sua comum e seu nome.');
    const catalog = await this.catalog();
    if (!catalog.evento.aberto)
      throw new MeetingRequestError(
        'closed',
        'As confirmações para esta reunião foram encerradas.'
      );
    const municipality = catalog.municipios.find(item => item.id === city);
    const congregation = municipality?.comuns.find(item => item.id === church);
    const manual = person.startsWith('manual_');
    const selected =
      this.selectedPeople.get(city + '|' + church + '|' + person) ||
      (restoredSelection?.id === person ? restoredSelection : undefined);
    const name = manual ? person.slice(7).trim() : selected?.nome;
    if (
      !municipality ||
      !congregation ||
      !name ||
      name.length > 150 ||
      (manual && (name.length < 5 || name.split(/\s+/).length < 2))
    ) {
      throw new MeetingRequestError(
        'invalid',
        'Confira seu município, sua comum e informe seu nome completo.'
      );
    }
    const uuid = meetingRegistrationId(city, church, name);
    const path = '/rest/v1/presencas?uuid=eq.' + uuid + '&select=uuid,created_at';
    const existing = await this.destinationRequest(this.config.url.replace(/\/$/, '') + path);
    if (!Array.isArray(existing))
      throw new MeetingRequestError(
        'unavailable',
        'Não foi possível verificar a confirmação. Tente novamente.'
      );
    if (existing[0]) return this.receipt(existing[0], true);
    let profile: { cargo?: string; instrumento?: string; nivel?: string } | undefined;
    if (!manual) {
      // O RPC de busca retorna só os dados necessários à seleção do nome.
      // Buscar o cadastro exato antes do envio, como faz o sistema raiz.
      const filters = new URLSearchParams({
        select: 'id,nome,cargo,instrumento,nivel,cidade,comum',
        id: 'eq.' + person,
        limit: '1',
      });
      const records = await this.destinationRequest(
        this.config.url.replace(/\/$/, '') + '/rest/v1/cadastro?' + filters.toString()
      );
      const record = Array.isArray(records) ? records[0] : null;
      if (
        !record ||
        String(record.id) !== person ||
        normalize(record.nome || '') !== normalize(name) ||
        normalize(record.cidade || '') !== normalize(municipality.nome) ||
        normalize(record.comum || '') !== normalize(congregation.nome)
      ) {
        throw new MeetingRequestError(
          'invalid',
          'Confira seu município, sua comum e selecione novamente seu nome.'
        );
      }
      profile = record;
    }
    const cargo =
      profile?.cargo?.trim().toUpperCase() || selected?.cargo?.trim().toUpperCase() || null;
    const normalized = normalizarRegistroCargoFeminino(
      cargo || '',
      profile?.instrumento,
      profile?.nivel
    );
    const instrumento = (normalized.instrumentoNome || '').trim().toUpperCase() || null;
    const nivel = normalizarNivel(profile?.nivel, instrumento, cargo)?.toUpperCase() || null;
    const naipe =
      normalized.naipeInstrumento || (instrumento ? getNaipeByInstrumento(instrumento) : null);
    const isOrgan = instrumento === 'ÓRGÃO' || instrumento === 'ORGAO';
    const classe =
      normalized.isNormalizado || isOrgan ? nivel || normalized.classeOrganista || null : null;
    const createdAt = new Date().toISOString();
    const row = {
      uuid,
      nome_completo: name.trim().toUpperCase(),
      cidade: municipality.nome.toUpperCase(),
      comum: congregation.nome.toUpperCase(),
      cargo,
      nivel,
      instrumento,
      naipe_instrumento: naipe?.toUpperCase() || null,
      classe_organista: classe?.toUpperCase() || null,
      local_ensaio: 'REUNIAO MUSICAL - CENTRAL DE ITAPEVI',
      data_ensaio: PUBLIC_MEETING.date + 'T12:00:00.000Z',
      registrado_por: 'Sistema',
      created_at: createdAt,
    };
    // O serviço raiz rejeita append quando a presença já está no Supabase.
    // Enviar primeiro à planilha permite usar o endpoint existente sem esse bloqueio.
    // Não usar recibos antigos do navegador: após uma exclusão manual no banco,
    // uma nova confirmação precisa enviar novamente aos dois destinos.
    // Nas novas tentativas, o Apps Script deduplica pelo mesmo UUID.
    {
      const sheetsUrl = this.config.sheetsUrl || env.SHEETS_ENDPOINT_URL;
      if (!sheetsUrl)
        throw new MeetingRequestError(
          'unavailable',
          'O envio à planilha está indisponível. Tente novamente em instantes.'
        );
      const result = await this.destinationRequest(
        sheetsUrl,
        {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({
            op: 'append',
            sheet: 'Dados',
            Sheet: 'Dados',
            data: {
              UUID: uuid,
              'NOME COMPLETO': row.nome_completo,
              COMUM: row.comum,
              CIDADE: row.cidade,
              CARGO: row.cargo || '',
              NÍVEL:
                row.nivel ||
                (cargo === 'INSTRUTORA' || cargo?.includes('EXAMINADORA') ? 'OFICIALIZADA' : ''),
              INSTRUMENTO: row.instrumento || '',
              NAIPE_INSTRUMENTO: row.naipe_instrumento || '',
              CLASSE_ORGANISTA: row.classe_organista || '',
              LOCAL_ENSAIO: row.local_ensaio,
              DATA_ENSAIO: formatDate(row.data_ensaio),
              REGISTRADO_POR: row.registrado_por,
              SYNC_STATUS: 'ATUALIZADO',
              SYNCED_AT: formatDate(createdAt) + ' ' + formatTime(createdAt),
              ANOTACOES: manual ? 'SAM Desatualizado' : '',
              DUPLICATA: 'NÃO',
            },
          }),
        },
        false
      );
      if (result?.ok === false && result.error === 'DUPLICATA') {
        throw new MeetingRequestError(
          'duplicate',
          'Essa presença já foi registrada para esta reunião.'
        );
      }
      if (
        result?.ok !== true ||
        result.uuid !== uuid ||
        result.diag?.master?.ok !== true ||
        result.diag.master.id !== MEETING_SHEET_ID ||
        result.diag.master.sheet !== 'Dados'
      ) {
        throw new MeetingRequestError(
          'unavailable',
          'Não foi possível confirmar o envio à planilha. Tente novamente; seu nome será mantido.'
        );
      }
    }
    const data = await this.destinationRequest(
      this.config.url.replace(/\/$/, '') + '/rest/v1/presencas?on_conflict=uuid',
      {
        method: 'POST',
        headers: { Prefer: 'resolution=ignore-duplicates,return=representation' },
        body: JSON.stringify(row),
      }
    );
    if (Array.isArray(data) && data[0]) return this.receipt(data[0], false);
    const saved = await this.destinationRequest(this.config.url.replace(/\/$/, '') + path);
    return this.receipt(saved?.[0], true);
  }
  private receipt(row: any, repeated: boolean): MeetingReceipt {
    if (!row?.uuid || !Number.isFinite(Date.parse(row.created_at)))
      throw new MeetingRequestError(
        'unavailable',
        'Não foi possível confirmar a gravação no Supabase. Tente novamente; seu nome será mantido.'
      );
    return { id: row.uuid, confirmado_em: row.created_at, ja_confirmado: repeated };
  }
  private async destinationRequest(
    url: string,
    options: RequestInit = {},
    database = true
  ): Promise<any> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), database ? 15000 : 45000);
    try {
      const response = await this.fetcher(url, {
        ...options,
        signal: controller.signal,
        headers: database
          ? {
              apikey: this.config.key,
              Authorization: 'Bearer ' + this.config.key,
              'Content-Type': 'application/json',
              ...options.headers,
            }
          : options.headers,
      });
      const data = await response.json();
      if (!response.ok)
        throw new MeetingRequestError(
          'unavailable',
          database
            ? 'Não foi possível concluir a gravação no Supabase. Tente novamente; seu nome será mantido.'
            : 'Não foi possível enviar à planilha. Tente novamente; seu nome será mantido.'
        );
      return data;
    } catch (error) {
      if (error instanceof MeetingRequestError) throw error;
      throw new MeetingRequestError(
        'network',
        'Não foi possível conectar. Confira sua internet e tente novamente.'
      );
    } finally {
      clearTimeout(timer);
    }
  }
}
export const publicMeetingService = new PublicMeetingService();
