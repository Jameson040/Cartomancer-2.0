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
  PaintBucket,
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
  FlipVertical,
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
import { DEFAULT_BIOMES, DEFAULT_STAMP_ASSETS } from '../data/defaultAssets';

interface ToolSettingsPanelProps {
  activeTool: ToolType;
  onClose: () => void;
  brushSettings: BrushSettings;
  onUpdateBrushSettings: (settings: Partial<BrushSettings>) => void;
  numericHeightfieldEnabled?: boolean;
  onToggleNumericHeightfield?: () => void;
  showHeightfieldOverlay?: boolean;
  onToggleHeightfieldOverlay?: () => void;
  currentHeightMeters?: number | null;
  onSetHeightMeters?: (height: number) => void;
  waterDeepColor: string;
  waterShallowColor: string;
  onWaterDeepColorChange: (color: string) => void;
  onWaterShallowColorChange: (color: string) => void;
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
  pathWidth?: number;
  onPathWidthChange?: (width: number) => void;
  pathColor: string;
  onPathColorChange: (color: string) => void;
  pathTaper: boolean;
  onPathTaperChange: (taper: boolean) => void;
  pathDoubleLine: boolean;
  onPathDoubleLineChange: (val: boolean) => void;
  pathTextureId?: string;
  onPathTextureIdChange?: (textureId: string) => void;
  pathRestrictToLand?: boolean;
  onPathRestrictToLandChange?: (val: boolean) => void;
  pathAutoMerge?: boolean;
  onPathAutoMergeChange?: (val: boolean) => void;
  onUpdateSelectedPath?: (updates: Partial<PlacedPath>) => void;
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
  onDeriveTopography?: () => void;
  // Biome Textures & Shader Lab
  activeBiome: BiomePreset;
  onSelectBiome: (biome: BiomePreset) => void;
  customBiomes?: BiomeTexture[];
  onOpenShaderLab?: () => void;
  onSampleMapColor?: () => void;
}

const BIOMES: { id: BiomePreset; label: string; color: string; desc: string; defaultElevation: number }[] = [
  { id: 'lush_grass', label: 'Verdant Meadow', color: '#5b8e3d', desc: 'Lush temperate plains & valleys', defaultElevation: 15 },
  { id: 'highland_forest', label: 'Ancient Forest', color: '#345e33', desc: 'Dense canopy & evergreen groves', defaultElevation: 35 },
  { id: 'golden_sand', label: 'Sunken Desert', color: '#d4a853', desc: 'Dunes, badlands & sunbaked clay', defaultElevation: 10 },
  { id: 'snow_peaks', label: 'Glacial Tundra', color: '#e2edf8', desc: 'Permafrost, snowfields & blue ice', defaultElevation: 85 },
  { id: 'mountain_stone', label: 'Granite Peaks', color: '#7a7672', desc: 'Exposed stone & scree highlands', defaultElevation: 60 },
  { id: 'swamp_marsh', label: 'Murky Fen', color: '#4a573e', desc: 'Wetlands, mossy bogs & peat', defaultElevation: 5 },
  { id: 'volcanic_ash', label: 'Volcanic Wastes', color: '#383032', desc: 'Basalt, obsidian & scorched earth', defaultElevation: 50 },
  { id: 'red_mesa', label: 'Red Mesa Badlands', color: '#b85d38', desc: 'Terracotta canyons & sandstone', defaultElevation: 45 },
  { id: 'ancient_parchment', label: 'Aged Parchment', color: '#e4d3a8', desc: 'Natural antique parchment wash', defaultElevation: 20 },
  { id: 'cobblestone', label: 'Cobblestone Roads', color: '#83868c', desc: 'Stone paving & castle masonry', defaultElevation: 18 },
  { id: 'shallow_shallows', label: 'Coastal Lagoon', color: '#369ab8', desc: 'Shallow coastal waters & reef shoals', defaultElevation: -5 },
  { id: 'deep_ocean', label: 'Abyssal Ocean', color: '#1a365d', desc: 'Deep ocean depths & nautical blues', defaultElevation: -40 },
];

const BIOME_ALIAS_TO_CANONICAL: Record<string, string> = {
  grassland: 'lush_grass',
  lush_meadow: 'lush_grass',
  ancient_forest: 'highland_forest',
  forest: 'highland_forest',
  arid_desert: 'golden_sand',
  desert: 'golden_sand',
  arctic_frost: 'snow_peaks',
  tundra: 'snow_peaks',
  rocky_crags: 'mountain_stone',
  mountain: 'mountain_stone',
  marshland: 'swamp_marsh',
  swamp: 'swamp_marsh',
};

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
  numericHeightfieldEnabled,
  onToggleNumericHeightfield,
  showHeightfieldOverlay,
  onToggleHeightfieldOverlay,
  currentHeightMeters,
  onSetHeightMeters,
  waterDeepColor,
  waterShallowColor,
  onWaterDeepColorChange,
  onWaterShallowColorChange,
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
  pathWidth,
  onPathWidthChange,
  pathColor,
  onPathColorChange,
  pathTaper,
  onPathTaperChange,
  pathDoubleLine,
  onPathDoubleLineChange,
  pathTextureId = 'default',
  onPathTextureIdChange,
  pathRestrictToLand = true,
  onPathRestrictToLandChange,
  pathAutoMerge = true,
  onPathAutoMergeChange,
  onUpdateSelectedPath,
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
  textPresetStyle,
  onTextPresetStyleChange,
  onHydraulicErosion,
  onDeriveTopography,
  activeBiome,
  onSelectBiome,
  customBiomes = [],
  onOpenShaderLab,
  onSampleMapColor,
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
      case 'fill':
        return { title: 'Region Fill', icon: PaintBucket, subtitle: 'Fill one connected land or water region' };
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
                  <div className="grid grid-cols-3 gap-1 pt-0.5">
                    <button
                      id="btn-stamp-rot-minus45"
                      onClick={() => onUpdateSelectedStamp({ rotation: ((selectedStamp.rotation ?? 0) - 45 + 360) % 360 })}
                      className="py-1 rounded bg-[#F4EBD0] hover:bg-[#EFE5C9] font-medium border border-[#E2D6B5] text-[10px] flex items-center justify-center gap-1 cursor-pointer"
                      title="Rotate -45°"
                    >
                      <RotateCcw className="w-3 h-3" /> -45°
                    </button>
                    <button
                      id="btn-stamp-rot-0"
                      onClick={() => onUpdateSelectedStamp({ rotation: 0 })}
                      className="py-1 rounded bg-[#F4EBD0] hover:bg-[#EFE5C9] font-medium border border-[#E2D6B5] text-[10px] cursor-pointer"
                    >
                      0°
                    </button>
                    <button
                      id="btn-stamp-rot-plus45"
                      onClick={() => onUpdateSelectedStamp({ rotation: ((selectedStamp.rotation ?? 0) + 45) % 360 })}
                      className="py-1 rounded bg-[#F4EBD0] hover:bg-[#EFE5C9] font-medium border border-[#E2D6B5] text-[10px] flex items-center justify-center gap-1 cursor-pointer"
                      title="Rotate +45°"
                    >
                      <RotateCw className="w-3 h-3" /> +45°
                    </button>
                  </div>
                </div>

                {/* Flipping (Mirror) Controls - Flip X & Flip Y */}
                <div className="flex flex-col gap-1.5 pt-1 border-t border-[#E2D6B5]/50">
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="font-semibold text-slate-700">Flipping (Mirror)</span>
                    <span className="text-[10px] font-mono text-amber-800">
                      {selectedStamp.flipX ? 'Flip X ' : ''}
                      {selectedStamp.flipY ? 'Flip Y ' : ''}
                      {!selectedStamp.flipX && !selectedStamp.flipY ? 'Normal' : ''}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      id="btn-selected-flip-x"
                      onClick={() => onUpdateSelectedStamp({ flipX: !selectedStamp.flipX })}
                      className={`py-1.5 px-2 rounded font-medium border text-[11px] flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
                        selectedStamp.flipX
                          ? 'bg-[#3E2723] text-amber-200 border-[#2D1B18] shadow-xs'
                          : 'bg-[#F4EBD0] hover:bg-[#EFE5C9] text-slate-800 border-[#E2D6B5]'
                      }`}
                      title="Flip stamp horizontally (Flip X - mirror left/right)"
                    >
                      <FlipHorizontal className="w-3.5 h-3.5" />
                      <span>Flip X</span>
                    </button>
                    <button
                      id="btn-selected-flip-y"
                      onClick={() => onUpdateSelectedStamp({ flipY: !selectedStamp.flipY })}
                      className={`py-1.5 px-2 rounded font-medium border text-[11px] flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
                        selectedStamp.flipY
                          ? 'bg-[#3E2723] text-amber-200 border-[#2D1B18] shadow-xs'
                          : 'bg-[#F4EBD0] hover:bg-[#EFE5C9] text-slate-800 border-[#E2D6B5]'
                      }`}
                      title="Flip stamp vertically (Flip Y - mirror upside down)"
                    >
                      <FlipVertical className="w-3.5 h-3.5" />
                      <span>Flip Y</span>
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
                  <span className="text-[11px] text-slate-600">Style / Type:</span>
                  <span className="font-bold capitalize text-slate-800">{selectedPath.style}</span>
                </div>
                {/* Stroke Width Slider */}
                <div className="flex flex-col gap-1">
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-slate-600 font-semibold">Stroke Width</span>
                    <span className="font-mono font-bold text-amber-800">{selectedPath.width}px</span>
                  </div>
                  <input
                    type="range"
                    min="2"
                    max="40"
                    step="1"
                    value={selectedPath.width}
                    onChange={(e) => onUpdateSelectedPath?.({ width: Number(e.target.value) })}
                    className="w-full accent-amber-600 cursor-pointer h-1.5 bg-[#EFE5C9] rounded-lg"
                  />
                </div>
                {/* Texture / Material Selector */}
                <div className="flex flex-col gap-1 pt-1 border-t border-[#E2D6B5]/50">
                  <span className="text-[11px] font-semibold text-slate-700">Surface Texture / Material</span>
                  <select
                    value={selectedPath.textureId || 'default'}
                    onChange={(e) => onUpdateSelectedPath?.({ textureId: e.target.value })}
                    className="w-full text-xs p-1.5 rounded-lg border border-[#E2D6B5] bg-white text-slate-800 font-medium"
                  >
                    <option value="default">Default Cartographic Color</option>
                    <optgroup label="Default Biomes">
                      {DEFAULT_BIOMES.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name}
                        </option>
                      ))}
                    </optgroup>
                    {customBiomes && customBiomes.length > 0 && (
                      <optgroup label="Custom Biomes & Shaders">
                        {customBiomes.map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.name}
                          </option>
                        ))}
                      </optgroup>
                    )}
                  </select>
                </div>
                {/* Restrict to Landmass Toggle */}
                <label className="flex items-center justify-between cursor-pointer text-xs pt-1 border-t border-[#E2D6B5]/50">
                  <span className="text-[11px] text-slate-700">Restrict to Landmass</span>
                  <input
                    type="checkbox"
                    checked={selectedPath.restrictToLand !== false}
                    onChange={(e) => onUpdateSelectedPath?.({ restrictToLand: e.target.checked })}
                    className="accent-amber-700 rounded"
                  />
                </label>
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
                  id="landmass-mode-add"
                  onClick={() => onUpdateBrushSettings({ maskMode: 'add_land', mode: 'add' })}
                  className={`py-2 rounded-lg font-semibold border text-center transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    brushSettings.maskMode === 'add_land' || brushSettings.mode === 'add'
                      ? 'bg-[#3E2723] text-amber-200 border-[#2D1B18] shadow-xs'
                      : 'bg-white text-slate-700 border-[#E2D6B5] hover:bg-[#FDF6E3]'
                  }`}
                >
                  <MountainSnow className="w-3.5 h-3.5 text-amber-400" /> Add Landmass
                </button>
                <button
                  id="landmass-mode-carve"
                  onClick={() => onUpdateBrushSettings({ maskMode: 'carve_water', mode: 'subtract' })}
                  className={`py-2 rounded-lg font-semibold border text-center transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    brushSettings.maskMode === 'carve_water' || brushSettings.mode === 'subtract'
                      ? 'bg-[#1e3a8a] text-blue-200 border-[#172554] shadow-xs'
                      : 'bg-white text-slate-700 border-[#E2D6B5] hover:bg-[#FDF6E3]'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5 text-blue-400" /> Carve Ocean
                </button>
              </div>
            </div>

            {/* Water and coastline palette */}
            <div className="flex flex-col gap-2 pt-1 border-t border-[#E2D6B5]/50">
              <span className="font-semibold text-slate-700 text-[11px]">Water Palette</span>
              <div className="grid grid-cols-2 gap-2">
                <label className="flex items-center gap-2 text-[10px] text-slate-600">
                  <input id="water-deep-color" type="color" value={waterDeepColor} onChange={(e) => onWaterDeepColorChange(e.target.value)} className="w-7 h-7 rounded cursor-pointer border-0 p-0" />
                  Deep water
                </label>
                <label className="flex items-center gap-2 text-[10px] text-slate-600">
                  <input id="water-shallow-color" type="color" value={waterShallowColor} onChange={(e) => onWaterShallowColorChange(e.target.value)} className="w-7 h-7 rounded cursor-pointer border-0 p-0" />
                  Shallows
                </label>
              </div>
              <label className="flex items-center gap-2 text-[10px] text-slate-600">
                <input id="coastline-color" type="color" value={brushSettings.coastlineColor} onChange={(e) => onUpdateBrushSettings({ coastlineColor: e.target.value })} className="w-7 h-7 rounded cursor-pointer border-0 p-0" />
                Coastline / foam
              </label>
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

            {/* Edge Falloff */}
            <div className="flex flex-col gap-1.5 pt-1 border-t border-[#E2D6B5]/50">
              <div className="flex justify-between items-center text-[11px]">
                <span className="font-semibold text-slate-700">Edge Softness</span>
                <span className="font-mono font-bold text-amber-700">{Math.round((brushSettings.softness ?? 0.5) * 100)}%</span>
              </div>
              <input
                id="landmass-edge-softness"
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={brushSettings.softness ?? 0.5}
                onChange={(e) => onUpdateBrushSettings({ softness: Number(e.target.value) })}
                className="w-full accent-amber-600 cursor-pointer h-1.5 bg-[#EFE5C9] rounded-lg"
                title="Controls the falloff of add-land and carve-ocean brush edges"
              />
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
            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Brush Presets</span>
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  { id: 'meadow', label: 'Soft Meadow', biome: 'lush_grass', size: 90, softness: 0.8, density: 0.45 },
                  { id: 'forest', label: 'Dense Forest', biome: 'highland_forest', size: 65, softness: 0.55, density: 0.7 },
                  { id: 'desert', label: 'Dry Desert', biome: 'golden_sand', size: 110, softness: 0.65, density: 0.5 },
                  { id: 'mountain', label: 'Rocky Ground', biome: 'mountain_stone', size: 55, softness: 0.35, density: 0.75 },
                ].map((preset) => (
                  <button key={preset.id} onClick={() => onUpdateBrushSettings({ selectedBiome: preset.biome, size: preset.size, softness: preset.softness, density: preset.density, opacity: 0.8 })} className="rounded-lg border border-[#E2D6B5] bg-white px-2 py-1.5 text-[10px] font-semibold text-slate-700 hover:bg-[#FDF6E3]">
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="rounded-lg border border-violet-200 bg-violet-50 p-2.5 flex flex-col gap-2">
              <div className="text-[10px] font-bold uppercase tracking-wider text-violet-800">Texture Color</div>
              <div className="flex items-center justify-between gap-2 text-[10px] font-semibold text-violet-900"><span>Target: {(['shallow_shallows', 'deep_ocean', 'river_water'].includes(brushSettings.selectedBiome) || customBiomes.some((biome) => biome.id === brushSettings.selectedBiome && biome.detailType === 'water')) ? 'WATER' : 'LAND'}</span><span className="rounded px-1.5 py-0.5 bg-white border border-violet-200">Layer constrained</span></div>
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded border border-black/20" style={{ backgroundColor: brushSettings.brushColorOverride || '#94a3b8' }} />
                <span className="text-[10px] text-violet-900 flex-1">{brushSettings.brushColorOverride ? 'Sampled color active' : 'Using selected biome color'}</span>
                {brushSettings.brushColorOverride && <button onClick={() => onUpdateBrushSettings({ brushColorOverride: undefined })} className="text-[10px] underline text-violet-800">Reset</button>}
              </div>
              {onSampleMapColor && <button onClick={onSampleMapColor} className="rounded border border-violet-300 bg-white px-2 py-1.5 text-[10px] font-semibold text-violet-900 hover:bg-violet-100">Sample color from map at cursor</button>}
            </div>

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

            {/* Water textures: paint lakes, seas, marshes, and coastal shelves directly. */}
            <div className="flex flex-col gap-1.5 pb-2 border-b border-[#E2D6B5]/60">
              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700">Water Textures</span>
              <div className="grid grid-cols-2 gap-1.5">
                {BIOMES.filter((b) => ['shallow_shallows', 'deep_ocean', 'river_water'].includes(b.id)).map((b) => {
                  const selected = (brushSettings.selectedBiome || activeBiome) === b.id;
                  return (
                    <button
                      key={b.id}
                      id={`water-texture-${b.id}`}
                      onClick={() => {
                        onUpdateBrushSettings({ selectedBiome: b.id, elevation: b.defaultElevation });
                        onSelectBiome(b.id);
                      }}
                      className={`p-2 rounded-lg border text-left transition-all cursor-pointer ${selected ? 'bg-blue-50 border-blue-500 ring-1 ring-blue-400' : 'bg-white/70 border-[#E2D6B5] hover:bg-blue-50'}`}
                    >
                      <span className="block w-5 h-5 rounded-full border border-black/20 mb-1" style={{ backgroundColor: b.color }} />
                      <span className="block text-[10px] font-semibold text-slate-700 leading-tight">{b.label}</span>
                    </button>
                  );
                })}
              </div>
              <p className="text-[10px] text-slate-500">Carve the water shape with Landmass Sculptor, then paint its texture here. No assets required.</p>
            </div>

            {/* Standard Built-in Biomes */}
            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Standard Biomes</span>
              {BIOMES.map((b) => {
                const currentSelected = brushSettings.selectedBiome || activeBiome;
                const canonicalSelected = BIOME_ALIAS_TO_CANONICAL[currentSelected?.toLowerCase()] || currentSelected;
                const isSelected =
                  currentSelected === b.id ||
                  canonicalSelected === b.id ||
                  activeBiome === b.id;

                return (
                  <button
                    key={b.id}
                    id={`biome-standard-${b.id}`}
                    onClick={() => {
                      onUpdateBrushSettings({ selectedBiome: b.id, elevation: b.defaultElevation });
                      onSelectBiome(b.id);
                    }}
                    className={`p-2 rounded-xl border flex items-center gap-3 transition-all cursor-pointer text-left ${
                      isSelected
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
                    {isSelected && (
                      <CheckCircle className="w-4 h-4 text-amber-600 shrink-0" />
                    )}
                  </button>
                );
              })}
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
        {/* REGION FILL TOOL */}
        {/* ============================================================== */}
        {activeTool === 'fill' ? (
          <div className="flex flex-col gap-3.5">
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
              <div className="font-semibold">One-click region painting</div>
              <p className="mt-1 text-[10px] leading-relaxed">Choose a land or water biome, then click a connected region. Land biomes fill land only; water biomes fill water only.</p>
            </div>
            <button onClick={() => onUpdateBrushSettings({ selectedBiome: 'lush_grass' })} className="rounded-lg border border-[#E2D6B5] bg-white px-3 py-2 text-xs font-semibold hover:bg-[#FDF6E3]">Use default land fill</button>
            <button onClick={() => onUpdateBrushSettings({ selectedBiome: 'shallow_shallows' })} className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-900 hover:bg-blue-100">Use shallow water fill</button>
            <p className="text-[10px] text-slate-500">For another biome, select it in the Biome Texture Brush, then return here.</p>
          </div>
        ) : null}

        {/* ============================================================== */}
        {/* 4. ELEVATION SCULPTOR */}
        {/* ============================================================== */}
        {activeTool === 'elevation' && (
          <div className="flex flex-col gap-3.5">
            <button
              type="button"
              onClick={onToggleNumericHeightfield}
              className={`w-full rounded-lg border px-3 py-2 text-left text-xs ${numericHeightfieldEnabled ? 'border-emerald-500 bg-emerald-50 text-emerald-900' : 'border-[#E2D6B5] bg-white text-slate-700'}`}
            >
              <span className="font-semibold">Numeric heightfield: {numericHeightfieldEnabled ? 'On' : 'Off'}</span>
              <span className="block text-[10px] opacity-75">Optional 4px grid, stored in meters. Off keeps the lightweight raster workflow.</span>
            </button>
            <button
              type="button"
              disabled={!numericHeightfieldEnabled}
              onClick={onToggleHeightfieldOverlay}
              className={`w-full rounded-lg border px-3 py-2 text-left text-xs ${showHeightfieldOverlay ? 'border-sky-500 bg-sky-50 text-sky-900' : 'border-[#E2D6B5] bg-white text-slate-700'} disabled:opacity-40`}
            >
              {showHeightfieldOverlay ? 'Hide' : 'Show'} height colors and contour overlay
            </button>
            {numericHeightfieldEnabled && (
              <div className="rounded-lg border border-sky-200 bg-sky-50 p-2 text-xs text-sky-900">
                <div className="font-semibold">Height inspector</div>
                <div className="text-[10px] opacity-75">Hover the map to inspect the numeric grid.</div>
                <div className="mt-1 flex items-center gap-2">
                  <span className="font-mono">{currentHeightMeters == null ? '—' : `${currentHeightMeters.toFixed(1)} m`}</span>
                  {onSetHeightMeters && currentHeightMeters != null && <input type="number" step="1" defaultValue={Math.round(currentHeightMeters)} onKeyDown={(e) => { if (e.key === 'Enter') onSetHeightMeters(Number((e.target as HTMLInputElement).value)); }} className="w-24 rounded border border-sky-200 px-1 py-0.5" />}
                </div>
              </div>
            )}
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

            {/* Numeric height controls */}
            <div className="grid grid-cols-2 gap-2 pt-1 border-t border-[#E2D6B5]/50">
              <label className="flex flex-col gap-1 text-[10px] font-semibold text-slate-700">
                {brushSettings.elevationMode === 'plateau' ? 'Target height (m)' : 'Height step (m)'}
                <input
                  id="height-paint-value"
                  type="number"
                  min="1"
                  max="20000"
                  step="1"
                  value={Math.abs(brushSettings.elevation)}
                  onChange={(e) => onUpdateBrushSettings({ elevation: Math.max(1, Number(e.target.value) || 1) })}
                  className="rounded border border-[#E2D6B5] bg-white px-2 py-1.5 text-xs font-normal"
                />
              </label>
              <div className="flex flex-col justify-end text-[10px] text-slate-500">
                <span>Raise/lower uses this as meters per dab.</span>
                <span>Plateau sets terrain toward this height.</span>
              </div>
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
              {onDeriveTopography && (
                <button
                  id="generate-world-features-btn"
                  onClick={onDeriveTopography}
                  className="w-full py-2 px-3 rounded-lg bg-sky-100 hover:bg-sky-200 border border-sky-300 font-semibold text-sky-900 text-xs flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                  title="Derive elevation from the landmass and generate editable rivers, roads, and settlement labels"
                >
                  <MountainSnow className="w-4 h-4 text-sky-700" /> Generate World Features
                </button>
              )}
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

            {/* Quick Category Stamp Shelf (Instant variation switching with 0 modal opens) */}
            {(() => {
              const curCat = selectedStampAsset?.category || 'trees';
              const variations = DEFAULT_STAMP_ASSETS.filter((a) => a.category === curCat).slice(0, 10);
              if (variations.length <= 1) return null;
              return (
                <div className="flex flex-col gap-1.5 p-2 bg-white/70 rounded-xl border border-[#E2D6B5]">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="font-semibold text-slate-700 capitalize">
                      Quick {curCat.replace('_', ' ')} Variations
                    </span>
                    <span className="text-slate-400 font-mono">{variations.length} available</span>
                  </div>
                  <div className="grid grid-cols-5 gap-1.5">
                    {variations.map((v) => {
                      const isCur = selectedStampAsset?.id === v.id;
                      return (
                        <button
                          key={v.id}
                          type="button"
                          onClick={() => onUpdateBrushSettings({ selectedStampId: v.id })}
                          className={`w-9 h-9 rounded-lg p-1 border flex items-center justify-center transition-all cursor-pointer ${
                            isCur
                              ? 'bg-amber-100 border-amber-600 ring-2 ring-amber-400 shadow-xs'
                              : 'bg-white border-[#E2D6B5] hover:border-amber-400 hover:bg-amber-50/50'
                          }`}
                          title={v.name}
                        >
                          <img
                            src={v.imageUrl}
                            alt={v.name}
                            loading="lazy"
                            decoding="async"
                            className="max-w-full max-h-full object-contain pointer-events-none"
                          />
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

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

            {/* Placement Flipping (Flip X & Flip Y before stamping) */}
            <div className="flex flex-col gap-1.5 pt-1 border-t border-[#E2D6B5]/50">
              <div className="flex justify-between items-center text-[11px]">
                <span className="font-semibold text-slate-700">Placement Flipping</span>
                <span className="text-[10px] text-slate-500 font-mono">
                  {brushSettings.stampFlipX ? 'Flip X ' : ''}
                  {brushSettings.stampFlipY ? 'Flip Y ' : ''}
                  {!brushSettings.stampFlipX && !brushSettings.stampFlipY ? 'Standard' : ''}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  id="btn-brush-flip-x"
                  onClick={() => onUpdateBrushSettings({ stampFlipX: !brushSettings.stampFlipX })}
                  className={`py-1.5 px-2 rounded font-medium border text-[11px] flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
                    brushSettings.stampFlipX
                      ? 'bg-[#3E2723] text-amber-200 border-[#2D1B18] shadow-xs'
                      : 'bg-white hover:bg-slate-50 text-slate-700 border-[#E2D6B5]'
                  }`}
                  title="Flip stamp horizontally before placing (Flip X)"
                >
                  <FlipHorizontal className="w-3.5 h-3.5" />
                  <span>Flip X</span>
                </button>
                <button
                  id="btn-brush-flip-y"
                  onClick={() => onUpdateBrushSettings({ stampFlipY: !brushSettings.stampFlipY })}
                  className={`py-1.5 px-2 rounded font-medium border text-[11px] flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
                    brushSettings.stampFlipY
                      ? 'bg-[#3E2723] text-amber-200 border-[#2D1B18] shadow-xs'
                      : 'bg-white hover:bg-slate-50 text-slate-700 border-[#E2D6B5]'
                  }`}
                  title="Flip stamp vertically before placing (Flip Y)"
                >
                  <FlipVertical className="w-3.5 h-3.5" />
                  <span>Flip Y</span>
                </button>
              </div>
              <label className="flex items-center gap-2 cursor-pointer text-[11px] pt-0.5 text-slate-700 select-none">
                <input
                  id="chk-randomize-flip-x"
                  type="checkbox"
                  checked={Boolean(brushSettings.randomizeFlipX)}
                  onChange={(e) => onUpdateBrushSettings({ randomizeFlipX: e.target.checked })}
                  className="accent-amber-700 rounded"
                />
                <span>Organic Random Flip X (for forests/mountains)</span>
              </label>
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
              <span className="font-semibold text-slate-800 text-[11px]">Route & Waterway Presets</span>
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  { id: 'river', label: 'Natural River', textureId: 'river_water', color: '#2f7bc9', width: 8, defaultTaper: true, defaultDouble: false },
                  { id: 'road', label: 'Dirt Cart Track', textureId: 'dirt_road', color: '#8b6f47', width: 10, defaultTaper: false, defaultDouble: false },
                  { id: 'road', label: 'Cobblestone Road', textureId: 'cobblestone_road', color: '#8a8a8a', width: 14, defaultTaper: false, defaultDouble: true },
                  { id: 'road', label: 'Paved Stone Way', textureId: 'paved_road', color: '#5a5a5a', width: 16, defaultTaper: false, defaultDouble: true },
                  { id: 'border', label: 'Empire Border', textureId: 'default', color: '#dc2626', width: 3, defaultTaper: false, defaultDouble: false },
                  { id: 'trade_route', label: 'Caravan Route', textureId: 'dirt_road', color: '#b45309', width: 4, defaultTaper: false, defaultDouble: false },
                ].map((p, idx) => {
                  const isSelected =
                    activePathStyle === p.id &&
                    (p.textureId === 'default' ? pathTextureId === 'default' : pathTextureId === p.textureId);
                  return (
                    <button
                      key={`${p.id}_${p.textureId}_${idx}`}
                      onClick={() => {
                        const style = p.id as PathStyle;
                        onPathStyleChange?.(style);
                        onPathColorChange(p.color);
                        onPathTaperChange(p.defaultTaper);
                        onPathDoubleLineChange(p.defaultDouble);
                        if (p.textureId && onPathTextureIdChange) {
                          onPathTextureIdChange(p.textureId);
                        }
                        if (p.width && onPathWidthChange) {
                          onPathWidthChange(p.width);
                        }
                      }}
                      className={`py-2 px-1.5 rounded-lg font-medium border text-center transition-all cursor-pointer text-xs flex items-center justify-start gap-2 ${
                        isSelected
                          ? 'bg-[#3E2723] text-amber-200 border-[#2D1B18] shadow-xs ring-1 ring-amber-500'
                          : 'bg-white text-slate-700 border-[#E2D6B5] hover:bg-[#FDF6E3]'
                      }`}
                    >
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
                      <span className="truncate text-[11px]">{p.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Surface Texture / Material (Shader Lab & Biome Textures) */}
            <div className="flex flex-col gap-2 pt-1 border-t border-[#E2D6B5]/50">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-800 text-[11px]">Surface Texture / Material</span>
                {onOpenShaderLab && (
                  <button
                    onClick={onOpenShaderLab}
                    className="text-[10px] font-medium text-amber-700 hover:text-amber-900 bg-amber-50 hover:bg-amber-100 px-2 py-0.5 rounded border border-amber-200 flex items-center gap-1 cursor-pointer transition-colors"
                    title="Open Shader Lab & Custom Biome Maker to create or import custom textures"
                  >
                    <Sparkles className="w-3 h-3 text-amber-600" /> Shader Lab
                  </button>
                )}
              </div>

              {/* Texture Swatches Grid */}
              <div className="grid grid-cols-2 gap-1.5 max-h-48 overflow-y-auto pr-1">
                {/* Default Cartographic Tint */}
                <button
                  onClick={() => onPathTextureIdChange?.('default')}
                  className={`p-2 rounded-lg border text-left flex items-center gap-2 cursor-pointer transition-all ${
                    pathTextureId === 'default'
                      ? 'bg-amber-100/90 border-amber-600 ring-1 ring-amber-500 shadow-xs'
                      : 'bg-white border-[#E2D6B5] hover:bg-[#FDF6E3]'
                  }`}
                >
                  <span
                    className="w-5 h-5 rounded-md border border-slate-300 shadow-xs shrink-0"
                    style={{ backgroundColor: pathColor || '#38bdf8' }}
                  />
                  <div className="flex flex-col min-w-0">
                    <span className="text-[11px] font-bold text-slate-800 truncate">Default Style</span>
                    <span className="text-[9px] text-slate-500 truncate">Cartographic tint</span>
                  </div>
                </button>

                {/* Default Biomes */}
                {DEFAULT_BIOMES.map((biome) => {
                  const isSelected = pathTextureId === biome.id;
                  return (
                    <button
                      key={biome.id}
                      onClick={() => onPathTextureIdChange?.(biome.id)}
                      className={`p-2 rounded-lg border text-left flex items-center gap-2 cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-amber-100/90 border-amber-600 ring-1 ring-amber-500 shadow-xs'
                          : 'bg-white border-[#E2D6B5] hover:bg-[#FDF6E3]'
                      }`}
                    >
                      <div
                        className="w-5 h-5 rounded-md border border-slate-300 shadow-xs shrink-0"
                        style={{ backgroundColor: biome.color }}
                      />
                      <div className="flex flex-col min-w-0">
                        <span className="text-[11px] font-bold text-slate-800 truncate">{biome.name}</span>
                        <span className="text-[9px] text-slate-500 truncate capitalize">{biome.detailType}</span>
                      </div>
                    </button>
                  );
                })}

                {/* Custom Biomes from Shader Lab */}
                {customBiomes && customBiomes.map((biome) => {
                  const isSelected = pathTextureId === biome.id;
                  return (
                    <button
                      key={biome.id}
                      onClick={() => onPathTextureIdChange?.(biome.id)}
                      className={`p-2 rounded-lg border text-left flex items-center gap-2 cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-amber-100/90 border-amber-600 ring-1 ring-amber-500 shadow-xs'
                          : 'bg-white border-[#E2D6B5] hover:bg-[#FDF6E3]'
                      }`}
                    >
                      {biome.isPattern && biome.patternImageUrl ? (
                        <div
                          className="w-5 h-5 rounded-md border border-slate-300 shadow-xs shrink-0 bg-cover bg-center"
                          style={{ backgroundImage: `url(${biome.patternImageUrl})` }}
                        />
                      ) : (
                        <span
                          className="w-5 h-5 rounded-md border border-slate-300 shadow-xs shrink-0"
                          style={{ backgroundColor: biome.color }}
                        />
                      )}
                      <div className="flex flex-col min-w-0">
                        <span className="text-[11px] font-bold text-slate-800 truncate">{biome.name}</span>
                        <span className="text-[9px] text-amber-600 font-semibold truncate">Custom Shader</span>
                      </div>
                    </button>
                  );
                })}
              </div>
              <p className="text-[10px] text-slate-500 leading-tight">
                Drawn routes and rivers take on the selected surface material. Use Shader Lab & Custom Biome Maker to create or import additional textures.
              </p>
            </div>

            {/* Line Width */}
            <div className="flex flex-col gap-1.5 pt-1 border-t border-[#E2D6B5]/50">
              <div className="flex justify-between items-center text-[11px]">
                <span className="font-semibold text-slate-700">Line Width</span>
                <span className="font-mono font-bold text-amber-700">{pathWidth ?? brushSettings.size ?? 8}px</span>
              </div>
              <input
                type="range"
                min="2"
                max="40"
                step="1"
                value={pathWidth ?? brushSettings.size ?? 8}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  onPathWidthChange?.(val);
                  onUpdateBrushSettings({ size: val });
                }}
                className="w-full accent-amber-600 cursor-pointer h-1.5 bg-[#EFE5C9] rounded-lg"
              />
            </div>

            {/* Color Choice */}
            <div className="flex flex-col gap-1 pt-1 border-t border-[#E2D6B5]/50">
              <span className="font-semibold text-slate-700 text-[11px]">Path Tint Color</span>
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

            {/* Path Routing & Ergonomic Toggles */}
            <div className="flex flex-col gap-2 pt-1 border-t border-[#E2D6B5]/50">
              <span className="font-semibold text-slate-800 text-[11px]">Routing & Boundary Rules</span>

              <label className="flex items-center justify-between cursor-pointer text-xs bg-white/70 p-2 rounded-lg border border-[#E2D6B5]">
                <div className="flex flex-col pr-2">
                  <span className="font-semibold text-slate-800">Restrict to Landmass</span>
                  <span className="text-[10px] text-slate-500">Limits routes & rivers to land (mirrors biome limits; no water spill)</span>
                </div>
                <input
                  type="checkbox"
                  checked={Boolean(pathRestrictToLand)}
                  onChange={(e) => onPathRestrictToLandChange?.(e.target.checked)}
                  className="accent-amber-700 rounded w-4 h-4 cursor-pointer shrink-0"
                />
              </label>

              <label className="flex items-center justify-between cursor-pointer text-xs bg-white/70 p-2 rounded-lg border border-[#E2D6B5]">
                <div className="flex flex-col pr-2">
                  <span className="font-semibold text-slate-800">Auto-Merge Overlapping Ends</span>
                  <span className="text-[10px] text-slate-500">Automatically fuses connected routes & rivers to eliminate seams</span>
                </div>
                <input
                  type="checkbox"
                  checked={Boolean(pathAutoMerge)}
                  onChange={(e) => onPathAutoMergeChange?.(e.target.checked)}
                  className="accent-amber-700 rounded w-4 h-4 cursor-pointer shrink-0"
                />
              </label>

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

            <div className="flex flex-col gap-1.5 pt-1 border-t border-[#E2D6B5]/50">
              <span className="font-semibold text-slate-700 text-[11px]">Label Preset</span>
              <div className="grid grid-cols-3 gap-1">
                {[
                  { id: 'standard', label: 'Standard' },
                  { id: 'regal_serif', label: 'Regal' },
                  { id: 'imperial_spaced', label: 'Imperial' },
                ].map((preset) => (
                  <button key={preset.id} onClick={() => onTextPresetStyleChange(preset.id)} className={`rounded border px-1 py-1.5 text-[10px] font-semibold ${textPresetStyle === preset.id ? 'border-amber-700 bg-amber-100 text-amber-900' : 'border-[#E2D6B5] bg-white text-slate-700 hover:bg-[#FDF6E3]'}`}>
                    {preset.label}
                  </button>
                ))}
              </div>
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
