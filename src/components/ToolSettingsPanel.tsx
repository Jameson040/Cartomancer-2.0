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
  Pipette,
  Circle,
  Square,
  Triangle,
  Hexagon,
  Octagon,
  Pentagon,
  Star,
  Waves,
  Undo2,
  Check,
  ChevronDown,
  ChevronUp,
  Search,
  SlidersHorizontal,
  Palette,
  Shield,
  Lock,
  Unlock,
  Group,
  Ungroup,
} from 'lucide-react';
import {
  ToolType,
  BrushSettings,
  PlacedStamp,
  PlacedText,
  PlacedPath,
  PlacedTerritory,
  StampAsset,
  StampBlendMode,
  BiomePreset,
  PathStyle,
  BiomeTexture,
  LandmassShape,
  GridConfig,
  GridType,
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
  isEyedropperActive?: boolean;
  selectedStampIds?: string[];
  onClearStampSelection?: () => void;
  // Landmass shape & polygon options
  polygonVerticesCount?: number;
  onCommitPolygon?: () => void;
  onUndoPolygonPoint?: () => void;
  onCancelPolygon?: () => void;
  onStampPresetShape?: (shape: LandmassShape) => void;
  // Custom uploaded assets & Multi-Stamp Pool / Style Clipboard / Territory props
  customAssets?: StampAsset[];
  selectedTerritory?: PlacedTerritory | null;
  onUpdateSelectedTerritory?: (updates: Partial<PlacedTerritory>) => void;
  onDeleteSelectedTerritory?: () => void;
  onDuplicateSelectedTerritory?: () => void;
  territoryVerticesCount?: number;
  onCommitTerritory?: () => void;
  onUndoTerritoryPoint?: () => void;
  onCancelTerritory?: () => void;
  onToggleLockStamp?: () => void;
  onGroupStamps?: () => void;
  onUngroupStamps?: () => void;
  onCopyStampStyle?: () => void;
  onPasteStampStyle?: () => void;
  hasStyleClipboard?: boolean;
  // Grid & Cartography Overlay options
  gridConfig?: GridConfig;
  onUpdateGridConfig?: (updates: Partial<GridConfig>) => void;
  topographicalView?: boolean;
  onToggleTopographicalView?: () => void;
  onFillOrClearLandmass?: (fillLand: boolean) => void;
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

export const ToolSettingsPanel: React.FC<ToolSettingsPanelProps> = React.memo(({
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
  isEyedropperActive = false,
  selectedStampIds = [],
  onClearStampSelection,
  polygonVerticesCount = 0,
  onCommitPolygon,
  onUndoPolygonPoint,
  onCancelPolygon,
  onStampPresetShape,
  customAssets = [],
  selectedTerritory = null,
  onUpdateSelectedTerritory,
  onDeleteSelectedTerritory,
  onDuplicateSelectedTerritory,
  territoryVerticesCount = 0,
  onCommitTerritory,
  onUndoTerritoryPoint,
  onCancelTerritory,
  onToggleLockStamp,
  onGroupStamps,
  onUngroupStamps,
  onCopyStampStyle,
  onPasteStampStyle,
  hasStyleClipboard = false,
  gridConfig,
  onUpdateGridConfig,
  topographicalView = false,
  onToggleTopographicalView,
  onFillOrClearLandmass,
}) => {
  const [biomeViewMode, setBiomeViewMode] = React.useState<'minimal' | 'full'>('minimal');
  const [biomeSubTab, setBiomeSubTab] = React.useState<'pro' | 'colors'>('pro');
  const [biomeSearch, setBiomeSearch] = React.useState('');
  const [openSections, setOpenSections] = React.useState<Record<string, boolean>>({
    stampGrading: true,
    stampShadow: false,
    stampDepth: false,
    brushGrading: false,
    brushShadow: false,
  });

  const toggleSection = (key: string) =>
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));

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
      case 'territory':
        return { title: 'Political Territory', icon: Shield, subtitle: 'Kingdom borders & region glow' };
      case 'text':
        return { title: 'Map Labeling', icon: Type, subtitle: 'Cartographic typography & ribbons' };
      case 'eraser':
        return { title: 'Eraser & Thinning', icon: Eraser, subtitle: 'Delete or thin out map features' };
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
                    <span className="font-bold text-slate-800 text-[12px]">
                      {selectedStampIds.length > 1
                        ? `Multi-Selection (${selectedStampIds.length} Assets)`
                        : 'Selected Asset'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] text-slate-500">
                      {selectedStampIds.length > 1 ? 'Batch Transform' : `ID: ${selectedStamp.id.slice(0, 6)}`}
                    </span>
                    {selectedStampIds.length > 1 && onClearStampSelection && (
                      <button
                        onClick={onClearStampSelection}
                        className="text-[10px] text-amber-800 font-semibold hover:underline cursor-pointer"
                        title="Deselect all stamps"
                      >
                        Clear
                      </button>
                    )}
                  </div>
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

                {/* Collapsible: Visual Blending & Color Grading (HSBC + Blend Mode) */}
                <div className="flex flex-col border-t border-[#E2D6B5]/60 pt-1.5">
                  <button
                    id="btn-toggle-stamp-grading"
                    type="button"
                    onClick={() => toggleSection('stampGrading')}
                    className="flex items-center justify-between py-1 text-[11px] font-bold text-slate-800 hover:text-amber-800 cursor-pointer"
                  >
                    <span className="flex items-center gap-1.5">
                      <Palette className="w-3.5 h-3.5 text-amber-700" />
                      Visual Blending & Color Grading
                    </span>
                    {openSections.stampGrading ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>
                  {openSections.stampGrading && (
                    <div className="flex flex-col gap-2 pt-1.5 pb-1 pl-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-semibold text-slate-600">Blend Mode</span>
                        <select
                          id="sel-selected-stamp-blend"
                          value={selectedStamp.blendMode || 'source-over'}
                          onChange={(e) => onUpdateSelectedStamp({ blendMode: e.target.value as StampBlendMode })}
                          className="px-2 py-1 bg-white border border-[#E2D6B5] rounded text-[10px] font-semibold text-slate-800 cursor-pointer"
                        >
                          <option value="source-over">Normal</option>
                          <option value="multiply">Multiply (Ink Blend)</option>
                          <option value="overlay">Overlay (Terrain Contrast)</option>
                          <option value="soft-light">Soft Light (Atmospheric)</option>
                          <option value="screen">Screen (Highlight)</option>
                        </select>
                      </div>

                      <div className="flex flex-col gap-0.5">
                        <div className="flex justify-between text-[10px]">
                          <span className="text-slate-600">Hue Shift</span>
                          <span className="font-mono font-bold text-amber-800">{selectedStamp.hue ?? 0}°</span>
                        </div>
                        <input
                          type="range"
                          min="-180"
                          max="180"
                          step="5"
                          value={selectedStamp.hue ?? 0}
                          onChange={(e) => onUpdateSelectedStamp({ hue: Number(e.target.value) })}
                          className="w-full accent-amber-600 cursor-pointer h-1.5 bg-[#EFE5C9] rounded-lg"
                        />
                      </div>

                      <div className="flex flex-col gap-0.5">
                        <div className="flex justify-between text-[10px]">
                          <span className="text-slate-600">Saturation</span>
                          <span className="font-mono font-bold text-amber-800">{selectedStamp.saturation ?? 100}%</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="200"
                          step="5"
                          value={selectedStamp.saturation ?? 100}
                          onChange={(e) => onUpdateSelectedStamp({ saturation: Number(e.target.value) })}
                          className="w-full accent-amber-600 cursor-pointer h-1.5 bg-[#EFE5C9] rounded-lg"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div className="flex flex-col gap-0.5">
                          <div className="flex justify-between text-[10px]">
                            <span className="text-slate-600">Brightness</span>
                            <span className="font-mono font-bold text-amber-800">{selectedStamp.brightness ?? 100}%</span>
                          </div>
                          <input
                            type="range"
                            min="25"
                            max="175"
                            step="5"
                            value={selectedStamp.brightness ?? 100}
                            onChange={(e) => onUpdateSelectedStamp({ brightness: Number(e.target.value) })}
                            className="w-full accent-amber-600 cursor-pointer h-1.5 bg-[#EFE5C9] rounded-lg"
                          />
                        </div>
                        <div className="flex flex-col gap-0.5">
                          <div className="flex justify-between text-[10px]">
                            <span className="text-slate-600">Contrast</span>
                            <span className="font-mono font-bold text-amber-800">{selectedStamp.contrast ?? 100}%</span>
                          </div>
                          <input
                            type="range"
                            min="25"
                            max="175"
                            step="5"
                            value={selectedStamp.contrast ?? 100}
                            onChange={(e) => onUpdateSelectedStamp({ contrast: Number(e.target.value) })}
                            className="w-full accent-amber-600 cursor-pointer h-1.5 bg-[#EFE5C9] rounded-lg"
                          />
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          onUpdateSelectedStamp({
                            hue: 0,
                            saturation: 100,
                            brightness: 100,
                            contrast: 100,
                            blendMode: 'source-over',
                          })
                        }
                        className="self-end text-[10px] text-amber-700 hover:underline cursor-pointer font-semibold"
                      >
                        Reset Grading
                      </button>
                    </div>
                  )}
                </div>

                {/* Collapsible: Dynamic Drop Shadow & Ambient Ground Occlusion */}
                <div className="flex flex-col border-t border-[#E2D6B5]/60 pt-1.5">
                  <button
                    id="btn-toggle-stamp-shadow"
                    type="button"
                    onClick={() => toggleSection('stampShadow')}
                    className="flex items-center justify-between py-1 text-[11px] font-bold text-slate-800 hover:text-amber-800 cursor-pointer"
                  >
                    <span className="flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-700" />
                      Shadow & Ground Occlusion
                    </span>
                    {openSections.stampShadow ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>
                  {openSections.stampShadow && (
                    <div className="flex flex-col gap-2 pt-1.5 pb-1 pl-1">
                      <label className="flex items-center justify-between text-[11px] cursor-pointer">
                        <span className="font-medium text-slate-700">Enable Drop Shadow</span>
                        <input
                          type="checkbox"
                          checked={selectedStamp.shadow?.enabled ?? false}
                          onChange={(e) =>
                            onUpdateSelectedStamp({
                              shadow: {
                                enabled: e.target.checked,
                                blur: selectedStamp.shadow?.blur ?? 8,
                                offsetX: selectedStamp.shadow?.offsetX ?? 4,
                                offsetY: selectedStamp.shadow?.offsetY ?? 6,
                                opacity: selectedStamp.shadow?.opacity ?? 0.45,
                                groundOcclusion: selectedStamp.shadow?.groundOcclusion ?? 0.35,
                              },
                            })
                          }
                          className="accent-amber-700 rounded cursor-pointer"
                        />
                      </label>

                      <div className="flex flex-col gap-0.5">
                        <div className="flex justify-between text-[10px]">
                          <span className="text-slate-600">Ambient Ground Occlusion</span>
                          <span className="font-mono font-bold text-amber-800">
                            {Math.round(Number(selectedStamp.shadow?.groundOcclusion || 0) * 100)}%
                          </span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.05"
                          value={Number(selectedStamp.shadow?.groundOcclusion || 0)}
                          onChange={(e) =>
                            onUpdateSelectedStamp({
                              shadow: {
                                enabled: selectedStamp.shadow?.enabled ?? true,
                                blur: selectedStamp.shadow?.blur ?? 8,
                                offsetX: selectedStamp.shadow?.offsetX ?? 4,
                                offsetY: selectedStamp.shadow?.offsetY ?? 6,
                                opacity: selectedStamp.shadow?.opacity ?? 0.45,
                                groundOcclusion: Number(e.target.value),
                              },
                            })
                          }
                          className="w-full accent-amber-600 cursor-pointer h-1.5 bg-[#EFE5C9] rounded-lg"
                        />
                      </div>

                      {selectedStamp.shadow?.enabled && (
                        <div className="grid grid-cols-2 gap-2">
                          <div className="flex flex-col gap-0.5">
                            <span className="text-[10px] text-slate-600">Shadow Blur ({selectedStamp.shadow.blur}px)</span>
                            <input
                              type="range"
                              min="0"
                              max="24"
                              step="1"
                              value={selectedStamp.shadow.blur}
                              onChange={(e) =>
                                onUpdateSelectedStamp({
                                  shadow: { ...selectedStamp.shadow!, blur: Number(e.target.value) },
                                })
                              }
                              className="w-full accent-amber-600 cursor-pointer h-1.5 bg-[#EFE5C9] rounded-lg"
                            />
                          </div>
                          <div className="flex flex-col gap-0.5">
                            <span className="text-[10px] text-slate-600">Shadow Opacity ({Math.round(selectedStamp.shadow.opacity * 100)}%)</span>
                            <input
                              type="range"
                              min="0.1"
                              max="0.95"
                              step="0.05"
                              value={selectedStamp.shadow.opacity}
                              onChange={(e) =>
                                onUpdateSelectedStamp({
                                  shadow: { ...selectedStamp.shadow!, opacity: Number(e.target.value) },
                                })
                              }
                              className="w-full accent-amber-600 cursor-pointer h-1.5 bg-[#EFE5C9] rounded-lg"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Z-Axis Depth Coordinate & Layer Ordering */}
                <div className="flex flex-col gap-2 pt-1.5 border-t border-[#E2D6B5]/60">
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
                      <Layers className="w-3 h-3 text-amber-700" /> Bring to Front
                    </button>
                    <button
                      onClick={onSendStampToBack}
                      className="py-1 px-2 rounded bg-[#F4EBD0] hover:bg-[#EFE5C9] font-medium border border-[#E2D6B5] text-[10px] flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Layers className="w-3 h-3 text-slate-500" /> Send to Back
                    </button>
                  </div>
                </div>

                {/* Quick Object Actions: Lock, Group, Style Copy/Paste */}
                <div className="grid grid-cols-2 gap-1.5 pt-1.5 border-t border-[#E2D6B5]/60">
                  {onToggleLockStamp && (
                    <button
                      id="btn-inspector-lock-stamp"
                      onClick={onToggleLockStamp}
                      className={`py-1 px-2 rounded border text-[10px] font-semibold flex items-center justify-center gap-1 cursor-pointer ${
                        selectedStamp.locked
                          ? 'bg-amber-100 text-amber-900 border-amber-400'
                          : 'bg-[#F4EBD0] hover:bg-[#EFE5C9] text-slate-800 border-[#E2D6B5]'
                      }`}
                    >
                      {selectedStamp.locked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                      {selectedStamp.locked ? 'Unlock' : 'Lock Position'}
                    </button>
                  )}
                  {selectedStampIds.length > 1 && onGroupStamps && (
                    <button
                      id="btn-inspector-group-stamps"
                      onClick={onGroupStamps}
                      className="py-1 px-2 rounded bg-[#F4EBD0] hover:bg-[#EFE5C9] border border-[#E2D6B5] text-[10px] font-semibold flex items-center justify-center gap-1 cursor-pointer text-slate-800"
                    >
                      <Group className="w-3 h-3 text-amber-700" /> Group ({selectedStampIds.length})
                    </button>
                  )}
                  {selectedStamp.groupId && onUngroupStamps && (
                    <button
                      id="btn-inspector-ungroup-stamps"
                      onClick={onUngroupStamps}
                      className="py-1 px-2 rounded bg-amber-50 hover:bg-amber-100 border border-amber-300 text-[10px] font-semibold flex items-center justify-center gap-1 cursor-pointer text-amber-900"
                    >
                      <Ungroup className="w-3 h-3" /> Ungroup
                    </button>
                  )}
                  {onCopyStampStyle && (
                    <button
                      id="btn-inspector-copy-style"
                      onClick={onCopyStampStyle}
                      className="py-1 px-2 rounded bg-[#F4EBD0] hover:bg-[#EFE5C9] border border-[#E2D6B5] text-[10px] font-semibold flex items-center justify-center gap-1 cursor-pointer text-slate-800"
                    >
                      Copy Style
                    </button>
                  )}
                  {hasStyleClipboard && onPasteStampStyle && (
                    <button
                      id="btn-inspector-paste-style"
                      onClick={onPasteStampStyle}
                      className="py-1 px-2 rounded bg-amber-100 hover:bg-amber-200 border border-amber-400 text-[10px] font-semibold flex items-center justify-center gap-1 cursor-pointer text-amber-900"
                    >
                      Paste Style
                    </button>
                  )}
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
            ) : selectedTerritory ? (
              <div className="flex flex-col gap-3 bg-white/70 p-3 rounded-xl border border-[#E2D6B5]">
                <div className="flex items-center justify-between border-b border-[#E2D6B5]/70 pb-2">
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-amber-700" />
                    <span className="font-bold text-slate-800 text-[12px]">Selected Territory</span>
                  </div>
                  <span className="font-mono text-[10px] text-slate-500">{selectedTerritory.points.length} vertices</span>
                </div>

                <div className="flex flex-col gap-1">
                  <span className="font-semibold text-slate-700 text-[11px]">Kingdom / Region Name</span>
                  <input
                    type="text"
                    value={selectedTerritory.name || ''}
                    onChange={(e) => onUpdateSelectedTerritory?.({ name: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-white border border-[#E2D6B5] rounded-md text-xs font-semibold"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-semibold text-slate-600">Fill Color</span>
                    <input
                      type="color"
                      value={selectedTerritory.fillColor}
                      onChange={(e) => onUpdateSelectedTerritory?.({ fillColor: e.target.value })}
                      className="w-full h-7 rounded cursor-pointer border border-[#E2D6B5]"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-semibold text-slate-600">Border Color</span>
                    <input
                      type="color"
                      value={selectedTerritory.borderColor}
                      onChange={(e) => onUpdateSelectedTerritory?.({ borderColor: e.target.value })}
                      className="w-full h-7 rounded cursor-pointer border border-[#E2D6B5]"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <div className="flex justify-between text-[10px]">
                    <span className="text-slate-600 font-semibold">Fill Opacity</span>
                    <span className="font-mono font-bold text-amber-800">{Math.round(selectedTerritory.fillOpacity * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.02"
                    max="0.75"
                    step="0.02"
                    value={selectedTerritory.fillOpacity}
                    onChange={(e) => onUpdateSelectedTerritory?.({ fillOpacity: Number(e.target.value) })}
                    className="w-full accent-amber-600 cursor-pointer h-1.5 bg-[#EFE5C9] rounded-lg"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <div className="flex justify-between text-[10px]">
                    <span className="text-slate-600 font-semibold">Inner Border Glow</span>
                    <span className="font-mono font-bold text-amber-800">{selectedTerritory.innerGlowWidth}px</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="60"
                    step="2"
                    value={selectedTerritory.innerGlowWidth}
                    onChange={(e) => onUpdateSelectedTerritory?.({ innerGlowWidth: Number(e.target.value) })}
                    className="w-full accent-amber-600 cursor-pointer h-1.5 bg-[#EFE5C9] rounded-lg"
                  />
                </div>

                <div className="flex gap-2 pt-2 border-t border-[#E2D6B5]/70">
                  {onDuplicateSelectedTerritory && (
                    <button
                      onClick={onDuplicateSelectedTerritory}
                      className="flex-1 py-1.5 rounded-lg bg-[#F4EBD0] hover:bg-[#EFE5C9] font-medium border border-[#E2D6B5] text-[11px] flex items-center justify-center gap-1.5 cursor-pointer text-slate-800"
                    >
                      <Copy className="w-3.5 h-3.5" /> Duplicate
                    </button>
                  )}
                  {onDeleteSelectedTerritory && (
                    <button
                      onClick={onDeleteSelectedTerritory}
                      className="px-3 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 font-medium border border-red-200 text-[11px] flex items-center justify-center gap-1.5 cursor-pointer text-red-700"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Delete
                    </button>
                  )}
                </div>
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
        {/* 2. LANDMASS SCULPTOR */}
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
                      ? 'bg-[#3E2723] text-amber-200 border-[#2D1B18] shadow-xs ring-1 ring-amber-400/50'
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
                      ? 'bg-[#1e3a8a] text-blue-200 border-[#172554] shadow-xs ring-1 ring-blue-400/50'
                      : 'bg-white text-slate-700 border-[#E2D6B5] hover:bg-[#FDF6E3]'
                  }`}
                >
                  <Waves className="w-3.5 h-3.5 text-blue-300" /> Carve Sea / Lake
                </button>
              </div>
            </div>

            {/* Streamlined Cartography Sculpting Shapes (No redundant pentagons/stars) */}
            <div className="flex flex-col gap-1.5 pt-1 border-t border-[#E2D6B5]/50">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-800 text-[11px]">Sculpting Tool</span>
                <span className="text-[10px] font-mono font-bold text-amber-800 uppercase px-1.5 py-0.5 bg-amber-100 rounded border border-amber-300">
                  {brushSettings.landmassShape || 'brush'}
                </span>
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                {[
                  { id: 'brush', label: 'Brush', icon: MountainSnow, title: 'Organic freehand coastline brush' },
                  { id: 'polygon', label: 'Lasso', icon: Spline, title: 'Multi-point freeform continent or bay lasso' },
                  { id: 'circle', label: 'Atoll', icon: Circle, title: 'Circular island, caldera, or crater lake' },
                  { id: 'rectangle', label: 'Block', icon: Square, title: 'Rectangular landmass block, canal, or strait' },
                ].map((item) => {
                  const Icon = item.icon;
                  const isSelected = (brushSettings.landmassShape || 'brush') === item.id;
                  return (
                    <button
                      key={item.id}
                      id={`landmass-shape-${item.id}`}
                      type="button"
                      onClick={() => onUpdateBrushSettings({ landmassShape: item.id as LandmassShape })}
                      className={`py-2 px-1 rounded-lg border text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-1 ${
                        isSelected
                          ? 'bg-[#3E2723] text-amber-200 border-[#2D1B18] shadow-xs ring-2 ring-amber-400/60 font-bold'
                          : 'bg-white text-slate-700 border-[#E2D6B5] hover:bg-[#FDF6E3] hover:border-amber-300'
                      }`}
                      title={item.title}
                    >
                      <Icon className={`w-4 h-4 ${isSelected ? 'text-amber-300' : 'text-slate-600'}`} />
                      <span className="text-[10px] leading-none">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Edge Style: Only shown when using non-brush shapes */}
            {brushSettings.landmassShape && brushSettings.landmassShape !== 'brush' && (
              <div className="flex flex-col gap-1.5 pt-1 border-t border-[#E2D6B5]/50">
                <span className="font-semibold text-slate-800 text-[11px]">Shape Coastline Edge</span>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    id="landmass-edge-fractal"
                    type="button"
                    onClick={() => onUpdateBrushSettings({ landmassEdgeStyle: 'fractal' })}
                    className={`py-1.5 px-2 rounded-lg font-semibold border text-[11px] text-center transition-all cursor-pointer ${
                      brushSettings.landmassEdgeStyle === 'fractal'
                        ? 'bg-[#3E2723] text-amber-200 border-[#2D1B18]'
                        : 'bg-white text-slate-700 border-[#E2D6B5]'
                    }`}
                  >
                    Natural Fractal Coast
                  </button>
                  <button
                    id="landmass-edge-crisp"
                    type="button"
                    onClick={() => onUpdateBrushSettings({ landmassEdgeStyle: 'crisp' })}
                    className={`py-1.5 px-2 rounded-lg font-semibold border text-[11px] text-center transition-all cursor-pointer ${
                      (brushSettings.landmassEdgeStyle || 'crisp') === 'crisp'
                        ? 'bg-[#3E2723] text-amber-200 border-[#2D1B18]'
                        : 'bg-white text-slate-700 border-[#E2D6B5]'
                    }`}
                  >
                    Crisp Geometric
                  </button>
                </div>
              </div>
            )}

            {/* Custom Polygon Controls */}
            {brushSettings.landmassShape === 'polygon' && (
              <div className="rounded-xl border border-amber-300 bg-amber-50/80 p-3 flex flex-col gap-2.5 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                    <Spline className="w-3.5 h-3.5 text-amber-700" />
                    Custom Polygon Drafting
                  </span>
                  <span className="font-mono text-[10px] bg-white px-2 py-0.5 rounded-full border border-amber-200 font-bold text-amber-900">
                    {polygonVerticesCount} {polygonVerticesCount === 1 ? 'vertex' : 'vertices'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Click anywhere on the map canvas to place vertices. Click near the starting point or double-click to close and sculpt.
                </p>
                <div className="flex gap-1.5">
                  <button
                    id="btn-commit-polygon"
                    type="button"
                    disabled={polygonVerticesCount < 3}
                    onClick={onCommitPolygon}
                    className="flex-1 py-1.5 rounded-lg bg-[#3E2723] hover:bg-[#2D1B18] disabled:opacity-40 disabled:pointer-events-none text-amber-200 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                    title="Commit polygon to landmass or water"
                  >
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    {brushSettings.maskMode === 'carve_water' ? 'Carve Water' : 'Sculpt Land'}
                  </button>
                  <button
                    id="btn-undo-polygon-point"
                    type="button"
                    disabled={polygonVerticesCount === 0}
                    onClick={onUndoPolygonPoint}
                    className="p-1.5 rounded-lg bg-white hover:bg-amber-100 disabled:opacity-40 disabled:pointer-events-none text-slate-700 border border-[#E2D6B5] cursor-pointer"
                    title="Undo last vertex"
                  >
                    <Undo2 className="w-4 h-4" />
                  </button>
                  <button
                    id="btn-cancel-polygon"
                    type="button"
                    disabled={polygonVerticesCount === 0}
                    onClick={onCancelPolygon}
                    className="px-2 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 disabled:opacity-40 disabled:pointer-events-none text-red-700 border border-red-200 font-semibold text-xs cursor-pointer"
                    title="Cancel polygon"
                  >
                    Clear
                  </button>
                </div>
              </div>
            )}

            {/* Preset Geometric Shape Quick Controls */}
            {brushSettings.landmassShape &&
              brushSettings.landmassShape !== 'brush' &&
              brushSettings.landmassShape !== 'polygon' && (
                <div className="rounded-xl border border-sky-200 bg-sky-50/70 p-2.5 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-800 text-[11px] capitalize">
                      {brushSettings.landmassShape} Tool
                    </span>
                    <span className="text-[10px] text-sky-800 font-medium">Click & Drag to Size</span>
                  </div>
                  <p className="text-[10px] text-slate-600 leading-normal">
                    Drag on the map to size and rotate, or click once to place at radius {brushSettings.size}px.
                  </p>
                  {onStampPresetShape && (
                    <button
                      id="btn-stamp-shape-center"
                      type="button"
                      onClick={() => onStampPresetShape(brushSettings.landmassShape!)}
                      className="w-full py-1.5 px-2 rounded-lg bg-white hover:bg-sky-100 border border-sky-300 font-semibold text-sky-900 text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all shadow-2xs"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-sky-600" />
                      Place at Map Center ({brushSettings.size}px)
                    </button>
                  )}
                </div>
              )}

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

            {/* Brush / Shape Size */}
            <div className="flex flex-col gap-1.5 pt-1 border-t border-[#E2D6B5]/50">
              <div className="flex justify-between items-center text-[11px]">
                <span className="font-semibold text-slate-700">
                  {brushSettings.landmassShape && brushSettings.landmassShape !== 'brush' ? 'Default Shape Radius' : 'Brush Radius'}
                </span>
                <span className="font-mono font-bold text-amber-700">{brushSettings.size}px</span>
              </div>
              <input
                type="range"
                min="10"
                max="400"
                step="5"
                value={brushSettings.size}
                onChange={(e) => onUpdateBrushSettings({ size: Number(e.target.value) })}
                className="w-full accent-amber-600 cursor-pointer h-1.5 bg-[#EFE5C9] rounded-lg"
              />
              <div className="flex gap-1.5 pt-0.5">
                {[30, 75, 150, 250].map((sz) => (
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

            {/* Fractal Roughness */}
            <div className="flex flex-col gap-1.5 pt-1 border-t border-[#E2D6B5]/50">
              <div className="flex justify-between items-center text-[11px]">
                <span className="font-semibold text-slate-700">Coastline Fractal Roughness</span>
                <span className="font-mono font-bold text-amber-700">{Math.round((brushSettings.roughness ?? 0.6) * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.0"
                max="1.0"
                step="0.05"
                value={brushSettings.roughness ?? 0.6}
                onChange={(e) => onUpdateBrushSettings({ roughness: Number(e.target.value) })}
                className="w-full accent-amber-600 cursor-pointer h-1.5 bg-[#EFE5C9] rounded-lg"
              />
            </div>

            {/* Quick Canvas Flood Actions */}
            {onFillOrClearLandmass && (
              <div className="flex flex-col gap-1.5 pt-2 border-t border-[#E2D6B5]/50">
                <span className="font-semibold text-slate-700 text-[11px]">Quick Canvas Fill</span>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    id="btn-fill-all-land"
                    type="button"
                    onClick={() => onFillOrClearLandmass(true)}
                    className="py-1.5 px-2 rounded-lg border border-[#E2D6B5] bg-white hover:bg-[#FDF6E3] text-[11px] font-semibold cursor-pointer flex items-center justify-center gap-1.5"
                    title="Fill entire canvas with land so you can carve inland seas and rivers"
                  >
                    <MountainSnow className="w-3.5 h-3.5 text-amber-500" />
                    Fill All Land
                  </button>
                  <button
                    id="btn-clear-all-ocean"
                    type="button"
                    onClick={() => onFillOrClearLandmass(false)}
                    className="py-1.5 px-2 rounded-lg border border-[#E2D6B5] bg-white hover:bg-[#FDF6E3] text-[11px] font-semibold cursor-pointer flex items-center justify-center gap-1.5"
                    title="Reset landmass mask to open ocean"
                  >
                    <Waves className="w-3.5 h-3.5 text-sky-400" />
                    Reset to Ocean
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ============================================================== */}
        {/* 3. BIOME TEXTURE BRUSH */}
        {/* ============================================================== */}
        {activeTool === 'brush' && (() => {
          const allBiomesList = [...DEFAULT_BIOMES, ...customBiomes];
          const currentSelectedId = (brushSettings.selectedBiome || activeBiome || 'lush_grass').trim();
          const canonicalId = BIOME_ALIAS_TO_CANONICAL[currentSelectedId.toLowerCase()] || currentSelectedId;
          const activeBiomeObj =
            allBiomesList.find((b) => b.id === currentSelectedId) ||
            allBiomesList.find((b) => b.id.toLowerCase() === canonicalId.toLowerCase()) ||
            allBiomesList.find((b) => b.name.toLowerCase() === currentSelectedId.toLowerCase()) ||
            DEFAULT_BIOMES[0];

          const isWaterTexture =
            ['shallow_shallows', 'deep_ocean', 'river_water'].includes(activeBiomeObj.id) ||
            activeBiomeObj.detailType === 'water' ||
            /water|sea|ocean|lake|river|bay|lagoon|waves|abyss/i.test(activeBiomeObj.name || activeBiomeObj.id);

          const targetDomain = brushSettings.textureTargetDomain || 'auto';
          const effectiveTarget =
            targetDomain === 'water'
              ? 'sea'
              : targetDomain === 'land'
              ? 'land'
              : targetDomain === 'both'
              ? 'both'
              : isWaterTexture
              ? 'sea'
              : 'land';

          const quickBiomes = [
            ...customBiomes.slice(0, 2),
            ...DEFAULT_BIOMES.filter((b) => ['lush_grass', 'highland_forest', 'golden_sand', 'mountain_stone', 'shallow_shallows', 'deep_ocean'].includes(b.id)),
          ].slice(0, 8);

          const filteredCustomBiomes = customBiomes.filter(
            (b) => !biomeSearch || b.name.toLowerCase().includes(biomeSearch.toLowerCase()) || (b.detailType || '').toLowerCase().includes(biomeSearch.toLowerCase())
          );
          const filteredWaterBiomes = BIOMES.filter(
            (b) => ['shallow_shallows', 'deep_ocean', 'river_water'].includes(b.id) &&
              (!biomeSearch || b.label.toLowerCase().includes(biomeSearch.toLowerCase()) || b.desc.toLowerCase().includes(biomeSearch.toLowerCase()))
          );
          const filteredLandBiomes = BIOMES.filter(
            (b) => !['shallow_shallows', 'deep_ocean', 'river_water'].includes(b.id) &&
              (!biomeSearch || b.label.toLowerCase().includes(biomeSearch.toLowerCase()) || b.desc.toLowerCase().includes(biomeSearch.toLowerCase()))
          );

          const flatColorPresets = [
            { name: 'Meadow Green', color: '#4d8036' },
            { name: 'Pine Forest', color: '#244524' },
            { name: 'Desert Sand', color: '#d4a853' },
            { name: 'Lagoon Turquoise', color: '#38bdf8' },
            { name: 'Abyssal Blue', color: '#1a365d' },
            { name: 'Mountain Slate', color: '#64748b' },
            { name: 'Volcanic Ash', color: '#292524' },
            { name: 'Red Badlands', color: '#b85d38' },
            { name: 'Glacial Ice', color: '#e0f2fe' },
            { name: 'Parchment Tan', color: '#e4d3a8' },
          ];

          return (
            <div className="flex flex-col gap-3">
              {/* Top Quick Actions: Shader Lab & Full/Minimal View toggle */}
              <div className="flex items-center gap-1.5">
                {onOpenShaderLab && (
                  <button
                    id="btn-open-shader-lab"
                    type="button"
                    onClick={onOpenShaderLab}
                    className="flex-1 py-1.5 px-2.5 rounded-lg border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all shadow-2xs"
                    title="Shader Lab: sample colors, upload textures and build custom pattern shaders"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-700" />
                    <span>Shader Lab</span>
                  </button>
                )}
                <button
                  id="btn-toggle-biome-mode"
                  type="button"
                  onClick={() => setBiomeViewMode((m) => (m === 'minimal' ? 'full' : 'minimal'))}
                  className="py-1.5 px-2.5 rounded-lg border border-[#E2D6B5] bg-white hover:bg-[#FDF6E3] text-slate-700 font-semibold text-xs flex items-center gap-1 cursor-pointer transition-all shadow-2xs"
                  title={biomeViewMode === 'minimal' ? 'Switch to Full Mode to see all textures' : 'Switch to Minimal Mode'}
                >
                  <SlidersHorizontal className="w-3 h-3 text-slate-500" />
                  <span>{biomeViewMode === 'minimal' ? 'Full Mode' : 'Minimal'}</span>
                  {biomeViewMode === 'minimal' ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
                </button>
              </div>

              {/* CORE TOOL CONTROLS AT TOP (Never pushed to the bottom!) */}
              <div className="rounded-xl border border-[#E2D6B5] bg-white/80 p-2.5 flex flex-col gap-2.5 shadow-2xs">
                {/* 1. Brush Radius Slider */}
                <div className="flex flex-col gap-1">
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="font-semibold text-slate-700">Brush Radius</span>
                    <span className="font-mono font-bold text-amber-700">{brushSettings.size}px</span>
                  </div>
                  <input
                    id="biome-brush-radius"
                    type="range"
                    min="15"
                    max="250"
                    step="5"
                    value={brushSettings.size}
                    onChange={(e) => onUpdateBrushSettings({ size: Number(e.target.value) })}
                    className="w-full accent-amber-600 cursor-pointer h-1.5 bg-[#EFE5C9] rounded-lg"
                  />
                  <div className="flex gap-1 pt-0.5">
                    {[25, 60, 120, 200].map((sz) => (
                      <button
                        key={sz}
                        type="button"
                        onClick={() => onUpdateBrushSettings({ size: sz })}
                        className={`flex-1 py-0.5 rounded border text-[10px] font-medium transition-all cursor-pointer ${
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

                {/* 2. Texture Opacity Slider */}
                <div className="flex flex-col gap-1 pt-1.5 border-t border-[#E2D6B5]/50">
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="font-semibold text-slate-700">Texture Opacity</span>
                    <span className="font-mono font-bold text-amber-700">{Math.round((brushSettings.opacity ?? 0.85) * 100)}%</span>
                  </div>
                  <input
                    id="biome-texture-opacity"
                    type="range"
                    min="0.1"
                    max="1.0"
                    step="0.05"
                    value={brushSettings.opacity ?? 0.85}
                    onChange={(e) => onUpdateBrushSettings({ opacity: Number(e.target.value) })}
                    className="w-full accent-amber-600 cursor-pointer h-1.5 bg-[#EFE5C9] rounded-lg"
                  />
                </div>

                {/* 3. Paint Target (Land vs Sea vs Both) */}
                <div className="flex flex-col gap-1.5 pt-1.5 border-t border-[#E2D6B5]/50">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-700 text-[11px]">Paint Target</span>
                    <span
                      className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full border ${
                        effectiveTarget === 'sea'
                          ? 'bg-blue-100 text-blue-800 border-blue-300'
                          : effectiveTarget === 'both'
                          ? 'bg-purple-100 text-purple-800 border-purple-300'
                          : 'bg-emerald-100 text-emerald-800 border-emerald-300'
                      }`}
                    >
                      {effectiveTarget === 'sea' ? 'Targeting: Sea / Ocean' : effectiveTarget === 'both' ? 'Targeting: All (Land & Sea)' : 'Targeting: Landmass'}
                    </span>
                  </div>
                  <div className="grid grid-cols-4 gap-1">
                    {[
                      { id: 'auto', label: 'Auto' },
                      { id: 'land', label: 'Land' },
                      { id: 'water', label: 'Sea' },
                      { id: 'both', label: 'Both' },
                    ].map((mode) => {
                      const isActive = (brushSettings.textureTargetDomain || 'auto') === mode.id;
                      return (
                        <button
                          key={mode.id}
                          id={`target-domain-${mode.id}`}
                          type="button"
                          onClick={() => onUpdateBrushSettings({ textureTargetDomain: mode.id as any })}
                          className={`py-1 rounded text-[10px] font-semibold transition-all cursor-pointer border ${
                            isActive
                              ? mode.id === 'water'
                                ? 'bg-blue-600 text-white border-blue-700 shadow-2xs'
                                : mode.id === 'both'
                                ? 'bg-purple-700 text-white border-purple-800 shadow-2xs'
                                : 'bg-[#3E2723] text-amber-200 border-[#2D1B18] shadow-2xs'
                              : 'bg-white text-slate-700 border-[#E2D6B5] hover:bg-amber-50'
                          }`}
                          title={
                            mode.id === 'auto'
                              ? 'Automatically paint on sea if water texture, or land if land texture'
                              : mode.id === 'water'
                              ? 'Paint on Sea / Water only (allows imported sea textures to paint on ocean)'
                              : mode.id === 'land'
                              ? 'Paint on Land only'
                              : 'Paint everywhere across both Land and Sea'
                          }
                        >
                          {mode.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* SEPARATED TABS: Pro Biomes & Shaders vs Simple Colors */}
              <div className="flex border-b border-[#E2D6B5] bg-[#F4EBD0]/40 rounded-t-lg overflow-hidden">
                <button
                  type="button"
                  onClick={() => setBiomeSubTab('pro')}
                  className={`flex-1 py-1.5 text-center text-[11px] font-bold transition-all cursor-pointer border-b-2 ${
                    biomeSubTab === 'pro'
                      ? 'border-[#b45309] text-[#78350f] bg-white'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Biomes & Shaders
                </button>
                <button
                  type="button"
                  onClick={() => setBiomeSubTab('colors')}
                  className={`flex-1 py-1.5 text-center text-[11px] font-bold transition-all cursor-pointer border-b-2 ${
                    biomeSubTab === 'colors'
                      ? 'border-[#b45309] text-[#78350f] bg-white'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Simple Colors
                </button>
              </div>

              {/* ----------------- TAB 1: PRO BIOMES & SHADERS ----------------- */}
              {biomeSubTab === 'pro' && (
                <div className="flex flex-col gap-2.5">
                  {/* Active Selected Texture Card */}
                  <div className="p-2 rounded-xl border border-amber-300 bg-amber-50/70 flex items-center gap-2.5 shadow-2xs">
                    {activeBiomeObj.isPattern && activeBiomeObj.patternImageUrl ? (
                      <div
                        className="w-8 h-8 rounded-lg shrink-0 shadow-inner border border-black/20 bg-cover bg-center"
                        style={{ backgroundImage: `url(${activeBiomeObj.patternImageUrl})` }}
                      />
                    ) : (
                      <span
                        className="w-8 h-8 rounded-lg shrink-0 shadow-inner border border-black/20"
                        style={{ backgroundColor: activeBiomeObj.color }}
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="text-[10px] text-amber-800 uppercase font-bold tracking-wider leading-none">Active Texture</div>
                      <div className="font-bold text-slate-900 text-xs truncate leading-tight mt-0.5">{activeBiomeObj.name || (activeBiomeObj as any).label}</div>
                      <div className="text-[9px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                        <span className="capitalize">{activeBiomeObj.detailType || 'biome'}</span>
                        <span>•</span>
                        <span>{isWaterTexture ? 'Water/Sea' : 'Land'}</span>
                      </div>
                    </div>
                    {brushSettings.brushColorOverride && (
                      <button
                        type="button"
                        onClick={() => onUpdateBrushSettings({ brushColorOverride: undefined })}
                        className="text-[10px] underline text-amber-800 font-semibold"
                        title="Reset custom color override"
                      >
                        Reset Tint
                      </button>
                    )}
                  </div>

                  {/* MINIMAL MODE: Clean, compact 8-texture quick picker */}
                  {biomeViewMode === 'minimal' && (
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-semibold text-slate-700">Quick Palette</span>
                        <button
                          type="button"
                          onClick={() => setBiomeViewMode('full')}
                          className="text-amber-800 hover:underline text-[10px] font-bold flex items-center gap-0.5"
                        >
                          <span>Full Library ({allBiomesList.length})</span>
                          <ChevronDown className="w-3 h-3" />
                        </button>
                      </div>

                      <div className="grid grid-cols-4 gap-1.5">
                        {quickBiomes.map((b) => {
                          const isSel = (brushSettings.selectedBiome || activeBiome) === b.id;
                          return (
                            <button
                              key={b.id}
                              type="button"
                              onClick={() => {
                                onUpdateBrushSettings({ selectedBiome: b.id, elevation: b.defaultElevation });
                                onSelectBiome(b.id as any);
                              }}
                              className={`p-1.5 rounded-lg border text-center flex flex-col items-center gap-1 transition-all cursor-pointer ${
                                isSel
                                  ? 'bg-amber-100 border-[#b45309] ring-1 ring-[#b45309] shadow-2xs font-bold'
                                  : 'bg-white hover:bg-amber-50/70 border-[#E2D6B5]'
                              }`}
                              title={`${b.name || (b as any).label} (${b.detailType || 'custom'})`}
                            >
                              {b.isPattern && b.patternImageUrl ? (
                                <div
                                  className="w-6 h-6 rounded-md shadow-inner border border-black/20 bg-cover bg-center"
                                  style={{ backgroundImage: `url(${b.patternImageUrl})` }}
                                />
                              ) : (
                                <span
                                  className="w-6 h-6 rounded-md shadow-inner border border-black/20"
                                  style={{ backgroundColor: b.color }}
                                />
                              )}
                              <span className="text-[9px] text-slate-800 truncate w-full leading-tight font-medium">
                                {b.name || (b as any).label}
                              </span>
                            </button>
                          );
                        })}
                      </div>

                      <button
                        id="btn-open-full-texture-library"
                        type="button"
                        onClick={() => setBiomeViewMode('full')}
                        className="w-full py-2 px-3 rounded-xl border border-dashed border-[#b45309] bg-white hover:bg-amber-50 text-[#78350f] font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all shadow-2xs mt-0.5"
                      >
                        <Layers className="w-3.5 h-3.5 text-amber-700" />
                        <span>Open Full Texture Library ({allBiomesList.length})</span>
                        <ChevronDown className="w-3.5 h-3.5 text-amber-700" />
                      </button>
                    </div>
                  )}

                  {/* FULL MODE: Categorized complete library with search */}
                  {biomeViewMode === 'full' && (
                    <div className="flex flex-col gap-3">
                      {/* Search & Collapse header */}
                      <div className="flex items-center gap-1.5">
                        <div className="relative flex-1">
                          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                          <input
                            type="text"
                            value={biomeSearch}
                            onChange={(e) => setBiomeSearch(e.target.value)}
                            placeholder="Search textures..."
                            className="w-full pl-8 pr-2.5 py-1 text-xs rounded-lg border border-[#E2D6B5] bg-white focus:outline-none focus:border-amber-500"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => setBiomeViewMode('minimal')}
                          className="px-2 py-1 rounded-lg border border-[#E2D6B5] bg-white hover:bg-amber-50 text-slate-700 text-xs font-semibold cursor-pointer"
                          title="Collapse to minimal mode"
                        >
                          Minimal View
                        </button>
                      </div>

                      {/* Section 1: Custom Shaders & Imported Textures */}
                      {filteredCustomBiomes.length > 0 && (
                        <div className="flex flex-col gap-1.5 pb-2 border-b border-[#E2D6B5]/60">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800">
                              Custom & Imported Shaders ({filteredCustomBiomes.length})
                            </span>
                          </div>
                          <div className="flex flex-col gap-1 max-h-48 overflow-y-auto pr-0.5">
                            {filteredCustomBiomes.map((b) => {
                              const isSel = (brushSettings.selectedBiome || activeBiome) === b.id;
                              return (
                                <button
                                  key={b.id}
                                  type="button"
                                  onClick={() => {
                                    onUpdateBrushSettings({ selectedBiome: b.id, elevation: b.defaultElevation });
                                    onSelectBiome(b.id as any);
                                  }}
                                  className={`p-2 rounded-xl border flex items-center gap-2.5 transition-all cursor-pointer text-left ${
                                    isSel
                                      ? 'bg-amber-50 border-[#b45309] shadow-2xs ring-1 ring-[#b45309]'
                                      : 'bg-white hover:bg-amber-50/50 border-[#E2D6B5]'
                                  }`}
                                >
                                  {b.isPattern && b.patternImageUrl ? (
                                    <div
                                      className="w-6 h-6 rounded-md shrink-0 shadow-inner border border-black/20 bg-cover bg-center"
                                      style={{ backgroundImage: `url(${b.patternImageUrl})` }}
                                    />
                                  ) : (
                                    <span
                                      className="w-6 h-6 rounded-md shrink-0 shadow-inner border border-black/20"
                                      style={{ backgroundColor: b.color }}
                                    />
                                  )}
                                  <div className="flex-1 min-w-0">
                                    <div className="font-bold text-slate-900 text-xs truncate leading-tight flex items-center gap-1.5">
                                      <span>{b.name}</span>
                                      <span className="text-[9px] px-1 py-0.2 rounded bg-amber-100 text-amber-800 border border-amber-300 font-mono">
                                        {b.isPattern ? 'Pattern' : 'Shader'}
                                      </span>
                                    </div>
                                    <div className="text-[10px] text-slate-500 capitalize">{b.detailType || 'custom'}</div>
                                  </div>
                                  {isSel && <CheckCircle className="w-4 h-4 text-amber-600 shrink-0" />}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Section 2: Water & Sea Textures */}
                      {filteredWaterBiomes.length > 0 && (
                        <div className="flex flex-col gap-1.5 pb-2 border-b border-[#E2D6B5]/60">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700">Water & Sea Shaders</span>
                          <div className="grid grid-cols-2 gap-1.5">
                            {filteredWaterBiomes.map((b) => {
                              const isSel = (brushSettings.selectedBiome || activeBiome) === b.id;
                              return (
                                <button
                                  key={b.id}
                                  id={`water-texture-${b.id}`}
                                  type="button"
                                  onClick={() => {
                                    onUpdateBrushSettings({ selectedBiome: b.id, elevation: b.defaultElevation });
                                    onSelectBiome(b.id);
                                  }}
                                  className={`p-2 rounded-lg border text-left transition-all cursor-pointer ${
                                    isSel ? 'bg-blue-50 border-blue-500 ring-1 ring-blue-400' : 'bg-white hover:bg-blue-50/70 border-[#E2D6B5]'
                                  }`}
                                >
                                  <span className="block w-5 h-5 rounded-full border border-black/20 mb-1" style={{ backgroundColor: b.color }} />
                                  <span className="block text-[10px] font-semibold text-slate-800 leading-tight">{b.label}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Section 3: Land & Mountain Biomes */}
                      {filteredLandBiomes.length > 0 && (
                        <div className="flex flex-col gap-1.5">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600">Terrain & Land Biomes</span>
                          <div className="flex flex-col gap-1 max-h-56 overflow-y-auto pr-0.5">
                            {filteredLandBiomes.map((b) => {
                              const isSel =
                                currentSelectedId === b.id ||
                                canonicalId === b.id ||
                                activeBiome === b.id;
                              return (
                                <button
                                  key={b.id}
                                  id={`biome-standard-${b.id}`}
                                  type="button"
                                  onClick={() => {
                                    onUpdateBrushSettings({ selectedBiome: b.id, elevation: b.defaultElevation });
                                    onSelectBiome(b.id);
                                  }}
                                  className={`p-2 rounded-xl border flex items-center gap-2.5 transition-all cursor-pointer text-left ${
                                    isSel ? 'bg-white border-[#b45309] shadow-2xs ring-1 ring-[#b45309]' : 'bg-white/70 hover:bg-white border-[#E2D6B5]'
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
                                  {isSel && <CheckCircle className="w-4 h-4 text-amber-600 shrink-0" />}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* ----------------- TAB 2: SIMPLE FLAT COLORS ----------------- */}
              {biomeSubTab === 'colors' && (
                <div className="flex flex-col gap-2.5">
                  <div className="text-[11px] text-slate-600 leading-normal">
                    Flat tint swatches for quick color washes, regional shading, and non-pro tinting.
                  </div>

                  {/* Curated Flat Color Grid */}
                  <div className="grid grid-cols-5 gap-1.5">
                    {flatColorPresets.map((swatch) => {
                      const isSel = brushSettings.brushColorOverride === swatch.color;
                      return (
                        <button
                          key={swatch.color}
                          type="button"
                          onClick={() => onUpdateBrushSettings({ brushColorOverride: swatch.color })}
                          className={`p-1.5 rounded-lg border flex flex-col items-center gap-1 transition-all cursor-pointer ${
                            isSel ? 'bg-amber-100 border-[#b45309] ring-2 ring-[#b45309]' : 'bg-white hover:bg-amber-50 border-[#E2D6B5]'
                          }`}
                          title={swatch.name}
                        >
                          <span className="w-6 h-6 rounded-md shadow-inner border border-black/20" style={{ backgroundColor: swatch.color }} />
                          <span className="text-[9px] text-slate-700 truncate w-full text-center">{swatch.name.split(' ')[0]}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Custom Color Tint & Eyedropper */}
                  <div className="p-2.5 rounded-xl border border-violet-200 bg-violet-50/70 flex flex-col gap-2 mt-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-violet-900 text-xs flex items-center gap-1.5">
                        <Palette className="w-3.5 h-3.5 text-violet-700" />
                        Custom Tint Color
                      </span>
                      {brushSettings.brushColorOverride && (
                        <button
                          type="button"
                          onClick={() => onUpdateBrushSettings({ brushColorOverride: undefined })}
                          className="text-[10px] text-violet-700 hover:underline font-semibold"
                        >
                          Reset Tint
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg border border-black/20 shadow-inner relative overflow-hidden shrink-0" style={{ backgroundColor: brushSettings.brushColorOverride || '#4d8036' }}>
                        <input
                          type="color"
                          value={brushSettings.brushColorOverride || '#4d8036'}
                          onChange={(e) => onUpdateBrushSettings({ brushColorOverride: e.target.value })}
                          className="opacity-0 w-full h-full cursor-pointer absolute inset-0"
                          title="Click to pick custom color"
                        />
                      </div>
                      <span className="text-xs font-mono text-violet-950 flex-1">{brushSettings.brushColorOverride || 'No tint override'}</span>
                    </div>

                    {onSampleMapColor && (
                      <button
                        id="btn-sample-map-color-simple"
                        type="button"
                        onClick={onSampleMapColor}
                        className={`rounded-lg border px-2.5 py-1.5 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                          isEyedropperActive
                            ? 'bg-violet-600 border-violet-700 text-white animate-pulse shadow-sm'
                            : 'border-violet-300 bg-white text-violet-900 hover:bg-violet-100'
                        }`}
                        title="Sample color directly from map canvas"
                      >
                        <Pipette className="w-3.5 h-3.5" />
                        <span>{isEyedropperActive ? 'Click on map to sample (Esc to cancel)' : 'Sample color with Eyedropper'}</span>
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })()}

        {/* ============================================================== */}
        {/* 4. ELEVATION & RELIEF SCULPTOR (Streamlined Artist Controls) */}
        {/* ============================================================== */}
        {activeTool === 'elevation' && (
          <div className="flex flex-col gap-3.5">
            <div className="flex flex-col gap-1.5">
              <span className="font-semibold text-slate-800 text-[11px]">Sculpting Brush Mode</span>
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  { id: 'raise', label: 'Raise Ridges' },
                  { id: 'lower', label: 'Carve Valley' },
                  { id: 'smooth', label: 'Smooth Slopes' },
                  { id: 'plateau', label: 'Flat Mesa' },
                ].map((m) => (
                  <button
                    key={m.id}
                    onClick={() => onUpdateBrushSettings({ elevationMode: m.id as any })}
                    className={`py-2 rounded-lg font-semibold border text-center transition-all cursor-pointer text-xs ${
                      brushSettings.elevationMode === m.id
                        ? 'bg-[#3E2723] text-amber-200 border-[#2D1B18] shadow-xs'
                        : 'bg-white text-slate-700 border-[#E2D6B5] hover:bg-[#FDF6E3]'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Brush Size & Relief Strength */}
            <div className="flex flex-col gap-2 pt-1 border-t border-[#E2D6B5]/50">
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

              <div className="flex justify-between items-center text-[11px] pt-1">
                <span className="font-semibold text-slate-700">
                  {brushSettings.elevationMode === 'plateau' ? 'Plateau Elevation Level' : 'Sculpt Intensity'}
                </span>
                <span className="font-mono font-bold text-amber-700">{Math.min(100, Math.max(5, Math.abs(brushSettings.elevation)))}%</span>
              </div>
              <input
                id="height-paint-value"
                type="range"
                min="5"
                max="100"
                step="5"
                value={Math.min(100, Math.max(5, Math.abs(brushSettings.elevation)))}
                onChange={(e) => onUpdateBrushSettings({ elevation: Number(e.target.value) })}
                className="w-full accent-amber-600 cursor-pointer h-1.5 bg-[#EFE5C9] rounded-lg"
              />
            </div>

            {/* Topographic Contour View Quick Toggle */}
            {onToggleTopographicalView && (
              <div className="pt-1 border-t border-[#E2D6B5]/50">
                <button
                  type="button"
                  onClick={onToggleTopographicalView}
                  className={`w-full py-2 px-3 rounded-lg border font-semibold text-xs flex items-center justify-between cursor-pointer transition-all ${
                    topographicalView
                      ? 'bg-[#3E2723] text-amber-200 border-[#2D1B18]'
                      : 'bg-white text-slate-700 border-[#E2D6B5]'
                  }`}
                >
                  <span>Topographic Contour View</span>
                  <span className="text-[10px] font-mono uppercase">{topographicalView ? 'ON' : 'OFF'}</span>
                </button>
              </div>
            )}

            {/* 1-Click Geological Passes */}
            <div className="pt-2 border-t border-[#E2D6B5]/50 flex flex-col gap-1.5">
              <span className="font-semibold text-slate-800 text-[11px]">Automated Relief Passes</span>
              {onDeriveTopography && (
                <button
                  id="generate-world-features-btn"
                  onClick={onDeriveTopography}
                  className="w-full py-2 px-3 rounded-lg bg-sky-100 hover:bg-sky-200 border border-sky-300 font-semibold text-sky-900 text-xs flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                  title="Derive natural mountain ridges from the interior of your painted continents"
                >
                  <MountainSnow className="w-4 h-4 text-sky-700" /> Derive Continental Ridges
                </button>
              )}
              <button
                onClick={onHydraulicErosion}
                className="w-full py-2 px-3 rounded-lg bg-amber-100 hover:bg-amber-200 border border-amber-300 font-semibold text-amber-900 text-xs flex items-center justify-center gap-2 cursor-pointer shadow-xs"
              >
                <Sparkles className="w-4 h-4 text-amber-700" /> Run Hydraulic Erosion
              </button>
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

            {/* Quick Category Stamp Shelf + Multi-Stamp Variation Pool (Includes Custom Uploaded AI Assets) */}
            {(() => {
              const curCat = selectedStampAsset?.category || 'trees';
              const allCombined = [...customAssets, ...DEFAULT_STAMP_ASSETS];
              const variations = allCombined
                .filter((a) => (curCat === 'custom' ? Boolean(a.isCustom) : a.category === curCat))
                .slice(0, 20);
              const poolIds = brushSettings.stampPoolIds || [];

              const togglePoolItem = (id: string) => {
                const exists = poolIds.includes(id);
                const nextPool = exists ? poolIds.filter((item) => item !== id) : [...poolIds, id];
                onUpdateBrushSettings({ stampPoolIds: nextPool });
              };

              if (variations.length === 0) return null;
              return (
                <div className="flex flex-col gap-2 p-2.5 bg-white/80 rounded-xl border border-[#E2D6B5]">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="font-bold text-slate-800 capitalize flex items-center gap-1">
                      Quick {curCat.replace('_', ' ')} Shelf
                      {customAssets.some((a) => a.category === curCat || curCat === 'custom') && (
                        <span className="px-1 py-0.2 bg-amber-100 text-amber-800 rounded text-[9px] font-bold">
                          +AI Custom
                        </span>
                      )}
                    </span>
                    <span className="text-slate-400 font-mono">{variations.length} assets</span>
                  </div>

                  {/* Multi-Stamp Variation Pool Bar */}
                  <div className="flex items-center justify-between bg-[#F4EBD0]/60 px-2 py-1 rounded-lg border border-[#E2D6B5]">
                    <span className="text-[10px] font-semibold text-amber-950">
                      Multi-Stamp Pool:{' '}
                      <strong className="text-amber-700">
                        {poolIds.length > 0 ? `${poolIds.length} active` : 'Off (Single)'}
                      </strong>
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        id="btn-fill-stamp-pool"
                        type="button"
                        onClick={() => onUpdateBrushSettings({ stampPoolIds: variations.map((v) => v.id) })}
                        className="px-1.5 py-0.5 rounded bg-amber-700 text-white text-[9px] font-semibold hover:bg-amber-800 cursor-pointer"
                        title="Add all variations in this category to the random stroke pool"
                      >
                        Pool All
                      </button>
                      {poolIds.length > 0 && (
                        <button
                          id="btn-clear-stamp-pool"
                          type="button"
                          onClick={() => onUpdateBrushSettings({ stampPoolIds: [] })}
                          className="px-1.5 py-0.5 rounded bg-white text-slate-600 border border-[#E2D6B5] text-[9px] font-semibold hover:bg-red-50 hover:text-red-700 cursor-pointer"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-5 gap-1.5 max-h-36 overflow-y-auto pr-0.5">
                    {variations.map((v) => {
                      const isCur = selectedStampAsset?.id === v.id;
                      const inPool = poolIds.includes(v.id);
                      return (
                        <div key={v.id} className="relative group">
                          <button
                            type="button"
                            onClick={(e) => {
                              if (e.shiftKey) {
                                togglePoolItem(v.id);
                              } else {
                                onUpdateBrushSettings({ selectedStampId: v.id });
                              }
                            }}
                            className={`w-full h-10 rounded-lg p-1 border flex items-center justify-center transition-all cursor-pointer ${
                              isCur
                                ? 'bg-amber-100 border-amber-600 ring-2 ring-amber-400 shadow-xs'
                                : inPool
                                ? 'bg-emerald-50/90 border-emerald-500 ring-1 ring-emerald-400'
                                : 'bg-white border-[#E2D6B5] hover:border-amber-400 hover:bg-amber-50/50'
                            }`}
                            title={`${v.name}${v.isCustom ? ' (Custom AI Asset)' : ''} — Click to select, Shift+Click or '+' to toggle in Multi-Stamp Pool`}
                          >
                            <img
                              src={v.imageUrl}
                              alt={v.name}
                              loading="lazy"
                              decoding="async"
                              className="max-w-full max-h-full object-contain pointer-events-none"
                            />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              togglePoolItem(v.id);
                            }}
                            className={`absolute -top-1 -right-1 w-4 h-4 rounded-full text-[9px] font-bold flex items-center justify-center border shadow-xs cursor-pointer transition-opacity ${
                              inPool
                                ? 'bg-emerald-600 text-white border-emerald-700 opacity-100'
                                : 'bg-white text-slate-700 border-slate-300 opacity-0 group-hover:opacity-100'
                            }`}
                            title={inPool ? 'Remove from Multi-Stamp Pool' : 'Add to Multi-Stamp Pool'}
                          >
                            {inPool ? '✓' : '+'}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                  <span className="text-[9px] text-slate-500 leading-tight">
                    Tip: Click <strong>+</strong> (or Shift+Click) on multiple stamps to sample randomly on every stroke!
                  </span>
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

            {/* Stamp Scale & Opacity */}
            <div className="flex flex-col gap-1.5 pt-1 border-t border-[#E2D6B5]/50">
              <div className="flex justify-between items-center text-[11px]">
                <span className="font-semibold text-slate-700">Stamp Scale (Alt+Wheel)</span>
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
                    className="w-14 px-1.5 py-0.5 text-right font-mono font-bold text-amber-900 bg-white border border-[#E2D6B5] rounded text-[11px]"
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

            {/* Rotation & Flipping */}
            <div className="flex flex-col gap-1.5 pt-1 border-t border-[#E2D6B5]/50">
              <div className="flex justify-between items-center text-[11px]">
                <span className="font-semibold text-slate-700">Rotation (Shift+Wheel)</span>
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
                <label className="flex items-center gap-1.5 cursor-pointer text-[11px]">
                  <input
                    type="checkbox"
                    checked={Boolean(brushSettings.randomizeRotation)}
                    onChange={(e) => onUpdateBrushSettings({ randomizeRotation: e.target.checked })}
                    className="accent-amber-700 rounded"
                  />
                  <span>Random Angle</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer text-[11px]">
                  <input
                    type="checkbox"
                    checked={Boolean(brushSettings.randomizeScale)}
                    onChange={(e) => onUpdateBrushSettings({ randomizeScale: e.target.checked })}
                    className="accent-amber-700 rounded"
                  />
                  <span>Random Size (±15%)</span>
                </label>
              </div>
              <div className="grid grid-cols-2 gap-1.5 pt-1">
                <button
                  id="btn-brush-flip-x"
                  onClick={() => onUpdateBrushSettings({ stampFlipX: !brushSettings.stampFlipX })}
                  className={`py-1 px-2 rounded font-medium border text-[11px] flex items-center justify-center gap-1.5 cursor-pointer ${
                    brushSettings.stampFlipX
                      ? 'bg-[#3E2723] text-amber-200 border-[#2D1B18]'
                      : 'bg-white hover:bg-slate-50 text-slate-700 border-[#E2D6B5]'
                  }`}
                >
                  <FlipHorizontal className="w-3.5 h-3.5" /> Flip X
                </button>
                <button
                  id="btn-brush-flip-y"
                  onClick={() => onUpdateBrushSettings({ stampFlipY: !brushSettings.stampFlipY })}
                  className={`py-1 px-2 rounded font-medium border text-[11px] flex items-center justify-center gap-1.5 cursor-pointer ${
                    brushSettings.stampFlipY
                      ? 'bg-[#3E2723] text-amber-200 border-[#2D1B18]'
                      : 'bg-white hover:bg-slate-50 text-slate-700 border-[#E2D6B5]'
                  }`}
                >
                  <FlipVertical className="w-3.5 h-3.5" /> Flip Y
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

            {/* Collapsible: Pre-Placement Visual Blending & HSBC Grading */}
            <div className="flex flex-col border-t border-[#E2D6B5]/60 pt-1.5">
              <button
                id="btn-toggle-brush-grading"
                type="button"
                onClick={() => toggleSection('brushGrading')}
                className="flex items-center justify-between py-1 text-[11px] font-bold text-slate-800 hover:text-amber-800 cursor-pointer"
              >
                <span className="flex items-center gap-1.5">
                  <Palette className="w-3.5 h-3.5 text-amber-700" />
                  Pre-Placement Color Grading & Blend
                </span>
                {openSections.brushGrading ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
              {openSections.brushGrading && (
                <div className="flex flex-col gap-2 pt-1.5 pb-1 pl-1 bg-white/60 p-2 rounded-lg border border-[#E2D6B5]">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-semibold text-slate-600">Blend Mode</span>
                    <select
                      value={brushSettings.stampBlendMode || 'source-over'}
                      onChange={(e) => onUpdateBrushSettings({ stampBlendMode: e.target.value as StampBlendMode })}
                      className="px-2 py-1 bg-white border border-[#E2D6B5] rounded text-[10px] font-semibold text-slate-800 cursor-pointer"
                    >
                      <option value="source-over">Normal</option>
                      <option value="multiply">Multiply (Ink Blend)</option>
                      <option value="overlay">Overlay</option>
                      <option value="soft-light">Soft Light</option>
                      <option value="screen">Screen</option>
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[10px] text-slate-600">Hue ({brushSettings.stampHue ?? 0}°)</span>
                      <input
                        type="range"
                        min="-180"
                        max="180"
                        step="5"
                        value={brushSettings.stampHue ?? 0}
                        onChange={(e) => onUpdateBrushSettings({ stampHue: Number(e.target.value) })}
                        className="w-full accent-amber-600 cursor-pointer h-1.5 bg-[#EFE5C9] rounded-lg"
                      />
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[10px] text-slate-600">Sat ({brushSettings.stampSaturation ?? 100}%)</span>
                      <input
                        type="range"
                        min="0"
                        max="200"
                        step="5"
                        value={brushSettings.stampSaturation ?? 100}
                        onChange={(e) => onUpdateBrushSettings({ stampSaturation: Number(e.target.value) })}
                        className="w-full accent-amber-600 cursor-pointer h-1.5 bg-[#EFE5C9] rounded-lg"
                      />
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[10px] text-slate-600">Bright ({brushSettings.stampBrightness ?? 100}%)</span>
                      <input
                        type="range"
                        min="25"
                        max="175"
                        step="5"
                        value={brushSettings.stampBrightness ?? 100}
                        onChange={(e) => onUpdateBrushSettings({ stampBrightness: Number(e.target.value) })}
                        className="w-full accent-amber-600 cursor-pointer h-1.5 bg-[#EFE5C9] rounded-lg"
                      />
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[10px] text-slate-600">Contrast ({brushSettings.stampContrast ?? 100}%)</span>
                      <input
                        type="range"
                        min="25"
                        max="175"
                        step="5"
                        value={brushSettings.stampContrast ?? 100}
                        onChange={(e) => onUpdateBrushSettings({ stampContrast: Number(e.target.value) })}
                        className="w-full accent-amber-600 cursor-pointer h-1.5 bg-[#EFE5C9] rounded-lg"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Collapsible: Pre-Placement Shadow & Ground Occlusion */}
            <div className="flex flex-col border-t border-[#E2D6B5]/60 pt-1.5">
              <button
                id="btn-toggle-brush-shadow"
                type="button"
                onClick={() => toggleSection('brushShadow')}
                className="flex items-center justify-between py-1 text-[11px] font-bold text-slate-800 hover:text-amber-800 cursor-pointer"
              >
                <span className="flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-700" />
                  Pre-Placement Shadow & Occlusion
                </span>
                {openSections.brushShadow ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
              {openSections.brushShadow && (
                <div className="flex flex-col gap-2 pt-1.5 pb-1 pl-1 bg-white/60 p-2 rounded-lg border border-[#E2D6B5]">
                  <label className="flex items-center justify-between text-[11px] cursor-pointer">
                    <span className="font-medium text-slate-700">Drop Shadow on Place</span>
                    <input
                      type="checkbox"
                      checked={Boolean(brushSettings.stampShadowEnabled)}
                      onChange={(e) => onUpdateBrushSettings({ stampShadowEnabled: e.target.checked })}
                      className="accent-amber-700 rounded cursor-pointer"
                    />
                  </label>
                  <div className="flex flex-col gap-0.5">
                    <div className="flex justify-between text-[10px]">
                      <span className="text-slate-600">Ground Occlusion</span>
                      <span className="font-mono font-bold text-amber-800">
                        {Math.round(Number(brushSettings.stampGroundOcclusion || 0) * 100)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={Number(brushSettings.stampGroundOcclusion || 0)}
                      onChange={(e) => onUpdateBrushSettings({ stampGroundOcclusion: Number(e.target.value) })}
                      className="w-full accent-amber-600 cursor-pointer h-1.5 bg-[#EFE5C9] rounded-lg"
                    />
                  </div>
                </div>
              )}
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

            {/* Compact Surface Material Override (Replaces 100-line duplicate swatch list) */}
            <div className="flex flex-col gap-1.5 pt-1 border-t border-[#E2D6B5]/50">
              <span className="font-semibold text-slate-800 text-[11px]">Surface Material / Shader</span>
              <select
                value={pathTextureId || 'default'}
                onChange={(e) => onPathTextureIdChange?.(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg border border-[#E2D6B5] bg-white text-xs font-medium cursor-pointer"
              >
                <option value="default">Solid Cartographic Tint</option>
                <optgroup label="Standard Materials">
                  {DEFAULT_BIOMES.map((biome) => (
                    <option key={biome.id} value={biome.id}>
                      {biome.name}
                    </option>
                  ))}
                </optgroup>
                {customBiomes && customBiomes.length > 0 && (
                  <optgroup label="Custom Shaders">
                    {customBiomes.map((biome) => (
                      <option key={biome.id} value={biome.id}>
                        {biome.name}
                      </option>
                    ))}
                  </optgroup>
                )}
              </select>
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
        {/* 6B. POLITICAL TERRITORY & REGION POLYGON TOOL */}
        {/* ============================================================== */}
        {activeTool === 'territory' && (
          <div className="flex flex-col gap-3.5">
            <div className="bg-amber-50/90 p-3 rounded-xl border border-amber-300 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-amber-950 text-xs flex items-center gap-1.5">
                  <Shield className="w-4 h-4 text-amber-700" />
                  Political Region Polygon
                </span>
                <span className="font-mono text-[10px] font-bold text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded border border-amber-300">
                  {territoryVerticesCount} pts
                </span>
              </div>
              <p className="text-[11px] text-amber-900 leading-relaxed">
                <strong>Click on the map</strong> to place border vertices around a kingdom or province. <strong>Double-click</strong> or press <strong>Enter</strong> to close and commit the territory.
              </p>
              {territoryVerticesCount > 0 && (
                <div className="flex items-center gap-1.5 pt-1">
                  <button
                    id="btn-commit-territory"
                    type="button"
                    disabled={territoryVerticesCount < 3}
                    onClick={onCommitTerritory}
                    className="flex-1 py-1.5 px-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 disabled:opacity-40 text-white font-semibold text-[11px] cursor-pointer"
                  >
                    Finish Region ({territoryVerticesCount})
                  </button>
                  <button
                    id="btn-undo-territory-vertex"
                    type="button"
                    onClick={onUndoTerritoryPoint}
                    className="py-1.5 px-2 rounded-lg bg-white hover:bg-amber-100 text-amber-900 border border-amber-300 font-semibold text-[11px] cursor-pointer"
                  >
                    Undo Pt
                  </button>
                  <button
                    id="btn-cancel-territory"
                    type="button"
                    onClick={onCancelTerritory}
                    className="py-1.5 px-2 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 font-semibold text-[11px] cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-1">
              <span className="font-semibold text-slate-800 text-[11px]">Kingdom / Territory Title</span>
              <input
                id="input-territory-name"
                type="text"
                value={brushSettings.territoryName ?? 'Kingdom of Eldoria'}
                onChange={(e) => onUpdateBrushSettings({ territoryName: e.target.value })}
                placeholder="e.g. Kingdom of Eldoria"
                className="w-full px-2.5 py-1.5 bg-white border border-[#E2D6B5] rounded-md text-xs font-semibold"
              />
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1 border-t border-[#E2D6B5]/50">
              <div className="flex flex-col gap-1">
                <span className="font-semibold text-slate-700 text-[11px]">Region Fill Color</span>
                <input
                  id="input-territory-fill-color"
                  type="color"
                  value={brushSettings.territoryFillColor || '#f59e0b'}
                  onChange={(e) => {
                    onUpdateBrushSettings({
                      territoryFillColor: e.target.value,
                      territoryBorderColor: e.target.value,
                    });
                  }}
                  className="w-full h-8 rounded cursor-pointer border border-[#E2D6B5]"
                />
              </div>
              <div className="flex flex-col gap-1">
                <span className="font-semibold text-slate-700 text-[11px]">Border Line Color</span>
                <input
                  id="input-territory-border-color"
                  type="color"
                  value={brushSettings.territoryBorderColor || '#b45309'}
                  onChange={(e) => onUpdateBrushSettings({ territoryBorderColor: e.target.value })}
                  className="w-full h-8 rounded cursor-pointer border border-[#E2D6B5]"
                />
              </div>
            </div>

            {/* Quick Heraldic Faction Presets */}
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-semibold text-slate-600">Heraldic Realm Swatches</span>
              <div className="grid grid-cols-6 gap-1.5">
                {[
                  { fill: '#f59e0b', border: '#b45309', label: 'Solar Gold' },
                  { fill: '#ef4444', border: '#991b1b', label: 'Crimson Empire' },
                  { fill: '#3b82f6', border: '#1d4ed8', label: 'Sapphire Crown' },
                  { fill: '#10b981', border: '#047857', label: 'Sylvan Emerald' },
                  { fill: '#8b5cf6', border: '#5b21b6', label: 'Arcane Violet' },
                  { fill: '#ec4899', border: '#9d174d', label: 'Rose Duchy' },
                ].map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() =>
                      onUpdateBrushSettings({
                        territoryFillColor: preset.fill,
                        territoryBorderColor: preset.border,
                      })
                    }
                    className="h-6 rounded-md border border-slate-300 shadow-xs cursor-pointer transition-transform hover:scale-105"
                    style={{ backgroundColor: preset.fill }}
                    title={preset.label}
                  />
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-1.5 pt-1 border-t border-[#E2D6B5]/50">
              <div className="flex justify-between items-center text-[11px]">
                <span className="font-semibold text-slate-700">Region Fill Opacity</span>
                <span className="font-mono font-bold text-amber-700">
                  {Math.round((brushSettings.territoryFillOpacity ?? 0.18) * 100)}%
                </span>
              </div>
              <input
                type="range"
                min="0.04"
                max="0.65"
                step="0.02"
                value={brushSettings.territoryFillOpacity ?? 0.18}
                onChange={(e) => onUpdateBrushSettings({ territoryFillOpacity: Number(e.target.value) })}
                className="w-full accent-amber-600 cursor-pointer h-1.5 bg-[#EFE5C9] rounded-lg"
              />
            </div>

            <div className="flex flex-col gap-1.5 pt-1 border-t border-[#E2D6B5]/50">
              <div className="flex justify-between items-center text-[11px]">
                <span className="font-semibold text-slate-700">Inner Border Glow Width</span>
                <span className="font-mono font-bold text-amber-700">
                  {brushSettings.territoryInnerGlowWidth ?? 22}px
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="60"
                step="2"
                value={brushSettings.territoryInnerGlowWidth ?? 22}
                onChange={(e) => onUpdateBrushSettings({ territoryInnerGlowWidth: Number(e.target.value) })}
                className="w-full accent-amber-600 cursor-pointer h-1.5 bg-[#EFE5C9] rounded-lg"
              />
            </div>

            <div className="flex flex-col gap-1.5 pt-1 border-t border-[#E2D6B5]/50">
              <span className="font-semibold text-slate-700 text-[11px]">Border Line Style</span>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { id: 'dashed', label: 'Dashed' },
                  { id: 'solid', label: 'Solid' },
                  { id: 'double', label: 'Double' },
                ].map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => onUpdateBrushSettings({ territoryBorderStyle: s.id as any })}
                    className={`py-1.5 rounded-lg font-medium border text-xs cursor-pointer ${
                      (brushSettings.territoryBorderStyle || 'dashed') === s.id
                        ? 'bg-[#3E2723] text-amber-200 border-[#2D1B18]'
                        : 'bg-white text-slate-700 border-[#E2D6B5] hover:bg-[#FDF6E3]'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
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
                  { id: 'territories', label: 'Territories Only' },
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

            {/* Stamp Thinning Brush Probability (Inkarnate-style forest/mountain thinning) */}
            <div className="flex flex-col gap-2 pt-2 border-t border-[#E2D6B5]/60 bg-white/70 p-2.5 rounded-xl border">
              <div className="flex justify-between items-center text-[11px]">
                <span className="font-bold text-slate-800">Stamp Thinning Density</span>
                <span className="font-mono font-bold text-amber-800">
                  {brushSettings.stampEraserDensity ?? 100}%
                </span>
              </div>
              <input
                id="slider-stamp-eraser-density"
                type="range"
                min="10"
                max="100"
                step="5"
                value={brushSettings.stampEraserDensity ?? 100}
                onChange={(e) => onUpdateBrushSettings({ stampEraserDensity: Number(e.target.value) })}
                className="w-full accent-amber-600 cursor-pointer h-1.5 bg-[#EFE5C9] rounded-lg"
              />
              <div className="grid grid-cols-3 gap-1">
                {[
                  { val: 25, label: '25% Thin' },
                  { val: 50, label: '50% Thin' },
                  { val: 100, label: '100% Erase' },
                ].map((preset) => (
                  <button
                    key={preset.val}
                    type="button"
                    onClick={() => onUpdateBrushSettings({ stampEraserDensity: preset.val })}
                    className={`py-1 rounded text-[10px] font-semibold border cursor-pointer ${
                      (brushSettings.stampEraserDensity ?? 100) === preset.val
                        ? 'bg-amber-800 text-amber-100 border-amber-900'
                        : 'bg-[#F4EBD0] text-slate-700 border-[#E2D6B5] hover:bg-[#EFE5C9]'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-slate-500 leading-tight">
                Lower density below 100% to organically thin out dense scattered forests or mountains on each brush pass without wiping clearings bare. Locked stamps are protected.
              </p>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* 9. TACTICAL GRID, COMPASS ROSE, SCALE BAR & ATLAS FRAME TOOL */}
        {/* ============================================================== */}
        {activeTool === 'grid' && gridConfig && onUpdateGridConfig && (
          <div className="flex flex-col gap-3.5">
            {/* Grid Pattern Selector */}
            <div className="flex flex-col gap-1.5">
              <span className="font-semibold text-slate-800 text-[11px]">Grid Overlay Pattern</span>
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  { id: 'none', label: 'No Grid' },
                  { id: 'square', label: 'Square Tactical' },
                  { id: 'hex_flat', label: 'Hex (Flat Top)' },
                  { id: 'hex_pointy', label: 'Hex (Pointy Top)' },
                  { id: 'isometric', label: 'Isometric Diamond' },
                ].map((g) => (
                  <button
                    key={g.id}
                    id={`btn-grid-type-${g.id}`}
                    type="button"
                    onClick={() => onUpdateGridConfig({ type: g.id as GridType })}
                    className={`py-2 px-2 rounded-lg font-semibold border text-xs cursor-pointer transition-all ${
                      gridConfig.type === g.id
                        ? 'bg-[#3E2723] text-amber-200 border-[#2D1B18]'
                        : 'bg-white text-slate-700 border-[#E2D6B5]'
                    }`}
                  >
                    {g.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Grid Size, Opacity & Color */}
            {gridConfig.type !== 'none' && (
              <div className="flex flex-col gap-2 pt-1 border-t border-[#E2D6B5]/50">
                <div className="flex justify-between items-center text-[11px]">
                  <span className="font-semibold text-slate-700">Cell Size</span>
                  <span className="font-mono font-bold text-amber-700">{gridConfig.size}px</span>
                </div>
                <input
                  type="range"
                  min="24"
                  max="180"
                  step="4"
                  value={gridConfig.size}
                  onChange={(e) => onUpdateGridConfig({ size: Number(e.target.value) })}
                  className="w-full accent-amber-600 cursor-pointer h-1.5 bg-[#EFE5C9] rounded-lg"
                />

                <div className="flex justify-between items-center text-[11px] pt-1">
                  <span className="font-semibold text-slate-700">Grid Line Opacity</span>
                  <span className="font-mono font-bold text-amber-700">{Math.round((gridConfig.opacity ?? 0.25) * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0.05"
                  max="0.9"
                  step="0.05"
                  value={gridConfig.opacity ?? 0.25}
                  onChange={(e) => onUpdateGridConfig({ opacity: Number(e.target.value) })}
                  className="w-full accent-amber-600 cursor-pointer h-1.5 bg-[#EFE5C9] rounded-lg"
                />

                <div className="flex items-center justify-between pt-1">
                  <span className="font-semibold text-slate-700 text-[11px]">Grid Line Color</span>
                  <input
                    type="color"
                    value={gridConfig.color || '#ffffff'}
                    onChange={(e) => onUpdateGridConfig({ color: e.target.value })}
                    className="w-8 h-6 rounded cursor-pointer border border-[#E2D6B5]"
                  />
                </div>
              </div>
            )}

            {/* Cartographic Atlas Overlays (Compass Rose, Scale Bar, Frame, Rhumb Lines) */}
            <div className="flex flex-col gap-2 pt-2 border-t border-[#E2D6B5]/50">
              <span className="font-semibold text-slate-800 text-[11px]">Cartographic Atlas Overlays</span>

              <label className="flex items-center justify-between cursor-pointer text-xs bg-white/70 p-2 rounded-lg border border-[#E2D6B5]">
                <div>
                  <div className="font-semibold text-slate-800">Engraved Compass Rose</div>
                  <div className="text-[10px] text-slate-500">8-point ornate cardinal rose on map corner</div>
                </div>
                <input
                  id="chk-grid-compass-rose"
                  type="checkbox"
                  checked={Boolean(gridConfig.showCompassRose)}
                  onChange={(e) => onUpdateGridConfig({ showCompassRose: e.target.checked })}
                  className="accent-amber-700 rounded w-4 h-4 cursor-pointer"
                />
              </label>

              {gridConfig.showCompassRose && (
                <div className="grid grid-cols-3 gap-1">
                  {[
                    { id: 'top-right', label: 'Top Right' },
                    { id: 'bottom-right', label: 'Bottom Right' },
                    { id: 'bottom-left', label: 'Bottom Left' },
                  ].map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => onUpdateGridConfig({ compassCorner: c.id as any })}
                      className={`py-1 rounded text-[10px] font-semibold border cursor-pointer ${
                        (gridConfig.compassCorner || 'top-right') === c.id
                          ? 'bg-[#3E2723] text-amber-200 border-[#2D1B18]'
                          : 'bg-white text-slate-700 border-[#E2D6B5]'
                      }`}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              )}

              <label className="flex items-center justify-between cursor-pointer text-xs bg-white/70 p-2 rounded-lg border border-[#E2D6B5]">
                <div>
                  <div className="font-semibold text-slate-800">Distance Scale Bar</div>
                  <div className="text-[10px] text-slate-500">Segmented cartographic ruler in bottom-right</div>
                </div>
                <input
                  id="chk-grid-scale-bar"
                  type="checkbox"
                  checked={Boolean(gridConfig.showScaleBar)}
                  onChange={(e) => onUpdateGridConfig({ showScaleBar: e.target.checked })}
                  className="accent-amber-700 rounded w-4 h-4 cursor-pointer"
                />
              </label>

              {gridConfig.showScaleBar && (
                <div className="grid grid-cols-2 gap-1.5 bg-white/60 p-2 rounded-lg border border-[#E2D6B5]">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[10px] text-slate-600">Bar Span</span>
                    <input
                      type="number"
                      min="10"
                      max="5000"
                      step="10"
                      value={gridConfig.scaleBarDistance || 200}
                      onChange={(e) => onUpdateGridConfig({ scaleBarDistance: Math.max(10, Number(e.target.value) || 200) })}
                      className="px-2 py-1 rounded border border-[#E2D6B5] bg-white text-xs font-mono"
                    />
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[10px] text-slate-600">Unit</span>
                    <select
                      value={gridConfig.scaleBarUnit || 'miles'}
                      onChange={(e) => onUpdateGridConfig({ scaleBarUnit: e.target.value as any })}
                      className="px-2 py-1 rounded border border-[#E2D6B5] bg-white text-xs font-semibold cursor-pointer"
                    >
                      <option value="miles">Miles</option>
                      <option value="leagues">Leagues</option>
                      <option value="km">Kilometers</option>
                    </select>
                  </div>
                </div>
              )}

              <label className="flex items-center justify-between cursor-pointer text-xs bg-white/70 p-2 rounded-lg border border-[#E2D6B5]">
                <div>
                  <div className="font-semibold text-slate-800">Ornamental Atlas Frame</div>
                  <div className="text-[10px] text-slate-500">Classic alternating degree frame around map</div>
                </div>
                <input
                  id="chk-grid-map-border"
                  type="checkbox"
                  checked={Boolean(gridConfig.showMapBorder)}
                  onChange={(e) => onUpdateGridConfig({ showMapBorder: e.target.checked })}
                  className="accent-amber-700 rounded w-4 h-4 cursor-pointer"
                />
              </label>

              <label className="flex items-center justify-between cursor-pointer text-xs bg-white/70 p-2 rounded-lg border border-[#E2D6B5]">
                <div>
                  <div className="font-semibold text-slate-800">Portolan Nautical Rhumb Lines</div>
                  <div className="text-[10px] text-slate-500">16-point sea navigation ray network</div>
                </div>
                <input
                  id="chk-grid-rhumb-lines"
                  type="checkbox"
                  checked={Boolean(gridConfig.showRhumbLines)}
                  onChange={(e) => onUpdateGridConfig({ showRhumbLines: e.target.checked })}
                  className="accent-amber-700 rounded w-4 h-4 cursor-pointer"
                />
              </label>

              <label className="flex items-center justify-between cursor-pointer text-xs bg-white/70 p-2 rounded-lg border border-[#E2D6B5]">
                <div>
                  <div className="font-semibold text-slate-800">Margin Coordinates (A–Z / 1–20)</div>
                  <div className="text-[10px] text-slate-500">Alphanumeric index along map borders</div>
                </div>
                <input
                  id="chk-grid-coordinates"
                  type="checkbox"
                  checked={Boolean(gridConfig.showCoordinates)}
                  onChange={(e) => onUpdateGridConfig({ showCoordinates: e.target.checked })}
                  className="accent-amber-700 rounded w-4 h-4 cursor-pointer"
                />
              </label>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
});
