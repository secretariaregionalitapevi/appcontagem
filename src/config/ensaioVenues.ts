import { EnsaioVenue, normalizeVenue } from '../utils/locationSafetyRules';

// Venue points matched to the supplied addresses. Sources: docs/LOCATION_SAFETY.md.
export const DEFAULT_ENSAIO_VENUES: EnsaioVenue[] = [
  {
    id: '1',
    nome: 'Cotia',
    geo: { latitude: -23.6054025, longitude: -46.9217495, radiusMeters: 500 },
    mesesEnsaio: [3, 7, 11],
  },
  {
    id: '2',
    nome: 'Caucaia do Alto',
    geo: { latitude: -23.6824552, longitude: -47.0214911, radiusMeters: 500 },
    mesesEnsaio: [3, 7, 11],
  },
  {
    id: '3',
    nome: 'Fazendinha',
    geo: { latitude: -23.4098685, longitude: -46.8850686, radiusMeters: 500 },
    mesesEnsaio: [3, 7, 11],
  },
  {
    id: '4',
    nome: 'Itapevi',
    geo: { latitude: -23.5457193, longitude: -46.9280331, radiusMeters: 500 },
    mesesEnsaio: [1, 5, 9],
  },
  {
    id: '5',
    nome: 'Jandira',
    geo: { latitude: -23.532451, longitude: -46.9031498, radiusMeters: 500 },
    mesesEnsaio: [3, 7, 11],
  },
  {
    id: '6',
    nome: 'Pirapora',
    geo: { latitude: -23.3986875, longitude: -47.0239375, radiusMeters: 500 },
    mesesEnsaio: [1, 5, 9],
  },
  {
    id: '7',
    nome: 'Vargem Grande',
    geo: { latitude: -23.6072249, longitude: -47.0076642, radiusMeters: 500 },
    mesesEnsaio: [3, 7, 11],
  },
];
export function getEnsaioVenues(): EnsaioVenue[] {
  const configured = typeof window !== 'undefined' ? window.APP_CONFIG?.LOCAIS_ENSAIO : undefined;
  if (!configured) return DEFAULT_ENSAIO_VENUES;
  return configured.map(venue => {
    const base = DEFAULT_ENSAIO_VENUES.find(
      item => normalizeVenue(item.nome) === normalizeVenue(venue.nome)
    );
    return {
      ...base,
      ...venue,
      geo: venue.geo ?? base?.geo,
      mesesEnsaio: venue.mesesEnsaio ?? base?.mesesEnsaio,
    };
  });
}
