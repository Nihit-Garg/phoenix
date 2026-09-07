export const MAX_SOS_ACCURACY_METERS = 30;

export interface LiveSosLocation {
  latitude: number;
  longitude: number;
  accuracyMeters: number;
  capturedAt: number;
}

export interface SosPayload {
  type: 'sos';
  civilianName: string;
  injuryDescription: string;
  location: LiveSosLocation;
}

export function isAcceptableLiveSosLocation(location: LiveSosLocation | null): location is LiveSosLocation {
  return Boolean(
    location &&
    Number.isFinite(location.latitude) && Number.isFinite(location.longitude) &&
    Number.isFinite(location.accuracyMeters) && location.accuracyMeters > 0 &&
    location.accuracyMeters <= MAX_SOS_ACCURACY_METERS &&
    Number.isFinite(location.capturedAt),
  );
}
