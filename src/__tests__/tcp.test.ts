import { describe, it, expect } from 'vitest';
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

describe('TCP Finite State Machine Transitions (RFC 793)', () => {
  it('correctly transitions client through 3-way handshake', () => {
    let state = getNextTcpState('CLOSED', 'SEND_SYN');
    expect(state).toBe('SYN_SENT');

    state = getNextTcpState(state, 'RECV_SYN_ACK');
    expect(state).toBe('ESTABLISHED');
  });

  it('correctly transitions server through 3-way handshake', () => {
    let state = getNextTcpState('LISTEN', 'RECV_SYN');
    expect(state).toBe('SYN_RCVD');

    state = getNextTcpState(state, 'RECV_ACK');
    expect(state).toBe('ESTABLISHED');
  });

  it('correctly executes active close 4-way teardown', () => {
    let clientState = getNextTcpState('ESTABLISHED', 'SEND_FIN');
    expect(clientState).toBe('FIN_WAIT_1');

    clientState = getNextTcpState(clientState, 'RECV_ACK');
    expect(clientState).toBe('FIN_WAIT_2');

    clientState = getNextTcpState(clientState, 'RECV_FIN');
    expect(clientState).toBe('TIME_WAIT');

    clientState = getNextTcpState(clientState, 'TIMEOUT_2MSL');
    expect(clientState).toBe('CLOSED');
  });

  it('correctly executes passive close 4-way teardown on server', () => {
    let serverState = getNextTcpState('ESTABLISHED', 'RECV_FIN');
    expect(serverState).toBe('CLOSE_WAIT');

    serverState = getNextTcpState(serverState, 'SEND_FIN');
    expect(serverState).toBe('LAST_ACK');

    serverState = getNextTcpState(serverState, 'RECV_ACK');
    expect(serverState).toBe('CLOSED');
  });

  it('immediately transitions to CLOSED upon receiving RST', () => {
    expect(getNextTcpState('ESTABLISHED', 'RECV_RST')).toBe('CLOSED');
    expect(getNextTcpState('SYN_SENT', 'RECV_RST')).toBe('CLOSED');
    expect(getNextTcpState('SYN_RCVD', 'RECV_RST')).toBe('CLOSED');
    expect(getNextTcpState('FIN_WAIT_1', 'RECV_RST')).toBe('CLOSED');
  });
});

describe('TCP Sliding Window & Flow Control (RFC 793 / RFC 1323)', () => {
  it('calculates full usable window when no bytes are in flight', () => {
    const sndUna = 1000;
    const sndNxt = 1000;
    const sndWnd = 4096;

    const usable = calculateUsableWindow(sndUna, sndNxt, sndWnd);
    expect(usable).toBe(4096);
  });

  it('calculates remaining usable window when bytes are in flight', () => {
    const sndUna = 1000;
    const sndNxt = 2500; // 1500 bytes sent but unacknowledged
    const sndWnd = 4096;

    const usable = calculateUsableWindow(sndUna, sndNxt, sndWnd);
    expect(usable).toBe(2596);
  });

  it('returns 0 usable window when buffer capacity is exhausted (Zero Window)', () => {
    const sndUna = 1000;
    const sndNxt = 5096; // 4096 bytes in flight
    const sndWnd = 4096;

    const usable = calculateUsableWindow(sndUna, sndNxt, sndWnd);
    expect(usable).toBe(0);
  });

  it('validates sequence boundary checks for incoming segments', () => {
    const rcvNxt = 2000;
    const rcvWnd = 4000; // Window range: [2000, 5999]

    // Inside window
    expect(isSequenceInsideWindow(2000, 500, rcvNxt, rcvWnd)).toBe(true);
    expect(isSequenceInsideWindow(3500, 500, rcvNxt, rcvWnd)).toBe(true);
    expect(isSequenceInsideWindow(5500, 400, rcvNxt, rcvWnd)).toBe(true);

    // Outside window
    expect(isSequenceInsideWindow(7000, 500, rcvNxt, rcvWnd)).toBe(false);
  });

  it('handles Zero Window probe sequence validation', () => {
    const rcvNxt = 5000;
    const rcvWnd = 0; // Receiver buffer completely full

    // Zero-window probe must match rcvNxt with length 0
    expect(isSequenceInsideWindow(5000, 0, rcvNxt, rcvWnd)).toBe(true);
    // Any sequence outside rcvNxt rejected
    expect(isSequenceInsideWindow(5001, 0, rcvNxt, rcvWnd)).toBe(false);
  });
});

describe('Packet Loss Detection & Fast Retransmit (RFC 5681)', () => {
  it('correctly tracks duplicate ACKs and triggers Fast Retransmit on 3rd dup', () => {
    const expectedAck = 2501;

    // First duplicate ACK
    const dup1 = evaluateFastRetransmit(expectedAck, 2501, 0);
    expect(dup1.isDuplicate).toBe(true);
    expect(dup1.dupAckCount).toBe(1);
    expect(dup1.triggerRetransmit).toBe(false);

    // Second duplicate ACK
    const dup2 = evaluateFastRetransmit(expectedAck, 2501, 1);
    expect(dup2.isDuplicate).toBe(true);
    expect(dup2.dupAckCount).toBe(2);
    expect(dup2.triggerRetransmit).toBe(false);

    // Third duplicate ACK -> Must trigger Fast Retransmit!
    const dup3 = evaluateFastRetransmit(expectedAck, 2501, 2);
    expect(dup3.isDuplicate).toBe(true);
    expect(dup3.dupAckCount).toBe(3);
    expect(dup3.triggerRetransmit).toBe(true);
  });

  it('resets duplicate ACK counter when a fresh ACK arrives', () => {
    const freshAck = evaluateFastRetransmit(2501, 3501, 2);
    expect(freshAck.isDuplicate).toBe(false);
    expect(freshAck.dupAckCount).toBe(0);
    expect(freshAck.triggerRetransmit).toBe(false);
  });
});

describe('Isometric Projection Geometry', () => {
  it('correctly projects origin coordinate (0, 0, 0)', () => {
    const originX = 400;
    const originY = 300;
    const scale = 1.0;

    const projected = projectIsometric(0, 0, 0, originX, originY, scale);
    expect(projected.u).toBe(originX);
    expect(projected.v).toBe(originY);
  });

  it('maintains 30-degree axonometric proportion for symmetrical offsets', () => {
    const originX = 500;
    const originY = 300;
    const scale = 1.0;

    const ptRight = projectIsometric(100, 0, 0, originX, originY, scale);
    const ptLeft = projectIsometric(0, 100, 0, originX, originY, scale);

    // Horizontal distance from origin should be symmetric: (x - y) * cos(30)
    expect(ptRight.u - originX).toBeCloseTo(100 * COS30, 4);
    expect(originX - ptLeft.u).toBeCloseTo(100 * COS30, 4);

    // Vertical components should match: (x + y) * sin(30)
    expect(ptRight.v - originY).toBeCloseTo(100 * SIN30, 4);
    expect(ptLeft.v - originY).toBeCloseTo(100 * SIN30, 4);
  });

  it('elevates vertically on z axis in negative screen space', () => {
    const originX = 500;
    const originY = 300;
    const scale = 1.5;

    const ground = projectIsometric(50, 50, 0, originX, originY, scale);
    const elevated = projectIsometric(50, 50, 20, originX, originY, scale);

    // u position unchanged
    expect(elevated.u).toBe(ground.u);
    // v position elevated upward by z * scale
    expect(elevated.v).toBe(ground.v - 20 * scale);
  });
});

describe('Educational Content & Scenario Schema Integrity', () => {
  it('verifies all pre-defined scenarios have valid steps and packet metadata', () => {
    expect(SCENARIOS.length).toBeGreaterThanOrEqual(5);

    SCENARIOS.forEach((scenario) => {
      expect(scenario.id).toBeTruthy();
      expect(scenario.name).toBeTruthy();
      expect(scenario.steps.length).toBeGreaterThan(0);

      scenario.steps.forEach((step, idx) => {
        expect(step.stepIndex).toBe(idx);
        expect(step.title).toBeTruthy();
        expect(step.explanation).toBeTruthy();
        expect(step.clientState).toBeTruthy();
        expect(step.serverState).toBeTruthy();

        if (step.packetToDispatch) {
          const pkt = step.packetToDispatch;
          expect(['client', 'server']).toContain(pkt.source);
          expect(['client', 'server']).toContain(pkt.destination);
          expect(pkt.sourcePort).toBeGreaterThan(0);
          expect(pkt.destPort).toBeGreaterThan(0);
          expect(pkt.seqNumber).toBeGreaterThanOrEqual(0);
          expect(pkt.checksum).toMatch(/^0x/);
        }
      });
    });
  });

  it('verifies all component explanations include required learning fields', () => {
    const requiredKeys = [
      'syn-packet',
      'syn-ack-packet',
      'ack-packet',
      'data-packet',
      'fin-packet',
      'rst-packet',
      'retransmit-packet',
      'client-host',
      'server-host',
      'router-node',
      'sliding-window',
    ];

    requiredKeys.forEach((key) => {
      const info = COMPONENT_EXPLANATIONS[key];
      expect(info, `Missing explanation for ${key}`).toBeDefined();
      expect(info.title.length).toBeGreaterThan(3);
      expect(info.role.length).toBeGreaterThan(10);
      expect(info.significance.length).toBeGreaterThan(10);
      expect(info.analogy.length).toBeGreaterThan(10);
      expect(info.category).toBeTruthy();
    });
  });
});
