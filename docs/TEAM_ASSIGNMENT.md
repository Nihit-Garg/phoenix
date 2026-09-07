# MIRAGE — Current Ownership Map

This is an implementation status document, not the original five-person
Next.js plan.

| Area | Current files | Responsibility |
| --- | --- | --- |
| Signaling server | backend/src | Socket registry, REST diagnostics, SDP/ICE relay |
| Client configuration | frontend/src/lib | Expo environment URL, identity, Socket.IO lifecycle |
| Mesh protocol | frontend/src/engine | WebRTC, packets, routes, queue, heartbeats |
| State bridge | frontend/src/hooks and stores | Engine event projection into UI state |
| Mobile UI | frontend/App.tsx, screens, components | Expo / React Native user experience |
| Documentation | README.md and docs | Current runbook and architecture contract |

Any change to a signaling event or packet field must update the matching client
and server types in the same change, then pass both TypeScript checks.
