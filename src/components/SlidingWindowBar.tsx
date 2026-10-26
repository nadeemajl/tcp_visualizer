import React from 'react';
import { HostMetrics } from '../types/tcp';
import { COMPONENT_EXPLANATIONS, ComponentInfo } from '../data/componentExplanations';

interface SlidingWindowBarProps {
  metrics: HostMetrics;
  onSelectComponent: (info: ComponentInfo) => void;
}

export const SlidingWindowBar: React.FC<SlidingWindowBarProps> = ({
  metrics,
  onSelectComponent,
}) => {
  // Let's generate a continuous visual strip of 16 segment blocks of 500 bytes each
  // Base offset starting at 1000
  const segmentSize = 500;
  const startOffset = 1000;
  const totalBlocks = 12;

  const blocks = Array.from({ length: totalBlocks }, (_, i) => {
    const seq = startOffset + i * segmentSize;
    const endSeq = seq + segmentSize;

    // Check status relative to SND.UNA, SND.NXT, and SND.WND
    const isAcked = endSeq <= metrics.clientSndUna;
    const isInFlight = seq >= metrics.clientSndUna && endSeq <= metrics.clientSndNxt;
    const isInsideWindow =
      seq >= metrics.clientSndNxt &&
      endSeq <= metrics.clientSndUna + metrics.clientSndWnd;

    let status: 'acked' | 'inflight' | 'usable' | 'outside' = 'outside';
    if (isAcked) status = 'acked';
    else if (isInFlight) status = 'inflight';
    else if (isInsideWindow) status = 'usable';

    return {
      index: i,
      seq,
      endSeq,
      status,
    };
  });

  return (
    <div className="bg-slate-900/80 rounded-xl border border-slate-800 p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => onSelectComponent(COMPONENT_EXPLANATIONS['sliding-window'])}
            className="text-xs font-semibold text-slate-200 hover:text-sky-400 transition-colors flex items-center gap-1.5"
          >
            <span>Sender Sliding Window Buffer</span>
            <span className="text-[10px] text-slate-400 font-mono">(RFC 793)</span>
          </button>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3 text-[11px] text-slate-400">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-emerald-700/80 border border-emerald-500/80 inline-block" />
            <span>Acked</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-indigo-700/80 border border-indigo-500/80 inline-block" />
            <span>In Flight</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-slate-800 border border-slate-600 inline-block" />
            <span>Usable Window</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-slate-950 border border-slate-800/80 inline-block" />
            <span>Outside Window</span>
          </div>
        </div>
      </div>

      {/* Visual Block Sequence */}
      <div className="grid grid-cols-6 sm:grid-cols-12 gap-1.5 pt-1">
        {blocks.map((b) => {
          let bgClass = 'bg-slate-950/80 border-slate-800 text-slate-600';
          let label = 'Closed';

          if (b.status === 'acked') {
            bgClass = 'bg-emerald-950/60 border-emerald-600/70 text-emerald-300';
            label = 'Acked';
          } else if (b.status === 'inflight') {
            bgClass = 'bg-indigo-950/70 border-indigo-500/80 text-indigo-300 font-semibold';
            label = 'In Flight';
          } else if (b.status === 'usable') {
            bgClass = 'bg-slate-800/80 border-slate-600 text-slate-300';
            label = 'Available';
          }

          return (
            <div
              key={b.index}
              className={`p-2 rounded-lg border text-center transition-colors flex flex-col justify-between h-16 ${bgClass}`}
              title={`Bytes ${b.seq} - ${b.endSeq} (${label})`}
            >
              <span className="text-[10px] font-mono leading-none">{b.seq}</span>
              <span className="text-[9px] font-medium leading-none truncate">{label}</span>
              <span className="text-[9px] font-mono text-slate-400 leading-none">500 B</span>
            </div>
          );
        })}
      </div>

      {/* Sliding Window Pointers */}
      <div className="flex flex-wrap items-center justify-between text-xs font-mono text-slate-400 pt-2 border-t border-slate-800/60">
        <div>
          <span className="text-slate-500">SND.UNA (Oldest Unacked):</span>{' '}
          <span className="text-slate-200 tabular-nums font-semibold">{metrics.clientSndUna}</span>
        </div>
        <div>
          <span className="text-slate-500">SND.NXT (Next Seq):</span>{' '}
          <span className="text-slate-200 tabular-nums font-semibold">{metrics.clientSndNxt}</span>
        </div>
        <div>
          <span className="text-slate-500">Advertised Window (rwnd):</span>{' '}
          <span className="text-emerald-400 tabular-nums font-semibold">
            {metrics.serverRcvWnd} Bytes
          </span>
        </div>
      </div>
    </div>
  );
};
