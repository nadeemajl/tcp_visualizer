import React, { useState } from 'react';
import { TcpPacket } from '../types/tcp';
import { HelpCircle } from 'lucide-react';

interface PacketHeaderInspectorProps {
  packet?: TcpPacket | null;
}

interface HeaderFieldDesc {
  name: string;
  bits: string;
  offset: string;
  description: string;
  rfc: string;
}

const FIELD_EXPLANATIONS: Record<string, HeaderFieldDesc> = {
  srcPort: {
    name: 'Source Port',
    bits: '16 bits',
    offset: 'Bits 0 - 15',
    description: 'The port number on the sender machine (e.g. dynamic ephemeral port 52418 for client, or 80/443 for server). Identifies the sending application.',
    rfc: 'RFC 793 Section 3.1',
  },
  dstPort: {
    name: 'Destination Port',
    bits: '16 bits',
    offset: 'Bits 16 - 31',
    description: 'The target port on the destination machine (e.g. port 80 for HTTP, 443 for HTTPS). Identifies which receiving socket handles the stream.',
    rfc: 'RFC 793 Section 3.1',
  },
  seq: {
    name: 'Sequence Number',
    bits: '32 bits',
    offset: 'Bits 32 - 63',
    description: 'Identifies the byte offset of the first data byte in this segment. If SYN is present, this is the Initial Sequence Number (ISN). Prevents segment reordering.',
    rfc: 'RFC 793 Section 3.1',
  },
  ack: {
    name: 'Acknowledgment Number',
    bits: '32 bits',
    offset: 'Bits 64 - 95',
    description: 'If the ACK flag is set, this specifies the next sequence number the receiver expects. TCP acknowledgments are cumulative.',
    rfc: 'RFC 793 Section 3.1',
  },
  offset: {
    name: 'Data Offset (Header Length)',
    bits: '4 bits',
    offset: 'Bits 96 - 99',
    description: 'The number of 32-bit words in the TCP Header. Minimum value is 5 (20 bytes when no options are present). Points to where the payload begins.',
    rfc: 'RFC 793 Section 3.1',
  },
  flags: {
    name: 'Control Flags (URG, ACK, PSH, RST, SYN, FIN)',
    bits: '9 bits',
    offset: 'Bits 103 - 111',
    description: 'Single-bit flags that control connection management: SYN (synchronize), ACK (acknowledge), FIN (graceful close), RST (abort connection), PSH (push data to application immediately), URG (urgent pointer valid).',
    rfc: 'RFC 793 / RFC 3168',
  },
  window: {
    name: 'Window Size (rwnd)',
    bits: '16 bits',
    offset: 'Bits 112 - 127',
    description: 'The number of data bytes (octets) beginning with the one indicated in the acknowledgment field which the sender of this segment is willing to accept. Key to flow control.',
    rfc: 'RFC 793 Section 3.1',
  },
  checksum: {
    name: 'Checksum',
    bits: '16 bits',
    offset: 'Bits 128 - 143',
    description: '16-bit one\'s complement checksum calculated over the TCP header, payload, and an IP pseudo-header. Ensures bits were not flipped in transit.',
    rfc: 'RFC 793 Section 3.1',
  },
  urgent: {
    name: 'Urgent Pointer',
    bits: '16 bits',
    offset: 'Bits 144 - 159',
    description: 'Points to the sequence number of the byte following urgent data. Only meaningful if the URG flag is set.',
    rfc: 'RFC 793 Section 3.1',
  },
};

export const PacketHeaderInspector: React.FC<PacketHeaderInspectorProps> = ({ packet }) => {
  const [selectedField, setSelectedField] = useState<string>('flags');

  const activeField = FIELD_EXPLANATIONS[selectedField];

  // Default values if no active packet is selected
  const srcPort = packet?.sourcePort || 52418;
  const dstPort = packet?.destPort || 80;
  const seq = packet?.seqNumber ?? 1000;
  const ack = packet?.ackNumber ?? 5001;
  const win = packet?.windowSize ?? 64240;
  const checksum = packet?.checksum || '0x8F3A';
  const flags = packet?.flags || { syn: true, ack: false };

  return (
    <div className="bg-slate-900/80 rounded-xl border border-slate-800 p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xs font-semibold text-slate-200">
            RFC 793 TCP Segment Header (32-Bit Word Architecture)
          </h3>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Click any 32-bit field below to inspect its bit layout and protocol mechanics
          </p>
        </div>
      </div>

      {/* 32-Bit Word Header Layout Grid */}
      <div className="space-y-1.5 font-mono text-xs">
        {/* Bit Ruler */}
        <div className="flex text-[10px] text-slate-500 justify-between px-1 border-b border-slate-800 pb-1">
          <span>Bit 0</span>
          <span>Bit 15</span>
          <span>Bit 16</span>
          <span>Bit 31</span>
        </div>

        {/* Row 1: Source Port & Destination Port */}
        <div className="grid grid-cols-2 gap-1.5">
          <button
            onClick={() => setSelectedField('srcPort')}
            className={`p-2 rounded border text-left transition-colors ${
              selectedField === 'srcPort'
                ? 'bg-slate-800 border-sky-500 text-sky-300'
                : 'bg-slate-950/60 border-slate-800 hover:bg-slate-800/40 text-slate-300'
            }`}
          >
            <span className="text-[10px] text-slate-500 block">SOURCE PORT (16 bits)</span>
            <span className="font-semibold">{srcPort}</span>
          </button>
          <button
            onClick={() => setSelectedField('dstPort')}
            className={`p-2 rounded border text-left transition-colors ${
              selectedField === 'dstPort'
                ? 'bg-slate-800 border-sky-500 text-sky-300'
                : 'bg-slate-950/60 border-slate-800 hover:bg-slate-800/40 text-slate-300'
            }`}
          >
            <span className="text-[10px] text-slate-500 block">DESTINATION PORT (16 bits)</span>
            <span className="font-semibold">{dstPort}</span>
          </button>
        </div>

        {/* Row 2: Sequence Number */}
        <button
          onClick={() => setSelectedField('seq')}
          className={`w-full p-2 rounded border text-left transition-colors ${
            selectedField === 'seq'
              ? 'bg-slate-800 border-sky-500 text-sky-300'
              : 'bg-slate-950/60 border-slate-800 hover:bg-slate-800/40 text-slate-300'
          }`}
        >
          <span className="text-[10px] text-slate-500 block">SEQUENCE NUMBER (32 bits)</span>
          <span className="font-semibold">{seq}</span>
        </button>

        {/* Row 3: Acknowledgment Number */}
        <button
          onClick={() => setSelectedField('ack')}
          className={`w-full p-2 rounded border text-left transition-colors ${
            selectedField === 'ack'
              ? 'bg-slate-800 border-sky-500 text-sky-300'
              : 'bg-slate-950/60 border-slate-800 hover:bg-slate-800/40 text-slate-300'
          }`}
        >
          <span className="text-[10px] text-slate-500 block">ACKNOWLEDGMENT NUMBER (32 bits)</span>
          <span className="font-semibold">{ack}</span>
        </button>

        {/* Row 4: Data Offset (4b) | Reserved (3b) | Flags (9b) | Window Size (16b) */}
        <div className="grid grid-cols-12 gap-1.5">
          <button
            onClick={() => setSelectedField('offset')}
            className={`col-span-3 p-2 rounded border text-left transition-colors ${
              selectedField === 'offset'
                ? 'bg-slate-800 border-sky-500 text-sky-300'
                : 'bg-slate-950/60 border-slate-800 hover:bg-slate-800/40 text-slate-300'
            }`}
          >
            <span className="text-[10px] text-slate-500 block">OFFSET (4b)</span>
            <span className="font-semibold">5 (20B)</span>
          </button>

          <button
            onClick={() => setSelectedField('flags')}
            className={`col-span-4 p-2 rounded border text-left transition-colors ${
              selectedField === 'flags'
                ? 'bg-slate-800 border-sky-500 text-sky-300'
                : 'bg-slate-950/60 border-slate-800 hover:bg-slate-800/40 text-slate-300'
            }`}
          >
            <span className="text-[10px] text-slate-500 block">FLAGS (9 bits)</span>
            <span className="font-semibold truncate block">
              {flags.syn ? 'SYN ' : ''}
              {flags.ack ? 'ACK ' : ''}
              {flags.fin ? 'FIN ' : ''}
              {flags.psh ? 'PSH ' : ''}
              {flags.rst ? 'RST ' : ''}
              {!flags.syn && !flags.ack && !flags.fin && !flags.psh && !flags.rst ? 'None' : ''}
            </span>
          </button>

          <button
            onClick={() => setSelectedField('window')}
            className={`col-span-5 p-2 rounded border text-left transition-colors ${
              selectedField === 'window'
                ? 'bg-slate-800 border-sky-500 text-sky-300'
                : 'bg-slate-950/60 border-slate-800 hover:bg-slate-800/40 text-slate-300'
            }`}
          >
            <span className="text-[10px] text-slate-500 block">WINDOW SIZE (16b)</span>
            <span className="font-semibold">{win}</span>
          </button>
        </div>

        {/* Row 5: Checksum | Urgent Pointer */}
        <div className="grid grid-cols-2 gap-1.5">
          <button
            onClick={() => setSelectedField('checksum')}
            className={`p-2 rounded border text-left transition-colors ${
              selectedField === 'checksum'
                ? 'bg-slate-800 border-sky-500 text-sky-300'
                : 'bg-slate-950/60 border-slate-800 hover:bg-slate-800/40 text-slate-300'
            }`}
          >
            <span className="text-[10px] text-slate-500 block">CHECKSUM (16 bits)</span>
            <span className="font-semibold">{checksum}</span>
          </button>
          <button
            onClick={() => setSelectedField('urgent')}
            className={`p-2 rounded border text-left transition-colors ${
              selectedField === 'urgent'
                ? 'bg-slate-800 border-sky-500 text-sky-300'
                : 'bg-slate-950/60 border-slate-800 hover:bg-slate-800/40 text-slate-300'
            }`}
          >
            <span className="text-[10px] text-slate-500 block">URGENT POINTER (16b)</span>
            <span className="font-semibold">0</span>
          </button>
        </div>
      </div>

      {/* Field Educational Explanation Card */}
      {activeField && (
        <div className="bg-slate-950/60 rounded-lg p-3 border border-slate-800/80 text-xs space-y-1.5">
          <div className="flex items-center justify-between text-slate-300 font-semibold">
            <span className="flex items-center gap-1.5">
              <HelpCircle className="w-3.5 h-3.5 text-sky-400" />
              {activeField.name} ({activeField.bits})
            </span>
            <span className="text-[11px] font-mono text-slate-400">{activeField.offset}</span>
          </div>
          <p className="text-slate-300 leading-relaxed text-[11px]">{activeField.description}</p>
          <div className="text-[10px] font-mono text-slate-500">{activeField.rfc}</div>
        </div>
      )}
    </div>
  );
};
