import React from 'react';
import { ScenarioDefinition } from '../types/tcp';
import { COMPONENT_EXPLANATIONS, ComponentInfo } from '../data/componentExplanations';

interface SequenceLadderDiagramProps {
  scenario: ScenarioDefinition;
  currentStepIndex: number;
  onSelectStep: (index: number) => void;
  onSelectComponent: (info: ComponentInfo) => void;
}

export const SequenceLadderDiagram: React.FC<SequenceLadderDiagramProps> = ({
  scenario,
  currentStepIndex,
  onSelectStep,
  onSelectComponent,
}) => {
  return (
    <div className="bg-slate-900/80 rounded-xl border border-slate-800 p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold text-slate-200">
          Sequence Ladder Timeline (Time-Space Diagram)
        </h3>
        <span className="text-[11px] font-mono text-slate-400">Client ↔ Server</span>
      </div>

      <div className="relative pt-2 pb-2">
        {/* Timeline Columns Header */}
        <div className="flex justify-between items-center px-8 pb-3 border-b border-slate-800">
          <div className="text-center">
            <span className="text-xs font-semibold text-sky-400 block">Client</span>
            <span className="text-[10px] font-mono text-slate-500">192.168.1.42:52418</span>
          </div>
          <div className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">
            Network Transit
          </div>
          <div className="text-center">
            <span className="text-xs font-semibold text-emerald-400 block">Server</span>
            <span className="text-[10px] font-mono text-slate-500">93.184.216.34:80</span>
          </div>
        </div>

        {/* Steps / Packets List */}
        <div className="space-y-3 pt-3">
          {scenario.steps.map((step, idx) => {
            const isActive = idx === currentStepIndex;
            const packet = step.packetToDispatch;
            const isClientToServer = packet?.source === 'client';

            let arrowColor = '#38bdf8'; // sky
            let badgeBg = 'bg-sky-950/60 text-sky-300 border-sky-800/80';
            if (packet?.flags.syn && packet?.flags.ack) {
              arrowColor = '#a855f7';
              badgeBg = 'bg-purple-950/60 text-purple-300 border-purple-800/80';
            } else if (packet?.flags.syn) {
              arrowColor = '#6366f1';
              badgeBg = 'bg-indigo-950/60 text-indigo-300 border-indigo-800/80';
            } else if (packet?.flags.fin) {
              arrowColor = '#f43f5e';
              badgeBg = 'bg-rose-950/60 text-rose-300 border-rose-800/80';
            } else if (packet?.flags.ack && packet?.length === 0) {
              arrowColor = '#10b981';
              badgeBg = 'bg-emerald-950/60 text-emerald-300 border-emerald-800/80';
            } else if (packet?.dropped) {
              arrowColor = '#ef4444';
              badgeBg = 'bg-red-950/60 text-red-300 border-red-800/80';
            }

            return (
              <div
                key={idx}
                onClick={() => onSelectStep(idx)}
                className={`p-2.5 rounded-lg border transition-all cursor-pointer ${
                  isActive
                    ? 'bg-slate-800/90 border-slate-600 shadow-sm'
                    : 'bg-slate-950/40 border-slate-800/60 hover:bg-slate-800/40'
                }`}
              >
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="font-semibold text-slate-200">{step.title}</span>
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${badgeBg}`}>
                    {step.actionSummary}
                  </span>
                </div>

                {/* SVG Transmission Vector Arrow */}
                {packet && (
                  <div className="py-1">
                    <svg className="w-full h-7 overflow-visible">
                      <defs>
                        <marker
                          id={`arrow-${idx}`}
                          viewBox="0 0 10 10"
                          refX="6"
                          refY="5"
                          markerWidth="6"
                          markerHeight="6"
                          orient="auto-start-reverse"
                        >
                          <path d="M 0 1 L 10 5 L 0 9 z" fill={arrowColor} />
                        </marker>
                      </defs>

                      {isClientToServer ? (
                        <>
                          <line
                            x1="12%"
                            y1="4"
                            x2={packet.dropped ? '50%' : '88%'}
                            y2="20"
                            stroke={arrowColor}
                            strokeWidth={isActive ? '2.5' : '1.5'}
                            strokeDasharray={packet.dropped ? '4 3' : 'none'}
                            markerEnd={packet.dropped ? undefined : `url(#arrow-${idx})`}
                          />
                          {packet.dropped && (
                            <g transform="translate(50%, 20)">
                              <circle cx="50%" cy="16" r="6" fill="#ef4444" />
                              <text
                                x="50%"
                                y="20"
                                textAnchor="middle"
                                className="text-[9px] font-bold fill-white"
                              >
                                ✕
                              </text>
                            </g>
                          )}
                        </>
                      ) : (
                        <line
                          x1="88%"
                          y1="4"
                          x2="12%"
                          y2="20"
                          stroke={arrowColor}
                          strokeWidth={isActive ? '2.5' : '1.5'}
                          markerEnd={`url(#arrow-${idx})`}
                        />
                      )}
                    </svg>
                  </div>
                )}

                <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                  {step.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
