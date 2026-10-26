import React from 'react';
import { ComponentInfo } from '../data/componentExplanations';
import { TcpPacket } from '../types/tcp';
import { X, BookOpen, Sparkles, Layers, ShieldCheck, ArrowRight, Activity } from 'lucide-react';

interface ComponentInspectorPanelProps {
  info: ComponentInfo | null;
  packetContext?: TcpPacket | null;
  onClose: () => void;
  onDispatchCustomPacket?: (type: string) => void;
}

export const ComponentInspectorPanel: React.FC<ComponentInspectorPanelProps> = ({
  info,
  packetContext,
  onClose,
  onDispatchCustomPacket,
}) => {
  if (!info) return null;

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-slate-900/95 backdrop-blur-xl border-l border-slate-800 shadow-2xl flex flex-col transform transition-transform duration-200 ease-out">
      {/* Panel Header */}
      <div className="p-6 border-b border-slate-800 flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[11px] font-mono uppercase tracking-wider text-sky-400">
              {info.category}
            </span>
            {info.rfcReference && (
              <>
                <span className="text-slate-600">·</span>
                <span className="text-[11px] font-mono text-slate-400">{info.rfcReference}</span>
              </>
            )}
          </div>
          <h2 className="text-xl font-bold text-slate-100">{info.title}</h2>
          <p className="text-xs text-slate-400 mt-1">{info.subtitle}</p>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          title="Close inspector"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Panel Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Live Packet Telemetry if inspecting an actual moving packet */}
        {packetContext && (
          <div className="bg-slate-950/80 rounded-xl p-4 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-sky-400" />
                Active Packet Attributes
              </span>
              <span className="text-[10px] font-mono text-slate-500">ID: {packetContext.id}</span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-slate-900/90 p-2.5 rounded-lg border border-slate-800/80">
                <span className="text-[10px] text-slate-400 block font-mono">SEQ NUMBER</span>
                <span className="font-mono font-semibold text-slate-200">
                  {packetContext.seqNumber}
                </span>
              </div>
              <div className="bg-slate-900/90 p-2.5 rounded-lg border border-slate-800/80">
                <span className="text-[10px] text-slate-400 block font-mono">ACK NUMBER</span>
                <span className="font-mono font-semibold text-slate-200">
                  {packetContext.ackNumber}
                </span>
              </div>
              <div className="bg-slate-900/90 p-2.5 rounded-lg border border-slate-800/80">
                <span className="text-[10px] text-slate-400 block font-mono">PAYLOAD LEN</span>
                <span className="font-mono font-semibold text-slate-200">
                  {packetContext.length} Bytes
                </span>
              </div>
              <div className="bg-slate-900/90 p-2.5 rounded-lg border border-slate-800/80">
                <span className="text-[10px] text-slate-400 block font-mono">WINDOW SIZE</span>
                <span className="font-mono font-semibold text-slate-200">
                  {packetContext.windowSize} Bytes
                </span>
              </div>
            </div>

            {/* TCP Flags Bitfield */}
            <div>
              <span className="text-[10px] text-slate-400 block font-mono mb-1.5">ACTIVE FLAGS</span>
              <div className="flex flex-wrap gap-1.5">
                {(['syn', 'ack', 'fin', 'rst', 'psh', 'urg'] as const).map((flag) => {
                  const isActive = !!packetContext.flags[flag];
                  return (
                    <span
                      key={flag}
                      className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                        isActive
                          ? 'bg-sky-950/80 border-sky-600/80 text-sky-300 font-semibold'
                          : 'bg-slate-900/60 border-slate-800 text-slate-600'
                      }`}
                    >
                      {flag.toUpperCase()}: {isActive ? '1' : '0'}
                    </span>
                  );
                })}
              </div>
            </div>

            {packetContext.dataSummary && (
              <div className="text-[11px] text-slate-300 bg-slate-900/70 p-2 rounded border border-slate-800/80">
                <span className="text-slate-500 font-mono text-[10px] block">PAYLOAD PREVIEW</span>
                {packetContext.dataSummary}
              </div>
            )}
          </div>
        )}

        {/* 1. What does it do? (Role) */}
        <section className="space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-300 uppercase tracking-wider">
            <BookOpen className="w-3.5 h-3.5 text-sky-400" />
            <span>Role in TCP</span>
          </div>
          <p className="text-sm text-slate-300 leading-relaxed bg-slate-950/40 p-3.5 rounded-xl border border-slate-800/60">
            {info.role}
          </p>
        </section>

        {/* 2. Why is it significant? */}
        <section className="space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-300 uppercase tracking-wider">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Why It Matters</span>
          </div>
          <p className="text-sm text-slate-300 leading-relaxed bg-slate-950/40 p-3.5 rounded-xl border border-slate-800/60">
            {info.significance}
          </p>
        </section>

        {/* 3. Intuitive Analogy */}
        <section className="space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-300 uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Everyday Analogy</span>
          </div>
          <div className="text-sm text-slate-300 italic bg-amber-950/20 p-3.5 rounded-xl border border-amber-900/30">
            "{info.analogy}"
          </div>
        </section>

        {/* 4. Technical Header Fields */}
        {info.keyFields && info.keyFields.length > 0 && (
          <section className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-300 uppercase tracking-wider">
              <Layers className="w-3.5 h-3.5 text-indigo-400" />
              <span>Key Header Fields</span>
            </div>
            <div className="space-y-2">
              {info.keyFields.map((field, idx) => (
                <div
                  key={idx}
                  className="bg-slate-950/60 p-3 rounded-lg border border-slate-800/80 text-xs flex flex-col gap-0.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-200">{field.label}</span>
                    <span className="font-mono text-sky-400 text-[11px]">{field.value}</span>
                  </div>
                  <span className="text-slate-400 text-[11px] mt-0.5">{field.description}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* 5. Common Edge Cases / Pitfalls */}
        {info.commonPitfalls && (
          <section className="space-y-2">
            <div className="text-xs font-semibold text-amber-400 uppercase tracking-wider">
              Common Real-World Pitfall
            </div>
            <p className="text-xs text-slate-400 bg-slate-950/40 p-3 rounded-lg border border-slate-800">
              {info.commonPitfalls}
            </p>
          </section>
        )}
      </div>

      {/* Panel Footer */}
      <div className="p-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between gap-3">
        {onDispatchCustomPacket && (
          <button
            onClick={() => onDispatchCustomPacket(info.id)}
            className="flex-1 py-2 px-3 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors flex items-center justify-center gap-1.5"
          >
            <span>Simulate in Sandbox</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )}
        <button
          onClick={onClose}
          className="py-2 px-4 text-xs font-medium text-slate-400 hover:text-white bg-transparent hover:bg-slate-800 rounded-lg transition-colors"
        >
          Close
        </button>
      </div>
    </div>
  );
};
