import {
  brazilDate,
  distanceMeters,
  evaluatePosition,
  isOutsideRegularMonth,
  EnsaioVenue,
} from '../utils/locationSafetyRules';

const now = 1795104000000;
const caucaia: EnsaioVenue = {
  id: '2',
  nome: 'Caucaia do Alto',
  geo: { latitude: -23.6824552, longitude: -47.0214911, radiusMeters: 500 },
};
const itapevi: EnsaioVenue = {
  id: '4',
  nome: 'Itapevi',
  geo: { latitude: -23.5457193, longitude: -46.9280331, radiusMeters: 500 },
};
const fix = { ...caucaia.geo!, accuracy: 25, timestamp: now };

describe('Conferência geográfica do ensaio', () => {
  it('detecta o caso Caucaia com Itapevi selecionado e sugere Caucaia', () => {
    const result = evaluatePosition(itapevi, [caucaia, itapevi], fix, now);
    expect(result.status).toBe('mismatch');
    expect(result.suggested?.id).toBe('2');
    expect(result.nearest?.id).toBe('2');
    expect(result.nearestDistance).toBe(0);
    expect(result.distance).toBeGreaterThan(15000);
  });
  it('aceita posição no local selecionado', () =>
    expect(evaluatePosition(caucaia, [caucaia], fix, now).status).toBe('near'));
  it('não trata uma posição imprecisa como divergência confirmada', () =>
    expect(evaluatePosition(itapevi, [caucaia], { ...fix, accuracy: 5000 }, now).status).toBe(
      'uncertain'
    ));
  it('sugere Caucaia com localização aproximada do desktop/iOS sem afirmar presença', () => {
    const result = evaluatePosition(itapevi, [caucaia, itapevi], { ...fix, accuracy: 3500 }, now);
    expect(result.status).toBe('uncertain');
    expect(result.approximate).toBe(true);
    expect(result.nearest?.id).toBe('2');
    expect(result.suggested).toBeUndefined();
  });
  it('informa o ensaio mais próximo também quando o local selecionado já corresponde', () => {
    expect(evaluatePosition(caucaia, [caucaia, itapevi], fix, now).nearest?.id).toBe('2');
  });
  it('uma leitura com erro de dezenas de quilômetros não gera sugestão enganosa', () => {
    const result = evaluatePosition(itapevi, [caucaia, itapevi], { ...fix, accuracy: 50000 }, now);
    expect(result.status).toBe('uncertain');
    expect(result.nearest).toBeUndefined();
  });
  it('não sugere outra localidade se o usuário está longe de todas', () => {
    expect(
      evaluatePosition(itapevi, [caucaia, itapevi], { ...fix, latitude: -22, longitude: -45 }, now)
        .suggested
    ).toBeUndefined();
  });
  it('informa o ensaio mais próximo mesmo fora do raio, sem confirmar presença nele', () => {
    const result = evaluatePosition(
      itapevi,
      [itapevi, caucaia],
      { ...fix, latitude: caucaia.geo!.latitude - 0.02 },
      now
    );
    expect(result.status).toBe('mismatch');
    expect(result.nearest?.id).toBe('2');
    expect(result.nearestDistance).toBeGreaterThan(2000);
    expect(result.suggested).toBeUndefined();
  });
  it.each([
    { ...fix, timestamp: now - 120001 },
    { ...fix, timestamp: now + 60000 },
    { ...fix, latitude: NaN },
    { ...fix, longitude: 181 },
    { ...fix, accuracy: -1 },
  ])('recusa fix inválido ou antigo %#', position =>
    expect(evaluatePosition(itapevi, [caucaia], position, now).status).toBe('uncertain')
  );
  it('não inventa coordenadas para uma localidade sem referência', () =>
    expect(evaluatePosition({ id: '8', nome: 'Outra contagem' }, [], fix, now).status).toBe(
      'unconfigured'
    ));
  it('respeita a incerteza perto da borda do raio', () => {
    const venue = { id: 'x', nome: 'Teste', geo: { latitude: 0, longitude: 0, radiusMeters: 500 } };
    expect(
      evaluatePosition(
        venue,
        [],
        { latitude: 0, longitude: 0.0055, accuracy: 20, timestamp: now },
        now
      ).status
    ).toBe('uncertain');
  });
  it('calcula distância em metros sem depender da rede', () => {
    expect(distanceMeters(fix, fix)).toBe(0);
    expect(
      distanceMeters({ latitude: 0, longitude: 0 }, { latitude: 0, longitude: 1 })
    ).toBeCloseTo(111194.93, 1);
  });
});

describe('Calendário orientativo, sem bloqueio de outras contagens', () => {
  it.each(['Cotia', 'Caucaia do Alto', 'Vargem Grande', 'Jandira', 'Fazendinha'])(
    '%s tem março, julho e novembro',
    nome => {
      for (const month of [3, 7, 11])
        expect(
          isOutsideRegularMonth({ id: '', nome }, `2026-${String(month).padStart(2, '0')}-01`)
        ).toBe(false);
      expect(isOutsideRegularMonth({ id: '', nome }, '2026-01-01')).toBe(true);
    }
  );
  it.each(['Itapevi', 'Pirapora'])('%s tem janeiro, maio e setembro', nome => {
    for (const month of [1, 5, 9])
      expect(
        isOutsideRegularMonth({ id: '', nome }, `2026-${String(month).padStart(2, '0')}-01`)
      ).toBe(false);
    expect(isOutsideRegularMonth({ id: '', nome }, '2026-11-19')).toBe(true);
  });
  it('não aplica agenda regional a uma localidade nova ou explicitamente sem agenda', () => {
    expect(isOutsideRegularMonth({ id: 'x', nome: 'Nova' }, '2026-11-19')).toBe(false);
    expect(isOutsideRegularMonth({ id: '4', nome: 'Itapevi', mesesEnsaio: [] }, '2026-11-19')).toBe(
      false
    );
  });
  it('usa a data de São Paulo na virada do dia UTC', () =>
    expect(brazilDate(new Date('2026-12-01T01:00:00Z'))).toBe('2026-11-30'));
});
