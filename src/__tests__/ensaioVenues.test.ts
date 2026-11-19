import { DEFAULT_ENSAIO_VENUES, getEnsaioVenues } from '../config/ensaioVenues';
import { validGeo } from '../utils/locationSafetyRules';

describe('Configuração dos sete locais', () => {
  const original = global.window;
  afterEach(() => {
    (global as any).window = original;
  });
  it('tem sete referências válidas, incluindo o ponto de Pirapora informado por Plus Code', () => {
    expect(DEFAULT_ENSAIO_VENUES).toHaveLength(7);
    expect(DEFAULT_ENSAIO_VENUES.every(venue => validGeo(venue.geo))).toBe(true);
    expect(
      DEFAULT_ENSAIO_VENUES.find(venue => venue.nome === 'Pirapora')?.geo?.longitude
    ).toBeCloseTo(-47.0239375);
  });
  it('enriquece os locais da configuração web sem alterar os IDs definidos pelo usuário', () => {
    (global as any).window = {
      APP_CONFIG: { LOCAIS_ENSAIO: [{ id: 'itapevi-custom', nome: 'Itapevi' }] },
    };
    expect(getEnsaioVenues()[0]).toEqual(
      expect.objectContaining({
        id: 'itapevi-custom',
        geo: expect.objectContaining({ latitude: -23.5457193 }),
        mesesEnsaio: [1, 5, 9],
      })
    );
  });
  it('não usa o mesmo ID de outra regional para assumir uma localização', () => {
    (global as any).window = {
      APP_CONFIG: { LOCAIS_ENSAIO: [{ id: '1', nome: 'Central Goiânia' }] },
    };
    expect(getEnsaioVenues()[0].geo).toBeUndefined();
    expect(getEnsaioVenues()[0].mesesEnsaio).toBeUndefined();
  });
  it('respeita ponto e agenda explicitamente configurados', () => {
    const geo = { latitude: -23, longitude: -47, radiusMeters: 800 };
    (global as any).window = {
      APP_CONFIG: { LOCAIS_ENSAIO: [{ id: '4', nome: 'Itapevi', geo, mesesEnsaio: [] }] },
    };
    expect(getEnsaioVenues()[0]).toEqual(expect.objectContaining({ geo, mesesEnsaio: [] }));
  });
});
