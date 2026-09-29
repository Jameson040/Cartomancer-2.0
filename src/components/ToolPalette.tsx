/**
 * Cartomancer Fantasy Map Maker - Left Tool Palette
 */

import React from 'react';
import {
  MousePointer,
  MountainSnow,
  Paintbrush,
  PaintBucket,
  TrendingUp,
  TreePine,
  Spline,
  Type,
  Grid,
  Eraser,
  Layers,
} from 'lucide-react';
import { ToolType } from '../types';

interface ToolPaletteProps {
  activeTool: ToolType;
  onSelectTool: (tool: ToolType) => void;
  onOpenAssetOutliner?: () => void;
  assetCount?: number;
  isToolSettingsOpen?: boolean;
}

interface ToolDefinition {
  id: ToolType;
  name: string;
  hotkey: string;
  icon: React.ElementType;
  description: string;
}

const TOOLS: ToolDefinition[] = [
  {
    id: 'select',
    name: 'Select & Move',
    hotkey: 'V',
    icon: MousePointer,
    description: 'Select, move, scale, or rotate placed stamps and labels',
  },
  {
    id: 'mask',
    name: 'Landmass Sculptor',
    hotkey: 'M',
    icon: MountainSnow,
    description: 'Sculpt continents, islands, and coastlines (Add Land / Carve Ocean)',
  },
  {
    id: 'brush',
    name: 'Biome Texture Brush',
    hotkey: 'B',
    icon: Paintbrush,
    description: 'Paint biomes: meadows, deserts, snow, rocks, marshes, volcanic soil',
  },
  {
    id: 'fill',
    name: 'Region Fill',
    hotkey: 'F',
    icon: PaintBucket,
    description: 'Fill a connected land, water, or biome region in one click',
  },
  {
    id: 'elevation',
    name: 'Elevation Sculptor',
    hotkey: 'E',
    icon: TrendingUp,
    description: 'Paint elevation contour heights and hillshading relief',
  },
  {
    id: 'stamp',
    name: 'Stamp Placement',
    hotkey: 'S',
    icon: TreePine,
    description: 'Place mountains, forests, castles, and custom uploaded assets',
  },
  {
    id: 'path',
    name: 'Path & River Pen',
    hotkey: 'P',
    icon: Spline,
    description: 'Draw winding rivers, cobblestone roads, and kingdom borders',
  },
  {
    id: 'text',
    name: 'Fantasy Map Labels',
    hotkey: 'T',
    icon: Type,
    description: 'Add ornate medieval and fantasy typography annotations',
  },
  {
    id: 'grid',
    name: 'Map Grid Overlay',
    hotkey: 'G',
    icon: Grid,
    description: 'Configure tactical square, hexagonal, or isometric map grids',
  },
  {
    id: 'eraser',
    name: 'Eraser',
    hotkey: 'X',
    icon: Eraser,
    description: 'Erase placed stamps, paths, or labels',
  },
];

export const ToolPalette: React.FC<ToolPaletteProps> = ({
  activeTool,
  onSelectTool,
  onOpenAssetOutliner,
  assetCount,
  isToolSettingsOpen = false,
}) => {
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return;
      }

      if (e.metaKey || e.ctrlKey || e.altKey) return;

      const key = e.key.toUpperCase();
      const match = TOOLS.find((t) => t.hotkey === key);
      if (match) {
        e.preventDefault();
        onSelectTool(match.id);
      } else if (key === 'L' && onOpenAssetOutliner) {
        e.preventDefault();
        onOpenAssetOutliner();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onSelectTool, onOpenAssetOutliner]);

  return (
    <aside
      id="tool-palette"
      className="w-14 bg-[#FDF6E3] border-r-2 border-[#E2D6B5] shadow-xs flex flex-col items-center py-3 gap-2 z-20 select-none justify-between"
    >
      <div className="flex flex-col gap-1.5 w-full px-2">
        {TOOLS.map((tool) => {
          const Icon = tool.icon;
          const isActive = activeTool === tool.id;

          return (
            <button
              key={tool.id}
              id={`tool-btn-${tool.id}`}
              onClick={() => onSelectTool(tool.id)}
              className={`group relative w-10 h-10 rounded-lg flex items-center justify-center transition-all ${
                isActive
                  ? 'bg-gradient-to-br from-[#00BBF9] to-[#0096C7] text-white shadow-md shadow-[#00BBF9]/30 ring-2 ring-[#00BBF9]/40 scale-105'
                  : 'text-slate-600 hover:text-[#FF7E5F] hover:bg-white/80 active:scale-95'
              }`}
              title={`${tool.name} (${tool.hotkey}) - ${
                isActive && isToolSettingsOpen
                  ? 'Click to collapse settings panel'
                  : tool.description
              }`}
            >
              <Icon className="w-5 h-5" />

              {/* Hotkey Badge */}
              <span
                className={`absolute bottom-0.5 right-1 text-[9px] font-mono font-bold leading-none ${
                  isActive ? 'text-white/90' : 'text-slate-400 group-hover:text-slate-600'
                }`}
              >
                {tool.hotkey}
              </span>

              {/* Panel Open Indicator Pip */}
              {isActive && isToolSettingsOpen && (
                <span className="absolute -right-1.5 top-1/2 -translate-y-1/2 w-1 h-3.5 bg-amber-400 rounded-l-full shadow-xs" />
              )}

              {/* Floating Tooltip */}
              <div className="pointer-events-none absolute left-full ml-3 px-2.5 py-1.5 bg-[#2D3748] text-white text-xs font-semibold rounded-md shadow-xl border border-slate-600 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-50">
                <div className="flex items-center gap-1.5">
                  <span>{tool.name}</span>
                  <span className="bg-[#00BBF9]/30 text-[#00BBF9] px-1 py-0.5 rounded text-[10px] font-mono">
                    {tool.hotkey}
                  </span>
                </div>
                <div className="text-[10px] font-normal text-slate-300 max-w-xs text-left">
                  {tool.description}
                </div>
                {isActive && (
                  <div className="text-[9px] font-mono text-amber-300 pt-0.5 border-t border-slate-600/70 mt-1">
                    {isToolSettingsOpen ? 'Click icon to collapse panel' : 'Click icon to open panel'}
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Asset Table Outliner Bottom Button */}
      {onOpenAssetOutliner && (
        <div className="w-full px-2 pt-2 border-t border-[#E2D6B5] flex flex-col items-center">
          <button
            id="tool-palette-asset-table-btn"
            onClick={onOpenAssetOutliner}
            className="group relative w-10 h-10 rounded-lg flex items-center justify-center transition-all bg-[#14532d]/10 hover:bg-[#14532d]/20 text-[#14532d] border border-[#14532d]/30 shadow-xs"
            title="Master Asset Table (L) - Search, Select, Locate and Delete rendered elements"
          >
            <Layers className="w-5 h-5" />
            {assetCount !== undefined && assetCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-[#14532d] text-white text-[9px] font-bold px-1 rounded-full">
                {assetCount > 99 ? '99+' : assetCount}
              </span>
            )}

            {/* Floating Tooltip */}
            <div className="pointer-events-none absolute left-full ml-3 px-2.5 py-1.5 bg-[#2D3748] text-white text-xs font-semibold rounded-md shadow-xl border border-slate-600 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-50">
              <div className="flex items-center gap-1.5">
                <span>Asset Table & Outliner</span>
                <span className="bg-[#14532d]/50 text-teal-300 px-1 py-0.5 rounded text-[10px] font-mono">
                  L
                </span>
              </div>
              <div className="text-[10px] font-normal text-slate-300 max-w-xs text-left">
                Table of all {assetCount ?? 0} elements: search, filter, highlight, and delete rivers, cities & trees.
              </div>
            </div>
          </button>
        </div>
      )}
    </aside>
  );
};
