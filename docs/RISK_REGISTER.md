# MIRAGE — Risk Register

| Risk | Impact | Current mitigation |
| --- | --- | --- |
| Wrong LAN adapter selected | Clients cannot reach signaling | LAN_IP override in backend/.env |
| Hotspot client isolation or firewall | REST and WebSocket fail across laptops | Verify /api/health from each device; allow ports 3001 and Expo web port |
| WebRTC NAT/ICE failure | Peer DataChannel does not open | Same-LAN testing, browser console diagnostics; TURN is not yet configured |
| Expo Go native transport gap | App UI starts but WebRTC is unavailable | react-native-webrtc is installed; use a custom Expo development build, not Expo Go |
| Route loop/stale route | Packet loss or unnecessary forwarding | TTL, hop trace, duplicate cache; alternate route aging is pending |
| AsyncStorage unavailable/full | Queue cannot persist | Queue operations catch and log errors; add user-facing recovery before production |
| Open signaling service | Untrusted LAN clients can join/relay signaling | Development-only CORS; authentication and rate limits are pending |
| Documentation drift | Incorrect test or deployment steps | README and docs now describe the Expo implementation; keep them updated with protocol changes |
