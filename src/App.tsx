/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { SCENARIOS } from './data/scenarios';
import { COMPONENT_EXPLANATIONS, ComponentInfo } from './data/componentExplanations';
import { ScenarioId, TcpPacket, HostMetrics } from './types/tcp';
import { TopBar } from './components/TopBar';
import { IsometricCanvas } from './components/IsometricCanvas';
import { ControlDeck } from './components/ControlDeck';
import { SlidingWindowBar } from './components/SlidingWindowBar';
import { SequenceLadderDiagram } from './components/SequenceLadderDiagram';
import { PacketHeaderInspector } from './components/PacketHeaderInspector';
import { ComponentInspectorPanel } from './components/ComponentInspectorPanel';
import { TestSuiteModal } from './components/TestSuiteModal';
import { Terminal, Shield, ArrowRight, BookOpen, Layers, CheckCircle2 } from 'lucide-react';

export default function App() {
  const [activeScenarioId, setActiveScenarioId] = useState<ScenarioId>('handshake');
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [speedMultiplier, setSpeedMultiplier] = useState<number>(1.0);
  const [dropNextPacket, setDropNextPacket] = useState<boolean>(false);
  const [isTestModalOpen, setIsTestModalOpen] = useState<boolean>(false);

  // Inspector state
  const [inspectedComponent, setInspectedComponent] = useState<ComponentInfo | null>(null);
  const [inspectedPacket, setInspectedPacket] = useState<TcpPacket | null>(null);

  // Secondary tab view: ladder diagram vs header inspector
  const [secondaryView, setSecondaryView] = useState<'ladder' | 'header'>('ladder');

  // Active in-flight packets
  const [activePackets, setActivePackets] = useState<TcpPacket[]>([]);

  // Current scenario object
  const currentScenario =
    SCENARIOS.find((s) => s.id === activeScenarioId) || SCENARIOS[0];
  const currentStep = currentScenario.steps[currentStepIndex] || currentScenario.steps[0];

  // Host metrics state
  const [metrics, setMetrics] = useState<HostMetrics>({
    clientState: currentStep.clientState,
    serverState: currentStep.serverState,
    rttMs: 45,
    cwndMss: 4,
    ssthreshMss: 16,
    clientSndUna: currentStep.clientWindow?.sndUna ?? 1000,
    clientSndNxt: currentStep.clientWindow?.sndNxt ?? 1000,
    clientSndWnd: currentStep.clientWindow?.sndWnd ?? 64240,
    serverRcvNxt: currentStep.serverWindow?.rcvNxt ?? 0,
    serverRcvWnd: currentStep.serverWindow?.rcvWnd ?? 65535,
    bytesSent: 0,
    bytesAcked: 0,
    retransmissions: 0,
  });

  // Keep metrics in sync with current scenario step
  useEffect(() => {
    if (currentStep) {
      setMetrics((prev) => ({
        ...prev,
        clientState: currentStep.clientState,
        serverState: currentStep.serverState,
        clientSndUna: currentStep.clientWindow?.sndUna ?? prev.clientSndUna,
        clientSndNxt: currentStep.clientWindow?.sndNxt ?? prev.clientSndNxt,
        clientSndWnd: currentStep.clientWindow?.sndWnd ?? prev.clientSndWnd,
        serverRcvNxt: currentStep.serverWindow?.rcvNxt ?? prev.serverRcvNxt,
        serverRcvWnd: currentStep.serverWindow?.rcvWnd ?? prev.serverRcvWnd,
      }));
    }
  }, [currentStep]);

  // Dispatch a packet for a step
  const dispatchStepPacket = useCallback(
    (stepIdx: number) => {
      const step = currentScenario.steps[stepIdx];
      if (!step || !step.packetToDispatch) return;

      const pData = step.packetToDispatch;
      const newPacket: TcpPacket = {
        ...pData,
        id: `pkt-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        progress: 0,
        timestamp: Date.now(),
      };

      setActivePackets([newPacket]);
    },
    [currentScenario]
  );

  // Initialize/reset on scenario change
  const handleSelectScenario = (id: ScenarioId) => {
    setActiveScenarioId(id);
    setCurrentStepIndex(0);
    setActivePackets([]);
    const sc = SCENARIOS.find((s) => s.id === id) || SCENARIOS[0];
    const initialStep = sc.steps[0];
    if (initialStep) {
      setMetrics((prev) => ({
        ...prev,
        clientState: initialStep.clientState,
        serverState: initialStep.serverState,
        clientSndUna: initialStep.clientWindow?.sndUna ?? 1000,
        clientSndNxt: initialStep.clientWindow?.sndNxt ?? 1000,
        clientSndWnd: initialStep.clientWindow?.sndWnd ?? 64240,
        serverRcvNxt: initialStep.serverWindow?.rcvNxt ?? 0,
        serverRcvWnd: initialStep.serverWindow?.rcvWnd ?? 65535,
      }));
    }
    // Launch first packet after brief pause
    setTimeout(() => {
      const step = sc.steps[0];
      if (step && step.packetToDispatch) {
        const newPacket: TcpPacket = {
          ...step.packetToDispatch,
          id: `pkt-${Date.now()}`,
          progress: 0,
          timestamp: Date.now(),
        };
        setActivePackets([newPacket]);
      }
    }, 200);
  };

  // Launch initial packet on mount
  useEffect(() => {
    dispatchStepPacket(0);
  }, [dispatchStepPacket]);

  // Animation frame loop to smoothly translate packets along conduits
  const lastTimeRef = useRef<number>(performance.now());
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    let animId: number;

    const animate = (time: number) => {
      const deltaMs = time - lastTimeRef.current;
      lastTimeRef.current = time;

      if (isPlaying && deltaMs < 100) {
        // Base travel duration: ~2.8 seconds per transit at 1x speed
        const speedFactor = (deltaMs / 2800) * speedMultiplier;

        setActivePackets((prevPackets) => {
          if (prevPackets.length === 0) return prevPackets;

          let hasCompleted = false;
          const updated = prevPackets.map((pkt) => {
            const nextP = pkt.progress + speedFactor * (pkt.speed || 1);

            if (nextP >= 1.0 && pkt.progress < 1.0) {
              hasCompleted = true;
            }

            return {
              ...pkt,
              progress: nextP,
            };
          });

          // If a packet completed its journey, trigger next step progression
          if (hasCompleted && activeScenarioId !== 'sandbox') {
            if (timerRef.current) clearTimeout(timerRef.current);
            timerRef.current = setTimeout(() => {
              setCurrentStepIndex((cur) => {
                if (cur < currentScenario.steps.length - 1) {
                  const nextIndex = cur + 1;
                  dispatchStepPacket(nextIndex);
                  return nextIndex;
                } else {
                  setIsPlaying(false);
                  return cur;
                }
              });
            }, 800 / speedMultiplier);
          }

          // Filter out packets that completed over 1.2 progress
          return updated.filter((p) => p.progress <= 1.25);
        });
      }

      animId = requestAnimationFrame(animate);
    };

    animId = requestAnimationFrame(animate);
    return () => {
      cancelAnimationFrame(animId);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isPlaying, speedMultiplier, activeScenarioId, currentScenario, dispatchStepPacket]);

  // Manual step controls
  const handleStepNext = () => {
    if (currentStepIndex < currentScenario.steps.length - 1) {
      const nextIdx = currentStepIndex + 1;
      setCurrentStepIndex(nextIdx);
      dispatchStepPacket(nextIdx);
    }
  };

  const handleStepPrev = () => {
    if (currentStepIndex > 0) {
      const prevIdx = currentStepIndex - 1;
      setCurrentStepIndex(prevIdx);
      dispatchStepPacket(prevIdx);
    }
  };

  const handleReset = () => {
    setCurrentStepIndex(0);
    setActivePackets([]);
    dispatchStepPacket(0);
  };

  // Dispatch custom packets in Sandbox mode
  const handleDispatchSandboxPacket = (
    type: 'syn' | 'data' | 'ack' | 'fin' | 'rst' | 'drop'
  ) => {
    let newPacket: TcpPacket;
    const isDrop = dropNextPacket || type === 'drop';

    switch (type) {
      case 'syn':
        newPacket = {
          id: `sandbox-syn-${Date.now()}`,
          source: 'client',
          destination: 'server',
          sourcePort: 52418,
          destPort: 80,
          seqNumber: metrics.clientSndNxt,
          ackNumber: 0,
          length: 0,
          windowSize: 64240,
          flags: { syn: true },
          checksum: '0x9911',
          dataSummary: 'Sandbox manual SYN request',
          progress: 0,
          speed: 1,
          timestamp: Date.now(),
          dropped: isDrop,
          dropProgress: 0.5,
          dropReason: 'Injected router drop',
        };
        setMetrics((m) => ({ ...m, clientState: 'SYN_SENT' }));
        break;

      case 'ack':
        newPacket = {
          id: `sandbox-ack-${Date.now()}`,
          source: 'server',
          destination: 'client',
          sourcePort: 80,
          destPort: 52418,
          seqNumber: 5000,
          ackNumber: metrics.clientSndNxt + 500,
          length: 0,
          windowSize: 4096,
          flags: { ack: true },
          checksum: '0x9922',
          dataSummary: 'Sandbox manual ACK response',
          progress: 0,
          speed: 1,
          timestamp: Date.now(),
          dropped: isDrop,
          dropProgress: 0.5,
          dropReason: 'Injected router drop',
        };
        break;

      case 'fin':
        newPacket = {
          id: `sandbox-fin-${Date.now()}`,
          source: 'client',
          destination: 'server',
          sourcePort: 52418,
          destPort: 80,
          seqNumber: metrics.clientSndNxt,
          ackNumber: 5000,
          length: 0,
          windowSize: 64240,
          flags: { fin: true, ack: true },
          checksum: '0x9933',
          dataSummary: 'Sandbox manual FIN termination',
          progress: 0,
          speed: 1,
          timestamp: Date.now(),
          dropped: isDrop,
          dropProgress: 0.5,
          dropReason: 'Injected router drop',
        };
        setMetrics((m) => ({ ...m, clientState: 'FIN_WAIT_1' }));
        break;

      case 'rst':
        newPacket = {
          id: `sandbox-rst-${Date.now()}`,
          source: 'client',
          destination: 'server',
          sourcePort: 52418,
          destPort: 80,
          seqNumber: metrics.clientSndNxt,
          ackNumber: 0,
          length: 0,
          windowSize: 0,
          flags: { rst: true },
          checksum: '0x9944',
          dataSummary: 'Sandbox manual RST emergency abort',
          progress: 0,
          speed: 1,
          timestamp: Date.now(),
        };
        setMetrics((m) => ({ ...m, clientState: 'CLOSED', serverState: 'CLOSED' }));
        break;

      case 'data':
      default:
        newPacket = {
          id: `sandbox-data-${Date.now()}`,
          source: 'client',
          destination: 'server',
          sourcePort: 52418,
          destPort: 80,
          seqNumber: metrics.clientSndNxt,
          ackNumber: 5000,
          length: 500,
          windowSize: 64240,
          flags: { psh: true, ack: true },
          checksum: '0x9955',
          dataSummary: 'Sandbox custom data payload (500 Bytes)',
          progress: 0,
          speed: 1,
          timestamp: Date.now(),
          dropped: isDrop,
          dropProgress: 0.5,
          dropReason: 'Injected router drop',
        };
        setMetrics((m) => ({
          ...m,
          clientSndNxt: m.clientSndNxt + 500,
          bytesSent: m.bytesSent + 500,
        }));
        break;
    }

    if (dropNextPacket) {
      setDropNextPacket(false);
    }

    setActivePackets((prev) => [...prev, newPacket]);
  };

  // Inspect component handler
  const handleSelectComponent = (info: ComponentInfo, packetContext?: TcpPacket) => {
    setInspectedComponent(info);
    setInspectedPacket(packetContext || null);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Strict 3-zone Header */}
      <TopBar
        onSelectNav={handleSelectScenario}
        activeScenarioId={activeScenarioId}
        onOpenSandbox={() =>
          handleSelectScenario(activeScenarioId === 'sandbox' ? 'handshake' : 'sandbox')
        }
        onOpenTests={() => setIsTestModalOpen(true)}
      />

      {/* Main Workspace Canvas & Controls */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-6">
        {/* Scenario Overview Banner */}
        <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900/60 p-4 rounded-xl border border-slate-800/80">
          <div>
            <div className="flex items-center gap-2 text-xs text-sky-400 font-mono mb-1">
              <span>{currentScenario.badge}</span>
              <span className="text-slate-600">·</span>
              <span className="text-slate-400">Interactive Isometric Simulation</span>
            </div>
            <h1 className="text-xl font-bold text-slate-100">{currentScenario.name}</h1>
            <p className="text-xs text-slate-400 mt-1 max-w-2xl">{currentScenario.summary}</p>
          </div>

          <button
            onClick={() => setIsTestModalOpen(true)}
            className="flex items-center gap-2 text-xs text-emerald-300 hover:text-emerald-200 bg-slate-950/70 hover:bg-slate-950 px-3.5 py-2 rounded-lg border border-slate-800 hover:border-emerald-700/60 transition-colors cursor-pointer group"
            title="Open test suite"
          >
            <Shield className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
            <span>RFC Verification Test Suite</span>
            <span className="text-[10px] font-mono bg-emerald-950 text-emerald-400 border border-emerald-800/80 px-1.5 py-0.5 rounded">
              17 Tests
            </span>
          </button>
        </div>

        {/* Primary Interactive Stage: 3D Isometric Projection */}
        <section className="space-y-4">
          <IsometricCanvas
            activePackets={activePackets}
            metrics={metrics}
            onSelectComponent={handleSelectComponent}
            selectedComponentId={inspectedPacket?.id || inspectedComponent?.id}
            speedMultiplier={speedMultiplier}
          />

          {/* Playback & Control Deck */}
          <ControlDeck
            scenarios={SCENARIOS}
            activeScenarioId={activeScenarioId}
            onSelectScenario={handleSelectScenario}
            currentStepIndex={currentStepIndex}
            totalSteps={currentScenario.steps.length}
            isPlaying={isPlaying}
            onTogglePlay={() => setIsPlaying((p) => !p)}
            onStepNext={handleStepNext}
            onStepPrev={handleStepPrev}
            onReset={handleReset}
            speed={speedMultiplier}
            onChangeSpeed={(sp) => setSpeedMultiplier(sp)}
            onDispatchCustomPacket={handleDispatchSandboxPacket}
            dropNextPacket={dropNextPacket}
            onToggleDropNext={() => setDropNextPacket((d) => !d)}
          />
        </section>

        {/* Lower Two-Zone Split: Buffer/Explanation Deck on Left, Ladder/Header Inspector on Right */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column (7 cols): Step Explanation & Sliding Window */}
          <div className="lg:col-span-7 space-y-4">
            {/* Active Step Architectural Narrative */}
            <div className="bg-slate-900/80 rounded-xl border border-slate-800 p-5 space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-400 border-b border-slate-800 pb-2">
                <span className="flex items-center gap-1.5 font-semibold text-slate-200">
                  <Terminal className="w-4 h-4 text-sky-400" />
                  Protocol Phase Explanation
                </span>
                <span className="font-mono text-slate-400">
                  Step {currentStepIndex + 1} of {currentScenario.steps.length}
                </span>
              </div>

              <div className="space-y-2">
                <h3 className="text-base font-bold text-slate-100">{currentStep.title}</h3>
                <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/50 p-3.5 rounded-lg border border-slate-800/60">
                  {currentStep.explanation}
                </p>
              </div>

              {/* Action summary badge */}
              <div className="flex items-center gap-2 pt-1 text-xs">
                <span className="text-slate-500 font-mono">Transmission:</span>
                <span className="font-mono text-sky-400 font-semibold">
                  {currentStep.actionSummary}
                </span>
              </div>
            </div>

            {/* Visual Sliding Window Buffer Strip */}
            <SlidingWindowBar metrics={metrics} onSelectComponent={handleSelectComponent} />
          </div>

          {/* Right Column (5 cols): Synchronized Sequence Ladder or 32-bit Header Inspector */}
          <div className="lg:col-span-5 space-y-4">
            {/* View Switcher Tabs */}
            <div className="flex items-center gap-1 p-1 bg-slate-900/90 rounded-lg border border-slate-800">
              <button
                onClick={() => setSecondaryView('ladder')}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-colors flex items-center justify-center gap-1.5 ${
                  secondaryView === 'ladder'
                    ? 'bg-slate-800 text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Sequence Ladder</span>
              </button>
              <button
                onClick={() => setSecondaryView('header')}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-colors flex items-center justify-center gap-1.5 ${
                  secondaryView === 'header'
                    ? 'bg-slate-800 text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>TCP Header Inspector</span>
              </button>
            </div>

            {secondaryView === 'ladder' ? (
              <SequenceLadderDiagram
                scenario={currentScenario}
                currentStepIndex={currentStepIndex}
                onSelectStep={(idx) => {
                  setCurrentStepIndex(idx);
                  dispatchStepPacket(idx);
                }}
                onSelectComponent={handleSelectComponent}
              />
            ) : (
              <PacketHeaderInspector
                packet={activePackets[0] || currentStep.packetToDispatch}
              />
            )}
          </div>
        </div>
      </main>

      {/* Interactive Component Explanation Slide-Over Panel */}
      <ComponentInspectorPanel
        info={inspectedComponent}
        packetContext={inspectedPacket}
        onClose={() => {
          setInspectedComponent(null);
          setInspectedPacket(null);
        }}
        onDispatchCustomPacket={(componentId) => {
          if (componentId === 'syn-packet') handleDispatchSandboxPacket('syn');
          else if (componentId === 'ack-packet') handleDispatchSandboxPacket('ack');
          else if (componentId === 'fin-packet') handleDispatchSandboxPacket('fin');
          else if (componentId === 'rst-packet') handleDispatchSandboxPacket('rst');
          else handleDispatchSandboxPacket('data');
        }}
      />

      {/* In-App Test Suite Modal */}
      <TestSuiteModal
        isOpen={isTestModalOpen}
        onClose={() => setIsTestModalOpen(false)}
      />

      {/* Quiet, unboxed Footer with RFC citations */}
      <footer className="mt-auto border-t border-slate-800 py-6 px-6 text-xs text-slate-500 bg-slate-950">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span>Transmission Control Protocol</span>
            <span aria-hidden="true">·</span>
            <span>RFC 793</span>
            <span aria-hidden="true">·</span>
            <span>RFC 5681</span>
            <span aria-hidden="true">·</span>
            <span>RFC 9293</span>
          </div>
          <div>Interactive Educational Isometric System Visualizer</div>
        </div>
      </footer>
    </div>
  );
}
