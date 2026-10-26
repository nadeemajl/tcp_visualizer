import React from 'react';
import { ScenarioId } from '../types/tcp';

interface TopBarProps {
  onSelectNav: (id: ScenarioId) => void;
  activeScenarioId: ScenarioId;
  onOpenSandbox: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  onSelectNav,
  activeScenarioId,
  onOpenSandbox,
}) => {
  return (
    <header className="flex items-center justify-between gap-8 px-6 py-4 border-b border-slate-800 bg-slate-950/70 backdrop-blur-md sticky top-0 z-40">
      {/* Zone 1: Brand Wordmark */}
      <div className="flex items-center gap-3 shrink-0">
        <a
          href="#"
          className="text-lg font-bold tracking-tight text-slate-100 whitespace-nowrap shrink-0"
        >
          TCP Isometric Explorer
        </a>
      </div>

      {/* Zone 2: 4-5 single-line clean nav links */}
      <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-400">
        <button
          onClick={() => onSelectNav('handshake')}
          className={`hover:text-slate-100 transition-colors whitespace-nowrap shrink-0 ${
            activeScenarioId === 'handshake' ? 'text-sky-400 font-semibold' : ''
          }`}
        >
          3-Way Handshake
        </button>
        <button
          onClick={() => onSelectNav('data-transfer')}
          className={`hover:text-slate-100 transition-colors whitespace-nowrap shrink-0 ${
            activeScenarioId === 'data-transfer' ? 'text-sky-400 font-semibold' : ''
          }`}
        >
          Sliding Window
        </button>
        <button
          onClick={() => onSelectNav('packet-loss')}
          className={`hover:text-slate-100 transition-colors whitespace-nowrap shrink-0 ${
            activeScenarioId === 'packet-loss' ? 'text-sky-400 font-semibold' : ''
          }`}
        >
          Fast Retransmit
        </button>
        <button
          onClick={() => onSelectNav('flow-control')}
          className={`hover:text-slate-100 transition-colors whitespace-nowrap shrink-0 ${
            activeScenarioId === 'flow-control' ? 'text-sky-400 font-semibold' : ''
          }`}
        >
          Flow Control
        </button>
        <button
          onClick={() => onSelectNav('teardown')}
          className={`hover:text-slate-100 transition-colors whitespace-nowrap shrink-0 ${
            activeScenarioId === 'teardown' ? 'text-sky-400 font-semibold' : ''
          }`}
        >
          4-Way Teardown
        </button>
      </nav>

      {/* Zone 3: 1 Primary Action */}
      <div className="flex items-center gap-3 shrink-0">
        <button
          onClick={onOpenSandbox}
          className="px-4 py-2 text-xs font-semibold text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors whitespace-nowrap shrink-0 shadow-sm"
        >
          {activeScenarioId === 'sandbox' ? 'Exit Sandbox' : 'Sandbox Mode'}
        </button>
      </div>
    </header>
  );
};
