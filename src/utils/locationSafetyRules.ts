export interface EnsaioGeoPoint {
  latitude: number;
  longitude: number;
  radiusMeters?: number;
}
export interface EnsaioVenue {
  id: string;
  nome: string;
  geo?: EnsaioGeoPoint;
  mesesEnsaio?: number[];
}
export interface DevicePosition {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
}
export type GeoResult = {
  status: 'near' | 'mismatch' | 'uncertain' | 'unconfigured';
  distance?: number;
  suggested?: EnsaioVenue;
  nearest?: EnsaioVenue;
  nearestDistance?: number;
};

export const normalizeVenue = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
const REGULAR_MONTHS: Record<string, number[]> = {
  cotia: [3, 7, 11],
  'caucaia do alto': [3, 7, 11],
  fazendinha: [3, 7, 11],
  jandira: [3, 7, 11],
  'vargem grande': [3, 7, 11],
  itapevi: [1, 5, 9],
  pirapora: [1, 5, 9],
};
export function regularMonths(venue: EnsaioVenue): number[] | undefined {
  return venue.mesesEnsaio ?? REGULAR_MONTHS[normalizeVenue(venue.nome)];
}
export function isOutsideRegularMonth(venue: EnsaioVenue, date: string): boolean {
  const months = regularMonths(venue);
  return !!months?.length && !months.includes(Number(date.slice(5, 7)));
}
export function validGeo(point?: EnsaioGeoPoint): point is EnsaioGeoPoint {
  return (
    !!point &&
    Number.isFinite(point.latitude) &&
    Number.isFinite(point.longitude) &&
    Math.abs(point.latitude) <= 90 &&
    Math.abs(point.longitude) <= 180
  );
}
export function distanceMeters(a: EnsaioGeoPoint, b: EnsaioGeoPoint): number {
  const rad = Math.PI / 180;
  const lat = (b.latitude - a.latitude) * rad,
    lon = (b.longitude - a.longitude) * rad;
  const h =
    Math.sin(lat / 2) ** 2 +
    Math.cos(a.latitude * rad) * Math.cos(b.latitude * rad) * Math.sin(lon / 2) ** 2;
  return 6371000 * 2 * Math.asin(Math.sqrt(Math.min(1, Math.max(0, h))));
}
export function venueRadius(venue: EnsaioVenue): number {
  const radius = venue.geo?.radiusMeters;
  return Number.isFinite(radius) && radius! >= 50 && radius! <= 10000 ? radius! : 500;
}
export function evaluatePosition(
  selected: EnsaioVenue,
  venues: EnsaioVenue[],
  position?: DevicePosition,
  now = Date.now()
): GeoResult {
  if (!validGeo(selected.geo)) return { status: 'unconfigured' };
  if (
    !position ||
    !validGeo(position) ||
    !Number.isFinite(position.accuracy) ||
    position.accuracy < 0 ||
    position.accuracy > 1000 ||
    !Number.isFinite(position.timestamp) ||
    now - position.timestamp > 120000 ||
    position.timestamp > now + 10000
  )
    return { status: 'uncertain' };
  const distance = distanceMeters(selected.geo, position);
  const radius = venueRadius(selected);
  // Do not label a boundary/overlapping accuracy circle as a confirmed mismatch.
  if (distance <= radius + position.accuracy) return { status: 'near', distance };
  if (distance <= radius + position.accuracy + 200) return { status: 'uncertain', distance };
  const ranked = venues
    .filter(venue => venue.id !== selected.id && validGeo(venue.geo))
    .map(venue => ({ venue, distance: distanceMeters(venue.geo!, position) }))
    .sort((a, b) => a.distance - b.distance);
  const nearest = ranked[0];
  const suggested = ranked.find(
    item => item.distance <= venueRadius(item.venue) + position.accuracy
  );
  return {
    status: 'mismatch',
    distance,
    suggested: suggested?.venue,
    nearest: nearest?.venue,
    nearestDistance: nearest?.distance,
  };
}

export function brazilDate(now = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  return ['year', 'month', 'day']
    .map(type => parts.find(part => part.type === type)?.value)
    .join('-');
}
