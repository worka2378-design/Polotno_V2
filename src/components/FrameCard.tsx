import React, { useState } from 'react';
import { 
  Folder as FolderIcon, LayoutGrid, Plus, Trash2, Link2
} from 'lucide-react';
import { Folder, Note } from '../types';
import { countLinksInContent } from '../utils/linkUtils';

interface FrameCardProps {
  folder: Folder;
  containedNotes: Note[];
  scale: number;
  isSelected?: boolean;
  onSelect: (folderId: string) => void;
  onUpdateFolder: (id: string, updates: Partial<Folder>) => void;
  onDeleteFolder: (id: string) => void;
  onMoveFrameAbsolute: (
    folderId: string,
    startFolderPos: { x: number; y: number },
    startNotesPos: Array<{ id: string; x: number; y: number }>,
    totalDx: number,
    totalDy: number
  ) => void;
  onMoveFrameEnd: () => void;
  onResizeFrame: (id: string, width: number, height: number) => void;
  onArrangeGrid: (folderId: string) => void;
  onAddNoteToFrame: (folderId: string, x: number, y: number) => void;
}

export const FrameCard: React.FC<FrameCardProps> = React.memo(({
  folder,
  containedNotes,
  scale,
  isSelected,
  onSelect,
  onUpdateFolder,
  onDeleteFolder,
  onMoveFrameAbsolute,
  onMoveFrameEnd,
  onResizeFrame,
  onArrangeGrid,
  onAddNoteToFrame,
}) => {
  const [isEditingName, setIsEditingName] = useState(false);
  const [editName, setEditName] = useState(folder.name);
  const [isHovered, setIsHovered] = useState(false);

  const x = folder.x ?? 100;
  const y = folder.y ?? 100;
  const width = folder.width ?? 380;
  const height = folder.height ?? 280;

  const totalFolderLinks = containedNotes.reduce((acc, note) => acc + countLinksInContent(note.content), 0);

  // Handle Dragging Frame Container (100% Smooth Absolute Delta)
  const handlePointerDownHeader = (e: React.PointerEvent) => {
    e.stopPropagation();
    onSelect(folder.id);

    const startClient = { x: e.clientX, y: e.clientY };
    const startFolderPos = { x, y };
    const startNotesPos = containedNotes.map((n) => ({ id: n.id, x: n.x, y: n.y }));

    const handlePointerMove = (ev: PointerEvent) => {
      const totalDx = (ev.clientX - startClient.x) / scale;
      const totalDy = (ev.clientY - startClient.y) / scale;
      onMoveFrameAbsolute(folder.id, startFolderPos, startNotesPos, totalDx, totalDy);
    };

    const handlePointerUp = () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      onMoveFrameEnd();
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
  };

  // Handle Resizing Frame Container
  const handlePointerDownResize = (e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();

    const startX = e.clientX;
    const startY = e.clientY;
    const startWidth = width;
    const startHeight = height;

    // Calculate minimum required bounds dictated by contained items
    let maxContentRight = x + 200;
    let maxContentBottom = y + 160;

    containedNotes.forEach((n) => {
      if (n.hidden) return;
      const nw = n.width || 280;
      const nh = n.height || 220;
      if (n.x + nw > maxContentRight) maxContentRight = n.x + nw;
      if (n.y + nh > maxContentBottom) maxContentBottom = n.y + nh;
    });

    const paddingRight = 32;
    const paddingBottom = 32;

    const minRequiredWidth = Math.max(300, maxContentRight - x + paddingRight);
    const minRequiredHeight = Math.max(220, maxContentBottom - y + paddingBottom);

    const handlePointerMove = (ev: PointerEvent) => {
      const dw = (ev.clientX - startX) / scale;
      const dh = (ev.clientY - startY) / scale;
      const newW = Math.max(minRequiredWidth, startWidth + dw);
      const newH = Math.max(minRequiredHeight, startHeight + dh);
      onResizeFrame(folder.id, newW, newH);
    };

    const handlePointerUp = () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      onMoveFrameEnd();
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
  };

  const handleCommitName = () => {
    if (editName.trim()) {
      onUpdateFolder(folder.id, { name: editName.trim() });
    }
    setIsEditingName(false);
  };

  return (
    <div
      className="absolute pointer-events-none group"
      style={{
        transform: `translate(${x}px, ${y}px)`,
        width: `${width}px`,
        height: `${height}px`,
        zIndex: 0,
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Outer Miro/FigJam Frame Box */}
      <div
        className={`w-full h-full rounded-3xl transition-all duration-150 border-2 pointer-events-none ${
          isSelected
            ? 'border-stone-800 bg-[#ede5d8]/70 ring-2 ring-stone-800'
            : isHovered
            ? 'border-stone-400 bg-[#ede5d8]/50'
            : 'border-stone-300 bg-[#ede5d8]/30'
        }`}
      >
        {/* Clickable Frame Border Target */}
        <div 
          className="absolute inset-0 rounded-3xl border-4 border-transparent cursor-grab active:cursor-grabbing pointer-events-auto"
          onPointerDown={handlePointerDownHeader}
          title="Захопіть рамку за край або заголовок для переміщення"
        />

        {/* Frame Header Pill (Shown strictly when selected or editing) */}
        {(isSelected || isEditingName) ? (
          <div
            className="absolute -top-10 left-2 flex items-center gap-1.5 px-3 py-1 bg-[#ede5d8] border border-stone-300 rounded-full text-xs font-medium cursor-grab active:cursor-grabbing text-stone-700 hover:text-stone-900 transition-colors select-none z-10 pointer-events-auto shadow-sm"
            onPointerDown={handlePointerDownHeader}
          >
            <FolderIcon className="w-4 h-4 text-amber-700 shrink-0" />

            {isEditingName ? (
              <input
                autoFocus
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onBlur={handleCommitName}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCommitName();
                  if (e.key === 'Escape') setIsEditingName(false);
                }}
                className="bg-[#e2d8c7] text-stone-900 px-2 py-0.5 rounded-full outline-none text-xs border border-stone-300 w-28 pointer-events-auto"
                onPointerDown={(e) => e.stopPropagation()}
              />
            ) : (
              <span
                className="font-semibold text-stone-800 hover:text-stone-900 truncate max-w-[160px]"
                onDoubleClick={(e) => {
                  e.stopPropagation();
                  setIsEditingName(true);
                }}
                title="Подвійний клік для перейменування"
              >
                {folder.name}
              </span>
            )}

            <span className="text-[10px] text-stone-600 bg-stone-300/60 px-2 py-0.5 rounded-full ml-0.5 font-mono">
              {containedNotes.length}
            </span>

            {totalFolderLinks > 0 && (
              <span 
                className="inline-flex items-center text-[10px] text-sky-600 font-medium shrink-0 ml-1"
                title={`Наявних посилань: ${totalFolderLinks}`}
              >
                <Link2 className="w-3.5 h-3.5 text-sky-500 shrink-0 -rotate-45" />
              </span>
            )}

            {/* Quick Actions inside Header */}
            <div className="flex items-center gap-0.5 ml-1 border-l border-stone-300 pl-1.5 pointer-events-auto" onPointerDown={(e) => e.stopPropagation()}>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onArrangeGrid(folder.id);
                }}
                className="p-1 rounded-full text-stone-600 hover:text-stone-900 transition-colors cursor-pointer"
                title="Упорядкувати в сітку"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onAddNoteToFrame(folder.id, x + 30, y + 40);
                }}
                className="p-1 rounded-full text-stone-600 hover:text-stone-900 transition-colors cursor-pointer"
                title="Додати нотатку у рамку"
              >
                <Plus className="w-4 h-4" />
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteFolder(folder.id);
                }}
                className="p-1 rounded-full text-stone-600 hover:text-stone-900 transition-colors cursor-pointer"
                title="Видалити рамку (розгрупувати)"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          /* Subtle title label when inactive */
          <div className="absolute -top-6 left-3 text-xs font-medium text-stone-600 select-none pointer-events-none truncate max-w-[200px]">
            {folder.name}
          </div>
        )}

        {/* Bottom-Right Corner Resize Handle */}
        <div
          className="absolute bottom-2 right-2 w-5 h-5 cursor-se-resize flex items-center justify-center group/resize z-10 pointer-events-auto"
          onPointerDown={handlePointerDownResize}
          title="Тягніть для зміни розміру рамки"
        >
          <div className="w-2.5 h-2.5 rounded-full bg-stone-500/50 group-hover/resize:bg-stone-900 transition-colors" />
        </div>
      </div>
    </div>
  );
});
