import { EnsaioGeoPoint } from './locationSafetyRules';
export function project(point: EnsaioGeoPoint, zoom: number) {
  const scale = 256 * 2 ** zoom,
    lat = (Math.max(-85.0511, Math.min(85.0511, point.latitude)) * Math.PI) / 180;
  return {
    x: ((point.longitude + 180) / 360) * scale,
    y: ((1 - Math.log(Math.tan(lat) + 1 / Math.cos(lat)) / Math.PI) / 2) * scale,
  };
}
export function mapViewport(
  points: EnsaioGeoPoint[],
  width: number,
  height: number,
  zoomOffset = 0
) {
  let fit = 16;
  for (; fit > 2; fit--) {
    const pixels = points.map(point => project(point, fit));
    if (
      Math.max(...pixels.map(p => p.x)) - Math.min(...pixels.map(p => p.x)) <= width - 120 &&
      Math.max(...pixels.map(p => p.y)) - Math.min(...pixels.map(p => p.y)) <= height - 100
    )
      break;
  }
  const zoom = Math.max(2, Math.min(18, fit + zoomOffset));
  const pixels = points.map(point => project(point, zoom));
  const center = {
    x: (Math.min(...pixels.map(p => p.x)) + Math.max(...pixels.map(p => p.x))) / 2,
    y: (Math.min(...pixels.map(p => p.y)) + Math.max(...pixels.map(p => p.y))) / 2,
  };
  const left = center.x - width / 2,
    top = center.y - height / 2;
  const tiles: { x: number; y: number; left: number; top: number; key: string }[] = [];
  for (let x = Math.floor(left / 256); x <= Math.floor((left + width) / 256); x++) {
    for (let y = Math.floor(top / 256); y <= Math.floor((top + height) / 256); y++) {
      if (y < 0 || y >= 2 ** zoom) continue;
      tiles.push({
        x: ((x % 2 ** zoom) + 2 ** zoom) % 2 ** zoom,
        y,
        left: x * 256 - left,
        top: y * 256 - top,
        key: `${zoom}-${x}-${y}`,
      });
    }
  }
  return { zoom, tiles, pins: pixels.map(point => ({ x: point.x - left, y: point.y - top })) };
}
