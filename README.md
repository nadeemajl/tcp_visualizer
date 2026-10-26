# Isometric TCP Protocol Visualizer

An interactive, educational isometric visualization demonstrating the core mechanics of the **Transmission Control Protocol (TCP)** according to RFC 793, RFC 5681, and RFC 9293.

Built with React 19, TypeScript, Tailwind CSS v4, and Vite, featuring smooth 60fps isometric 3D animations, real-time packet telemetry, sliding window flow control, packet loss recovery, and an interactive RFC verification test suite.

---

## Features

- **Isometric 3D Network Topology**:
  - $30^\circ$ axonometric perspective displaying Client workstation, intermediate Layer 3 router hop, and Server host.
  - Layered OS architecture showing application space, socket kernel buffers, TCP Finite State Machine, and physical/logical transmission conduits.
  - Smooth animated 3D voxel packets with dynamic drop shadows, status tags, and route tracing.
- **Interactive Control Deck**:
  - Speed adjustment: **0.5x Slow**, **1.0x Normal**, and **2.0x Fast**.
  - Interactive Canvas: **Zoom in/out** (0.5x to 2.5x), **Mouse Wheel Zoom**, **Drag-to-Pan**, and **Reset View**.
  - Play, Pause, Step Next, Step Prev, and Reset.
- **Interactive Component & Packet Inspector**:
  - Click on any component or packet in flight (`SYN`, `SYN-ACK`, `ACK`, `DATA`, `FIN`, `RST`, retransmissions, hosts, conduits, buffers) to open a detailed breakdown with:
    - Role in TCP
    - Protocol significance & necessity
    - Intuitive real-world analogy
    - Live packet parameters (Sequence #, Ack #, Payload bytes, Window size, flags)
    - Key RFC header fields and edge-case pitfalls
- **RFC 793 32-Bit Word Header Inspector**:
  - Clickable 32-bit word layout covering Source/Destination Ports, Sequence/Ack numbers, Data Offset, Flags bitfield, Window Size, and Checksum.
- **Five Core Protocol Scenarios + Free Sandbox**:
  1. **Three-Way Handshake**: Connection setup and initial sequence number (ISN) negotiation.
  2. **Data Streaming & Sliding Window**: Pipelining, byte offsets, and cumulative acknowledgments.
  3. **Packet Loss & Fast Retransmit**: Out-of-order gap detection, 3 duplicate ACKs, and RFC 5681 Fast Retransmit.
  4. **Flow Control & Zero Window**: Receiver buffer exhaustion (`rwnd = 0`), persist timer, and window update.
  5. **Connection Teardown**: Graceful 4-way FIN/ACK termination and `TIME_WAIT` safety period.
  6. **Interactive Sandbox**: Manually inject custom packets and toggle router packet drops.
- **Comprehensive Test Suite**:
  - 17 unit and integration tests executing in CLI (`npm test` via Vitest) and live within the browser through an in-app verification modal.

---

## Quick Start (Zero-Setup)

This project has no complex external dependencies or native binaries. It runs directly in standard Node.js (18+) environments and web browsers.

### 1. Install Dependencies
```bash
npm install
```

### 2. Start Development Server
```bash
npm run dev
```
The application will be served at `http://localhost:3000`.

### 3. Run the Test Suite
```bash
npm test
```
Executes all 17 specification verification tests in Vitest.

### 4. Build for Production
```bash
npm run build
```
Generates optimized static assets in `/dist`.

### 5. Type-Check and Lint
```bash
npm run lint
```

---

## Project Structure

```
├── AGENTS.md                  # Instructions for AI coding agents (OpenCode, Claude, Cursor)
├── ARCHITECTURE.md            # Deep architectural design of the isometric engine and state machine
├── CONTRIBUTING.md            # Guidelines for contributing and adding new protocol tests
├── README.md                  # Project overview and quick start guide
├── index.html                 # HTML entry point with Plus Jakarta Sans & JetBrains Mono fonts
├── metadata.json              # App metadata and permissions
├── package.json               # Scripts and dependency declarations
├── tsconfig.json              # TypeScript configuration
├── vite.config.ts             # Vite configuration with Tailwind CSS plugin
├── src/
│   ├── __tests__/             # Automated unit & integration tests
│   │   └── tcp.test.ts        # 17 Vitest tests validating RFC 793, 5681, sliding window, and math
│   ├── components/            # Modular React components
│   │   ├── ComponentInspectorPanel.tsx # Slide-over educational inspector panel
│   │   ├── ControlDeck.tsx             # Playback, speed multiplier, and sandbox triggers
│   │   ├── IsometricCanvas.tsx         # 3D vector isometric projection canvas with zoom/pan
│   │   ├── PacketHeaderInspector.tsx   # 32-bit TCP segment word header interactive explorer
│   │   ├── SequenceLadderDiagram.tsx   # Time-space sequence ladder diagram
│   │   ├── SlidingWindowBar.tsx        # Sender/receiver sliding window byte buffer strip
│   │   ├── TestSuiteModal.tsx          # In-browser test runner modal
│   │   └── TopBar.tsx                  # Clean 3-zone header meeting frontend constitution
│   ├── data/
│   │   ├── componentExplanations.ts    # Educational dictionary for all interactive components
│   │   └── scenarios.ts                # Scenario definitions and sequence steps
│   ├── types/
│   │   └── tcp.ts                      # Core TypeScript interfaces for packets, states, metrics
│   ├── utils/
│   │   └── tcpEngine.ts                # Pure RFC state transitions, window math, and isometric projection
│   ├── App.tsx                         # Main visualizer application container
│   ├── index.css                       # Global styles and typography rules
│   └── main.tsx                        # React DOM root entry point
```

---

## Technical Specifications & References

- **RFC 793**: Transmission Control Protocol Specification
- **RFC 1122**: Requirements for Internet Hosts — Communication Layers
- **RFC 1323**: TCP Extensions for High Performance (Window Scale)
- **RFC 5681**: TCP Congestion Control & Fast Retransmit / Fast Recovery
- **RFC 9293**: Modernized Transmission Control Protocol (TCP) Standard

---

## License

Apache-2.0
