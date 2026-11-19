jest.mock('../config/env', () => ({
  env: { SUPABASE_URL: 'https://example.test', SUPABASE_ANON_KEY: 'public-key' },
}));
import { PublicMeetingService, MeetingRequestError } from '../services/publicMeetingService';
import {
  PUBLIC_MEETING,
  isPublicMeetingPath,
  meetingLabel,
  filterMeetingOptions,
} from '../config/publicMeeting';
const response = (data: unknown, ok = true) => ({ ok, json: async () => data }) as Response;
describe('Public meeting requests', () => {
  let fetcher: jest.Mock;
  let service: PublicMeetingService;
  beforeEach(() => {
    fetcher = jest.fn();
    service = new PublicMeetingService(fetcher, { url: 'https://example.test', key: 'public-key' });
  });
  it('uses the public key and dedicated event without reading an authenticated session', async () => {
    fetcher.mockResolvedValue(response([{ id: 'person-1', nome: 'Nome de Teste' }]));
    await service.people('ITAPEVI', 'church-1', '  teste  ');
    const [url, options] = fetcher.mock.calls[0];
    expect(url).toBe('https://example.test/rest/v1/rpc/ram_public_people');
    expect(options.headers.Authorization).toBe('Bearer public-key');
    expect(JSON.parse(options.body)).toEqual({
      p_evento: PUBLIC_MEETING.slug,
      p_municipio: 'ITAPEVI',
      p_comum: 'church-1',
      p_busca: 'teste',
    });
  });
  it('does not query names before municipality, church and minimum search text are provided', async () => {
    expect(await service.people('', 'church-1', 'teste')).toEqual([]);
    expect(await service.people('ITAPEVI', '', 'teste')).toEqual([]);
    expect(await service.people('ITAPEVI', 'church-1', 'a')).toEqual([]);
    expect(fetcher).not.toHaveBeenCalled();
  });
  it('accepts an idempotent receipt from the database', async () => {
    const receipt = { id: 'receipt-1', confirmado_em: '2026-11-19T12:00:00Z', ja_confirmado: true };
    fetcher.mockResolvedValue(response(receipt));
    expect(await service.confirm('ITAPEVI', 'church-1', 'person-1')).toEqual(receipt);
  });
  it.each([null, {}, { id: 'receipt-1', confirmado_em: 'invalid', ja_confirmado: false }])(
    'never reports success for an invalid response %#',
    async value => {
      fetcher.mockResolvedValue(response(value));
      await expect(service.confirm('ITAPEVI', 'church-1', 'person-1')).rejects.toBeInstanceOf(
        MeetingRequestError
      );
    }
  );
  it('rejects a missing person without issuing a write', async () => {
    await expect(service.confirm('ITAPEVI', 'church-1', '')).rejects.toMatchObject({
      kind: 'invalid',
    });
    expect(fetcher).not.toHaveBeenCalled();
  });
  it('keeps server diagnostics out of participant error messages', async () => {
    fetcher.mockResolvedValue(response({ message: 'internal SQL secret: table not found' }, false));
    await expect(service.confirm('ITAPEVI', 'church-1', 'person-1')).rejects.toMatchObject({
      kind: 'unavailable',
      message: 'Não foi possível concluir agora. Tente novamente em instantes.',
    });
  });
  it('recognizes event closure and invalid participant responses', async () => {
    fetcher.mockResolvedValueOnce(response({ message: 'INSCRICOES_ENCERRADAS' }, false));
    await expect(service.confirm('ITAPEVI', 'church-1', 'person-1')).rejects.toMatchObject({
      kind: 'closed',
    });
    fetcher.mockResolvedValueOnce(response({ message: 'PARTICIPANTE_INVALIDO' }, false));
    await expect(service.confirm('ITAPEVI', 'church-1', 'person-1')).rejects.toMatchObject({
      kind: 'invalid',
    });
  });
  it('does not accept a catalog for a different event', async () => {
    fetcher.mockResolvedValue(
      response({ evento: { slug: 'other', aberto: true }, municipios: [] })
    );
    await expect(service.catalog()).rejects.toBeInstanceOf(MeetingRequestError);
  });
  it('a network failure remains retryable and does not produce a receipt', async () => {
    fetcher.mockRejectedValue(new Error('Offline'));
    await expect(service.confirm('ITAPEVI', 'church-1', 'person-1')).rejects.toMatchObject({
      kind: 'network',
    });
  });
});
describe('Public route and labels', () => {
  const churches = [
    { id: '1', label: 'Vila São João', searchText: 'BR-21-0001' },
    { id: '2', label: 'Central' },
    { id: '3', label: 'Jardim São Pedro' },
  ];
  it('filters congregation names without accents or case sensitivity', () => {
    expect(filterMeetingOptions(churches, 'SAO JOAO').map(item => item.id)).toEqual(['1']);
    expect(filterMeetingOptions(churches, 'pedro jardim').map(item => item.id)).toEqual(['3']);
  });
  it('also finds a congregation by its code and supports an empty search', () => {
    expect(filterMeetingOptions(churches, '21-0001').map(item => item.id)).toEqual(['1']);
    expect(filterMeetingOptions(churches, '')).toEqual(churches);
  });
  it('does not return unrelated congregations for an unknown search', () => {
    expect(filterMeetingOptions(churches, 'nao existe')).toEqual([]);
  });
  it('accepts only the explicit public path, including its trailing slash', () => {
    expect(isPublicMeetingPath('/confirmar-presenca')).toBe(true);
    expect(isPublicMeetingPath('/confirmar-presenca/')).toBe(true);
    expect(isPublicMeetingPath('/')).toBe(false);
    expect(isPublicMeetingPath('/confirmar-presenca-admin')).toBe(false);
    expect(isPublicMeetingPath('/Register')).toBe(false);
  });
  it('formats municipality names without changing Portuguese accents', () => {
    expect(meetingLabel('SANTANA DE PARNAÍBA')).toBe('Santana de Parnaíba');
    expect(meetingLabel('CAUCAIA DO ALTO')).toBe('Caucaia do Alto');
  });
});
