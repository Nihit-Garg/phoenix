import AsyncStorage from '@react-native-async-storage/async-storage';
import { PeerInfo, parsePeerInfo } from '../../../../backend/src/protocol/peerInfo';

const KEY = 'mirage.public-peers.v1';

/** Persists only public peer metadata. Never store private keys or SOS plaintext here. */
export class PeerDirectory {
  async list(): Promise<PeerInfo[]> {
    const stored = await AsyncStorage.getItem(KEY);
    if (!stored) return [];
    try { return (JSON.parse(stored) as unknown[]).map((peer) => parsePeerInfo(JSON.stringify(peer))); } catch { return []; }
  }
  async upsert(peer: PeerInfo): Promise<void> {
    const peers = (await this.list()).filter((item) => item.peerId !== peer.peerId);
    peers.push(peer);
    await AsyncStorage.setItem(KEY, JSON.stringify(peers));
  }
  async remove(peerId: string): Promise<void> {
    await AsyncStorage.setItem(KEY, JSON.stringify((await this.list()).filter((peer) => peer.peerId !== peerId)));
  }
}
