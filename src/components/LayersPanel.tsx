/**
 * Cartomancer Fantasy Map Maker - Layers Inspector Drawer
 */

import React from 'react';
import { LayerState, AtmosphereFilter } from '../types';
import {
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Layers as LayersIcon,
  X,
  Sliders,
  Sparkles,
  Grid,
  Type,
  TreePine,
  Spline,
  TrendingUp,
  Paintbrush,
  MountainSnow,
  Waves,
  Cloud,
  Sun,
} from 'lucide-react';

interface LayersPanelProps {
  isOpen: boolean;
  onClose: () => void;
  layers: {
    water: LayerState;
    landmass: LayerState;
    textures: LayerState;
    elevation: LayerState;
    stamps: LayerState;
    paths: LayerState;
    labels: LayerState;
    grid: LayerState;
    atmosphere: LayerState;
  };
  onUpdateLayer: (layerKey: string, updates: Partial<LayerState>) => void;
  stampCount: number;
  pathCount: number;
  labelCount: number;
  atmosphere?: AtmosphereFilter;
  onAtmosphereChange?: (updates: Partial<AtmosphereFilter>) => void;
}

interface LayerMeta {
  key: string;
  name: string;
  icon: React.ElementType;
  description: string;
  countBadge?: number;
}

export const LayersPanel: React.FC<LayersPanelProps> = ({
  isOpen,
  onClose,
  layers,
  onUpdateLayer,
  stampCount,
  pathCount,
  labelCount,
  atmosphere,
  onAtmosphereChange,
}) => {
  if (!isOpen) return null;

  const layerItems: LayerMeta[] = [
    {
      key: 'atmosphere',
      name: 'Atmosphere & Filter',
      icon: Sparkles,
      description: 'Vintage parchment tint, sunlight, and edge vignette',
    },
    {
      key: 'grid',
      name: 'Tactical Grid',
      icon: Grid,
      description: 'Square, Hex, or Isometric battle overlay',
    },
    {
      key: 'labels',
      name: 'Map Labels',
      icon: Type,
      description: 'Kingdom titles, region names, and typography',
      countBadge: labelCount,
    },
    {
      key: 'stamps',
      name: 'Stamps & Objects',
      icon: TreePine,
      description: 'Placed mountains, forests, castles, and assets',
      countBadge: stampCount,
    },
    {
      key: 'paths',
      name: 'Paths & Rivers',
      icon: Spline,
      description: 'Waterways, roads, and territorial borders',
      countBadge: pathCount,
    },
    {
      key: 'elevation',
      name: 'Elevation Relief',
      icon: TrendingUp,
      description: 'Hillshading relief and contour elevation',
    },
    {
      key: 'textures',
      name: 'Biome Textures',
      icon: Paintbrush,
      description: 'Painted grasses, deserts, snow, rocks, and badlands',
    },
    {
      key: 'landmass',
      name: 'Landmass & Coastlines',
      icon: MountainSnow,
      description: 'Continental land mask and foam ripples',
    },
    {
      key: 'water',
      name: 'Ocean Base',
      icon: Waves,
      description: 'Deep abyss ocean and shallow lagoons',
    },
  ];

  return (
    <aside
      id="layers-inspector-drawer"
      className="fixed right-0 top-14 bottom-0 w-80 bg-[#FDF6E3]/98 backdrop-blur-md border-l-2 border-[#E2D6B5] shadow-2xl z-20 flex flex-col select-none text-slate-800"
    >
      {/* Header */}
      <div className="px-4 py-3 bg-[#F4EBD0] border-b border-[#E2D6B5] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <LayersIcon className="w-4 h-4 text-[#FF7E5F]" />
          <h3 className="font-['Cinzel'] font-bold text-sm text-slate-800 tracking-wider">
            Layer Hierarchy
          </h3>
        </div>
        <button
          onClick={onClose}
          className="p-1 text-slate-500 hover:text-slate-800 hover:bg-white rounded transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Layers List */}
      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2">
        {layerItems.map((item) => {
          const state = (layers as any)[item.key] as LayerState;
          if (!state) return null;

          const Icon = item.icon;

          return (
            <div
              key={item.key}
              className={`p-2.5 rounded-lg border transition-all ${
                state.visible
                  ? 'bg-white border-[#E2D6B5] hover:border-[#00BBF9]/60 shadow-xs'
                  : 'bg-[#FDF6E3]/60 border-[#E2D6B5] opacity-60'
              }`}
            >
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <div className="flex items-center gap-2 truncate">
                  <Icon
                    className={`w-4 h-4 shrink-0 ${
                      state.visible ? 'text-[#00BBF9]' : 'text-slate-400'
                    }`}
                  />
                  <span className="text-xs font-bold text-slate-800 truncate">{item.name}</span>
                  {item.countBadge !== undefined && (
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-[#FF7E5F]/15 text-[#D9480F] font-mono font-bold">
                      {item.countBadge}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1">
                  {/* Visibility toggle */}
                  <button
                    onClick={() => onUpdateLayer(item.key, { visible: !state.visible })}
                    className={`p-1 rounded transition-colors ${
                      state.visible
                        ? 'text-slate-700 hover:text-[#00BBF9] hover:bg-slate-100'
                        : 'text-slate-400 hover:text-slate-600'
                    }`}
                    title={state.visible ? 'Hide Layer' : 'Show Layer'}
                  >
                    {state.visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                  </button>

                  {/* Lock toggle */}
                  <button
                    onClick={() => onUpdateLayer(item.key, { locked: !state.locked })}
                    className={`p-1 rounded transition-colors ${
                      state.locked
                        ? 'text-[#D9480F] bg-[#FF7E5F]/15'
                        : 'text-slate-400 hover:text-slate-600'
                    }`}
                    title={state.locked ? 'Unlock Layer' : 'Lock Layer'}
                  >
                    {state.locked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* Opacity slider */}
              <div className="flex items-center gap-2 pl-6">
                <Sliders className="w-3 h-3 text-slate-400" />
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={state.opacity ?? 1}
                  onChange={(e) => onUpdateLayer(item.key, { opacity: Number(e.target.value) })}
                  disabled={!state.visible || state.locked}
                  className="w-full accent-[#00BBF9] cursor-pointer h-1.5 bg-[#EFE5C9] rounded-lg"
                />
                <span className="font-mono text-[10px] text-slate-600 w-7 text-right font-medium">
                  {Math.round((state.opacity ?? 1) * 100)}%
                </span>
              </div>

              {/* Special Atmosphere Controls: Light / Day-Night & Seasonal Particle Physics Fill */}
              {item.key === 'atmosphere' && atmosphere && onAtmosphereChange && state.visible && (
                <div className="mt-2.5 pt-2 border-t border-[#E2D6B5]/70 flex flex-col gap-3 pl-1">
                  {/* Time of Day / Light Control */}
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-slate-800 flex items-center gap-1.5">
                        <Sun className="w-3.5 h-3.5 text-amber-500" />
                        <span>Light & Time of Day</span>
                      </span>
                      <span className="font-mono text-[10px] font-bold text-slate-700">
                        {Math.round((atmosphere.lightIntensity ?? 0.7) * 100)}%
                      </span>
                    </div>

                    <div className="grid grid-cols-4 gap-1">
                      {[
                        { id: 'day', label: 'Day' },
                        { id: 'golden_hour', label: 'Golden' },
                        { id: 'sunset', label: 'Sunset' },
                        { id: 'twilight', label: 'Twilight' },
                        { id: 'night', label: 'Night' },
                        { id: 'torchlight', label: 'Torch' },
                        { id: 'overcast', label: 'Overcast' },
                      ].map((t) => (
                        <button
                          key={t.id}
                          onClick={() => onAtmosphereChange({ timeOfDay: t.id as any })}
                          className={`px-1.5 py-1 rounded text-[10px] font-medium border text-center transition-all cursor-pointer ${
                            (atmosphere.timeOfDay || 'day') === t.id
                              ? 'bg-[#3E2723] text-amber-200 border-[#2D1B18] shadow-xs'
                              : 'bg-white text-slate-700 border-[#E2D6B5] hover:bg-[#FDF6E3]'
                          }`}
                        >
                          {t.label}
                        </button>
                      ))}
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <span className="text-[10px] text-slate-500 font-medium shrink-0">Intensity:</span>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.05"
                        value={atmosphere.lightIntensity ?? 0.7}
                        onChange={(e) => onAtmosphereChange({ lightIntensity: Number(e.target.value) })}
                        className="w-full accent-[#b45309] cursor-pointer h-1.5 bg-[#EFE5C9] rounded-lg"
                      />
                    </div>
                  </div>

                  {/* Seasonal Particle Physics Fill (Static Snow, Autumn, Blossom, Sand) */}
                  <div className="flex flex-col gap-1.5 pt-1 border-t border-[#E2D6B5]/50">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-slate-800 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-cyan-600" />
                        <span>Seasonal Particle Dusting</span>
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-1">
                      {[
                        { id: 'none', label: 'None' },
                        { id: 'snow_winter', label: '❄ Snow / Frost' },
                        { id: 'autumn_leaves', label: '🍂 Autumn' },
                        { id: 'spring_blossom', label: '🌸 Blossom' },
                        { id: 'desert_sand', label: '⏳ Sand Dust' },
                      ].map((s) => (
                        <button
                          key={s.id}
                          onClick={() => onAtmosphereChange({ seasonFill: s.id as any })}
                          className={`px-1.5 py-1 rounded text-[10px] font-medium border text-center transition-all cursor-pointer ${
                            (atmosphere.seasonFill || 'none') === s.id
                              ? 'bg-[#1e293b] text-cyan-200 border-[#0f172a] shadow-xs'
                              : 'bg-white text-slate-700 border-[#E2D6B5] hover:bg-[#FDF6E3]'
                          }`}
                        >
                          {s.label}
                        </button>
                      ))}
                    </div>

                    {(atmosphere.seasonFill && atmosphere.seasonFill !== 'none') && (
                      <div className="flex flex-col gap-1 pt-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-slate-500 font-medium shrink-0">Density:</span>
                          <input
                            type="range"
                            min="0.1"
                            max="1.0"
                            step="0.05"
                            value={atmosphere.seasonDensity ?? 0.5}
                            onChange={(e) => onAtmosphereChange({ seasonDensity: Number(e.target.value) })}
                            className="w-full accent-[#0284c7] cursor-pointer h-1.5 bg-[#EFE5C9] rounded-lg"
                          />
                          <span className="font-mono text-[10px] text-slate-600 w-7 text-right">
                            {Math.round((atmosphere.seasonDensity ?? 0.5) * 100)}%
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-slate-500 font-medium shrink-0">Size:</span>
                          <input
                            type="range"
                            min="1"
                            max="5"
                            step="0.5"
                            value={atmosphere.seasonParticleSize ?? 2}
                            onChange={(e) => onAtmosphereChange({ seasonParticleSize: Number(e.target.value) })}
                            className="w-full accent-[#0284c7] cursor-pointer h-1.5 bg-[#EFE5C9] rounded-lg"
                          />
                          <span className="font-mono text-[10px] text-slate-600 w-7 text-right">
                            {atmosphere.seasonParticleSize ?? 2}px
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Vignette Edge Shading */}
                  <div className="flex items-center gap-2 pt-1 border-t border-[#E2D6B5]/50">
                    <span className="text-[10px] text-slate-500 font-medium shrink-0">Vignette:</span>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={atmosphere.vignette ?? 0.3}
                      onChange={(e) => onAtmosphereChange({ vignette: Number(e.target.value) })}
                      className="w-full accent-[#475569] cursor-pointer h-1.5 bg-[#EFE5C9] rounded-lg"
                    />
                    <span className="font-mono text-[10px] text-slate-600 w-7 text-right">
                      {Math.round((atmosphere.vignette ?? 0.3) * 100)}%
                    </span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer Info */}
      <div className="p-3 bg-[#F4EBD0] border-t border-[#E2D6B5] text-[11px] text-slate-600 text-center font-medium">
        Layers render in bottom-up composite order
      </div>
    </aside>
  );
};
