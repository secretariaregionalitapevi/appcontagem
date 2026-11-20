jest.mock('../config/env', () => ({
  env: {
    SUPABASE_URL: 'https://example.test',
    SUPABASE_ANON_KEY: 'public-key',
    SHEETS_ENDPOINT_URL: 'https://sheets.test',
  },
}));
import { PublicMeetingService } from '../services/publicMeetingService';
import { PUBLIC_MEETING, isPublicMeetingPath, filterMeetingOptions } from '../config/publicMeeting';
const response = (data: unknown, ok = true) => ({ ok, json: async () => data }) as Response;
const catalog = () => ({
  evento: { slug: PUBLIC_MEETING.slug, aberto: true },
  municipios: [{ id: 'ITAPEVI', nome: 'ITAPEVI', comuns: [{ id: 'common', nome: 'CENTRAL' }] }],
});
describe('Public meeting destinations', () => {
  let fetcher: jest.Mock,
    service: PublicMeetingService,
    saved: any[],
    sheetOk: boolean,
    databaseOk: boolean,
    profile: any;
  beforeEach(() => {
    const storage = new Map<string, string>();
    (globalThis as any).localStorage = {
      getItem: (key: string) => storage.get(key) || null,
      setItem: (key: string, value: string) => storage.set(key, value),
    };
    saved = [];
    sheetOk = true;
    databaseOk = true;
    profile = {
      id: 'person',
      nome: 'JOÃO DE TESTE',
      cargo: 'MÚSICO',
      instrumento: 'VIOLINO',
      nivel: 'OFICIALIZADO(A)',
      cidade: 'ITAPEVI',
      comum: 'CENTRAL',
    };
    fetcher = jest.fn(async (url, options) => {
      if (url.endsWith('ram_public_catalog')) return response(catalog());
      if (url.endsWith('ram_public_people'))
        return response([{ id: 'person', nome: 'JOÃO DE TESTE', cargo: 'MÚSICO' }]);
      if (url.includes('/rest/v1/cadastro?')) return response(profile ? [profile] : []);
      if (url === 'https://sheets.test')
        return response({
          ok: sheetOk,
          uuid: JSON.parse(options.body).data.UUID,
          diag: {
            master: {
              ok: true,
              id: '1LGoW7lbYS4crpEdTfGR2evuH9kArZgqrvVbmi6buBoQ',
              sheet: 'Dados',
            },
          },
        });
      if (url.includes('/rest/v1/presencas')) {
        if (options.method === 'POST') {
          if (!databaseOk) return response({ message: 'private diagnostic' }, false);
          saved = [JSON.parse(options.body)];
        }
        return response(saved);
      }
      throw new Error('Unexpected destination: ' + url);
    });
    service = new PublicMeetingService(fetcher, {
      url: 'https://example.test',
      key: 'public-key',
      sheetsUrl: 'https://sheets.test',
    });
  });
  it('sends the same UUID to Dados and presencas without calling the old RPC', async () => {
    await service.people('ITAPEVI', 'common', 'jo');
    const receipt = await service.confirm('ITAPEVI', 'common', 'person');
    const body = JSON.parse(
      fetcher.mock.calls.find(([url]) => url === 'https://sheets.test')![1].body
    );
    expect(body.sheet).toBe('Dados');
    expect(body.data.UUID).toBe(saved[0].uuid);
    expect(body.data['NOME COMPLETO']).toBe('JOÃO DE TESTE');
    expect(body.data['NÍVEL']).toBe('OFICIALIZADO');
    expect(body.data.INSTRUMENTO).toBe('VIOLINO');
    expect(body.data.NAIPE_INSTRUMENTO).toBe('CORDAS');
    expect(body.data.DATA_ENSAIO).toBe('28/11/2026 09:00:00');
    expect(body.data.SYNCED_AT).toMatch(/^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}:\d{2}$/);
    expect(body.data.CLASSE_ORGANISTA).toBe('');
    expect(saved[0]).toMatchObject({
      nivel: 'OFICIALIZADO',
      instrumento: 'VIOLINO',
      naipe_instrumento: 'CORDAS',
      classe_organista: null,
    });
    expect(receipt.id).toBe(saved[0].uuid);
    expect(
      fetcher.mock.calls.some(([url]) => /ram_public_confirm|confirmacoes_reuniao/.test(url))
    ).toBe(false);
  });
  it('sends the manual name and SAM Desatualizado to the sheet', async () => {
    await service.confirm('ITAPEVI', 'common', 'manual_Manoel Luiz');
    expect(saved[0].nome_completo).toBe('MANOEL LUIZ');
    const body = JSON.parse(
      fetcher.mock.calls.find(([url]) => url === 'https://sheets.test')![1].body
    );
    expect(body.data.ANOTACOES).toBe('SAM Desatualizado');
    expect(body.data['NÍVEL']).toBe('');
    expect(body.data.INSTRUMENTO).toBe('');
    expect(body.data.NAIPE_INSTRUMENTO).toBe('');
    expect(body.data.CLASSE_ORGANISTA).toBe('');
    expect(saved[0]).toMatchObject({
      nivel: null,
      instrumento: null,
      naipe_instrumento: null,
      classe_organista: null,
    });
  });
  it.each(['ORGANISTA', 'INSTRUTORA', 'EXAMINADORA', 'SECRETÁRIA DA MÚSICA'])(
    'normalizes %s as in the root app',
    async cargo => {
      profile = { ...profile, cargo, instrumento: null, nivel: 'RJM / OFICIALIZADO(A)' };
      await service.people('ITAPEVI', 'common', 'jo');
      await service.confirm('ITAPEVI', 'common', 'person');
      expect(saved[0]).toMatchObject({
        cargo,
        nivel: 'RJM / OFICIALIZADA',
        instrumento: 'ÓRGÃO',
        naipe_instrumento: 'TECLADO',
        classe_organista: 'RJM / OFICIALIZADA',
      });
      const body = JSON.parse(
        fetcher.mock.calls.find(([url]) => url === 'https://sheets.test')![1].body
      );
      expect(body.data).toMatchObject({
        NÍVEL: 'RJM / OFICIALIZADA',
        INSTRUMENTO: 'ÓRGÃO',
        NAIPE_INSTRUMENTO: 'TECLADO',
        CLASSE_ORGANISTA: 'RJM / OFICIALIZADA',
      });
    }
  );
  it('preserves the organist class provided in cadastro', async () => {
    profile = { ...profile, cargo: 'ORGANISTA', instrumento: 'ÓRGÃO', nivel: '2ª CLASSE' };
    await service.people('ITAPEVI', 'common', 'jo');
    await service.confirm('ITAPEVI', 'common', 'person');
    expect(saved[0]).toMatchObject({ nivel: '2ª CLASSE', classe_organista: '2ª CLASSE' });
  });
  it('does not send incomplete data when the cadastro lookup fails', async () => {
    await service.people('ITAPEVI', 'common', 'jo');
    profile = null;
    await expect(service.confirm('ITAPEVI', 'common', 'person')).rejects.toMatchObject({
      kind: 'invalid',
    });
    expect(fetcher.mock.calls.some(([url]) => url === 'https://sheets.test')).toBe(false);
  });
  it('does not report success or save in the database if the sheet rejects the record', async () => {
    sheetOk = false;
    await expect(service.confirm('ITAPEVI', 'common', 'manual_Manoel Luiz')).rejects.toMatchObject({
      kind: 'unavailable',
    });
    expect(saved).toEqual([]);
  });
  it('identifies the root Sheets duplicate response without inserting again', async () => {
    fetcher
      .mockResolvedValueOnce(response(catalog()))
      .mockResolvedValueOnce(response([]))
      .mockResolvedValueOnce(response({ ok: false, error: 'DUPLICATA' }));
    await expect(service.confirm('ITAPEVI', 'common', 'manual_Manoel Luiz')).rejects.toMatchObject({
      kind: 'duplicate',
    });
    expect(saved).toEqual([]);
  });
  it('retries a database failure by sending the same UUID for Sheets to deduplicate', async () => {
    databaseOk = false;
    await expect(service.confirm('ITAPEVI', 'common', 'manual_Manoel Luiz')).rejects.toMatchObject({
      kind: 'unavailable',
    });
    databaseOk = true;
    await service.confirm('ITAPEVI', 'common', 'manual_Manoel Luiz');
    const calls = fetcher.mock.calls.filter(([url]) => url === 'https://sheets.test');
    expect(calls).toHaveLength(2);
    expect(JSON.parse(calls[0][1].body).data.UUID).toBe(JSON.parse(calls[1][1].body).data.UUID);
  });
  it('resends to Sheets after a reload while the database is pending', async () => {
    databaseOk = false;
    await expect(service.confirm('ITAPEVI', 'common', 'manual_Manoel Luiz')).rejects.toThrow();
    databaseOk = true;
    const reloaded = new PublicMeetingService(fetcher, {
      url: 'https://example.test',
      key: 'public-key',
      sheetsUrl: 'https://sheets.test',
    });
    await reloaded.confirm('ITAPEVI', 'common', 'manual_Manoel Luiz');
    expect(fetcher.mock.calls.filter(([url]) => url === 'https://sheets.test')).toHaveLength(2);
  });
  it('ignores stale browser flags after the owner deletes records and confirms again', async () => {
    const first = await service.confirm('ITAPEVI', 'common', 'manual_Manoel Luiz');
    localStorage.setItem('ram-sheet:' + first.id, '1');
    saved = []; // Manual deletion in Supabase before a new explicit confirmation.
    await service.confirm('ITAPEVI', 'common', 'manual_Manoel Luiz');
    expect(fetcher.mock.calls.filter(([url]) => url === 'https://sheets.test')).toHaveLength(2);
    expect(saved[0].uuid).toBe(first.id);
  });
  it('does not accept a bare ok response as proof of delivery to the correct sheet', async () => {
    fetcher
      .mockResolvedValueOnce(response(catalog()))
      .mockResolvedValueOnce(response([]))
      .mockResolvedValueOnce(response({ ok: true }));
    await expect(service.confirm('ITAPEVI', 'common', 'manual_Manoel Luiz')).rejects.toMatchObject({
      kind: 'unavailable',
    });
    expect(saved).toEqual([]);
  });
  it('does not recreate a manually deleted sheet row on repeated confirmation', async () => {
    const first = await service.confirm('ITAPEVI', 'common', 'manual_Manoel Luiz');
    const retry = await service.confirm('ITAPEVI', 'common', 'manual_ manoel   luiz ');
    expect(retry.id).toBe(first.id);
    expect(retry.ja_confirmado).toBe(true);
    expect(fetcher.mock.calls.filter(([url]) => url === 'https://sheets.test')).toHaveLength(1);
  });
  it.each([
    ['COTIA', 'common', 'manual_Manoel Luiz'],
    ['ITAPEVI', 'wrong', 'manual_Manoel Luiz'],
    ['ITAPEVI', 'common', 'unknown'],
    ['ITAPEVI', 'common', 'manual_ABC'],
  ])('rejects invalid selection %s %s %s', async (city, church, person) => {
    await expect(service.confirm(city, church, person)).rejects.toMatchObject({ kind: 'invalid' });
    expect(fetcher.mock.calls).toHaveLength(1);
  });
  it('rejects an empty selection before any request', async () => {
    await expect(service.confirm('ITAPEVI', 'common', '')).rejects.toMatchObject({
      kind: 'invalid',
    });
    expect(fetcher).not.toHaveBeenCalled();
  });
  it('honors closure before saving', async () => {
    fetcher.mockResolvedValueOnce(
      response({ ...catalog(), evento: { slug: PUBLIC_MEETING.slug, aberto: false } })
    );
    await expect(service.confirm('ITAPEVI', 'common', 'manual_Manoel Luiz')).rejects.toMatchObject({
      kind: 'closed',
    });
  });
  it('rejects a receipt from the wrong spreadsheet', async () => {
    fetcher
      .mockResolvedValueOnce(response(catalog()))
      .mockResolvedValueOnce(response([]))
      .mockResolvedValueOnce(response({ ok: true, diag: { master: { id: 'wrong' } } }));
    await expect(service.confirm('ITAPEVI', 'common', 'manual_Manoel Luiz')).rejects.toMatchObject({
      kind: 'unavailable',
    });
    expect(saved).toEqual([]);
  });
  it('does not accept malformed database receipts', async () => {
    saved = [{ uuid: 'invalid', created_at: 'invalid' }];
    await expect(service.confirm('ITAPEVI', 'common', 'manual_Manoel Luiz')).rejects.toMatchObject({
      kind: 'unavailable',
    });
  });
  it('does not search without minimum selections and query', async () => {
    expect(await service.people('', 'common', 'jo')).toEqual([]);
    expect(await service.people('ITAPEVI', '', 'jo')).toEqual([]);
    expect(await service.people('ITAPEVI', 'common', 'j')).toEqual([]);
    expect(fetcher).not.toHaveBeenCalled();
  });
});
it('matches the public route and searches congregations without accents', () => {
  expect(isPublicMeetingPath('/confirmar-presenca/')).toBe(true);
  expect(isPublicMeetingPath('/Register')).toBe(false);
  const options = [{ label: 'Vila São João', searchText: 'BR-21-0001' }];
  expect(filterMeetingOptions(options, 'sao joao')).toEqual(options);
});
