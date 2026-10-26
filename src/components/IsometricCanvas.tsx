import React, { useRef, useState, useEffect } from 'react';
import { TcpPacket, HostMetrics, TcpState } from '../types/tcp';
import { COMPONENT_EXPLANATIONS, ComponentInfo } from '../data/componentExplanations';
import { ZoomIn, ZoomOut, RotateCcw, Eye, Info } from 'lucide-react';

interface IsometricCanvasProps {
  activePackets: TcpPacket[];
  metrics: HostMetrics;
  onSelectComponent: (info: ComponentInfo, packetContext?: TcpPacket) => void;
  selectedComponentId?: string | null;
  speedMultiplier: number;
}

// Isometric projection constants: 30-degree isometric axonometry
const COS30 = Math.cos(Math.PI / 6); // ~0.866025
const SIN30 = Math.sin(Math.PI / 6); // 0.5

function projectIso(x: number, y: number, z: number, originX: number, originY: number, scale: number) {
  const u = originX + (x - y) * COS30 * scale;
  const v = originY + (x + y) * SIN30 * scale - z * scale;
  return { u, v };
}

export const IsometricCanvas: React.FC<IsometricCanvasProps> = ({
  activePackets,
  metrics,
  onSelectComponent,
  selectedComponentId,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Zoom & Pan transformation state
  const [zoom, setZoom] = useState<number>(1.0);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  // Dimensions of SVG canvas
  const [dimensions, setDimensions] = useState({ width: 900, height: 520 });

  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.clientWidth || 900,
          height: containerRef.current.clientHeight || 520,
        });
      }
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  // Mouse wheel zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
    setZoom((prev) => Math.min(Math.max(prev * zoomFactor, 0.5), 2.5));
  };

  // Mouse pan handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleResetView = () => {
    setZoom(1.0);
    setPan({ x: 0, y: 0 });
  };

  // Coordinate setup for the 3D grid
  // Grid coordinates:
  // Client Pedestal: center around (x: -160, y: 0)
  // Router Pedestal: center around (x: 0, y: 0)
  // Server Pedestal: center around (x: 160, y: 0)
  const baseScale = Math.min(dimensions.width / 880, dimensions.height / 520) * zoom;
  const originX = dimensions.width / 2 + pan.x;
  const originY = dimensions.height / 2 + 10 + pan.y;

  const toScreen = (x: number, y: number, z: number = 0) => {
    return projectIso(x, y, z, originX, originY, baseScale);
  };

  // Helper to construct SVG path for an isometric prism
  const renderPrism = (
    x: number,
    y: number,
    z: number,
    w: number,
    d: number,
    h: number,
    colors: { top: string; left: string; right: string; border?: string },
    interactiveId?: string,
    onClick?: () => void
  ) => {
    const isHovered = hoveredNode === interactiveId;
    const isSelected = selectedComponentId === interactiveId;

    // 8 vertices in 3D space
    const p000 = toScreen(x, y, z);
    const p100 = toScreen(x + w, y, z);
    const p110 = toScreen(x + w, y + d, z);
    const p010 = toScreen(x, y + d, z);

    const p001 = toScreen(x, y, z + h);
    const p101 = toScreen(x + w, y, z + h);
    const p111 = toScreen(x + w, y + d, z + h);
    const p011 = toScreen(x, y + d, z + h);

    const topPath = `M ${p001.u} ${p001.v} L ${p101.u} ${p101.v} L ${p111.u} ${p111.v} L ${p011.u} ${p011.v} Z`;
    const rightPath = `M ${p100.u} ${p100.v} L ${p110.u} ${p110.v} L ${p111.u} ${p111.v} L ${p101.u} ${p101.v} Z`;
    const leftPath = `M ${p010.u} ${p010.v} L ${p110.u} ${p110.v} L ${p111.u} ${p111.v} L ${p011.u} ${p011.v} Z`;

    const strokeColor = isSelected
      ? '#60a5fa'
      : isHovered
      ? '#94a3b8'
      : colors.border || 'rgba(148, 163, 184, 0.15)';

    const strokeWidth = isSelected ? 2 : isHovered ? 1.5 : 1;

    return (
      <g
        className={interactiveId ? 'cursor-pointer transition-opacity duration-150' : ''}
        onMouseEnter={() => interactiveId && setHoveredNode(interactiveId)}
        onMouseLeave={() => interactiveId && setHoveredNode(null)}
        onClick={onClick}
      >
        {/* Left Face (darker shade) */}
        <path d={leftPath} fill={colors.left} stroke={strokeColor} strokeWidth={strokeWidth} />
        {/* Right Face (mid shade) */}
        <path d={rightPath} fill={colors.right} stroke={strokeColor} strokeWidth={strokeWidth} />
        {/* Top Face (light shade) */}
        <path d={topPath} fill={colors.top} stroke={strokeColor} strokeWidth={strokeWidth} />
      </g>
    );
  };

  // Helper to calculate in-flight packet coordinates along the forward or reverse conduits
  const getPacketScreenPos = (packet: TcpPacket) => {
    // Forward path: Client (-150, -25) -> Router (0, -25) -> Server (150, -25)
    // Reverse path: Server (150, 25) -> Router (0, 25) -> Client (-150, 25)
    const p = Math.max(0, Math.min(1, packet.progress));
    const isForward = packet.source === 'client';

    let x = 0;
    const y = isForward ? -28 : 28;
    const z = 18; // hover height above ground

    if (isForward) {
      // Start -150 -> End 150
      x = -150 + p * 300;
    } else {
      // Start 150 -> End -150
      x = 150 - p * 300;
    }

    return toScreen(x, y, z);
  };

  const getPacketShadowPos = (packet: TcpPacket) => {
    const p = Math.max(0, Math.min(1, packet.progress));
    const isForward = packet.source === 'client';
    const x = isForward ? -150 + p * 300 : 150 - p * 300;
    const y = isForward ? -28 : 28;
    return toScreen(x, y, 0);
  };

  // State color mapping
  const getStateColor = (state: TcpState) => {
    switch (state) {
      case 'ESTABLISHED':
        return '#10b981'; // muted emerald
      case 'SYN_SENT':
      case 'SYN_RCVD':
        return '#6366f1'; // muted indigo
      case 'FIN_WAIT_1':
      case 'FIN_WAIT_2':
      case 'CLOSE_WAIT':
      case 'LAST_ACK':
      case 'TIME_WAIT':
        return '#f43f5e'; // muted rose
      case 'LISTEN':
        return '#0ea5e9'; // muted sky
      case 'CLOSED':
      default:
        return '#64748b'; // muted slate
    }
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full h-[540px] bg-slate-950 rounded-xl border border-slate-800 overflow-hidden select-none"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onWheel={handleWheel}
      style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
    >
      {/* Subtle isometric grid overlay */}
      <svg className="w-full h-full pointer-events-auto">
        <defs>
          <radialGradient id="haloGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.12" />
            <stop offset="100%" stopColor="#38bdf8" stopOpacity="0" />
          </radialGradient>
          <filter id="packetGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Isometric Ground Grid Lines */}
        <g opacity="0.35">
          {[-240, -180, -120, -60, 0, 60, 120, 180, 240].map((gridX) => {
            const start = toScreen(gridX, -100, 0);
            const end = toScreen(gridX, 100, 0);
            return (
              <line
                key={`gx-${gridX}`}
                x1={start.u}
                y1={start.v}
                x2={end.u}
                y2={end.v}
                stroke="#334155"
                strokeWidth="0.8"
                strokeDasharray="3 3"
              />
            );
          })}
          {[-100, -50, 0, 50, 100].map((gridY) => {
            const start = toScreen(-250, gridY, 0);
            const end = toScreen(250, gridY, 0);
            return (
              <line
                key={`gy-${gridY}`}
                x1={start.u}
                y1={start.v}
                x2={end.u}
                y2={end.v}
                stroke="#334155"
                strokeWidth="0.8"
                strokeDasharray="3 3"
              />
            );
          })}
        </g>

        {/* Ambient base shadows under platforms */}
        {(() => {
          const clientBase = toScreen(-150, 0, 0);
          const routerBase = toScreen(0, 0, 0);
          const serverBase = toScreen(150, 0, 0);
          return (
            <g opacity="0.5">
              <ellipse cx={clientBase.u} cy={clientBase.v} rx={110 * zoom} ry={55 * zoom} fill="#090d16" />
              <ellipse cx={routerBase.u} cy={routerBase.v} rx={70 * zoom} ry={35 * zoom} fill="#090d16" />
              <ellipse cx={serverBase.u} cy={serverBase.v} rx={110 * zoom} ry={55 * zoom} fill="#090d16" />
            </g>
          );
        })()}

        {/* Physical Isometric Conduits (Transmission Pipelines) */}
        {/* Forward Channel (Client -> Server) */}
        {(() => {
          const start = toScreen(-150, -28, 4);
          const mid1 = toScreen(-15, -28, 4);
          const mid2 = toScreen(15, -28, 4);
          const end = toScreen(150, -28, 4);
          return (
            <g
              className="cursor-pointer"
              onClick={() => onSelectComponent(COMPONENT_EXPLANATIONS['conduit-forward'])}
            >
              <line
                x1={start.u}
                y1={start.v}
                x2={end.u}
                y2={end.v}
                stroke="#1e293b"
                strokeWidth={7 * zoom}
                strokeLinecap="round"
              />
              <line
                x1={start.u}
                y1={start.v}
                x2={end.u}
                y2={end.v}
                stroke="#38bdf8"
                strokeWidth={1.5 * zoom}
                strokeOpacity="0.6"
                strokeDasharray="6 6"
              />
            </g>
          );
        })()}

        {/* Reverse Channel (Server -> Client for ACKs) */}
        {(() => {
          const start = toScreen(150, 28, 4);
          const end = toScreen(-150, 28, 4);
          return (
            <g
              className="cursor-pointer"
              onClick={() => onSelectComponent(COMPONENT_EXPLANATIONS['conduit-reverse'])}
            >
              <line
                x1={start.u}
                y1={start.v}
                x2={end.u}
                y2={end.v}
                stroke="#1e293b"
                strokeWidth={7 * zoom}
                strokeLinecap="round"
              />
              <line
                x1={start.u}
                y1={start.v}
                x2={end.u}
                y2={end.v}
                stroke="#34d399"
                strokeWidth={1.5 * zoom}
                strokeOpacity="0.6"
                strokeDasharray="6 6"
              />
            </g>
          );
        })()}

        {/* Central Router Node Platform */}
        {renderPrism(
          -25,
          -25,
          0,
          50,
          50,
          8,
          {
            top: '#1e293b',
            left: '#0f172a',
            right: '#162032',
            border: '#334155',
          },
          'router-node',
          () => onSelectComponent(COMPONENT_EXPLANATIONS['router-node'])
        )}
        {/* Router Core Chassis */}
        {renderPrism(
          -18,
          -18,
          8,
          36,
          36,
          18,
          {
            top: '#334155',
            left: '#1e293b',
            right: '#273549',
            border: '#475569',
          },
          'router-node',
          () => onSelectComponent(COMPONENT_EXPLANATIONS['router-node'])
        )}
        {/* Router Status Indicator */}
        {(() => {
          const topCenter = toScreen(0, 0, 27);
          return (
            <g
              className="cursor-pointer"
              onClick={() => onSelectComponent(COMPONENT_EXPLANATIONS['router-node'])}
            >
              <circle cx={topCenter.u} cy={topCenter.v} r={6 * zoom} fill="#f59e0b" fillOpacity="0.2" />
              <circle cx={topCenter.u} cy={topCenter.v} r={3 * zoom} fill="#f59e0b" />
              <text
                x={topCenter.u}
                y={topCenter.v - 12 * zoom}
                textAnchor="middle"
                className="text-[10px] font-mono font-semibold fill-slate-300"
              >
                Router (L3 Hop)
              </text>
            </g>
          );
        })()}

        {/* CLIENT NODE (Left Side Station) */}
        {/* Base Pedestal */}
        {renderPrism(
          -190,
          -45,
          0,
          80,
          90,
          10,
          {
            top: '#1e293b',
            left: '#0f172a',
            right: '#162032',
            border: '#334155',
          },
          'client-host',
          () => onSelectComponent(COMPONENT_EXPLANATIONS['client-host'])
        )}

        {/* Client Hardware Tower */}
        {renderPrism(
          -185,
          -40,
          10,
          70,
          36,
          42,
          {
            top: '#243042',
            left: '#131b27',
            right: '#1c2637',
            border: '#3b4d66',
          },
          'client-host',
          () => onSelectComponent(COMPONENT_EXPLANATIONS['client-host'])
        )}

        {/* Client TCP Send Buffer / Sliding Window Isometric Block */}
        {renderPrism(
          -185,
          5,
          10,
          70,
          35,
          14,
          {
            top: '#1e293b',
            left: '#101726',
            right: '#182234',
            border: '#4338ca',
          },
          'sliding-window',
          () => onSelectComponent(COMPONENT_EXPLANATIONS['sliding-window'])
        )}

        {/* Client Visual Buffer Cells (Memory Array) */}
        {[-180, -165, -150, -135].map((cx, i) => {
          const isAcked = i < 2;
          const isInFlight = i === 2;
          const cellColor = isAcked
            ? { top: '#065f46', left: '#022c22', right: '#044e39' }
            : isInFlight
            ? { top: '#3730a3', left: '#1e1b4b', right: '#312e81' }
            : { top: '#334155', left: '#1e293b', right: '#273549' };

          return renderPrism(cx, 12, 24, 11, 20, 6, cellColor, 'sliding-window', () =>
            onSelectComponent(COMPONENT_EXPLANATIONS['sliding-window'])
          );
        })}

        {/* Client Labels & Status */}
        {(() => {
          const labelPos = toScreen(-150, -2, 58);
          const stateColor = getStateColor(metrics.clientState);
          return (
            <g
              className="cursor-pointer"
              onClick={() => onSelectComponent(COMPONENT_EXPLANATIONS['client-host'])}
            >
              <text
                x={labelPos.u}
                y={labelPos.v - 22 * zoom}
                textAnchor="middle"
                className="text-[12px] font-semibold fill-slate-100"
              >
                Client Workstation
              </text>
              <text
                x={labelPos.u}
                y={labelPos.v - 8 * zoom}
                textAnchor="middle"
                className="text-[10px] font-mono fill-slate-400"
              >
                192.168.1.42:52418
              </text>
              {/* State Badge */}
              <g
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectComponent(COMPONENT_EXPLANATIONS['state-machine']);
                }}
              >
                <rect
                  x={labelPos.u - 48 * zoom}
                  y={labelPos.v + 2 * zoom}
                  width={96 * zoom}
                  height={18 * zoom}
                  rx={4}
                  fill="#0f172a"
                  stroke={stateColor}
                  strokeWidth="1.2"
                />
                <text
                  x={labelPos.u}
                  y={labelPos.v + 15 * zoom}
                  textAnchor="middle"
                  className="text-[9px] font-mono font-semibold"
                  fill={stateColor}
                >
                  {metrics.clientState}
                </text>
              </g>
            </g>
          );
        })()}

        {/* SERVER NODE (Right Side Station) */}
        {/* Base Pedestal */}
        {renderPrism(
          110,
          -45,
          0,
          80,
          90,
          10,
          {
            top: '#1e293b',
            left: '#0f172a',
            right: '#162032',
            border: '#334155',
          },
          'server-host',
          () => onSelectComponent(COMPONENT_EXPLANATIONS['server-host'])
        )}

        {/* Server Rack Tower (Chassis) */}
        {renderPrism(
          115,
          -40,
          10,
          70,
          36,
          48,
          {
            top: '#1c2838',
            left: '#0f1722',
            right: '#162130',
            border: '#2e415b',
          },
          'server-host',
          () => onSelectComponent(COMPONENT_EXPLANATIONS['server-host'])
        )}

        {/* Server Receive Buffer (rwnd memory stack) */}
        {renderPrism(
          115,
          5,
          10,
          70,
          35,
          14,
          {
            top: '#1e293b',
            left: '#101726',
            right: '#182234',
            border: '#059669',
          },
          'server-host',
          () => onSelectComponent(COMPONENT_EXPLANATIONS['server-host'])
        )}

        {/* Server Visual Receive Buffer Cells */}
        {[120, 135, 150, 165].map((cx, i) => {
          const isOccupied = i < 2;
          const cellColor = isOccupied
            ? { top: '#047857', left: '#022c22', right: '#065f46' }
            : { top: '#334155', left: '#1e293b', right: '#273549' };

          return renderPrism(cx, 12, 24, 11, 20, 6, cellColor, 'server-host', () =>
            onSelectComponent(COMPONENT_EXPLANATIONS['server-host'])
          );
        })}

        {/* Server Labels & Status */}
        {(() => {
          const labelPos = toScreen(150, -2, 64);
          const stateColor = getStateColor(metrics.serverState);
          return (
            <g
              className="cursor-pointer"
              onClick={() => onSelectComponent(COMPONENT_EXPLANATIONS['server-host'])}
            >
              <text
                x={labelPos.u}
                y={labelPos.v - 22 * zoom}
                textAnchor="middle"
                className="text-[12px] font-semibold fill-slate-100"
              >
                Host Server
              </text>
              <text
                x={labelPos.u}
                y={labelPos.v - 8 * zoom}
                textAnchor="middle"
                className="text-[10px] font-mono fill-slate-400"
              >
                93.184.216.34:80
              </text>
              {/* State Badge */}
              <g
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectComponent(COMPONENT_EXPLANATIONS['state-machine']);
                }}
              >
                <rect
                  x={labelPos.u - 48 * zoom}
                  y={labelPos.v + 2 * zoom}
                  width={96 * zoom}
                  height={18 * zoom}
                  rx={4}
                  fill="#0f172a"
                  stroke={stateColor}
                  strokeWidth="1.2"
                />
                <text
                  x={labelPos.u}
                  y={labelPos.v + 15 * zoom}
                  textAnchor="middle"
                  className="text-[9px] font-mono font-semibold"
                  fill={stateColor}
                >
                  {metrics.serverState}
                </text>
              </g>
            </g>
          );
        })()}

        {/* IN-FLIGHT PACKETS (Layered above base grid) */}
        {activePackets.map((packet) => {
          const pos = getPacketScreenPos(packet);
          const shadow = getPacketShadowPos(packet);
          const isSelected = selectedComponentId === packet.id;

          // Determine packet theme color based on flags
          let themeColor = '#3b82f6'; // default blue
          let typeTag = 'DATA';
          let componentId = 'data-packet';

          if (packet.flags.syn && packet.flags.ack) {
            themeColor = '#8b5cf6'; // violet
            typeTag = 'SYN-ACK';
            componentId = 'syn-ack-packet';
          } else if (packet.flags.syn) {
            themeColor = '#6366f1'; // indigo
            typeTag = 'SYN';
            componentId = 'syn-packet';
          } else if (packet.flags.fin) {
            themeColor = '#f43f5e'; // rose
            typeTag = 'FIN';
            componentId = 'fin-packet';
          } else if (packet.flags.rst) {
            themeColor = '#ea580c'; // flame
            typeTag = 'RST';
            componentId = 'rst-packet';
          } else if (packet.flags.ack && packet.length === 0) {
            themeColor = '#10b981'; // emerald
            typeTag = 'ACK';
            componentId = 'ack-packet';
          } else if (packet.isRetransmission) {
            themeColor = '#f59e0b'; // amber
            typeTag = 'RETRY';
            componentId = 'retransmit-packet';
          }

          const isDroppedAtThisPoint =
            packet.dropped && packet.progress >= (packet.dropProgress || 0.5);

          if (isDroppedAtThisPoint) {
            // Render packet loss / drop animation at the router
            return (
              <g
                key={packet.id}
                className="cursor-pointer"
                onClick={() => {
                  const comp = COMPONENT_EXPLANATIONS['router-node'];
                  onSelectComponent(comp, packet);
                }}
              >
                <circle
                  cx={pos.u}
                  cy={pos.v}
                  r={14 * zoom}
                  fill="#ef4444"
                  fillOpacity="0.2"
                  stroke="#ef4444"
                  strokeWidth="1.5"
                  strokeDasharray="3 3"
                />
                <text
                  x={pos.u}
                  y={pos.v + 4 * zoom}
                  textAnchor="middle"
                  className="text-[10px] font-mono font-bold fill-red-400"
                >
                  ✕ DROPPED
                </text>
              </g>
            );
          }

          // Packet voxel faces
          const pw = 16 * zoom;
          const ph = 12 * zoom;

          return (
            <g
              key={packet.id}
              className="cursor-pointer group"
              onClick={() => {
                const comp = COMPONENT_EXPLANATIONS[componentId];
                onSelectComponent(comp, packet);
              }}
            >
              {/* Projected Drop Shadow */}
              <ellipse
                cx={shadow.u}
                cy={shadow.v}
                rx={12 * zoom}
                ry={6 * zoom}
                fill="#000000"
                fillOpacity="0.45"
              />

              {/* Floating Isometric Data Voxel */}
              <g transform={`translate(${pos.u - pw / 2}, ${pos.v - ph / 2})`}>
                {/* 3D Isometric Diamond/Hexagon */}
                <polygon
                  points={`${pw / 2},0 ${pw},${ph / 3} ${pw / 2},${ph} 0,${ph / 3}`}
                  fill={themeColor}
                  fillOpacity="0.95"
                  stroke={isSelected ? '#ffffff' : '#ffffff'}
                  strokeWidth={isSelected ? 2 : 0.8}
                />
                {/* Top highlight */}
                <polygon
                  points={`${pw / 2},0 ${pw},${ph / 3} ${pw / 2},${(ph * 2) / 3} 0,${ph / 3}`}
                  fill="#ffffff"
                  fillOpacity="0.25"
                />
              </g>

              {/* Floating Label Banner */}
              <g transform={`translate(${pos.u}, ${pos.v - 18 * zoom})`}>
                <rect
                  x={-34 * zoom}
                  y={-12 * zoom}
                  width={68 * zoom}
                  height={15 * zoom}
                  rx={3}
                  fill="#090d16"
                  fillOpacity="0.85"
                  stroke={themeColor}
                  strokeWidth="1"
                />
                <text
                  x={0}
                  y={-2 * zoom}
                  textAnchor="middle"
                  className="text-[9px] font-mono font-semibold"
                  fill="#f8fafc"
                >
                  {typeTag} {packet.seqNumber ? `#${packet.seqNumber}` : `#${packet.ackNumber}`}
                </text>
              </g>
            </g>
          );
        })}
      </svg>

      {/* Floating Canvas Controls (Zoom & Center Reset) */}
      <div className="absolute top-4 right-4 flex items-center gap-1.5 p-1 bg-slate-900/90 backdrop-blur-md rounded-lg border border-slate-700/80 shadow-md">
        <button
          onClick={() => setZoom((prev) => Math.min(prev * 1.15, 2.5))}
          className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded transition-colors"
          title="Zoom In"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          onClick={() => setZoom((prev) => Math.max(prev * 0.85, 0.5))}
          className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded transition-colors"
          title="Zoom Out"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <button
          onClick={handleResetView}
          className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded transition-colors"
          title="Reset Zoom & Pan"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
        <div className="h-4 w-px bg-slate-700 mx-1" />
        <span className="text-[11px] font-mono text-slate-400 px-1.5 tabular-nums">
          {Math.round(zoom * 100)}%
        </span>
      </div>

      {/* Interactive Helper Banner */}
      <div className="absolute bottom-3 left-4 flex items-center gap-2 text-xs text-slate-400 bg-slate-900/80 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-slate-800">
        <Info className="w-3.5 h-3.5 text-sky-400 shrink-0" />
        <span>Click any host, conduit, router, or moving packet to inspect TCP parameters</span>
      </div>
    </div>
  );
};
