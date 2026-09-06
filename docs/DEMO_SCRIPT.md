# MIRAGE — Demo Script

> 4-minute judging demo for the Mirage offline mesh network.
> Rehearse this script at least twice before presentation.

---

## Pre-Demo Setup Checklist

Complete before judges arrive:

- [ ] Three laptops on the same WiFi network (or personal hotspot from one laptop)
- [ ] Signaling server running on Laptop A: `npm run start` in `apps/server`
- [ ] Signaling server LAN IP noted (printed at startup, e.g. `192.168.1.42:3001`)
- [ ] `.env` on Laptops B and C set to: `NEXT_PUBLIC_SIGNALING_URL=http://192.168.1.42:3001`
- [ ] Mirage web app open on all three laptops: `npm run dev` (or production build)
- [ ] All three laptops show 2 peers in the NetworkStatusBar
- [ ] Laptops labelled with sticky notes: **ALPHA**, **BETA**, **GAMMA**
- [ ] Presenter is at ALPHA; BETA and GAMMA are visible to judges
- [ ] Browser DevTools open on BETA (for packet trace visibility)

---

## Demo Script

### [0:00 – 0:30] Opening Hook

**Presenter says:**

> "Every communication system you use today — WhatsApp, Slack, Signal — has a single point of failure: the internet. Cut the cable, and everyone goes silent.
>
> What if your device itself was the network?
>
> This is Mirage. Three laptops. No internet. No cloud. No router between them. Just a mesh."

**On screen:** ALPHA's topology view showing three nodes (ALPHA, BETA, GAMMA) connected in a triangle with live latency values on each edge.

**Talking point:** "The three circles you see are the three laptops in this room. The lines are live WebRTC DataChannel connections — direct, peer-to-peer, no server in the middle."

---

### [0:30 – 1:00] Explaining the Network

**Presenter says:**

> "Unlike traditional networks, every device here is also a router. Mirage doesn't know what a server is. It only knows neighbours.
>
> Watch the routing table on ALPHA."

**Action:** Click on GAMMA node in the topology view. NodeInfoPanel appears.

**On screen:** NodeInfoPanel shows GAMMA's entry with:
- Status: `alive`
- Route to GAMMA: `next-hop = BETA, metric = 2 hops`
- Latency: ~5ms

**Talking point:** "ALPHA knows how to reach GAMMA — through BETA. 2 hops. The routing table was built automatically, without configuration, in under 30 seconds of the laptops being on the same WiFi."

---

### [1:00 – 1:45] Multi-Hop Packet Routing

**Presenter says:**

> "Now I'm going to send a message from ALPHA to GAMMA. The important part: watch the route."

**Action on ALPHA:** 
1. Open Messenger panel
2. Select GAMMA as destination
3. Type: `"Test message from ALPHA to GAMMA — 2 hops"`
4. Click Send

**Expected behaviour:**
- ALPHA's PacketTraceLog shows: `ALPHA → BETA → GAMMA` with hop count 2
- GAMMA's MessageThread shows the message received with `hopTrace: [ALPHA, BETA, GAMMA]`
- BETA's PacketTraceLog shows the packet was forwarded (BETA is intermediate hop)
- The ALPHA→BETA and BETA→GAMMA edges in the topology briefly animate (packet flow)

**Talking point:** "The message travelled through BETA to reach GAMMA. BETA never saw the content — it's just a router. The hop trace is cryptographic proof of the route."

---

### [1:45 – 2:30] Node Failure and Automatic Rerouting

**Presenter says:**

> "Now for the most important part. Watch what happens when a node in the middle disappears."

**Action:** 
- Close BETA's browser tab (or disable its WiFi)
- On ALPHA and GAMMA: watch topology view

**Expected behaviour (within 9 seconds):**
- BETA node turns grey in ALPHA and GAMMA's topology views
- The ALPHA↔BETA and BETA↔GAMMA edges disappear
- A new direct edge appears between ALPHA and GAMMA
- ALPHA's routing table updates: GAMMA is now reachable in 1 hop (direct)

**Presenter says:**

> "BETA just disappeared. Watch — ALPHA and GAMMA are now talking directly. No human intervention. No configuration. The mesh found a new path in under 10 seconds."

**Talking point:** "This is the core protocol innovation. Mirage runs Distance Vector routing locally on every node. When BETA's heartbeats stopped, ALPHA and GAMMA detected the failure and recomputed their routes simultaneously."

---

### [2:30 – 3:00] Store-Carry-Forward — Packets Don't Die

**Presenter says:**

> "Let's push this further. What if there's no route at all?"

**Action:** 
- Disconnect GAMMA entirely (close tab or disable WiFi)
- On ALPHA: send a message to GAMMA: `"This message will wait"`

**Expected behaviour:**
- Message shows status `queued` in ALPHA's MessageThread
- ALPHA's queue depth badge increments to 1
- ALPHA's PacketTraceLog shows the packet with status `queued — no route`

**Presenter says:**

> "The packet isn't dropped. It's stored locally, waiting for a route to appear. This is Store-Carry-Forward — a DTN principle from deep-space communications, running in the browser."

**Action:** Reconnect GAMMA (re-open browser tab).

**Expected behaviour (within 5 seconds):**
- GAMMA reconnects; appears in topology
- ALPHA's queue drains: message status updates to `delivered`
- GAMMA's MessageThread shows the message with delivery timestamp

**Talking point:** "The packet survived the network outage. In a disaster scenario, this means messages survive even if the entire mesh temporarily collapses."

---

### [3:00 – 3:30] Emergency Broadcast

**Presenter says:**

> "One last feature — emergency broadcast. Every node receives this instantly."

**Action on ALPHA:**
1. Click the Emergency button (red beacon icon)
2. Type: `"DEMO: Emergency broadcast"`
3. Click Send (destId = "*" — all nodes)

**Expected behaviour:**
- EmergencyBanner appears on ALPHA, BETA (if reconnected), and GAMMA simultaneously
- Banner shows severity: `critical`, origin: ALPHA, hop count: visible
- Topology edges pulse/animate during broadcast propagation

**Talking point:** "This packet has TTL=15 and propagates to every reachable node simultaneously. No centralised alert system. No server. Just the mesh."

---

### [3:30 – 4:00] Closing Statement

**Presenter says:**

> "Mirage is not a messaging app. The message was just to prove the protocol works.
>
> What you saw was:
> - Automatic peer discovery using WebRTC and a disposable signaling server
> - Multi-hop packet routing with a distributed routing table
> - Real-time failure detection and rerouting in under 10 seconds
> - Store-Carry-Forward for offline delivery
>
> Everything running in three browser tabs on a single WiFi network. No internet. No cloud. No infrastructure.
>
> When the grid goes down, Mirage stays up."

**Final on screen:** ALPHA's topology view — all three nodes in a triangle, status bars all showing `alive`, queue depth = 0.

---

## Contingency Plans

### If WebRTC connection fails to establish

1. Check all devices are on same WiFi network.
2. Open browser console; look for ICE errors.
3. Switch to personal hotspot from ALPHA; connect BETA and GAMMA to hotspot.
4. If still failing: demonstrate with two tabs on the same laptop (proves protocol, not network).

### If SCF queue doesn't drain after reconnect

1. Click "Retry Queue" button (manual fallback trigger).
2. If still stuck: show IDB contents in DevTools → Application → IndexedDB → scf_queue to prove packets are stored.

### If BETA doesn't re-appear after disconnect

1. Refresh BETA's browser tab. NodeId restores from IndexedDB; reconnects automatically.
2. Narrate: "Node identity persists across browser refreshes — no re-registration needed."

### If React Flow fails to render

1. Navigate to the Messenger page — protocol still works without topology view.
2. Show packet trace in browser console as proof of routing.

---

## Key Judging Talking Points

| What to emphasise | Why it matters |
|---|---|
| "Zero internet required" | Differentiator — most P2P solutions need TURN servers or cloud |
| "Any browser, any device" | No hardware, no install, no app store |
| "Protocol is the product" | Messaging is a demo; the protocol can carry any data |
| "Distributed routing table" | No single router — true mesh architecture |
| "DTN-inspired SCF" | Deep-space comms research applied to everyday hardware |
| "36 hours" | Judges love knowing the scope was realistic and well-planned |

---

## Demo Video/Screenshot Plan

If a live demo is not possible, have pre-recorded screenshots/screen recording ready:

1. Screenshot of 3-node topology (all alive)
2. Screen recording of multi-hop message with hop trace
3. Screen recording of BETA disconnect → reroute (< 30 seconds)
4. Screen recording of SCF queue → reconnect → drain
5. Screenshot of emergency banner on all 3 screens simultaneously

---

*Document version: 1.0 — Mirage Hackathon Blueprint*
