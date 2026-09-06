# MIRAGE — File Structure

    backend/
      src/app.ts              Express routes and CORS
      src/server.ts           HTTP/Socket.IO startup and LAN banner
      src/registry/           Live signaling registry
      src/signaling/          Join, leave, SDP, and ICE relays
    frontend/
      App.tsx                 Expo root and navigation
      src/engine/             WebRTC, routing, heartbeats, packet queue
      src/hooks/              Engine-to-Zustand bridge
      src/lib/                Env configuration, identity, Socket.IO client
      src/stores/             Mesh, messages, and emergency state
      src/screens/            Home, messages, chat, profile
      src/components/         Reusable React Native UI
    docs/                     Current architecture, protocol, runbook, risks

There is no apps/web, packages/shared, Next.js, React Flow, or IndexedDB
repository in the current codebase. Engine types are local to
frontend/src/engine/types.ts; backend signaling types are local to
backend/src/registry/registry.types.ts.
