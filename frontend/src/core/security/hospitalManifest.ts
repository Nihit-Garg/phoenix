/**
 * This is intentionally empty until an administrator provisions a hospital
 * device and embeds its exported public manifest into the Civilian APK.
 * A civilian build must never invent or fetch a recipient key at runtime.
 */
import { HospitalPublicManifest } from '../../../../backend/src/protocol/hospitalManifest';

export const HOSPITAL_PUBLIC_MANIFEST: HospitalPublicManifest | null = null;
