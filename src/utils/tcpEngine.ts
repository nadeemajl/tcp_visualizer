import { TcpState, TcpFlags, TcpPacket } from '../types/tcp';

/**
 * Validates TCP State transitions according to RFC 793 Finite State Machine.
 */
export function getNextTcpState(
  currentState: TcpState,
  event: 'SEND_SYN' | 'RECV_SYN' | 'RECV_SYN_ACK' | 'SEND_ACK' | 'RECV_ACK' | 'SEND_FIN' | 'RECV_FIN' | 'TIMEOUT_2MSL' | 'RECV_RST'
): TcpState {
  if (event === 'RECV_RST') return 'CLOSED';

  switch (currentState) {
    case 'CLOSED':
      if (event === 'SEND_SYN') return 'SYN_SENT';
      return 'CLOSED';

    case 'LISTEN':
      if (event === 'RECV_SYN') return 'SYN_RCVD';
      return 'LISTEN';

    case 'SYN_SENT':
      if (event === 'RECV_SYN_ACK') return 'ESTABLISHED';
      return 'SYN_SENT';

    case 'SYN_RCVD':
      if (event === 'RECV_ACK') return 'ESTABLISHED';
      return 'SYN_RCVD';

    case 'ESTABLISHED':
      if (event === 'SEND_FIN') return 'FIN_WAIT_1';
      if (event === 'RECV_FIN') return 'CLOSE_WAIT';
      return 'ESTABLISHED';

    case 'FIN_WAIT_1':
      if (event === 'RECV_ACK') return 'FIN_WAIT_2';
      return 'FIN_WAIT_1';

    case 'FIN_WAIT_2':
      if (event === 'RECV_FIN') return 'TIME_WAIT';
      return 'FIN_WAIT_2';

    case 'CLOSE_WAIT':
      if (event === 'SEND_FIN') return 'LAST_ACK';
      return 'CLOSE_WAIT';

    case 'LAST_ACK':
      if (event === 'RECV_ACK') return 'CLOSED';
      return 'LAST_ACK';

    case 'TIME_WAIT':
      if (event === 'TIMEOUT_2MSL') return 'CLOSED';
      return 'TIME_WAIT';

    default:
      return currentState;
  }
}

/**
 * Calculates how many bytes can be transmitted immediately based on
 * sender sliding window pointers.
 */
export function calculateUsableWindow(sndUna: number, sndNxt: number, sndWnd: number): number {
  const windowRightEdge = sndUna + sndWnd;
  return Math.max(0, windowRightEdge - sndNxt);
}

/**
 * Checks whether an incoming segment's sequence number falls inside
 * the receiver's acceptable window.
 */
export function isSequenceInsideWindow(
  seq: number,
  len: number,
  rcvNxt: number,
  rcvWnd: number
): boolean {
  if (rcvWnd === 0) {
    return len === 0 && seq === rcvNxt;
  }
  const seqEnd = seq + Math.max(1, len) - 1;
  const winStart = rcvNxt;
  const winEnd = rcvNxt + rcvWnd - 1;

  return (seq >= winStart && seq <= winEnd) || (seqEnd >= winStart && seqEnd <= winEnd);
}

/**
 * Evaluates duplicate ACKs for Fast Retransmit detection (RFC 5681).
 * Standard TCP triggers Fast Retransmit on exactly 3 duplicate ACKs.
 */
export function evaluateFastRetransmit(
  lastAckNumber: number,
  incomingAckNumber: number,
  currentDupAckCount: number
): { isDuplicate: boolean; dupAckCount: number; triggerRetransmit: boolean } {
  if (incomingAckNumber === lastAckNumber) {
    const dupAckCount = currentDupAckCount + 1;
    return {
      isDuplicate: true,
      dupAckCount,
      triggerRetransmit: dupAckCount === 3,
    };
  }

  return {
    isDuplicate: false,
    dupAckCount: 0,
    triggerRetransmit: false,
  };
}

/**
 * Isometric 3D to 2D screen coordinate projection.
 */
export const COS30 = Math.cos(Math.PI / 6); // ~0.8660254
export const SIN30 = Math.sin(Math.PI / 6); // 0.5

export function projectIsometric(
  x: number,
  y: number,
  z: number,
  originX: number,
  originY: number,
  scale: number
): { u: number; v: number } {
  const u = originX + (x - y) * COS30 * scale;
  const v = originY + (x + y) * SIN30 * scale - z * scale;
  return { u, v };
}
