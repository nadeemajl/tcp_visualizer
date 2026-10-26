# ARCHITECTURE.md — System Design & Mechanics

This document provides a technical walkthrough of the architectural layers, mathematical projections, and state machines powering the **Isometric TCP Protocol Visualizer**.

---

## 1. High-Level System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                          App.tsx                            │
│  (State Root, Event Dispatching, Animation Time Loop)       │
└──────────────┬───────────────────────────────┬──────────────┘
               │                               │
       ┌───────┴───────────────┐       ┌───────┴───────────────┐
       ▼                       ▼       ▼                       ▼
┌──────────────┐       ┌──────────────┐┌──────────────┐┌──────────────┐
│  Isometric   │       │   Control    ││Sequence Ladder││ Packet Header│
│    Canvas    │       │     Deck     ││  or Buffer   ││  Inspector   │
└──────┬───────┘       └──────────────┘└──────────────┘└──────────────┘
       │
       ▼
┌──────────────────────────────┐
│ ComponentInspectorPanel.tsx  │
│ (Live RFC Learning Drawer)   │
└──────────────────────────────┘
```

---

## 2. 3D Isometric Projection Engine

The visualization avoids heavy WebGL dependencies in favor of ultra-crisp vector SVG rendering with 60fps hardware-accelerated transforms.

### A. Projection Coordinates
The isometric transformation converts 3D world space $(x, y, z)$ into 2D viewport coordinates $(u, v)$ using true $30^\circ$ axonometry:

$$u = \text{originX} + (x - y) \cdot \cos(30^\circ) \cdot \text{scale}$$
$$v = \text{originY} + (x + y) \cdot \sin(30^\circ) \cdot \text{scale} - z \cdot \text{scale}$$

Where:
- $\cos(30^\circ) = \frac{\sqrt{3}}{2} \approx 0.866025$
- $\sin(30^\circ) = 0.5$
- $\text{scale}$ is dynamically adjusted by the zoom controller and viewport bounds.

### B. Prism Face Shading
Each 3D prism (pedestals, workstations, memory blocks, and packet voxels) is rendered with 3 visible polygonal faces:
1. **Top Face**: Receives direct ambient light (lightest fill tone).
2. **Right Face**: Receives partial directional light (mid tone).
3. **Left Face**: Sits in self-shadow (darkest fill tone).
4. **Hairline Edges**: Rendered with subtle hairlines (`rgba(148, 163, 184, 0.15)`) for sharp definition without visual clutter.

---

## 3. TCP Protocol Implementation (RFC 793 / RFC 5681)

### A. Finite State Machine (FSM)
State transitions are strictly authoritative in `src/utils/tcpEngine.ts`:

- **Handshake Sequence**:
  - `CLOSED` $\xrightarrow{\text{SEND\_SYN}}$ `SYN_SENT` $\xrightarrow{\text{RECV\_SYN\_ACK}}$ `ESTABLISHED`
  - `LISTEN` $\xrightarrow{\text{RECV\_SYN}}$ `SYN_RCVD` $\xrightarrow{\text{RECV\_ACK}}$ `ESTABLISHED`
- **Active Close Sequence**:
  - `ESTABLISHED` $\xrightarrow{\text{SEND\_FIN}}$ `FIN_WAIT_1` $\xrightarrow{\text{RECV\_ACK}}$ `FIN_WAIT_2` $\xrightarrow{\text{RECV\_FIN}}$ `TIME_WAIT` $\xrightarrow{2\text{MSL}}$ `CLOSED`
- **Passive Close Sequence**:
  - `ESTABLISHED` $\xrightarrow{\text{RECV\_FIN}}$ `CLOSE_WAIT` $\xrightarrow{\text{SEND\_FIN}}$ `LAST_ACK` $\xrightarrow{\text{RECV\_ACK}}$ `CLOSED`

### B. Sliding Window & Flow Control
- **Send Buffer Pointers**:
  - `SND.UNA`: Sequence number of oldest unacknowledged byte (left edge of window).
  - `SND.NXT`: Next sequence number to be sent.
  - `SND.WND`: Window size advertised by receiver (`rwnd`).
- **Usable Window Calculation**:
  $$\text{Usable Window} = \max(0, (\text{SND.UNA} + \text{SND.WND}) - \text{SND.NXT})$$
- When `SND.WND = 0` (Zero Window condition), the sender enters the persist state and transmits 1-byte Zero-Window Probes (ZWP) to elicit window update advertisements without causing deadlocks.

### C. Packet Loss & Fast Retransmit (RFC 5681)
- The server reassembles in-order packets. When an out-of-order segment arrives (e.g. sequence gap caused by a dropped router packet), it emits duplicate ACKs containing `rcvNxt`.
- When the sender receives **3 duplicate ACKs**, it bypasses the sluggish Retransmission Timeout (RTO) timer and immediately re-transmits the missing segment (Fast Retransmit).

---

## 4. Animation & Event Loop

- **Continuous Parametric Travel**: Packet flight is tracked via a normalized progress variable $p \in [0.0, 1.0]$.
- **Time Step Delta**: Uses `requestAnimationFrame` with delta-time normalization:
  $$\Delta p = \frac{\Delta t}{2800\text{ms}} \cdot \text{speedMultiplier}$$
- Smooth linear interpolation between origin host, intermediate router gateway, and destination host ensures glitch-free movement across any screen refresh rate (60Hz, 120Hz, 144Hz).
- Dropped packets trigger an explosion/dissolve particle ring when $p \ge \text{dropProgress}$ (at the router hop).

---

## 5. Testing & Verification

1. **Vitest Unit/Integration Tests**: Run in CLI with `npm test`.
2. **In-Browser Test Runner**: Executes live within `TestSuiteModal.tsx` directly in the user interface.
3. **TypeScript Strictness**: Type checking via `tsc --noEmit`.
