/**
 * This is intentionally empty until an administrator provisions a hospital
 * device and embeds its exported public manifest into the Civilian APK.
 * A civilian build must never invent or fetch a recipient key at runtime.
 */
export const HOSPITAL_PUBLIC_MANIFEST: {
  keyId: string;
  encryptionPublicKey: string;
  signingPublicKey: string;
} | null = null;
