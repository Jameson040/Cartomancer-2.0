/**
 * Cartomancer Fantasy Map Maker - Contextual Brush & Tool Settings Bar
 */

import React, { useState, useEffect } from 'react';
import {
  BiomeTexture,
  BrushSettings,
  GridConfig,
  MaskMode,
  PathStyle,
  StampAsset,
  TextBannerStyle,
  TextPresetStyle,
  ToolType,
  WorldElevationConfig,
} from '../types';
import { DEFAULT_BIOMES } from '../data/defaultAssets';
import { WORLD_PRESETS, DEFAULT_WORLD_ELEVATION } from '../utils/elevationModel';
import {
  Sliders,
  Sparkles,
  PlusCircle,
  MinusCircle,
  FlipHorizontal,
  FolderPlus,
  Compass,
  Pipette,
  Layers,
  MountainSnow,
  Globe,
  TrendingUp,
  Settings,
  Waves,
} from 'lucide-react';

interface BrushSettingsPanelProps {
  activeTool: ToolType;
  settings: BrushSettings;
  onSettingsChange: (newSettings: Partial<BrushSettings>) => void;
  gridConfig: GridConfig;
  onGridConfigChange: (newGrid: Partial<GridConfig>) => void;
  selectedAsset: StampAsset | null;
  onOpenAssetLibrary: () => void;
  onOpenAssetOutliner?: () => void;
  customBiomes?: BiomeTexture[];
  onOpenShaderLab?: () => void;
  onHydraulicErosion?: () => void;
  elevationConfig?: WorldElevationConfig;
  onElevationConfigChange?: (cfg: WorldElevationConfig) => void;
  onDeriveTopography?: () => void;
  // Path tool state
  activePathStyle: PathStyle;
  onPathStyleChange: (style: PathStyle) => void;
  pathWidth: number;
  onPathWidthChange: (w: number) => void;
  pathColor: string;
  onPathColorChange: (c: string) => void;
  pathTaper?: boolean;
  onPathTaperChange?: (taper: boolean) => void;
  pathDoubleLine?: boolean;
  onPathDoubleLineChange?: (dl: boolean) => void;
  // Text tool state
  activeTextString: string;
  onTextStringChange: (t: string) => void;
  activeFontFamily: string;
  onFontFamilyChange: (f: string) => void;
  activeFontSize: number;
  onFontSizeChange: (s: number) => void;
  activeTextColor: string;
  onTextColorChange: (c: string) => void;
  activeBannerStyle: TextBannerStyle;
  onBannerStyleChange: (b: TextBannerStyle) => void;
  textCurvature?: number;
  onTextCurvatureChange?: (curv: number) => void;
  textPresetStyle?: TextPresetStyle;
  onTextPresetStyleChange?: (p: TextPresetStyle) => void;
}

export const BrushSettingsPanel: React.FC<BrushSettingsPanelProps> = ({
  activeTool,
  settings,
  onSettingsChange,
  gridConfig,
  onGridConfigChange,
  selectedAsset,
  onOpenAssetLibrary,
  onOpenAssetOutliner,
  customBiomes = [],
  onOpenShaderLab,
  onHydraulicErosion,
  elevationConfig = DEFAULT_WORLD_ELEVATION,
  onElevationConfigChange,
  onDeriveTopography,
  activePathStyle,
  onPathStyleChange,
  pathWidth,
  onPathWidthChange,
  pathColor,
  onPathColorChange,
  pathTaper = true,
  onPathTaperChange,
  pathDoubleLine = false,
  onPathDoubleLineChange,
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
  textCurvature = 0,
  onTextCurvatureChange,
  textPresetStyle = 'standard',
  onTextPresetStyleChange,
}) => {
  const [showWorldConfig, setShowWorldConfig] = useState(false);
  const [customMin, setCustomMin] = useState(elevationConfig.minElevation);
  const [customMax, setCustomMax] = useState(elevationConfig.maxElevation);
  const [customName, setCustomName] = useState(elevationConfig.customName || 'Custom World');

  useEffect(() => {
    setCustomMin(elevationConfig.minElevation);
    setCustomMax(elevationConfig.maxElevation);
    setCustomName(elevationConfig.customName || 'Custom World');
  }, [elevationConfig, showWorldConfig]);

  useEffect(() => {
    if (!showWorldConfig) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowWorldConfig(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showWorldConfig]);

  const handleApplyPreset = (presetKey: string) => {
    const preset = WORLD_PRESETS[presetKey];
    if (preset) {
      setCustomMin(preset.minElevation);
      setCustomMax(preset.maxElevation);
      setCustomName(preset.customName || presetKey);
      if (onElevationConfigChange) {
        onElevationConfigChange({ ...preset });
      }
    }
    setShowWorldConfig(false);
  };

  const handleApplyCustom = () => {
    const updated: WorldElevationConfig = {
      minElevation: Math.min(-100, customMin),
      maxElevation: Math.max(100, customMax),
      seaLevel: 0,
      unit: 'meters',
      worldPreset: 'custom',
      customName: customName || 'Custom World',
    };
    if (onElevationConfigChange) {
      onElevationConfigChange(updated);
    }
    setShowWorldConfig(false);
  };
  return (
    <div
      id="brush-settings-panel"
      className="h-12 bg-[#F9F3DF] border-b border-[#E2D6B5] px-4 flex items-center justify-between text-xs text-slate-800 z-10 overflow-x-auto shadow-xs select-none gap-4"
    >
      {/* 1. MASK TOOL SETTINGS */}
      {activeTool === 'mask' && (
        <div className="flex items-center gap-4 min-w-max">
          {/* Mode toggle */}
          <div className="flex items-center bg-[#EFE5C9]/80 p-0.5 rounded-md border border-[#E2D6B5]">
            <button
              onClick={() => onSettingsChange({ maskMode: 'add_land' as MaskMode })}
              className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-bold transition-all ${
                settings.maskMode === 'add_land'
                  ? 'bg-[#05D5AA] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Add Land</span>
            </button>
            <button
              onClick={() => onSettingsChange({ maskMode: 'carve_water' as MaskMode })}
              className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-bold transition-all ${
                settings.maskMode === 'carve_water'
                  ? 'bg-[#00BBF9] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <MinusCircle className="w-3.5 h-3.5" />
              <span>Carve Sea</span>
            </button>
          </div>

          {/* Brush Size */}
          <div className="flex items-center gap-2">
            <span className="text-slate-700 font-bold">Radius:</span>
            <input
              type="range"
              min="10"
              max="250"
              value={settings.size}
              onChange={(e) => onSettingsChange({ size: Number(e.target.value) })}
              className="w-20 accent-[#00BBF9] cursor-pointer"
            />
            <span className="font-mono text-slate-800 w-8">{settings.size}px</span>
          </div>

          {/* Fractal Coastline Roughness */}
          <div className="flex items-center gap-2 pl-2 border-l border-[#E2D6B5]" title="Fractal Perlin roughness: renders realistic fjords, bays & crags">
            <span className="text-slate-700 font-bold">Roughness:</span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={settings.coastlineRoughness ?? 0.35}
              onChange={(e) => onSettingsChange({ coastlineRoughness: Number(e.target.value) })}
              className="w-16 accent-[#FF7E5F] cursor-pointer"
            />
            <span className="font-mono text-slate-800 w-8">
              {Math.round((settings.coastlineRoughness ?? 0.35) * 100)}%
            </span>
          </div>

          {/* Auto-Beaching Toggle */}
          <button
            onClick={() => onSettingsChange({ autoBeaching: !(settings.autoBeaching ?? true) })}
            className={`px-2 py-0.5 rounded text-[11px] font-semibold border transition-all ${
              (settings.autoBeaching ?? true)
                ? 'bg-[#05D5AA] text-white border-[#05D5AA] shadow-xs'
                : 'bg-white text-slate-700 border-[#E2D6B5] hover:bg-[#FDF6E3]'
            }`}
            title="Auto-beaching: generates shallow sand shelves and turquoise lagoon bands"
          >
            Auto-Beach
          </button>

          {/* Copperplate Hatching Toggle */}
          <button
            onClick={() => onSettingsChange({ coastlineHatching: !(settings.coastlineHatching ?? false) })}
            className={`px-2 py-0.5 rounded text-[11px] font-semibold border transition-all ${
              settings.coastlineHatching
                ? 'bg-[#3e2723] text-white border-[#3e2723] shadow-xs'
                : 'bg-white text-slate-700 border-[#E2D6B5] hover:bg-[#FDF6E3]'
            }`}
            title="Copperplate hatching: authentic historical engraved contour rings"
          >
            Hatching
          </button>

          {/* Coastline ripples */}
          <div className="flex items-center gap-2 pl-2 border-l border-[#E2D6B5]">
            <span className="text-slate-700 font-bold">Ripples:</span>
            <div className="flex items-center gap-1">
              {[0, 1, 2, 3, 4].map((n) => (
                <button
                  key={n}
                  onClick={() => onSettingsChange({ coastlineRipples: n })}
                  className={`w-5 h-5 rounded flex items-center justify-center font-bold text-[10px] ${
                    settings.coastlineRipples === n
                      ? 'bg-[#FF7E5F] text-white ring-1 ring-[#FF7E5F]/50 shadow-xs'
                      : 'bg-white text-slate-700 hover:bg-[#FDF6E3] border border-[#E2D6B5]'
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 2. BIOME BRUSH SETTINGS */}
      {activeTool === 'brush' && (
        <div className="flex items-center gap-4 min-w-max">
          {/* Biome Swatches */}
          <div className="flex items-center gap-1.5 overflow-x-auto py-0.5 max-w-[500px]">
            <span className="text-slate-700 font-bold text-xs shrink-0">Biome:</span>
            {[...DEFAULT_BIOMES, ...customBiomes].map((b) => (
              <button
                key={b.id}
                onClick={() =>
                  onSettingsChange({
                    selectedBiome: b.id,
                    elevation: b.defaultElevation,
                  })
                }
                className={`group relative flex items-center gap-1 px-2 py-0.5 rounded-full border transition-all shrink-0 ${
                  settings.selectedBiome === b.id
                    ? 'border-[#FF7E5F] bg-[#FF7E5F]/15 text-[#D9480F] font-bold ring-2 ring-[#FF7E5F]/50 shadow-xs'
                    : b.isCustom
                    ? 'border-[#06D6A0] bg-emerald-50/50 text-slate-800 hover:bg-emerald-50'
                    : 'border-[#E2D6B5] bg-white text-slate-700 hover:bg-[#FDF6E3]'
                }`}
                title={`${b.name} (${b.isCustom ? 'Custom ' : ''}${b.isPattern ? 'Pattern Shader' : b.detailType})`}
              >
                {b.isPattern && b.patternImageUrl ? (
                  <span
                    className="w-3.5 h-3.5 rounded-full border border-black/30 shadow-inner"
                    style={{
                      backgroundImage: `url(${b.patternImageUrl})`,
                      backgroundSize: 'cover',
                    }}
                  />
                ) : (
                  <span
                    className="w-3 h-3 rounded-full border border-black/30 shadow-inner"
                    style={{ backgroundColor: b.color }}
                  />
                )}
                <span className="text-[11px] font-medium max-w-[90px] truncate">{b.name}</span>
              </button>
            ))}

            {onOpenShaderLab && (
              <button
                onClick={onOpenShaderLab}
                className="flex items-center gap-1 px-2 py-0.5 rounded-full border border-dashed border-[#FF7E5F] bg-[#FF7E5F]/10 hover:bg-[#FF7E5F]/20 text-[#D9480F] text-[11px] font-bold transition-all shadow-xs shrink-0"
              >
                <Pipette className="w-3 h-3 text-[#FF7E5F]" />
                <span>+ Shader Lab</span>
              </button>
            )}
          </div>

          {/* Size */}
          <div className="flex items-center gap-2 pl-2 border-l border-[#E2D6B5]">
            <span className="text-slate-700 font-bold">Radius:</span>
            <input
              type="range"
              min="10"
              max="200"
              value={settings.size}
              onChange={(e) => onSettingsChange({ size: Number(e.target.value) })}
              className="w-16 accent-[#00BBF9] cursor-pointer"
            />
            <span className="font-mono text-slate-800 w-8">{settings.size}px</span>
          </div>

          {/* Color Jitter */}
          <div className="flex items-center gap-2 pl-2 border-l border-[#E2D6B5]" title="Dual-tone organic vegetation color jitter">
            <span className="text-slate-700 font-bold">Jitter:</span>
            <input
              type="range"
              min="0"
              max="0.4"
              step="0.05"
              value={settings.colorJitter ?? 0.15}
              onChange={(e) => onSettingsChange({ colorJitter: Number(e.target.value) })}
              className="w-16 accent-[#FF7E5F] cursor-pointer"
            />
            <span className="font-mono text-slate-800 w-8">
              {Math.round((settings.colorJitter ?? 0.15) * 100)}%
            </span>
          </div>

          {/* Dry Brush Stippling Toggle */}
          <button
            onClick={() => onSettingsChange({ stippleMode: !settings.stippleMode })}
            className={`px-2 py-0.5 rounded text-[11px] font-semibold border transition-all ${
              settings.stippleMode
                ? 'bg-[#00BBF9] text-white border-[#00BBF9] shadow-xs'
                : 'bg-white text-slate-700 border-[#E2D6B5] hover:bg-[#FDF6E3]'
            }`}
            title="Stipple Dry Brush: renders vintage speckled parchment texture"
          >
            Stipple
          </button>
        </div>
      )}

      {/* 3. ELEVATION SCULPTOR SETTINGS */}
      {activeTool === 'elevation' && (
        <div className="flex items-center gap-2.5 min-w-max">
          {/* Target Elevation in Real Meters */}
          <div className="flex items-center gap-1.5 bg-[#EFE5C9]/60 px-2 py-1 rounded-md border border-[#E2D6B5]">
            <span className="text-slate-700 font-bold">Altitude:</span>
            <input
              type="range"
              min={elevationConfig.minElevation}
              max={elevationConfig.maxElevation}
              step={50}
              value={settings.elevation}
              onChange={(e) => onSettingsChange({ elevation: Number(e.target.value) })}
              className="w-24 accent-[#00BBF9] cursor-pointer"
            />
            <div className="flex items-center bg-white px-1.5 py-0.5 rounded border border-[#E2D6B5] shadow-inner">
              <input
                type="number"
                min={elevationConfig.minElevation}
                max={elevationConfig.maxElevation}
                step={50}
                value={settings.elevation}
                onChange={(e) => onSettingsChange({ elevation: Number(e.target.value) })}
                className="w-16 text-right font-mono font-bold text-slate-900 text-xs focus:outline-none bg-transparent"
              />
              <span className="text-[10px] text-slate-500 font-mono ml-0.5">m</span>
            </div>
          </div>

          {/* Quick Altitude Presets */}
          <div className="flex items-center gap-1">
            {[
              { label: '-11k', val: -11000, title: 'Oceanic Trench (-11,000m)' },
              { label: '-4k', val: -4000, title: 'Abyssal Plain (-4,000m)' },
              { label: '-200m', val: -200, title: 'Continental Shelf (-200m)' },
              { label: '0m', val: 0, title: 'Sea Level (0m)' },
              { label: '+300m', val: 300, title: 'Lowland Plains (+300m)' },
              { label: '+1.5k', val: 1500, title: 'Highland Hills (+1,500m)' },
              { label: '+4k', val: 4000, title: 'Alpine Slopes (+4,000m)' },
              { label: '+8.5k', val: 8500, title: 'Continental Summit (+8,500m)' },
              { label: '+14k', val: 14000, title: 'Colossal Mountain Peak (+14,000m)' },
            ].map((preset) => (
              <button
                key={preset.label}
                onClick={() => onSettingsChange({ elevation: preset.val })}
                title={preset.title}
                className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold border transition-all ${
                  settings.elevation === preset.val
                    ? 'bg-[#0077B6] text-white border-[#005B8E] shadow-xs font-bold'
                    : 'bg-white text-slate-700 hover:bg-[#FDF6E3] border-[#E2D6B5]'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>

          {/* World Bounds / Preset Config Button */}
          <button
            onClick={() => setShowWorldConfig(true)}
            className="flex items-center gap-1 px-2 py-1 rounded bg-[#EFE5C9] hover:bg-[#E5D9B6] text-slate-800 border border-[#D5C69E] text-[11px] font-bold shadow-xs transition-all"
            title={`World Bounds: ${elevationConfig.customName || 'World Range'} (${elevationConfig.minElevation.toLocaleString()}m to +${elevationConfig.maxElevation.toLocaleString()}m)`}
          >
            <Globe className="w-3.5 h-3.5 text-[#0077B6]" />
            <span className="max-w-[80px] truncate">{elevationConfig.worldPreset === 'custom' ? 'Custom' : (elevationConfig.customName || 'World Bounds')}</span>
          </button>

          {/* Derive Topography from Drawn Map */}
          {onDeriveTopography && (
            <button
              onClick={onDeriveTopography}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-gradient-to-r from-[#0077B6] via-[#0096C7] to-[#00B4D8] text-white text-[11px] font-bold shadow-xs hover:brightness-105 active:scale-95 transition-all"
              title="Derive Topographical Elevation: Analyzes your drawn landmass coastline, placed mountain stamps, and river paths to generate realistic elevation & hypsometric contours"
            >
              <MountainSnow className="w-3.5 h-3.5" />
              <span>Derive Topography</span>
            </button>
          )}

          {/* Profile Selector */}
          <div className="flex items-center gap-1 pl-1 border-l border-[#E2D6B5]">
            <span className="text-slate-700 font-bold text-[11px]">Profile:</span>
            {[
              { id: 'gaussian', name: 'Peak' },
              { id: 'plateau', name: 'Mesa' },
              { id: 'ridge', name: 'Ridge' },
              { id: 'terraced', name: 'Terrace' },
            ].map((prof) => (
              <button
                key={prof.id}
                onClick={() => onSettingsChange({ elevationProfile: prof.id as any })}
                className={`px-1.5 py-0.5 rounded text-[11px] font-semibold border ${
                  (settings.elevationProfile ?? 'gaussian') === prof.id
                    ? 'bg-[#00BBF9] text-white border-[#0096C7] font-bold shadow-xs'
                    : 'bg-white text-slate-700 hover:bg-[#FDF6E3] border-[#E2D6B5]'
                }`}
              >
                {prof.name}
              </button>
            ))}
          </div>

          {/* Contour Lines Toggle */}
          <div className="flex items-center gap-1 pl-1 border-l border-[#E2D6B5]">
            <button
              onClick={() => onSettingsChange({ showContourLines: !settings.showContourLines })}
              className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${
                settings.showContourLines
                  ? 'bg-[#05D5AA] text-white border-[#05D5AA] shadow-xs'
                  : 'bg-white text-slate-700 border-[#E2D6B5] hover:bg-[#FDF6E3]'
              }`}
            >
              Contours
            </button>
            {settings.showContourLines && (
              <div className="flex items-center gap-0.5">
                {[100, 250, 500, 1000].map((int) => (
                  <button
                    key={int}
                    onClick={() => onSettingsChange({ contourInterval: int })}
                    className={`px-1 py-0.5 rounded text-[10px] font-bold ${
                      (settings.contourInterval ?? 500) === int
                        ? 'bg-[#00BBF9] text-white'
                        : 'bg-white text-slate-700 border border-[#E2D6B5]'
                    }`}
                  >
                    {int >= 1000 ? `${int / 1000}k` : `${int}`}m
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Procedural Noise & Fractal Jitter Brush */}
          <div className="flex items-center gap-1 pl-1 border-l border-[#E2D6B5]">
            <button
              onClick={() => onSettingsChange({ noiseJitter: !(settings.noiseJitter ?? true) })}
              className={`px-2 py-0.5 rounded text-[11px] font-semibold border flex items-center gap-1 ${
                (settings.noiseJitter ?? true)
                  ? 'bg-[#8b5cf6] text-white border-[#7c3aed] shadow-xs'
                  : 'bg-white text-slate-700 border-[#E2D6B5] hover:bg-[#FDF6E3]'
              }`}
              title="Turbulence Modulation: 3-octave fractal noise dabs producing craggy, serrated ridgelines"
            >
              <Sparkles className="w-3 h-3" />
              <span>Craggy Jitter</span>
            </button>
            {(settings.noiseJitter ?? true) && (
              <div className="flex items-center gap-1" title="Roughness of serrated rock edges">
                <input
                  type="range"
                  min="0.1"
                  max="0.8"
                  step="0.05"
                  value={settings.noiseRoughness ?? 0.45}
                  onChange={(e) => onSettingsChange({ noiseRoughness: Number(e.target.value) })}
                  className="w-12 accent-[#8b5cf6] cursor-pointer"
                />
                <span className="font-mono text-slate-800 text-[10px] w-6">
                  {Math.round((settings.noiseRoughness ?? 0.45) * 100)}%
                </span>
              </div>
            )}
          </div>

          {/* Slope-Limited Deposition (Angle of Repose) */}
          <div className="flex items-center gap-1 pl-1 border-l border-[#E2D6B5]">
            <button
              onClick={() => onSettingsChange({ slopeDeposition: !settings.slopeDeposition })}
              className={`px-2 py-0.5 rounded text-[11px] font-semibold border flex items-center gap-1 ${
                settings.slopeDeposition
                  ? 'bg-[#d97706] text-white border-[#b45309] shadow-xs'
                  : 'bg-white text-slate-700 border-[#E2D6B5] hover:bg-[#FDF6E3]'
              }`}
              title="Angle of Repose Talus Deposition: High peaks deposit sharp ridgelines while shedding loose scree and debris down steep slopes"
            >
              <TrendingUp className="w-3 h-3" />
              <span>Talus Repose</span>
            </button>
            {settings.slopeDeposition && (
              <div className="flex items-center gap-1" title="Critical angle of repose before scree cascades downhill">
                <input
                  type="range"
                  min="0.2"
                  max="0.8"
                  step="0.05"
                  value={settings.angleRepose ?? 0.45}
                  onChange={(e) => onSettingsChange({ angleRepose: Number(e.target.value) })}
                  className="w-12 accent-[#d97706] cursor-pointer"
                />
                <span className="font-mono text-slate-800 text-[10px] w-6">
                  {Math.round((settings.angleRepose ?? 0.45) * 60)}°
                </span>
              </div>
            )}
          </div>

          {/* Hydraulic Erosion Simulation Button */}
          {onHydraulicErosion && (
            <button
              onClick={onHydraulicErosion}
              className="flex items-center gap-1 px-2 py-0.5 rounded bg-gradient-to-r from-[#FF7E5F] to-[#D9480F] text-white text-[11px] font-bold shadow-xs hover:opacity-90 transition-all ml-1"
              title="Simulate 5,000 droplets of rainfall carving natural water drainage gullies"
            >
              <Sparkles className="w-3 h-3" />
              <span>Erode</span>
            </button>
          )}
        </div>
      )}

      {/* 4. STAMP TOOL SETTINGS */}
      {activeTool === 'stamp' && (
        <div className="flex items-center gap-3 min-w-max">
          <button
            onClick={onOpenAssetLibrary}
            className="flex items-center gap-2 px-2.5 py-1 bg-white hover:bg-slate-50 rounded-md border border-[#E2D6B5] text-slate-800 shadow-xs transition-all"
          >
            <FolderPlus className="w-4 h-4 text-[#FF7E5F]" />
            <span className="font-bold text-xs">
              {selectedAsset ? selectedAsset.name : 'Select Asset'}
            </span>
          </button>

          {/* Placement mode: Single vs Scatter vs Ribbon Chain */}
          <div className="flex items-center bg-[#EFE5C9]/80 p-0.5 rounded-md border border-[#E2D6B5]">
            <button
              onClick={() => onSettingsChange({ stampPlacementMode: 'single' })}
              className={`px-2 py-0.5 rounded text-xs font-semibold ${
                settings.stampPlacementMode === 'single'
                  ? 'bg-[#00BBF9] text-white font-bold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Single
            </button>
            <button
              onClick={() => onSettingsChange({ stampPlacementMode: 'scatter' })}
              className={`px-2 py-0.5 rounded text-xs font-semibold flex items-center gap-1 ${
                settings.stampPlacementMode === 'scatter'
                  ? 'bg-[#00BBF9] text-white font-bold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Sparkles className="w-3 h-3" />
              <span>Scatter</span>
            </button>
            <button
              onClick={() => onSettingsChange({ stampPlacementMode: 'ribbon' })}
              className={`px-2 py-0.5 rounded text-xs font-semibold flex items-center gap-1 ${
                settings.stampPlacementMode === 'ribbon'
                  ? 'bg-[#FF7E5F] text-white font-bold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Continuous ribbon stamping: drag along a line to plant connected mountain ranges & tree ribbons"
            >
              <span>Ribbon Chain</span>
            </button>
          </div>

          {/* Scale */}
          <div className="flex items-center gap-1.5 pl-2 border-l border-[#E2D6B5]">
            <span className="text-slate-700 font-bold">Scale:</span>
            <input
              id="slider-stamp-scale"
              type="range"
              min="0.3"
              max="2.5"
              step="0.05"
              value={settings.stampScale}
              onChange={(e) => onSettingsChange({ stampScale: Number(e.target.value) })}
              className="w-16 accent-[#00BBF9] cursor-pointer"
            />
            <span className="font-mono text-slate-800 w-8">{settings.stampScale.toFixed(2)}x</span>
          </div>

          {/* Jitter (Scale & Rotation Organic Variation) */}
          <div
            id="control-stamp-jitter"
            className="flex items-center gap-1.5 px-2 py-0.5 bg-white/90 rounded-md border border-[#E2D6B5] shadow-2xs"
            title="Jitter Control: Organic random variation in scale, rotation, and flip so repeated stamps look hand-drawn rather than uniform"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#FF7E5F] shrink-0" />
            <span className="text-slate-800 font-bold text-xs">Jitter:</span>
            <input
              id="slider-stamp-jitter"
              type="range"
              min="0"
              max="0.5"
              step="0.05"
              value={settings.scaleVariance ?? 0.15}
              onChange={(e) => {
                const val = Number(e.target.value);
                onSettingsChange({
                  scaleVariance: val,
                  rotationVariance: Math.round(val * 40), // 0 to 20 degrees
                });
              }}
              className="w-16 accent-[#FF7E5F] cursor-pointer"
            />
            <span className="font-mono font-bold text-[#D9480F] text-xs w-8 text-right">
              {Math.round((settings.scaleVariance ?? 0.15) * 100)}%
            </span>
          </div>

          {/* If Scatter Mode is active, show Scatter Density & Radius controls */}
          {settings.stampPlacementMode === 'scatter' && (
            <div className="flex items-center gap-2 pl-2 border-l border-[#E2D6B5]">
              <div className="flex items-center gap-1" title="Number of assets placed per click or burst">
                <span className="text-slate-700 font-bold">Density:</span>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={settings.scatterDensity ?? 4}
                  onChange={(e) => onSettingsChange({ scatterDensity: Number(e.target.value) })}
                  className="w-12 accent-[#00BBF9] cursor-pointer"
                />
                <span className="font-mono text-slate-800 w-3 text-[11px]">{settings.scatterDensity ?? 4}</span>
              </div>
              <div className="flex items-center gap-1" title="Scatter radius spread">
                <span className="text-slate-700 font-bold">Spread:</span>
                <input
                  type="range"
                  min="20"
                  max="120"
                  step="5"
                  value={settings.scatterRadius ?? 60}
                  onChange={(e) => onSettingsChange({ scatterRadius: Number(e.target.value) })}
                  className="w-14 accent-[#00BBF9] cursor-pointer"
                />
                <span className="font-mono text-slate-800 w-6 text-[11px]">{settings.scatterRadius ?? 60}px</span>
              </div>
            </div>
          )}

          {/* If Ribbon Mode is active, show Ribbon Spacing control */}
          {settings.stampPlacementMode === 'ribbon' && (
            <div className="flex items-center gap-1 pl-2 border-l border-[#E2D6B5]" title="Distance between consecutive stamps along the ribbon chain">
              <span className="text-slate-700 font-bold">Spacing:</span>
              <input
                type="range"
                min="15"
                max="80"
                step="5"
                value={settings.ribbonSpacing ?? 35}
                onChange={(e) => onSettingsChange({ ribbonSpacing: Number(e.target.value) })}
                className="w-14 accent-[#FF7E5F] cursor-pointer"
              />
              <span className="font-mono text-slate-800 w-6 text-[11px]">{settings.ribbonSpacing ?? 35}px</span>
            </div>
          )}

          {/* Seasonal / Environmental Tint */}
          <div className="flex items-center gap-1 pl-2 border-l border-[#E2D6B5]">
            <span className="text-slate-700 font-bold">Tint:</span>
            {[
              { label: 'None', val: '' },
              { label: 'Gold', val: '#d97706' },
              { label: 'Snow', val: '#f1f5f9' },
              { label: 'Twilight', val: '#7e22ce' },
              { label: 'Volcano', val: '#dc2626' },
            ].map((t) => (
              <button
                key={t.label}
                onClick={() => onSettingsChange({ stampTint: t.val })}
                className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${
                  (settings.stampTint || '') === t.val
                    ? 'border-[#FF7E5F] bg-[#FF7E5F]/20 text-[#D9480F]'
                    : 'border-[#E2D6B5] bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 5. PATH / RIVER PEN SETTINGS */}
      {activeTool === 'path' && (
        <div className="flex items-center gap-3 min-w-max">
          <div className="flex items-center gap-1">
            <span className="text-slate-700 font-bold">Style:</span>
            {[
              { id: 'river', name: 'River', color: '#38bdf8' },
              { id: 'road', name: 'Cobblestone Road', color: '#78716c' },
              { id: 'trade_route', name: 'Trade Route', color: '#d97706' },
              { id: 'border', name: 'Kingdom Border', color: '#dc2626' },
            ].map((st) => (
              <button
                key={st.id}
                onClick={() => {
                  onPathStyleChange(st.id as PathStyle);
                  onPathColorChange(st.color);
                }}
                className={`px-2.5 py-0.5 rounded text-[11px] font-semibold border ${
                  activePathStyle === st.id
                    ? 'bg-[#00BBF9] text-white border-[#0096C7] font-bold shadow-xs'
                    : 'bg-white text-slate-700 hover:bg-[#FDF6E3] border-[#E2D6B5]'
                }`}
              >
                {st.name}
              </button>
            ))}
          </div>

          {/* Width */}
          <div className="flex items-center gap-2 pl-2 border-l border-[#E2D6B5]">
            <span className="text-slate-700 font-bold">Width:</span>
            <input
              type="range"
              min="2"
              max="24"
              value={pathWidth}
              onChange={(e) => onPathWidthChange(Number(e.target.value))}
              className="w-16 accent-[#00BBF9] cursor-pointer"
            />
            <span className="font-mono text-slate-800 w-8">{pathWidth}px</span>
          </div>

          {/* River Taper Toggle */}
          {onPathTaperChange && (
            <button
              onClick={() => onPathTaperChange(!pathTaper)}
              className={`px-2 py-0.5 rounded text-[11px] font-semibold border transition-all ${
                pathTaper
                  ? 'bg-[#00BBF9] text-white border-[#00BBF9] shadow-xs'
                  : 'bg-white text-slate-700 border-[#E2D6B5] hover:bg-[#FDF6E3]'
              }`}
              title="Variable width tapering: source starts thin and naturally widens towards sea"
            >
              Tapering
            </button>
          )}

          {/* Double-Line Road Toggle */}
          {onPathDoubleLineChange && (
            <button
              onClick={() => onPathDoubleLineChange(!pathDoubleLine)}
              className={`px-2 py-0.5 rounded text-[11px] font-semibold border transition-all ${
                pathDoubleLine
                  ? 'bg-[#FF7E5F] text-white border-[#FF7E5F] shadow-xs'
                  : 'bg-white text-slate-700 border-[#E2D6B5] hover:bg-[#FDF6E3]'
              }`}
              title="Imperial double-line highway casing"
            >
              Double Highway
            </button>
          )}

          {/* Hydrological Drainage & Natural River Routing */}
          {activePathStyle === 'river' && (
            <div className="flex items-center gap-1 pl-2 border-l border-[#E2D6B5]">
              <button
                onClick={() => onSettingsChange({ riverSnapDrainage: !settings.riverSnapDrainage })}
                className={`px-2 py-0.5 rounded text-[11px] font-semibold border flex items-center gap-1 transition-all ${
                  settings.riverSnapDrainage
                    ? 'bg-[#0284c7] text-white border-[#0369a1] shadow-xs'
                    : 'bg-white text-slate-700 border-[#E2D6B5] hover:bg-[#FDF6E3]'
                }`}
                title="Hydrological Drainage: Click any highland peak or valley to calculate the steepest-descent downhill drainage path down to the ocean"
              >
                <Waves className="w-3 h-3" />
                <span>Snap Drainage</span>
              </button>

              <button
                onClick={() => onSettingsChange({ riverCarveGorge: !settings.riverCarveGorge })}
                className={`px-2 py-0.5 rounded text-[11px] font-semibold border flex items-center gap-1 transition-all ${
                  settings.riverCarveGorge
                    ? 'bg-[#059669] text-white border-[#047857] shadow-xs'
                    : 'bg-white text-slate-700 border-[#E2D6B5] hover:bg-[#FDF6E3]'
                }`}
                title="Gorge Incision: Physically carves a canyon / riverbed trough into the elevation map"
              >
                <span>Carve Gorge</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* 6. TEXT / LABEL SETTINGS */}
      {activeTool === 'text' && (
        <div className="flex items-center gap-3 min-w-max">
          <input
            type="text"
            value={activeTextString}
            onChange={(e) => onTextStringChange(e.target.value)}
            placeholder="e.g. Whispering Woods"
            className="bg-white border border-[#E2D6B5] rounded px-2 py-0.5 text-xs text-slate-800 focus:outline-none focus:border-[#00BBF9] w-36"
          />

          <select
            value={activeFontFamily}
            onChange={(e) => onFontFamilyChange(e.target.value)}
            className="bg-white border border-[#E2D6B5] rounded px-2 py-0.5 text-xs text-slate-800 focus:outline-none"
          >
            <option value="'Cinzel', serif">Cinzel (Regal)</option>
            <option value="'MedievalSharp', cursive">MedievalSharp (Gothic)</option>
            <option value="'Cormorant Garamond', serif">Cormorant Garamond</option>
            <option value="'Uncial Antiqua', cursive">Uncial Antiqua (Celtic)</option>
            <option value="'Plus Jakarta Sans', sans-serif">Modern Sans</option>
          </select>

          {/* Style Preset */}
          {onTextPresetStyleChange && (
            <div className="flex items-center gap-1 pl-2 border-l border-[#E2D6B5]">
              <span className="text-slate-700 font-bold">Preset:</span>
              {[
                { id: 'standard', name: 'Std' },
                { id: 'imperial_spaced', name: 'Imperial' },
              ].map((p) => (
                <button
                  key={p.id}
                  onClick={() => onTextPresetStyleChange(p.id as TextPresetStyle)}
                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${
                    textPresetStyle === p.id
                      ? 'bg-[#00BBF9] text-white border-[#00BBF9]'
                      : 'bg-white text-slate-700 border-[#E2D6B5]'
                  }`}
                >
                  {p.name}
                </button>
              ))}
            </div>
          )}

          {/* Arc Curvature Slider */}
          {onTextCurvatureChange && (
            <div className="flex items-center gap-1.5 pl-2 border-l border-[#E2D6B5]" title="Curve text label along circular arc">
              <span className="text-slate-700 font-bold">Curve:</span>
              <input
                type="range"
                min="-60"
                max="60"
                value={textCurvature}
                onChange={(e) => onTextCurvatureChange(Number(e.target.value))}
                className="w-16 accent-[#FF7E5F] cursor-pointer"
              />
              <span className="font-mono text-slate-800 w-6">{textCurvature}°</span>
            </div>
          )}
        </div>
      )}

      {/* 7. GRID TOOL SETTINGS */}
      {activeTool === 'grid' && (
        <div className="flex items-center gap-3 min-w-max">
          <div className="flex items-center gap-1">
            {[
              { id: 'square', name: 'Square' },
              { id: 'hex_flat', name: 'Hex' },
              { id: 'isometric', name: 'Isometric' },
              { id: 'none', name: 'Off' },
            ].map((g) => (
              <button
                key={g.id}
                onClick={() => onGridConfigChange({ type: g.id as GridConfig['type'] })}
                className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${
                  gridConfig.type === g.id
                    ? 'bg-[#00BBF9] text-white border-[#0096C7] font-bold shadow-xs'
                    : 'bg-white text-slate-700 hover:bg-[#FDF6E3] border-[#E2D6B5]'
                }`}
              >
                {g.name}
              </button>
            ))}
          </div>

          {/* Nautical Rhumb Lines Toggle */}
          <button
            onClick={() => onGridConfigChange({ showRhumbLines: !gridConfig.showRhumbLines })}
            className={`px-2.5 py-0.5 rounded text-[11px] font-semibold border transition-all ${
              gridConfig.showRhumbLines
                ? 'bg-[#991b1b] text-white border-[#991b1b] shadow-xs'
                : 'bg-white text-slate-700 border-[#E2D6B5] hover:bg-[#FDF6E3]'
            }`}
            title="Nautical 16-point navigation compass rose rays (Portolan charts)"
          >
            Rhumb Lines
          </button>

          {/* Alphanumeric Coordinates Margin Toggle */}
          <button
            onClick={() => onGridConfigChange({ showCoordinates: !gridConfig.showCoordinates })}
            className={`px-2.5 py-0.5 rounded text-[11px] font-semibold border transition-all ${
              gridConfig.showCoordinates
                ? 'bg-[#00BBF9] text-white border-[#00BBF9] shadow-xs'
                : 'bg-white text-slate-700 border-[#E2D6B5] hover:bg-[#FDF6E3]'
            }`}
            title="Alphanumeric reference margin borders (A-Z, 1-50)"
          >
            Margin Ticks
          </button>
        </div>
      )}

      {/* 8. SELECT & ERASER NOTICES */}
      {activeTool === 'select' && (
        <div className="flex items-center justify-between w-full text-slate-600 text-xs">
          <div className="flex items-center gap-3">
            <span className="text-[#D9480F] font-bold">Select Tool:</span>
            <span>Click any placed stamp, river, or text label to select, move, scale or delete.</span>
          </div>
          {onOpenAssetOutliner && (
            <button
              id="select-open-asset-table-btn"
              onClick={onOpenAssetOutliner}
              className="px-2.5 py-1 rounded-md bg-[#14532d] hover:bg-[#1b4332] text-white font-bold text-xs flex items-center gap-1.5 transition-colors shadow-xs ml-auto"
            >
              <Layers className="w-3.5 h-3.5" />
              Open Asset Table (Search & Delete)
            </button>
          )}
        </div>
      )}

      {activeTool === 'eraser' && (
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-4 min-w-max">
            <div className="flex items-center gap-2">
              <span className="text-[#D9480F] font-bold text-xs">Eraser Radius:</span>
              <input
                type="range"
                min="15"
                max="160"
                value={settings.size}
                onChange={(e) => onSettingsChange({ size: Number(e.target.value) })}
                className="w-24 accent-[#FF7E5F] cursor-pointer"
              />
              <span className="font-mono text-slate-800 w-10 font-bold text-xs">{settings.size}px</span>
            </div>

            <div className="flex items-center gap-2 pl-2 border-l border-[#E2D6B5] text-slate-600 text-xs">
              <span className="bg-[#FF7E5F]/15 text-[#D9480F] px-2 py-0.5 rounded font-bold">Dynamic Eraser:</span>
              <span>Click or drag across rivers, paths, stamps, or labels to erase them cleanly.</span>
            </div>
          </div>

          {onOpenAssetOutliner && (
            <button
              id="eraser-open-asset-table-btn"
              onClick={onOpenAssetOutliner}
              className="px-2.5 py-1 rounded-md bg-[#14532d] hover:bg-[#1b4332] text-white font-bold text-xs flex items-center gap-1.5 transition-colors shadow-xs ml-4"
              title="Open table to delete difficult-to-click rivers and assets individually"
            >
              <Layers className="w-3.5 h-3.5" />
              Assets Table (Delete List)
            </button>
          )}
        </div>
      )}

      {/* World Elevation Bounds Modal */}
      {showWorldConfig && (
        <div
          id="world-elevation-modal-backdrop"
          onClick={() => setShowWorldConfig(false)}
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 transition-all"
        >
          <div
            id="world-elevation-modal-card"
            onClick={(e) => e.stopPropagation()}
            className="bg-[#FAF6EC] border border-[#D5C69E] rounded-xl shadow-2xl w-full max-w-md overflow-hidden text-slate-800 animate-in fade-in zoom-in-95 duration-150"
          >
            <div className="px-5 py-4 border-b border-[#E2D6B5] flex items-center justify-between bg-[#EFE5C9]">
              <div className="flex items-center gap-2">
                <Globe className="w-5 h-5 text-[#0077B6]" />
                <h3 className="font-bold text-sm text-slate-900 font-serif">World Elevation Model Bounds</h3>
              </div>
              <button
                id="close-world-config-btn"
                onClick={() => setShowWorldConfig(false)}
                className="w-7 h-7 flex items-center justify-center rounded-md text-slate-600 hover:text-slate-950 hover:bg-black/10 font-bold transition-colors cursor-pointer text-sm"
                title="Close (Esc)"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <p className="text-slate-600 leading-relaxed">
                Choose a world scale preset or define custom planetary elevation extremes (meters) for your world map.
              </p>

              <div className="grid grid-cols-3 gap-2">
                {Object.entries(WORLD_PRESETS).map(([key, preset]) => (
                  <button
                    key={key}
                    onClick={() => handleApplyPreset(key)}
                    className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98] ${
                      elevationConfig.worldPreset === key
                        ? 'bg-[#0077B6] text-white border-[#005B8E] shadow-sm font-semibold'
                        : 'bg-white text-slate-800 border-[#E2D6B5] hover:bg-[#F7F2E2]'
                    }`}
                  >
                    <div className="font-bold text-xs">{preset.customName}</div>
                    <div className="text-[10px] opacity-80 mt-1 font-mono">
                      {preset.minElevation.toLocaleString()}m to +{preset.maxElevation.toLocaleString()}m
                    </div>
                  </button>
                ))}
              </div>

              {/* Custom Range Definition */}
              <div className="bg-white/80 p-3 rounded-lg border border-[#E2D6B5] space-y-3">
                <div className="font-bold text-slate-900 flex items-center gap-1.5">
                  <Settings className="w-3.5 h-3.5 text-[#0077B6]" />
                  <span>Custom World Altitude Extremes</span>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] text-slate-600 font-medium">World Name</label>
                  <input
                    type="text"
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    placeholder="e.g. Aethelgard or Barsoom"
                    className="w-full px-2.5 py-1.5 rounded border border-[#D5C69E] bg-white text-xs text-slate-900 focus:outline-none focus:border-[#0077B6]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] text-slate-600 font-medium">Min Trench Depth (meters)</label>
                    <input
                      type="number"
                      max={-100}
                      step={500}
                      value={customMin}
                      onChange={(e) => setCustomMin(Number(e.target.value))}
                      className="w-full px-2 py-1.5 rounded border border-[#D5C69E] bg-white font-mono font-bold text-slate-900 text-xs focus:outline-none focus:border-[#0077B6]"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-600 font-medium">Max Summit Peak (meters)</label>
                    <input
                      type="number"
                      min={100}
                      step={500}
                      value={customMax}
                      onChange={(e) => setCustomMax(Number(e.target.value))}
                      className="w-full px-2 py-1.5 rounded border border-[#D5C69E] bg-white font-mono font-bold text-slate-900 text-xs focus:outline-none focus:border-[#0077B6]"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleApplyCustom}
                  className="w-full py-2 bg-[#0077B6] hover:bg-[#005B8E] text-white font-bold rounded-lg text-xs transition-colors shadow-xs cursor-pointer active:scale-[0.99]"
                >
                  Apply Custom Planetary Elevation Range
                </button>
              </div>

              {/* Explicit Dismiss / Cancel Bar */}
              <div className="flex items-center justify-between pt-2 border-t border-[#E2D6B5]">
                <button
                  id="btn-dismiss-world-config"
                  type="button"
                  onClick={() => setShowWorldConfig(false)}
                  className="px-3.5 py-1.5 rounded-md bg-[#EFE5C9] hover:bg-[#E2D6B5] text-slate-800 font-bold text-xs transition-colors cursor-pointer"
                >
                  Cancel / Close
                </button>
                <button
                  id="btn-save-world-config"
                  type="button"
                  onClick={handleApplyCustom}
                  className="px-4 py-1.5 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-md text-xs transition-colors shadow-xs cursor-pointer"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
