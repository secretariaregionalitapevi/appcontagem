import type { LocationAssessment } from './locationSafetyService';

export type LocationChoice = { venueId: string } | null;
export interface LocationReviewRequest {
  assessment: LocationAssessment;
  automatic: boolean;
  entry?: boolean;
}
let presenter: ((request: LocationReviewRequest | null) => void) | undefined;
let finish: ((choice: LocationChoice) => void) | undefined;

export function finishLocationReview(choice: LocationChoice) {
  const resolve = finish;
  finish = undefined;
  presenter?.(null);
  resolve?.(choice);
}
export function attachLocationReview(handler: (request: LocationReviewRequest | null) => void) {
  presenter = handler;
  return () => {
    finishLocationReview(null);
    if (presenter === handler) presenter = undefined;
  };
}
export function requestLocationReview(request: LocationReviewRequest): Promise<LocationChoice> {
  if (!presenter) return Promise.resolve(null);
  finishLocationReview(null);
  return new Promise(resolve => {
    finish = resolve;
    presenter?.(request);
  });
}
