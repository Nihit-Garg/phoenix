export const MAX_SOS_ACCURACY_METERS = 30;
export const MAX_SOS_LOCATION_AGE_MS = 2 * 60 * 1000;

export interface LiveSosLocation { latitude: number; longitude: number; accuracyMeters: number; capturedAt: number; }
export interface SosPayload { type: 'sos'; civilianName: string; injuryDescription: string; location: LiveSosLocation; }

export function isAcceptableLiveSosLocation(location: LiveSosLocation | null, now = Date.now()): location is LiveSosLocation {
  return Boolean(location && Number.isFinite(location.latitude) && Number.isFinite(location.longitude) &&
    Number.isFinite(location.accuracyMeters) && location.accuracyMeters > 0 && location.accuracyMeters <= MAX_SOS_ACCURACY_METERS &&
    Number.isFinite(location.capturedAt) && location.capturedAt <= now + 5_000 && now - location.capturedAt <= MAX_SOS_LOCATION_AGE_MS);
}

export function validateSosPayload(payload: SosPayload, referenceTime = Date.now()): void {
  if (!payload.civilianName.trim()) throw new Error('SOS requires the civilian name.');
  if (!payload.injuryDescription.trim()) throw new Error('SOS requires an emergency description.');
  if (!isAcceptableLiveSosLocation(payload.location, referenceTime)) throw new Error('SOS requires a current, accurate GPS location.');
}
