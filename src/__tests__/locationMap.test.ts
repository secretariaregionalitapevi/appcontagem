import { mapViewport, project } from '../utils/locationMap';
const points = [
  { latitude: -23.5457193, longitude: -46.9280331 },
  { latitude: -23.6824552, longitude: -47.0214911 },
];
describe('Mapa de comparação', () => {
  it.each([320, 560])('enquadra aparelho e ensaio em %d pixels sem perder os pins', width => {
    const view = mapViewport(points, width, 264);
    expect(view.pins).toHaveLength(2);
    for (const pin of view.pins) {
      expect(pin.x).toBeGreaterThan(30);
      expect(pin.x).toBeLessThan(width - 30);
      expect(pin.y).toBeGreaterThan(35);
      expect(pin.y).toBeLessThan(229);
    }
    expect(view.tiles.length).toBeLessThanOrEqual(12);
  });
  it('centraliza o destino quando GPS não está disponível, sem inventar outra posição', () => {
    const view = mapViewport([points[0]], 360, 264);
    expect(view.pins).toEqual([{ x: 180, y: 132 }]);
  });
  it('aumenta o zoom mantendo a mesma referência geográfica', () => {
    const initial = mapViewport(points, 560, 264);
    const closer = mapViewport(points, 560, 264, 1);
    expect(closer.zoom).toBe(initial.zoom + 1);
    expect(Math.abs(closer.pins[0].x - closer.pins[1].x)).toBeCloseTo(
      Math.abs(initial.pins[0].x - initial.pins[1].x) * 2
    );
  });
  it('projeta o centro do mundo no centro do tile inicial', () =>
    expect(project({ latitude: 0, longitude: 0 }, 0)).toEqual({ x: 128, y: 128 }));
});
