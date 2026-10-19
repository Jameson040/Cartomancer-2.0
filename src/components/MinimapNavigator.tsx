import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Compass, Minimize2, Maximize2, Crosshair, Expand } from 'lucide-react';
import { CanvasDimensions } from '../types';

interface MinimapNavigatorProps {
  mainCanvasRef: React.RefObject<HTMLCanvasElement | null>;
  viewportRef: React.RefObject<HTMLDivElement | null>;
  dimensions: CanvasDimensions;
  zoom: number;
  pan: { x: number; y: number };
  onPanChange: (nextPan: { x: number; y: number }) => void;
  onFitToScreen: () => void;
  onResizeCanvas?: (width: number, height: number) => void;
  renderTrigger?: number;
}

const SIZE_PRESETS = [
  { label: '1.6K', width: 1600, height: 1000, title: '1600 × 1000 (Standard Realm)' },
  { label: '2.2K', width: 2200, height: 1400, title: '2200 × 1400 (2K Studio HD)' },
  { label: '2.8K', width: 2800, height: 1800, title: '2800 × 1800 (3K Continental)' },
  { label: '3.6K', width: 3600, height: 2250, title: '3600 × 2250 (4K World Atlas)' },
];

export const MinimapNavigator: React.FC<MinimapNavigatorProps> = React.memo(({
  mainCanvasRef,
  viewportRef,
  dimensions,
  zoom,
  pan,
  onPanChange,
  onFitToScreen,
  onResizeCanvas,
  renderTrigger = 0,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const miniCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const MINI_W = 196;
  const MINI_H = Math.max(96, Math.round((MINI_W * dimensions.height) / dimensions.width));

  const drawMinimap = useCallback(() => {
    if (isCollapsed) return;
    const mini = miniCanvasRef.current;
    const main = mainCanvasRef.current;
    if (!mini || !main) return;
    const ctx = mini.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, MINI_W, MINI_H);
    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, MINI_W, MINI_H);

    try {
      ctx.drawImage(main, 0, 0, MINI_W, MINI_H);
    } catch {
      // Ignore if main canvas is not ready
    }

    // Draw current viewport bounding box
    const vp = viewportRef.current;
    const viewW = vp ? vp.clientWidth : 1200;
    const viewH = vp ? vp.clientHeight : 800;

    const scaleX = MINI_W / dimensions.width;
    const scaleY = MINI_H / dimensions.height;

    const visibleWorldX = -pan.x / zoom;
    const visibleWorldY = -pan.y / zoom;
    const visibleWorldW = viewW / zoom;
    const visibleWorldH = viewH / zoom;

    const rx = visibleWorldX * scaleX;
    const ry = visibleWorldY * scaleY;
    const rw = visibleWorldW * scaleX;
    const rh = visibleWorldH * scaleY;

    // Dim outside area slightly when zoomed in
    ctx.save();
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 1.75;
    ctx.fillStyle = 'rgba(245, 158, 11, 0.12)';
    ctx.beginPath();
    ctx.rect(
      Math.max(0, rx),
      Math.max(0, ry),
      Math.min(MINI_W, rw),
      Math.min(MINI_H, rh)
    );
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }, [isCollapsed, mainCanvasRef, viewportRef, dimensions.width, dimensions.height, zoom, pan, MINI_W, MINI_H]);

  useEffect(() => {
    const raf = requestAnimationFrame(drawMinimap);
    return () => cancelAnimationFrame(raf);
  }, [drawMinimap, renderTrigger]);

  // Periodic low-frequency refresh so brush strokes reflect in minimap without slowing down strokes
  useEffect(() => {
    if (isCollapsed) return;
    const interval = window.setInterval(drawMinimap, 450);
    return () => clearInterval(interval);
  }, [isCollapsed, drawMinimap]);

  const teleportToMiniPoint = useCallback(
    (clientX: number, clientY: number) => {
      const mini = miniCanvasRef.current;
      const vp = viewportRef.current;
      if (!mini || !vp) return;
      const rect = mini.getBoundingClientRect();
      const normX = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      const normY = Math.max(0, Math.min(1, (clientY - rect.top) / rect.height));

      const worldX = normX * dimensions.width;
      const worldY = normY * dimensions.height;

      const nextPanX = Math.round(vp.clientWidth / 2 - worldX * zoom);
      const nextPanY = Math.round(vp.clientHeight / 2 - worldY * zoom);

      onPanChange({ x: nextPanX, y: nextPanY });
    },
    [dimensions.width, dimensions.height, zoom, onPanChange, viewportRef]
  );

  useEffect(() => {
    if (!isDragging) return;
    const handleWindowMove = (e: MouseEvent) => {
      teleportToMiniPoint(e.clientX, e.clientY);
    };
    const handleWindowUp = () => {
      setIsDragging(false);
    };
    window.addEventListener('mousemove', handleWindowMove);
    window.addEventListener('mouseup', handleWindowUp);
    return () => {
      window.removeEventListener('mousemove', handleWindowMove);
      window.removeEventListener('mouseup', handleWindowUp);
    };
  }, [isDragging, teleportToMiniPoint]);

  if (isCollapsed) {
    return (
      <div className="absolute bottom-3 right-3 z-20 flex items-center gap-1.5">
        <button
          id="btn-expand-minimap"
          onClick={() => setIsCollapsed(false)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#0F1623]/95 hover:bg-[#162032] text-slate-200 border border-slate-700/80 shadow-xl text-xs font-medium transition-colors cursor-pointer"
          title="Expand World Navigator & Canvas Size Controls"
        >
          <Compass className="w-3.5 h-3.5 text-amber-400" />
          <span>Navigator</span>
          <span className="font-mono tabular-nums text-[10px] text-slate-400">
            {dimensions.width}×{dimensions.height}
          </span>
          <Maximize2 className="w-3 h-3 text-slate-400" />
        </button>
      </div>
    );
  }

  return (
    <div
      id="minimap-navigator"
      className="absolute bottom-3 right-3 z-20 w-[212px] bg-[#0F1623]/95 backdrop-blur-md border border-slate-700/80 rounded-xl shadow-2xl overflow-hidden select-none text-slate-200"
    >
      {/* Header */}
      <div className="px-2.5 py-1.5 bg-[#151E2E] border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Compass className="w-3.5 h-3.5 text-amber-400" />
          <span className="text-[11px] font-semibold tracking-wide text-slate-200">
            Navigator
          </span>
          <span className="font-mono tabular-nums text-[10px] text-amber-400/90">
            {Math.round(zoom * 100)}%
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            id="btn-minimap-fit"
            onClick={onFitToScreen}
            className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors cursor-pointer"
            title="Fit Map to Screen"
          >
            <Crosshair className="w-3 h-3" />
          </button>
          <button
            id="btn-collapse-minimap"
            onClick={() => setIsCollapsed(true)}
            className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors cursor-pointer"
            title="Minimize Navigator"
          >
            <Minimize2 className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Interactive Minimap Canvas */}
      <div className="p-2 flex flex-col items-center bg-[#090D14]">
        <div
          className="relative rounded border border-slate-700/90 overflow-hidden cursor-crosshair shadow-inner"
          style={{ width: MINI_W, height: MINI_H }}
          onMouseDown={(e) => {
            e.stopPropagation();
            setIsDragging(true);
            teleportToMiniPoint(e.clientX, e.clientY);
          }}
        >
          <canvas
            ref={miniCanvasRef}
            width={MINI_W}
            height={MINI_H}
            className="block w-full h-full"
          />
        </div>
      </div>

      {/* Canvas Resolution Switcher Footer */}
      {onResizeCanvas && (
        <div className="px-2 py-1.5 bg-[#151E2E] border-t border-slate-800 flex items-center justify-between gap-1">
          <span className="text-[10px] text-slate-400 flex items-center gap-1 shrink-0" title="Switch Map Canvas Resolution">
            <Expand className="w-2.5 h-2.5 text-sky-400" />
            <span>Size:</span>
          </span>
          <div className="flex items-center gap-1">
            {SIZE_PRESETS.map((preset) => {
              const active =
                dimensions.width === preset.width && dimensions.height === preset.height;
              return (
                <button
                  key={preset.label}
                  id={`btn-canvas-size-${preset.label.toLowerCase().replace('.', '')}`}
                  onClick={() => {
                    if (!active) onResizeCanvas(preset.width, preset.height);
                  }}
                  title={preset.title}
                  className={`px-1.5 py-0.5 rounded text-[10px] font-mono tabular-nums font-semibold transition-colors cursor-pointer ${
                    active
                      ? 'bg-amber-500 text-slate-950 font-bold'
                      : 'bg-slate-800/90 text-slate-300 hover:bg-slate-700 hover:text-white'
                  }`}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
});
