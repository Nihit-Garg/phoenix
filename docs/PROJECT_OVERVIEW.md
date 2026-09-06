# MIRAGE — Project Overview

> **Autonomous Offline Mesh Network**
> A hackathon-grade, production-minded protocol for decentralised peer-to-peer routing without internet infrastructure.

---

## Table of Contents

1. [Problem Statement](#1-problem-statement)
2. [Existing Solutions](#2-existing-solutions)
3. [Why Mirage Is Different](#3-why-mirage-is-different)
4. [Core Innovation](#4-core-innovation)
5. [System Goals](#5-system-goals)
6. [Hackathon Constraints](#6-hackathon-constraints-36-hours)
7. [MVP Definition](#7-mvp-definition)

---

## 1. Problem Statement

Modern communication is almost entirely dependent on centralised infrastructure: internet service providers, cloud servers, and DNS. When any link in that chain breaks — during natural disasters, power outages, government shutdowns, or remote field operations — communication collapses entirely.

Billions of people experience connectivity loss every year. Emergency responders lose coordination. Journalists lose access. Communities lose each other.

**The question Mirage answers is:**

> *"Can nearby devices communicate, route information, and remain resilient — using only the hardware already in everyone's pocket — without a single byte passing through the internet?"*

---

## 2. Existing Solutions

| Solution | Approach | Limitation |
|---|---|---|
| **Meshtastic** | LoRa radio mesh | Requires dedicated hardware; not consumer devices |
| **Bridgefy** | Bluetooth mesh | Proprietary, app-specific, not a general protocol |
| **goTenna** | Radio mesh | Hardware purchase required; closed ecosystem |
| **Briar** | Tor + Bluetooth + WiFi | Mobile-only; heavy battery drain; no web |
| **scuttlebutt** | Gossip protocol | Async-first; not real-time; internet-agnostic but not offline-optimised |
| **WebTorrent** | WebRTC P2P | Requires tracker server; no mesh routing |
| **Althea** | Economic routing mesh | Requires custom hardware; incentive-based |

**Common gaps:**
- No solution runs entirely in the browser without dedicated hardware
- None expose a general-purpose packet-routing protocol to application developers
- None implement Store-Carry-Forward semantics over WebRTC DataChannels

---

## 3. Why Mirage Is Different

| Property | Mirage |
|---|---|
| **Zero special hardware** | Runs in any modern browser; any laptop or phone |
| **Protocol-first** | Messaging is just one application; the protocol is the product |
| **Open data model** | Every packet, route, and neighbour is inspectable in real time |
| **Mesh-native** | Every node routes; there is no dedicated router |
| **Store-Carry-Forward** | Nodes buffer packets when the recipient is unreachable; deliver on reconnect |
| **Live visualisation** | The network graph is rendered in real time using React Flow |
| **36-hour implementable** | Deliberately scoped for a hackathon team |

---

## 4. Core Innovation

### 4.1 WebRTC as a Mesh Transport

WebRTC DataChannels are typically used point-to-point. Mirage treats each DataChannel as a **mesh edge**. Every device maintains `N` DataChannel connections, one per neighbour. Packets are forwarded hop-by-hop across these edges.

### 4.2 Store-Carry-Forward (SCF) Semantics

When a destination node is not currently reachable (no valid route exists), Mirage does not drop the packet. Instead it is stored in the local IndexedDB queue. If a new neighbour appears that is closer to the destination — or if the node itself physically moves and re-encounters the destination — the packet is delivered.

This is analogous to DTN (Delay-Tolerant Networking) but implemented entirely in the browser.

### 4.3 Decentralised Signaling with Graceful Degradation

Signaling (ICE negotiation) requires a rendezvous point to bootstrap WebRTC connections. Mirage uses a lightweight Express/Socket.IO signaling server. However, once peers are connected, the signaling server plays no further role. If the signaling server goes offline, existing mesh connections continue to function.

### 4.4 Distributed Routing Table

Each node maintains its own routing table derived from heartbeat messages and neighbour advertisements. No central router exists. Routing decisions are made locally using a next-hop algorithm similar to Distance Vector routing.

---

## 5. System Goals

### Primary Goals

- **G1:** Any two devices on the same LAN can exchange packets without internet access.
- **G2:** A packet will be forwarded across at least 3 hops.
- **G3:** If a routing node fails, traffic reroutes automatically within 10 seconds.
- **G4:** Packets that cannot be delivered are queued and delivered when a route becomes available.
- **G5:** The network topology is visualised in real time on every node.

### Secondary Goals

- **G6:** Node identity persists across browser refreshes (using IndexedDB).
- **G7:** Packets carry priority levels; high-priority packets are forwarded first.
- **G8:** Duplicate packets are suppressed at every hop.
- **G9:** Emergency broadcast packets propagate to every known node.

### Out of Scope (MVP)

- Encryption of packet payloads (architecture supports it; not implemented in 36h)
- Mobile app; only browser
- Geographic routing (Leaflet integration is optional/demo-only)
- Multi-LAN routing (internet bridge)

---

## 6. Hackathon Constraints (36 Hours)

| Constraint | Decision |
|---|---|
| **Time** | 36 hours total; 6 phases × ~6 hours each |
| **Team** | 5 developers with distinct module ownership |
| **Environment** | Local LAN only; no cloud dependencies after initial setup |
| **Complexity** | Favour demonstrability over production hardening |
| **Testing** | Integration tests over unit tests; visual verification via topology view |
| **Signaling server** | Single instance on LAN; intentionally simple |
| **Routing algorithm** | Distance Vector with fixed max-hop TTL (not full OSPF) |
| **Storage** | IndexedDB only; no server-side persistence |

---

## 7. MVP Definition

The MVP is achieved when a judge can witness the following sequence live:

1. **Three laptops** are opened in the same room on the same WiFi.
2. Each laptop opens the Mirage web app in Chrome/Firefox.
3. Within 30 seconds, all three appear as nodes on each other's topology map.
4. A text message is sent from **Laptop A** to **Laptop C** passing through **Laptop B**.
5. Laptop B's network cable is unplugged (or WiFi disabled) mid-demo.
6. The topology updates: Laptop B disappears; Laptop A and C reconnect directly.
7. Any messages queued during the failure are delivered after reconnection.
8. The packet trace (visible in the UI) shows hop history.

**That is the MVP. Everything else is polish.**

---

*Document version: 1.0 — Mirage Hackathon Blueprint*
