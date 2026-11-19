jest.mock('../config/ensaioVenues', () => ({ getEnsaioVenues: () => mockVenues }));
jest.mock('../services/deviceLocation', () => ({
  getDeviceLocation: jest.fn(),
  resetDeviceLocation: jest.fn(),
}));
jest.mock('../services/locationReview', () => ({
  requestLocationReview: jest.fn(),
  finishLocationReview: jest.fn(),
}));
jest.mock('../services/localStorageService', () => ({
  localStorageService: { setLocalEnsaio: jest.fn(), getLocalEnsaio: jest.fn() },
}));
import { EnsaioVenue } from '../utils/locationSafetyRules';
import { getDeviceLocation } from '../services/deviceLocation';
import { requestLocationReview } from '../services/locationReview';
import { localStorageService } from '../services/localStorageService';
import { locationSafetyService } from '../services/locationSafetyService';
let mockVenues: EnsaioVenue[];
describe('Conferência discreta com decisão pelo mapa', () => {
  let now: number;
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    now = 1795104000000;
    jest.spyOn(Date, 'now').mockImplementation(() => now);
    mockVenues = [
      { id: '2', nome: 'Caucaia do Alto', geo: { latitude: -23.6824552, longitude: -47.0214911 } },
      { id: '4', nome: 'Itapevi', geo: { latitude: -23.5457193, longitude: -46.9280331 } },
    ];
    (getDeviceLocation as jest.Mock).mockResolvedValue({
      position: { ...mockVenues[0].geo, accuracy: 30, timestamp: now },
    });
    (requestLocationReview as jest.Mock).mockResolvedValue(null);
    (localStorageService.setLocalEnsaio as jest.Mock).mockResolvedValue(undefined);
    (localStorageService.getLocalEnsaio as jest.Mock).mockResolvedValue('2');
    locationSafetyService.reset();
  });
  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
  });
  it('abre um único painel com mapa para Caucaia x Itapevi, sem autorizar envio ao cancelar', async () => {
    expect(await locationSafetyService.confirmTarget('4', '2026-11-19')).toBeNull();
    expect(requestLocationReview).toHaveBeenCalledWith(
      expect.objectContaining({
        automatic: true,
        assessment: expect.objectContaining({
          position: expect.any(Object),
          geo: expect.objectContaining({
            status: 'mismatch',
            suggested: expect.objectContaining({ id: '2' }),
          }),
        }),
      })
    );
    expect(localStorageService.setLocalEnsaio).not.toHaveBeenCalled();
  });
  it('retorna o destino corrigido ao mesmo envio e atualiza o cabeçalho pela notificação', async () => {
    const changed = jest.fn(),
      unsubscribe = locationSafetyService.subscribeVenue(changed);
    (requestLocationReview as jest.Mock).mockResolvedValue({ venueId: '2' });
    expect(await locationSafetyService.confirmTarget('4', '2026-11-19')).toBe('2');
    expect(localStorageService.setLocalEnsaio).toHaveBeenCalledWith('2');
    expect(changed).toHaveBeenCalledWith(expect.objectContaining({ id: '2' }));
    unsubscribe();
  });
  it('mantém o destino escolhido em um toque, sem digitação e sem alertas repetidos', async () => {
    (requestLocationReview as jest.Mock).mockResolvedValue({ venueId: '4' });
    expect(await locationSafetyService.confirmTarget('4', '2026-11-19')).toBe('4');
    expect(await locationSafetyService.confirmTarget('Itapevi', '2026-11-19')).toBe('4');
    expect(requestLocationReview).toHaveBeenCalledTimes(1);
    expect(localStorageService.setLocalEnsaio).not.toHaveBeenCalled();
  });
  it.each([
    { reason: 'denied' },
    { reason: 'timeout' },
    { position: { latitude: -23, longitude: -47, accuracy: 5000, timestamp: 1795104000000 } },
  ])('GPS indisponível ou impreciso não interrompe a contagem %#', async fix => {
    (getDeviceLocation as jest.Mock).mockResolvedValue(fix);
    expect(await locationSafetyService.confirmTarget('4', '2026-11-19')).toBe('4');
    expect(requestLocationReview).not.toHaveBeenCalled();
  });
  it('não bloqueia mês fora do calendário quando a posição corresponde ao local', async () => {
    (getDeviceLocation as jest.Mock).mockResolvedValue({
      position: { ...mockVenues[1].geo, accuracy: 30, timestamp: now },
    });
    expect(await locationSafetyService.confirmTarget('4', '2026-11-19')).toBe('4');
    expect(requestLocationReview).not.toHaveBeenCalled();
  });
  it('libera o fluxo em até 900 ms se o GPS ainda está aguardando permissão', async () => {
    let finish: any;
    (getDeviceLocation as jest.Mock).mockImplementation(
      () =>
        new Promise(resolve => {
          finish = resolve;
        })
    );
    const pending = locationSafetyService.confirmTarget('4', '2026-11-19');
    jest.advanceTimersByTime(901);
    expect(await pending).toBe('4');
    expect(requestLocationReview).not.toHaveBeenCalled();
    finish({ reason: 'denied' });
    await Promise.resolve();
  });
  it('uma leitura tardia pode identificar divergência no próximo envio, sem popup fora de contexto', async () => {
    let finish: any;
    (getDeviceLocation as jest.Mock).mockImplementationOnce(
      () =>
        new Promise(resolve => {
          finish = resolve;
        })
    );
    const pending = locationSafetyService.confirmTarget('4', '2026-11-19');
    jest.advanceTimersByTime(901);
    await pending;
    const fix = { position: { ...mockVenues[0].geo, accuracy: 30, timestamp: now } };
    finish(fix);
    await Promise.resolve();
    await Promise.resolve();
    (getDeviceLocation as jest.Mock).mockResolvedValue(fix);
    expect(await locationSafetyService.confirmTarget('4', '2026-11-19')).toBeNull();
    expect(requestLocationReview).toHaveBeenCalledTimes(1);
  });
  it('nova região ou data não reutiliza uma confirmação anterior', async () => {
    (requestLocationReview as jest.Mock).mockResolvedValueOnce({ venueId: '4' });
    await locationSafetyService.confirmTarget('4', '2026-11-19');
    expect(await locationSafetyService.confirmTarget('4', '2026-11-20')).toBeNull();
    expect(requestLocationReview).toHaveBeenCalledTimes(2);
  });
  it('a confirmação não vale para sempre nem depois de sair', async () => {
    (requestLocationReview as jest.Mock).mockResolvedValueOnce({ venueId: '4' });
    await locationSafetyService.confirmTarget('4', '2026-11-19');
    now += 60 * 60000 + 1;
    (getDeviceLocation as jest.Mock).mockResolvedValue({
      position: { ...mockVenues[0].geo, accuracy: 30, timestamp: now },
    });
    expect(await locationSafetyService.confirmTarget('4', '2026-11-19')).toBeNull();
    locationSafetyService.reset();
    expect(await locationSafetyService.confirmTarget('4', '2026-11-19')).toBeNull();
  });
  it('impede envio se não for possível persistir a correção do destino', async () => {
    (requestLocationReview as jest.Mock).mockResolvedValue({ venueId: '2' });
    (localStorageService.getLocalEnsaio as jest.Mock).mockResolvedValue('4');
    expect(await locationSafetyService.confirmTarget('4', '2026-11-19')).toBeNull();
  });
  it('não deixa uma decisão pendente alterar a sessão depois do logout', async () => {
    let finish: any;
    (requestLocationReview as jest.Mock).mockImplementation(
      () =>
        new Promise(resolve => {
          finish = resolve;
        })
    );
    const pending = locationSafetyService.confirmTarget('4', '2026-11-19');
    for (let i = 0; i < 8; i++) await Promise.resolve();
    locationSafetyService.reset();
    finish({ venueId: '2' });
    expect(await pending).toBeNull();
    expect(localStorageService.setLocalEnsaio).not.toHaveBeenCalled();
  });
  it('coalesce cliques simultâneos sem dois painéis', async () => {
    expect(
      await Promise.all([
        locationSafetyService.confirmTarget('4', '2026-11-19'),
        locationSafetyService.confirmTarget('4', '2026-11-19'),
      ])
    ).toEqual([null, null]);
    expect(requestLocationReview).toHaveBeenCalledTimes(1);
  });
  it('login em Fazendinha com GPS em Cotia aguarda mapa e decis?o antes de liberar a entrada', async () => {
    mockVenues = [
      { id: '1', nome: 'Cotia', geo: { latitude: -23.6054025, longitude: -46.9217495 } },
      { id: '3', nome: 'Fazendinha', geo: { latitude: -23.4098685, longitude: -46.8850686 } },
    ];
    let locate!: (fix: unknown) => void;
    let choose!: (choice: unknown) => void;
    (getDeviceLocation as jest.Mock).mockImplementation(
      () =>
        new Promise(resolve => {
          locate = resolve;
        })
    );
    (requestLocationReview as jest.Mock).mockImplementation(
      () =>
        new Promise(resolve => {
          choose = resolve;
        })
    );
    (localStorageService.getLocalEnsaio as jest.Mock).mockResolvedValue('1');
    let finished = false;
    const entry = locationSafetyService.confirmEntry('3', '2026-11-19').then(value => {
      finished = true;
      return value;
    });
    jest.advanceTimersByTime(1500);
    await Promise.resolve();
    expect(finished).toBe(false);
    expect(requestLocationReview).not.toHaveBeenCalled();
    locate({ position: { ...mockVenues[0].geo, accuracy: 25, timestamp: now } });
    for (let n = 0; n < 8; n++) await Promise.resolve();
    expect(finished).toBe(false);
    expect(requestLocationReview).toHaveBeenCalledWith(
      expect.objectContaining({
        entry: true,
        automatic: true,
        assessment: expect.objectContaining({
          geo: expect.objectContaining({
            status: 'mismatch',
            suggested: expect.objectContaining({ id: '1' }),
          }),
        }),
      })
    );
    choose({ venueId: '1' });
    expect(await entry).toBe('1');
    expect(getDeviceLocation).toHaveBeenCalledWith(true);
  });
  it.each([{ reason: 'denied' }, { reason: 'timeout' }])(
    'GPS sem resultado exige confirma??o expl?cita antes de entrar %#',
    async fix => {
      (getDeviceLocation as jest.Mock).mockResolvedValue(fix);
      expect(await locationSafetyService.confirmEntry('4', '2026-11-19')).toBeNull();
      expect(requestLocationReview).toHaveBeenCalledWith(expect.objectContaining({ entry: true }));
    }
  );
  it('GPS convergente tamb?m confirma o destino antes da entrada', async () => {
    (getDeviceLocation as jest.Mock).mockResolvedValue({
      position: { ...mockVenues[1].geo, accuracy: 20, timestamp: now },
    });
    (requestLocationReview as jest.Mock).mockResolvedValue({ venueId: '4' });
    expect(await locationSafetyService.confirmEntry('4', '2026-11-19')).toBe('4');
    expect(requestLocationReview).toHaveBeenCalledWith(
      expect.objectContaining({
        assessment: expect.objectContaining({ geo: expect.objectContaining({ status: 'near' }) }),
      })
    );
  });
  it('a confirma??o anterior de envio n?o elimina a confer?ncia obrigat?ria na entrada', async () => {
    (requestLocationReview as jest.Mock).mockResolvedValue({ venueId: '4' });
    await locationSafetyService.confirmTarget('4', '2026-11-19');
    (requestLocationReview as jest.Mock).mockResolvedValue(null);
    expect(await locationSafetyService.confirmEntry('4', '2026-11-19')).toBeNull();
    expect(requestLocationReview).toHaveBeenCalledTimes(2);
  });
});
