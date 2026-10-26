export type TcpState =
  | 'CLOSED'
  | 'LISTEN'
  | 'SYN_SENT'
  | 'SYN_RCVD'
  | 'ESTABLISHED'
  | 'FIN_WAIT_1'
  | 'FIN_WAIT_2'
  | 'CLOSE_WAIT'
  | 'CLOSING'
  | 'LAST_ACK'
  | 'TIME_WAIT';

export interface TcpFlags {
  syn?: boolean;
  ack?: boolean;
  fin?: boolean;
  rst?: boolean;
  psh?: boolean;
  urg?: boolean;
}

export interface TcpPacket {
  id: string;
  source: 'client' | 'server';
  destination: 'client' | 'server';
  sourcePort: number;
  destPort: number;
  seqNumber: number;
  ackNumber: number;
  length: number; // payload bytes
  windowSize: number;
  flags: TcpFlags;
  checksum: string;
  dataSummary?: string;
  // Simulation animation state
  progress: number; // 0 (origin) to 1 (target)
  speed: number;
  dropped?: boolean;
  dropProgress?: number; // point where packet drops (e.g. 0.5 at router)
  dropReason?: string;
  isRetransmission?: boolean;
  colorTheme?: string;
  timestamp: number;
}

export type ScenarioId =
  | 'handshake'
  | 'data-transfer'
  | 'packet-loss'
  | 'flow-control'
  | 'teardown'
  | 'sandbox';

export interface ScenarioStep {
  stepIndex: number;
  title: string;
  description: string;
  clientState: TcpState;
  serverState: TcpState;
  explanation: string;
  actionSummary: string;
  // Packets dispatched or triggered at this step
  packetToDispatch?: Omit<TcpPacket, 'id' | 'progress' | 'timestamp'>;
  clientWindow?: {
    sndUna: number; // oldest unacknowledged seq
    sndNxt: number; // next seq to be sent
    sndWnd: number; // send window size
  };
  serverWindow?: {
    rcvNxt: number; // next expected seq
    rcvWnd: number; // receive window size
  };
}

export interface ScenarioDefinition {
  id: ScenarioId;
  name: string;
  badge: string;
  summary: string;
  steps: ScenarioStep[];
}

export interface HostMetrics {
  clientState: TcpState;
  serverState: TcpState;
  rttMs: number;
  cwndMss: number;
  ssthreshMss: number;
  clientSndUna: number;
  clientSndNxt: number;
  clientSndWnd: number;
  serverRcvNxt: number;
  serverRcvWnd: number;
  bytesSent: number;
  bytesAcked: number;
  retransmissions: number;
}
