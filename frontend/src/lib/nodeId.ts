/**
 * src/lib/nodeId.ts
 *
 * Persistent node identity for this device.
 *
 * On first launch, generates a unique node ID in the format "node-XXXXXXXX"
 * (8 random hex characters) and stores it in AsyncStorage.
 * On every subsequent launch, restores the same ID so the node is
 * recognisable to peers across reconnects.
 *
 * Exports:
 *   getOrCreateNodeId(): Promise<string>
 *   getOrCreateDisplayName(): Promise<string>
 *   clearIdentity(): Promise<void>   ← for dev/debug use only
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { NODE_ID_PREFIX, NODE_ID_STORAGE_KEY, DISPLAY_NAME_STORAGE_KEY } from './constants';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Generate a random 8-character hex string using Math.random.
 * React Native does not guarantee crypto.getRandomValues on all targets,
 * so we use a simple fallback that is sufficient for a LAN hackathon demo.
 */
function generateHex(length: number): string {
  let result = '';
  for (let i = 0; i < length; i++) {
    result += Math.floor(Math.random() * 16).toString(16);
  }
  return result;
}

function generateNodeId(): string {
  return `${NODE_ID_PREFIX}-${generateHex(8)}`;
}

function generateDisplayName(): string {
  // e.g. "Node-a3f2" — enough to distinguish peers on a LAN demo
  return `Node-${generateHex(4).toUpperCase()}`;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Returns the persistent node ID for this device.
 * Creates and stores one on first call.
 */
export async function getOrCreateNodeId(): Promise<string> {
  const stored = await AsyncStorage.getItem(NODE_ID_STORAGE_KEY);
  if (stored) return stored;

  const id = generateNodeId();
  await AsyncStorage.setItem(NODE_ID_STORAGE_KEY, id);
  return id;
}

/**
 * Returns the persistent display name for this device.
 * Creates and stores one on first call.
 */
export async function getOrCreateDisplayName(): Promise<string> {
  const stored = await AsyncStorage.getItem(DISPLAY_NAME_STORAGE_KEY);
  if (stored) return stored;

  const name = generateDisplayName();
  await AsyncStorage.setItem(DISPLAY_NAME_STORAGE_KEY, name);
  return name;
}

/**
 * Clear both stored values. Use during development / factory reset.
 * Next call to getOrCreateNodeId() will generate a fresh identity.
 */
export async function clearIdentity(): Promise<void> {
  await AsyncStorage.multiRemove([NODE_ID_STORAGE_KEY, DISPLAY_NAME_STORAGE_KEY]);
}
