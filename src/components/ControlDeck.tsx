import React from 'react';
import { ScenarioDefinition, ScenarioId } from '../types/tcp';
import {
  Play,
  Pause,
  SkipForward,
  SkipBack,
  RotateCcw,
  Gauge,
  Send,
  Zap,
  Flame,
  AlertTriangle,
} from 'lucide-react';

interface ControlDeckProps {
  scenarios: ScenarioDefinition[];
  activeScenarioId: ScenarioId;
  onSelectScenario: (id: ScenarioId) => void;
  currentStepIndex: number;
  totalSteps: number;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onStepNext: () => void;
  onStepPrev: () => void;
  onReset: () => void;
  speed: number;
  onChangeSpeed: (newSpeed: number) => void;
  // Sandbox specific actions
  onDispatchCustomPacket: (type: 'syn' | 'data' | 'ack' | 'fin' | 'rst' | 'drop') => void;
  dropNextPacket: boolean;
  onToggleDropNext: () => void;
}

export const ControlDeck: React.FC<ControlDeckProps> = ({
  scenarios,
  activeScenarioId,
  onSelectScenario,
  currentStepIndex,
  totalSteps,
  isPlaying,
  onTogglePlay,
  onStepNext,
  onStepPrev,
  onReset,
  speed,
  onChangeSpeed,
  onDispatchCustomPacket,
  dropNextPacket,
  onToggleDropNext,
}) => {
  const isSandbox = activeScenarioId === 'sandbox';

  return (
    <div className="bg-slate-900/80 rounded-xl border border-slate-800 p-4 space-y-4">
      {/* Top Row: Scenario Tabs (Segmented control) */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {scenarios.map((sc) => {
          const isActive = sc.id === activeScenarioId;
          return (
            <button
              key={sc.id}
              onClick={() => onSelectScenario(sc.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap shrink-0 transition-colors ${
                isActive
                  ? 'bg-slate-800 text-white shadow-sm border border-slate-700'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              {sc.name}
            </button>
          );
        })}
      </div>

      {/* Main Playback Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 pt-1 border-t border-slate-800/80">
        {/* Playback Transport Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={onTogglePlay}
            className="flex items-center gap-2 px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold rounded-lg shadow transition-colors active:scale-95"
            title={isPlaying ? 'Pause simulation' : 'Play simulation'}
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-white" />}
            <span className="whitespace-nowrap">{isPlaying ? 'Pause' : 'Play'}</span>
          </button>

          {!isSandbox && (
            <>
              <button
                onClick={onStepPrev}
                disabled={currentStepIndex <= 0}
                className="p-2 text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-800 disabled:opacity-40 disabled:pointer-events-none rounded-lg border border-slate-700/60 transition-colors"
                title="Step backward"
              >
                <SkipBack className="w-4 h-4" />
              </button>
              <button
                onClick={onStepNext}
                disabled={currentStepIndex >= totalSteps - 1}
                className="p-2 text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-800 disabled:opacity-40 disabled:pointer-events-none rounded-lg border border-slate-700/60 transition-colors"
                title="Step forward"
              >
                <SkipForward className="w-4 h-4" />
              </button>
            </>
          )}

          <button
            onClick={onReset}
            className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 rounded-lg transition-colors"
            title="Reset scenario"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          {!isSandbox && (
            <div className="text-xs text-slate-400 ml-2 font-mono tabular-nums">
              Step <span className="text-slate-200 font-semibold">{currentStepIndex + 1}</span> of{' '}
              <span className="text-slate-200">{totalSteps}</span>
            </div>
          )}
        </div>

        {/* Animation Speed Selector */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <Gauge className="w-3.5 h-3.5 text-slate-400" />
            <span className="whitespace-nowrap">Speed:</span>
          </div>
          <div className="flex items-center gap-1 p-0.5 bg-slate-950/70 rounded-lg border border-slate-800">
            {[
              { label: '0.5x Slow', val: 0.5 },
              { label: '1.0x Normal', val: 1.0 },
              { label: '2.0x Fast', val: 2.0 },
            ].map((sp) => {
              const isActive = speed === sp.val;
              return (
                <button
                  key={sp.val}
                  onClick={() => onChangeSpeed(sp.val)}
                  className={`px-2.5 py-1 text-xs font-mono rounded-md whitespace-nowrap transition-colors ${
                    isActive
                      ? 'bg-slate-800 text-sky-400 font-semibold shadow-xs'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {sp.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Sandbox Direct Action Dispatch Buttons */}
      {isSandbox && (
        <div className="pt-3 border-t border-slate-800/60 flex flex-wrap items-center gap-2">
          <span className="text-xs text-slate-400 font-mono mr-1">Inject:</span>
          <button
            onClick={() => onDispatchCustomPacket('syn')}
            className="px-2.5 py-1.5 text-xs font-medium text-indigo-300 bg-indigo-950/50 hover:bg-indigo-900/60 border border-indigo-800/60 rounded-lg transition-colors flex items-center gap-1.5"
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Send SYN</span>
          </button>
          <button
            onClick={() => onDispatchCustomPacket('data')}
            className="px-2.5 py-1.5 text-xs font-medium text-amber-300 bg-amber-950/50 hover:bg-amber-900/60 border border-amber-800/60 rounded-lg transition-colors flex items-center gap-1.5"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Send Data (500 B)</span>
          </button>
          <button
            onClick={() => onDispatchCustomPacket('ack')}
            className="px-2.5 py-1.5 text-xs font-medium text-emerald-300 bg-emerald-950/50 hover:bg-emerald-900/60 border border-emerald-800/60 rounded-lg transition-colors flex items-center gap-1.5"
          >
            <span>Send ACK</span>
          </button>
          <button
            onClick={() => onDispatchCustomPacket('fin')}
            className="px-2.5 py-1.5 text-xs font-medium text-rose-300 bg-rose-950/50 hover:bg-rose-900/60 border border-rose-800/60 rounded-lg transition-colors flex items-center gap-1.5"
          >
            <span>Send FIN</span>
          </button>
          <button
            onClick={() => onDispatchCustomPacket('rst')}
            className="px-2.5 py-1.5 text-xs font-medium text-orange-300 bg-orange-950/50 hover:bg-orange-900/60 border border-orange-800/60 rounded-lg transition-colors flex items-center gap-1.5"
          >
            <Flame className="w-3.5 h-3.5" />
            <span>Send RST</span>
          </button>
          <button
            onClick={onToggleDropNext}
            className={`px-2.5 py-1.5 text-xs font-medium rounded-lg border transition-colors flex items-center gap-1.5 ${
              dropNextPacket
                ? 'bg-red-950/80 border-red-700 text-red-200'
                : 'bg-slate-800/60 border-slate-700 text-slate-300 hover:bg-slate-800'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
            <span>Drop Next Packet: {dropNextPacket ? 'ON' : 'OFF'}</span>
          </button>
        </div>
      )}
    </div>
  );
};
