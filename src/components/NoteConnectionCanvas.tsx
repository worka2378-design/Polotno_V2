import React, { useState, useRef } from 'react';
import { X, Edit2, Check, Sparkles, SlidersHorizontal, Trash2 } from 'lucide-react';
import { Note, NoteConnection, Point } from '../types';

interface NoteConnectionCanvasProps {
  connections: NoteConnection[];
  notes: Note[];
  scale: number;
  selectedConnectionId: string | null;
  connectingFromNoteId: string | null;
  cursorCanvasPos: Point | null;
  onSelectConnection: (id: string | null) => void;
  onUpdateConnection: (id: string, updates: Partial<NoteConnection>) => void;
  onDeleteConnection: (id: string) => void;
}

export function NoteConnectionCanvas({
  connections,
  notes,
  scale,
  selectedConnectionId,
  connectingFromNoteId,
  cursorCanvasPos,
  onSelectConnection,
  onUpdateConnection,
  onDeleteConnection,
}: NoteConnectionCanvasProps) {
  const [draggingControl, setDraggingControl] = useState<{
    connectionId: string;
    pointKey: 'cp1' | 'cp2';
  } | null>(null);

  const [editingLabelId, setEditingLabelId] = useState<string | null>(null);
  const [labelInput, setLabelInput] = useState('');

  const notesMap = new Map<string, Note>();
  notes.forEach((n) => notesMap.set(n.id, n));

  // Handle dragging curve control handles
  const handlePointerDownControl = (
    e: React.PointerEvent,
    connectionId: string,
    pointKey: 'cp1' | 'cp2'
  ) => {
    e.stopPropagation();
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setDraggingControl({ connectionId, pointKey });
    onSelectConnection(connectionId);
  };

  const handlePointerMoveControl = (
    e: React.PointerEvent,
    connectionId: string,
    pointKey: 'cp1' | 'cp2'
  ) => {
    if (!draggingControl || draggingControl.connectionId !== connectionId) return;

    // Convert mouse client coordinates to canvas coordinates using scale and reference
    const svgEl = e.currentTarget.closest('svg');
    if (!svgEl) return;

    const rect = svgEl.getBoundingClientRect();
    const currentCanvasX = (e.clientX - rect.left) / scale;
    const currentCanvasY = (e.clientY - rect.top) / scale;

    onUpdateConnection(connectionId, {
      [pointKey]: { x: currentCanvasX, y: currentCanvasY },
    });
  };

  const handlePointerUpControl = (e: React.PointerEvent) => {
    if (draggingControl) {
      try {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      } catch (_) {}
      setDraggingControl(null);
    }
  };

  // Preview line while creating a connection
  const connectingNote = connectingFromNoteId ? notesMap.get(connectingFromNoteId) : null;
  const connectingStart = connectingNote
    ? {
        x: connectingNote.x + (connectingNote.width || 280) / 2,
        y: connectingNote.y + (connectingNote.height || 160) / 2,
      }
    : null;

  return (
    <svg
      className="absolute top-0 left-0 w-full h-full overflow-visible pointer-events-none"
      style={{ zIndex: 5 }}
    >
      <defs>
        <marker
          id="connection-arrow"
          viewBox="0 0 10 10"
          refX="8"
          refY="5"
          markerWidth="6"
          markerHeight="6"
          orient="auto-start-reverse"
        >
          <path d="M 0 1 L 10 5 L 0 9 z" fill="#52525b" />
        </marker>
        <marker
          id="connection-arrow-selected"
          viewBox="0 0 10 10"
          refX="8"
          refY="5"
          markerWidth="6"
          markerHeight="6"
          orient="auto-start-reverse"
        >
          <path d="M 0 1 L 10 5 L 0 9 z" fill="#18181b" />
        </marker>
      </defs>

      {/* Draft line when in connecting mode */}
      {connectingStart && cursorCanvasPos && (
        <line
          x1={connectingStart.x}
          y1={connectingStart.y}
          x2={cursorCanvasPos.x}
          y2={cursorCanvasPos.y}
          stroke="#71717a"
          strokeWidth="2"
          strokeDasharray="4 4"
          className="animate-pulse"
        />
      )}

      {/* Established Note Connections */}
      {connections.map((conn) => {
        const fromNote = notesMap.get(conn.fromNoteId);
        const toNote = notesMap.get(conn.toNoteId);

        if (!fromNote || !toNote) return null;

        const start: Point = {
          x: fromNote.x + (fromNote.width || 280) / 2,
          y: fromNote.y + (fromNote.height || 160) / 2,
        };

        const end: Point = {
          x: toNote.x + (toNote.width || 280) / 2,
          y: toNote.y + (toNote.height || 160) / 2,
        };

        const dx = end.x - start.x;
        const dy = end.y - start.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const nx = -dy / dist;
        const ny = dx / dist;

        // Calculate control points (CP1 and CP2)
        const cp1: Point = conn.cp1 || {
          x: start.x + dx * 0.33 + nx * (dist * 0.2),
          y: start.y + dy * 0.33 + ny * (dist * 0.2),
        };

        const cp2: Point = conn.cp2 || {
          x: start.x + dx * 0.66 + nx * (dist * 0.2),
          y: start.y + dy * 0.66 + ny * (dist * 0.2),
        };

        const pathD = `M ${start.x} ${start.y} C ${cp1.x} ${cp1.y}, ${cp2.x} ${cp2.y}, ${end.x} ${end.y}`;

        // Calculate midpoint on cubic Bézier for label placement (t = 0.5)
        const midX =
          0.125 * start.x + 0.375 * cp1.x + 0.375 * cp2.x + 0.125 * end.x;
        const midY =
          0.125 * start.y + 0.375 * cp1.y + 0.375 * cp2.y + 0.125 * end.y;

        const isSelected = selectedConnectionId === conn.id;

        const strokeStyle =
          conn.style === 'dashed'
            ? '6 4'
            : conn.style === 'dotted'
            ? '2 4'
            : undefined;

        return (
          <g key={conn.id} className="group cursor-pointer pointer-events-auto">
            {/* Wide invisible path for easier hover/click selection */}
            <path
              d={pathD}
              fill="none"
              stroke="transparent"
              strokeWidth="20"
              onClick={(e) => {
                e.stopPropagation();
                onSelectConnection(isSelected ? null : conn.id);
              }}
            />

            {/* Main Curved Connection Line */}
            <path
              d={pathD}
              fill="none"
              stroke={isSelected ? '#18181b' : '#71717a'}
              strokeWidth={isSelected ? '2.5' : '1.8'}
              strokeDasharray={strokeStyle}
              markerEnd={
                isSelected ? 'url(#connection-arrow-selected)' : 'url(#connection-arrow)'
              }
              className="transition-all duration-150 group-hover:stroke-stone-900"
              onClick={(e) => {
                e.stopPropagation();
                onSelectConnection(isSelected ? null : conn.id);
              }}
            />

            {/* Control Point Handles (Visible when selected or hovered) */}
            {isSelected && (
              <>
                {/* Guide lines to control handles */}
                <line
                  x1={start.x}
                  y1={start.y}
                  x2={cp1.x}
                  y2={cp1.y}
                  stroke="#a1a1aa"
                  strokeWidth="1"
                  strokeDasharray="2 2"
                />
                <line
                  x1={end.x}
                  y1={end.y}
                  x2={cp2.x}
                  y2={cp2.y}
                  stroke="#a1a1aa"
                  strokeWidth="1"
                  strokeDasharray="2 2"
                />

                {/* CP1 Handle */}
                <circle
                  cx={cp1.x}
                  cy={cp1.y}
                  r="6"
                  fill="#ffffff"
                  stroke="#18181b"
                  strokeWidth="2"
                  className="cursor-grab active:cursor-grabbing hover:scale-125 transition-transform"
                  onPointerDown={(e) => handlePointerDownControl(e, conn.id, 'cp1')}
                  onPointerMove={(e) => handlePointerMoveControl(e, conn.id, 'cp1')}
                  onPointerUp={handlePointerUpControl}
                />

                {/* CP2 Handle */}
                <circle
                  cx={cp2.x}
                  cy={cp2.y}
                  r="6"
                  fill="#ffffff"
                  stroke="#18181b"
                  strokeWidth="2"
                  className="cursor-grab active:cursor-grabbing hover:scale-125 transition-transform"
                  onPointerDown={(e) => handlePointerDownControl(e, conn.id, 'cp2')}
                  onPointerMove={(e) => handlePointerMoveControl(e, conn.id, 'cp2')}
                  onPointerUp={handlePointerUpControl}
                />
              </>
            )}

            {/* Label or Label Editor on Curve Midpoint */}
            <foreignObject
              x={midX - 70}
              y={midY - 16}
              width="140"
              height="36"
              className="overflow-visible pointer-events-auto"
            >
              <div className="flex items-center justify-center h-full">
                {editingLabelId === conn.id ? (
                  <div className="flex items-center gap-1 bg-white border border-stone-400 rounded-full shadow-md px-2 py-0.5 text-xs">
                    <input
                      type="text"
                      value={labelInput}
                      onChange={(e) => setLabelInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          onUpdateConnection(conn.id, { label: labelInput.trim() });
                          setEditingLabelId(null);
                        } else if (e.key === 'Escape') {
                          setEditingLabelId(null);
                        }
                      }}
                      autoFocus
                      placeholder="Назва зв'язку..."
                      className="w-20 bg-transparent text-stone-900 outline-none text-[11px]"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        onUpdateConnection(conn.id, { label: labelInput.trim() });
                        setEditingLabelId(null);
                      }}
                      className="text-stone-700 hover:text-stone-900 rounded-full p-0.5 cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : conn.label ? (
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectConnection(conn.id);
                      setEditingLabelId(conn.id);
                      setLabelInput(conn.label || '');
                    }}
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono border transition-all cursor-pointer whitespace-nowrap shadow-sm ${
                      isSelected
                        ? 'bg-stone-900 text-white border-stone-900'
                        : 'bg-[#ede5d8] text-stone-800 border-stone-300 hover:border-stone-500'
                    }`}
                    title="Натисніть для зміни назви"
                  >
                    {conn.label}
                  </div>
                ) : isSelected ? (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingLabelId(conn.id);
                      setLabelInput('');
                    }}
                    className="px-2 py-0.5 bg-white hover:bg-stone-100 text-stone-700 border border-stone-300 rounded-full text-[10px] shadow-sm transition-colors cursor-pointer flex items-center gap-1"
                  >
                    <Edit2 className="w-3 h-3" />
                    <span>Підпис</span>
                  </button>
                ) : null}
              </div>
            </foreignObject>

            {/* Quick Connection Controls Toolbar when Selected */}
            {isSelected && (
              <foreignObject
                x={midX - 75}
                y={midY - 50}
                width="150"
                height="32"
                className="overflow-visible pointer-events-auto"
              >
                <div
                  className="flex items-center justify-center gap-1 bg-[#ede5d8]/95 border border-stone-300/90 rounded-full shadow-lg px-2 py-1 text-xs select-none"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    type="button"
                    onClick={() =>
                      onUpdateConnection(conn.id, {
                        style: conn.style === 'dashed' ? 'solid' : 'dashed',
                      })
                    }
                    className={`p-1 rounded-full text-stone-700 hover:text-stone-900 transition-colors cursor-pointer ${
                      conn.style === 'dashed' ? 'bg-stone-300/80 font-bold' : ''
                    }`}
                    title="Змінити стиль лінії (пунктир/суцільна)"
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setEditingLabelId(conn.id);
                      setLabelInput(conn.label || '');
                    }}
                    className="p-1 rounded-full text-stone-700 hover:text-stone-900 transition-colors cursor-pointer"
                    title="Редагувати підпис"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => onDeleteConnection(conn.id)}
                    className="p-1 rounded-full text-stone-700 hover:text-red-600 transition-colors cursor-pointer ml-auto"
                    title="Видалити зв'язок"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </foreignObject>
            )}
          </g>
        );
      })}
    </svg>
  );
}
