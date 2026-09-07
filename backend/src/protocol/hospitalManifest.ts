export interface HospitalPublicManifest {
  version: 1;
  keyId: string;
  encryptionPublicKey: string;
  signingPublicKey: string;
  createdAt: number;
}

export function parseHospitalPublicManifest(value: string): HospitalPublicManifest {
  const manifest = JSON.parse(value) as Partial<HospitalPublicManifest>;
  if (
    manifest.version !== 1 || !manifest.keyId || !manifest.encryptionPublicKey ||
    !manifest.signingPublicKey || typeof manifest.createdAt !== 'number'
  ) throw new Error('Malformed hospital public manifest.');
  return manifest as HospitalPublicManifest;
}

export function serializeHospitalPublicManifest(manifest: HospitalPublicManifest): string {
  return JSON.stringify(manifest);
}
