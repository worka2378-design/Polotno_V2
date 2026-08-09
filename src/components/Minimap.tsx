import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Maximize2, ZoomIn, ZoomOut, Map } from 'lucide-react';
import { Note, Folder, StandaloneLink, StandaloneFile } from '../types';

interface MinimapProps {
  notes: Note[];
  folders: Folder[];
  standaloneLinks: StandaloneLink[];
  standaloneFiles: StandaloneFile[];
  offset: { x: number; y: number };
  scale: number;
  onPanTo: (x: number, y: number) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomToFit: () => void;
}

export const Minimap: React.FC<MinimapProps> = ({
  notes,
  folders,
  standaloneLinks,
  standaloneFiles,
  offset,
  scale,
  onPanTo,
  onZoomIn,
  onZoomOut,
  onZoomToFit,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);

  const MAP_WIDTH = 190;
  const MAP_HEIGHT = 120;

  // Compute bounding box of all canvas items
  const bounds = React.useMemo(() => {
    let minX = -400;
    let maxX = 1200;
    let minY = -300;
    let maxY = 900;

    const items = [
      ...notes.map((n) => ({ x: n.x, y: n.y, w: n.width || 280, h: n.height || 200 })),
      ...folders.map((f) => ({ x: f.x, y: f.y, w: f.width || 320, h: f.height || 220 })),
      ...standaloneLinks.map((l) => ({ x: l.x, y: l.y, w: l.width || 240, h: l.height || 140 })),
      ...standaloneFiles.map((f) => ({ x: f.x, y: f.y, w: f.width || 240, h: f.height || 140 })),
    ];

    if (items.length > 0) {
      minX = Math.min(...items.map((i) => i.x)) - 200;
      maxX = Math.max(...items.map((i) => i.x + i.w)) + 200;
      minY = Math.min(...items.map((i) => i.y)) - 200;
      maxY = Math.max(...items.map((i) => i.y + i.h)) + 200;
    }

    // Ensure minimum aspect ratio and area
    const w = Math.max(800, maxX - minX);
    const h = Math.max(600, maxY - minY);

    return { minX, maxX: minX + w, minY, maxY: minY + h, w, h };
  }, [notes, folders, standaloneLinks, standaloneFiles]);

  // Convert canvas world coordinates to minimap SVG coordinates
  const worldToMap = (wx: number, wy: number) => {
    const mx = ((wx - bounds.minX) / bounds.w) * MAP_WIDTH;
    const my = ((wy - bounds.minY) / bounds.h) * MAP_HEIGHT;
    return { x: mx, y: my };
  };

  // Convert minimap SVG coordinates back to canvas world coordinates
  const mapToWorld = (mx: number, my: number) => {
    const wx = bounds.minX + (mx / MAP_WIDTH) * bounds.w;
    const wy = bounds.minY + (my / MAP_HEIGHT) * bounds.h;
    return { x: wx, y: wy };
  };

  // Viewport bounds in world space
  const vpWorld = {
    x: -offset.x / scale,
    y: -offset.y / scale,
    w: window.innerWidth / scale,
    h: window.innerHeight / scale,
  };

  const vpMapStart = worldToMap(vpWorld.x, vpWorld.y);
  const vpMapEnd = worldToMap(vpWorld.x + vpWorld.w, vpWorld.y + vpWorld.h);
  const vpMapW = Math.max(12, vpMapEnd.x - vpMapStart.x);
  const vpMapH = Math.max(8, vpMapEnd.y - vpMapStart.y);

  const handlePointerDown = (e: React.PointerEvent) => {
    if (!containerRef.current) return;
    isDraggingRef.current = true;
    const rect = containerRef.current.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const targetWorld = mapToWorld(mx, my);
    onPanTo(targetWorld.x, targetWorld.y);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDraggingRef.current || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const mx = Math.max(0, Math.min(MAP_WIDTH, e.clientX - rect.left));
    const my = Math.max(0, Math.min(MAP_HEIGHT, e.clientY - rect.top));
    const targetWorld = mapToWorld(mx, my);
    onPanTo(targetWorld.x, targetWorld.y);
  };

  const handlePointerUp = () => {
    isDraggingRef.current = false;
  };

  return (
    <div className="fixed bottom-4 md:bottom-6 left-4 z-40 select-none flex flex-col items-start gap-2">
      {/* Map canvas preview (opens ABOVE the controls bar) */}
      <AnimatePresence>
        {!isCollapsed && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 10 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            ref={containerRef}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            className="w-[200px] h-[130px] bg-stone-900/90 rounded-2xl border border-stone-700/60 shadow-2xl overflow-hidden relative cursor-crosshair backdrop-blur-md"
          >
            <svg className="w-full h-full pointer-events-none">
              {/* Grid dots background */}
              <pattern id="minimap-grid" width="16" height="16" patternUnits="userSpaceOnUse">
                <circle cx="2" cy="2" r="0.75" fill="#44403c" opacity="0.4" />
              </pattern>
              <rect width="100%" height="100%" fill="url(#minimap-grid)" />

              {/* Folders */}
              {folders.map((f) => {
                const pos = worldToMap(f.x, f.y);
                const size = worldToMap(f.x + (f.width || 320), f.y + (f.height || 220));
                return (
                  <rect
                    key={f.id}
                    x={pos.x}
                    y={pos.y}
                    width={Math.max(4, size.x - pos.x)}
                    height={Math.max(4, size.y - pos.y)}
                    fill="#d97706"
                    opacity="0.3"
                    rx="3"
                  />
                );
              })}

              {/* Notes */}
              {notes.map((n) => {
                const pos = worldToMap(n.x, n.y);
                const size = worldToMap(n.x + (n.width || 280), n.y + (n.height || 200));
                return (
                  <rect
                    key={n.id}
                    x={pos.x}
                    y={pos.y}
                    width={Math.max(3, size.x - pos.x)}
                    height={Math.max(3, size.y - pos.y)}
                    fill="#f5f5f4"
                    opacity="0.7"
                    rx="1.5"
                  />
                );
              })}

              {/* Standalone links */}
              {standaloneLinks.map((l) => {
                const pos = worldToMap(l.x, l.y);
                return <circle key={l.id} cx={pos.x} cy={pos.y} r="2" fill="#0284c7" opacity="0.8" />;
              })}

              {/* Standalone files */}
              {standaloneFiles.map((f) => {
                const pos = worldToMap(f.x, f.y);
                return <circle key={f.id} cx={pos.x} cy={pos.y} r="2" fill="#059669" opacity="0.8" />;
              })}

              {/* Camera Viewport Indicator */}
              <rect
                x={vpMapStart.x}
                y={vpMapStart.y}
                width={vpMapW}
                height={vpMapH}
                fill="#f59e0b"
                fillOpacity="0.1"
                stroke="#f59e0b"
                strokeWidth="1.5"
                rx="3"
              />
            </svg>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main control bar (Same height, baseline, background and style as main Toolbar) */}
      <div className="px-3 py-2 bg-[#ede5d8] border border-[#c9c9c9] rounded-full flex items-center gap-1 shadow-2xl backdrop-blur-xs text-stone-700">
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.92 }}
          onClick={() => setIsCollapsed(!isCollapsed)}
          title={isCollapsed ? 'Розгорнути мінімапу' : 'Згорнути мінімапу'}
          className={`p-1.5 rounded-full transition-all cursor-pointer ${
            !isCollapsed ? 'text-stone-900 bg-stone-300/70 font-bold' : 'text-stone-600 hover:text-stone-900'
          }`}
        >
          <Map className="w-4 h-4" />
        </motion.button>

        <div className="w-[1px] h-4 bg-stone-300/80 mx-0.5" />

        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.92 }}
          onClick={onZoomOut}
          title="Зменшити масштаб (-)"
          className="p-1.5 rounded-full text-stone-600 hover:text-stone-900 transition-all cursor-pointer"
        >
          <ZoomOut className="w-4 h-4" />
        </motion.button>

        <span className="text-xs font-mono text-stone-700 font-medium px-1 min-w-[36px] text-center select-none">
          {Math.round(scale * 100)}%
        </span>

        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.92 }}
          onClick={onZoomIn}
          title="Збільшити масштаб (+)"
          className="p-1.5 rounded-full text-stone-600 hover:text-stone-900 transition-all cursor-pointer"
        >
          <ZoomIn className="w-4 h-4" />
        </motion.button>

        <div className="w-[1px] h-4 bg-stone-300/80 mx-0.5" />

        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.92 }}
          onClick={onZoomToFit}
          title="Показати все (Zoom to fit)"
          className="p-1.5 rounded-full text-stone-600 hover:text-stone-900 transition-all cursor-pointer"
        >
          <Maximize2 className="w-4 h-4" />
        </motion.button>
      </div>
    </div>
  );
};
