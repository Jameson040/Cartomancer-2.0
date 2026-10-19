/**
 * Cartomancer Fantasy Map Maker - Dark Studio Layers & Atmosphere Inspector
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
  TreePine,
  Spline,
  TrendingUp,
  Paintbrush,
  MountainSnow,
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
  stampCategoryVisibility?: Record<string, boolean>;
  onToggleStampCategory?: (category: string) => void;
}

interface LayerMeta {
  key: string;
  keys: string[];
  name: string;
  icon: React.ElementType;
  description: string;
  countBadge?: number;
}

export const LayersPanel: React.FC<LayersPanelProps> = React.memo(({
  isOpen,
  onClose,
  layers,
  onUpdateLayer,
  stampCount,
  pathCount,
  labelCount,
  atmosphere,
  onAtmosphereChange,
  stampCategoryVisibility = {},
  onToggleStampCategory,
}) => {
  if (!isOpen) return null;

  const layerItems: LayerMeta[] = [
    { key: 'terrain', keys: ['landmass', 'water'], name: 'Terrain & Coast', icon: MountainSnow, description: 'Land, sea, and coastline boundary' },
    { key: 'biomes', keys: ['textures'], name: 'Biomes & Soil', icon: Paintbrush, description: 'Land and water textures' },
    { key: 'elevation', keys: ['elevation'], name: 'Elevation & Relief', icon: TrendingUp, description: 'Relief, height, and contours' },
    { key: 'paths', keys: ['paths'], name: 'Paths & Rivers', icon: Spline, description: 'Waterways, roads, and borders', countBadge: pathCount },
    { key: 'labels-objects', keys: ['labels', 'stamps'], name: 'Labels & Objects', icon: TreePine, description: 'Names, markers, and map objects', countBadge: labelCount + stampCount },
    { key: 'atmosphere', keys: ['atmosphere'], name: 'Atmosphere & Light', icon: Sun, description: 'Time of day, particles, and vignette' },
  ];

  return (
    <aside
      id="layers-inspector-drawer"
      className="fixed right-0 top-13 bottom-0 w-80 bg-[#0F1623]/98 backdrop-blur-md border-l border-slate-800 shadow-2xl z-20 flex flex-col select-none text-slate-100"
    >
      {/* Header */}
      <div className="px-4 py-3 bg-[#151E2E] border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <LayersIcon className="w-4 h-4 text-amber-400" />
          <h3 className="font-['Cinzel'] font-bold text-sm text-white tracking-wider">
            Layer Hierarchy
          </h3>
        </div>
        <button
          onClick={onClose}
          className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {onToggleStampCategory && (
        <div className="mx-3 mt-3 rounded-xl border border-slate-800 bg-[#151E2E] p-2.5">
          <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            Stamp Visibility Filter
          </div>
          <div className="grid grid-cols-2 gap-1">
            {[
              ['trees', 'Trees'],
              ['mountains', 'Mountains'],
              ['lakes', 'Lakes'],
              ['swamps', 'Swamps'],
              ['forts', 'Forts'],
              ['castles', 'Castles'],
              ['settlements', 'Settlements'],
              ['piers', 'Piers'],
              ['water_maritime', 'Maritime'],
              ['decorations', 'Decorations'],
              ['custom', 'Custom AI'],
            ].map(([category, label]) => {
              const visible = stampCategoryVisibility[category] !== false;
              return (
                <button
                  key={category}
                  onClick={() => onToggleStampCategory(category)}
                  className={`flex items-center justify-between rounded-md border px-2 py-1 text-[10px] font-medium transition-colors cursor-pointer ${
                    visible
                      ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                      : 'border-slate-800 bg-slate-900 text-slate-500 line-through'
                  }`}
                >
                  <span>{label}</span>
                  <span className="text-[9px] font-mono">{visible ? 'ON' : 'OFF'}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Layers List */}
      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2">
        {layerItems.map((item) => {
          const states = item.keys.map((key) => (layers as any)[key] as LayerState).filter(Boolean);
          if (states.length === 0) return null;
          const state: LayerState = {
            id: item.key,
            name: item.name,
            visible: states.every((layer) => layer.visible),
            locked: states.every((layer) => layer.locked),
            opacity: Math.min(...states.map((layer) => layer.opacity ?? 1)),
          };
          const updateGroup = (updates: Partial<LayerState>) =>
            item.keys.forEach((key) => onUpdateLayer(key, updates));
          const Icon = item.icon;

          return (
            <div
              key={item.key}
              className={`p-2.5 rounded-xl border transition-colors ${
                state.visible
                  ? 'bg-[#151E2E] border-slate-800 hover:border-slate-700'
                  : 'bg-[#0B101B] border-slate-800/60 opacity-60'
              }`}
            >
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <div className="flex items-center gap-2 truncate">
                  <Icon
                    className={`w-4 h-4 shrink-0 ${
                      state.visible ? 'text-amber-400' : 'text-slate-500'
                    }`}
                  />
                  <span className="text-xs font-semibold text-slate-100 truncate">
                    {item.name}
                  </span>
                  {item.countBadge !== undefined && (
                    <span className="text-[10px] text-amber-400 font-mono tabular-nums">
                      ({item.countBadge})
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1">
                  <button
                    id={`btn-layer-visibility-${item.key}`}
                    onClick={() => updateGroup({ visible: !state.visible })}
                    className={`p-1 rounded transition-colors cursor-pointer ${
                      state.visible
                        ? 'text-slate-300 hover:text-amber-400 hover:bg-slate-800'
                        : 'text-slate-600 hover:text-slate-400'
                    }`}
                    title={state.visible ? 'Hide Layer' : 'Show Layer'}
                  >
                    {state.visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                  </button>

                  <button
                    id={`btn-layer-lock-${item.key}`}
                    onClick={() => updateGroup({ locked: !state.locked })}
                    className={`p-1 rounded transition-colors cursor-pointer ${
                      state.locked
                        ? 'text-amber-400 bg-amber-500/15'
                        : 'text-slate-500 hover:text-slate-300'
                    }`}
                    title={state.locked ? 'Unlock Layer' : 'Lock Layer'}
                  >
                    {state.locked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* Opacity slider */}
              <div className="flex items-center gap-2 pl-6">
                <Sliders className="w-3 h-3 text-slate-500" />
                <input
                  id={`slider-layer-opacity-${item.key}`}
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={state.opacity ?? 1}
                  onChange={(e) => updateGroup({ opacity: Number(e.target.value) })}
                  disabled={!state.visible || state.locked}
                  className="w-full accent-amber-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
                />
                <span className="font-mono tabular-nums text-[10px] text-slate-400 w-8 text-right">
                  {Math.round((state.opacity ?? 1) * 100)}%
                </span>
              </div>

              {/* Atmosphere Controls */}
              {item.key === 'atmosphere' && atmosphere && onAtmosphereChange && state.visible && (
                <div className="mt-2.5 pt-2 border-t border-slate-800 flex flex-col gap-3 pl-1">
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-medium text-slate-300 flex items-center gap-1.5">
                        <Sun className="w-3.5 h-3.5 text-amber-400" />
                        <span>Time of Day</span>
                      </span>
                      <span className="font-mono tabular-nums text-[10px] text-slate-400">
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
                          className={`px-1.5 py-1 rounded text-[10px] font-medium border text-center transition-colors cursor-pointer ${
                            (atmosphere.timeOfDay || 'day') === t.id
                              ? 'bg-amber-500 text-slate-950 border-amber-400 font-bold'
                              : 'bg-[#0B101B] text-slate-300 border-slate-800 hover:bg-slate-800'
                          }`}
                        >
                          {t.label}
                        </button>
                      ))}
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <span className="text-[10px] text-slate-400 shrink-0">Intensity:</span>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.05"
                        value={atmosphere.lightIntensity ?? 0.7}
                        onChange={(e) =>
                          onAtmosphereChange({ lightIntensity: Number(e.target.value) })
                        }
                        className="w-full accent-amber-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
                      />
                    </div>
                  </div>

                  {/* Seasonal Particle Physics Fill */}
                  <div className="flex flex-col gap-1.5 pt-1 border-t border-slate-800">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-medium text-slate-300 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-sky-400" />
                        <span>Seasonal Particle Dusting</span>
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-1">
                      {[
                        { id: 'none', label: 'None' },
                        { id: 'snow_winter', label: 'Snow / Frost' },
                        { id: 'autumn_leaves', label: 'Autumn' },
                        { id: 'spring_blossom', label: 'Blossom' },
                        { id: 'desert_sand', label: 'Sand Dust' },
                      ].map((s) => (
                        <button
                          key={s.id}
                          onClick={() => onAtmosphereChange({ seasonFill: s.id as any })}
                          className={`px-1.5 py-1 rounded text-[10px] font-medium border text-center transition-colors cursor-pointer ${
                            (atmosphere.seasonFill || 'none') === s.id
                              ? 'bg-sky-500 text-slate-950 border-sky-400 font-bold'
                              : 'bg-[#0B101B] text-slate-300 border-slate-800 hover:bg-slate-800'
                          }`}
                        >
                          {s.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Vignette Edge Shading */}
                  <div className="flex items-center gap-2 pt-1 border-t border-slate-800">
                    <span className="text-[10px] text-slate-400 shrink-0">Vignette:</span>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={atmosphere.vignette ?? 0.3}
                      onChange={(e) => onAtmosphereChange({ vignette: Number(e.target.value) })}
                      className="w-full accent-amber-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
                    />
                    <span className="font-mono tabular-nums text-[10px] text-slate-400 w-8 text-right">
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
      <div className="p-3 bg-[#151E2E] border-t border-slate-800 text-[11px] text-slate-400 text-center">
        Layers render in bottom-up composite order
      </div>
    </aside>
  );
});
