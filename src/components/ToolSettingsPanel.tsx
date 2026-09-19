/**
 * Cartomancer Fantasy Map Maker - Left Tool Options Side Panel
 * Replaces the horizontal top bar with a dedicated docked left-side panel that
 * opens adjacent to the tool palette.
 */

import React from 'react';
import {
  MousePointer,
  MountainSnow,
  Paintbrush,
  TrendingUp,
  TreePine,
  Spline,
  Type,
  Grid as GridIcon,
  Eraser,
  X,
  RotateCw,
  RotateCcw,
  FlipHorizontal,
  Trash2,
  Copy,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Maximize2,
  Sparkles,
  Layers,
  CheckCircle,
} from 'lucide-react';
import {
  ToolType,
  BrushSettings,
  PlacedStamp,
  PlacedText,
  PlacedPath,
  StampAsset,
  BiomePreset,
  PathStyle,
  BiomeTexture,
} from '../types';
import { DEFAULT_BIOMES } from '../data/defaultAssets';

interface ToolSettingsPanelProps {
  activeTool: ToolType;
  onClose: () => void;
  brushSettings: BrushSettings;
  onUpdateBrushSettings: (settings: Partial<BrushSettings>) => void;
  // Selected items & transformations
  selectedStamp: PlacedStamp | null;
  selectedLabel: PlacedText | null;
  selectedPath: PlacedPath | null;
  onUpdateSelectedStamp: (updates: Partial<PlacedStamp>) => void;
  onUpdateSelectedLabel: (updates: Partial<PlacedText>) => void;
  onDeleteSelectedStamp: () => void;
  onDeleteSelectedLabel: () => void;
  onDeleteSelectedPath: () => void;
  onDuplicateSelectedStamp: () => void;
  onDuplicateSelectedLabel: () => void;
  onBringStampToFront: () => void;
  onSendStampToBack: () => void;
  // Stamp options
  selectedStampAsset: StampAsset | null;
  onOpenAssetLibrary: () => void;
  // Path options
  activePathStyle?: PathStyle;
  onPathStyleChange?: (style: PathStyle) => void;
  pathColor: string;
  onPathColorChange: (color: string) => void;
  pathTaper: boolean;
  onPathTaperChange: (taper: boolean) => void;
  pathDoubleLine: boolean;
  onPathDoubleLineChange: (val: boolean) => void;
  activePathDraft: any | null;
  onFinishActivePath: () => void;
  // Label options
  activeTextString: string;
  onTextStringChange: (text: string) => void;
  activeFontFamily: string;
  onFontFamilyChange: (font: string) => void;
  activeFontSize: number;
  onFontSizeChange: (size: number) => void;
  activeTextColor: string;
  onTextColorChange: (color: string) => void;
  activeBannerStyle: string;
  onBannerStyleChange: (style: any) => void;
  textCurvature: number;
  onTextCurvatureChange: (curv: number) => void;
  textPresetStyle: string;
  onTextPresetStyleChange: (style: string) => void;
  // Elevation options
  onHydraulicErosion: () => void;
  // Biome Textures & Shader Lab
  activeBiome: BiomePreset;
  onSelectBiome: (biome: BiomePreset) => void;
  customBiomes?: BiomeTexture[];
  onOpenShaderLab?: () => void;
}

const BIOMES: { id: BiomePreset; label: string; color: string; desc: string }[] = [
  { id: 'grassland', label: 'Verdant Meadow', color: '#606c38', desc: 'Lush temperate plains & valleys' },
  { id: 'ancient_forest', label: 'Ancient Forest', color: '#283618', desc: 'Dense canopy & evergreen groves' },
  { id: 'arid_desert', label: 'Sunken Desert', color: '#dda15e', desc: 'Dunes, badlands & sunbaked clay' },
  { id: 'arctic_frost', label: 'Glacial Tundra', color: '#e0f2fe', desc: 'Permafrost, snowfields & blue ice' },
  { id: 'rocky_crags', label: 'Granite Peaks', color: '#78716c', desc: 'Exposed stone & scree highlands' },
  { id: 'marshland', label: 'Murky Fen', color: '#4d7c0f', desc: 'Wetlands, mossy bogs & peat' },
  { id: 'volcanic_ash', label: 'Volcanic Wastes', color: '#451a03', desc: 'Basalt, obsidian & scorched earth' },
];

const FONT_OPTIONS = [
  { value: "'Cinzel Decorative', serif", label: 'Cinzel Decorative (Imperial)' },
  { value: "'MedievalSharp', cursive", label: 'Medieval Sharp (Gothic)' },
  { value: "'Uncial Antiqua', cursive", label: 'Uncial Antiqua (Ancient)' },
  { value: "'Pirata One', cursive", label: 'Pirata One (Nautical)' },
  { value: 'serif', label: 'Classic Serif' },
];

export const ToolSettingsPanel: React.FC<ToolSettingsPanelProps> = ({
  activeTool,
  onClose,
  brushSettings,
  onUpdateBrushSettings,
  selectedStamp,
  selectedLabel,
  selectedPath,
  onUpdateSelectedStamp,
  onUpdateSelectedLabel,
  onDeleteSelectedStamp,
  onDeleteSelectedLabel,
  onDeleteSelectedPath,
  onDuplicateSelectedStamp,
  onDuplicateSelectedLabel,
  onBringStampToFront,
  onSendStampToBack,
  selectedStampAsset,
  onOpenAssetLibrary,
  activePathStyle = 'river',
  onPathStyleChange,
  pathColor,
  onPathColorChange,
  pathTaper,
  onPathTaperChange,
  pathDoubleLine,
  onPathDoubleLineChange,
  activePathDraft,
  onFinishActivePath,
  activeTextString,
  onTextStringChange,
  activeFontFamily,
  onFontFamilyChange,
  activeFontSize,
  onFontSizeChange,
  activeTextColor,
  onTextColorChange,
  activeBannerStyle,
  onBannerStyleChange,
  textCurvature,
  onTextCurvatureChange,
  onHydraulicErosion,
  activeBiome,
  onSelectBiome,
  customBiomes = [],
  onOpenShaderLab,
}) => {
  // Tool meta title & icon
  const getToolMeta = () => {
    switch (activeTool) {
      case 'select':
        return { title: 'Select & Transform', icon: MousePointer, subtitle: 'Transform, move & style objects' };
      case 'mask':
        return { title: 'Landmass Sculptor', icon: MountainSnow, subtitle: 'Add continents or carve oceans' };
      case 'brush':
        return { title: 'Biome Textures', icon: Paintbrush, subtitle: 'Paint natural terrain biomes' };
      case 'elevation':
        return { title: 'Elevation Sculptor', icon: TrendingUp, subtitle: 'Contour heights & mountain ridges' };
      case 'stamp':
        return { title: 'Stamp Placement', icon: TreePine, subtitle: 'Place mountains, castles & trees' };
      case 'path':
        return { title: 'Paths & Rivers Pen', icon: Spline, subtitle: 'Vector waterways & road paths' };
      case 'text':
        return { title: 'Map Labeling', icon: Type, subtitle: 'Cartographic typography & ribbons' };
      case 'eraser':
        return { title: 'Feature Eraser', icon: Eraser, subtitle: 'Click to delete or sweep brush' };
      case 'grid':
        return { title: 'Tactical Grid Overlay', icon: GridIcon, subtitle: 'Cartographic scale & grids' };
      default:
        return { title: 'Tool Options', icon: Sparkles, subtitle: 'Adjust tool parameters' };
    }
  };

  const meta = getToolMeta();
  const ToolIcon = meta.icon;

  return (
    <aside
      id="left-tool-settings-panel"
      className="fixed left-14 top-14 bottom-0 w-80 bg-[#FAF6EC]/98 backdrop-blur-md border-r-2 border-[#E2D6B5] flex flex-col z-20 shadow-2xl overflow-hidden select-none animate-in slide-in-from-left-4 duration-150"
    >
      {/* Header */}
      <div className="p-3.5 border-b border-[#E2D6B5] bg-[#F4EBD0]/60 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#3E2723] text-amber-200 flex items-center justify-center shadow-xs">
            <ToolIcon className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-serif font-bold text-sm text-slate-900 leading-tight">
              {meta.title}
            </h3>
            <p className="text-[11px] text-slate-500">{meta.subtitle}</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-[#E2D6B5]/60 transition-colors cursor-pointer"
          title="Close Tool Options Panel"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Content Area with smooth scroll */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 text-xs text-slate-700">
        {/* ============================================================== */}
        {/* 1. SELECT & TRANSFORM TOOL */}
        {/* ============================================================== */}
        {activeTool === 'select' && (
          <div className="flex flex-col gap-4">
            {selectedStamp ? (
              <div className="flex flex-col gap-3.5 bg-white/70 p-3 rounded-xl border border-[#E2D6B5]">
                <div className="flex items-center justify-between border-b border-[#E2D6B5]/70 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
                    <span className="font-bold text-slate-800 text-[12px]">Selected Asset</span>
                  </div>
                  <span className="font-mono text-[10px] text-slate-500">ID: {selectedStamp.id.slice(0, 6)}</span>
                </div>

                {/* Scale Slider & Custom Numeric Input */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="font-semibold text-slate-700">Asset Scale</span>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min="1"
                        max="1000"
                        step="1"
                        value={Math.round((selectedStamp.scale ?? 1.0) * 100)}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          if (!isNaN(val) && val > 0) {
                            onUpdateSelectedStamp({ scale: Math.max(0.05, Math.min(10, val / 100)) });
                          }
                        }}
                        onKeyDown={(e) => {
                          // Restrict to only number keys, backspace, delete, arrows
                          if (!/[\d]|Backspace|Delete|ArrowUp|ArrowDown|ArrowLeft|ArrowRight|Tab/.test(e.key)) {
                            e.preventDefault();
                          }
                        }}
                        className="w-14 px-1.5 py-0.5 text-right font-mono font-bold text-amber-900 bg-white border border-[#E2D6B5] rounded text-[11px] focus:outline-none focus:ring-1 focus:ring-amber-500"
                      />
                      <span className="text-[10px] text-slate-500 font-mono">%</span>
                    </div>
                  </div>
                  <input
                    type="range"
                    min="0.2"
                    max="3.5"
                    step="0.05"
                    value={Math.min(3.5, Math.max(0.2, selectedStamp.scale ?? 1.0))}
                    onChange={(e) => onUpdateSelectedStamp({ scale: Number(e.target.value) })}
                    className="w-full accent-amber-600 cursor-pointer h-1.5 bg-[#EFE5C9] rounded-lg"
                  />
                  <div className="flex gap-1.5 pt-0.5">
                    <button
                      onClick={() => onUpdateSelectedStamp({ scale: Math.max(0.1, Number(((selectedStamp.scale ?? 1.0) - 0.1).toFixed(2))) })}
                      className="flex-1 py-1 rounded bg-[#F4EBD0] hover:bg-[#EFE5C9] font-medium border border-[#E2D6B5] text-[10px] cursor-pointer"
                    >
                      -10%
                    </button>
                    <button
                      onClick={() => onUpdateSelectedStamp({ scale: 1.0 })}
                      className="px-2 py-1 rounded bg-[#F4EBD0] hover:bg-[#EFE5C9] font-medium border border-[#E2D6B5] text-[10px] cursor-pointer"
                    >
                      100%
                    </button>
                    <button
                      onClick={() => onUpdateSelectedStamp({ scale: Number(((selectedStamp.scale ?? 1.0) + 0.1).toFixed(2)) })}
                      className="flex-1 py-1 rounded bg-[#F4EBD0] hover:bg-[#EFE5C9] font-medium border border-[#E2D6B5] text-[10px] cursor-pointer"
                    >
                      +10%
                    </button>
                  </div>
                </div>

                {/* Rotation Slider & Quick Buttons */}
                <div className="flex flex-col gap-1.5 pt-1 border-t border-[#E2D6B5]/50">
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="font-semibold text-slate-700">Rotation Angle</span>
                    <span className="font-mono font-bold text-amber-700">{Math.round(selectedStamp.rotation ?? 0)}°</span>
                  </div>
                  <input
                    type="range"
                    min="-180"
                    max="180"
                    step="1"
                    value={selectedStamp.rotation ?? 0}
                    onChange={(e) => onUpdateSelectedStamp({ rotation: Number(e.target.value) })}
                    className="w-full accent-amber-600 cursor-pointer h-1.5 bg-[#EFE5C9] rounded-lg"
                  />
                  <div className="grid grid-cols-4 gap-1 pt-0.5">
                    <button
                      onClick={() => onUpdateSelectedStamp({ rotation: ((selectedStamp.rotation ?? 0) - 45 + 360) % 360 })}
                      className="py-1 rounded bg-[#F4EBD0] hover:bg-[#EFE5C9] font-medium border border-[#E2D6B5] text-[10px] flex items-center justify-center gap-1 cursor-pointer"
                      title="Rotate -45°"
                    >
                      <RotateCcw className="w-3 h-3" /> -45°
                    </button>
                    <button
                      onClick={() => onUpdateSelectedStamp({ rotation: 0 })}
                      className="py-1 rounded bg-[#F4EBD0] hover:bg-[#EFE5C9] font-medium border border-[#E2D6B5] text-[10px] cursor-pointer"
                    >
                      0°
                    </button>
                    <button
                      onClick={() => onUpdateSelectedStamp({ rotation: ((selectedStamp.rotation ?? 0) + 45) % 360 })}
                      className="py-1 rounded bg-[#F4EBD0] hover:bg-[#EFE5C9] font-medium border border-[#E2D6B5] text-[10px] flex items-center justify-center gap-1 cursor-pointer"
                      title="Rotate +45°"
                    >
                      <RotateCw className="w-3 h-3" /> +45°
                    </button>
                    <button
                      onClick={() => onUpdateSelectedStamp({ flipX: !selectedStamp.flipX })}
                      className={`py-1 rounded font-medium border text-[10px] flex items-center justify-center gap-1 cursor-pointer ${
                        selectedStamp.flipX
                          ? 'bg-[#3E2723] text-amber-200 border-[#2D1B18]'
                          : 'bg-[#F4EBD0] hover:bg-[#EFE5C9] border-[#E2D6B5]'
                      }`}
                      title="Flip Horizontal"
                    >
                      <FlipHorizontal className="w-3 h-3" /> Flip
                    </button>
                  </div>
                </div>

                {/* Opacity Option (User Request 3) */}
                <div className="flex flex-col gap-1.5 pt-1 border-t border-[#E2D6B5]/50">
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="font-semibold text-slate-700">Asset Opacity</span>
                    <span className="font-mono font-bold text-amber-700">
                      {Math.round((selectedStamp.opacity ?? 1.0) * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.1"
                    max="1.0"
                    step="0.05"
                    value={selectedStamp.opacity ?? 1.0}
                    onChange={(e) => onUpdateSelectedStamp({ opacity: Number(e.target.value) })}
                    className="w-full accent-amber-600 cursor-pointer h-1.5 bg-[#EFE5C9] rounded-lg"
                  />
                </div>

                {/* Z-Axis Depth Coordinate & Layer Ordering */}
                <div className="flex flex-col gap-2 pt-1 border-t border-[#E2D6B5]/50">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-700 text-[11px]">Z-Axis Depth Coordinate</span>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => onUpdateSelectedStamp({ layer: Math.max(-5, (selectedStamp.layer ?? 0) - 1) })}
                        className="w-5 h-5 rounded bg-[#F4EBD0] hover:bg-[#EFE5C9] font-bold border border-[#E2D6B5] text-[11px] flex items-center justify-center cursor-pointer"
                        title="Step Layer Down (Backwards)"
                      >
                        -
                      </button>
                      <span className="font-mono font-bold text-xs text-amber-800 px-1 bg-white rounded border border-[#E2D6B5]">
                        Z: {selectedStamp.layer ?? 0}
                      </span>
                      <button
                        onClick={() => onUpdateSelectedStamp({ layer: Math.min(5, (selectedStamp.layer ?? 0) + 1) })}
                        className="w-5 h-5 rounded bg-[#F4EBD0] hover:bg-[#EFE5C9] font-bold border border-[#E2D6B5] text-[11px] flex items-center justify-center cursor-pointer"
                        title="Step Layer Up (Frontwards)"
                      >
                        +
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      onClick={onBringStampToFront}
                      className="py-1 px-2 rounded bg-[#F4EBD0] hover:bg-[#EFE5C9] font-medium border border-[#E2D6B5] text-[10px] flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Layers className="w-3 h-3 text-amber-700" /> Bring to Front (Max Z)
                    </button>
                    <button
                      onClick={onSendStampToBack}
                      className="py-1 px-2 rounded bg-[#F4EBD0] hover:bg-[#EFE5C9] font-medium border border-[#E2D6B5] text-[10px] flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Layers className="w-3 h-3 text-slate-500" /> Send to Back (Min Z)
                    </button>
                  </div>

                  <div className="flex items-center justify-between bg-[#F4EBD0]/50 p-1.5 rounded-lg border border-[#E2D6B5]/70">
                    <span className="text-[10px] text-slate-500 font-medium">Nudge (10px):</span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => onUpdateSelectedStamp({ x: selectedStamp.x - 10 })}
                        className="p-1 rounded bg-white hover:bg-amber-50 border border-[#E2D6B5] text-slate-700 cursor-pointer"
                        title="Nudge Left"
                      >
                        <ArrowLeft className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => onUpdateSelectedStamp({ y: selectedStamp.y - 10 })}
                        className="p-1 rounded bg-white hover:bg-amber-50 border border-[#E2D6B5] text-slate-700 cursor-pointer"
                        title="Nudge Up"
                      >
                        <ArrowUp className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => onUpdateSelectedStamp({ y: selectedStamp.y + 10 })}
                        className="p-1 rounded bg-white hover:bg-amber-50 border border-[#E2D6B5] text-slate-700 cursor-pointer"
                        title="Nudge Down"
                      >
                        <ArrowDown className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => onUpdateSelectedStamp({ x: selectedStamp.x + 10 })}
                        className="p-1 rounded bg-white hover:bg-amber-50 border border-[#E2D6B5] text-slate-700 cursor-pointer"
                        title="Nudge Right"
                      >
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Duplicate & Delete Actions */}
                <div className="flex gap-2 pt-2 border-t border-[#E2D6B5]/70">
                  <button
                    onClick={onDuplicateSelectedStamp}
                    className="flex-1 py-1.5 rounded-lg bg-[#F4EBD0] hover:bg-[#EFE5C9] font-medium border border-[#E2D6B5] text-[11px] flex items-center justify-center gap-1.5 cursor-pointer text-slate-800"
                  >
                    <Copy className="w-3.5 h-3.5" /> Duplicate
                  </button>
                  <button
                    onClick={onDeleteSelectedStamp}
                    className="px-3 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 font-medium border border-red-200 text-[11px] flex items-center justify-center gap-1.5 cursor-pointer text-red-700"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Delete
                  </button>
                </div>
              </div>
            ) : selectedLabel ? (
              <div className="flex flex-col gap-3.5 bg-white/70 p-3 rounded-xl border border-[#E2D6B5]">
                <div className="flex items-center justify-between border-b border-[#E2D6B5]/70 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse" />
                    <span className="font-bold text-slate-800 text-[12px]">Selected Label</span>
                  </div>
                  <span className="font-mono text-[10px] text-slate-500">ID: {selectedLabel.id.slice(0, 6)}</span>
                </div>

                {/* Text String Input */}
                <div className="flex flex-col gap-1">
                  <span className="font-semibold text-slate-700 text-[11px]">Annotation Text</span>
                  <input
                    type="text"
                    value={selectedLabel.text ?? ''}
                    onChange={(e) => onUpdateSelectedLabel({ text: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-white border border-[#E2D6B5] rounded-md text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>

                {/* Scale & Font Size (User Request 5) */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="font-semibold text-slate-700">Label Scale</span>
                    <span className="font-mono font-bold text-amber-700">
                      {Math.round((selectedLabel.scale ?? 1.0) * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="3.0"
                    step="0.05"
                    value={selectedLabel.scale ?? 1.0}
                    onChange={(e) => onUpdateSelectedLabel({ scale: Number(e.target.value) })}
                    className="w-full accent-amber-600 cursor-pointer h-1.5 bg-[#EFE5C9] rounded-lg"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <span className="font-semibold text-slate-700 text-[11px]">Font Family</span>
                  <select
                    value={selectedLabel.fontFamily || "'Cinzel', serif"}
                    onChange={(e) => onUpdateSelectedLabel({ fontFamily: e.target.value })}
                    className="w-full px-2 py-1.5 bg-white border border-[#E2D6B5] rounded-md text-xs cursor-pointer focus:outline-none"
                  >
                    {FONT_OPTIONS.map((f) => (
                      <option key={f.value} value={f.value}>
                        {f.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Font Color & Stroke Color */}
                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-[#E2D6B5]/50">
                  <div className="flex flex-col gap-1">
                    <span className="font-semibold text-slate-700 text-[11px]">Font Color</span>
                    <div className="flex items-center gap-1.5 bg-white p-1 rounded border border-[#E2D6B5]">
                      <input
                        type="color"
                        value={selectedLabel.color || '#fef3c7'}
                        onChange={(e) => onUpdateSelectedLabel({ color: e.target.value })}
                        className="w-6 h-6 rounded cursor-pointer border-0 p-0"
                      />
                      <input
                        type="text"
                        value={selectedLabel.color || '#fef3c7'}
                        onChange={(e) => onUpdateSelectedLabel({ color: e.target.value })}
                        className="w-full text-[10px] font-mono uppercase bg-transparent outline-none"
                      />
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="font-semibold text-slate-700 text-[11px]">Stroke Color</span>
                    <div className="flex items-center gap-1.5 bg-white p-1 rounded border border-[#E2D6B5]">
                      <input
                        type="color"
                        value={selectedLabel.strokeColor || '#78350f'}
                        onChange={(e) => onUpdateSelectedLabel({ strokeColor: e.target.value })}
                        className="w-6 h-6 rounded cursor-pointer border-0 p-0"
                      />
                      <input
                        type="text"
                        value={selectedLabel.strokeColor || '#78350f'}
                        onChange={(e) => onUpdateSelectedLabel({ strokeColor: e.target.value })}
                        className="w-full text-[10px] font-mono uppercase bg-transparent outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Banner Style & Box Color Choice (User Request 5) */}
                <div className="flex flex-col gap-1.5 pt-1 border-t border-[#E2D6B5]/50">
                  <span className="font-semibold text-slate-700 text-[11px]">Label Box / Banner Style</span>
                  <div className="grid grid-cols-3 gap-1">
                    {[
                      { id: 'none', label: 'None' },
                      { id: 'box_simple', label: 'Box' },
                      { id: 'parchment_ribbon', label: 'Ribbon' },
                      { id: 'stone_plaque', label: 'Stone' },
                      { id: 'royal_banner', label: 'Royal' },
                      { id: 'scroll', label: 'Scroll' },
                    ].map((b) => (
                      <button
                        key={b.id}
                        onClick={() => onUpdateSelectedLabel({ bannerStyle: b.id as any })}
                        className={`py-1 rounded text-[10px] font-medium border text-center transition-all cursor-pointer ${
                          selectedLabel.bannerStyle === b.id
                            ? 'bg-[#3E2723] text-amber-200 border-[#2D1B18]'
                            : 'bg-white text-slate-700 border-[#E2D6B5] hover:bg-[#FDF6E3]'
                        }`}
                      >
                        {b.label}
                      </button>
                    ))}
                  </div>

                  {selectedLabel.bannerStyle !== 'none' && (
                    <div className="flex flex-col gap-2 pt-1 bg-[#F4EBD0]/40 p-2 rounded-lg border border-[#E2D6B5]/60">
                      <div className="grid grid-cols-2 gap-2">
                        <div className="flex flex-col gap-1">
                          <span className="text-[10px] text-slate-600 font-medium">Box Fill:</span>
                          <input
                            type="color"
                            value={selectedLabel.boxColor || '#fef3c7'}
                            onChange={(e) => onUpdateSelectedLabel({ boxColor: e.target.value })}
                            className="w-full h-6 rounded cursor-pointer border border-[#E2D6B5] p-0"
                          />
                        </div>
                        <div className="flex flex-col gap-1">
                          <span className="text-[10px] text-slate-600 font-medium">Border:</span>
                          <input
                            type="color"
                            value={selectedLabel.boxBorderColor || '#92400e'}
                            onChange={(e) => onUpdateSelectedLabel({ boxBorderColor: e.target.value })}
                            className="w-full h-6 rounded cursor-pointer border border-[#E2D6B5] p-0"
                          />
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-slate-600 font-medium shrink-0">Opacity:</span>
                        <input
                          type="range"
                          min="0.2"
                          max="1.0"
                          step="0.05"
                          value={selectedLabel.boxOpacity ?? 0.88}
                          onChange={(e) => onUpdateSelectedLabel({ boxOpacity: Number(e.target.value) })}
                          className="w-full accent-amber-600 cursor-pointer h-1.5 bg-[#EFE5C9] rounded-lg"
                        />
                        <span className="font-mono text-[10px] text-slate-600">
                          {Math.round((selectedLabel.boxOpacity ?? 0.88) * 100)}%
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Curvature & Rotation */}
                <div className="flex flex-col gap-2 pt-1 border-t border-[#E2D6B5]/50">
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="font-semibold text-slate-700">Arc Curvature</span>
                    <span className="font-mono font-bold text-amber-700">{selectedLabel.curvature || 0}</span>
                  </div>
                  <input
                    type="range"
                    min="-45"
                    max="45"
                    step="1"
                    value={selectedLabel.curvature || 0}
                    onChange={(e) => onUpdateSelectedLabel({ curvature: Number(e.target.value) })}
                    className="w-full accent-amber-600 cursor-pointer h-1.5 bg-[#EFE5C9] rounded-lg"
                  />

                  <div className="flex justify-between items-center text-[11px] pt-1">
                    <span className="font-semibold text-slate-700">Rotation</span>
                    <span className="font-mono font-bold text-amber-700">{Math.round(selectedLabel.rotation ?? 0)}°</span>
                  </div>
                  <input
                    type="range"
                    min="-180"
                    max="180"
                    step="1"
                    value={selectedLabel.rotation ?? 0}
                    onChange={(e) => onUpdateSelectedLabel({ rotation: Number(e.target.value) })}
                    className="w-full accent-amber-600 cursor-pointer h-1.5 bg-[#EFE5C9] rounded-lg"
                  />
                </div>

                {/* Duplicate & Delete Actions */}
                <div className="flex gap-2 pt-2 border-t border-[#E2D6B5]/70">
                  <button
                    onClick={onDuplicateSelectedLabel}
                    className="flex-1 py-1.5 rounded-lg bg-[#F4EBD0] hover:bg-[#EFE5C9] font-medium border border-[#E2D6B5] text-[11px] flex items-center justify-center gap-1.5 cursor-pointer text-slate-800"
                  >
                    <Copy className="w-3.5 h-3.5" /> Duplicate
                  </button>
                  <button
                    onClick={onDeleteSelectedLabel}
                    className="px-3 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 font-medium border border-red-200 text-[11px] flex items-center justify-center gap-1.5 cursor-pointer text-red-700"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Delete
                  </button>
                </div>
              </div>
            ) : selectedPath ? (
              <div className="flex flex-col gap-3 bg-white/70 p-3 rounded-xl border border-[#E2D6B5]">
                <div className="flex items-center justify-between border-b border-[#E2D6B5]/70 pb-2">
                  <span className="font-bold text-slate-800 text-[12px]">Selected Path / River</span>
                  <span className="font-mono text-[10px] text-slate-500">{selectedPath.points.length} nodes</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-slate-600">Type:</span>
                  <span className="font-bold capitalize text-slate-800">{selectedPath.type}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-slate-600">Stroke Width:</span>
                  <span className="font-mono font-bold text-slate-800">{selectedPath.width}px</span>
                </div>
                <button
                  onClick={onDeleteSelectedPath}
                  className="w-full py-1.5 mt-2 rounded-lg bg-red-50 hover:bg-red-100 font-medium border border-red-200 text-[11px] flex items-center justify-center gap-1.5 cursor-pointer text-red-700"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Delete Path
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-3 bg-white/60 p-4 rounded-xl border border-dashed border-[#E2D6B5] text-center">
                <div className="w-10 h-10 rounded-full bg-amber-100/80 text-amber-800 mx-auto flex items-center justify-center">
                  <MousePointer className="w-5 h-5" />
                </div>
                <p className="font-semibold text-slate-800 text-xs">Direct Canvas Selection</p>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Click on any mountain, tree, castle, label, or river on the canvas to inspect, scale, rotate, or reposition it.
                </p>
                <div className="text-[10px] text-slate-400 bg-[#F4EBD0]/40 p-2 rounded border border-[#E2D6B5]/40 text-left flex flex-col gap-1">
                  <div>• <strong>Corners</strong>: Drag corner handles to scale.</div>
                  <div>• <strong>Top Stem</strong>: Drag the circular knob to rotate.</div>
                  <div>• <strong>Body</strong>: Click & drag to move.</div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ============================================================== */}
        {/* 2. LANDMASS SCULPTOR TOOL */}
        {/* ============================================================== */}
        {activeTool === 'mask' && (
          <div className="flex flex-col gap-3.5">
            <div className="flex flex-col gap-1.5">
              <span className="font-semibold text-slate-800 text-[11px]">Sculpting Mode</span>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  onClick={() => onUpdateBrushSettings({ mode: 'add' })}
                  className={`py-2 rounded-lg font-semibold border text-center transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    brushSettings.mode === 'add'
                      ? 'bg-[#3E2723] text-amber-200 border-[#2D1B18] shadow-xs'
                      : 'bg-white text-slate-700 border-[#E2D6B5] hover:bg-[#FDF6E3]'
                  }`}
                >
                  <MountainSnow className="w-3.5 h-3.5 text-amber-400" /> Add Landmass
                </button>
                <button
                  onClick={() => onUpdateBrushSettings({ mode: 'subtract' })}
                  className={`py-2 rounded-lg font-semibold border text-center transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    brushSettings.mode === 'subtract'
                      ? 'bg-[#1e3a8a] text-blue-200 border-[#172554] shadow-xs'
                      : 'bg-white text-slate-700 border-[#E2D6B5] hover:bg-[#FDF6E3]'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5 text-blue-400" /> Carve Ocean
                </button>
              </div>
            </div>

            {/* Brush Size */}
            <div className="flex flex-col gap-1.5 pt-1 border-t border-[#E2D6B5]/50">
              <div className="flex justify-between items-center text-[11px]">
                <span className="font-semibold text-slate-700">Brush Radius</span>
                <span className="font-mono font-bold text-amber-700">{brushSettings.size}px</span>
              </div>
              <input
                type="range"
                min="10"
                max="250"
                step="5"
                value={brushSettings.size}
                onChange={(e) => onUpdateBrushSettings({ size: Number(e.target.value) })}
                className="w-full accent-amber-600 cursor-pointer h-1.5 bg-[#EFE5C9] rounded-lg"
              />
              <div className="flex gap-1.5 pt-0.5">
                {[25, 60, 120, 200].map((sz) => (
                  <button
                    key={sz}
                    onClick={() => onUpdateBrushSettings({ size: sz })}
                    className={`flex-1 py-1 rounded border text-[10px] font-medium transition-all cursor-pointer ${
                      brushSettings.size === sz
                        ? 'bg-[#3E2723] text-amber-200 border-[#2D1B18]'
                        : 'bg-[#F4EBD0] text-slate-700 border-[#E2D6B5] hover:bg-[#EFE5C9]'
                    }`}
                  >
                    {sz}px
                  </button>
                ))}
              </div>
            </div>

            {/* Fractal Roughness & Noise Octaves */}
            <div className="flex flex-col gap-1.5 pt-1 border-t border-[#E2D6B5]/50">
              <div className="flex justify-between items-center text-[11px]">
                <span className="font-semibold text-slate-700">Coastline Fractal Roughness</span>
                <span className="font-mono font-bold text-amber-700">{Math.round((brushSettings.roughness ?? 0.6) * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.1"
                max="1.0"
                step="0.05"
                value={brushSettings.roughness ?? 0.6}
                onChange={(e) => onUpdateBrushSettings({ roughness: Number(e.target.value) })}
                className="w-full accent-amber-600 cursor-pointer h-1.5 bg-[#EFE5C9] rounded-lg"
              />
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* 3. BIOME TEXTURE BRUSH */}
        {/* ============================================================== */}
        {activeTool === 'brush' && (
          <div className="flex flex-col gap-3.5">
            {/* Direct Shader Lab & Custom Biome Maker trigger */}
            {onOpenShaderLab && (
              <button
                type="button"
                onClick={onOpenShaderLab}
                className="w-full py-2 px-3 rounded-xl border border-dashed border-[#b45309] bg-amber-50 hover:bg-amber-100 text-[#78350f] font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-all shadow-xs"
              >
                <Sparkles className="w-4 h-4 text-[#b45309]" />
                <span>Open Shader Lab & Custom Biome Maker</span>
              </button>
            )}

            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-800 text-[11px]">Choose Biome Palette</span>
              {customBiomes.length > 0 && (
                <span className="text-[10px] text-amber-800 font-mono font-medium">
                  {customBiomes.length} Custom
                </span>
              )}
            </div>

            {/* Custom Biomes from Shader Lab */}
            {customBiomes.length > 0 && (
              <div className="flex flex-col gap-1.5 pb-2 border-b border-[#E2D6B5]/60">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800">Custom Biomes</span>
                {customBiomes.map((b) => (
                  <button
                    key={b.id}
                    onClick={() => {
                      onUpdateBrushSettings({ selectedBiome: b.id, elevation: b.defaultElevation });
                      onSelectBiome(b.id as any);
                    }}
                    className={`p-2 rounded-xl border flex items-center gap-3 transition-all cursor-pointer text-left ${
                      brushSettings.selectedBiome === b.id || activeBiome === b.id
                        ? 'bg-white border-[#b45309] shadow-xs ring-1 ring-[#b45309]'
                        : 'bg-white/60 border-[#E2D6B5] hover:bg-white'
                    }`}
                  >
                    {b.isPattern && b.patternImageUrl ? (
                      <div
                        className="w-5 h-5 rounded-full shrink-0 shadow-inner border border-black/20 bg-cover bg-center"
                        style={{ backgroundImage: `url(${b.patternImageUrl})` }}
                      />
                    ) : (
                      <span
                        className="w-5 h-5 rounded-full shrink-0 shadow-inner border border-black/20"
                        style={{ backgroundColor: b.color }}
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-slate-900 text-xs leading-tight flex items-center gap-1.5">
                        <span className="truncate">{b.name}</span>
                        <span className="text-[9px] px-1 py-0.2 rounded bg-amber-100 text-amber-800 border border-amber-300">
                          {b.isPattern ? 'Pattern' : 'Shader'}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-500 capitalize">{b.detailType || 'custom'}</div>
                    </div>
                    {(brushSettings.selectedBiome === b.id || activeBiome === b.id) && (
                      <CheckCircle className="w-4 h-4 text-amber-600 shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            )}

            {/* Standard Built-in Biomes */}
            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Standard Biomes</span>
              {BIOMES.map((b) => (
                <button
                  key={b.id}
                  onClick={() => {
                    onUpdateBrushSettings({ selectedBiome: b.id });
                    onSelectBiome(b.id);
                  }}
                  className={`p-2 rounded-xl border flex items-center gap-3 transition-all cursor-pointer text-left ${
                    activeBiome === b.id || brushSettings.selectedBiome === b.id
                      ? 'bg-white border-[#b45309] shadow-xs ring-1 ring-[#b45309]'
                      : 'bg-white/60 border-[#E2D6B5] hover:bg-white'
                  }`}
                >
                  <span
                    className="w-5 h-5 rounded-full shrink-0 shadow-inner border border-black/20"
                    style={{ backgroundColor: b.color }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-slate-900 text-xs leading-tight">{b.label}</div>
                    <div className="text-[10px] text-slate-500 truncate">{b.desc}</div>
                  </div>
                  {(activeBiome === b.id || brushSettings.selectedBiome === b.id) && (
                    <CheckCircle className="w-4 h-4 text-amber-600 shrink-0" />
                  )}
                </button>
              ))}
            </div>

            {/* Brush Size & Opacity */}
            <div className="flex flex-col gap-1.5 pt-2 border-t border-[#E2D6B5]/50">
              <div className="flex justify-between items-center text-[11px]">
                <span className="font-semibold text-slate-700">Brush Radius</span>
                <span className="font-mono font-bold text-amber-700">{brushSettings.size}px</span>
              </div>
              <input
                type="range"
                min="15"
                max="250"
                step="5"
                value={brushSettings.size}
                onChange={(e) => onUpdateBrushSettings({ size: Number(e.target.value) })}
                className="w-full accent-amber-600 cursor-pointer h-1.5 bg-[#EFE5C9] rounded-lg"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between items-center text-[11px]">
                <span className="font-semibold text-slate-700">Texture Opacity</span>
                <span className="font-mono font-bold text-amber-700">{Math.round((brushSettings.opacity ?? 0.85) * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.1"
                max="1.0"
                step="0.05"
                value={brushSettings.opacity ?? 0.85}
                onChange={(e) => onUpdateBrushSettings({ opacity: Number(e.target.value) })}
                className="w-full accent-amber-600 cursor-pointer h-1.5 bg-[#EFE5C9] rounded-lg"
              />
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* 4. ELEVATION SCULPTOR */}
        {/* ============================================================== */}
        {activeTool === 'elevation' && (
          <div className="flex flex-col gap-3.5">
            <span className="font-semibold text-slate-800 text-[11px]">Relief Mode</span>
            <div className="grid grid-cols-2 gap-1.5">
              {[
                { id: 'raise', label: 'Raise Highlands' },
                { id: 'lower', label: 'Lower Basin' },
                { id: 'plateau', label: 'Plateau Table' },
                { id: 'smooth', label: 'Smooth Slopes' },
              ].map((m) => (
                <button
                  key={m.id}
                  onClick={() => onUpdateBrushSettings({ elevationMode: m.id as any })}
                  className={`py-2 rounded-lg font-medium border text-center transition-all cursor-pointer text-xs ${
                    brushSettings.elevationMode === m.id
                      ? 'bg-[#3E2723] text-amber-200 border-[#2D1B18] shadow-xs'
                      : 'bg-white text-slate-700 border-[#E2D6B5] hover:bg-[#FDF6E3]'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>

            {/* Brush Size & Strength */}
            <div className="flex flex-col gap-1.5 pt-1 border-t border-[#E2D6B5]/50">
              <div className="flex justify-between items-center text-[11px]">
                <span className="font-semibold text-slate-700">Brush Radius</span>
                <span className="font-mono font-bold text-amber-700">{brushSettings.size}px</span>
              </div>
              <input
                type="range"
                min="15"
                max="250"
                step="5"
                value={brushSettings.size}
                onChange={(e) => onUpdateBrushSettings({ size: Number(e.target.value) })}
                className="w-full accent-amber-600 cursor-pointer h-1.5 bg-[#EFE5C9] rounded-lg"
              />
            </div>

            {/* Hydraulic Erosion Simulation Button */}
            <div className="pt-2 border-t border-[#E2D6B5]/50 flex flex-col gap-1.5">
              <button
                onClick={onHydraulicErosion}
                className="w-full py-2 px-3 rounded-lg bg-amber-100 hover:bg-amber-200 border border-amber-300 font-semibold text-amber-900 text-xs flex items-center justify-center gap-2 cursor-pointer shadow-xs"
              >
                <Sparkles className="w-4 h-4 text-amber-700" /> Run Hydraulic Erosion
              </button>
              <p className="text-[10px] text-slate-500 leading-tight">
                Simulates real rainfall runoff carving realistic natural river gullies and sedimentary deposits.
              </p>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* 5. STAMP PLACEMENT TOOL */}
        {/* ============================================================== */}
        {activeTool === 'stamp' && (
          <div className="flex flex-col gap-3.5">
            {/* Active Stamp Preview */}
            <div className="flex items-center gap-3 bg-white p-2.5 rounded-xl border border-[#E2D6B5]">
              <div className="w-12 h-12 bg-[#F4EBD0] rounded-lg border border-[#E2D6B5] flex items-center justify-center overflow-hidden shrink-0">
                {selectedStampAsset ? (
                  <img
                    src={selectedStampAsset.imageUrl}
                    alt={selectedStampAsset.name}
                    className="max-w-full max-h-full object-contain"
                  />
                ) : (
                  <TreePine className="w-6 h-6 text-amber-800" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-slate-900 text-xs truncate">
                  {selectedStampAsset?.name || 'Mountain Peak'}
                </div>
                <div className="text-[10px] text-slate-500 capitalize">{selectedStampAsset?.category || 'Landmark'}</div>
              </div>
              <button
                onClick={onOpenAssetLibrary}
                className="px-2.5 py-1.5 rounded-lg bg-[#3E2723] text-amber-200 text-[11px] font-medium hover:bg-[#2D1B18] cursor-pointer shrink-0"
              >
                Change...
              </button>
            </div>

            {/* Placement Mode */}
            <div className="flex flex-col gap-1.5">
              <span className="font-semibold text-slate-800 text-[11px]">Placement Method</span>
              <div className="grid grid-cols-3 gap-1">
                <button
                  onClick={() => onUpdateBrushSettings({ stampPlacementMode: 'single' })}
                  className={`py-1.5 px-1 rounded-lg font-medium border text-center transition-all cursor-pointer text-[11px] ${
                    brushSettings.stampPlacementMode === 'single' || !brushSettings.stampPlacementMode
                      ? 'bg-[#3E2723] text-amber-200 border-[#2D1B18]'
                      : 'bg-white text-slate-700 border-[#E2D6B5] hover:bg-[#FDF6E3]'
                  }`}
                >
                  Single
                </button>
                <button
                  onClick={() => onUpdateBrushSettings({ stampPlacementMode: 'scatter' })}
                  className={`py-1.5 px-1 rounded-lg font-medium border text-center transition-all cursor-pointer text-[11px] ${
                    brushSettings.stampPlacementMode === 'scatter'
                      ? 'bg-[#3E2723] text-amber-200 border-[#2D1B18]'
                      : 'bg-white text-slate-700 border-[#E2D6B5] hover:bg-[#FDF6E3]'
                  }`}
                >
                  Scatter
                </button>
                <button
                  onClick={() => onUpdateBrushSettings({ stampPlacementMode: 'ribbon' })}
                  className={`py-1.5 px-1 rounded-lg font-medium border text-center transition-all cursor-pointer text-[11px] ${
                    brushSettings.stampPlacementMode === 'ribbon'
                      ? 'bg-[#3E2723] text-amber-200 border-[#2D1B18]'
                      : 'bg-white text-slate-700 border-[#E2D6B5] hover:bg-[#FDF6E3]'
                  }`}
                >
                  Ribbon
                </button>
              </div>

              {/* Scatter Configuration Options */}
              {brushSettings.stampPlacementMode === 'scatter' && (
                <div className="flex flex-col gap-2 mt-1 p-2 bg-white/70 rounded-lg border border-[#E2D6B5]">
                  <div className="flex justify-between items-center text-[10px]">
                    <span className="font-semibold text-slate-700">Scatter Density (Assets)</span>
                    <span className="font-mono font-bold text-amber-700">
                      {brushSettings.scatterDensity ?? 4}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="2"
                    max="12"
                    step="1"
                    value={brushSettings.scatterDensity ?? 4}
                    onChange={(e) => onUpdateBrushSettings({ scatterDensity: Number(e.target.value) })}
                    className="w-full accent-amber-600 cursor-pointer h-1.5 bg-[#EFE5C9] rounded-lg"
                  />

                  <div className="flex justify-between items-center text-[10px]">
                    <span className="font-semibold text-slate-700">Scatter Radius</span>
                    <span className="font-mono font-bold text-amber-700">
                      {brushSettings.scatterRadius ?? 60}px
                    </span>
                  </div>
                  <input
                    type="range"
                    min="20"
                    max="180"
                    step="5"
                    value={brushSettings.scatterRadius ?? 60}
                    onChange={(e) => onUpdateBrushSettings({ scatterRadius: Number(e.target.value) })}
                    className="w-full accent-amber-600 cursor-pointer h-1.5 bg-[#EFE5C9] rounded-lg"
                  />
                </div>
              )}
            </div>

            {/* Stamp Scale with Range Slider and Custom Number Input */}
            <div className="flex flex-col gap-1.5 pt-1 border-t border-[#E2D6B5]/50">
              <div className="flex justify-between items-center text-[11px]">
                <span className="font-semibold text-slate-700">Stamp Scale</span>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min="1"
                    max="1000"
                    step="1"
                    value={Math.round((brushSettings.stampScale ?? 1.0) * 100)}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      if (!isNaN(val) && val > 0) {
                        onUpdateBrushSettings({ stampScale: Math.max(0.05, Math.min(10, val / 100)) });
                      }
                    }}
                    onKeyDown={(e) => {
                      // Restrict to number keys, arrows, backspace, delete only
                      if (!/[\d]|Backspace|Delete|ArrowUp|ArrowDown|ArrowLeft|ArrowRight|Tab/.test(e.key)) {
                        e.preventDefault();
                      }
                    }}
                    className="w-14 px-1.5 py-0.5 text-right font-mono font-bold text-amber-900 bg-white border border-[#E2D6B5] rounded text-[11px] focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                  <span className="text-[10px] text-slate-500 font-mono">%</span>
                </div>
              </div>
              <input
                type="range"
                min="0.3"
                max="2.5"
                step="0.05"
                value={Math.min(2.5, Math.max(0.3, brushSettings.stampScale ?? 1.0))}
                onChange={(e) => onUpdateBrushSettings({ stampScale: Number(e.target.value) })}
                className="w-full accent-amber-600 cursor-pointer h-1.5 bg-[#EFE5C9] rounded-lg"
              />
            </div>

            {/* Stamp Opacity (User Request 3: "Add opacity to Assets As option") */}
            <div className="flex flex-col gap-1.5 pt-1 border-t border-[#E2D6B5]/50">
              <div className="flex justify-between items-center text-[11px]">
                <span className="font-semibold text-slate-700">Asset Opacity</span>
                <span className="font-mono font-bold text-amber-700">
                  {Math.round((brushSettings.stampOpacity ?? 1.0) * 100)}%
                </span>
              </div>
              <input
                type="range"
                min="0.1"
                max="1.0"
                step="0.05"
                value={brushSettings.stampOpacity ?? 1.0}
                onChange={(e) => onUpdateBrushSettings({ stampOpacity: Number(e.target.value) })}
                className="w-full accent-amber-600 cursor-pointer h-1.5 bg-[#EFE5C9] rounded-lg"
              />
            </div>

            {/* Rotation & Randomness */}
            <div className="flex flex-col gap-1.5 pt-1 border-t border-[#E2D6B5]/50">
              <div className="flex justify-between items-center text-[11px]">
                <span className="font-semibold text-slate-700">Rotation Angle</span>
                <span className="font-mono font-bold text-amber-700">{brushSettings.stampRotation ?? 0}°</span>
              </div>
              <input
                type="range"
                min="-180"
                max="180"
                step="5"
                value={brushSettings.stampRotation ?? 0}
                onChange={(e) => onUpdateBrushSettings({ stampRotation: Number(e.target.value) })}
                className="w-full accent-amber-600 cursor-pointer h-1.5 bg-[#EFE5C9] rounded-lg"
              />
              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2 cursor-pointer text-[11px]">
                  <input
                    type="checkbox"
                    checked={Boolean(brushSettings.randomizeRotation)}
                    onChange={(e) => onUpdateBrushSettings({ randomizeRotation: e.target.checked })}
                    className="accent-amber-700 rounded"
                  />
                  <span>Random Angle Variance</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-[11px]">
                  <input
                    type="checkbox"
                    checked={Boolean(brushSettings.randomizeScale)}
                    onChange={(e) => onUpdateBrushSettings({ randomizeScale: e.target.checked })}
                    className="accent-amber-700 rounded"
                  />
                  <span>Random Size (±15%)</span>
                </label>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* 6. PATH & RIVER TOOL */}
        {/* ============================================================== */}
        {activeTool === 'path' && (
          <div className="flex flex-col gap-3.5">
            {/* Active Drawing Alert */}
            {activePathDraft && (
              <div className="bg-amber-50 p-2.5 rounded-xl border border-amber-300 flex items-center justify-between">
                <div>
                  <div className="font-bold text-amber-900 text-xs">Drawing Path...</div>
                  <div className="text-[10px] text-amber-700">{activePathDraft.points.length} nodes placed</div>
                </div>
                <button
                  onClick={onFinishActivePath}
                  className="px-2.5 py-1 rounded bg-amber-700 text-white font-semibold text-xs hover:bg-amber-800 cursor-pointer"
                >
                  Finish Path
                </button>
              </div>
            )}

            {/* Path Type */}
            <div className="flex flex-col gap-1.5">
              <span className="font-semibold text-slate-800 text-[11px]">Path Type</span>
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  { id: 'river', label: 'Water River', color: '#2b6cb0', defaultTaper: true, defaultDouble: false },
                  { id: 'road', label: 'Cart Road', color: '#92400e', defaultTaper: false, defaultDouble: true },
                  { id: 'border', label: 'Empire Border', color: '#dc2626', defaultTaper: false, defaultDouble: false },
                  { id: 'coastal', label: 'Coast Route', color: '#0f766e', defaultTaper: false, defaultDouble: false },
                ].map((p) => {
                  const isSelected = activePathStyle === p.id || brushSettings.pathType === p.id;
                  return (
                    <button
                      key={p.id}
                      onClick={() => {
                        const style = p.id as PathStyle;
                        onPathStyleChange?.(style);
                        onUpdateBrushSettings({ pathType: style as any });
                        onPathColorChange(p.color);
                        onPathTaperChange(p.defaultTaper);
                        onPathDoubleLineChange(p.defaultDouble);
                      }}
                      className={`py-2 rounded-lg font-medium border text-center transition-all cursor-pointer text-xs flex items-center justify-center gap-1.5 ${
                        isSelected
                          ? 'bg-[#3E2723] text-amber-200 border-[#2D1B18] shadow-xs ring-1 ring-amber-500'
                          : 'bg-white text-slate-700 border-[#E2D6B5] hover:bg-[#FDF6E3]'
                      }`}
                    >
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: p.color }} />
                      {p.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Line Width */}
            <div className="flex flex-col gap-1.5 pt-1 border-t border-[#E2D6B5]/50">
              <div className="flex justify-between items-center text-[11px]">
                <span className="font-semibold text-slate-700">Line Width</span>
                <span className="font-mono font-bold text-amber-700">{brushSettings.size ?? 8}px</span>
              </div>
              <input
                type="range"
                min="2"
                max="40"
                step="1"
                value={brushSettings.size ?? 8}
                onChange={(e) => onUpdateBrushSettings({ size: Number(e.target.value) })}
                className="w-full accent-amber-600 cursor-pointer h-1.5 bg-[#EFE5C9] rounded-lg"
              />
            </div>

            {/* Color Choice */}
            <div className="flex flex-col gap-1 pt-1 border-t border-[#E2D6B5]/50">
              <span className="font-semibold text-slate-700 text-[11px]">Path Color</span>
              <div className="flex items-center gap-2 bg-white p-1 rounded-lg border border-[#E2D6B5]">
                <input
                  type="color"
                  value={pathColor || '#38bdf8'}
                  onChange={(e) => onPathColorChange(e.target.value)}
                  className="w-7 h-7 rounded cursor-pointer border-0 p-0"
                />
                <input
                  type="text"
                  value={pathColor || '#38bdf8'}
                  onChange={(e) => onPathColorChange(e.target.value)}
                  className="w-full text-xs font-mono uppercase bg-transparent outline-none"
                />
              </div>
            </div>

            {/* Taper & Double Line */}
            <div className="flex flex-col gap-2 pt-1 border-t border-[#E2D6B5]/50">
              <label className="flex items-center justify-between cursor-pointer text-xs">
                <span>Taper River Mouth (Broaden towards sea)</span>
                <input
                  type="checkbox"
                  checked={Boolean(pathTaper)}
                  onChange={(e) => onPathTaperChange(e.target.checked)}
                  className="accent-amber-700 rounded"
                />
              </label>
              <label className="flex items-center justify-between cursor-pointer text-xs">
                <span>Double-Line Road Border</span>
                <input
                  type="checkbox"
                  checked={Boolean(pathDoubleLine)}
                  onChange={(e) => onPathDoubleLineChange(e.target.checked)}
                  className="accent-amber-700 rounded"
                />
              </label>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* 7. FANTASY MAP LABELS TOOL */}
        {/* ============================================================== */}
        {activeTool === 'text' && (
          <div className="flex flex-col gap-3.5">
            {/* Text String Input */}
            <div className="flex flex-col gap-1">
              <span className="font-semibold text-slate-800 text-[11px]">Annotation Text</span>
              <input
                type="text"
                value={activeTextString ?? ''}
                onChange={(e) => onTextStringChange(e.target.value)}
                placeholder="e.g. Whispering Woods, Dragon Isle..."
                className="w-full px-2.5 py-1.5 bg-white border border-[#E2D6B5] rounded-md text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
              <span className="text-[10px] text-slate-500">Click on the map to stamp this label.</span>
            </div>

            {/* Font Family */}
            <div className="flex flex-col gap-1 pt-1 border-t border-[#E2D6B5]/50">
              <span className="font-semibold text-slate-700 text-[11px]">Font Family</span>
              <select
                value={activeFontFamily || "'Cinzel', serif"}
                onChange={(e) => onFontFamilyChange(e.target.value)}
                className="w-full px-2 py-1.5 bg-white border border-[#E2D6B5] rounded-md text-xs cursor-pointer focus:outline-none"
              >
                {FONT_OPTIONS.map((f) => (
                  <option key={f.value} value={f.value}>
                    {f.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Font Size & Scale (User Request 5) */}
            <div className="flex flex-col gap-1.5 pt-1 border-t border-[#E2D6B5]/50">
              <div className="flex justify-between items-center text-[11px]">
                <span className="font-semibold text-slate-700">Font Size</span>
                <span className="font-mono font-bold text-amber-700">{activeFontSize ?? 24}px</span>
              </div>
              <input
                type="range"
                min="12"
                max="80"
                step="2"
                value={activeFontSize ?? 24}
                onChange={(e) => onFontSizeChange(Number(e.target.value))}
                className="w-full accent-amber-600 cursor-pointer h-1.5 bg-[#EFE5C9] rounded-lg"
              />
            </div>

            {/* Color Choice for Fonts (User Request 5) */}
            <div className="flex flex-col gap-1 pt-1 border-t border-[#E2D6B5]/50">
              <span className="font-semibold text-slate-700 text-[11px]">Font Color</span>
              <div className="flex items-center gap-2 bg-white p-1 rounded-lg border border-[#E2D6B5]">
                <input
                  type="color"
                  value={activeTextColor || '#fef3c7'}
                  onChange={(e) => onTextColorChange(e.target.value)}
                  className="w-7 h-7 rounded cursor-pointer border-0 p-0"
                />
                <input
                  type="text"
                  value={activeTextColor || '#fef3c7'}
                  onChange={(e) => onTextColorChange(e.target.value)}
                  className="w-full text-xs font-mono uppercase bg-transparent outline-none"
                />
              </div>
            </div>

            {/* Banner Style & Color Choice for Label Box (User Request 5) */}
            <div className="flex flex-col gap-1.5 pt-1 border-t border-[#E2D6B5]/50">
              <span className="font-semibold text-slate-700 text-[11px]">Label Box Style</span>
              <div className="grid grid-cols-3 gap-1">
                {[
                  { id: 'none', label: 'None' },
                  { id: 'box_simple', label: 'Simple Box' },
                  { id: 'parchment_ribbon', label: 'Ribbon' },
                  { id: 'stone_plaque', label: 'Stone' },
                  { id: 'royal_banner', label: 'Royal' },
                  { id: 'scroll', label: 'Scroll' },
                ].map((b) => (
                  <button
                    key={b.id}
                    onClick={() => onBannerStyleChange(b.id)}
                    className={`py-1 rounded text-[10px] font-medium border text-center transition-all cursor-pointer ${
                      activeBannerStyle === b.id
                        ? 'bg-[#3E2723] text-amber-200 border-[#2D1B18]'
                        : 'bg-white text-slate-700 border-[#E2D6B5] hover:bg-[#FDF6E3]'
                    }`}
                  >
                    {b.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Arc Curvature */}
            <div className="flex flex-col gap-1.5 pt-1 border-t border-[#E2D6B5]/50">
              <div className="flex justify-between items-center text-[11px]">
                <span className="font-semibold text-slate-700">Arc Curvature</span>
                <span className="font-mono font-bold text-amber-700">{textCurvature ?? 0}</span>
              </div>
              <input
                type="range"
                min="-45"
                max="45"
                step="1"
                value={textCurvature ?? 0}
                onChange={(e) => onTextCurvatureChange(Number(e.target.value))}
                className="w-full accent-amber-600 cursor-pointer h-1.5 bg-[#EFE5C9] rounded-lg"
              />
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* 8. ERASER TOOL (User Request 4: Upgraded single-click & sweep) */}
        {/* ============================================================== */}
        {activeTool === 'eraser' && (
          <div className="flex flex-col gap-3.5">
            <div className="bg-amber-50/90 p-3 rounded-xl border border-amber-300 flex flex-col gap-1.5">
              <div className="flex items-center gap-1.5 font-bold text-amber-900 text-xs">
                <CheckCircle className="w-4 h-4 text-emerald-600" /> Upgraded Precision Eraser
              </div>
              <p className="text-[11px] text-amber-800 leading-relaxed">
                <strong>Click directly</strong> on any stamp, label, or river on the canvas to delete it instantly with single-click accuracy. Or <strong>drag across</strong> to sweep-erase an area.
              </p>
            </div>

            {/* Sweep Brush Size */}
            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between items-center text-[11px]">
                <span className="font-semibold text-slate-700">Sweep Brush Radius</span>
                <span className="font-mono font-bold text-amber-700">{brushSettings.size ?? 30}px</span>
              </div>
              <input
                type="range"
                min="10"
                max="180"
                step="5"
                value={brushSettings.size ?? 30}
                onChange={(e) => onUpdateBrushSettings({ size: Number(e.target.value) })}
                className="w-full accent-amber-600 cursor-pointer h-1.5 bg-[#EFE5C9] rounded-lg"
              />
            </div>

            {/* Eraser Target Filter */}
            <div className="flex flex-col gap-1.5 pt-1 border-t border-[#E2D6B5]/50">
              <span className="font-semibold text-slate-800 text-[11px]">Erase Target Filter</span>
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  { id: 'all', label: 'All Features' },
                  { id: 'stamps', label: 'Stamps Only' },
                  { id: 'labels', label: 'Labels Only' },
                  { id: 'paths', label: 'Rivers & Roads' },
                ].map((t) => (
                  <button
                    key={t.id}
                    onClick={() => onUpdateBrushSettings({ eraserTarget: t.id as any })}
                    className={`py-1.5 rounded-lg font-medium border text-center transition-all cursor-pointer text-xs ${
                      (brushSettings.eraserTarget || 'all') === t.id
                        ? 'bg-[#3E2723] text-amber-200 border-[#2D1B18]'
                        : 'bg-white text-slate-700 border-[#E2D6B5] hover:bg-[#FDF6E3]'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* 9. GRID OVERLAY TOOL */}
        {/* ============================================================== */}
        {activeTool === 'grid' && (
          <div className="flex flex-col gap-3.5">
            <p className="text-[11px] text-slate-600 leading-relaxed">
              Configure tactical square, hex, or isometric navigation grids and nautical rhumb lines via the Layers panel on the right.
            </p>
          </div>
        )}
      </div>
    </aside>
  );
};
