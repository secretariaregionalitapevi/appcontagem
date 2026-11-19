import { getEnsaioVenues } from '../config/ensaioVenues';
import {
  brazilDate,
  EnsaioVenue,
  evaluatePosition,
  GeoResult,
  isOutsideRegularMonth,
  normalizeVenue,
  validGeo,
  DevicePosition,
} from '../utils/locationSafetyRules';
import { getDeviceLocation, LocationFix, resetDeviceLocation } from './deviceLocation';
import { localStorageService } from './localStorageService';
import { finishLocationReview, requestLocationReview } from './locationReview';

export interface LocationAssessment {
  selected: EnsaioVenue;
  date: string;
  geo: GeoResult;
  position?: DevicePosition;
  reason?: LocationFix['reason'];
  outsideMonth: boolean;
  checkedAt: number;
  manual?: boolean;
}
const accepted = new Map<string, { until: number; fingerprint: string; area: string }>();
const pending = new Map<string, Promise<string | null>>();
const listeners = new Set<() => void>();
const venueListeners = new Set<(venue: EnsaioVenue) => void>();
let latest: LocationAssessment | undefined;
let generation = 0;
const emit = () => listeners.forEach(listener => listener());
const configKey = () => JSON.stringify(getEnsaioVenues());
const areaKey = (assessment: LocationAssessment) =>
  assessment.geo.suggested?.id ||
  (assessment.position
    ? `${Math.round(assessment.position.latitude * 100)}:${Math.round(assessment.position.longitude * 100)}`
    : 'unknown');
const contextKey = (venue: EnsaioVenue, date: string) => `${normalizeVenue(venue.nome)}:${date}`;

export const locationSafetyService = {
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
  subscribeVenue(listener: (venue: EnsaioVenue) => void) {
    venueListeners.add(listener);
    return () => {
      venueListeners.delete(listener);
    };
  },
  snapshot() {
    return latest;
  },
  reset() {
    generation += 1;
    accepted.clear();
    pending.clear();
    latest = undefined;
    resetDeviceLocation();
    finishLocationReview(null);
    emit();
  },
  resolve(local: string) {
    return getEnsaioVenues().find(
      venue => venue.id === local || normalizeVenue(venue.nome) === normalizeVenue(local)
    );
  },
  async inspect(
    local: string,
    date = brazilDate(),
    force = false
  ): Promise<LocationAssessment | undefined> {
    const version = generation,
      selected = this.resolve(local);
    if (!selected) return undefined;
    let fix: LocationFix = {};
    try {
      if (validGeo(selected.geo)) fix = await getDeviceLocation(force);
    } catch {
      fix = { reason: 'unavailable' };
    }
    if (version !== generation) return undefined;
    const assessment: LocationAssessment = {
      selected,
      date,
      position: fix.position,
      geo: evaluatePosition(selected, getEnsaioVenues(), fix.position),
      reason: fix.reason,
      outsideMonth: isOutsideRegularMonth(selected, date),
      checkedAt: Date.now(),
    };
    latest = assessment;
    emit();
    return assessment;
  },
  async applyChoice(assessment: LocationAssessment, venueId: string): Promise<string | null> {
    const venue = this.resolve(venueId);
    if (!venue) return null;
    if (venue.id !== assessment.selected.id) {
      await localStorageService.setLocalEnsaio(venue.id);
      if ((await localStorageService.getLocalEnsaio()) !== venue.id) return null;
      venueListeners.forEach(listener => listener(venue));
    }
    const next: LocationAssessment = {
      ...assessment,
      selected: venue,
      geo: evaluatePosition(venue, getEnsaioVenues(), assessment.position),
      manual: true,
      outsideMonth: isOutsideRegularMonth(venue, assessment.date),
    };
    accepted.set(contextKey(venue, assessment.date), {
      until: Date.now() + 60 * 60000,
      fingerprint: configKey(),
      area: areaKey(next),
    });
    latest = next;
    emit();
    return venue.id;
  },
  async review(local: string, date = brazilDate()): Promise<void> {
    const version = generation,
      venue = this.resolve(local);
    if (!venue) return;
    // Open the sheet immediately; a fresh fix updates it without blocking the operator.
    const assessment =
      latest?.selected.id === venue.id && latest.date === date
        ? latest
        : {
            selected: venue,
            date,
            geo: { status: 'uncertain' as const },
            outsideMonth: isOutsideRegularMonth(venue, date),
            checkedAt: Date.now(),
          };
    const choosing = requestLocationReview({ assessment, automatic: false });
    void this.inspect(local, date, true);
    const choice = await choosing;
    if (choice && version === generation)
      await this.applyChoice(
        latest?.selected.id === venue.id && latest.date === date ? latest : assessment,
        choice.venueId
      );
  },
  async confirmEntry(local: string, date = brazilDate()): Promise<string | null> {
    const version = generation;
    // Entry must wait for the actual GPS result (including the permission response).
    // The device provider has its own bounded timeout; no fast-path may bypass this gate.
    const assessment = await this.inspect(local, date, true);
    if (!assessment || version !== generation) return null;
    const choice = await requestLocationReview({ assessment, automatic: true, entry: true });
    if (!choice || version !== generation) return null;
    const current =
      latest?.selected.id === assessment.selected.id && latest.date === date ? latest : assessment;
    return this.applyChoice(current, choice.venueId);
  },
  async confirmTarget(local: string, date = brazilDate()): Promise<string | null> {
    const venue = this.resolve(local);
    if (!venue) return null;
    const key = contextKey(venue, date);
    if (pending.has(key)) return pending.get(key)!;
    const version = generation;
    const operation = (async () => {
      // A GPS request runs at most once per cache window. Never wait for a permission dialog.
      let timer: ReturnType<typeof setTimeout> | undefined;
      const probe = this.inspect(local, date);
      let assessment: LocationAssessment | undefined;
      try {
        assessment = await Promise.race([
          probe,
          new Promise<undefined>(resolve => {
            timer = setTimeout(() => resolve(undefined), 900);
          }),
        ]);
      } finally {
        if (timer) clearTimeout(timer);
      }
      if (version !== generation) return null;
      // No reliable fix is not evidence of a mismatch: allow counting without any dialog.
      if (!assessment || assessment.geo.status !== 'mismatch') return venue.id;
      const approval = accepted.get(key);
      if (
        approval &&
        approval.until > Date.now() &&
        approval.fingerprint === configKey() &&
        approval.area === areaKey(assessment)
      )
        return venue.id;
      const choice = await requestLocationReview({ assessment, automatic: true });
      if (!choice || version !== generation) return null;
      return this.applyChoice(assessment, choice.venueId);
    })().finally(() => {
      if (pending.get(key) === operation) pending.delete(key);
    });
    pending.set(key, operation);
    return operation;
  },
  async ensure(local: string, date = brazilDate()): Promise<boolean> {
    return (await this.confirmTarget(local, date)) !== null;
  },
};
