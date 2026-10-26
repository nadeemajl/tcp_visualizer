# CONTRIBUTING.md — Contribution & Code Guidelines

Thank you for contributing to the **Isometric TCP Protocol Visualizer**! This project is dedicated to providing intuitive, mathematically accurate, and beautiful educational tools for computer networking.

---

## 1. Development Workflow

1. **Clone & Install**:
   ```bash
   git clone <repo-url>
   cd <repo-folder>
   npm install
   ```

2. **Start Dev Server**:
   ```bash
   npm run dev
   ```
   Open `http://localhost:3000` in your browser.

3. **Run Checks Before Committing**:
   ```bash
   npm run lint  # Type checks codebase
   npm test      # Runs Vitest unit & integration tests
   npm run build # Verifies production build
   ```

---

## 2. Code & Style Guidelines

### A. TypeScript
- Write strict TypeScript. Do not use `any` unless absolutely necessary for low-level generic wrappers.
- All domain interfaces belong in `src/types/tcp.ts`.
- Pure algorithms and mathematical calculations belong in `src/utils/tcpEngine.ts`.

### B. Styling & Aesthetics
- Use Tailwind CSS v4 utility classes.
- Follow the **zero-pill rule**: never wrap informational tags, categories, statuses, or timestamps in rounded pill capsules or badges. Use clean unboxed text separated by typographic middots (`·`).
- Use muted, sophisticated color palettes. Avoid neon glows or arbitrary high-saturation colors.
- Maintain WCAG AA contrast (at least 4.5:1 for body text, 3:1 for large text).

### C. Testing Requirements
- Every new state machine transition, flow control edge case, or scenario must have an automated test in `src/__tests__/tcp.test.ts`.
- Ensure all 17+ tests pass (`npm test`).

---

## 3. Submitting Changes

- Keep pull requests focused on a single feature, scenario, or bugfix.
- Ensure the commit message clearly states the purpose of the change (e.g. `feat: add SACK selective acknowledgment scenario`, `test: add window scale option validation`).
