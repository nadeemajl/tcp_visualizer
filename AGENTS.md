# AGENTS.md — Coding Agent Guidelines

This document provides context, conventions, and operational instructions for AI coding agents (such as OpenCode, Claude Code, Cursor, Windsurf, or custom coding harnesses) working on the **Isometric TCP Protocol Visualizer** repository.

---

## 1. Project Overview & Intent

- **Application Type**: Interactive Educational Simulation & Protocol Visualizer.
- **Subject**: Transmission Control Protocol (TCP) as defined in RFC 793, RFC 5681, and RFC 9293.
- **Aesthetic Direction**: Clean isometric vector visualization with muted color schemes (obsidian slate `#0b0f19` canvas, muted cobalt, sage, amber, and terracotta semantic accents). No neon cyberpunk glows or low-contrast text.
- **Target Audience**: Students, systems engineers, and learners seeking deep intuition for networking concepts (handshakes, sequence numbers, sliding windows, retransmission, and flow control).

---

## 2. Core Commands & Toolchain

| Command | Action | Notes |
| :--- | :--- | :--- |
| `npm run dev` | Start Vite dev server on port 3000 | Serves at `http://localhost:3000` |
| `npm test` | Execute test suite via Vitest | Runs 17 unit and integration tests |
| `npm run lint` | Run TypeScript type checking | Runs `tsc --noEmit` |
| `npm run build` | Build production bundle | Compiles output into `/dist` |

*Note for Agents*: When adding code or modifying logic, always run `npm run lint` and `npm test` to verify zero type regressions and all test assertions passing.

---

## 3. Technology Stack & Dependencies

- **Framework**: React 19 (`react`, `react-dom`)
- **Build System**: Vite 8 with `@vitejs/plugin-react`
- **Styling**: Tailwind CSS v4 (`@tailwindcss/vite`, imported via `@import "tailwindcss";` in `src/index.css`)
- **Icons**: `lucide-react`
- **Testing**: `vitest`
- **Typography**: `Plus Jakarta Sans` (display/body) and `JetBrains Mono` with `tabular-nums` (data, headers, and sequence counters).

---

## 4. Key Architectural Invariants

### A. Isometric Projection Geometry
- The isometric projection uses standard $30^\circ$ axonometry.
- All projections must go through `src/utils/tcpEngine.ts:projectIsometric(x, y, z, originX, originY, scale)` or equivalent formulas:
  $$u = \text{originX} + (x - y) \cdot \cos(30^\circ) \cdot \text{scale}$$
  $$v = \text{originY} + (x + y) \cdot \sin(30^\circ) \cdot \text{scale} - z \cdot \text{scale}$$
  where $\cos(30^\circ) \approx 0.866025$ and $\sin(30^\circ) = 0.5$.
- Coordinate anchors:
  - Client node: centered around $x = -150$
  - Router gateway: centered around $x = 0$
  - Server host: centered around $x = 150$

### B. Protocol Logic & RFC Compliance
- Pure protocol calculations belong in `src/utils/tcpEngine.ts`:
  - `getNextTcpState`: Validates state machine transitions (`SYN_SENT`, `ESTABLISHED`, `FIN_WAIT_1`, `TIME_WAIT`, etc.).
  - `calculateUsableWindow`: Calculates `(sndUna + sndWnd) - sndNxt`.
  - `evaluateFastRetransmit`: Triggers fast retransmit strictly upon the 3rd duplicate ACK.
  - `isSequenceInsideWindow`: Enforces sliding window boundary limits and Zero Window probe handling.
- Never write ad-hoc state transitions directly inside UI components without updating `tcpEngine.ts`.

### C. Educational Component Data Integrity
- Every clickable component in the visualizer must be mapped in `src/data/componentExplanations.ts`.
- Each entry must include:
  1. `role`: Concise definition of what the component does.
  2. `significance`: Why TCP requires this component.
  3. `analogy`: Beginner-friendly everyday analogy.
  4. `category`: One of `'Packet Type' | 'Network Hardware' | 'Host Architecture' | 'Protocol Mechanism'`.

### D. Zero-Pill Design Discipline
- Do not enclose static metadata (e.g. category, dates, status, ports) in pill containers or colored capsule chips. Use clean, unboxed text separated by typographic middots (`·`) or slashes (`/`).
- Interactive buttons and filter tabs are styled as clean segmented controls with subtle border contrasts.

---

## 5. Adding New Features or Scenarios

### Adding a New TCP Scenario
1. Open `src/data/scenarios.ts`.
2. Add a new `ScenarioDefinition` with a unique `id`, `name`, `badge`, `summary`, and sequential `steps`.
3. For each step, specify `clientState`, `serverState`, `actionSummary`, and optional `packetToDispatch`.
4. Update `ScenarioId` in `src/types/tcp.ts`.
5. Add corresponding unit tests in `src/__tests__/tcp.test.ts` and `src/components/TestSuiteModal.tsx`.

### Adding a New Test Case
1. Automated CLI test: Add `it('...')` in `src/__tests__/tcp.test.ts`.
2. In-App browser test: Add an entry to `TEST_CASES` in `src/components/TestSuiteModal.tsx`.
3. Run `npm test` to verify.

---

## 6. Third-Party Coding Harness Integration

- **Container / Sandbox Execution**: Works out of the box with `node:18+` or `node:20+` base images.
- **Environment Variables**: No mandatory secrets or API keys are required for core visualizer functionality. Any optional endpoints can be configured in `.env`.
- **HMR & Dev Server**: Configured to run on `0.0.0.0:3000`.
