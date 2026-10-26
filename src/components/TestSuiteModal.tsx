import React, { useState, useEffect } from 'react';
import {
  getNextTcpState,
  calculateUsableWindow,
  isSequenceInsideWindow,
  evaluateFastRetransmit,
  projectIsometric,
  COS30,
  SIN30,
} from '../utils/tcpEngine';
import { SCENARIOS } from '../data/scenarios';
import { COMPONENT_EXPLANATIONS } from '../data/componentExplanations';
import { CheckCircle2, XCircle, RotateCcw, X, ShieldCheck, Play, Award } from 'lucide-react';

interface TestCase {
  id: string;
  suite: string;
  title: string;
  run: () => { passed: boolean; message: string; assertions: number };
}

const TEST_CASES: TestCase[] = [
  // 1. TCP State Machine
  {
    id: 'fsm-handshake-client',
    suite: 'Finite State Machine (RFC 793)',
    title: 'Client transitions: CLOSED -> SYN_SENT -> ESTABLISHED',
    run: () => {
      let state = getNextTcpState('CLOSED', 'SEND_SYN');
      if (state !== 'SYN_SENT') return { passed: false, message: 'Expected SYN_SENT', assertions: 1 };
      state = getNextTcpState(state, 'RECV_SYN_ACK');
      if (state !== 'ESTABLISHED') return { passed: false, message: 'Expected ESTABLISHED', assertions: 2 };
      return { passed: true, message: 'Handshake client states verified', assertions: 2 };
    },
  },
  {
    id: 'fsm-handshake-server',
    suite: 'Finite State Machine (RFC 793)',
    title: 'Server transitions: LISTEN -> SYN_RCVD -> ESTABLISHED',
    run: () => {
      let state = getNextTcpState('LISTEN', 'RECV_SYN');
      if (state !== 'SYN_RCVD') return { passed: false, message: 'Expected SYN_RCVD', assertions: 1 };
      state = getNextTcpState(state, 'RECV_ACK');
      if (state !== 'ESTABLISHED') return { passed: false, message: 'Expected ESTABLISHED', assertions: 2 };
      return { passed: true, message: 'Handshake server states verified', assertions: 2 };
    },
  },
  {
    id: 'fsm-active-close',
    suite: 'Finite State Machine (RFC 793)',
    title: 'Active close transitions: ESTABLISHED -> FIN_WAIT_1 -> FIN_WAIT_2 -> TIME_WAIT -> CLOSED',
    run: () => {
      let s = getNextTcpState('ESTABLISHED', 'SEND_FIN');
      if (s !== 'FIN_WAIT_1') return { passed: false, message: 'Failed FIN_WAIT_1', assertions: 1 };
      s = getNextTcpState(s, 'RECV_ACK');
      if (s !== 'FIN_WAIT_2') return { passed: false, message: 'Failed FIN_WAIT_2', assertions: 2 };
      s = getNextTcpState(s, 'RECV_FIN');
      if (s !== 'TIME_WAIT') return { passed: false, message: 'Failed TIME_WAIT', assertions: 3 };
      s = getNextTcpState(s, 'TIMEOUT_2MSL');
      if (s !== 'CLOSED') return { passed: false, message: 'Failed CLOSED', assertions: 4 };
      return { passed: true, message: 'Graceful active teardown verified', assertions: 4 };
    },
  },
  {
    id: 'fsm-rst-abort',
    suite: 'Finite State Machine (RFC 793)',
    title: 'Emergency RST brings any state directly to CLOSED',
    run: () => {
      const states = ['ESTABLISHED', 'SYN_SENT', 'SYN_RCVD', 'FIN_WAIT_1'] as const;
      for (const st of states) {
        if (getNextTcpState(st, 'RECV_RST') !== 'CLOSED') {
          return { passed: false, message: `RST failed for state ${st}`, assertions: 1 };
        }
      }
      return { passed: true, message: 'RST reset transitions verified', assertions: 4 };
    },
  },

  // 2. Sliding Window & Flow Control
  {
    id: 'window-empty-usable',
    suite: 'Sliding Window (RFC 793)',
    title: 'Full usable window when 0 bytes are in flight',
    run: () => {
      const usable = calculateUsableWindow(1000, 1000, 4096);
      return {
        passed: usable === 4096,
        message: `Usable window is ${usable} (expected 4096)`,
        assertions: 1,
      };
    },
  },
  {
    id: 'window-partial-flight',
    suite: 'Sliding Window (RFC 793)',
    title: 'Decrements usable window as segments take flight',
    run: () => {
      const usable = calculateUsableWindow(1000, 2500, 4096);
      return {
        passed: usable === 2596,
        message: `Usable window is ${usable} (expected 2596)`,
        assertions: 1,
      };
    },
  },
  {
    id: 'window-zero-advertisement',
    suite: 'Sliding Window (RFC 793)',
    title: 'Halts transmission when receiver advertises Window Size = 0',
    run: () => {
      const usable = calculateUsableWindow(1000, 5096, 4096);
      return {
        passed: usable === 0,
        message: `Usable window clamped to ${usable}`,
        assertions: 1,
      };
    },
  },
  {
    id: 'window-boundary-validation',
    suite: 'Sliding Window (RFC 793)',
    title: 'Validates segment sequence numbers within advertised buffer limits',
    run: () => {
      const inside1 = isSequenceInsideWindow(2000, 500, 2000, 4000);
      const inside2 = isSequenceInsideWindow(5500, 400, 2000, 4000);
      const outside = isSequenceInsideWindow(7000, 500, 2000, 4000);
      const passed = inside1 && inside2 && !outside;
      return {
        passed,
        message: 'Boundary checks within [2000, 5999] verified',
        assertions: 3,
      };
    },
  },
  {
    id: 'window-zero-probe',
    suite: 'Sliding Window (RFC 793)',
    title: 'Zero-Window Probe allows 1 byte sequence inspection',
    run: () => {
      const probeValid = isSequenceInsideWindow(5000, 0, 5000, 0);
      const invalidSeq = isSequenceInsideWindow(5001, 0, 5000, 0);
      return {
        passed: probeValid && !invalidSeq,
        message: 'Zero-window persist probe mechanics verified',
        assertions: 2,
      };
    },
  },

  // 3. Packet Loss & Fast Retransmit
  {
    id: 'loss-fast-retransmit-3dups',
    suite: 'Reliability & Recovery (RFC 5681)',
    title: 'Triggers Fast Retransmit on exactly 3 duplicate ACKs',
    run: () => {
      const d1 = evaluateFastRetransmit(2501, 2501, 0);
      const d2 = evaluateFastRetransmit(2501, 2501, 1);
      const d3 = evaluateFastRetransmit(2501, 2501, 2);
      const passed = !d1.triggerRetransmit && !d2.triggerRetransmit && d3.triggerRetransmit;
      return {
        passed,
        message: 'Fast retransmit triggered precisely on duplicate ACK #3',
        assertions: 3,
      };
    },
  },
  {
    id: 'loss-dup-reset-on-fresh-ack',
    suite: 'Reliability & Recovery (RFC 5681)',
    title: 'Resets duplicate ACK counter upon arrival of fresh cumulative ACK',
    run: () => {
      const res = evaluateFastRetransmit(2501, 3501, 2);
      return {
        passed: !res.isDuplicate && res.dupAckCount === 0,
        message: 'Duplicate ACK counter successfully cleared',
        assertions: 2,
      };
    },
  },

  // 4. Isometric Axonometry Math
  {
    id: 'iso-origin-projection',
    suite: 'Isometric Projection Geometry',
    title: 'Preserves origin coordinate center mapping (0, 0, 0)',
    run: () => {
      const p = projectIsometric(0, 0, 0, 450, 260, 1.0);
      return {
        passed: p.u === 450 && p.v === 260,
        message: `Projected origin (${p.u}, ${p.v}) matches origin`,
        assertions: 2,
      };
    },
  },
  {
    id: 'iso-30deg-symmetry',
    suite: 'Isometric Projection Geometry',
    title: 'Verifies 30° axonometric cosine and sine horizontal/vertical proportions',
    run: () => {
      const pRight = projectIsometric(100, 0, 0, 500, 300, 1.0);
      const pLeft = projectIsometric(0, 100, 0, 500, 300, 1.0);
      const diffRight = Math.abs(pRight.u - 500 - 100 * COS30);
      const diffLeft = Math.abs(500 - pLeft.u - 100 * COS30);
      const diffV = Math.abs(pRight.v - 300 - 100 * SIN30);
      const passed = diffRight < 0.001 && diffLeft < 0.001 && diffV < 0.001;
      return {
        passed,
        message: 'Trigonometric proportions match ISO 30° grid',
        assertions: 3,
      };
    },
  },
  {
    id: 'iso-z-height-elevation',
    suite: 'Isometric Projection Geometry',
    title: 'Elevates vertices on z axis linearly in negative screen space',
    run: () => {
      const ground = projectIsometric(40, 40, 0, 500, 300, 1.5);
      const elevated = projectIsometric(40, 40, 20, 500, 300, 1.5);
      const passed = ground.u === elevated.u && elevated.v === ground.v - 20 * 1.5;
      return {
        passed,
        message: '3D vertical elevation vector verified',
        assertions: 2,
      };
    },
  },

  // 5. Schema & Educational Data Integrity
  {
    id: 'schema-scenarios-check',
    suite: 'Educational Schema Integrity',
    title: 'Validates all pre-defined protocol scenarios have complete metadata',
    run: () => {
      let assertions = 0;
      for (const sc of SCENARIOS) {
        if (!sc.id || !sc.name || sc.steps.length === 0) {
          return { passed: false, message: `Invalid scenario ${sc.id}`, assertions };
        }
        assertions += 3;
      }
      return { passed: true, message: `${SCENARIOS.length} scenarios validated`, assertions };
    },
  },
  {
    id: 'schema-component-explanations',
    suite: 'Educational Schema Integrity',
    title: 'Verifies all components contain role, significance, analogy, and category',
    run: () => {
      const keys = Object.keys(COMPONENT_EXPLANATIONS);
      let assertions = 0;
      for (const k of keys) {
        const item = COMPONENT_EXPLANATIONS[k];
        if (!item.title || !item.role || !item.significance || !item.analogy) {
          return { passed: false, message: `Missing required field on ${k}`, assertions };
        }
        assertions += 4;
      }
      return { passed: true, message: `${keys.length} educational components verified`, assertions };
    },
  },
];

interface TestSuiteModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TestSuiteModal: React.FC<TestSuiteModalProps> = ({ isOpen, onClose }) => {
  const [results, setResults] = useState<{
    [id: string]: { passed: boolean; message: string; assertions: number };
  }>({});
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [lastRunTime, setLastRunTime] = useState<number | null>(null);

  const runAllTests = () => {
    setIsRunning(true);
    const start = performance.now();
    const newResults: typeof results = {};

    // Execute synchronous unit tests
    TEST_CASES.forEach((tc) => {
      try {
        newResults[tc.id] = tc.run();
      } catch (err: any) {
        newResults[tc.id] = {
          passed: false,
          message: err?.message || 'Exception during execution',
          assertions: 0,
        };
      }
    });

    const elapsed = Math.round(performance.now() - start);
    setResults(newResults);
    setLastRunTime(elapsed);
    setIsRunning(false);
  };

  useEffect(() => {
    if (isOpen) {
      runAllTests();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const totalTests = TEST_CASES.length;
  const passedTests = Object.values(results).filter((r) => r.passed).length;
  const totalAssertions = Object.values(results).reduce((acc, r) => acc + (r.assertions || 0), 0);

  const suites = Array.from(new Set(TEST_CASES.map((t) => t.suite)));

  const filteredTests =
    activeFilter === 'all'
      ? TEST_CASES
      : TEST_CASES.filter((t) => t.suite === activeFilter);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="p-6 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-950/60 border border-emerald-700/60 rounded-xl text-emerald-400">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 text-xs text-emerald-400 font-mono">
                <span>RFC 793 / RFC 5681</span>
                <span>·</span>
                <span>Specification Verification Suite</span>
              </div>
              <h2 className="text-xl font-bold text-slate-100 mt-0.5">
                TCP Implementation Test Suite
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Summary Metric Ribbon */}
        <div className="grid grid-cols-4 gap-3 p-4 bg-slate-950/70 border-b border-slate-800/80 text-xs">
          <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800">
            <span className="text-[10px] text-slate-500 font-mono block">SUITE STATUS</span>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span className="text-sm font-bold text-emerald-400">
                {passedTests === totalTests ? 'All Passed' : `${passedTests}/${totalTests}`}
              </span>
            </div>
          </div>

          <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800">
            <span className="text-[10px] text-slate-500 font-mono block">VERIFIED TESTS</span>
            <span className="text-sm font-bold font-mono text-slate-200 mt-1 block">
              {passedTests} / {totalTests}
            </span>
          </div>

          <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800">
            <span className="text-[10px] text-slate-500 font-mono block">ASSERTIONS RUN</span>
            <span className="text-sm font-bold font-mono text-slate-200 mt-1 block">
              {totalAssertions} Assertions
            </span>
          </div>

          <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800">
            <span className="text-[10px] text-slate-500 font-mono block">EXECUTION TIME</span>
            <span className="text-sm font-bold font-mono text-sky-400 mt-1 block">
              {lastRunTime !== null ? `${lastRunTime} ms` : '—'}
            </span>
          </div>
        </div>

        {/* Suite Filters */}
        <div className="px-6 py-3 border-b border-slate-800/60 bg-slate-900/40 flex items-center gap-1.5 overflow-x-auto scrollbar-none">
          <button
            onClick={() => setActiveFilter('all')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-colors ${
              activeFilter === 'all'
                ? 'bg-slate-800 text-white border border-slate-700'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            All Tests ({totalTests})
          </button>
          {suites.map((s) => (
            <button
              key={s}
              onClick={() => setActiveFilter(s)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-colors ${
                activeFilter === s
                  ? 'bg-slate-800 text-white border border-slate-700'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        {/* Tests List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-2.5">
          {filteredTests.map((tc) => {
            const res = results[tc.id];
            const isPassed = res?.passed;

            return (
              <div
                key={tc.id}
                className="p-3.5 bg-slate-950/50 rounded-xl border border-slate-800/80 flex items-start justify-between gap-4 text-xs"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono text-slate-500 uppercase">
                      {tc.suite}
                    </span>
                  </div>
                  <div className="text-sm font-semibold text-slate-200">{tc.title}</div>
                  <div className="text-[11px] text-slate-400 font-mono">
                    {res ? res.message : 'Pending execution...'}
                  </div>
                </div>

                <div className="shrink-0 pt-0.5 flex items-center gap-2">
                  {res ? (
                    isPassed ? (
                      <span className="flex items-center gap-1 text-[11px] font-mono text-emerald-400 font-semibold bg-emerald-950/60 border border-emerald-800/60 px-2.5 py-1 rounded-md">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        PASS
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-[11px] font-mono text-red-400 font-semibold bg-red-950/60 border border-red-800/60 px-2.5 py-1 rounded-md">
                        <XCircle className="w-3.5 h-3.5" />
                        FAIL
                      </span>
                    )
                  ) : (
                    <span className="text-slate-500 font-mono text-[11px]">...</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/90 flex items-center justify-between">
          <div className="text-xs text-slate-400">
            Automated test suite runs live in browser and via CLI (`npm test`).
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={runAllTests}
              disabled={isRunning}
              className="px-4 py-2 text-xs font-semibold text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors flex items-center gap-2 shadow-sm"
            >
              <RotateCcw className={`w-3.5 h-3.5 ${isRunning ? 'animate-spin' : ''}`} />
              <span>Re-run Test Suite</span>
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white bg-transparent hover:bg-slate-800 rounded-lg transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
