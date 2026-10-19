/**
 * Cartomancer Fantasy Map Maker - Merak-Inspired Categorized Left Tool Rail
 */

import React from 'react';
import {
  MousePointer,
  MountainSnow,
  Paintbrush,
  TrendingUp,
  TreePine,
  Spline,
  Shield,
  Type,
  Grid,
  Eraser,
  Layers,
  Globe,
} from 'lucide-react';
import { ToolType } from '../types';

interface ToolPaletteProps {
  activeTool: ToolType;
  onSelectTool: (tool: ToolType) => void;
  onOpenAssetOutliner?: () => void;
  onOpenWorldAdvisor?: () => void;
  assetCount?: number;
  isToolSettingsOpen?: boolean;
}

interface ToolDefinition {
  id: ToolType;
  name: string;
  hotkey: string;
  group: 'terrain' | 'atlas' | 'utility';
  icon: React.ElementType;
  description: string;
}

const TOOLS: ToolDefinition[] = [
  {
    id: 'select',
    name: 'Select & Transform',
    hotkey: 'V',
    group: 'terrain',
    icon: MousePointer,
    description: 'Select, move, scale, or rotate placed stamps, territories, paths, and labels',
  },
  {
    id: 'mask',
    name: 'Landmass Sculptor',
    hotkey: 'M',
    group: 'terrain',
    icon: MountainSnow,
    description: 'Sculpt continents, islands, and coastlines (Add Land / Carve Ocean)',
  },
  {
    id: 'elevation',
    name: 'Elevation Sculptor',
    hotkey: 'E',
    group: 'terrain',
    icon: TrendingUp,
    description: 'Paint elevation contour heights, mountain ridges, and hillshading relief',
  },
  {
    id: 'brush',
    name: 'Biome Texture Brush',
    hotkey: 'B',
    group: 'terrain',
    icon: Paintbrush,
    description: 'Paint biomes: meadows, deserts, snow, rocks, marshes, volcanic soil',
  },
  {
    id: 'path',
    name: 'Path & River Pen',
    hotkey: 'P',
    group: 'atlas',
    icon: Spline,
    description: 'Draw winding rivers, cobblestone roads, and trade routes',
  },
  {
    id: 'territory',
    name: 'Political Territory',
    hotkey: 'R',
    group: 'atlas',
    icon: Shield,
    description: 'Draw kingdom regions and political territories with inner border glow',
  },
  {
    id: 'stamp',
    name: 'Stamp Placement',
    hotkey: 'S',
    group: 'atlas',
    icon: TreePine,
    description: 'Place mountains, forests, castles, and custom uploaded AI assets',
  },
  {
    id: 'text',
    name: 'Fantasy Map Labels',
    hotkey: 'T',
    group: 'atlas',
    icon: Type,
    description: 'Add ornate medieval and fantasy typography annotations',
  },
  {
    id: 'grid',
    name: 'Map Grid Overlay',
    hotkey: 'G',
    group: 'utility',
    icon: Grid,
    description: 'Configure tactical square, hexagonal, or isometric map grids',
  },
  {
    id: 'eraser',
    name: 'Eraser & Thinning',
    hotkey: 'X',
    group: 'utility',
    icon: Eraser,
    description: 'Erase or probabilistically thin out placed stamps, paths, territories, or labels',
  },
];

export const ToolPalette: React.FC<ToolPaletteProps> = React.memo(({
  activeTool,
  onSelectTool,
  onOpenAssetOutliner,
  onOpenWorldAdvisor,
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
      } else if (key === 'W' && onOpenWorldAdvisor) {
        e.preventDefault();
        onOpenWorldAdvisor();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onSelectTool, onOpenAssetOutliner, onOpenWorldAdvisor]);

  return (
    <aside
      id="tool-palette"
      className="w-14 bg-[#0B101B] border-r border-slate-800 flex flex-col items-center py-2.5 gap-1.5 z-20 select-none justify-between"
    >
      <div className="flex flex-col gap-1 w-full px-2">
        {TOOLS.map((tool, index) => {
          const Icon = tool.icon;
          const isActive = activeTool === tool.id;
          const prevGroup = index > 0 ? TOOLS[index - 1].group : tool.group;
          const showDivider = prevGroup !== tool.group;

          return (
            <React.Fragment key={tool.id}>
              {showDivider && <div className="h-[1px] w-7 mx-auto bg-slate-800 my-1" />}
              <button
                id={`tool-btn-${tool.id}`}
                onClick={() => onSelectTool(tool.id)}
                className={`group relative w-10 h-10 rounded-xl flex items-center justify-center transition-colors cursor-pointer ${
                  isActive
                    ? 'bg-amber-500 text-slate-950 font-bold shadow-md'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-[#162032]'
                }`}
                title={`${tool.name} (${tool.hotkey}) - ${
                  isActive && isToolSettingsOpen
                    ? 'Click to collapse settings panel'
                    : tool.description
                }`}
              >
                <Icon className="w-4.5 h-4.5" />

                {/* Hotkey Badge */}
                <span
                  className={`absolute bottom-0.5 right-1 text-[9px] font-mono font-bold leading-none ${
                    isActive ? 'text-slate-950' : 'text-slate-500 group-hover:text-slate-300'
                  }`}
                >
                  {tool.hotkey}
                </span>

                {/* Panel Open Indicator Pip */}
                {isActive && isToolSettingsOpen && (
                  <span className="absolute -right-2 top-1/2 -translate-y-1/2 w-1 h-4 bg-amber-400 rounded-l-full" />
                )}

                {/* Floating Tooltip */}
                <div className="pointer-events-none absolute left-full ml-3 px-3 py-2 bg-[#0F1623] text-slate-100 text-xs font-semibold rounded-xl shadow-2xl border border-slate-700 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-50">
                  <div className="flex items-center gap-2">
                    <span>{tool.name}</span>
                    <span className="text-amber-400 font-mono text-[10px]">
                      [{tool.hotkey}]
                    </span>
                  </div>
                  <div className="text-[10px] font-normal text-slate-400 max-w-xs text-left mt-0.5">
                    {tool.description}
                  </div>
                </div>
              </button>
            </React.Fragment>
          );
        })}
      </div>

      {/* Bottom Studio Buttons: Planet Advisor & Asset Outliner */}
      <div className="w-full px-2 pt-2 border-t border-slate-800 flex flex-col items-center gap-1.5">
        {onOpenWorldAdvisor && (
          <button
            id="tool-palette-world-advisor-btn"
            onClick={onOpenWorldAdvisor}
            className="group relative w-10 h-10 rounded-xl flex items-center justify-center transition-colors bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 cursor-pointer"
            title="Planet Advisor & Canvas Size Studio (W)"
          >
            <Globe className="w-4.5 h-4.5" />
            <span className="absolute bottom-0.5 right-1 text-[9px] font-mono font-bold leading-none text-amber-400/80">
              W
            </span>
          </button>
        )}

        {onOpenAssetOutliner && (
          <button
            id="tool-palette-asset-table-btn"
            onClick={onOpenAssetOutliner}
            className="group relative w-10 h-10 rounded-xl flex items-center justify-center transition-colors bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 cursor-pointer"
            title="Master Asset Outliner (L) - Search, Select, Locate and Delete rendered elements"
          >
            <Layers className="w-4.5 h-4.5" />
            {assetCount !== undefined && assetCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-emerald-500 text-slate-950 text-[9px] font-mono tabular-nums font-bold px-1 rounded-full">
                {assetCount > 99 ? '99+' : assetCount}
              </span>
            )}
          </button>
        )}
      </div>
    </aside>
  );
});
